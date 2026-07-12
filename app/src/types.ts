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

  // ===== Campi delle bovine REALI (Batailles de Reines) =====
  isReal?: boolean;
  realPhoto?: string | null; // URL foto reale (o null se senza foto)
  /** "Scatta la Reina": id della foto del giocatore in IndexedDB (SOLO su
   *  questo dispositivo; nel cloud viaggia solo l'id, mai l'immagine). */
  sightingPhotoId?: string;
  comune?: string;
  allevatore?: string;
  matricola?: string;
  riconoscimento?: string;
  /** FASE 3 — accuratezza 0..100 della Valutazione del Giudice all'affidamento. */
  valutazioneGiudice?: number;
  /** Spinte ufficiali vinte da questa Reina (palmares personale). */
  vittorie?: number;
  /** Désarpa: anno in cui è stata Reina di corne (fiori rossi) della mandria. */
  fioriRossi?: string;
  /** Désarpa: anno in cui è stata Reine du lait (fiori bianchi) della mandria. */
  fioriBianchi?: string;
  peso_kg?: number;
  pesoStimato?: boolean;
  lat?: number;
  lng?: number;
  // 4 statistiche reali dai pesi (oltre alle 3 di gioco)
  stats4?: { stazza: number; corna: number; testa: number; grinta: number };
  potenza?: number;
  // Illustrazione stile Pokémon (per nome o razza), risolta come URL statico.
  illustration?: string | null;
  // Campi extra opzionali importati da vatsamon (additivi, non rompono nulla).
  categoria?: string;
  attack?: number;
  defense4?: number;
  funFact?: string;

  // ===== Mosse della Spinta (data/mosse.ts) =====
  // Assenti nei salvataggi storici: il moveset default è deterministico
  // (mosseEquipaggiate), quindi nessuna migrazione è necessaria.
  mosse?: string[];        // equipaggiate (4, una per famiglia)
  mosseApprese?: string[]; // pool personale imparato (Scuola della Reina)

  // ===== Genealogia / Stalla (nati in stalla) =====
  bornInStalla?: boolean;
  stage?: 'moudzon' | 'manza' | 'giovenca' | 'reina';
  ageMonths?: number;
  geneticStats4?: { stazza: number; corna: number; testa: number; grinta: number };
  motherId?: string;
  fatherId?: string;
  fatherName?: string;
  generation?: number;
  lineTrait?: string;
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
  type: 'ball' | 'candy' | 'food' | 'potion' | 'buff';
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
  /** Valuta di prestigio: Forme di Fontina (si guadagnano vincendo le Leghe e
   *  facendo crescere le Reines; si spendono in riconoscimenti permanenti). */
  fontina?: number;
  /** Stelle di Pedigree acquistate con la Fontina (prestigio permanente). */
  pedigreeStars?: number;
  /** FASE 4 — Punteggio Rispetto (0..100), rispecchiato qui per la classifica cloud. */
  respectScore?: number;
}
