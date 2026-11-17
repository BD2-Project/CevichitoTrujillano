import {
  CATALOGO_PREDETERMINADO,
  EXTENSIONES_AUDIO,
  K_VECINOS_PREDETERMINADO,
  SEGUNDOS_POR_SEGMENTO
} from '../datos/constantes';
import {
  CONFIGURACION_DEMO,
  ERRORES_DEMO,
  crearAnalisisIniciales,
  crearCatalogoInicial,
  crearSegmentosParaCancion
} from '../datos/mock';
import type {
  CancionCatalogo,
  ClienteAudioTrace,
  CodigoErrorAnalisis,
  Coincidencia,
  ConfiguracionAnalisis,
  DetalleCancion,
  ErrorAnalisis,
  EstadoConexion,
  ProgresoAnalisis,
  ReferenciaNueva,
  ResultadoAnalisis,
  ResultadoImportacion,
  ResumenAnalisis
} from '../datos/tipos';
import { generarIdAnalisis, limitar, normalizarBusqueda } from '../utilidades/formato';

const CLAVE_PERSISTENCIA = 'audiotrace:demo:v1';
const VERSION_PERSISTENCIA = 1;

interface PersistenciaDemo {
  version: number;
  canciones: DetalleCancion[];
  analisis: ResultadoAnalisis[];
}

export class ErrorServicioAnalisis extends Error {
  readonly error: ErrorAnalisis;

  constructor(error: ErrorAnalisis) {
    super(error.mensaje);
    this.name = 'ErrorServicioAnalisis';
    this.error = error;
  }
}

function esperar(milisegundos: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milisegundos));
}

function leerPersistencia(): PersistenciaDemo {
  const vacia: PersistenciaDemo = { version: VERSION_PERSISTENCIA, canciones: [], analisis: [] };
  if (typeof localStorage === 'undefined') return vacia;
  try {
    const crudo = localStorage.getItem(CLAVE_PERSISTENCIA);
    if (!crudo) return vacia;
    const datos = JSON.parse(crudo) as Partial<PersistenciaDemo>;
    return {
      version: VERSION_PERSISTENCIA,
      canciones: Array.isArray(datos.canciones) ? datos.canciones : [],
      analisis: Array.isArray(datos.analisis) ? datos.analisis : []
    };
  } catch {
    return vacia;
  }
}

function escribirPersistencia(datos: PersistenciaDemo): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CLAVE_PERSISTENCIA, JSON.stringify(datos));
  } catch {
    // La demo sigue funcionando en memoria aunque el navegador bloquee el almacenamiento.
  }
}

function resumenDesdeResultado(resultado: ResultadoAnalisis): ResumenAnalisis {
  const canciones = new Set(resultado.coincidencias.map((item) => item.idCancion));
  const similitudes = resultado.coincidencias.map((item) => item.similitud);
  const metadatos = resultado.metadatos;
  return {
    idAnalisis: resultado.idAnalisis,
    nombreArchivo: resultado.nombreArchivo,
    creadoEn: resultado.creadoEn,
    segundosPorSegmento: resultado.segundosPorSegmento,
    cantidadCoincidencias: resultado.coincidencias.length,
    cantidadCanciones: canciones.size,
    mejorSimilitud: similitudes.length > 0 ? Math.max(...similitudes) : null,
    estado: resultado.coincidencias.length > 0 ? 'con-evidencia' : 'sin-evidencia',
    origen: resultado.origen ?? 'demo',
    duracionArchivoSegundos: metadatos?.duracionSegundos,
    tamanoBytes: metadatos?.tamanoBytes,
    formato: metadatos?.formato,
    frecuenciaMuestreo: metadatos?.frecuenciaMuestreo,
    canales: metadatos?.canales
  };
}

function semillaDe(texto: string): number {
  let valor = 2166136261;
  for (let indice = 0; indice < texto.length; indice += 1) {
    valor ^= texto.charCodeAt(indice);
    valor = Math.imul(valor, 16777619);
  }
  return valor >>> 0;
}

function formatoDesdeArchivo(archivo: File): string {
  const extension = archivo.name.split('.').pop()?.toUpperCase();
  if (extension) return extension;
  if (archivo.type.includes('mpeg')) return 'MP3';
  if (archivo.type.includes('wav')) return 'WAV';
  if (archivo.type.includes('flac')) return 'FLAC';
  return 'AUDIO';
}

function extensionValida(nombre: string): boolean {
  const minusculas = nombre.toLowerCase();
  return EXTENSIONES_AUDIO.some((extension) => minusculas.endsWith(extension));
}

