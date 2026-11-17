export type NombreRuta =
  | 'nuevo'
  | 'progreso'
  | 'resultados'
  | 'historial'
  | 'catalogo'
  | 'error'
  | 'no-encontrado';

export interface Ruta {
  nombre: NombreRuta;
  parametros: Record<string, string>;
  consulta: URLSearchParams;
  hash: string;
}

const RUTA_INICIAL = '/nuevo';

function parsearHash(hash: string): Ruta {
  const limpio = (hash || '').replace(/^#/, '') || RUTA_INICIAL;
  const [rutaCruda, consultaCruda = ''] = limpio.split('?');
  const segmentos = rutaCruda.split('/').filter(Boolean);
  const consulta = new URLSearchParams(consultaCruda);
  const primero = segmentos[0] ?? 'nuevo';

  if (primero === 'resultados' && segmentos[1]) {
    try {
      return { nombre: 'resultados', parametros: { id: decodeURIComponent(segmentos[1]) }, consulta, hash: limpio };
    } catch {
      return { nombre: 'no-encontrado', parametros: { ruta: limpio }, consulta, hash: limpio };
    }
  }
  if (primero === 'error' && segmentos[1]) {
    return { nombre: 'error', parametros: { codigo: segmentos[1] }, consulta, hash: limpio };
  }
  if (primero === 'progreso') {
    return { nombre: 'progreso', parametros: {}, consulta, hash: limpio };
  }
  if (primero === 'historial') {
    return { nombre: 'historial', parametros: {}, consulta, hash: limpio };
  }
  if (primero === 'catalogo') {
    return { nombre: 'catalogo', parametros: {}, consulta, hash: limpio };
  }
  if (primero === 'nuevo' || primero === 'inicio') {
    return { nombre: 'nuevo', parametros: {}, consulta, hash: limpio };
  }
  return { nombre: 'no-encontrado', parametros: { ruta: limpio }, consulta, hash: limpio };
}

export function construirHash(
  nombre: NombreRuta,
  parametros: Record<string, string | number> = {},
  consulta: Record<string, string | number | undefined> = {}
): string {
  let base = `/${nombre}`;
  if (nombre === 'resultados' && parametros.id !== undefined) base += `/${encodeURIComponent(parametros.id)}`;
  if (nombre === 'error' && parametros.codigo !== undefined) base += `/${parametros.codigo}`;
  const parametrosConsulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries(consulta)) {
    if (valor !== undefined && valor !== '') parametrosConsulta.set(clave, String(valor));
  }
  const sufijo = parametrosConsulta.toString();
  return `#${base}${sufijo ? `?${sufijo}` : ''}`;
}

class Enrutador {
  actual = $state<Ruta>(
    typeof window === 'undefined' ? parsearHash(RUTA_INICIAL) : parsearHash(window.location.hash)
  );

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('hashchange', () => {
      this.actual = parsearHash(window.location.hash);
    });
    if (!window.location.hash) {
      window.history.replaceState(null, '', `#${RUTA_INICIAL}`);
      this.actual = parsearHash(RUTA_INICIAL);
    }
  }

  irA(hash: string, reemplazar = false): void {
    const destino = hash.startsWith('#') ? hash : `#${hash}`;
    if (reemplazar) {
      window.history.replaceState(null, '', destino);
      this.actual = parsearHash(destino);
    } else {
      window.location.hash = destino.slice(1);
    }
  }

  ir(
    nombre: NombreRuta,
    parametros: Record<string, string | number> = {},
    consulta: Record<string, string | number | undefined> = {},
    reemplazar = false
  ): void {
    this.irA(construirHash(nombre, parametros, consulta), reemplazar);
  }

  atras(): void {
    window.history.back();
  }

  get modal(): string | null {
    return this.actual.consulta.get('modal');
  }
}

export const enrutador = new Enrutador();

export function enlace(
  nombre: NombreRuta,
  parametros: Record<string, string | number> = {},
  consulta: Record<string, string | number | undefined> = {}
): string {
  return construirHash(nombre, parametros, consulta);
}
