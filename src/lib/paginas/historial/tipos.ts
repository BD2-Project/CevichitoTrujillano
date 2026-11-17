import type { EstadoAnalisis, FiltrosHistorial } from '../../datos/tipos';

export type EstadoFiltro = 'todos' | EstadoAnalisis;
export type RangoFiltro = FiltrosHistorial['rango'];
export type OrdenFiltro = FiltrosHistorial['orden'];

/** Filtros aplicables en la pantalla de historial (sin filtro de catálogo). */
export interface FiltrosHistorialUI {
  busqueda: string;
  estado: EstadoFiltro;
  rango: RangoFiltro;
  similitudMinima: number;
  orden: OrdenFiltro;
}

/** Métricas reales derivadas de `app.analisis`. */
export interface MetricasHistorial {
  total: number;
  conEvidencia: number;
  sinEvidencia: number;
  errores: number;
  demo: number;
  coincidencias: number;
  canciones: number;
  mejorGlobal: number | null;
  mediaMejor: number | null;
  duracionTotal: number;
  duracionMedia: number | null;
  tamanoTotal: number;
  formatos: string[];
}

export interface ConteoEstados {
  todos: number;
  conEvidencia: number;
  sinEvidencia: number;
  errores: number;
}