/**
 * Adaptador en memoria que replica el contrato de SoupDB.
 *
 * No pretende sustituir al pipeline MFCC/HNSW: genera evidencia determinista
 * a partir del nombre y el tamaño del archivo para que la interfaz sea
 * navegable sin backend. Toda similitud es un valor de [0, 1], no un dictamen.
 */
export class ClienteMock implements ClienteAudioTrace {
  readonly modo = 'demo' as const;

  private catalogo: DetalleCancion[] = [];
  private analisis: ResultadoAnalisis[] = [];
  private persistencia: PersistenciaDemo;

  constructor() {
    this.persistencia = leerPersistencia();
    const base = crearCatalogoInicial();
    const idsBase = new Set(base.map((cancion) => cancion.idCancion));
    const agregadas = this.persistencia.canciones.filter(
      (cancion) => !idsBase.has(cancion.idCancion)
    );
    this.catalogo = [...base, ...agregadas];

    const iniciales = crearAnalisisIniciales(this.catalogo).map(({ coincidencias, ...resumen }) => ({
      idAnalisis: resumen.idAnalisis,
      nombreArchivo: resumen.nombreArchivo,
      creadoEn: resumen.creadoEn,
      segundosPorSegmento: resumen.segundosPorSegmento,
      coincidencias,
      origen: 'demo' as const,
      metadatos: {
        duracionSegundos: resumen.duracionArchivoSegundos,
        tamanoBytes: resumen.tamanoBytes ?? 0,
        formato: resumen.formato ?? 'AUDIO',
        frecuenciaMuestreo: resumen.frecuenciaMuestreo,
        canales: resumen.canales
      }
    }));

    const idsIniciales = new Set(iniciales.map((item) => item.idAnalisis));
    const agregados = this.persistencia.analisis.filter(
      (item) => !idsIniciales.has(item.idAnalisis)
    );
    this.analisis = [...agregados, ...iniciales];
  }

  estadoConexion(): EstadoConexion {
    return {
      modo: 'demo',
      conectado: true,
      etiqueta: 'Modo demostración',
      detalle: `${this.catalogo.length} referencias y ${this.analisis.length} análisis locales. Sin conexión con SoupDB.`
    };
  }

  async listarCatalogo(): Promise<CancionCatalogo[]> {
    await esperar(40);
    return this.catalogo.map(({ segmentos, ...cancion }) => ({ ...cancion }));
  }

  async obtenerCancion(idCancion: number): Promise<DetalleCancion | null> {
    await esperar(30);
    const cancion = this.catalogo.find((item) => item.idCancion === idCancion);
    return cancion ? structuredClone(cancion) : null;
  }

