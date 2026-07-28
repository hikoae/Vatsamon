/**
 * Risultati UFFICIALI delle eliminatorie/finale (S11) — Firestore.
 *
 * Prima di S11 i "vincitori" mostrati nel Calendario (data/season.ts,
 * `winnersFor`) erano SEMPRE fabbricati: un ordinamento delle 73 REAL_COWS
 * per stat interna `potenza`, spacciato in UI per un dato di gara con badge
 * "LIVE" — inaccettabile per chi segue le Batailles de Reines sul serio.
 *
 * Questo modulo legge/scrive `risultati/{eventId}` su Firestore:
 *  - lettura pubblica (anche utenti non autenticati) — vedi firestore.rules;
 *  - scrittura riservata a chi ha `uid` in `ADMIN_UIDS` (gating qui è solo
 *    UI: l'unica autorità reale sono le Firestore rules, che replicano lo
 *    stesso allowlist lato server con un placeholder da sostituire — TODO G7).
 *
 * Nessun risultato pubblicato per un evento → data/season.ts ricade sul
 * calcolo simulato di prima, ma SEMPRE marcato `simulato: true` per la UI.
 */
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase";

export interface RisultatoCategoria {
  nome: string;
  note?: string;
}

export interface RisultatoEvento {
  cat1: RisultatoCategoria;
  cat2: RisultatoCategoria;
  cat3: RisultatoCategoria;
  inseritoAt?: unknown;
}

/**
 * G7 — TODO: sostituire con l'/gli uid Firebase reali dell'operatore prima
 * che il form admin sia raggiungibile in produzione. Vuoto = il form resta
 * invisibile a chiunque, indipendentemente da chi è loggato. Difesa in
 * profondità: questo è solo gating UI, l'autorità reale resta
 * firestore.rules (placeholder "__ADMIN_UID__" lì, stesso TODO).
 */
export const ADMIN_UIDS: string[] = ["6f8lhVEeX2OI3jZZYGK7jMvEa1L2"];

const COLLECTION = "risultati";

let cache: Record<string, RisultatoEvento> | null = null;
let inFlight: Promise<Record<string, RisultatoEvento>> | null = null;

/** Lettura sincrona dalla cache in memoria — `undefined` = non ancora caricata. */
export function getCachedRisultato(eventId: string): RisultatoEvento | undefined {
  return cache?.[eventId];
}

/** true quando la fetch bulk è già stata completata (anche a vuoto/errore). */
export function risultatiReady(): boolean {
  return cache !== null;
}

/**
 * Carica TUTTI i risultati una tantum e li cachea in memoria: `winnersFor`
 * (data/season.ts) legge poi la cache in modo sincrono. Fallisce silenzioso
 * (Firebase assente, offline, permission-denied): la cache diventa `{}` così
 * l'app ricade sempre e comunque sul calcolo simulato, mai un crash.
 */
export async function getAllRisultati(): Promise<Record<string, RisultatoEvento>> {
  if (cache) return cache;
  if (inFlight) return inFlight;
  if (!firebaseEnabled || !db) {
    cache = {};
    return cache;
  }
  inFlight = (async () => {
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      const out: Record<string, RisultatoEvento> = {};
      snap.forEach((d) => { out[d.id] = d.data() as RisultatoEvento; });
      cache = out;
    } catch (err) {
      console.warn("[risultati] fetch bulk fallita, fallback su calcolo simulato", err);
      cache = {};
    } finally {
      inFlight = null;
    }
    return cache as Record<string, RisultatoEvento>;
  })();
  return inFlight;
}

