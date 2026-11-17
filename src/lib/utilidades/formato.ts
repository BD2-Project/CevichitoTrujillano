import type { EstadoAnalisis, Tono } from '../datos/tipos';

const DOS_CIFRAS = new Intl.NumberFormat('es-ES', { minimumIntegerDigits: 2 });

/** Segundos → `mm:ss` o `hh:mm:ss` con relleno de dos cifras. */
export function formatearDuracion(segundos: number, incluirHoras = false): string {
  const total = Math.max(0, Math.floor(Number.isFinite(segundos) ? segundos : 0));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const restantes = total % 60;
  const base = `${DOS_CIFRAS.format(minutos)}:${DOS_CIFRAS.format(restantes)}`;
  return incluirHoras || horas > 0 ? `${DOS_CIFRAS.format(horas)}:${base}` : base;
}

/** Segundos → `00:02:45.120`, para lecturas forenses. */
export function formatearCodigoTiempo(segundos: number): string {
  const totalMs = Math.max(0, Math.round(Number.isFinite(segundos) ? segundos * 1000 : 0));
  const horas = Math.floor(totalMs / 3_600_000);
  const minutos = Math.floor((totalMs % 3_600_000) / 60_000);
  const seg = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${DOS_CIFRAS.format(horas)}:${DOS_CIFRAS.format(minutos)}:${DOS_CIFRAS.format(seg)}.${String(ms).padStart(3, '0')}`;
}

export function formatearSimilitud(valor: number | null, decimales = 1): string {
  if (valor === null || !Number.isFinite(valor)) return '—';
  return `${(valor * 100).toFixed(decimales).replace('.', ',')} %`;
}

export function formatearNumero(valor: number, decimales = 0): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  }).format(valor);
}

export function formatearTamano(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const unidades = ['B', 'KB', 'MB', 'GB'];
  const indice = Math.min(unidades.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** indice).toFixed(indice === 0 ? 0 : 1).replace('.', ',')} ${unidades[indice]}`;
}

const FECHA_LARGA = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const FECHA_CORTA = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

export function formatearFecha(iso: string, corta = false): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return (corta ? FECHA_CORTA : FECHA_LARGA).format(fecha);
}

export function formatearRelativo(iso: string, ahora = Date.now()): string {
  const fecha = new Date(iso).getTime();
  if (!Number.isFinite(fecha)) return '—';
  const diferencia = Math.max(0, ahora - fecha);
  const minutos = Math.floor(diferencia / 60_000);
  if (minutos < 1) return 'ahora mismo';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `hace ${dias} d`;
  return formatearFecha(iso, true);
}

export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function tonoSimilitud(valor: number): Tono {
  if (valor >= 0.9) return 'exito';
  if (valor >= 0.7) return 'info';
  if (valor >= 0.4) return 'advertencia';
  return 'neutro';
}

export function etiquetaSimilitud(valor: number): string {
  if (valor >= 0.9) return 'Similitud alta';
  if (valor >= 0.7) return 'Similitud notable';
  if (valor >= 0.4) return 'Similitud moderada';
  return 'Similitud baja';
}

export function etiquetaEstado(estado: EstadoAnalisis): string {
  switch (estado) {
    case 'con-evidencia':
      return 'Con evidencia';
    case 'sin-evidencia':
      return 'Sin evidencia';
    case 'error':
      return 'Error';
  }
}

export function tonoEstado(estado: EstadoAnalisis): Tono {
  switch (estado) {
    case 'con-evidencia':
      return 'info';
    case 'sin-evidencia':
      return 'neutro';
    case 'error':
      return 'peligro';
  }
}

export function abreviarId(id: string, longitud = 8): string {
  return id.length <= longitud ? id : id.slice(0, longitud);
}

export function generarIdAnalisis(): string {
  const partes = new Uint8Array(16);
  crypto.getRandomValues(partes);
  partes[6] = (partes[6] & 0x0f) | 0x40;
  partes[8] = (partes[8] & 0x3f) | 0x80;
  const hexadecimal = Array.from(partes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  // SoupDB usa uuid4().hex: 32 hexadecimales sin guiones.
  return hexadecimal.replace(/-/g, '');
}

export function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export function nombreArchivoSeguro(nombre: string): string {
  const ultimo = nombre.split(/[\\/]/).pop() ?? nombre;
  return ultimo.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 255) || 'upload';
}
