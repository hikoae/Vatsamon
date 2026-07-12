import { Vatsamon } from "../types";
import { REAL_COWS } from "./realCows";
import { getCachedRisultato } from "../lib/risultati";
import { DESARPA_GIORNO } from "./arp";

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
  /** Fascia di peso indicativa (IT). */
  peso: string;
  /** Fascia di peso indicativa (FR). */
  pesoFr: string;
  accent: string; // colore tailwind-like (hex) per la categoria
  emoji: string;
}

export const CATEGORIES: SeasonCategory[] = [
  { id: "1", label: "1ª categoria", labelFr: "1ère catégorie", peso: "pesi massimi (≥ 571–631 kg)", pesoFr: "poids lourds (≥ 571–631 kg)", accent: "#f59e0b", emoji: "🥇" },
  { id: "2", label: "2ª categoria", labelFr: "2ème catégorie", peso: "pesi medi (521–630 kg)", pesoFr: "poids moyens (521–630 kg)", accent: "#38bdf8", emoji: "🥈" },
  { id: "3", label: "3ª categoria", labelFr: "3ème catégorie", peso: "pesi leggeri (≤ 520–580 kg)", pesoFr: "poids légers (≤ 520–580 kg)", accent: "#34d399", emoji: "🥉" },
];

/**
 * REGOLAMENTO — soglie di peso per FASE della stagione (verificate, fonte
 * regolamento Amis des Batailles de Reines). Le soglie NON sono fisse: salgono
 * di fase in fase per seguire la crescita naturale degli animali.
 */
export type FaseStagione = "primavera" | "estate" | "autunno" | "autunno-finale" | "finale";

export interface SogliaCategoria {
  fase: FaseStagione;
  faseLabel: string;
  faseLabelFr: string;
  soglie: Record<CategoriaId, string>;
}

export const SOGLIE_PER_FASE: SogliaCategoria[] = [
  { fase: "primavera", faseLabel: "Eliminatorie primaverili", faseLabelFr: "Éliminatoires de printemps", soglie: { "1": "≥ 571 kg", "2": "521–570 kg", "3": "≤ 520 kg" } },
  { fase: "estate", faseLabel: "Eliminatorie estive", faseLabelFr: "Éliminatoires d'été", soglie: { "1": "≥ 591 kg", "2": "541–590 kg", "3": "≤ 540 kg" } },
  { fase: "autunno", faseLabel: "Autunnali (primi concorsi)", faseLabelFr: "Automne (premiers concours)", soglie: { "1": "≥ 601 kg", "2": "551–600 kg", "3": "≤ 550 kg" } },
  { fase: "autunno-finale", faseLabel: "Autunnali (ultimi 3 concorsi)", faseLabelFr: "Automne (3 derniers concours)", soglie: { "1": "≥ 611 kg", "2": "561–610 kg", "3": "≤ 560 kg" } },
  { fase: "finale", faseLabel: "Finale regionale", faseLabelFr: "Finale régionale", soglie: { "1": "≥ 631 kg", "2": "581–630 kg", "3": "≤ 580 kg" } },
];

export const SEASON_META = {
  anno: 2026,
  edizione: "69ème Concours Régional",
  organizzatore: "Association Régionale Amis des Batailles de Reines",
  finale: {
    data: "2026-10-25",
    luogo: "Arena Croix-Noire",
    comune: "Aosta",
  },
};

export type EventKind = "bataille" | "pausa" | "cerimonia";

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
  /** Fase della stagione (determina le soglie di peso applicate). */
  fase?: FaseStagione;
  /** true = già disputata (calcolato sui dati reali: primavera 2026). */
  disputata?: boolean;
  /** true = è la finale regionale (l'evento clou). */
  finale?: boolean;
  note?: string;
  noteFr?: string;
}

