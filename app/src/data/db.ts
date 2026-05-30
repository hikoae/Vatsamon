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
