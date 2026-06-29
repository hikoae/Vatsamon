/**
 * Sistema di combattimento "serio" stile Pokémon per Vatsamon.
 *
 * - 5 TIPI tematici valdostani con triangolo di efficacie/debolezze (ciclo a 5).
 * - Ogni Reina ha un TIPO derivato da razza/statistiche reali.
 * - MOSSE con tipo, categoria (attacco/speciale/difesa/cura/buff), e nomi
 *   volutamente demenziali. Le speciali richiedono la barra Adrenalina carica.
 * - Set di 4 mosse per Reina, costruito da tipo + rarità (firma per le Leggendarie).
 * - OGGETTI da battaglia (cure + buff) usabili dallo zaino durante lo scontro.
 */
import { Vatsamon, RarityType } from "../types";
import rawDex from "./vatsadex.json";

// Distribuzione reale delle 4 statistiche (per assegnare i tipi in modo
// equilibrato via percentile, evitando che la "stazza" sempre alta domini).
const _dex = (rawDex as unknown as { bovine: { stats: { stazza: number; corna: number; testa: number; grinta: number } }[] }).bovine;
const _sorted: Record<"stazza" | "corna" | "testa" | "grinta", number[]> = {
  stazza: _dex.map((b) => b.stats.stazza).sort((a, b) => a - b),
  corna: _dex.map((b) => b.stats.corna).sort((a, b) => a - b),
  testa: _dex.map((b) => b.stats.testa).sort((a, b) => a - b),
  grinta: _dex.map((b) => b.stats.grinta).sort((a, b) => a - b),
};
/** Percentile (0..1) di un valore nella distribuzione reale di quella statistica. */
function _pct(stat: "stazza" | "corna" | "testa" | "grinta", v: number): number {
  const arr = _sorted[stat];
  let lo = 0, hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; }
  return lo / Math.max(1, arr.length - 1);
}

// ===================== TIPI =====================
export type VatsaType = "corna" | "prato" | "tempesta" | "latte" | "roccia";

export interface TypeMeta {
  id: VatsaType;
  name: string;
  emoji: string;
  color: string; // colore accento (hex)
}

export const TYPES: Record<VatsaType, TypeMeta> = {
  corna:    { id: "corna",    name: "Corna",    emoji: "🐂", color: "#e11d48" },
  prato:    { id: "prato",    name: "Prato",    emoji: "🌿", color: "#16a34a" },
  tempesta: { id: "tempesta", name: "Tempesta", emoji: "⛈️", color: "#0ea5e9" },
  latte:    { id: "latte",    name: "Latte",    emoji: "🥛", color: "#a78bfa" },
  roccia:   { id: "roccia",   name: "Roccia",   emoji: "🪨", color: "#a16207" },
};

/**
 * Ciclo di superiorità (ognuno è SUPER-EFFICACE contro il successivo):
 *   Corna → Prato → Tempesta → Latte → Roccia → (Corna)
 * Di conseguenza è poco efficace contro il precedente.
 */
const CYCLE: VatsaType[] = ["corna", "prato", "tempesta", "latte", "roccia"];

/** Moltiplicatore di efficacia del tipo attaccante contro il tipo difensore.
 *  Valori "morbidi" (1.5 / 0.7) per bilanciamento: il tipo conta ma non decide
 *  da solo la battaglia (testato in simulazione). */
export function typeMultiplier(attacker: VatsaType, defender: VatsaType): number {
  if (attacker === defender) return 1;
  const ai = CYCLE.indexOf(attacker);
  if (CYCLE[(ai + 1) % CYCLE.length] === defender) return 1.5;    // super-efficace
  if (CYCLE[(ai + 4) % CYCLE.length] === defender) return 0.7;    // poco efficace
  return 1;
}

export function effectivenessLabel(mult: number): string {
  if (mult > 1) return "È SUPER-EFFICACE! 💥";
  if (mult < 1) return "Non è molto efficace…";
  return "";
}

