/**
 * DUNGEON "Lega delle Reines" — i CASTELLI valdostani come sfide endgame.
 * Ogni dungeon è un gauntlet di 5 battaglie consecutive (4 sfidanti + 1 Campione)
 * con difficoltà crescente. L'allenatore schiera una SQUADRA DI 4 Reines; gli HP
 * si trascinano tra una battaglia e l'altra (si curano solo con gli oggetti).
 * Se tutte e 4 le Reines vanno KO, la sfida fallisce e va rifatta da capo.
 * Ricompense alte: monete, oggetti rari e una medaglia élite.
 */
import { VatsaType } from "./combat";

export interface DungeonOpponent {
  name: string;
  title: string;
  type: VatsaType;
  rarity: "Epica" | "Leggendaria";
  /** Potenza relativa alla squadra del giocatore (rubber-band). Cresce verso il Campione. */
  powerFactor: number;
}

export interface DungeonReward {
  id: string;
  qty: number;
  label: string;
}

export interface Dungeon {
  id: string;
  name: string;     // es. "Castello di Verrès"
  league: string;   // es. "Lega di Verrès"
  emoji: string;
  blurb: string;
  lat: number;
  lng: number;
  reqLevel: number;
  accent: string;   // hex
  rewardCoins: number;
  rewardXp: number;
  rewardItems: DungeonReward[];
  badgeName: string;
  badgeEmoji: string;
  opponents: DungeonOpponent[]; // 5: 4 sfidanti + Campione (ultimo)
}

// Genera 5 avversari (4 sfidanti + Campione) con tipi vari e potenza crescente.
// `bump` alza la difficoltà dell'intero dungeon (castelli più avanzati).
function gauntlet(
  names: [string, string][],
  types: [VatsaType, VatsaType, VatsaType, VatsaType, VatsaType],
  bump: number,
): DungeonOpponent[] {
  const pf = [0.92, 1.0, 1.08, 1.16, 1.3].map((x) => +(x + bump).toFixed(2));
  return names.map(([name, title], i) => ({
    name,
    title,
    type: types[i],
    rarity: i === 4 ? "Leggendaria" : i >= 2 ? "Leggendaria" : "Epica",
    powerFactor: pf[i],
  }));
}