/** Un singolo evento: usa la cache bulk se già calda, altrimenti un getDoc diretto. */
export async function getRisultato(eventId: string): Promise<RisultatoEvento | null> {
  if (cache && eventId in cache) return cache[eventId];
  if (!firebaseEnabled || !db) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, eventId));
    return snap.exists() ? (snap.data() as RisultatoEvento) : null;
  } catch (err) {
    console.warn(`[risultati] lettura ${eventId} fallita`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
//  Cache AUTO (G5) — pre-compilazione da app/public/risultati_cache.json,
//  generata da scripts/build-risultati.mjs leggendo il tabellone pubblicato
//  su amisdesreines.it. MAI un sostituto del dato confermato su Firestore
//  (sopra): è solo un suggerimento per l'admin, marcato "non ufficiale" in
//  UI finché non viene confermato con un tap in RisultatiAdmin.
// ---------------------------------------------------------------------------

export interface RisultatoAutoEvento {
  cat1?: RisultatoCategoria;
  cat2?: RisultatoCategoria;
  cat3?: RisultatoCategoria;
  confidence: string;
  sourceUrl?: string;
  fetchedAt?: string;
}

export interface RisultatiAutoPayload {
  generatedAt: string;
  results: Record<string, RisultatoAutoEvento>;
  pressHints: Record<string, string[]>;
}

const EMPTY_AUTO: RisultatiAutoPayload = { generatedAt: "", results: {}, pressHints: {} };

const BASE = import.meta.env.BASE_URL;

let autoCache: RisultatiAutoPayload | null = null;
let autoInFlight: Promise<RisultatiAutoPayload> | null = null;

/**
 * Carica una tantum `risultati_cache.json` (same-origin, no-store: è un
 * file statico rigenerato dal workflow, mai da mettere in cache dal browser
 * più a lungo di una sessione). Fallisce silenzioso come `getAllRisultati`:
 * file assente/malformato/offline → cache vuota, mai un crash a valle.
 * Il payload viene normalizzato qui una volta sola: `results`/`pressHints`
 * sono garantiti oggetti anche se lo scraper cambia forma, così i call-site
 * a valle (getMergedRisultato, getPressHints) non possono esplodere.
 */
export async function getAllRisultatiAuto(): Promise<RisultatiAutoPayload> {
  if (autoCache) return autoCache;
  if (autoInFlight) return autoInFlight;
  autoInFlight = (async () => {
    try {
      const res = await fetch(`${BASE}risultati_cache.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as Partial<RisultatiAutoPayload> | null;
      autoCache = {
        generatedAt: raw?.generatedAt ?? "",
        results: raw?.results ?? {},
        pressHints: raw?.pressHints ?? {},
      };
    } catch (err) {
      console.warn("[risultati] fetch cache auto fallita", err);
      autoCache = { ...EMPTY_AUTO };
    } finally {
      autoInFlight = null;
    }
    return autoCache as RisultatiAutoPayload;
  })();
  return autoInFlight;
}

/** Link agli articoli (AostaSera) che parlano probabilmente di questa tappa. */
export function getPressHints(eventId: string): string[] {
  return autoCache?.pressHints[eventId] ?? [];
}

/** Voce grezza della cache auto per un evento (uso: precompilazione form
 * admin — RisultatiAdmin). A differenza di `getMergedRisultato` NON applica
 * la priorità su Firestore: la usa solo chi deve sapere "cosa c'è in cache
 * auto" indipendentemente da un eventuale dato già confermato. */
export function getCachedRisultatoAuto(eventId: string): RisultatoAutoEvento | undefined {
  return autoCache?.results[eventId];
}

export type RisultatoConfidence = "ufficiale" | "auto" | "simulato";

export interface RisultatoMerged {
  cat1?: RisultatoCategoria;
  cat2?: RisultatoCategoria;
  cat3?: RisultatoCategoria;
  confidence: RisultatoConfidence;
  sourceUrl?: string;
}

/**
 * Merge con priorità Firestore(confermato) > cache auto(non confermato) >
 * `undefined` (season.ts ricade sul calcolo simulato). Sincrono: legge le
 * cache in memoria già scaldate da `getAllRisultati`/`getAllRisultatiAuto`
 * (entrambe chiamate all'avvio di SeasonView), stesso pattern di
 * `getCachedRisultato`.
 */
export function getMergedRisultato(eventId: string): RisultatoMerged | undefined {
  const confirmed = getCachedRisultato(eventId);
  if (confirmed) {
    return { cat1: confirmed.cat1, cat2: confirmed.cat2, cat3: confirmed.cat3, confidence: "ufficiale" };
  }
  const auto = autoCache?.results[eventId];
  if (auto && (auto.cat1 || auto.cat2 || auto.cat3)) {
    return { cat1: auto.cat1, cat2: auto.cat2, cat3: auto.cat3, confidence: "auto", sourceUrl: auto.sourceUrl };
  }
  return undefined;
}

export type SetRisultatoResult = { ok: true } | { ok: false; error: string };

/**
 * Scrittura admin-only (verificata anche e SOPRATTUTTO lato Firestore rules:
 * questa funzione non è la difesa, è solo il client). Denial gestito in
 * modo grazioso: mai un throw non catturato verso il chiamante UI.
 */
export async function setRisultato(
  eventId: string,
  data: { cat1: RisultatoCategoria; cat2: RisultatoCategoria; cat3: RisultatoCategoria },
): Promise<SetRisultatoResult> {
  if (!firebaseEnabled || !db) {
    return { ok: false, error: "Cloud non disponibile in modalità locale." };
  }
  try {
    await setDoc(doc(db, COLLECTION, eventId), { ...data, inseritoAt: serverTimestamp() });
    if (cache) cache[eventId] = { ...data, inseritoAt: new Date() };
    return { ok: true };
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "permission-denied") {
      return { ok: false, error: "Permessi insufficienti: il tuo account non è autorizzato a pubblicare risultati." };
    }
    return { ok: false, error: "Errore durante il salvataggio. Riprova." };
  }
}
