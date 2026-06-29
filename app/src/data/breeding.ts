import { Vatsamon } from "../types";
import { resolveIllustration } from "./illustrations";

/**
 * ALLEVAMENTO & GENEALOGIA — sostituisce il vecchio sistema a UOVA (irrealistico:
 * le mucche non nascono da uova). Modello: MONTA (madre × TORO) → GRAVIDANZA
 * (avanza con la cura quotidiana) → NASCITA del moudzon → CRESCITA a stadi.
 * Il vitello EREDITA le 4 statistiche reali (stazza/corna/testa/grinta) come
 * media pesata dei genitori + ambiente, con varianza. 100% statico (localStorage).
 *
 * Correzione biologica chiave (dal redesign): il padre è SEMPRE un TORO, mai una
 * Reina (che è una vacca femmina). I tori sono un'entità separata.
 */

export type Stage = "moudzon" | "manza" | "giovenca" | "reina";

export const STAGE_LABEL: Record<Stage, string> = {
  moudzon: "Moudzon (vitella)",
  manza: "Manza",
  giovenca: "Giovenca",
  reina: "Reina",
};

/** Soglie di età (mesi-gioco) per stadio. */
export const STAGE_MONTHS: Record<Stage, number> = { moudzon: 0, manza: 3, giovenca: 12, reina: 24 };

export function stageForAge(months: number): Stage {
  if (months >= STAGE_MONTHS.reina) return "reina";
  if (months >= STAGE_MONTHS.giovenca) return "giovenca";
  if (months >= STAGE_MONTHS.manza) return "manza";
  return "moudzon";
}

/** Frazione di stat "genetiche" già espressa allo stadio corrente. */
const STAGE_EXPR: Record<Stage, number> = { moudzon: 0.5, manza: 0.7, giovenca: 0.88, reina: 1.0 };

export interface Stats4 { stazza: number; corna: number; testa: number; grinta: number }

export interface Toro {
  id: string;
  nome: string;
  razza: string;
  stats4: Stats4;
  descr: string;
}

/** Registro tori di monta (razze da combattimento: Castana / Pezzata Nera / Hérens). */
export const TORI: Toro[] = [
  { id: "toro-tonnerre", nome: "Tonnerre", razza: "Castana", stats4: { stazza: 92, corna: 95, testa: 80, grinta: 88 }, descr: "Toro di linea castana, presa di corna eccezionale." },
  { id: "toro-roc", nome: "Roc", razza: "Castana", stats4: { stazza: 96, corna: 84, testa: 86, grinta: 78 }, descr: "Massiccio e tranquillo, trasmette stazza." },
  { id: "toro-diable", nome: "Diable", razza: "Pezzata Nera", stats4: { stazza: 84, corna: 88, testa: 78, grinta: 96 }, descr: "Pezzata Nera rustica: grinta da logoramento." },
  { id: "toro-baron", nome: "Baron", razza: "Hérens", stats4: { stazza: 90, corna: 90, testa: 90, grinta: 82 }, descr: "Hérens equilibrato, gran resistenza." },
  { id: "toro-cesar", nome: "César", razza: "Castana", stats4: { stazza: 88, corna: 80, testa: 92, grinta: 84 }, descr: "Lettura della contesa fuori dal comune." },
];

/** Nomi patois autentici per i nati in stalla (dal corpus reale delle Reines). */
const MOUDZON_NAMES = [
  "Caprice", "Malice", "Vipère", "Briganda", "Guerra", "Victoire", "Papillon", "Baronne",
  "Amoureuse", "Gitane", "Zara", "Peloria", "Strega", "Difesa", "Revenge", "Arizona",
  "Reinette", "Mésange", "Étoile", "Bergère", "Sauvage", "Fleur", "Rebelle", "Tempête",
];

/** Pesca un nome non già presente in collezione. */
export function pickMoudzonName(collection: Vatsamon[], seed: number): string {
  const used = new Set(collection.map((c) => c.name.toLowerCase()));
  const free = MOUDZON_NAMES.filter((n) => !used.has(n.toLowerCase()));
  const pool = free.length ? free : MOUDZON_NAMES;
  return pool[seed % pool.length];
}

function clamp(n: number) { return Math.max(10, Math.min(100, Math.round(n))); }

/** Stat ereditate: 0.45 madre + 0.35 toro + 0.20 ambiente, ± varianza. */
export function inheritStats(madre: Stats4, padre: Stats4, ambiente: number, variance = 0.08): Stats4 {
  const mix = (m: number, p: number) => {
    const base = 0.45 * m + 0.35 * p + 0.2 * ambiente;
    const v = 1 + (Math.random() * 2 - 1) * variance;
    return clamp(base * v);
  };
  return { stazza: mix(madre.stazza, padre.stazza), corna: mix(madre.corna, padre.corna), testa: mix(madre.testa, padre.testa), grinta: mix(madre.grinta, padre.grinta) };
}