export const DUNGEONS: Dungeon[] = [
  {
    id: "verres",
    name: "Castello di Verrès",
    league: "Lega di Verrès",
    emoji: "🏯",
    blurb: "Il severo cubo di pietra di Ibleto di Challant. La prima vera prova da Lega.",
    lat: 45.666, lng: 7.687,
    reqLevel: 8,
    accent: "#d97706",
    rewardCoins: 800, rewardXp: 900,
    rewardItems: [
      { id: "item-bell-iper", qty: 2, label: "Iper Vatsa-ball ×2" },
      { id: "item-potion-fontina", qty: 3, label: "Fetta di Fontina ×3" },
    ],
    badgeName: "Sigillo di Verrès", badgeEmoji: "🏯",
    opponents: gauntlet(
      [["Iblèto", "Castellano"], ["Greta", "Armigera"], ["Renzo", "Balestriere"], ["Donna Bona", "Dama del maniero"], ["BLANCHE", "Campionessa di Verrès"]],
      ["roccia", "corna", "tempesta", "latte", "corna"],
      0,
    ),
  },
  {
    id: "sarre",
    name: "Castello Reale di Sarre",
    league: "Lega Reale di Sarre",
    emoji: "👑",
    blurb: "La residenza di caccia dei Savoia: galleria di corna reali e nobiltà bovina.",
    lat: 45.719, lng: 7.258,
    reqLevel: 10,
    accent: "#e11d48",
    rewardCoins: 1100, rewardXp: 1200,
    rewardItems: [
      { id: "item-buff-genepy", qty: 3, label: "Genepy del Pastore ×3" },
      { id: "item-buff-bell", qty: 3, label: "Campanaccio Fortunato ×3" },
    ],
    badgeName: "Corona Reale", badgeEmoji: "👑",
    opponents: gauntlet(
      [["Vittorio", "Cacciatore reale"], ["Elena", "Castellana"], ["Umberto", "Cavaliere"], ["Margherita", "Regina dei pascoli"], ["VICTOIRE", "Campionessa Reale"]],
      ["latte", "prato", "roccia", "tempesta", "latte"],
      0.04,
    ),
  },
  {
    id: "fenis",
    name: "Castello di Fénis",
    league: "Lega di Fénis",
    emoji: "🏰",
    blurb: "La fortezza-manifesto dei Challant, con le sue mura e torri concentriche.",
    lat: 45.7411, lng: 7.4936,
    reqLevel: 12,
    accent: "#f59e0b",
    rewardCoins: 1500, rewardXp: 1600,
    rewardItems: [
      { id: "item-bell-master", qty: 1, label: "Master Vatsa-ball ×1" },
      { id: "item-potion-fontina", qty: 4, label: "Fetta di Fontina ×4" },
    ],
    badgeName: "Stemma di Fénis", badgeEmoji: "🏰",
    opponents: gauntlet(
      [["Bonifacio", "Visconte"], ["Aymon", "Comandante"], ["Caterina", "Sentinella"], ["Amedeo", "Maestro d'armi"], ["GLORIEUSE", "Campionessa di Fénis"]],
      ["corna", "roccia", "prato", "tempesta", "roccia"],
      0.08,
    ),
  },
  {
    id: "issogne",
    name: "Castello di Issogne",
    league: "Lega di Issogne",
    emoji: "🌳",
    blurb: "Il raffinato cortile col melograno in ferro battuto: eleganza e scatto fulmineo.",
    lat: 45.659, lng: 7.689,
    reqLevel: 14,
    accent: "#10b981",
    rewardCoins: 2000, rewardXp: 2100,
    rewardItems: [
      { id: "item-bell-master", qty: 1, label: "Master Vatsa-ball ×1" },
      { id: "item-buff-genepy", qty: 4, label: "Genepy del Pastore ×4" },
      { id: "item-energy-grappa", qty: 3, label: "Grappa alla Genziana ×3" },
    ],
    badgeName: "Melograno d'Acciaio", badgeEmoji: "🌳",
    opponents: gauntlet(
      [["Giorgio", "Giardiniere d'armi"], ["Bianca", "Affreschista"], ["Mendoza", "Mercante"], ["Sciampagna", "Buffone di corte"], ["TORMENTA", "Campionessa di Issogne"]],
      ["prato", "tempesta", "latte", "corna", "tempesta"],
      0.12,
    ),
  },
  {
    id: "bard",
    name: "Forte di Bard",
    league: "Gran Lega del Forte di Bard",
    emoji: "🛡️",
    blurb: "La rocca inespugnabile che fermò Napoleone: la sfida suprema dell'endgame.",
    lat: 45.609, lng: 7.745,
    reqLevel: 18,
    accent: "#64748b",
    rewardCoins: 3500, rewardXp: 3500,
    rewardItems: [
      { id: "item-bell-master", qty: 2, label: "Master Vatsa-ball ×2" },
      { id: "item-potion-fontina", qty: 6, label: "Fetta di Fontina ×6" },
      { id: "item-buff-bell", qty: 5, label: "Campanaccio Fortunato ×5" },
    ],
    badgeName: "Corona del Forte", badgeEmoji: "👑",
    opponents: gauntlet(
      [["Sergente Bard", "Guardia del forte"], ["Capitano Hudson", "Ufficiale"], ["Maggiore Vittoria", "Stratega"], ["Colonnello Ferrata", "Veterano"], ["VEDETTE", "Gran Campionessa del Forte"]],
      ["roccia", "corna", "tempesta", "prato", "roccia"],
      0.16,
    ),
  },
];
