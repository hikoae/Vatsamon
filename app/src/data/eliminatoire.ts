/**
 * L'ÉLIMINATOIRE DU DIMANCHE — le tappe del calendario reale 2026 si giocano.
 *
 * Dossier §4 (calendario verificato), §10 ("eliminatoria" = eliminazione
 * diretta), §0.4 (Reine des Reines = una per categoria), §1 (premi reali:
 * bosquet/mécro + sonnaille + collare).
 *
 * Anti-FOMO: una tappa si APRE la sua domenica e resta "aperta" fino alla
 * tappa successiva (il ritmo vero della stagione). Le tappe passate restano
 * giocabili per sempre come MEMORIALE — ma solo chi gioca la tappa mentre è
 * aperta ottiene il TIMBRO della domenica. Le future sono chiuse: il
 * calendario reale non si anticipa.
 */
import { Vatsamon } from "../types";
import { CALENDAR, SeasonEvent, CategoriaId as SeasonCategoriaId, winnersFor } from "./season";
import { REAL_COWS } from "./realCows";
import { categoriaAllaPesa, CategoriaId, FaseGara } from "./pesa";

export type TappaStato = "aperta" | "memoriale" | "futura";

export interface TappaRecord {
  vinta: boolean;
  timbro: boolean;     // vinta mentre la tappa era aperta (la domenica "vera")
  reinaNome: string;
  categoria: CategoriaId;
  quando: string;      // ISO del giorno in cui l'hai giocata
}

export type EliminatoireSave = Record<string, TappaRecord>;

export const LS_ELIMINATOIRE = "vatsamon_eliminatoire";

/** Le sole tappe-bataille del calendario (senza la pausa). */
export function tappe(): SeasonEvent[] {
  return CALENDAR.filter((e) => e.kind === "bataille");
}

/** Stato di una tappa rispetto a oggi. */
export function tappaStato(evento: SeasonEvent, oggiISO: string): TappaStato {
  if (evento.data > oggiISO) return "futura";
  const battles = tappe();
  const idx = battles.findIndex((e) => e.id === evento.id);
  const next = battles[idx + 1];
  // aperta finché non arriva la domenica successiva (o per sempre se è l'ultima)
  return !next || oggiISO < next.data ? "aperta" : "memoriale";
}

/** La fase di pesa della tappa (dal calendario reale). */
export function faseTappa(evento: SeasonEvent): FaseGara {
  return (evento.fase ?? "estate") as FaseGara;
}

/** Hash deterministico (per avversarie stabili per tappa). */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Le 3 avversarie del tabellone (quarti → semifinale → finale di tappa):
 * Reines REALI della stessa categoria alla pesa della fase della tappa,
 * ordinate per potenza crescente (la finale di giornata è la più dura).
 * Selezione deterministica per tappa: rigiocare = stesse avversarie.
 */
export function avversarieTappa(evento: SeasonEvent, categoria: CategoriaId, escludiNome?: string): Vatsamon[] {
  const fase = faseTappa(evento);
  const pool = REAL_COWS
    .filter((c) => c.peso_kg && categoriaAllaPesa(c.peso_kg, fase).cat === categoria)
    .filter((c) => c.name !== escludiNome);
  // fallback: se la categoria è scarna nel dataset, allarga a tutte
  const base = pool.length >= 3 ? pool : REAL_COWS.filter((c) => c.name !== escludiNome);
  const seed = hash(evento.id + categoria);
  const shuffled = [...base].sort((a, b) => (hash(a.id + seed) % 997) - (hash(b.id + seed) % 997));
  return shuffled.slice(0, 3).sort((a, b) => (a.potenza ?? a.cp) - (b.potenza ?? b.cp));
}

export const TURNI_TAPPA = ["Quarti", "Semifinale", "Finale di tappa"] as const;

/** Etichetta breve dello stato per la lista tappe. */
export const STATO_LABEL: Record<TappaStato, { label: string; tone: string }> = {
  aperta: { label: "APERTA", tone: "text-emerald-500" },
  memoriale: { label: "Memoriale", tone: "text-slate-400" },
  futura: { label: "In calendario", tone: "text-slate-500" },
};

// ---------------------------------------------------------------------------
//  PRONOSTICI DI TAPPA (S12) — schedina su OGNI tappa, non solo la finale.
//  Pool = avversarieTappa(evento, cat), deterministico e SENZA esclusioni:
//  le 3 Reines della categoria in lizza per quella tappa. L'esito si calcola
//  SOLO contro il risultato UFFICIALE (data/season.ts `winnersFor`, mai
//  `simulato: true` — vedi S11): finché non è pubblicato resta "attesa".
// ---------------------------------------------------------------------------

export const LS_PRONOSTICI_TAPPA = "vatsamon_pronostici_tappa";
export const LS_PRONOSTICI_TAPPA_SCORED = "vatsamon_pronostici_scored";

/** eventId → categoria → id della Reina pronosticata vincente. */
export type PronosticiTappa = Record<string, Partial<Record<SeasonCategoriaId, string>>>;

/** eventId → categorie già "scored" (esito calcolato, ricompensa già valutata una volta: idempotenza). */
export type PronosticiTappaScored = Record<string, SeasonCategoriaId[]>;

/** "1"/"2"/"3" (season.ts) → "1ª"/"2ª"/"3ª" (pesa.ts, richiesta da `avversarieTappa`). */
function toPesaCategoria(cat: SeasonCategoriaId): CategoriaId {
  return `${cat}ª` as CategoriaId;
}

/** Pool pronosticabile per una tappa+categoria: le 3 Reines in lizza (nessuna esclusione). */
export function poolPronosticoTappa(evento: SeasonEvent, cat: SeasonCategoriaId): Vatsamon[] {
  return avversarieTappa(evento, toPesaCategoria(cat));
}

/**
 * La prossima tappa (non finale) su cui i pronostici sono ancora apribili.
 * La finestra chiude all'inizio del giorno di gara: `null` se non c'è una
 * prossima tappa o se la sua data è già arrivata (oggi >= data tappa).
 */
export function tappaPronosticabile(oggiISO: string): SeasonEvent | null {
  return tappe().find((e) => !e.finale && !e.disputata && e.data > oggiISO) ?? null;
}

export type EsitoPronosticoTappa = "attesa" | "corretto" | "sbagliato";

/**
 * Esito del pronostico contro il risultato UFFICIALE della tappa. "attesa"
 * finché non è pubblicato un risultato reale per quell'evento/categoria —
 * MAI valutato contro il calcolo simulato (vedi data/season.ts `winnersFor`).
 */
export function esitoPronosticoTappa(eventId: string, cat: SeasonCategoriaId, pickedCowId: string): EsitoPronosticoTappa {
  const w = winnersFor(eventId)[cat];
  if (!w || w.simulato) return "attesa";
  return w.cow?.id === pickedCowId ? "corretto" : "sbagliato";
}