  async listarAnalisis(): Promise<ResumenAnalisis[]> {
    await esperar(60);
    return this.analisis
      .map(resumenDesdeResultado)
      .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());
  }

  async obtenerAnalisis(idAnalisis: string): Promise<ResultadoAnalisis | null> {
    await esperar(30);
    const resultado = this.analisis.find((item) => item.idAnalisis === idAnalisis);
    return resultado ? structuredClone(resultado) : null;
  }

  async analizarAudio(
    archivo: File,
    configuracion: ConfiguracionAnalisis,
    onProgreso?: (progreso: ProgresoAnalisis) => void
  ): Promise<ResultadoAnalisis> {
    const metadatos = configuracion.metadatosArchivo ?? {
      duracionSegundos: undefined,
      tamanoBytes: archivo.size,
      formato: formatoDesdeArchivo(archivo),
      frecuenciaMuestreo: undefined,
      canales: undefined
    };

    const duracion = metadatos.duracionSegundos ?? 0;
    if (archivo.size === 0 || !extensionValida(archivo.name) || (duracion > 0 && duracion < 2.5)) {
      await esperar(700);
      throw new ErrorServicioAnalisis({
        ...ERRORES_DEMO['422'],
        fecha: new Date().toISOString()
      });
    }

    if (configuracion.forzarError) {
      const codigo: CodigoErrorAnalisis = configuracion.forzarError;
      await esperar(1_200);
      throw new ErrorServicioAnalisis({
        ...ERRORES_DEMO[codigo],
        fecha: new Date().toISOString()
      });
    }

    const duracionEfectiva = duracion > 0 ? duracion : 60;
    const totalSegmentos = Math.max(1, Math.ceil(duracionEfectiva / SEGUNDOS_POR_SEGMENTO));

    const emitir = (porcentaje: number, etapa: string, detalle: string, segmentoActual?: number) => {
      onProgreso?.({ porcentaje, etapa, detalle, segmentoActual, totalSegmentos });
    };

    emitir(4, 'Lectura del archivo', `Validación básica de ${archivo.name} · pipeline simulado.`);
    await esperar(520);
    emitir(14, 'Decodificación', `Remuestreo a ${22_050} Hz y normalización de picos.`);
    await esperar(700);
    emitir(28, 'Segmentación', `Dividiendo la pista en ventanas de ${SEGUNDOS_POR_SEGMENTO} s.`);
    await esperar(650);

    for (let segmento = 1; segmento <= Math.min(totalSegmentos, 12); segmento += 1) {
      const porcentaje = 30 + Math.round((segmento / Math.min(totalSegmentos, 12)) * 34);
      emitir(
        porcentaje,
        'Extracción MFCC',
        `20 coeficientes cepstrales · vector de 128 dimensiones · segmento ${segmento}.`,
        segmento
      );
      await esperar(120);
    }

    emitir(72, 'Consulta HNSW', `Buscando ${configuracion.kVecinos || K_VECINOS_PREDETERMINADO} vecinos por segmento.`);
    await esperar(720);
    emitir(86, 'Alineación temporal', 'Agrupando runs contiguos y calculando desplazamiento.');
    await esperar(620);

    const resultado = this.construirResultado(
      archivo,
      configuracion,
      metadatos,
      duracionEfectiva
    );
    emitir(100, 'Análisis completado', `${resultado.coincidencias.length} coincidencias candidatas.`);
    await esperar(320);

    this.analisis = [resultado, ...this.analisis];
    this.persistencia.analisis = [resultado, ...this.persistencia.analisis];
    escribirPersistencia(this.persistencia);

    return structuredClone(resultado);
  }

  async agregarReferencia(referencia: ReferenciaNueva): Promise<CancionCatalogo> {
    await esperar(500);
    const idCancion = Math.max(0, ...this.catalogo.map((item) => item.idCancion)) + 1;
    const primerSegmento = Math.max(0, ...this.catalogo.flatMap((item) => item.segmentos.map((s) => s.idSegmento))) + 1;
    const duracion = limitar(referencia.duracionSegundos, 2.5, 3_600);
    const segmentos = crearSegmentosParaCancion(
      { idCancion, duracionSegundos: duracion, titulo: referencia.titulo },
      primerSegmento
    );
    const cancion: DetalleCancion = {
      idCancion,
      titulo: referencia.titulo.trim(),
      artista: referencia.artista.trim(),
      duracionSegundos: duracion,
      cantidadSegmentos: segmentos.length,
      urlAudio: referencia.rutaAudio.trim(),
      genero: referencia.genero,
      anio: referencia.anio,
      coleccion: referencia.coleccion || CATALOGO_PREDETERMINADO,
      licencia: referencia.licencia?.trim() || undefined,
      origen: 'local',
      segmentos
    };
    this.catalogo = [cancion, ...this.catalogo];
    this.persistencia.canciones = [cancion, ...this.persistencia.canciones];
    escribirPersistencia(this.persistencia);
    const { segmentos: _segmentos, ...resumen } = cancion;
    return { ...resumen };
  }

  async importarDataset(referencias: ReferenciaNueva[]): Promise<ResultadoImportacion> {
    await esperar(900);
    const existentes = new Set(
      this.catalogo.map((item) => `${normalizarBusqueda(item.titulo)}|${normalizarBusqueda(item.artista)}`)
    );
    const nombres: string[] = [];
    let omitidas = 0;
    let siguienteId = Math.max(0, ...this.catalogo.map((item) => item.idCancion));
    let siguienteSegmento =
      Math.max(0, ...this.catalogo.flatMap((item) => item.segmentos.map((s) => s.idSegmento))) + 1;

    for (const referencia of referencias) {
      const clave = `${normalizarBusqueda(referencia.titulo)}|${normalizarBusqueda(referencia.artista)}`;
      if (!referencia.titulo.trim() || !referencia.artista.trim() || existentes.has(clave)) {
        omitidas += 1;
        continue;
      }
      existentes.add(clave);
      siguienteId += 1;
      const duracion = limitar(referencia.duracionSegundos || 180, 2.5, 3_600);
      const segmentos = crearSegmentosParaCancion(
        { idCancion: siguienteId, duracionSegundos: duracion, titulo: referencia.titulo },
        siguienteSegmento
      );
      siguienteSegmento += segmentos.length;
      const cancion: DetalleCancion = {
        idCancion: siguienteId,
        titulo: referencia.titulo.trim(),
        artista: referencia.artista.trim(),
        duracionSegundos: duracion,
        cantidadSegmentos: segmentos.length,
        urlAudio: referencia.rutaAudio.trim(),
        genero: referencia.genero,
        anio: referencia.anio,
        coleccion: referencia.coleccion || CATALOGO_PREDETERMINADO,
        licencia: referencia.licencia?.trim() || undefined,
        origen: 'local',
        segmentos
      };
      this.catalogo = [cancion, ...this.catalogo];
      this.persistencia.canciones = [cancion, ...this.persistencia.canciones];
      nombres.push(cancion.titulo);
    }

    escribirPersistencia(this.persistencia);
    return {
      cantidadCanciones: nombres.length,
      cantidadSegmentos: nombres.reduce((total, nombre) => {
        const cancion = this.catalogo.find((item) => item.titulo === nombre);
        return total + (cancion?.cantidadSegmentos ?? 0);
      }, 0),
      omitidas,
      nombres
    };
  }

  private construirResultado(
    archivo: File,
    configuracion: ConfiguracionAnalisis,
    metadatos: NonNullable<ConfiguracionAnalisis['metadatosArchivo']>,
    duracion: number
  ): ResultadoAnalisis {
    const semilla = semillaDe(`${archivo.name}:${archivo.size}:${configuracion.idCatalogo}`);
    const sinCoincidencias =
      normalizarBusqueda(archivo.name).includes('limpio') ||
      normalizarBusqueda(configuracion.notas).includes('sin coincidencia');

    const cantidad = sinCoincidencias ? 0 : 1 + (semilla % 4);
    const coincidencias: Coincidencia[] = [];
    const idsUsados = new Set<number>();

    for (let indice = 0; indice < cantidad; indice += 1) {
      const posicion = Math.floor(((semilla >>> (indice * 3)) % this.catalogo.length + indice * 7) % this.catalogo.length);
      const cancion = this.catalogo[posicion];
      if (!cancion || idsUsados.has(cancion.idCancion)) continue;
      idsUsados.add(cancion.idCancion);

      const duracionTramo = Math.min(20, Math.max(5, duracion - 1));
      const maxInicio = Math.max(0, duracion - duracionTramo);
      const inicioConsulta = Math.min(maxInicio, (indice * 17 + (semilla % 11)) % Math.max(1, Math.round(maxInicio)));
      const cantidadSegmentos = Math.max(1, Math.round(duracionTramo / SEGUNDOS_POR_SEGMENTO));
      const finConsulta = Math.min(duracion, inicioConsulta + cantidadSegmentos * SEGUNDOS_POR_SEGMENTO);
      const fuenteInicio = Math.max(0, Math.min(cancion.duracionSegundos - 5, inicioConsulta - (indice % 2 === 0 ? 5 : 0)));
      const fuenteFin = Math.min(cancion.duracionSegundos, fuenteInicio + (finConsulta - inicioConsulta));
      const base = 0.97 - indice * 0.071 - (semilla % 47) / 1000;
      const similitud = limitar(base, 0.41, 0.995);
      const similitudMinima = limitar(similitud - 0.038, 0.3, 0.999);
      const similitudMaxima = limitar(similitud + 0.026, 0.31, 0.999);

      coincidencias.push({
        inicioConsulta,
        finConsulta,
        idCancion: cancion.idCancion,
        titulo: cancion.titulo,
        artista: cancion.artista,
        inicioFuente: fuenteInicio,
        finFuente: fuenteFin,
        similitud: Number(similitud.toFixed(4)),
        cantidadSegmentos,
        similitudMinima: Number(similitudMinima.toFixed(4)),
        similitudMaxima: Number(similitudMaxima.toFixed(4)),
        desplazamientoAlineacion: Number((fuenteInicio - inicioConsulta).toFixed(3)),
        esMejorTramo: false
      });
    }

    coincidencias.sort((a, b) => b.similitud - a.similitud);
    if (coincidencias[0]) coincidencias[0].esMejorTramo = true;

    return {
      idAnalisis: generarIdAnalisis(),
      nombreArchivo: archivo.name,
      segundosPorSegmento: SEGUNDOS_POR_SEGMENTO,
      coincidencias,
      creadoEn: new Date().toISOString(),
      origen: 'local',
      metadatos: { ...metadatos, tamanoBytes: archivo.size, formato: formatoDesdeArchivo(archivo) }
    };
  }
}

export const configuracionDemo = CONFIGURACION_DEMO;
