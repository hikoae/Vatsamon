/**
 * IL PATOIS GIOCATO — le parole verificate del glossario (bataillesContent
 * §GLOSSARIO, dossier §10) non si leggono: SI GUADAGNANO compiendole.
 * La prima nascita in stalla sblocca "modzon", la prima salita all'alpe
 * "inarpa", il primo trofeo "mécro"… Ogni parola sbloccata compare nel
 * Profilo con la sua definizione IT/FR: a fine stagione parli il lessico
 * delle Batailles senza aver mai aperto una scheda.
 */
import { GLOSSARIO, GlossarioVoce } from "../data/bataillesContent";

export const LS_PATOIS = "vatsamon_patois";

/** chiave glossario → gesto che la sblocca (descrizione mostrata nel Profilo). */
export const PATOIS_TRIGGERS: Record<string, string> = {
  reine: "la prima Reina che ti viene affidata",
  bataille: "la tua prima spinta vinta",
  moudzon: "la prima nascita nella tua stalla",
  inarpa: "la prima salita all'alpe",
  desarpa: "la tua prima cerimonia della Désarpa",
  alpeggio: "tre giorni di cura all'arp",
  bosquet: "il tuo primo trofeo di tappa",
  reina_corne: "una tua Reina di corne alla Désarpa",
  reina_latte: "una tua Reine du lait alla Désarpa",
  eliminatoria: "la tua prima tappa ufficiale giocata",
  reine_des_reines: "vincere la finale della Croix-Noire",
};

export function parolePatois(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_PATOIS) || "[]"); } catch { return []; }
}

/** Sblocca una parola (idempotente). Ritorna la voce se è NUOVA, altrimenti null. */
export function sbloccaParola(chiave: string): GlossarioVoce | null {
  const attuali = parolePatois();
  if (attuali.includes(chiave)) return null;
  const voce = GLOSSARIO.find((v) => v.chiave === chiave);
  if (!voce) return null;
  localStorage.setItem(LS_PATOIS, JSON.stringify([...attuali, chiave]));
  return voce;
}

export function vociSbloccate(): GlossarioVoce[] {
  const set = new Set(parolePatois());
  return GLOSSARIO.filter((v) => set.has(v.chiave));
}

export const TOTALE_PAROLE = Object.keys(PATOIS_TRIGGERS).length;
