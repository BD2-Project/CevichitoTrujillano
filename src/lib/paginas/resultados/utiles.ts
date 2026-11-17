import type { Coincidencia, OrigenDato, Tono } from '../../datos/tipos';
import { formatearNumero } from '../../utilidades/formato';
import type { OrdenCoincidencias } from './tipos';

export interface CoincidenciaIndexada {
  /** Posición original dentro de `resultado.coincidencias`. */
  indice: number;
  coincidencia: Coincidencia;
}

const ETIQUETAS_ORIGEN: Record<OrigenDato, string> = {
  persistido: 'Persistido en SoupDB',
  local: 'Carga local',
  demo: 'Datos de demostración'
};

const TONOS_ORIGEN: Record<OrigenDato, Tono> = {
  persistido: 'info',
  local: 'primario',
  demo: 'terciario'
};

export function etiquetaOrigen(origen?: OrigenDato): string {
  return origen ? ETIQUETAS_ORIGEN[origen] : 'Origen no indicado';
}

export function tonoOrigen(origen?: OrigenDato): Tono {
  return origen ? TONOS_ORIGEN[origen] : 'neutro';
}

/** Desplazamiento de alineación con signo explícito y separador decimal local. */
export function formatearDesplazamiento(segundos: number): string {
  const valor = Number.isFinite(segundos) ? segundos : 0;
  if (Math.abs(valor) < 0.005) return '0,00 s';
  const signo = valor > 0 ? '+' : '−';
  return `${signo}${formatearNumero(Math.abs(valor), 2)} s`;
}

/** Devuelve las coincidencias con su índice original, sin mutar el resultado. */
export function indexarYOrdenar(
  coincidencias: Coincidencia[],
  orden: OrdenCoincidencias
): CoincidenciaIndexada[] {
  const entradas = coincidencias.map((coincidencia, indice) => ({ coincidencia, indice }));
  entradas.sort((a, b) => {
    if (orden === 'tiempo') {
      const diferencia = a.coincidencia.inicioConsulta - b.coincidencia.inicioConsulta;
      if (diferencia !== 0) return diferencia;
    }
    return (
      b.coincidencia.similitud - a.coincidencia.similitud ||
      a.coincidencia.inicioConsulta - b.coincidencia.inicioConsulta
    );
  });
  return entradas;
}

export function claveCoincidencia(item: CoincidenciaIndexada): string {
  return `${item.indice}-${item.coincidencia.idCancion}-${item.coincidencia.inicioConsulta}`;
}

export function cantidadSegmentosTotales(coincidencias: Coincidencia[]): number {
  return coincidencias.reduce((total, item) => total + item.cantidadSegmentos, 0);
}

export function materialCubierto(coincidencias: Coincidencia[]): number {
  const tramos = coincidencias
    .map((item) => [Math.max(0, item.inicioConsulta), item.finConsulta] as const)
    .filter(([inicio, fin]) => Number.isFinite(inicio) && Number.isFinite(fin) && fin > inicio)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let inicio = 0;
  let fin = 0;
  for (const tramo of tramos) {
    if (tramo[0] > fin) {
      total += fin - inicio;
      [inicio, fin] = tramo;
    } else {
      fin = Math.max(fin, tramo[1]);
    }
  }
  return total + fin - inicio;
}
