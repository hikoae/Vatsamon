import raw from "./vazzadex.json";
import type { Bovina, Pascolo, Vazzadex } from "./types";

const data = raw as unknown as Vazzadex;

export const BOVINE: Bovina[] = data.bovine;
export const PASCOLI: Pascolo[] = data.pascoli;
export const TOTALE = BOVINE.length;

const BASE = import.meta.env.BASE_URL; // es. "/vazzamon/"

/** URL pubblico per la foto reale di una bovina (null se assente). */
export function fotoUrl(b: Bovina): string | null {
  return b.foto ? `${BASE}${b.foto}` : null;
}

/** Silhouette di fallback quando non c'è foto reale. */
export const SILHOUETTE_URL = `${BASE}cow-silhouette.svg`;

const byId = new Map(BOVINE.map((b) => [b.id, b]));
export function getBovina(id: string): Bovina | undefined {
  return byId.get(id);
}

export function getPascolo(id: string): Pascolo | undefined {
  return PASCOLI.find((p) => p.id === id);
}

/** Bovine assegnate a un pascolo. */
export function bovinePerPascolo(pascoloId: string): Bovina[] {
  return BOVINE.filter((b) => b.pascolo === pascoloId);
}

/**
 * Sceglie l'incontro per un pascolo in modo deterministico ma vario:
 * privilegia una bovina non ancora catturata; se sono tutte catturate, ne
 * pesca comunque una del pascolo. `seed` permette di variare a ogni tap.
 */
export function scegliIncontro(
  pascoloId: string,
  catturate: Set<string>,
  seed: number,
): Bovina | undefined {
  const pool = bovinePerPascolo(pascoloId);
  if (pool.length === 0) return undefined;
  const nuove = pool.filter((b) => !catturate.has(b.id));
  const lista = nuove.length > 0 ? nuove : pool;
  return lista[Math.abs(seed) % lista.length];
}
