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
import { Vatsamon } from "../types";

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

/** Moltiplicatore di efficacia del tipo attaccante contro il tipo difensore. */
export function typeMultiplier(attacker: VatsaType, defender: VatsaType): number {
  if (attacker === defender) return 1;
  const ai = CYCLE.indexOf(attacker);
  if (CYCLE[(ai + 1) % CYCLE.length] === defender) return 2;     // super-efficace
  if (CYCLE[(ai + 4) % CYCLE.length] === defender) return 0.5;   // poco efficace
  return 1;
}

export function effectivenessLabel(mult: number): string {
  if (mult >= 2) return "È SUPER-EFFICACE! 💥";
  if (mult <= 0.5) return "Non è molto efficace…";
  return "";
}

/** Assegna il tipo a una Reina da razza/statistiche reali (deterministico). */
export function cowType(cow: Vatsamon): VatsaType {
  // Le Pezzate Rosse sono razze "da latte" per eccellenza.
  if (/pezzata\s*rossa/i.test(cow.breed)) return "latte";
  const s = cow.stats4;
  const stazza = s ? s.stazza : cow.stats.defense;
  const corna = s ? s.corna : cow.stats.strength;
  const testa = s ? s.testa : cow.stats.defense;
  const grinta = s ? s.grinta : cow.stats.agility;
  const pairs: [VatsaType, number][] = [
    ["corna", corna],
    ["roccia", stazza],
    ["prato", testa],
    ["tempesta", grinta],
  ];
  pairs.sort((a, b) => b[1] - a[1]);
  return pairs[0][0];
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
  corna:    { id: "corna_basic",    name: "Incornata della Suocera", emoji: "🐂", type: "corna",    category: "attacco", power: 1.0, accuracy: 0.95, energy: 25, desc: "Spintone frontale carico di rancore famigliare." },
  prato:    { id: "prato_basic",    name: "Ruttino Erbivoro Tattico", emoji: "🌿", type: "prato",    category: "attacco", power: 1.0, accuracy: 0.95, energy: 25, desc: "Eruttazione mirata profumata di trifoglio alpino." },
  tempesta: { id: "tempesta_basic", name: "Föhn Furioso",            emoji: "⛈️", type: "tempesta", category: "attacco", power: 1.0, accuracy: 0.95, energy: 25, desc: "Una folata calda che spettina pure i ghiacciai." },
  latte:    { id: "latte_basic",    name: "Spruzzo di Fontina",      emoji: "🥛", type: "latte",    category: "attacco", power: 1.0, accuracy: 0.95, energy: 25, desc: "Getto lattiginoso ad alta pressione DOP." },
  roccia:   { id: "roccia_basic",   name: "Sassata del Cugino",      emoji: "🪨", type: "roccia",   category: "attacco", power: 1.0, accuracy: 0.95, energy: 25, desc: "Un masso lanciato con affetto rude di montagna." },
};

// Mosse SPECIALI per tipo (potenti, richiedono Adrenalina carica).
const SPECIAL: Record<VatsaType, BattleMove> = {
  corna:    { id: "corna_sp",    name: "Testata Termonucleare",     emoji: "💥", type: "corna",    category: "speciale", power: 2.4, accuracy: 0.9, energy: 100, desc: "Capocciata da fine del mondo: richiede Adrenalina piena." },
  prato:    { id: "prato_sp",    name: "Fotosintesi Aggressiva",    emoji: "🌻", type: "prato",    category: "speciale", power: 2.3, accuracy: 0.9, energy: 100, desc: "Assorbe il sole e lo restituisce in faccia all'avversario." },
  tempesta: { id: "tempesta_sp", name: "Grandinata Express",        emoji: "🌪️", type: "tempesta", category: "speciale", power: 2.3, accuracy: 0.88, energy: 100, desc: "Chicchi di grandine grossi come campanacci." },
  latte:    { id: "latte_sp",    name: "Diluvio di Latte Crudo",    emoji: "🌊", type: "latte",    category: "speciale", power: 2.3, accuracy: 0.9, energy: 100, desc: "Uno tsunami caseario travolgente." },
  roccia:   { id: "roccia_sp",   name: "Valanga Vendicativa",       emoji: "🏔️", type: "roccia",   category: "speciale", power: 2.5, accuracy: 0.85, energy: 100, desc: "Mezza montagna in testa al malcapitato." },
};

// Mossa firma per le Leggendarie (sostituisce la speciale).
const SIGNATURE: BattleMove = {
  id: "signature",
  name: "Muggito dell'Apocalisse",
  emoji: "🔱",
  type: "corna",
  category: "speciale",
  power: 2.9,
  accuracy: 0.92,
  energy: 100,
  desc: "Un muggito così potente da far tremare le Alpi. Solo le Reine leggendarie lo conoscono.",
};

// Mosse di utilità (difesa / cura / buff), comuni a tutte.
const MURO: BattleMove   = { id: "muro",   name: "Muro di Stalla",     emoji: "🛡️", type: "roccia", category: "difesa", power: 0, accuracy: 1, energy: 20, desc: "Si pianta sugli zoccoli: dimezza il prossimo colpo subìto." };
const PISOLINO: BattleMove = { id: "pisolino", name: "Pisolino al Pascolo", emoji: "😴", type: "prato", category: "cura", power: 0, accuracy: 1, energy: 15, amount: 70, desc: "Una pennichella ristoratrice tra i fiori: recupera HP." };
const SGUARDO: BattleMove = { id: "sguardo", name: "Sguardo Regale",     emoji: "👑", type: "corna", category: "buff", power: 0, accuracy: 1, energy: 15, buffStat: "atk", amount: 35, desc: "Fissa l'avversario con regalità: alza l'attacco." };
const RUMINA: BattleMove  = { id: "rumina",  name: "Ruminazione Zen",    emoji: "🧘", type: "latte", category: "buff", power: 0, accuracy: 1, energy: 15, buffStat: "def", amount: 35, desc: "Mastica filosoficamente: alza la difesa." };

/** Costruisce il set di 4 mosse di una Reina dal suo tipo e dalla rarità. */
export function cowMoveset(cow: Vatsamon): BattleMove[] {
  const t = cowType(cow);
  const isLegendary = cow.rarity === "Leggendaria";
  const heavy = isLegendary ? SIGNATURE : SPECIAL[t];
  // Difensiva/buff in base alla rarità per dare varietà.
  const utility =
    cow.rarity === "Epica" ? SGUARDO :
    cow.rarity === "Rara" ? RUMINA : MURO;
  return [BASIC[t], heavy, utility, PISOLINO];
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