/**
 * Calendario REALE 2026 — 69ème Concours Régional (fonte: Amis des Batailles de
 * Reines, calendario approvato): 15 eliminatorie + finale del 25/10 alla
 * Croix-Noire. Pausa d'alpeggio (inalpa) tra le primaverili e le estive.
 * `disputata` riflette la timeline reale rispetto a "oggi" (stagione in corso).
 */
export const CALENDAR: SeasonEvent[] = [
  { id: "el-01", data: "2026-03-29", comune: "Pont-Saint-Martin", luogo: "Area combattimenti", categorie: ["1", "2", "3"], kind: "bataille", fase: "primavera", disputata: true },
  { id: "el-02", data: "2026-04-06", comune: "Saint-Marcel", luogo: "Area combattimenti", categorie: ["1", "2", "3"], kind: "bataille", fase: "primavera", disputata: true },
  { id: "el-03", data: "2026-04-12", comune: "Jovençan", luogo: "Area combattimenti", categorie: ["1", "2", "3"], kind: "bataille", fase: "primavera", disputata: true },
  { id: "el-04", data: "2026-04-19", comune: "Gignod", luogo: "Area Le Pré", categorie: ["1", "2", "3"], kind: "bataille", fase: "primavera", disputata: true },
  { id: "el-05", data: "2026-04-26", comune: "Pollein", luogo: "Area Grand-Place", categorie: ["1", "2", "3"], kind: "bataille", fase: "primavera", disputata: true },

  { id: "pausa-estate", data: "2026-05-01", dataFine: "2026-08-01", comune: "Alpeggi della Valle d'Aosta", luogo: "Inalpa", categorie: [], kind: "pausa", note: "Le mandrie salgono agli alpeggi (inalpa): le eliminatorie riprendono ad agosto.", noteFr: "Les troupeaux montent à l'alpage (inalpe) : les éliminatoires reprennent en août." },

  { id: "el-06", data: "2026-08-02", comune: "Avise", luogo: "Vertosan", categorie: ["1", "2", "3"], kind: "bataille", fase: "estate", disputata: false },
  { id: "el-07", data: "2026-08-09", comune: "Valtournenche", luogo: "Breuil-Cervinia", categorie: ["1", "2", "3"], kind: "bataille", fase: "estate", disputata: false },
  { id: "el-08", data: "2026-08-16", comune: "Doues", luogo: "Champillon", categorie: ["1", "2", "3"], kind: "bataille", fase: "estate", disputata: false },
  { id: "el-09", data: "2026-08-23", comune: "Ayas", luogo: "Champoluc", categorie: ["1", "2", "3"], kind: "bataille", fase: "estate", disputata: false },
  { id: "el-10", data: "2026-08-30", comune: "Arnad", luogo: "Féhta dou Lar", categorie: ["1", "2", "3"], kind: "bataille", fase: "estate", disputata: false },
  { id: "el-11", data: "2026-09-06", comune: "Aosta", luogo: "Area combattimenti", categorie: ["1", "2", "3"], kind: "bataille", fase: "autunno", disputata: false },
  { id: "el-12", data: "2026-09-13", comune: "Cogne", luogo: "Prato di Sant'Orso", categorie: ["1", "2", "3"], kind: "bataille", fase: "autunno", disputata: false },
  { id: "el-13", data: "2026-09-27", comune: "Courmayeur", luogo: "Mont-Blanc", categorie: ["1", "2", "3"], kind: "bataille", fase: "autunno", disputata: false },

  // DÉSARPA (S14, dossier §10) — cerimonia della discesa dagli alpeggi, NON
  // una tappa: nessuna categoria, nessun vincitore di gara. Entra nel
  // CALENDAR (invece di vivere solo come costante in data/arp.ts) così
  // partecipa alla stessa plumbing di countdown/vista calendario delle
  // batailles, restando riconoscibile da `kind: "cerimonia"` ovunque il
  // codice distingue esplicitamente le tappe con vincitori (eliminatoire.ts,
  // RisultatiAdmin) da tutto il resto del CALENDAR.
  { id: "desarpa", data: `${SEASON_META.anno}${DESARPA_GIORNO}`, comune: "Désarpa", luogo: "Cerimonia della discesa", categorie: [], kind: "cerimonia", note: "La cerimonia annuale della discesa dagli alpeggi: si incoronano le due Reines di mandria — la Reina di corne (più vittorie stagionali) e la Reine du lait (più produttiva all'alpe).", noteFr: "La cérémonie annuelle de la descente des alpages : on couronne les deux Reines de troupeau — la Reine de corne (la plus victorieuse de la saison) et la Reine du lait (la plus productive à l'alpage)." },

  { id: "el-14", data: "2026-10-04", comune: "Châtillon-Pontey", luogo: "Area combattimenti", categorie: ["1", "2", "3"], kind: "bataille", fase: "autunno-finale", disputata: false },
  { id: "el-15", data: "2026-10-11", comune: "Gressan", luogo: "Area combattimenti", categorie: ["1", "2", "3"], kind: "bataille", fase: "autunno-finale", disputata: false, note: "Ultima eliminatoria prima della finale.", noteFr: "Dernière éliminatoire avant la finale." },

  { id: "finale", data: "2026-10-25", comune: "Aosta", luogo: "Arena Croix-Noire", categorie: ["1", "2", "3"], kind: "bataille", fase: "finale", disputata: false, finale: true, note: "Finale regionale: si incoronano le tre Reines des Reines (una per categoria).", noteFr: "Finale régionale : on couronne les trois Reines des Reines (une par catégorie)." },
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

/**
 * Vincitrice di una categoria per un evento, com'è mostrata in UI. `simulato:
 * true` = NESSUN risultato reale pubblicato per questo evento/categoria: è
 * il vecchio calcolo per `potenza` interna, fabbricato, mai un dato di gara.
 * `simulato: false` = risultato reale inserito dall'admin (S11) su Firestore
 * `risultati/{eventId}`. `cow` è presente solo se il nome è stato riconosciuto
 * tra le 73 REAL_COWS (match tollerante via `reinaByName`) — un nome libero
 * digitato dall'admin resta valido anche senza foto/illustrazione.
 */
export interface WinnerEntry {
  nome: string;
  note?: string;
  cow?: Vatsamon;
  simulato: boolean;
}

const CAT_FIELD: Record<CategoriaId, "cat1" | "cat2" | "cat3"> = { "1": "cat1", "2": "cat2", "3": "cat3" };

export function winnersFor(eventId: string): Partial<Record<CategoriaId, WinnerEntry>> {
  const ev = CALENDAR.find((e) => e.id === eventId);
  if (!ev) return {};
  const real = getCachedRisultato(eventId);
  const simulated = WINNERS_BY_EVENT[eventId] ?? {};
  const out: Partial<Record<CategoriaId, WinnerEntry>> = {};
  for (const cat of ev.categorie) {
    const r = real?.[CAT_FIELD[cat]];
    if (r && r.nome) {
      out[cat] = { nome: r.nome, note: r.note, cow: reinaByName(r.nome), simulato: false };
      continue;
    }
    const simCow = simulated[cat];
    if (simCow) {
      out[cat] = { nome: simCow.name, cow: simCow, simulato: true };
    }
  }
  return out;
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

// ===========================================================================
//  ALBO D'ORO — vincitrici reali della Finale Regionale (Reine des Reines).
//  Dati verificati 2021–2025 (fonte: cronache locali; vedi BATAILLES_DOSSIER).
// ===========================================================================

export interface HonorEntry {
  anno: number;
  cat: CategoriaId;
  nome: string;
  allevatore: string;
  comune?: string;
  note?: string;
  noteFr?: string;
}

export const ALBO_DORO: HonorEntry[] = [
  { anno: 2025, cat: "1", nome: "Suisse", allevatore: "Soc. Ymak Frassy-Letey", comune: "Arvier", note: "2° titolo consecutivo", noteFr: "2e titre consécutif" },
  { anno: 2025, cat: "2", nome: "Berline", allevatore: "Fam. Charbonnier", comune: "Aosta" },
  { anno: 2025, cat: "3", nome: "Falchetta", allevatore: "Renzo Rosset", comune: "Nus", note: "4° titolo consecutivo", noteFr: "4e titre consécutif" },
  { anno: 2024, cat: "1", nome: "Suisse", allevatore: "Ymak Frassy / C. Letey", comune: "Arvier" },
  { anno: 2024, cat: "2", nome: "Tiky", allevatore: "Italo Arlian", note: "esordio", noteFr: "débuts" },
  { anno: 2024, cat: "3", nome: "Falchetta", allevatore: "Renzo Rosset", comune: "Nus", note: "3° consecutivo", noteFr: "3e consécutif" },
  { anno: 2023, cat: "1", nome: "Bandit", allevatore: "Davide Bieller", note: "715 kg", noteFr: "715 kg" },
  { anno: 2023, cat: "2", nome: "Malice", allevatore: "Soc. Lo Tsanti" },
  { anno: 2023, cat: "3", nome: "Falchetta", allevatore: "Renzo Rosset", comune: "Nus", note: "2° titolo", noteFr: "2e titre" },
  { anno: 2022, cat: "1", nome: "Bataille", allevatore: "Fratelli Martignon", comune: "Fénis" },
  { anno: 2022, cat: "2", nome: "Rubis", allevatore: "Massimiliano Garin", comune: "Cogne" },
  { anno: 2022, cat: "3", nome: "Falchetta", allevatore: "Lorenzo Rosset", comune: "Nus", note: "1° titolo", noteFr: "1er titre" },
  { anno: 2021, cat: "1", nome: "Energie", allevatore: "Girod", comune: "Fontainemore" },
  { anno: 2021, cat: "2", nome: "Orsières", allevatore: "Alino Marquis", comune: "Nus" },
  { anno: 2021, cat: "3", nome: "Reinette", allevatore: "Fratelli Bonin", comune: "Gressan" },
];

export interface Leggenda {
  nome: string;
  titolo: string;
  descr: string;
  titoloFr: string;
  descrFr: string;
}

export const LEGGENDE: Leggenda[] = [
  { nome: "Falchetta", titolo: "La regina-leggenda", descr: "4 titoli consecutivi in 3ª categoria (2022–2025), allevamento Rosset di Nus.", titoloFr: "La reine-légende", descrFr: "4 titres consécutifs en 3ème catégorie (2022–2025), élevage Rosset de Nus." },
  { nome: "Sirène", titolo: "Il record eterno", descr: "Regina dal 1966 al 1969: 4 finali consecutive, un primato imbattuto da oltre 55 anni.", titoloFr: "Le record éternel", descrFr: "Reine de 1966 à 1969 : 4 finales consécutives, un record inégalé depuis plus de 55 ans." },
  { nome: "Suisse", titolo: "La bicampionessa", descr: "Doppietta in 1ª categoria (2024–2025), allevamento Ymak Frassy-Letey di Arvier.", titoloFr: "La double championne", descrFr: "Doublé en 1ère catégorie (2024–2025), élevage Ymak Frassy-Letey d'Arvier." },
];

/** Anni presenti nell'albo, dal più recente. */
export const ALBO_ANNI = Array.from(new Set(ALBO_DORO.map((h) => h.anno))).sort((a, b) => b - a);

/** Cerca una foto reale nel dataset per nome (match tollerante) di una vincitrice. */
export function reinaByName(nome: string): Vatsamon | undefined {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const target = norm(nome);
  return REAL_COWS.find((c) => norm(c.name) === target);
}
