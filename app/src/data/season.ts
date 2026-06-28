import { Vatsamon } from "../types";
import { REAL_COWS } from "./realCows";

/**
 * ============================================================================
 *  STAGIONE — modello dati della stagione reale delle Batailles de Reines.
 * ============================================================================
 *
 *  Filosofia: NIENTE BACKEND. Questo file è la "fonte" della stagione e si
 *  aggiorna a mano (o da Google Sheet → JSON) committando su GitHub Pages.
 *  Durante la finale live basta cambiare `disputata`/`risultato` qui e la PWA
 *  si aggiorna. Coerente con la scelta statica del resto del progetto.
 *
 *  Coerenza col mondo reale (Association régionale Amis des Batailles de Reines):
 *   - 3 categorie per peso (1ère / 2ème / 3ème catégorie).
 *   - ~20 eliminatorie domenicali nei comuni, da fine marzo.
 *   - Pausa estiva (giugno–agosto): le mandrie salgono agli alpeggi (inalpa).
 *   - Finale regionale alla Arena Croix-Noire di Aosta, a ottobre.
 *
 *  I "vincitori" delle eliminatorie e i partecipanti al tabellone sono RICAVATI
 *  dalle 73 Reines reali del dataset (per categoria, comune e potenza): nessun
 *  dato inventato, solo riuso autentico delle bovine già presenti.
 */

export type CategoriaId = "1" | "2" | "3";

export interface SeasonCategory {
  id: CategoriaId;
  /** Etichetta breve (IT). */
  label: string;
  /** Etichetta ufficiale (FR), come la usa l'Association. */
  labelFr: string;
  /** Fascia di peso indicativa. */
  peso: string;
  accent: string; // colore tailwind-like (hex) per la categoria
  emoji: string;
}

export const CATEGORIES: SeasonCategory[] = [
  { id: "1", label: "1ª categoria", labelFr: "1ère catégorie", peso: "oltre ~600 kg", accent: "#f59e0b", emoji: "🥇" },
  { id: "2", label: "2ª categoria", labelFr: "2ème catégorie", peso: "~520–600 kg", accent: "#38bdf8", emoji: "🥈" },
  { id: "3", label: "3ª categoria", labelFr: "3ème catégorie", peso: "fino a ~520 kg", accent: "#34d399", emoji: "🥉" },
];

export const SEASON_META = {
  anno: 2026,
  organizzatore: "Association régionale Amis des Batailles de Reines",
  finale: {
    data: "2026-10-18",
    luogo: "Arena Croix-Noire",
    comune: "Aosta",
  },
};

export type EventKind = "bataille" | "pausa";

export interface SeasonEvent {
  id: string;
  /** Data ISO (o data d'inizio per la pausa). */
  data: string;
  /** Data di fine (solo per la pausa). */
  dataFine?: string;
  comune: string;
  luogo: string;
  categorie: CategoriaId[];
  kind: EventKind;
  /** true = già disputata (in questa stagione = eliminatorie di primavera). */
  disputata?: boolean;
  /** true = è la finale regionale (l'evento clou). */
  finale?: boolean;
  note?: string;
}

/**
 * Calendario 2026 (forma reale: primavera disputata → pausa d'alpeggio →
 * autunno → finale a ottobre). Comuni e arene sono località valdostane reali
 * che ospitano davvero le Batailles. Le date sono domeniche reali del 2026.
 */
export const CALENDAR: SeasonEvent[] = [
  { id: "el-01", data: "2026-03-29", comune: "Aymavilles", luogo: "Area Tsanté", categorie: ["3"], kind: "bataille", disputata: true },
  { id: "el-02", data: "2026-04-05", comune: "Saint-Vincent", luogo: "Area Fontaines", categorie: ["2", "3"], kind: "bataille", disputata: true },
  { id: "el-03", data: "2026-04-19", comune: "Fénis", luogo: "Area Tornafol", categorie: ["1"], kind: "bataille", disputata: true },
  { id: "el-04", data: "2026-05-03", comune: "Cogne", luogo: "Prato di Sant'Orso", categorie: ["2", "3"], kind: "bataille", disputata: true },
  { id: "el-05", data: "2026-05-17", comune: "Châtillon", luogo: "Area Soleil", categorie: ["1", "2"], kind: "bataille", disputata: true },
  { id: "el-06", data: "2026-05-31", comune: "Gignod", luogo: "Area Le Pré", categorie: ["1"], kind: "bataille", disputata: true },
  { id: "el-07", data: "2026-06-07", comune: "Pollein", luogo: "Area Grand-Place", categorie: ["1", "2", "3"], kind: "bataille", disputata: true },

  { id: "pausa-estate", data: "2026-06-14", dataFine: "2026-08-23", comune: "Alpeggi della Valle d'Aosta", luogo: "Inalpa", categorie: [], kind: "pausa", note: "Le Reines salgono agli alpeggi: la stagione si ferma fino a fine estate." },

  { id: "el-08", data: "2026-09-06", comune: "Brusson", luogo: "Area Extrepieraz", categorie: ["2", "3"], kind: "bataille", disputata: false },
  { id: "el-09", data: "2026-09-20", comune: "Nus", luogo: "Area Plan-Félinaz", categorie: ["1"], kind: "bataille", disputata: false },
  { id: "el-10", data: "2026-10-04", comune: "Sarre", luogo: "Area Stade", categorie: ["1", "2", "3"], kind: "bataille", disputata: false, note: "Ultime semifinali prima della finale regionale." },

  { id: "finale", data: "2026-10-18", comune: "Aosta", luogo: "Arena Croix-Noire", categorie: ["1", "2", "3"], kind: "bataille", disputata: false, finale: true, note: "Finale regionale: si eleggono le tre Reines della Valle d'Aosta 2026." },
];

