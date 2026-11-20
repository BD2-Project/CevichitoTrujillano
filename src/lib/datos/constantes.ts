import type { FiltrosHistorial } from './tipos';

export const NOMBRE_APLICACION = 'CevichitoTrujillano';
export const NOMBRE_COMPLETO = 'CevichitoTrujillano · Evidencia acústica';
export const NOMBRE_SERVICIO = 'soupdb-copyright-api';
export const VERSION_ESQUEMA = 'v1.1';

export const CATALOGO_PREDETERMINADO = 'Fondo General Académico';
export const SEGUNDOS_POR_SEGMENTO = 5;
export const DIMENSION_VECTOR = 128;
export const COEFICIENTES_MFCC = 20;
export const FRECUENCIA_MUESTREO = 22050;
export const K_VECINOS_PREDETERMINADO = 5;
export const METRICA_INDICE = 'euclidean';
export const NOMBRE_INDICE = 'HNSW';

export const FILTROS_INICIALES: FiltrosHistorial = {
  busqueda: '',
  estado: 'todos',
  rango: 'todo',
  catalogo: 'todos',
  similitudMinima: 0,
  orden: 'recientes'
};

export const ETIQUETAS_ESTADO = {
  'con-evidencia': 'Con evidencia',
  'sin-evidencia': 'Sin evidencia',
  error: 'Error'
} as const;

export const ETIQUETAS_RANGO = {
  hoy: 'Hoy',
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  todo: 'Todo el histórico'
} as const;

export const ETIQUETAS_ORDEN = {
  recientes: 'Más recientes primero',
  antiguos: 'Más antiguos primero',
  similitud: 'Mayor similitud primero'
} as const;

export const UMBRALES_SIMILITUD = [
  { valor: 0, etiqueta: 'Toda la evidencia' },
  { valor: 0.5, etiqueta: 'Similitud ≥ 50 %' },
  { valor: 0.7, etiqueta: 'Similitud ≥ 70 %' },
  { valor: 0.8, etiqueta: 'Similitud ≥ 80 %' },
  { valor: 0.95, etiqueta: 'Similitud ≥ 95 %' }
] as const;

export const GENEROS = [
  'Electronic',
  'Experimental',
  'Folk',
  'Hip-Hop',
  'Instrumental',
  'International',
  'Pop',
  'Rock'
] as const;

export const EXTENSIONES_AUDIO = ['.wav', '.mp3', '.flac', '.ogg', '.au'] as const;

export const CLAVES_ALMACENAMIENTO = {
  preferencias: 'cevichitotrujillano:preferencias',
  borradores: 'cevichitotrujillano:borradores'
} as const;
