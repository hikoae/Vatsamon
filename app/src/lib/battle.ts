import { Vatsamon, RarityType } from "../types";
import { Pastore } from "../data/opponents";
import { condizioneDaArp } from "./condizione";

/**
 * Modello del combattente e builder (giocatore / Pastore / avversaria reale).
 * Il motore di risoluzione è "La Spinta" (lib/spinta.ts): qui si preparano le
 * grandezze reali — PESO (kg), presa, volontà — senza tipi né mosse fantasy.
 * Gli avversari hanno STAT ASSOLUTE: allenare la propria Reina conta davvero
 * (niente più boss "elastici" scalati sul giocatore).
 */

export interface Fighter {
  name: string;
  breed: string;
  level: number;
  atk: number;   // → presa (leva di corna)
  def: number;   // → piccolo bonus di massa (allenamento)
  agi: number;   // → volontà/fiato
  peso: number;  // kg reali → massa nella Spinta
  visual: Pick<Vatsamon, "breed" | "rarity" | "realPhoto" | "name"> & { sightingPhotoId?: string };
}

function clamp(n: number, lo = 10, hi = 120) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/** Peso plausibile quando manca il dato reale (stima dalla stazza). */
function pesoStimato(stazza: number): number {
  return 480 + Math.round((stazza - 50) * 2.4);
}

/** Combattente del giocatore dalla sua Reina. */
export function buildPlayerFighter(cow: Vatsamon): Fighter {
  const s4 = cow.stats4;
  const atk = clamp(s4 ? s4.corna : cow.stats.strength);
  const def = clamp(s4 ? s4.testa : cow.stats.defense);
  // S18: nudge di condizione stagionale (Arp) — piccolo e cappato, su
  // fiato/volontà (spintatoreFromFighter deriva volonta = clamp(agi) e
  // fiatoMax = 100 + volonta). Solo il giocatore: mai gli avversari/boss.
  const agi = clamp((s4 ? s4.grinta : cow.stats.agility) + condizioneDaArp(cow.id));
  const stazza = s4 ? s4.stazza : cow.stats.defense;
  return {
    name: cow.name,
    breed: cow.breed,
    level: cow.level,
    atk,
    def,
    agi,
    peso: cow.peso_kg ?? pesoStimato(stazza),
    visual: cow,
  };
}

/** Combattente del Pastore avversario (allenamento libero sulla mappa). */
export function buildOpponentFighter(p: Pastore): Fighter {
  const { strength, resistance, agility } = p.cowStats;
  return {
    name: p.cowName,
    breed: p.cowBreed,
    level: p.cowLevel,
    atk: clamp(strength),
    def: clamp(resistance),
    agi: clamp(agility),
    peso: pesoStimato(resistance),
    visual: { name: p.cowName, breed: p.cowBreed, rarity: "Epica", realPhoto: null },
  };
}

/**
 * Avversaria d'arena/Lega ad ASSETTO ASSOLUTO: le sue forze derivano dalle SUE
 * statistiche reali (stats4/peso della Reina vera), non dalla Reina del
 * giocatore. `powerFactor` resta come modulatore di difficoltà del percorso
 * (0.88 arena facile → 1.31 campione di Bard), applicato alle stat proprie.
 */
export function buildScaledBoss(
  visual: Vatsamon,
  powerFactor: number,
  _rarity?: RarityType,
): Fighter {
  const s4 = visual.stats4 ?? {
    stazza: visual.stats.defense,
    corna: visual.stats.strength,
    testa: visual.stats.defense,
    grinta: visual.stats.agility,
  };
  const pf = powerFactor;
  const pesoBase = visual.peso_kg ?? pesoStimato(s4.stazza);
  return {
    name: visual.name,
    breed: visual.breed,
    level: visual.level,
    atk: clamp(s4.corna * pf),
    def: clamp(s4.testa * pf),
    agi: clamp(s4.grinta * pf),
    // il pf muove il peso della metà del suo effetto: una campionessa "pesa" di più
    peso: Math.round(pesoBase * (1 + (pf - 1) * 0.5)),
    visual,
  };
}
