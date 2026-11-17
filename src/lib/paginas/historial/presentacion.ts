import type { EstadoAnalisis, ResumenAnalisis } from '../../datos/tipos';
import { formatearDuracion, formatearNumero, formatearTamano } from '../../utilidades/formato';

/** Línea compacta con formato, duración y tamaño del archivo, si existen. */
export function metadatosArchivo(item: ResumenAnalisis): string {
  const partes: string[] = [];
  if (item.formato) partes.push(item.formato.toUpperCase());
  if (item.duracionArchivoSegundos !== undefined) {
    partes.push(formatearDuracion(item.duracionArchivoSegundos));
  }
  if (item.tamanoBytes !== undefined) partes.push(formatearTamano(item.tamanoBytes));
  return partes.length > 0 ? partes.join(' · ') : 'Metadatos del archivo no disponibles';
}

/** Frecuencia de muestreo y canales, cuando el navegador pudo leerlos. */
export function detalleTecnico(item: ResumenAnalisis): string | null {
  const partes: string[] = [];
  if (item.frecuenciaMuestreo !== undefined) {
    partes.push(`${formatearNumero(item.frecuenciaMuestreo)} Hz`);
  }
  if (item.canales !== undefined) {
    partes.push(item.canales === 1 ? 'Mono' : 'Estéreo');
  }
  return partes.length > 0 ? partes.join(' · ') : null;
}

export function iconoEstado(estado: EstadoAnalisis): string {
  switch (estado) {
    case 'con-evidencia':
      return 'fingerprint';
    case 'sin-evidencia':
      return 'check_circle';
    case 'error':
      return 'error';
  }
}

export function textoCoincidencias(cantidad: number): string {
  return `${formatearNumero(cantidad)} ${cantidad === 1 ? 'coincidencia' : 'coincidencias'}`;
}

export function textoCanciones(cantidad: number): string {
  return `${formatearNumero(cantidad)} ${cantidad === 1 ? 'canción' : 'canciones'}`;
}
