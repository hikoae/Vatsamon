import { Vatsamon } from "../types";
import { VatsaType } from "./combat";
import { REAL_COWS } from "./realCows";

/**
 * Arene (Palestre) della Valle d'Aosta per il combattimento a turni.
 * Portate da `materiali/vatsamon_arene`: ogni arena ha un boss, un livello
 * richiesto, una medaglia con bonus permanente e bonus ambientali.
 * I BOSS sono vere Reines Epiche/Leggendarie del nostro dataset, scalate.
 */
export type ArenaId = "cogne" | "gran_paradiso" | "fenis" | "morgex";

export interface Arena {
  id: ArenaId;
  name: string;
  difficulty: "Facile" | "Medio" | "Difficile" | "Leggendario";
  requiredLevel: number;
  cp: number;
  badgeName: string;
  badgeEmoji: string;
  bonusDesc: string;
  /** classi gradient per lo sfondo dell'arena */
  bgGradient: string;
  /** colore dominante (per pattern/accenti) */
  accent: string;
  introMsg: string;
  /** rarità preferita per scegliere il boss reale */
  preferRarity: "Epica" | "Leggendaria";
  /** Fattore di potenza del boss rispetto alla Reina del giocatore (rubber-band).
   *  <1 = più facile, >1 = più forte. */
  powerFactor: number;
  /** Tipo tematico del boss (la sfida strategica: portagli il tipo che lo batte). */
  bossType: VatsaType;
}

export const ARENAS: Arena[] = [
  {
    id: "cogne",
    powerFactor: 0.88,
    bossType: "prato",
    name: "Palestra dei Prati di Cogne 🌸",
    difficulty: "Facile",
    requiredLevel: 1,
    cp: 850,
    badgeName: "Medaglia Flora",
    badgeEmoji: "🌸",
    bonusDesc: "I Sorsi di Latte curano il +25% di HP in ogni battaglia.",
    bgGradient: "from-emerald-900/50 to-slate-950",
    accent: "#10b981",
    introMsg: "🌸 Prati di Sant'Orso a Cogne: la brezza alpina infonde forza alle mosse rigenerative.",
    preferRarity: "Epica",
  },
  {
    id: "gran_paradiso",
    powerFactor: 0.98,
    bossType: "tempesta",
    name: "Palestra del Ghiacciaio ❄️",
    difficulty: "Medio",
    requiredLevel: 2,
    cp: 1550,
    badgeName: "Medaglia Ghiacciaio",
    badgeEmoji: "❄️",
    bonusDesc: "+25% di Punti Esperienza (XP) da qualsiasi attività.",
    bgGradient: "from-sky-900/50 to-slate-950",
    accent: "#38bdf8",
    introMsg: "❄️ Ghiacciaio del Gran Paradiso: l'aria sottile rinvigorisce energia e determinazione iniziali.",
    preferRarity: "Leggendaria",
  },
  {
    id: "fenis",
    powerFactor: 1.06,
    bossType: "roccia",
    name: "Palestra del Castello di Fénis 🏰",
    difficulty: "Difficile",
    requiredLevel: 3,
    cp: 2350,
    badgeName: "Medaglia Fortezza",
    badgeEmoji: "🏰",
    bonusDesc: "+15% di difesa passiva permanente in tutti gli scontri.",
    bgGradient: "from-amber-900/50 to-slate-950",
    accent: "#f59e0b",
    introMsg: "🏰 Arena del Castello di Fénis: le massicce mura di pietra riducono i danni subiti.",
    preferRarity: "Epica",
  },
  {
    id: "morgex",
    powerFactor: 1.16,
    bossType: "corna",
    name: "Palestra dei Vigneti di Morgex 🍇",
    difficulty: "Leggendario",
    requiredLevel: 4,
    cp: 3600,
    badgeName: "Medaglia Vigneto",
    badgeEmoji: "🍇",
    bonusDesc: "+15% di probabilità di evasione automatica permanente.",
    bgGradient: "from-purple-900/50 to-slate-950",
    accent: "#a855f7",
    introMsg: "🍇 Vigneti eroici di Morgex: le coltivazioni d'alta quota aumentano l'evasione naturale.",
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
 * Sceglie la vera Reina boss per un'arena (deterministico per arena),
 * scalata al livello del giocatore. Ritorna un Vatsamon "boss".
 */
export function arenaBoss(arena: Arena, playerLevel: number): Vatsamon {
  const pool = bossPool(arena.preferRarity);
  const fallback = REAL_COWS.filter((c) => c.rarity === "Epica" || c.rarity === "Leggendaria");
  const list = pool.length ? pool : (fallback.length ? fallback : REAL_COWS);
  // indice stabile per arena per avere boss diversi tra le palestre
  const idx = ARENAS.findIndex((a) => a.id === arena.id);
  const base = list[idx % list.length];

  const oppPowerMult = 1.05 + playerLevel * 0.08;
  const bossLevel = Math.max(12, playerLevel + 2);
  return {
    ...base,
    id: `boss-${arena.id}`,
    level: bossLevel,
    cp: Math.floor(arena.cp * oppPowerMult),
    // potenzia un po' le stat di gioco per il ruolo da boss
    stats: {
      strength: Math.floor(45 + arena.cp * 0.02),
      defense: Math.floor(40 + arena.cp * 0.015),
      agility: Math.floor(35 + arena.cp * 0.01),
    },
  };
}
