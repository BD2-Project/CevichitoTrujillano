export interface RegionOnda {
  /** Inicio en segundos del audio consultado. */
  inicio: number;
  /** Fin en segundos del audio consultado. */
  fin: number;
  /** Color CSS del bloque; por defecto usa el acento terciario. */
  color?: string;
  borde?: string;
  etiqueta?: string;
}
