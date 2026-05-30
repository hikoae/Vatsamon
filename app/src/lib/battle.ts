import { Vatsamon } from "../types";
import { Pastore } from "../data/opponents";

/** Le 4 mosse, derivate dalle 4 statistiche reali (stazza/corna/testa/grinta). */
export type MoveId = "spallata" | "incornata" | "difesa" | "sguardo";

export interface Move {
  id: MoveId;
  name: string;
  emoji: string;
  kind: "attack" | "defend" | "buff";
  power: number; // moltiplicatore danno (solo attack)
  accuracy: number; // 0..1
  desc: string;
}

export const MOVES: Move[] = [
  { id: "spallata", name: "Spallata", emoji: "🐂", kind: "attack", power: 0.9, accuracy: 0.95, desc: "Spinta affidabile: danno medio, raramente sbaglia." },
  { id: "incornata", name: "Incornata", emoji: "💥", kind: "attack", power: 1.5, accuracy: 0.7, desc: "Carica potente ma meno precisa: alto danno." },
  { id: "difesa", name: "Difesa", emoji: "🛡️", kind: "defend", power: 0, accuracy: 1, desc: "Pianta gli zoccoli: dimezza il danno del prossimo turno." },
  { id: "sguardo", name: "Sguardo Regale", emoji: "👑", kind: "buff", power: 0, accuracy: 1, desc: "Carica la grinta: il prossimo attacco è potenziato." },
];

export interface Fighter {
  name: string;
  breed: string;
  level: number;
  atk: number; // corna / strength
  def: number; // testa / resistance
  agi: number; // grinta / agility
  maxHp: number;
  /** Vatsamon di supporto per la grafica (CowVisual). */
  visual: Pick<Vatsamon, "breed" | "rarity" | "realPhoto" | "name">;
}

function clamp(n: number, lo = 10, hi = 120) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/** Costruisce il combattente del giocatore dalla sua Reina. */
export function buildPlayerFighter(cow: Vatsamon): Fighter {
  const s4 = cow.stats4;
  const atk = clamp(s4 ? s4.corna : cow.stats.strength);
  const def = clamp(s4 ? s4.testa : cow.stats.defense);
  const agi = clamp(s4 ? s4.grinta : cow.stats.agility);
  const stazza = s4 ? s4.stazza : cow.stats.defense;
  const peso = cow.peso_kg ?? 600;
  const maxHp = Math.round(90 + stazza * 0.7 + peso / 14 + cow.level * 3);
  return {
    name: cow.name,
    breed: cow.breed,
    level: cow.level,
    atk,
    def,
    agi,
    maxHp,
    visual: cow,
  };
}

/** Costruisce il combattente del Pastore avversario. */
export function buildOpponentFighter(p: Pastore): Fighter {
  const { strength, resistance, agility } = p.cowStats;
  const maxHp = Math.round(90 + resistance * 0.9 + p.cowLevel * 6);
  return {
    name: p.cowName,
    breed: p.cowBreed,
    level: p.cowLevel,
    atk: clamp(strength),
    def: clamp(resistance),
    agi: clamp(agility),
    maxHp,
    visual: { name: p.cowName, breed: p.cowBreed, rarity: "Epica", realPhoto: null },
  };
}

export interface DamageResult {
  dmg: number;
  missed: boolean;
  crit: boolean;
}

/**
 * Calcola il danno di una mossa d'attacco.
 * @param defending il difensore ha usato "Difesa" il turno scorso (danno dimezzato)
 * @param buffed l'attaccante ha caricato "Sguardo Regale" (danno potenziato)
 */
export function computeDamage(
  attacker: Fighter,
  defender: Fighter,
  move: Move,
  defending: boolean,
  buffed: boolean,
): DamageResult {
  if (move.kind !== "attack") return { dmg: 0, missed: false, crit: false };
  if (Math.random() > move.accuracy) return { dmg: 0, missed: true, crit: false };

  const variance = 0.85 + Math.random() * 0.3;
  const crit = Math.random() < 0.12;
  let base = attacker.atk * move.power - defender.def * 0.35;
  base *= variance;
  if (buffed) base *= 1.35;
  if (crit) base *= 1.5;
  if (defending) base *= 0.5;
  return { dmg: Math.max(5, Math.round(base)), missed: false, crit };
}

/** Scelta della mossa dell'IA avversaria (semplice, con un po' di varietà). */
export function pickOpponentMove(oppHpRatio: number): Move {
  const r = Math.random();
  // se ferito, più probabilità di difendersi
  if (oppHpRatio < 0.35 && r < 0.4) return MOVES.find(m => m.id === "difesa")!;
  if (r < 0.2) return MOVES.find(m => m.id === "sguardo")!;
  if (r < 0.35) return MOVES.find(m => m.id === "difesa")!;
  if (r < 0.7) return MOVES.find(m => m.id === "spallata")!;
  return MOVES.find(m => m.id === "incornata")!;
}
