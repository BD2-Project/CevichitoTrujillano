import { invoke } from '@tauri-apps/api/core';
import { NOMBRE_SERVICIO } from '../datos/constantes';
import type {
  CancionCatalogo,
  ClienteAudioTrace,
  ConfiguracionAnalisis,
  DetalleCancion,
  EstadoConexion,
  ProgresoAnalisis,
  ReferenciaNueva,
  ResultadoAnalisis,
  ResultadoImportacion,
  ResumenAnalisis
} from '../datos/tipos';
import { archivoABytes } from '../utilidades/audio';
import {
  mapearCancion, mapearResultado, mapearResumen,
  type FilaCancion, type FilaAnalisis, type FilaAnalisisResumen
} from './mapeo';

interface FilaAnalisisImportado {
  canciones: number;
  segmentos: number;
  omitidas: number;
  nombres: string[];
}

export function tauriDisponible(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export class ClienteTauri implements ClienteAudioTrace {
  readonly modo = 'tauri' as const;

  estadoConexion(): EstadoConexion {
    const conectado = tauriDisponible();
    return {
      modo: 'tauri',
      conectado,
      etiqueta: conectado ? 'Tauri + rsoup' : 'Tauri no detectado',
      detalle: conectado
        ? `Contrato preparado hacia ${NOMBRE_SERVICIO}. Los comandos aún no están enlazados.`
        : 'Abre la aplicación desde el binario Tauri para usar el adaptador nativo.'
    };
  }

  async listarCatalogo(): Promise<CancionCatalogo[]> {
    const filas = await invoke<FilaCancion[]>('listar_catalogo');
    return filas.map((fila) => {
      const { segmentos: _segmentos, ...cancion } = mapearCancion(fila);
      return cancion;
    });
  }

  async obtenerCancion(idCancion: number): Promise<DetalleCancion | null> {
    const fila = await invoke<FilaCancion | null>('obtener_cancion', { idCancion });
    return fila ? mapearCancion(fila) : null;
  }

  async listarAnalisis(): Promise<ResumenAnalisis[]> {
    const filas = await invoke<FilaAnalisisResumen[]>('listar_analisis');
    return filas.map(mapearResumen);
  }

  async obtenerAnalisis(idAnalisis: string): Promise<ResultadoAnalisis | null> {
    const fila = await invoke<FilaAnalisis | null>('obtener_analisis', { idAnalisis });
    return fila ? mapearResultado(fila) : null;
  }

  async analizarAudio(
    archivo: File,
    configuracion: ConfiguracionAnalisis,
    onProgreso?: (progreso: ProgresoAnalisis) => void
  ): Promise<ResultadoAnalisis> {
    onProgreso?.({
      porcentaje: 2,
      etapa: 'Transferencia',
      detalle: 'Enviando el audio al proceso nativo de análisis.',
      totalSegmentos: undefined
    });
    const bytes = await archivoABytes(archivo);
    const fila = await invoke<FilaAnalisis>('analizar_audio', {
      nombreArchivo: archivo.name,
      bytes,
      configuracion: {
        idCatalogo: configuracion.idCatalogo,
        kVecinos: configuracion.kVecinos,
        notas: configuracion.notas
      }
    });
    return mapearResultado(fila);
  }

  async agregarReferencia(referencia: ReferenciaNueva): Promise<CancionCatalogo> {
    const fila = await invoke<FilaCancion>('agregar_referencia', { referencia });
    const { segmentos: _segmentos, ...cancion } = mapearCancion(fila);
    return cancion;
  }

  async importarDataset(referencias: ReferenciaNueva[]): Promise<ResultadoImportacion> {
    const fila = await invoke<FilaAnalisisImportado>('importar_dataset', { referencias });
    return {
      cantidadCanciones: fila.canciones,
      cantidadSegmentos: fila.segmentos,
      omitidas: fila.omitidas,
      nombres: fila.nombres
    };
  }
}
