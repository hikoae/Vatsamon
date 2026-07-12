/**
 * LA SCUOLA DELLA REINA — le mosse non si comprano: SI GUADAGNANO.
 * Specchia il pattern del patois giocato (lib/patois.ts): ogni gesto di
 * gioco può insegnare una mossa alla Reina che l'ha compiuto, e la sblocca
 * nel catalogo globale (vatsamon_scuola) da cui Mémé può insegnarla alle
 * altre in cambio di Fontina.
 *
 * Quattro canali:
 *  1. Razione d'Alpeggio (livelli): comuni alle famiglie preferite, poi le
 *     prime speciali (liv. 8 e 12).
 *  2. Imprese in battaglia (learn-by-doing): vittorie con uno stile preciso.
 *  3. Ereditarietà in stalla: il moudzon nasce con una mossa della madre
 *     (hook in breeding.ts).
 *  4. Mémé insegna: dal catalogo globale, per Fontina (MosseEditor).
 */
import { AzioneId, MAX_TURNI } from "./spinta";
import { MOSSE, MOSSE_BASE, MOSSE_PER_FAMIGLIA, Mossa, famigliePerPreferenza } from "../data/mosse";
import { Vatsamon } from "../types";

export const LS_SCUOLA = "vatsamon_scuola";

export interface ScuolaState { sbloccateGlobali: string[] }

export function scuolaState(): ScuolaState {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_SCUOLA) || "{}");
    return { sbloccateGlobali: Array.isArray(raw.sbloccateGlobali) ? raw.sbloccateGlobali : [] };
  } catch { return { sbloccateGlobali: [] }; }
}

/** Aggiunge una mossa al catalogo globale (idempotente). */
export function sbloccaGlobale(id: string): void {
  if (!MOSSE[id]) return;
  const st = scuolaState();
  if (st.sbloccateGlobali.includes(id)) return;
  localStorage.setItem(LS_SCUOLA, JSON.stringify({ ...st, sbloccateGlobali: [...st.sbloccateGlobali, id] }));
}

/** Statistiche di stile di una spinta, accumulate dai battle UI. */
export interface SpintaStats {
  perFamiglia: Record<AzioneId, number>; // azioni del giocatore per famiglia
  minBarra: number;                      // il punto peggiore toccato
  vittoriaPerFiato: boolean;             // l'avversaria ha finito il fiato
  giudizio: boolean;                     // risolta al giudizio di condotta
}

export const nuoveSpintaStats = (): SpintaStats => ({
  perFamiglia: { incalza: 0, reggi: 0, gira: 0, incoraggia: 0 },
  minBarra: 100,
  vittoriaPerFiato: false,
  giudizio: false,
});

/** Campiona la barra per il minimo REALE: va chiamato dopo OGNI azione
 *  (di entrambi i lati) e subito dopo ogni initSpinta — la barra iniziale
 *  può già essere in svantaggio, e i cali arrivano anche dall'avversaria. */
export function campionaBarra(stats: SpintaStats, barra: number): void {
  stats.minBarra = Math.min(stats.minBarra, barra);
}

/** Aggiorna le stats dopo un turno del giocatore. */
export function registraTurno(stats: SpintaStats, famiglia: AzioneId, barraDopo: number, turno: number): void {
  stats.perFamiglia[famiglia] += 1;
  campionaBarra(stats, barraDopo);
  if (turno >= MAX_TURNI) stats.giudizio = true;
}

/** Insegna mosse a una Reina (idempotente). Ritorna la scheda aggiornata e le sole NUOVE. */
export function insegnaMosse(cow: Vatsamon, ids: string[]): { cow: Vatsamon; nuove: Mossa[] } {
  const apprese = new Set(cow.mosseApprese ?? []);
  const nuove = ids.filter((id) => MOSSE[id] && !apprese.has(id)).map((id) => MOSSE[id]);
  if (!nuove.length) return { cow, nuove: [] };
  return { cow: { ...cow, mosseApprese: [...(cow.mosseApprese ?? []), ...nuove.map((m) => m.id)] }, nuove };
}

/** Canale 1 — Razione d'Alpeggio: le mosse dovute al livello attuale
 *  (recupera anche gli arretrati: idempotente via mosseApprese). */
