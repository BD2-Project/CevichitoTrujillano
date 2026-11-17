import {
  CATALOGO_PREDETERMINADO,
  GENEROS,
  K_VECINOS_PREDETERMINADO,
  SEGUNDOS_POR_SEGMENTO
} from './constantes';
import type {
  CancionCatalogo,
  Coincidencia,
  DetalleCancion,
  ErrorAnalisis,
  ResumenAnalisis,
  SegmentoAudio
} from './tipos';

const ADJETIVOS = [
  'Aurora',
  'Mar',
  'Sinfonía',
  'Ecos',
  'Preludio',
  'Nocturno',
  'Variaciones',
  'Concierto',
  'Fuga',
  'Ritual'
] as const;

const SUSTANTIVOS = [
  'Urbana',
  'Abierto',
  'Fragmentada',
  'Tropical',
  'de Otoño',
  'Nocturna',
  'Andina',
  'de Cristal',
  'Salvaje',
  'Interior'
] as const;

const ARTISTAS = [
  'Ensemble Amazónico',
  'Dra. Elena Velasco',
  'Colectivo Sonoro',
  'Marea Alta',
  'Taller de Ruido',
  'Lucía Ferrando',
  'Nodo Andino',
  'Cámara 22',
  'Estudio Páramo',
  'Río Secreto',
  'Música de Archivo',
  'Trío Meridiano',
  'Laboratorio Tímbrico',
  'Ana Quispe',
  'Sergio Landa',
  'Fonoteca Universitaria'
] as const;

const NOMBRES_ANALISIS = [
  'remix_2024.mp3',
  'nocturno_sintetizado_v2.wav',
  'grabacion_campo_paisaje.flac',
  'preludio_piano_estudio.mp3',
  'beat_trap_urban_loop.wav',
  'cumbia_mezcla_final.mp3',
  'podcast_intro_musical.wav',
  'demo_cover_aurora.mp3',
  'ensayo_cuerdas_03.wav',
  'mezcla_master_mar_abierto.flac',
  'fragmento_radio_2026.mp3',
  'loop_percusion_andina.wav',
  'maqueta_voz_y_guitarra.mp3',
  'collage_acustico_final.wav'
] as const;

const TAMANOS = [
  7_820_000, 38_500_000, 52_100_000, 9_100_000, 18_200_000, 6_400_000, 11_300_000, 8_700_000,
  24_100_000, 41_900_000, 5_600_000, 14_800_000, 3_900_000, 29_700_000
] as const;

const DURACIONES = [200, 255, 510, 165, 110, 192, 78, 214, 301, 248, 132, 96, 188, 276] as const;

const FORMATOS = ['MP3', 'WAV', 'FLAC', 'MP3', 'WAV', 'MP3', 'WAV', 'MP3', 'WAV', 'FLAC', 'MP3', 'WAV', 'MP3', 'WAV'] as const;

const FRECUENCIAS = [44_100, 96_000, 48_000, 44_100, 48_000, 44_100, 48_000, 44_100, 96_000, 48_000, 44_100, 48_000, 44_100, 48_000] as const;

const BASE_TIEMPO = new Date('2026-11-17T12:00:00.000Z').getTime();

function tono(i: number): number {
  const valores = [0, 2, 4, 7, 9, 12, 14, 16];
  return valores[i % valores.length];
}

export function crearCatalogoInicial(): DetalleCancion[] {
  const canciones: DetalleCancion[] = [];
  for (let indice = 0; indice < 80; indice += 1) {
    const adjetivo = ADJETIVOS[indice % ADJETIVOS.length];
    const sustantivo = SUSTANTIVOS[Math.floor(indice / ADJETIVOS.length) % SUSTANTIVOS.length];
    const idCancion = indice + 1;
    const duracion = 29.98;
    const cantidadSegmentos = 6;
    const titulo = indice < 10 ? `${adjetivo} ${sustantivo}` : `${adjetivo} ${sustantivo} · ${String(indice + 1).padStart(2, '0')}`;
    const segmentos: SegmentoAudio[] = Array.from({ length: cantidadSegmentos }, (_, segmento) => {
      const referenciaAudio = `tracks/${String(idCancion).padStart(3, '0')}.mp3#segment=${String(segmento).padStart(6, '0')}`;
      return {
        idSegmento: idCancion * 10 + segmento + 1,
        idCancion,
        indiceSegmento: segmento,
        inicioSegundos: segmento * SEGUNDOS_POR_SEGMENTO,
        finSegundos: Math.min(duracion, (segmento + 1) * SEGUNDOS_POR_SEGMENTO),
        referenciaAudio
      };
    });
    canciones.push({
      idCancion,
      titulo,
      artista: ARTISTAS[indice % ARTISTAS.length],
      duracionSegundos: duracion,
      cantidadSegmentos,
      urlAudio: `/audio/catalogo/${String(idCancion).padStart(3, '0')}.mp3`,
      genero: GENEROS[indice % GENEROS.length],
      anio: 2018 + (indice % 7),
      coleccion: CATALOGO_PREDETERMINADO,
      licencia: indice % 3 === 0 ? 'CC BY-NC 4.0' : 'CC BY 4.0',
      origen: 'demo',
      segmentos
    });
  }
  return canciones;
}