/**
 * Assegna il tipo a una Reina in base a quale delle 4 statistiche reali è la sua
 * più "spiccata" (percentile più alto nella distribuzione del dataset). Questo
 * dà una distribuzione equilibrata fra tutti e 5 i tipi (la stazza non domina
 * più tutto). Le Pezzate Rosse restano razze "da latte" per tema.
 */
const STAT_OF_TYPE: Record<"stazza" | "corna" | "testa" | "grinta", VatsaType> = {
  stazza: "roccia", corna: "corna", testa: "prato", grinta: "tempesta",
};
export function cowType(cow: Vatsamon): VatsaType {
  if (/pezzata\s*rossa/i.test(cow.breed)) return "latte";
  const s = cow.stats4 ?? {
    stazza: cow.stats.defense, corna: cow.stats.strength, testa: cow.stats.defense, grinta: cow.stats.agility,
  };
  let best: VatsaType = "roccia", bestP = -1;
  (Object.keys(STAT_OF_TYPE) as ("stazza" | "corna" | "testa" | "grinta")[]).forEach((k) => {
    const p = _pct(k, s[k]);
    if (p > bestP) { bestP = p; best = STAT_OF_TYPE[k]; }
  });
  return best;
}

// ===================== MOSSE =====================
export type MoveCategory = "attacco" | "speciale" | "difesa" | "cura" | "buff";

export interface BattleMove {
  id: string;
  name: string;
  emoji: string;
  type: VatsaType;
  category: MoveCategory;
  power: number;      // moltiplicatore danno (attacco/speciale)
  accuracy: number;   // 0..1
  energy: number;     // costo (speciali) o guadagno (altre) di Adrenalina
  desc: string;
  /** cura: HP recuperati; buff: entità del potenziamento (in %). */
  amount?: number;
  buffStat?: "atk" | "def";
}

// Mosse base d'attacco per tipo (affidabili, caricano l'Adrenalina).
const BASIC: Record<VatsaType, BattleMove> = {
  corna:    { id: "corna_basic",    name: "Incornata Decisa", emoji: "🐂", type: "corna",    category: "attacco", power: 0.85, accuracy: 0.95, energy: 25, desc: "Spinta frontale a corna limate, decisa e pulita." },
  prato:    { id: "prato_basic",    name: "Spinta del Pascolo", emoji: "🌿", type: "prato",    category: "attacco", power: 0.85, accuracy: 0.95, energy: 25, desc: "Una spinta nutrita di trifoglio alpino." },
  tempesta: { id: "tempesta_basic", name: "Föhn Furioso",            emoji: "⛈️", type: "tempesta", category: "attacco", power: 0.85, accuracy: 0.95, energy: 25, desc: "Una folata calda che spettina pure i ghiacciai." },
  latte:    { id: "latte_basic",    name: "Spruzzo di Fontina",      emoji: "🥛", type: "latte",    category: "attacco", power: 0.85, accuracy: 0.95, energy: 25, desc: "Getto lattiginoso ad alta pressione DOP." },
  roccia:   { id: "roccia_basic",   name: "Spallata di Roccia",      emoji: "🪨", type: "roccia",   category: "attacco", power: 0.85, accuracy: 0.95, energy: 25, desc: "Salda come la roccia della montagna." },
};

// Mosse SPECIALI per tipo (potenti, richiedono Adrenalina carica).
const SPECIAL: Record<VatsaType, BattleMove> = {
  corna:    { id: "corna_sp",    name: "Testata della Reine",     emoji: "💥", type: "corna",    category: "speciale", power: 1.95, accuracy: 0.9, energy: 100, desc: "La spinta decisiva della regina: richiede Adrenalina piena." },
  prato:    { id: "prato_sp",    name: "Pieno di Sole",    emoji: "🌻", type: "prato",    category: "speciale", power: 1.9, accuracy: 0.9, energy: 100, desc: "Assorbe il sole e lo restituisce in faccia all'avversario." },
  tempesta: { id: "tempesta_sp", name: "Grandinata d'Alta Quota",        emoji: "🌪️", type: "tempesta", category: "speciale", power: 1.9, accuracy: 0.88, energy: 100, desc: "Chicchi di grandine grossi come campanacci." },
  latte:    { id: "latte_sp",    name: "Fiume di Latte",    emoji: "🌊", type: "latte",    category: "speciale", power: 1.9, accuracy: 0.9, energy: 100, desc: "Una piena di latte d'alpeggio travolgente." },
  roccia:   { id: "roccia_sp",   name: "Valanga d'Autunno",       emoji: "🏔️", type: "roccia",   category: "speciale", power: 2.0, accuracy: 0.85, energy: 100, desc: "Travolge come una valanga di fine stagione." },
};

