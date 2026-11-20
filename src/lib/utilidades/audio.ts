import { generarIdAnalisis } from './formato';

const PUNTOS_PREDETERMINADOS = 128;

/** Picos deterministas para una onda decorativa cuando aún no hay audio decodificado. */
export function picosSimulados(semilla: string, cantidad = PUNTOS_PREDETERMINADOS): number[] {
  let valor = 0;
  for (const caracter of semilla) valor = (valor * 31 + caracter.charCodeAt(0)) >>> 0;
  return Array.from({ length: cantidad }, (_, indice) => {
    valor = (valor * 1664525 + 1013904223) >>> 0;
    const base = valor / 0xffffffff;
    const envolvente = 0.35 + 0.65 * Math.abs(Math.sin((indice / cantidad) * Math.PI * 3.5));
    return Math.max(0.06, Math.min(1, base * envolvente));
  });
}

/** Decodifica un audio accesible por URL y devuelve picos normalizados en [0, 1]. */
export async function generarPicosDesdeUrl(
  url: string,
  cantidad = PUNTOS_PREDETERMINADOS
): Promise<number[]> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo leer el audio (${respuesta.status})`);
  const datos = await respuesta.arrayBuffer();
  const contexto = new AudioContext();
  try {
    const audio = await contexto.decodeAudioData(datos);
    const canal = audio.getChannelData(0);
    const tamanoBloque = Math.max(1, Math.floor(canal.length / cantidad));
    const resultado: number[] = [];
    for (let indice = 0; indice < cantidad; indice += 1) {
      let maximo = 0;
      const inicio = indice * tamanoBloque;
      const fin = Math.min(canal.length, inicio + tamanoBloque);
      for (let muestra = inicio; muestra < fin; muestra += 1) {
        maximo = Math.max(maximo, Math.abs(canal[muestra]));
      }
      resultado.push(maximo);
    }
    const techo = Math.max(...resultado, 0.0001);
    return resultado.map((pico) => Math.max(0.06, pico / techo));
  } finally {
    await contexto.close();
  }
}

export function crearUrlObjeto(archivo: File): string {
  return URL.createObjectURL(archivo);
}

export interface MetadatosAudio {
  duracionSegundos?: number;
  frecuenciaMuestreo?: number;
  canales?: number;
}

/** Lee metadatos con Web Audio y recurre al elemento multimedia si falla la decodificación. */
export async function leerMetadatosAudio(archivo: File): Promise<MetadatosAudio> {
  if (archivo.size > 0 && archivo.size <= 40 * 1024 * 1024 && typeof AudioContext !== 'undefined') {
    let contexto: AudioContext | null = null;
    try {
      contexto = new AudioContext();
      const datos = await archivo.arrayBuffer();
      const audio = await contexto.decodeAudioData(datos);
      return {
        duracionSegundos: audio.duration,
        frecuenciaMuestreo: audio.sampleRate,
        canales: audio.numberOfChannels
      };
    } catch {
      // Se intenta la vía ligera antes de rendirse.
    } finally {
      await contexto?.close().catch(() => undefined);
    }
  }

  const url = crearUrlObjeto(archivo);
  const elemento = document.createElement('audio');
  elemento.preload = 'metadata';
  elemento.src = url;
  try {
    return await new Promise<MetadatosAudio>((resolve) => {
      const terminar = (valor: MetadatosAudio) => {
        elemento.onloadedmetadata = null;
        elemento.onerror = null;
        resolve(valor);
      };
      elemento.onloadedmetadata = () =>
        terminar({
          duracionSegundos: Number.isFinite(elemento.duration) ? elemento.duration : undefined
        });
      elemento.onerror = () => terminar({});
      setTimeout(() => terminar({}), 3_000);
    });
  } finally {
    liberarUrlObjeto(url);
  }
}

export function liberarUrlObjeto(url: string | null | undefined): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

/** Convierte un archivo en bytes para un comando Tauri. */
export async function archivoABytes(archivo: File): Promise<number[]> {
  const datos = new Uint8Array(await archivo.arrayBuffer());
  return Array.from(datos);
}

export function idTemporalAudio(): string {
  return generarIdAnalisis().slice(0, 12);
}
