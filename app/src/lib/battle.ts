import { Vatsamon, RarityType } from "../types";
import { Pastore } from "../data/opponents";
import {
  BattleMove,
  VatsaType,
  cowType,
  cowMoveset,
  movesetForType,
  typeMultiplier,
} from "../data/combat";

/**
 * Motore di combattimento a turni "serio" (stile Pokémon):
 * tipi + efficacie, STAB, critici, varianza, mosse speciali ad Adrenalina,
 * difesa/cura/buff e oggetti dallo zaino. Usato da BattleTurnBased.
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

export interface DamageResult {
  dmg: number;
  missed: boolean;
  crit: boolean;
  mult: number; // efficacia di tipo applicata
}

/**
 * Calcola il danno di una mossa d'attacco/speciale.
 * @param defending il difensore ha usato una mossa "difesa" (danno dimezzato)
 * @param atkBuff bonus attacco accumulato dall'attaccante (in %, es. 35)
 * @param defBuff bonus difesa accumulato dal difensore (in %)
 */
export function computeDamage(
  attacker: Fighter,
  defender: Fighter,
  move: BattleMove,
  defending: boolean,
  atkBuff: number,
  defBuff: number,
): DamageResult {
  if (move.category !== "attacco" && move.category !== "speciale")
    return { dmg: 0, missed: false, crit: false, mult: 1 };
  if (Math.random() > move.accuracy) return { dmg: 0, missed: true, crit: false, mult: 1 };

  const mult = typeMultiplier(move.type, defender.type);
  const stab = move.type === attacker.type ? 1.15 : 1; // bonus tipo coerente
  // Varianza ampia (±28%) e crit più frequente: rende gli scontri meno
  // deterministici (più "fun", come i range/crit di Pokémon).
  const variance = 0.72 + Math.random() * 0.56;
  const crit = Math.random() < 0.12;

  const atk = attacker.atk * (1 + atkBuff / 100);
  const def = defender.def * (1 + defBuff / 100);
  // Difesa a RAPPORTO (mitigazione %), non sottrattiva: scala morbida, niente
  // "gradino" in cui il danno crolla a zero (testato in simulazione).
  const DEF_K = 55;
  let base = atk * move.power * mult * stab * variance * (DEF_K / (DEF_K + def));
  if (crit) base *= 1.6;
  if (defending) base *= 0.5;
  return { dmg: Math.max(4, Math.round(base)), missed: false, crit, mult };
}

/** IA avversaria: sceglie una mossa in modo sensato dal proprio set. */
export function pickOpponentMove(
  opp: Fighter,
  oppHpRatio: number,
  oppEnergy: number,
): BattleMove {
  const set = opp.moveset;
  const special = set.find((m) => m.category === "speciale");
  const heal = set.find((m) => m.category === "cura");
  const defend = set.find((m) => m.category === "difesa");
  const buff = set.find((m) => m.category === "buff");
  const attacks = set.filter((m) => m.category === "attacco");
  const r = Math.random();

  // Speciale se carico
  if (special && oppEnergy >= special.energy && r < 0.85) return special;
  // Curarsi se molto ferito
  if (heal && oppHpRatio < 0.3 && r < 0.5) return heal;
  // Difendersi/buffarsi a volte
  if (defend && r < 0.18) return defend;
  if (buff && r < 0.3) return buff;
  // Altrimenti un attacco base
  return attacks[Math.floor(Math.random() * attacks.length)] || set[0];
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
