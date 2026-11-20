import { SEGUNDOS_POR_SEGMENTO } from '../datos/constantes';
import type { DetalleCancion, ResultadoAnalisis, ResumenAnalisis, SegmentoAudio } from '../datos/tipos';

interface FilaSegmento {
  segment_id: number;
  song_id: number;
  segment_index: number;
  start_seconds: number;
  end_seconds: number;
  audio_ref: string;
}

export interface FilaCancion {
  song_id: number;
  title: string;
  artist: string;
  audio_path: string;
  duration_seconds: number;
  segment_count?: number;
  genre?: string | null;
  year?: number | null;
  collection?: string | null;
  license?: string | null;
  segments?: FilaSegmento[] | null;
}

interface FilaCoincidencia {
  match_order?: number;
  song_id: number;
  title: string;
  artist: string;
  query_start: number;
  query_end: number;
  source_start: number;
  source_end: number;
  score: number;
  segment_count: number;
  min_score: number;
  max_score: number;
  alignment_offset_seconds: number;
  is_best_run: boolean;
}

export interface FilaAnalisisResumen {
  analysis_id: string;
  filename: string;
  created_at: string;
  segment_seconds: number;
  match_count: number;
  song_count?: number;
  best_score?: number | null;
  status?: 'con-evidencia' | 'sin-evidencia' | 'error' | null;
}

export interface FilaAnalisis {
  analysis_id: string;
  filename: string;
  created_at: string;
  segment_seconds: number;
  matches: FilaCoincidencia[];
}

/** `%Y-%m-%dT%H:%M:%S.%fZ` puede traer 6 decimales; Date espera 3. */
function normalizarFechaSql(valor: string): string {
  const coincidencia = valor.match(/^(.*\.\d{3})\d*Z$/);
  return coincidencia ? `${coincidencia[1]}Z` : valor;
}

function mapearSegmento(fila: FilaSegmento): SegmentoAudio {
  return {
    idSegmento: fila.segment_id,
    idCancion: fila.song_id,
    indiceSegmento: fila.segment_index,
    inicioSegundos: fila.start_seconds,
    finSegundos: fila.end_seconds,
    referenciaAudio: fila.audio_ref
  };
}

export function mapearCancion(fila: FilaCancion): DetalleCancion {
  const segmentos = (fila.segments ?? []).map(mapearSegmento);
  return {
    idCancion: fila.song_id,
    titulo: fila.title,
    artista: fila.artist,
    duracionSegundos: fila.duration_seconds,
    cantidadSegmentos: fila.segment_count ?? segmentos.length,
    urlAudio: fila.audio_path,
    genero: fila.genre ?? 'Sin clasificar',
    anio: fila.year ?? 0,
    coleccion: fila.collection ?? 'Sin colección',
    licencia: fila.license ?? undefined,
    origen: 'persistido',
    segmentos
  };
}

export function mapearResultado(fila: FilaAnalisis): ResultadoAnalisis {
  return {
    idAnalisis: fila.analysis_id,
    nombreArchivo: fila.filename,
    creadoEn: normalizarFechaSql(fila.created_at),
    segundosPorSegmento: fila.segment_seconds ?? SEGUNDOS_POR_SEGMENTO,
    origen: 'persistido',
    coincidencias: (fila.matches ?? [])
      .map((match) => ({
        inicioConsulta: match.query_start,
        finConsulta: match.query_end,
        idCancion: match.song_id,
        titulo: match.title,
        artista: match.artist,
        inicioFuente: match.source_start,
        finFuente: match.source_end,
        similitud: match.score,
        cantidadSegmentos: match.segment_count,
        similitudMinima: match.min_score,
        similitudMaxima: match.max_score,
        desplazamientoAlineacion: match.alignment_offset_seconds,
        esMejorTramo: match.is_best_run
      }))
      .sort((a, b) => Number(b.esMejorTramo) - Number(a.esMejorTramo) || b.similitud - a.similitud)
  };
}

export function mapearResumen(fila: FilaAnalisisResumen): ResumenAnalisis {
  return {
    idAnalisis: fila.analysis_id,
    nombreArchivo: fila.filename,
    creadoEn: normalizarFechaSql(fila.created_at),
    segundosPorSegmento: fila.segment_seconds ?? SEGUNDOS_POR_SEGMENTO,
    cantidadCoincidencias: fila.match_count,
    cantidadCanciones: fila.song_count ?? 0,
    mejorSimilitud: fila.best_score ?? null,
    estado: fila.status ?? (fila.match_count > 0 ? 'con-evidencia' : 'sin-evidencia'),
    origen: 'persistido'
  };
}