// ---------------------------------------------------------------------------
//  Reines per categoria (ricavate dal dataset reale).
// ---------------------------------------------------------------------------

/** Normalizza il campo `categoria` del dataset ("1ª"/"2ª"/"3ª") in CategoriaId. */
function catOf(cow: Vatsamon): CategoriaId | null {
  const raw = (cow.categoria ?? "").trim();
  if (raw.startsWith("1")) return "1";
  if (raw.startsWith("2")) return "2";
  if (raw.startsWith("3")) return "3";
  return null;
}

/** Ordinamento "forza" deterministico: potenza → stelle implicite (cp) → nome. */
function byStrength(a: Vatsamon, b: Vatsamon): number {
  const pa = a.potenza ?? a.cp;
  const pb = b.potenza ?? b.cp;
  if (pb !== pa) return pb - pa;
  if (b.cp !== a.cp) return b.cp - a.cp;
  return a.name.localeCompare(b.name);
}

const COWS_BY_CAT: Record<CategoriaId, Vatsamon[]> = { "1": [], "2": [], "3": [] };
for (const cow of REAL_COWS) {
  const c = catOf(cow);
  if (c) COWS_BY_CAT[c].push(cow);
}
(Object.keys(COWS_BY_CAT) as CategoriaId[]).forEach((c) => COWS_BY_CAT[c].sort(byStrength));

export function cowsByCategory(cat: CategoriaId): Vatsamon[] {
  return COWS_BY_CAT[cat];
}

// ---------------------------------------------------------------------------
//  Vincitrici delle eliminatorie disputate (deterministiche, dal dataset).
//  Preferisce una Reina del comune ospitante; altrimenti la più forte libera.
// ---------------------------------------------------------------------------

const usedWinners = new Set<string>();
const WINNERS_BY_EVENT: Record<string, Partial<Record<CategoriaId, Vatsamon>>> = {};

for (const ev of CALENDAR) {
  if (ev.kind !== "bataille" || !ev.disputata) continue;
  const winners: Partial<Record<CategoriaId, Vatsamon>> = {};
  for (const cat of ev.categorie) {
    const pool = COWS_BY_CAT[cat].filter((c) => !usedWinners.has(c.id));
    const sameComune = pool.filter((c) => c.comune === ev.comune);
    const cand = (sameComune.length ? sameComune : pool)[0]; // già ordinato per forza
    if (cand) {
      winners[cat] = cand;
      usedWinners.add(cand.id);
    }
  }
  WINNERS_BY_EVENT[ev.id] = winners;
}

export function winnersFor(eventId: string): Partial<Record<CategoriaId, Vatsamon>> {
  return WINNERS_BY_EVENT[eventId] ?? {};
}

// ---------------------------------------------------------------------------
//  Tabellone (bracket) della finale regionale, per categoria.
// ---------------------------------------------------------------------------

export interface BracketMatch {
  matchId: string;
  a: Vatsamon | null;
  b: Vatsamon | null;
  /** Reina scelta dall'utente come vincente (pronostico). */
  winner: Vatsamon | null;
}

/** Semi reali (teste di serie) per la finale di categoria: top-N per potenza. */
export function bracketSeeds(cat: CategoriaId): Vatsamon[] {
  const all = COWS_BY_CAT[cat];
  // taglia di tabellone = massima potenza di 2 ≤ disponibili, fino a 8.
  const size = all.length >= 8 ? 8 : all.length >= 4 ? 4 : all.length >= 2 ? 2 : 0;
  const top = all.slice(0, size);
  // accoppiamento a teste di serie: 1-8, 4-5, 2-7, 3-6 (per size=8).
  if (size === 8) return [top[0], top[7], top[3], top[4], top[1], top[6], top[2], top[5]];
  if (size === 4) return [top[0], top[3], top[1], top[2]];
  return top;
}

/**
 * Costruisce i turni del tabellone a partire dai pronostici dell'utente.
 * Ogni turno è una lista di match; i vincitori scelti popolano il turno dopo.
 * Slot non ancora decisi restano `null` ("?").
 */
export function buildRounds(cat: CategoriaId, picks: Record<string, string>): BracketMatch[][] {
  const seeds = bracketSeeds(cat);
  const rounds: BracketMatch[][] = [];
  let current: (Vatsamon | null)[] = seeds;
  let r = 0;
  while (current.length >= 2) {
    const matches: BracketMatch[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i] ?? null;
      const b = current[i + 1] ?? null;
      const matchId = `${cat}-r${r}-m${i / 2}`;
      const wid = picks[matchId];
      const winner = wid ? (a?.id === wid ? a : b?.id === wid ? b : null) : null;
      matches.push({ matchId, a, b, winner });
    }
    rounds.push(matches);
    current = matches.map((m) => m.winner);
    r++;
  }
  return rounds;
}

/** Campionessa designata dai pronostici (vincente dell'ultimo turno), se decisa. */
export function bracketChampion(rounds: BracketMatch[][]): Vatsamon | null {
  if (!rounds.length) return null;
  const last = rounds[rounds.length - 1];
  return last.length === 1 ? last[0].winner : null;
}

/** Etichetta del turno in base a quanti turni mancano alla finale. */
export function roundLabel(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return "Finale";
  if (fromEnd === 1) return "Semifinali";
  if (fromEnd === 2) return "Quarti";
  if (fromEnd === 3) return "Ottavi";
  return `Turno ${roundIndex + 1}`;
}