/** Razza ereditata: stessa razza dei genitori, altrimenti 50/50 (mai Pezzata Rossa da combattimento). */
export function inheritRazza(madre: string, padre: string): string {
  if (madre === padre) return madre;
  const pick = Math.random() < 0.5 ? madre : padre;
  return pick === "Pezzata Rossa" ? (padre !== "Pezzata Rossa" ? padre : "Castana") : pick;
}

export interface Pregnancy {
  id: string;
  motherId: string;
  motherName: string;
  motherStats4: Stats4;
  motherRazza: string;
  fatherId: string;
  fatherName: string;
  fatherStats4: Stats4;
  fatherRazza: string;
  progress: number;   // 0..100 gestazione
  benessere: number;  // 0..100 salute madre
  ambiente: number;   // baseline ambiente (sale con rispetto/cura)
  lastCareAt: Record<string, number>; // timestamp per azione di cura
  startedAt: number;
}

/** Statistiche 4 di una Vatsamon (reale o nata in stalla). */
export function stats4Of(cow: Vatsamon): Stats4 {
  if (cow.stats4) return cow.stats4;
  // fallback dal modello di gioco a 3 stat
  return { stazza: cow.stats.defense, corna: cow.stats.strength, testa: cow.stats.defense, grinta: cow.stats.agility };
}

/** Anteprima genetica (media attesa, senza varianza) per la UI di monta. */
export function predictStats(madre: Stats4, padre: Stats4, ambiente: number): Stats4 {
  return inheritStats(madre, padre, ambiente, 0);
}

/** Crea il moudzon alla nascita dalla gravidanza. */
export function birthCalf(p: Pregnancy, collection: Vatsamon[], generation: number): Vatsamon {
  const stats4 = inheritStats(p.motherStats4, p.fatherStats4, p.ambiente);
  const razza = inheritRazza(p.motherRazza, p.fatherRazza);
  const name = pickMoudzonName(collection, Math.floor(p.startedAt));
  const potenza = stats4.stazza + stats4.corna + stats4.testa + stats4.grinta;
  // stat di gioco a stadio moudzon (50% delle genetiche)
  const expr = STAGE_EXPR.moudzon;
  const strength = clamp(stats4.corna * expr + 20);
  const defense = clamp(stats4.testa * expr + 20);
  const agility = clamp(stats4.grinta * expr + 20);
  const cp = Math.floor((strength * 2 + defense + agility) * 1.1);
  const lineTrait = `istinto di ${p.motherName}`;
  return {
    id: "stalla-" + Math.floor(p.startedAt) + "-" + (collection.length + 1),
    breed: razza,
    name,
    stats: { strength, defense, agility },
    rarity: "Rara",
    eco_tip: "Conduci con calma: una vitella cresce serena se rispetti i suoi tempi.",
    lore: `Moudzon di ${p.motherName} × ${p.fatherName}. Eredita ${lineTrait}.`,
    capturedAt: new Date().toISOString(),
    cp,
    level: 1,
    isReal: false,
    realPhoto: null,
    stats4,
    potenza,
    illustration: resolveIllustration(name, razza),
    // campi genealogia
    bornInStalla: true,
    stage: "moudzon",
    ageMonths: 0,
    geneticStats4: stats4,
    motherId: p.motherId,
    fatherId: p.fatherId,
    fatherName: p.fatherName,
    generation,
    lineTrait,
    peso_kg: 42,
  } as Vatsamon;
}

/** Avanza la crescita di un capo nato in stalla: +mesi, interpola stat e peso. */
export function growCow(cow: Vatsamon, addMonths: number): Vatsamon {
  const months = (cow.ageMonths ?? 0) + addMonths;
  const stage = stageForAge(months);
  const gen = cow.geneticStats4 ?? stats4Of(cow);
  const expr = STAGE_EXPR[stage];
  const strength = clamp(gen.corna * expr + (1 - expr) * 20);
  const defense = clamp(gen.testa * expr + (1 - expr) * 20);
  const agility = clamp(gen.grinta * expr + (1 - expr) * 20);
  const cp = Math.floor((strength * 2 + defense + agility) * 1.1);
  // peso: cresce da ~42kg verso un target genetico (stazza→peso indicativo)
  const targetPeso = 480 + Math.round((gen.stazza - 50) * 3);
  const peso = Math.round(42 + (targetPeso - 42) * Math.min(1, months / STAGE_MONTHS.reina));
  return { ...cow, ageMonths: months, stage, stats: { strength, defense, agility }, cp, peso_kg: peso };
}

// ---- costanti di bilanciamento (demo: loop visibile/giocabile) ----
export const CARE_COOLDOWN_MS = 1500;     // attesa tra azioni di cura
export const CARE_PROGRESS = 12;          // gravidanza +% per azione di cura
export const CARE_BENESSERE = 6;          // benessere +% per azione di cura
export const GROW_COOLDOWN_MS = 1500;     // attesa tra azioni di crescita
export const GROW_MONTHS = 6;             // mesi-gioco per azione di crescita
