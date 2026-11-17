import { CATALOGO_PREDETERMINADO, GENEROS } from '../datos/constantes';
import type { ReferenciaNueva } from '../datos/tipos';
import { normalizarBusqueda } from '../utilidades/formato';

/** Cabeceras que entiende el importador. */
export const CABECERAS_ADMITIDAS = [
  'titulo',
  'artista',
  'anio',
  'genero',
  'coleccion',
  'duracion_segundos',
  'ruta_audio',
  'licencia'
] as const;

export type CabeceraCsv = (typeof CABECERAS_ADMITIDAS)[number];

const CABECERAS_OBLIGATORIAS: readonly CabeceraCsv[] = [
  'titulo',
  'artista',
  'duracion_segundos',
  'ruta_audio'
];

/** Línea de cabeceras lista para copiar o descargar. */
export const CABECERAS_TEXTO =
  'titulo;artista;anio;genero;coleccion;duracion_segundos;ruta_audio;licencia';

/**
 * Alias tolerantes: se normalizan tildes y mayúsculas, de modo que «Año»,
 * «Duración_segundos» o «Ruta de audio» también se aceptan.
 */
const ALIAS: Partial<Record<string, CabeceraCsv>> = {
  titulo: 'titulo',
  artista: 'artista',
  anio: 'anio',
  ano: 'anio',
  genero: 'genero',
  coleccion: 'coleccion',
  duracion_segundos: 'duracion_segundos',
  duracion: 'duracion_segundos',
  ruta_audio: 'ruta_audio',
  ruta_de_audio: 'ruta_audio',
  licencia: 'licencia'
};

export interface FilaImportada {
  /** Número de línea real del archivo, contando cabecera y comentarios. */
  numeroLinea: number;
  referencia: ReferenciaNueva;
  valida: boolean;
  motivos: string[];
}

export interface AnalisisCsv {
  filas: FilaImportada[];
  validas: number;
  omitidas: number;
  separador: ';' | ',';
  cabeceras: string[];
  desconocidas: string[];
  faltantes: string[];
  error: string | null;
}

const ANALISIS_VACIO: AnalisisCsv = {
  filas: [],
  validas: 0,
  omitidas: 0,
  separador: ';',
  cabeceras: [],
  desconocidas: [],
  faltantes: [],
  error: null
};

/** Divide una línea respetando comillas dobles y comas o puntos y coma internos. */
function dividirLinea(linea: string, separador: ';' | ','): string[] {
  const campos: string[] = [];
  let actual = '';
  let entreComillas = false;

  for (let indice = 0; indice < linea.length; indice += 1) {
    const caracter = linea[indice];

    if (entreComillas) {
      if (caracter === '"') {
        if (linea[indice + 1] === '"') {
          actual += '"';
          indice += 1;
        } else {
          entreComillas = false;
        }
      } else {
        actual += caracter;
      }
      continue;
    }

    if (caracter === '"') {
      entreComillas = true;
    } else if (caracter === separador) {
      campos.push(actual);
      actual = '';
    } else {
      actual += caracter;
    }
  }

  campos.push(actual);
  return campos.map((campo) => campo.trim());
}

