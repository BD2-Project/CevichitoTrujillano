import type { ClienteAudioTrace } from '../datos/tipos';
import { ClienteMock } from './cliente-mock';
import { ClienteTauri } from './cliente-tauri';
import { ClienteRest } from './cliente-rest';

export type { ClienteAudioTrace };

/**
 * Selección del adaptador.
 *
 * Por defecto la aplicación consume la API REST. Para probar el
 * contrato nativo hay que compilar el shell Tauri y definir
 * `VITE_MODO_CLIENTE=tauri`; mientras los comandos Rust no estén enlazados,
 * la aplicación muestra el fallo sin sustituir datos reales por una demo.
 */
export function crearCliente(): ClienteAudioTrace {
  const modo = import.meta.env.VITE_MODO_CLIENTE;
  if (modo === 'demo') return new ClienteMock();
  if (modo === 'tauri') return new ClienteTauri();
  return new ClienteRest();
}

export const cliente: ClienteAudioTrace = crearCliente();
export const MODO_DEMO = cliente.modo === 'demo';
