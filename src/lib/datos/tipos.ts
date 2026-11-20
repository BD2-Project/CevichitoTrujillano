
export type EstadoAnalisis = 'con-evidencia' | 'sin-evidencia' | 'error';

export type CodigoErrorAnalisis = '422' | '503' | '500';

export type OrigenDato = 'persistido' | 'local' | 'demo';

export type Tono =
  | 'neutro'
  | 'primario'
  | 'info'
  | 'exito'
  | 'advertencia'
  | 'peligro'
  | 'terciario';

export interface CancionCatalogo {
  idCancion: number;
  titulo: string;
  artista: string;
  duracionSegundos: number;
  cantidadSegmentos: number;
  urlAudio: string;
  genero: string;
  anio: number;
  coleccion: string;
  licencia?: string;
  origen?: OrigenDato;
}

export interface SegmentoAudio {
  idSegmento: number;
  idCancion: number;
  indiceSegmento: number;
  inicioSegundos: number;
  finSegundos: number;
  referenciaAudio: string;
}

export interface DetalleCancion extends CancionCatalogo {
  segmentos: SegmentoAudio[];
}

export interface Coincidencia {
  /** Inicio del tramo en el audio consultado (s). */
  inicioConsulta: number;
  /** Fin del tramo en el audio consultado (s). */
  finConsulta: number;
  idCancion: number;
  titulo: string;
  artista: string;
  /** Inicio del tramo alineado en la canción del catálogo (s). */
  inicioFuente: number;
  /** Fin del tramo alineado en la canción del catálogo (s). */
  finFuente: number;
  /** Media de similitud de los segmentos de la run, en [0, 1]. */
  similitud: number;
  cantidadSegmentos: number;
  similitudMinima: number;
  similitudMaxima: number;
  /** inicioFuente - inicioConsulta. */
  desplazamientoAlineacion: number;
  /** Run con más evidencia temporal de esa canción. */
  esMejorTramo: boolean;
}

export interface MetadatosArchivo {
  duracionSegundos?: number;
  tamanoBytes: number;
  formato: string;
  frecuenciaMuestreo?: number;
  canales?: number;
}

export interface ResultadoAnalisis {
  idAnalisis: string;
  nombreArchivo: string;
  segundosPorSegmento: number;
  coincidencias: Coincidencia[];
  creadoEn: string;
  origen?: OrigenDato;
  /** Metadatos locales del archivo; SoupDB no los persiste. */
  metadatos?: MetadatosArchivo;
}

export interface ResumenAnalisis {
  idAnalisis: string;
  nombreArchivo: string;
  creadoEn: string;
  segundosPorSegmento: number;
  cantidadCoincidencias: number;
  cantidadCanciones: number;
  mejorSimilitud: number | null;
  estado: EstadoAnalisis;
  origen: OrigenDato;
  /** Metadatos locales del archivo; no los persiste SoupDB. */
  duracionArchivoSegundos?: number;
  tamanoBytes?: number;
  formato?: string;
  frecuenciaMuestreo?: number;
  canales?: number;
  nota?: string;
}

export interface ErrorAnalisis {
  codigo: CodigoErrorAnalisis;
  titulo: string;
  mensaje: string;
  detalle: string;
  sugerencias: string[];
  solicitud?: string;
  fecha?: string;
}

export interface ConfiguracionAnalisis {
  idCatalogo: string;
  descripcion: string;
  kVecinos: number;
  notas: string;
  /** Metadatos leídos en el navegador antes de enviar el archivo. */
  metadatosArchivo?: MetadatosArchivo;
  /** Solo en modo demo: fuerza una respuesta de error para probar la pantalla de diagnóstico. */
  forzarError?: CodigoErrorAnalisis | null;
}

export interface ProgresoAnalisis {
  porcentaje: number;
  etapa: string;
  detalle: string;
  segmentoActual?: number;
  totalSegmentos?: number;
}

export interface ReferenciaNueva {
  titulo: string;
  artista: string;
  anio: number;
  genero: string;
  coleccion: string;
  duracionSegundos: number;
  rutaAudio: string;
  licencia?: string;
}

export interface ResultadoImportacion {
  cantidadCanciones: number;
  cantidadSegmentos: number;
  omitidas: number;
  nombres: string[];
}

export interface FiltrosHistorial {
  busqueda: string;
  estado: 'todos' | EstadoAnalisis;
  rango: 'hoy' | '7d' | '30d' | 'todo';
  catalogo: string;
  similitudMinima: number;
  orden: 'recientes' | 'antiguos' | 'similitud';
}

export interface EstadoConexion {
  modo: 'demo' | 'tauri' | 'rest';
  conectado: boolean;
  etiqueta: string;
  detalle: string;
}

/** Contrato del adaptador de datos. El modo demo lo implementa en memoria. */
export interface ClienteAudioTrace {
  readonly modo: 'demo' | 'tauri' | 'rest';
  estadoConexion(): EstadoConexion;
  listarCatalogo(): Promise<CancionCatalogo[]>;
  obtenerCancion(idCancion: number): Promise<DetalleCancion | null>;
  listarAnalisis(): Promise<ResumenAnalisis[]>;
  obtenerAnalisis(idAnalisis: string): Promise<ResultadoAnalisis | null>;
  analizarAudio(
    archivo: File,
    configuracion: ConfiguracionAnalisis,
    onProgreso?: (progreso: ProgresoAnalisis) => void
  ): Promise<ResultadoAnalisis>;
  agregarReferencia(referencia: ReferenciaNueva): Promise<CancionCatalogo>;
  importarDataset(referencias: ReferenciaNueva[]): Promise<ResultadoImportacion>;
}

/** Fila cruda devuelta por el driver rsoup (protocolo binario v1.1). */
export interface ColumnaSql {
  nombre: string;
  tipoNombre: string;
  codificacion: number;
  tamano: number;
  longitud: number;
}

export interface ResultadoSql {
  columnas: ColumnaSql[];
  filas: unknown[][];
}

export interface OpcionesExportacionPdf {
  incluirMetadatos: boolean;
  incluirCoincidencias: boolean;
  incluirResumen: boolean;
  incluirAdvertencia: boolean;
  titulo: string;
}