function crearCoincidencia(
  cancion: DetalleCancion,
  indice: number,
  inicioConsulta: number,
  cantidadSegmentos: number,
  similitudBase: number,
  fuenteInicio: number
): Coincidencia {
  const finConsulta = inicioConsulta + cantidadSegmentos * SEGUNDOS_POR_SEGMENTO;
  const finFuente = Math.min(cancion.duracionSegundos, fuenteInicio + cantidadSegmentos * SEGUNDOS_POR_SEGMENTO);
  const similitud = Math.max(0.08, Math.min(0.999, similitudBase - indice * 0.012));
  const minimo = Math.max(0.05, similitud - 0.035);
  const maximo = Math.min(0.999, similitud + 0.025);
  return {
    inicioConsulta,
    finConsulta,
    idCancion: cancion.idCancion,
    titulo: cancion.titulo,
    artista: cancion.artista,
    inicioFuente: fuenteInicio,
    finFuente,
    similitud,
    cantidadSegmentos,
    similitudMinima: minimo,
    similitudMaxima: maximo,
    desplazamientoAlineacion: fuenteInicio - inicioConsulta,
    esMejorTramo: indice === 0
  };
}

export interface AnalisisCompletoDemo extends ResumenAnalisis {
  coincidencias: Coincidencia[];
}

export function crearAnalisisIniciales(catalogo: DetalleCancion[]): AnalisisCompletoDemo[] {
  return NOMBRES_ANALISIS.map((nombreArchivo, indice) => {
    const idAnalisis = indice === 0
      ? 'aeb1eb30c00940d196be845ac2adf00f'
      : `${(0x7f3c0000 + indice * 7919).toString(16).padStart(8, '0')}${String(indice + 1).padStart(24, 'a')}`;
    const cantidad = indice === 6 ? 0 : indice === 1 ? 4 : indice % 3 === 0 ? 2 : 1;
    const coincidencias: Coincidencia[] = [];
    for (let posicion = 0; posicion < cantidad; posicion += 1) {
      const cancion = catalogo[(indice * 5 + posicion * 3) % catalogo.length];
      const inicioConsulta = posicion * 15 + (indice % 4) * 5;
      const similitud = indice === 0
        ? [0.968, 0.884][posicion] ?? 0.72
        : 0.94 - indice * 0.037 - posicion * 0.09;
      const fuenteInicio = (indice + posicion) % 3 === 0 ? inicioConsulta : Math.max(0, inicioConsulta - 5);
      coincidencias.push(
        crearCoincidencia(cancion, posicion, inicioConsulta, posicion === 0 ? 4 : 2, similitud, fuenteInicio)
      );
    }
    coincidencias.sort((a, b) => b.similitud - a.similitud);
    const mejor = coincidencias[0]?.similitud ?? null;
    const desplazamiento = indice * 47 + 15;
    const creadoEn = new Date(BASE_TIEMPO - desplazamiento * 60_000).toISOString();
    const duracion = DURACIONES[indice];
    const tamano = TAMANOS[indice];
    return {
      idAnalisis,
      nombreArchivo,
      creadoEn,
      segundosPorSegmento: SEGUNDOS_POR_SEGMENTO,
      cantidadCoincidencias: coincidencias.length,
      cantidadCanciones: new Set(coincidencias.map((item) => item.idCancion)).size,
      mejorSimilitud: mejor,
      estado: coincidencias.length > 0 ? 'con-evidencia' : 'sin-evidencia',
      origen: 'demo',
      duracionArchivoSegundos: duracion,
      tamanoBytes: tamano,
      formato: FORMATOS[indice],
      frecuenciaMuestreo: FRECUENCIAS[indice],
      canales: indice % 4 === 0 ? 1 : 2,
      nota: indice === 0
        ? 'Prueba de humo sobre el catálogo académico. La similitud es evidencia, no un dictamen.'
        : indice === 6
          ? 'Sin evidencia por encima de la similitud observada; el archivo se procesó correctamente.'
          : undefined,
      coincidencias
    };
  });
}

