export type RarityType = 'Comune' | 'Rara' | 'Epica' | 'Leggendaria';

export interface Vatsamon {
  id: string;
  breed: string;
  name: string;
  stats: {
    strength: number;
    defense: number;
    agility: number;
  };
  rarity: RarityType;
  eco_tip: string;
  lore: string;
  imageUrl?: string; // Optional custom analyzed image preview or base64 URL
  capturedAt: string;
  customColor?: string; // To add extra visual flair to specific generated cows
  cp: number; // Combat Power
  level: number; // Current Level (Power Up)
}

export interface Hotspot {
  id: string;
  name: string;
  valley: string;
  x: number; // Percent value for positioning on visual SVG map
  y: number; // Percent value for positioning
  lat?: number;
  lng?: number;
  difficulty: 'Facile' | 'Medio' | 'Difficile';
  description: string;
  activeEncounter?: Vatsamon;
}

export interface BackpackItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  type: 'ball' | 'candy' | 'food' | 'potion';
}

export interface Egg {
  id: string;
  rarity: RarityType;
  kmWalked: number;
  kmRequired: number;
  isIncubating: boolean;
}

export interface Trainer {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  capturedCount: number;
  kmTraveled: number;
  coins: number;
}

export interface BattleState {
  playerVatsamon: Vatsamon | null;
  opponentVatsamon: Vatsamon | null;
  playerHp: number;
  opponentHp: number;
  playerMaxHp: number;
  opponentMaxHp: number;
  energy: number; // 0 to 100 for charging special attack
  opponentEnergy: number;
  status: 'idle' | 'intro' | 'active' | 'dodge' | 'special_anim' | 'ended';
  history: string[];
  winner: 'player' | 'opponent' | null;
  opponentStatsModifier: number;
  playerAttackAnim: boolean;
  opponentAttackAnim: boolean;
}
