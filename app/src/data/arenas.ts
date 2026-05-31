import { Vatsamon } from "../types";
import { VatsaType } from "./combat";
import { REAL_COWS } from "./realCows";

/**
 * Palestre (Gym) della Valle d'Aosta, piazzate sugli ALPEGGI reali — dove
 * vivono davvero le Reines. Ogni palestra ha un boss di un TIPO tematico, una
 * medaglia e una difficoltà crescente. Il boss è SCALATO sulla Reina del
 * giocatore (rubber-band, vedi buildScaledBoss): sfida sempre giusta, la
 * strategia sta nel portare il tipo che batte quello dell'alpeggio.
 * I CASTELLI non sono più palestre: sono diventati i Dungeon endgame.
 */
export type ArenaId =
  | "herbetet" | "money" | "gabiet" | "predebar" | "nivolet" | "tsatsan";

export interface Arena {
  id: ArenaId;
  name: string;
  difficulty: "Facile" | "Medio" | "Difficile" | "Leggendario";
  requiredLevel: number;
  cp: number;
  badgeName: string;
  badgeEmoji: string;
  bonusDesc: string;
  bgGradient: string;
  accent: string;
  introMsg: string;
  preferRarity: "Epica" | "Leggendaria";
  /** Fattore di potenza del boss rispetto alla Reina del giocatore (rubber-band). */
  powerFactor: number;
  /** Tipo tematico del boss (portagli il tipo che lo batte). */
  bossType: VatsaType;
}

export const ARENAS: Arena[] = [
  {
    id: "herbetet",
    powerFactor: 0.88,
    bossType: "prato",
    name: "Alpeggio dell'Herbetet 🌼",
    difficulty: "Facile",
    requiredLevel: 1,
    cp: 850,
    badgeName: "Medaglia Herbetet",
    badgeEmoji: "🌼",
    bonusDesc: "Pascoli fioriti di Valnontey: il tuo primo banco di prova.",
    bgGradient: "from-emerald-900/50 to-slate-950",
    accent: "#10b981",
    introMsg: "🌼 Erba grassa e fiori alpini dell'Herbetet (Cogne): qui la boss è di tipo Prato 🌿.",
    preferRarity: "Epica",
  },
  {
    id: "money",
    powerFactor: 0.96,
    bossType: "latte",
    name: "Alpe Money 🥛",
    difficulty: "Medio",
    requiredLevel: 3,
    cp: 1400,
    badgeName: "Medaglia Money",
    badgeEmoji: "🥛",
    bonusDesc: "Alpeggio d'alta quota sopra Cogne: latte purissimo e Reines placide ma toste.",
    bgGradient: "from-purple-900/50 to-slate-950",
    accent: "#a78bfa",
    introMsg: "🥛 All'Alpe Money, regno del latte: la boss è di tipo Latte 🥛.",
    preferRarity: "Epica",
  },
  {
    id: "gabiet",
    powerFactor: 1.0,
    bossType: "tempesta",
    name: "Alpe Gabiet ⛈️",
    difficulty: "Medio",
    requiredLevel: 5,
    cp: 1900,
    badgeName: "Medaglia Gabiet",
    badgeEmoji: "⛈️",
    bonusDesc: "Lago e pascoli del Gabiet sotto il Monte Rosa: vento e fulmini Walser.",
    bgGradient: "from-sky-900/50 to-slate-950",
    accent: "#38bdf8",
    introMsg: "⛈️ Tra le tormente del Gabiet (Gressoney): la boss è di tipo Tempesta ⛈️.",
    preferRarity: "Leggendaria",
  },
  {
    id: "predebar",
    powerFactor: 1.06,
    bossType: "roccia",
    name: "Alpe Pré de Bar 🪨",
    difficulty: "Difficile",
    requiredLevel: 8,
    cp: 2500,
    badgeName: "Medaglia Pré de Bar",
    badgeEmoji: "🪨",
    bonusDesc: "Ai piedi delle Grandes Jorasses, in Val Ferret: Reines dure come il granito.",
    bgGradient: "from-amber-900/50 to-slate-950",
    accent: "#d97706",
    introMsg: "🪨 Morene e roccia del Pré de Bar (Val Ferret): la boss è di tipo Roccia 🪨.",
    preferRarity: "Epica",
  },
  {
    id: "nivolet",
    powerFactor: 1.1,
    bossType: "corna",
    name: "Gran Piano del Nivolet 🐂",
    difficulty: "Difficile",
    requiredLevel: 11,
    cp: 3000,
    badgeName: "Medaglia Nivolet",
    badgeEmoji: "🐂",
    bonusDesc: "L'altopiano selvaggio del Gran Paradiso (Valsavarenche): corna fiere e stambecchi.",
    bgGradient: "from-rose-900/50 to-slate-950",
    accent: "#e11d48",
    introMsg: "🐂 Sull'altopiano del Nivolet: la boss carica con corna possenti (tipo Corna 🐂).",
    preferRarity: "Leggendaria",
  },
  {
    id: "tsatsan",
    powerFactor: 1.14,
    bossType: "roccia",
    name: "Alpe Tsa de Tsan 🏔️",
    difficulty: "Leggendario",
    requiredLevel: 14,
    cp: 3600,
    badgeName: "Medaglia Tsa de Tsan",
    badgeEmoji: "🏔️",
    bonusDesc: "Alpeggio remoto della Valpelline, presso il lago di Place Moulin: la prova suprema.",
    bgGradient: "from-slate-800/60 to-slate-950",
    accent: "#64748b",
    introMsg: "🏔️ Nell'austero alpeggio di Tsa de Tsan (Valpelline): la boss è di tipo Roccia 🪨.",
    preferRarity: "Leggendaria",
  },
];

/** Pool di boss reali per rarità (con foto quando disponibile, ordinati per CP). */
function bossPool(rarity: "Epica" | "Leggendaria"): Vatsamon[] {
  const pool = REAL_COWS.filter((c) => c.rarity === rarity);
  const withPhoto = pool.filter((c) => c.realPhoto);
  const base = withPhoto.length ? withPhoto : pool;
  return [...base].sort((a, b) => b.cp - a.cp);
}

/**
 * Sceglie la vera Reina boss per una palestra (deterministico per arena),
 * scalata al livello del giocatore. Ritorna un Vatsamon "boss" (usato per la
 * grafica/nome; le statistiche effettive vengono dal rubber-band).
 */
export function arenaBoss(arena: Arena, playerLevel: number): Vatsamon {
  const pool = bossPool(arena.preferRarity);
  const fallback = REAL_COWS.filter((c) => c.rarity === "Epica" || c.rarity === "Leggendaria");
  const list = pool.length ? pool : (fallback.length ? fallback : REAL_COWS);
  const idx = ARENAS.findIndex((a) => a.id === arena.id);
  const base = list[idx % list.length];

  const oppPowerMult = 1.05 + playerLevel * 0.08;
  const bossLevel = Math.max(12, playerLevel + 2);
  return {
    ...base,
    id: `boss-${arena.id}`,
    level: bossLevel,
    cp: Math.floor(arena.cp * oppPowerMult),
    stats: {
      strength: Math.floor(45 + arena.cp * 0.02),
      defense: Math.floor(40 + arena.cp * 0.015),
      agility: Math.floor(35 + arena.cp * 0.01),
    },
  };
}
