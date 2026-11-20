import type {
  CancionCatalogo, ClienteAudioTrace, ConfiguracionAnalisis, DetalleCancion,
  EstadoConexion, ProgresoAnalisis, ReferenciaNueva, ResultadoAnalisis,
  ResultadoImportacion, ResumenAnalisis, CodigoErrorAnalisis
} from '../datos/tipos';
import { ERRORES_DEMO } from '../datos/mock';
import { ErrorServicioAnalisis } from './cliente-mock';
import {
  mapearCancion, mapearResultado, mapearResumen,
  type FilaCancion, type FilaAnalisis, type FilaAnalisisResumen
} from './mapeo';

interface CancionHttp extends Omit<FilaCancion, 'audio_path' | 'segments'> {
  audio_url: string;
  segments?: {
    segment_id: number; segment_index: number; start_seconds: number; end_seconds: number;
  }[];
}

interface CatalogoHttp {
  catalog_mutable: false;
  song_count: number;
  segment_count: number;
  songs: CancionHttp[];
}

export class ClienteRest implements ClienteAudioTrace {
  readonly modo = 'rest' as const;
  private readonly origen: string;
  private conectado = false;

  constructor(origen = import.meta.env.VITE_URL_API || 'http://127.0.0.1:8000') {
    this.origen = origen.replace(/\/+$/, '');
  }

  estadoConexion(): EstadoConexion {
    return {
      modo: 'rest', conectado: this.conectado,
      etiqueta: this.conectado ? '' : 'SoupDB sin conexión',
      detalle: `${this.origen} · ${this.conectado ? 'Catálogo e historial del servicio. Catálogo de solo lectura.' : 'Inicia el runtime de SoupDB y actualiza los datos. No se usan datos de demostración.'}`
    };
  }

  private fallo(codigo: CodigoErrorAnalisis, detalle: string, ruta: string, sugerencias?: string[]): ErrorServicioAnalisis {
    const base = ERRORES_DEMO[codigo];
    return new ErrorServicioAnalisis({
      ...base, mensaje: detalle, detalle, sugerencias: sugerencias ?? base.sugerencias,
      solicitud: `${this.origen}/api/v1${ruta}`,
      fecha: new Date().toISOString()
    });
  }

