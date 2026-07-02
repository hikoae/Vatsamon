/**
 * Dati residui del combattimento. Il motore vivo è "La Spinta"
 * (lib/spinta.ts): qui restano solo le etichette legacy dei dati storici e
 * gli oggetti da battaglia (rielaborati nello Sac du Berger, S3.3).
 */

// ===================== ETICHETTE LEGACY =====================
// I 5 "tipi" restano SOLO come etichette nei dati storici di arene e Leghe
// (mappate su un'indole in lib/spinta.personalitaFromLegacy). Il motore di
// combattimento non li usa: la Spinta lavora su massa/presa/volontà reali.
export type VatsaType = "corna" | "prato" | "tempesta" | "latte" | "roccia";

// ===================== OGGETTI DA BATTAGLIA =====================
export interface BattleItemEffect {
  id: string;
  kind: "heal" | "buff_atk" | "buff_def" | "energy";
  amount: number; // fiato o calma restituiti (v. componenti battaglia)
}

/** Oggetti dello zaino utilizzabili in combattimento (mappa id → effetto). */
export const BATTLE_ITEMS: Record<string, BattleItemEffect> = {
  "item-potion-milk":    { id: "item-potion-milk",    kind: "heal",     amount: 60 },
  "item-potion-fontina": { id: "item-potion-fontina", kind: "heal",     amount: 130 },
  "item-buff-genepy":    { id: "item-buff-genepy",    kind: "buff_atk", amount: 40 },
  "item-buff-bell":      { id: "item-buff-bell",      kind: "buff_def", amount: 40 },
  "item-energy-grappa":  { id: "item-energy-grappa",  kind: "energy",   amount: 60 },
};