export const ERRORES_DEMO: Record<'422' | '503' | '500', ErrorAnalisis> = {
  '422': {
    codigo: '422',
    titulo: 'El audio no se pudo procesar',
    mensaje: 'El archivo está vacío, no se puede decodificar o dura menos de 2,5 s.',
    detalle:
      'El analizador necesita al menos un segmento de 5 s (o un último tramo de 2,5 s) para consultar el índice HNSW. No se guardó nada en el historial.',
    sugerencias: [
      'Comprueba que el archivo sea WAV, MP3, FLAC, OGG o AU válido.',
      'Recorta silencios iniciales extremos o sube una versión más larga.',
      'Vuelve a exportar el audio desde tu editor y reintenta.'
    ],
    solicitud: 'POST /api/v1/analyze · multipart/form-data',
    fecha: new Date(BASE_TIEMPO).toISOString()
  },
  '503': {
    codigo: '503',
    titulo: 'El servicio de análisis no está disponible',
    mensaje: 'Falta el índice de copyright o el perfil acústico no está cargado.',
    detalle:
      'El backend responde 503 cuando el analizador no está configurado, el HNSW no está disponible o el codebook/perfil no coincide. La aplicación no puede continuar hasta que el servicio esté listo.',
    sugerencias: [
      'Verifica que el gestor SoupDB esté escuchando en el puerto configurado.',
      'Confirma que el catálogo se preparó con codebook e índice HNSW antes de arrancar.',
      'Revisa las variables COPYRIGHT_* del servicio de análisis.'
    ],
    solicitud: 'POST /api/v1/analyze · servicio no configurado',
    fecha: new Date(BASE_TIEMPO - 3_600_000).toISOString()
  },
  '500': {
    codigo: '500',
    titulo: 'Error interno durante el análisis',
    mensaje: 'El servidor no pudo completar la operación.',
    detalle:
      'Se produjo un fallo inesperado. El backend registra el detalle en su log y devuelve un mensaje genérico para no exponer rutas internas.',
    sugerencias: [
      'Reintenta el análisis una vez.',
      'Si el error persiste, revisa el log del servicio de copyright.',
      'No se conserva el audio subido: puedes volver a cargarlo sin problema.'
    ],
    solicitud: 'POST /api/v1/analyze · error interno',
    fecha: new Date(BASE_TIEMPO - 7_200_000).toISOString()
  }
};

export const CONFIGURACION_DEMO = {
  idCatalogo: 'fondo-general',
  descripcion: 'Fondo General Académico · 80 canciones · 480 segmentos',
  kVecinos: K_VECINOS_PREDETERMINADO,
  notas: ''
};

export const CANCION_DESTACADA: Pick<CancionCatalogo, 'idCancion' | 'titulo' | 'artista' | 'duracionSegundos' | 'urlAudio' | 'genero' | 'anio' | 'coleccion'> = {
  idCancion: 1,
  titulo: 'Aurora Urbana',
  artista: 'Ensemble Amazónico',
  duracionSegundos: 29.98,
  urlAudio: '/audio/catalogo/001.mp3',
  genero: GENEROS[0],
  anio: 2024,
  coleccion: CATALOGO_PREDETERMINADO
};

export function obtenerPicosMock(semilla: string): number[] {
  const puntos = 96;
  let valor = 0;
  for (const caracter of semilla) valor = (valor * 33 + caracter.charCodeAt(0)) >>> 0;
  return Array.from({ length: puntos }, (_, indice) => {
    valor = (valor * 1103515245 + 12345) >>> 0;
    const base = (valor % 1000) / 1000;
    const envolvente = 0.4 + 0.6 * Math.sin((indice / puntos) * Math.PI);
    return Math.max(0.08, Math.min(1, base * envolvente));
  });
}

export function duracionTotalCatalogo(catalogo: CancionCatalogo[]): number {
  return catalogo.reduce((total, cancion) => total + cancion.duracionSegundos, 0);
}

export function crearSegmentosParaCancion(
  cancion: Pick<CancionCatalogo, 'idCancion' | 'duracionSegundos' | 'titulo'>,
  primerIdSegmento: number
): SegmentoAudio[] {
  const cantidad = Math.max(1, Math.ceil(cancion.duracionSegundos / SEGUNDOS_POR_SEGMENTO));
  const ruta = `tracks/${String(cancion.idCancion).padStart(3, '0')}.mp3`;
  return Array.from({ length: cantidad }, (_, indice) => ({
    idSegmento: primerIdSegmento + indice,
    idCancion: cancion.idCancion,
    indiceSegmento: indice,
    inicioSegundos: indice * SEGUNDOS_POR_SEGMENTO,
    finSegundos: Math.min(cancion.duracionSegundos, (indice + 1) * SEGUNDOS_POR_SEGMENTO),
    referenciaAudio: `${ruta}#segment=${String(indice).padStart(6, '0')}`
  }));
}

export function notaTonal(indice: number): number {
  return tono(indice);
}
