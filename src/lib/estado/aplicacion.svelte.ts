import { CONFIGURACION_DEMO } from '../datos/mock';
import type {
  CancionCatalogo,
  ConfiguracionAnalisis,
  ErrorAnalisis,
  ProgresoAnalisis,
  ReferenciaNueva,
  ResultadoAnalisis,
  ResultadoImportacion,
  ResumenAnalisis,
  Tono
} from '../datos/tipos';
import { enrutador } from '../navegacion/enrutador.svelte';
import { cliente } from '../servicios';
import { ErrorServicioAnalisis } from '../servicios/cliente-mock';
import {
  crearUrlObjeto,
  liberarUrlObjeto,
  leerMetadatosAudio
} from '../utilidades/audio';
import { EXTENSIONES_AUDIO } from '../datos/constantes';
import { nombreArchivoSeguro } from '../utilidades/formato';

export interface Notificacion {
  id: string;
  tono: Tono;
  titulo: string;
  mensaje?: string;
}

const RETARDO_NOTIFICACION = 5_500;

class EstadoAplicacion {
  catalogo = $state<CancionCatalogo[]>([]);
  analisis = $state<ResumenAnalisis[]>([]);
  resultados = $state<Record<string, ResultadoAnalisis>>({});
  cargandoInicial = $state(true);
  cargandoDatos = $state(false);

  archivo = $state<File | null>(null);
  urlArchivo = $state<string | null>(null);
  configuracion = $state<ConfiguracionAnalisis>({ ...CONFIGURACION_DEMO, forzarError: null });
  nombreArchivoSugerido = $state<string | null>(null);

  trabajoActivo = $state(false);
  progreso = $state<ProgresoAnalisis | null>(null);
  errorActual = $state<ErrorAnalisis | null>(null);
  resultadoActual = $state<ResultadoAnalisis | null>(null);

  notificaciones = $state<Notificacion[]>([]);
  conexion = $state(cliente.estadoConexion());

  private inicializado = false;
  private cargandoResultados = new Map<string, Promise<ResultadoAnalisis | null>>();

  get estadoConexion() {
    return this.conexion;
  }

  get totalSegmentosCatalogo(): number {
    return this.catalogo.reduce((total, cancion) => total + cancion.cantidadSegmentos, 0);
  }

  async inicializar(): Promise<void> {
    if (this.inicializado) return;
    this.inicializado = true;
    await this.recargarTodo();
  }

  async recargarTodo(): Promise<void> {
    this.cargandoInicial = true;
    await Promise.all([this.recargarCatalogo(), this.recargarAnalisis()]);
    this.cargandoInicial = false;
  }

  async recargarCatalogo(): Promise<void> {
    this.cargandoDatos = true;
    try {
      this.catalogo = await cliente.listarCatalogo();
    } catch (error) {
      this.notificar('peligro', 'No se pudo cargar el catálogo', mensajeDe(error));
    } finally {
      this.cargandoDatos = false;
      this.conexion = cliente.estadoConexion();
    }
  }

  async recargarAnalisis(): Promise<void> {
    this.cargandoDatos = true;
    try {
      this.analisis = await cliente.listarAnalisis();
    } catch (error) {
      this.notificar('peligro', 'No se pudo cargar el historial', mensajeDe(error));
    } finally {
      this.cargandoDatos = false;
      this.conexion = cliente.estadoConexion();
    }
  }

  async cargarResultado(id: string): Promise<ResultadoAnalisis | null> {
    const existente = this.resultados[id];
    if (existente) return existente;
    const pendiente = this.cargandoResultados.get(id);
    if (pendiente) return pendiente;
    const carga = this.consultarResultado(id);
    this.cargandoResultados.set(id, carga);
    return carga;
  }

  private async consultarResultado(id: string): Promise<ResultadoAnalisis | null> {
    try {
      const resultado = await cliente.obtenerAnalisis(id);
      if (resultado) {
        this.resultados[id] = resultado;
        return resultado;
      }
      this.notificar('advertencia', 'Análisis no encontrado', `No existe el expediente ${id}.`);
      return null;
    } catch (error) {
      this.notificar('peligro', 'No se pudo abrir el análisis', mensajeDe(error));
      return null;
    } finally {
      this.cargandoResultados.delete(id);
      this.conexion = cliente.estadoConexion();
    }
  }