function normalizarCabecera(texto: string): string {
  return normalizarBusqueda(texto)
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function numeroEntero(texto: string): number | null {
  if (!/^-?\d+$/.test(texto)) return null;
  const valor = Number(texto);
  return Number.isFinite(valor) ? valor : null;
}

function numeroDecimal(texto: string): number | null {
  const valor = Number(texto.replace(',', '.'));
  return Number.isFinite(valor) ? valor : null;
}

function construirReferencia(
  dato: (cabecera: CabeceraCsv) => string
): { referencia: ReferenciaNueva; motivos: string[] } {
  const motivos: string[] = [];
  const titulo = dato('titulo');
  const artista = dato('artista');
  const rutaAudio = dato('ruta_audio');
  const genero = dato('genero') || (GENEROS[4] ?? 'Instrumental');
  const coleccion = dato('coleccion') || CATALOGO_PREDETERMINADO;
  const textoLicencia = dato('licencia');

  if (!titulo) motivos.push('Falta el título');
  if (!artista) motivos.push('Falta el artista');

  let anio = new Date().getFullYear();
  const textoAnio = dato('anio');
  if (textoAnio) {
    const valorAnio = numeroEntero(textoAnio);
    if (valorAnio === null || valorAnio < 1900 || valorAnio > 2100) {
      motivos.push('Año fuera de 1900–2100');
    } else {
      anio = valorAnio;
    }
  }

  const textoDuracion = dato('duracion_segundos');
  const duracion = numeroDecimal(textoDuracion);
  if (!textoDuracion) {
    motivos.push('Falta la duración');
  } else if (duracion === null || duracion < 2.5 || duracion > 3600) {
    motivos.push('Duración fuera de 2,5–3600 s');
  }

  if (!rutaAudio) motivos.push('Falta la ruta de audio');
  else if (rutaAudio.includes('#')) motivos.push('La ruta contiene «#»');

  const referencia: ReferenciaNueva = {
    titulo,
    artista,
    anio,
    genero,
    coleccion,
    duracionSegundos: duracion === null ? 0 : Number(duracion.toFixed(2)),
    rutaAudio,
    licencia: textoLicencia || undefined
  };

  return { referencia, motivos };
}

/** Lee un CSV/TXT del catálogo sin lanzar excepciones: los problemas se describen en el resultado. */
export function analizarCsv(texto: string): AnalisisCsv {
  const contenido = texto.replace(/^\uFEFF/, '');
  const lineas = contenido
    .split(/\r?\n/)
    .map((linea, indice) => ({ texto: linea, numero: indice + 1 }))
    .filter(({ texto: linea }) => linea.trim() !== '' && !linea.trim().startsWith('#'));

  if (lineas.length === 0) return { ...ANALISIS_VACIO };

  const primera = lineas[0].texto;
  const separador: ';' | ',' = primera.includes(';') ? ';' : ',';
  const cabeceras = dividirLinea(primera, separador).map((cabecera) => {
    const normalizada = normalizarCabecera(cabecera);
    return Object.hasOwn(ALIAS, normalizada) ? (ALIAS[normalizada] ?? normalizada) : normalizada;
  });

  const faltantes = CABECERAS_OBLIGATORIAS.filter((cabecera) => !cabeceras.includes(cabecera));
  const desconocidas = cabeceras.filter(
    (cabecera) => cabecera !== '' && !(CABECERAS_ADMITIDAS as readonly string[]).includes(cabecera)
  );

  const repetidas = cabeceras.filter((cabecera, indice) => cabecera && cabeceras.indexOf(cabecera) !== indice);
  if (repetidas.length > 0) {
    return {
      ...ANALISIS_VACIO,
      separador,
      cabeceras,
      desconocidas,
      faltantes,
      error: `Hay columnas repetidas: ${[...new Set(repetidas)].join(', ')}.`
    };
  }

  if (faltantes.length > 0) {
    return {
      ...ANALISIS_VACIO,
      separador,
      cabeceras,
      desconocidas,
      faltantes,
      error: `Faltan columnas obligatorias: ${faltantes.join(', ')}.`
    };
  }

  const filas: FilaImportada[] = [];

  for (const { texto: linea, numero } of lineas.slice(1)) {
    const campos = dividirLinea(linea, separador);
    const dato = (cabecera: CabeceraCsv): string => {
      const posicion = cabeceras.indexOf(cabecera);
      return posicion >= 0 ? (campos[posicion] ?? '').trim() : '';
    };

    const { referencia, motivos } = construirReferencia(dato);
    if (campos.length !== cabeceras.length) {
      motivos.push(`Se esperaban ${cabeceras.length} columnas y se encontraron ${campos.length}`);
    }
    filas.push({ numeroLinea: numero, referencia, valida: motivos.length === 0, motivos });
  }

  const validas = filas.filter((fila) => fila.valida).length;

  return {
    filas,
    validas,
    omitidas: filas.length - validas,
    separador,
    cabeceras,
    desconocidas,
    faltantes,
    error: null
  };
}

const FILAS_EJEMPLO = [
  'Cielo de Sal;Camila Ríos;2021;Folk;Fondo General Académico;214;archivo/cielo-de-sal.wav;CC BY 4.0',
  'Bajada Andina;Trío Meridiano;2018;Instrumental;Fondo General Académico;187.5;archivo/bajada-andina.flac;CC BY-NC 4.0',
  'Pulso de Medianoche;Nodo Andino;2023;Electronic;Fondo General Académico;242;archivo/pulso-medianoche.mp3;Uso interno'
];

/** Tres filas realistas para probar el importador sin preparar un archivo. */
export function csvEjemplo(): string {
  return [
    CABECERAS_TEXTO,
    '# Las rutas son descriptivas: la demo no lee los audios del catálogo.',
    ...FILAS_EJEMPLO
  ].join('\n');
}

/** Plantilla descargable con cabeceras y las mismas tres filas de ejemplo. */
export function plantillaCsv(): string {
  return [CABECERAS_TEXTO, ...FILAS_EJEMPLO].join('\r\n');
}
