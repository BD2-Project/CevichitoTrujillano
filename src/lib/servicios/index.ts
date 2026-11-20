import type { ClienteCevichitoTrujillano } from '../datos/tipos';
import { ClienteMock } from './cliente-mock';
import { ClienteTauri } from './cliente-tauri';
import { ClienteRest } from './cliente-rest';

export type { ClienteCevichitoTrujillano };

export function crearCliente(): ClienteCevichitoTrujillano {
  const modo = import.meta.env.VITE_MODO_CLIENTE;
  if (modo === 'demo') return new ClienteMock();
  if (modo === 'tauri') return new ClienteTauri();
  return new ClienteRest();
}

export const cliente: ClienteCevichitoTrujillano = crearCliente();
export const MODO_DEMO = cliente.modo === 'demo';