  private async solicitar<T>(ruta: string, opciones: RequestInit = {}, aceptarAusente = false): Promise<T | null> {
    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), opciones.method === 'POST' ? 300_000 : 30_000);
    try {
      const respuesta = await fetch(`${this.origen}/api/v1${ruta}`, {
        ...opciones, headers: { Accept: 'application/json', ...opciones.headers }, signal: controlador.signal
      });
      this.conectado = respuesta.status !== 503;
      if (respuesta.status === 404 && aceptarAusente) return null;
      if (respuesta.status === 413) {
        throw this.fallo('422', 'El archivo supera el tamaño máximo de carga.', ruta, [
          'Selecciona un archivo más pequeño o recorta la muestra.'
        ]);
      }
      if (!respuesta.ok) {
        const cuerpo: unknown = await respuesta.json().catch(() => null);
        const detalle = cuerpo && typeof cuerpo === 'object' && 'detail' in cuerpo ? cuerpo.detail : null;
        const mensaje = typeof detalle === 'string' ? detalle
          : Array.isArray(detalle) ? detalle.map((error) => typeof error?.msg === 'string' ? error.msg : 'Campo inválido').join('; ')
          : `El servicio respondió HTTP ${respuesta.status}.`;
        const codigo = respuesta.status === 422 ? '422' : respuesta.status === 503 ? '503' : '500';
        throw this.fallo(codigo, mensaje, ruta);
      }
      const datos: T = await respuesta.json();
      this.conectado = true;
      return datos;
    } catch (error) {
      if (error instanceof ErrorServicioAnalisis) throw error;
      this.conectado = false;
      const mensaje = controlador.signal.aborted
        ? 'El servicio tardó demasiado en responder. Comprueba su estado antes de reintentar; el análisis puede seguir ejecutándose en el servidor.'
        : 'No se pudo contactar con SoupDB. Comprueba que el runtime esté iniciado y que COPYRIGHT_CORS_ORIGINS permita el origen de esta aplicación.';
      throw this.fallo('503', mensaje, ruta);
    } finally {
      clearTimeout(limite);
    }
  }

  private cancion(fila: CancionHttp): DetalleCancion {
    const base = new URL(`${this.origen}/api/v1/`, window.location.origin);
    const urlAudio = new URL(fila.audio_url, base).href;
    return mapearCancion({
      ...fila, audio_path: urlAudio,
      segments: fila.segments?.map((segmento) => ({
        ...segmento, song_id: fila.song_id,
        audio_ref: `${urlAudio}#segment=${String(segmento.segment_index).padStart(6, '0')}`
      }))
    });
  }

  async listarCatalogo(): Promise<CancionCatalogo[]> {
    const datos = await this.solicitar<CatalogoHttp>('/catalog');
    if (!datos || !Array.isArray(datos.songs)) throw this.fallo('500', 'La respuesta del catálogo no cumple el contrato de SoupDB.', '/catalog');
    return datos.songs.map((fila) => this.cancion(fila));
  }

  async obtenerCancion(idCancion: number): Promise<DetalleCancion | null> {
    const fila = await this.solicitar<CancionHttp>(`/catalog/${encodeURIComponent(idCancion)}`, {}, true);
    return fila ? this.cancion(fila) : null;
  }

  async listarAnalisis(): Promise<ResumenAnalisis[]> {
    const filas = await this.solicitar<FilaAnalisisResumen[]>('/analyses');
    if (!Array.isArray(filas)) throw this.fallo('500', 'La respuesta del historial no cumple el contrato de SoupDB.', '/analyses');
    return filas.map(mapearResumen);
  }

  async obtenerAnalisis(idAnalisis: string): Promise<ResultadoAnalisis | null> {
    const fila = await this.solicitar<FilaAnalisis>(`/analyses/${encodeURIComponent(idAnalisis)}`, {}, true);
    return fila ? mapearResultado(fila) : null;
  }

  async analizarAudio(archivo: File, configuracion: ConfiguracionAnalisis, onProgreso?: (progreso: ProgresoAnalisis) => void): Promise<ResultadoAnalisis> {
    const formulario = new FormData();
    formulario.append('file', archivo, archivo.name);
    onProgreso?.({ porcentaje: 0, etapa: 'Servicio de análisis', detalle: 'Enviando el audio y esperando la respuesta de SoupDB. La API no publica progreso por etapa.' });
    const fila = await this.solicitar<Omit<FilaAnalisis, 'created_at'> & { created_at?: string }>('/analyze', { method: 'POST', body: formulario });
    if (!fila) throw this.fallo('500', 'El servicio no devolvió un resultado.', '/analyze');
    const { created_at, ...analisis } = fila;
    const persistido = created_at
      ? mapearResultado({ ...analisis, created_at })
      : await this.obtenerAnalisis(fila.analysis_id).catch(() => null);
    const resultado = persistido ?? {
      ...mapearResultado({ ...analisis, created_at: new Date().toISOString() }),
      origen: 'local' as const
    };
    resultado.metadatos = configuracion.metadatosArchivo;
    onProgreso?.({ porcentaje: 100, etapa: 'Completado', detalle: 'Resultado recibido del servicio de análisis.' });
    return resultado;
  }

  async agregarReferencia(_referencia: ReferenciaNueva): Promise<CancionCatalogo> {
    throw new Error('El catálogo de SoupDB es de solo lectura (catalog_mutable: false). La API actual no admite altas. Usa el modo demo para probar el formulario.');
  }

  async importarDataset(_referencias: ReferenciaNueva[]): Promise<ResultadoImportacion> {
    throw new Error('La API actual no tiene endpoints de importación. Prepara el dataset en SoupDB antes de iniciar su runtime o prueba la importación en modo demo.');
  }
}
