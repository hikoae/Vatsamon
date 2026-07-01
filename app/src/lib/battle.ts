import { Vatsamon, RarityType } from "../types";
import { Pastore } from "../data/opponents";
import {
  BattleMove,
  VatsaType,
  cowType,
  cowMoveset,
  movesetForType,
} from "../data/combat";

/**
 * Modello del combattente e builder (giocatore / Pastore / boss scalato).
 * Il motore di risoluzione vivo è "La Spinta" (lib/spinta.ts), che deriva lo
 * Spintatore da questo Fighter; il vecchio motore a danno/HP è stato rimosso.
 */

export interface Fighter {
  name: string;
  breed: string;
  level: number;
  atk: number;
  def: number;
  agi: number;
  maxHp: number;
  type: VatsaType;
  moveset: BattleMove[];
  visual: Pick<Vatsamon, "breed" | "rarity" | "realPhoto" | "name">;
}

function clamp(n: number, lo = 10, hi = 120) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/** Combattente del giocatore dalla sua Reina. */
export function buildPlayerFighter(cow: Vatsamon): Fighter {
  const s4 = cow.stats4;
  const atk = clamp(s4 ? s4.corna : cow.stats.strength);
  const def = clamp(s4 ? s4.testa : cow.stats.defense);
  const agi = clamp(s4 ? s4.grinta : cow.stats.agility);
  const stazza = s4 ? s4.stazza : cow.stats.defense;
  const peso = cow.peso_kg ?? 600;
  const maxHp = Math.round(150 + stazza * 0.8 + peso / 12 + cow.level * 5);
  return {
    name: cow.name,
    breed: cow.breed,
    level: cow.level,
    atk,
    def,
    agi,
    maxHp,
    type: cowType(cow),
    moveset: cowMoveset(cow),
    visual: cow,
  };
}

/** Combattente del Pastore avversario (sintetizza una Reina avversaria). */
export function buildOpponentFighter(p: Pastore): Fighter {
  const { strength, resistance, agility, spirit } = p.cowStats;
  const fakeCow: Vatsamon = {
    id: p.id,
    breed: p.cowBreed,
    name: p.cowName,
    stats: { strength, defense: resistance, agility },
    stats4: { stazza: resistance, corna: strength, testa: spirit, grinta: agility },
    rarity: "Epica",
    eco_tip: "",
    lore: "",
    capturedAt: "",
    cp: 0,
    level: p.cowLevel,
  };
  const maxHp = Math.round(130 + resistance * 1.0 + p.cowLevel * 7);
  return {
    name: p.cowName,
    breed: p.cowBreed,
    level: p.cowLevel,
    atk: clamp(strength),
    def: clamp(resistance),
    agi: clamp(agility),
    maxHp,
    type: cowType(fakeCow),
    moveset: cowMoveset(fakeCow),
    visual: { name: p.cowName, breed: p.cowBreed, rarity: "Epica", realPhoto: null },
  };
}

/**
 * Boss d'Arena SCALATO sulla Reina del giocatore (rubber-band): il boss vale
 * `powerFactor` volte la Reina con cui combatti, e ha il TIPO tematico dell'arena.
 * Così la sfida è sempre "giusta" (mai impossibile né banale) e la strategia sta
 * nel portare una Reina di tipo vincente contro il tipo dell'arena.
 * powerFactor < 1 = più facile della tua Reina; > 1 = più forte.
 */
export function buildScaledBoss(
  reference: Fighter,
  visual: Vatsamon,
  type: VatsaType,
  powerFactor: number,
  rarity: RarityType,
): Fighter {
  const pf = powerFactor;
  return {
    name: visual.name,
    breed: visual.breed,
    level: visual.level,
    atk: clamp(reference.atk * pf),
    def: clamp(reference.def * (0.9 + (pf - 1) * 0.5)),
    agi: reference.agi,
    maxHp: Math.round(reference.maxHp * pf),
    type,
    moveset: movesetForType(type, rarity),
    visual,
  };
}