  async seleccionarArchivo(archivo: File): Promise<void> {
    const extension = archivo.name.toLowerCase().split('.').pop() ?? '';
    if (!EXTENSIONES_AUDIO.some((item) => item.slice(1) === extension)) {
      this.notificar('peligro', 'Formato no admitido', `Se esperaba WAV, MP3, FLAC, OGG o AU; se recibió .${extension}.`);
      return;
    }
    if (archivo.size === 0) {
      this.notificar('peligro', 'Archivo vacío', 'Selecciona un archivo de audio con contenido.');
      return;
    }

    this.limpiarArchivo();
    this.archivo = archivo;
    this.urlArchivo = crearUrlObjeto(archivo);
    this.nombreArchivoSugerido = null;
    const metadatos = await leerMetadatosAudio(archivo);
    this.configuracion.metadatosArchivo = {
      duracionSegundos: metadatos.duracionSegundos,
      tamanoBytes: archivo.size,
      formato: formatoDesdeArchivoPublico(archivo),
      frecuenciaMuestreo: metadatos.frecuenciaMuestreo,
      canales: metadatos.canales
    };
    this.notificar('exito', 'Audio cargado', `${formatoDesdeArchivoPublico(archivo)} · ${nombreArchivoSeguro(archivo.name)}`);
  }

  limpiarArchivo(): void {
    liberarUrlObjeto(this.urlArchivo);
    this.urlArchivo = null;
    this.archivo = null;
    this.configuracion.metadatosArchivo = undefined;
  }

  prepararReanalisis(resultado: ResultadoAnalisis): void {
    this.nombreArchivoSugerido = nombreArchivoSeguro(resultado.nombreArchivo);
    this.notificar(
      'info',
      'Vuelve a cargar el archivo',
      'Selecciona el archivo que quieras volver a analizar.'
    );
    enrutador.ir('nuevo');
  }

  async iniciarAnalisis(): Promise<void> {
    if (this.trabajoActivo) return;
    if (!this.archivo) {
      this.notificar('advertencia', 'Falta un archivo de audio', 'Carga una muestra antes de iniciar el análisis.');
      return;
    }

    this.trabajoActivo = true;
    this.progreso = { porcentaje: 0, etapa: 'Preparando', detalle: 'Inicializando el pipeline de extracción acústica.' };
    this.errorActual = null;
    enrutador.ir('progreso');

    const archivo = this.archivo;
    try {
      const resultado = await cliente.analizarAudio(archivo, { ...this.configuracion }, (progreso) => {
        this.progreso = progreso;
      });
      this.resultadoActual = resultado;
      this.resultados[resultado.idAnalisis] = resultado;
      await this.recargarAnalisis();
      this.notificar(
        'exito',
        'Análisis completado',
        `${resultado.coincidencias.length} coincidencias candidatas. La similitud es evidencia técnica.`
      );
      enrutador.ir('resultados', { id: resultado.idAnalisis }, {}, true);
    } catch (error) {
      if (error instanceof ErrorServicioAnalisis) {
        this.errorActual = error.error;
      } else {
        this.errorActual = {
          codigo: '500',
          titulo: 'No se pudo completar el análisis',
          mensaje: 'Se produjo un error inesperado en la aplicación.',
          detalle: mensajeDe(error),
          sugerencias: [
            'Reintenta el análisis con el mismo archivo.',
            'Si vuelve a fallar, revisa la consola del navegador o el log del servicio nativo.'
          ],
          solicitud: 'Pipeline local de AudioTrace',
          fecha: new Date().toISOString()
        };
      }
      enrutador.ir('error', { codigo: this.errorActual.codigo }, {}, true);
    } finally {
      this.trabajoActivo = false;
      this.conexion = cliente.estadoConexion();
    }
  }

  async agregarReferencia(referencia: ReferenciaNueva): Promise<CancionCatalogo> {
    const cancion = await cliente.agregarReferencia(referencia);
    await this.recargarCatalogo();
    this.notificar('exito', 'Referencia añadida', `${cancion.titulo} ya forma parte del catálogo local.`);
    return cancion;
  }

  async importarDataset(referencias: ReferenciaNueva[]): Promise<ResultadoImportacion> {
    const resultado = await cliente.importarDataset(referencias);
    await this.recargarCatalogo();
    this.notificar(
      'exito',
      'Importación finalizada',
      `${resultado.cantidadCanciones} canciones · ${resultado.cantidadSegmentos} segmentos.`
    );
    return resultado;
  }

  notificar(tono: Tono, titulo: string, mensaje?: string): void {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    this.notificaciones = [...this.notificaciones.slice(-3), { id, tono, titulo, mensaje }];
    setTimeout(() => this.descartarNotificacion(id), RETARDO_NOTIFICACION);
  }

  descartarNotificacion(id: string): void {
    this.notificaciones = this.notificaciones.filter((item) => item.id !== id);
  }
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido.';
}

export function formatoDesdeArchivoPublico(archivo: File): string {
  const extension = archivo.name.split('.').pop()?.toUpperCase();
  if (extension) return extension;
  return archivo.type.split('/')[1]?.toUpperCase() ?? 'AUDIO';
}

export const app = new EstadoAplicacion();