// Mossa firma per le Leggendarie (sostituisce la speciale).
const SIGNATURE: BattleMove = {
  id: "signature",
  name: "Muggito della Mandria",
  emoji: "🔱",
  type: "corna",
  category: "speciale",
  power: 2.3,
  accuracy: 0.92,
  energy: 100,
  desc: "Un muggito così potente da far tremare le Alpi. Solo le Reine leggendarie lo conoscono.",
};

// Mosse di utilità (difesa / cura / buff), comuni a tutte.
const MURO: BattleMove   = { id: "muro",   name: "Muro di Stalla",     emoji: "🛡️", type: "roccia", category: "difesa", power: 0, accuracy: 1, energy: 20, desc: "Si pianta sugli zoccoli: dimezza il prossimo colpo subìto." };
const PISOLINO: BattleMove = { id: "pisolino", name: "Pisolino al Pascolo", emoji: "😴", type: "prato", category: "cura", power: 0, accuracy: 1, energy: 15, amount: 80, desc: "Una pennichella ristoratrice tra i fiori: recupera HP." };
const SGUARDO: BattleMove = { id: "sguardo", name: "Sguardo Regale",     emoji: "👑", type: "corna", category: "buff", power: 0, accuracy: 1, energy: 15, buffStat: "atk", amount: 35, desc: "Fissa l'avversario con regalità: alza l'attacco." };
const RUMINA: BattleMove  = { id: "rumina",  name: "Ruminazione Zen",    emoji: "🧘", type: "latte", category: "buff", power: 0, accuracy: 1, energy: 15, buffStat: "def", amount: 35, desc: "Mastica filosoficamente: alza la difesa." };

/** Set di 4 mosse a partire da un TIPO e una rarità (firma per le Leggendarie). */
export function movesetForType(t: VatsaType, rarity: RarityType): BattleMove[] {
  const heavy = rarity === "Leggendaria" ? SIGNATURE : SPECIAL[t];
  const utility = rarity === "Epica" ? SGUARDO : rarity === "Rara" ? RUMINA : MURO;
  return [BASIC[t], heavy, utility, PISOLINO];
}

/** Costruisce il set di 4 mosse di una Reina dal suo tipo e dalla rarità. */
export function cowMoveset(cow: Vatsamon): BattleMove[] {
  return movesetForType(cowType(cow), cow.rarity);
}

// ===================== OGGETTI DA BATTAGLIA =====================
export interface BattleItemEffect {
  id: string;
  kind: "heal" | "buff_atk" | "buff_def" | "energy";
  amount: number; // HP curati, % buff, o energia
}

/** Oggetti dello zaino utilizzabili in combattimento (mappa id → effetto). */
export const BATTLE_ITEMS: Record<string, BattleItemEffect> = {
  "item-potion-milk":    { id: "item-potion-milk",    kind: "heal",     amount: 60 },
  "item-potion-fontina": { id: "item-potion-fontina", kind: "heal",     amount: 130 },
  "item-buff-genepy":    { id: "item-buff-genepy",    kind: "buff_atk", amount: 40 },
  "item-buff-bell":      { id: "item-buff-bell",      kind: "buff_def", amount: 40 },
  "item-energy-grappa":  { id: "item-energy-grappa",  kind: "energy",   amount: 60 },
};
