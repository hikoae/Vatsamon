export type Razza =
  | "Castana"
  | "Pezzata Rossa"
  | "Pezzata Nera"
  | "Evolène"
  | "Sconosciuta";
export type Rarita = "Comune" | "Non comune" | "Rara" | "Epica" | "Leggendaria";

/** Le 4 statistiche reali (dai pesi/dati delle Batailles). */
export interface Stats {
  stazza: number; // ~HP
  corna: number; // ~Attacco
  testa: number; // ~Difesa
  grinta: number; // ~Agilità
}

export type Origine = "reale" | "generata" | "schiusa" | "manuale";

/**
 * Modello unico: vale sia per le 73 bovine REALI (con foto e dati veri) sia per
 * i Vazzamon GENERATI dallo scanner IA / uova (avatar procedurale, lore).
 */
export interface Vazzamon {
  id: string;
  nome: string;
  razza: Razza;
  tipo: string;
  categoria: string;
  rarita: Rarita;
  stelle: number;
  riconoscimento: string;
  comune: string;
  allevatore: string;
  matricola: string;
  peso_kg: number;
  peso_stimato: boolean;
  stats: Stats;
  potenza: number;
  /** path relativo es. "photos/ALLEGRA.jpg" (reali), oppure null */
  foto: string | null;
  /** immagine base64 caricata dallo scanner (generati) */
  imageUrl?: string;
  descrizione: string;
  lat: number;
  lng: number;
  zona_tipo: string;

  // --- campi di gioco ---
  origine: Origine;
  cp: number; // Combat Power
  level: number;
  eco_tip?: string;
  lore?: string;
  capturedAt?: string;
  /** colore avatar per i generati */
  customColor?: string;
}

/** Alias storico: il resto del codice usa "Bovina". */
export type Bovina = Vazzamon;

export interface Pascolo {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  comune: string;
}

export interface VazzadexFile {
  meta: Record<string, unknown>;
  bovine: Vazzamon[];
  pascoli: Pascolo[];
}

// ===== Tipi di gioco (da v2) =====
export interface BackpackItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  type: "ball" | "candy" | "food" | "potion";
}

export interface Egg {
  id: string;
  rarita: Rarita;
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

export interface Casera {
  id: string;
  name: string;
  comune: string;
  lat: number;
  lng: number;
}

// ===== etichette / colori statistiche =====
export const STAT_LABELS: Record<keyof Stats, string> = {
  stazza: "STAZZA",
  corna: "CORNA",
  testa: "TESTA",
  grinta: "GRINTA",
};

export const STAT_COLORS: Record<keyof Stats, string> = {
  stazza: "#3b82f6",
  corna: "#ef4444",
  testa: "#22c55e",
  grinta: "#eab308",
};
