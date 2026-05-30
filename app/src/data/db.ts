import raw from "./vazzadex.json";
import type { Casera, Pascolo, Vazzamon, VazzadexFile } from "./types";
import { deriveCp, deriveLevel, ECO_TIPS } from "../lib/vazzamon";

const data = raw as unknown as VazzadexFile;

/** Le 73 bovine REALI, arricchite con i campi di gioco (cp, level, origine). */
export const BOVINE: Vazzamon[] = data.bovine.map((b, i) => ({
  ...b,
  origine: "reale" as const,
  cp: deriveCp(b.potenza, b.rarita),
  level: deriveLevel(b.potenza, b.rarita),
  eco_tip: ECO_TIPS[i % ECO_TIPS.length],
  lore: b.descrizione,
}));

export const PASCOLI: Pascolo[] = data.pascoli;
export const TOTALE = BOVINE.length;

/** Casere d'alpeggio (PokéStop) sui pascoli reali. */
export const CASERE: Casera[] = PASCOLI.map((p) => ({
  id: `casera-${p.id}`,
  name: p.nome,
  comune: p.comune,
  lat: p.lat,
  lng: p.lng,
}));

const BASE = import.meta.env.BASE_URL; // es. "/vazzamon/"

/** URL pubblico per la foto reale di una bovina (null se assente). */
export function fotoUrl(b: Vazzamon): string | null {
  return b.foto ? `${BASE}${b.foto}` : null;
}

/** Silhouette di fallback quando non c'è foto reale. */
export const SILHOUETTE_URL = `${BASE}cow-silhouette.svg`;