export function mosseDaLivello(cow: Vatsamon): { cow: Vatsamon; nuove: Mossa[] } {
  const fams = famigliePerPreferenza(cow);
  const comuneNonBase = (fam: AzioneId) =>
    MOSSE_PER_FAMIGLIA[fam].find((m) => m.rarita === "comune" && m.id !== MOSSE_BASE[fam])?.id;
  const due: string[] = [];
  if (cow.level >= 3) { const id = comuneNonBase(fams[0]); if (id) due.push(id); }
  if (cow.level >= 5) { const id = comuneNonBase(fams[1]); if (id) due.push(id); }
  if (cow.level >= 8) due.push("incornata-suocera");
  if (cow.level >= 12) due.push("piroetta-genepy");
  return insegnaMosse(cow, due);
}

export type ContestoVittoria = "battle" | "dungeon" | "tappa" | "finale" | "leggenda";

/** Canale 2 — le imprese di una VITTORIA che insegnano una mossa.
 *  `extra.leggendeGiaBattute` = Leggende DISTINTE già vinte prima di questa
 *  (dato esplicito e persistito, non un proxy sul catalogo globale). */
export function valutaImprese(
  stats: SpintaStats | undefined,
  contesto: ContestoVittoria,
  extra?: { leggendeGiaBattute?: number },
): string[] {
  const ids: string[] = [];
  if (stats) {
    if (stats.minBarra >= 50) ids.push("muro-di-stalla");
    if (stats.minBarra <= 20) ids.push("fortezza-di-bard");
    if (stats.vittoriaPerFiato) ids.push("pisolino-pascolo");
    if (stats.perFamiglia.incoraggia >= 3) ids.push("muggito-mandria");
    if (stats.perFamiglia.gira >= 3) ids.push("finta-del-casaro");
    if (stats.giudizio) ids.push("quintale-fermo");
  }
  switch (contesto) {
    case "tappa": ids.push("testata-diplomatica"); break;
    case "finale": ids.push("testata-diplomatica", "fohn-furioso"); break;
    case "dungeon": ids.push("concerto-campanacci"); break;
    case "leggenda":
      ids.push((extra?.leggendeGiaBattute ?? 0) >= 1 ? "spinta-slavina" : "muggito-gransanbernardo");
      break;
    case "battle": break;
  }
  return ids;
}

/** Canale 3 — ereditarietà: la mossa non-base che il moudzon prende dalla madre. */
export function mossaEreditata(madre: Vatsamon | undefined, seed: number): string | null {
  if (!madre) return null;
  const pool = (madre.mosseApprese ?? []).filter((id) => MOSSE[id] && !Object.values(MOSSE_BASE).includes(id));
  if (!pool.length) return null;
  return pool[Math.abs(seed) % pool.length];
}

/** Canale 4 — il prezzo di Mémé in Forme di Fontina, per rarità. */
export const COSTO_MEME: Record<Mossa["rarita"], number> = {
  comune: 1, rara: 1, speciale: 2, leggendaria: 3,
};

/** Come si impara ogni mossa (mostrato in silhouette nel MosseEditor). */
export const MOSSE_TRIGGERS: Record<string, string> = {
  "spinta-polenta": "con la Razione d'Alpeggio (liv. 3/5, se l'incalzo è nelle sue corde)",
  "valzer-di-santorso": "con la Razione d'Alpeggio (liv. 3/5, se il gira è nelle sue corde)",
  "muro-di-stalla": "vincendo senza mai scendere sotto barra 50 (o Razione, liv. 3/5)",
  "flemma-ghiacciaio": "con 3 giorni di cura all'arp (o Razione, liv. 3/5)",
  "testata-diplomatica": "vincendo una tappa dell'Éliminatoire",
  "sguardo-regale": "con una Reina di corne alla Désarpa",
  "quintale-fermo": "vincendo al giudizio di condotta (16 azioni)",
  "finta-del-casaro": "vincendo con almeno 3 giri di leno",
  "pisolino-pascolo": "vincendo per esaurimento del fiato avversario",
  "muggito-mandria": "vincendo con almeno 3 incoraggiamenti",
  "incornata-suocera": "con la Razione d'Alpeggio (liv. 8)",
  "piroetta-genepy": "con la Razione d'Alpeggio (liv. 12)",
  "fortezza-di-bard": "vincendo in rimonta da barra ≤ 20",
  "concerto-campanacci": "conquistando una Lega delle Reines",
  "muggito-gransanbernardo": "battendo una Leggenda dell'albo d'oro",
  "spinta-slavina": "battendo una seconda Leggenda dell'albo d'oro",
  "fohn-furioso": "vincendo la finale della Croix-Noire",
};
