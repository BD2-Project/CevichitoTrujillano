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

export interface ConteoEstados {
  todos: number;
  conEvidencia: number;
  sinEvidencia: number;
  errores: number;
}
