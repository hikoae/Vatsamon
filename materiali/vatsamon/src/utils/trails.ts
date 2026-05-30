/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Cow {
  id: string;
  name: string; // nickname given by the user
  breed: string; // Pezzata Rossa, Pezzata Nera etc.
  rarity: 'Comune' | 'Rara' | 'Leggendaria';
  level: number;
  xp: number;
  weight: number;
  milkProduction: number; // liters/day
  capturedAt: string;
  capturedLocation: string;
  combatStats: {
    strength: number;
    resistance: number;
    agility: number;
    spirit: number;
  };
  customPhoto?: string; // base64 or path
  description: string;
  funFact: string;
  safeDistanceEvaluation?: string;
}

export interface TrailPoint {
  lat: number;
  lng: number;
}

export interface Landmark {
  name: string;
  lat: number;
  lng: number;
  iconEmoji: string;
}

export interface ValdostanTrail {
  id: string;
  name: string;
  location: string;
  difficulty: 'Facile' | 'Moderato' | 'Difficile';
  lengthKm: number;
  durationHours: number;
  altitudeGain: number;
  description: string;
  responsibleTips: string[];
  cowsToEncounter: string[];
  center: TrailPoint;
  zoom: number;
  trailPoints: TrailPoint[];
  landmarks: Landmark[];
  pasture: {
    lat: number;
    lng: number;
    name: string;
  };
}

export const VALDOSTANO_TRAILS: ValdostanTrail[] = [
  {
    id: 'trail-15',
    name: 'Sentiero 15: Cogne - Rifugio Vittorio Sella',
    location: 'Gran Paradiso (Cogne)',
    difficulty: 'Moderato',
    lengthKm: 12.4,
    durationHours: 4.5,
    altitudeGain: 950,
    description: 'Stupenda escursione nell\'antico bacino reale di caccia del Gran Paradiso. Si attraversano pascoli alpini lussureggianti dove pascolano le Castane e le Pezzate Rosse.',
    responsibleTips: [
      'Mantieni una distanza minima di 5 metri dalle mucche.',
      'Non toccare i vitellini: le madri sono molto protettive.',
      'Chiudi sempre i cancelli di legno dei recinti dei pascoli per evitare che il bestiame si disperda.',
      'Cammina lungo il sentiero tracciato senza calpestare l\'erba da sfalcio.'
    ],
    cowsToEncounter: ['Castana Valdostana', 'Pezzata Rossa Valdostana'],
    center: { lat: 45.6025, lng: 7.3150 },
    zoom: 13,
    trailPoints: [
      { lat: 45.5888, lng: 7.3418 },
      { lat: 45.5925, lng: 7.3312 },
      { lat: 45.5971, lng: 7.3185 },
      { lat: 45.6023, lng: 7.3045 },
      { lat: 45.6045, lng: 7.2941 },
      { lat: 45.6025, lng: 7.2881 }
    ],
    landmarks: [
      { name: 'Valnontey 🅿️ (Inizio)', lat: 45.5888, lng: 7.3418, iconEmoji: '🚗' },
      { name: 'Alpeggio d\'Herbetet 🥛', lat: 45.5971, lng: 7.3185, iconEmoji: '🥛' },
      { name: 'Rifugio Vittorio Sella 🏔️', lat: 45.6025, lng: 7.2881, iconEmoji: '🏡' }
    ],
    pasture: { lat: 45.5971, lng: 7.3185, name: "Alpeggio dell'Herbetet" }
  },
  {
    id: 'trail-1',
    name: 'Sentiero 1: Courmayeur - Rifugio Elena',
    location: 'Val Ferret',
    difficulty: 'Facile',
    lengthKm: 8.5,
    durationHours: 3.0,
    altitudeGain: 420,
    description: 'Immerso nella splendida Val Ferret con vedute mozzafiato sulle Grandes Jorasses. I pascoli pianeggianti ospitano splendidi stormi di Pezzata Nera Valdostana.',
    responsibleTips: [
      'Non urlare o fare movimenti bruschi nei pressi della mandria.',
      'Se porti un cane, mantienilo rigorosamente al guinzaglio corto.',
      'Non lanciare pietre o bastoni per allontanare le mucche.',
      'Riporta sempre a valle i tuoi rifiuti.'
    ],
    cowsToEncounter: ['Pezzata Nera Valdostana', 'Pezzata Rossa Valdostana'],
    center: { lat: 45.8430, lng: 7.0660 },
    zoom: 14,
    trailPoints: [
      { lat: 45.8368, lng: 7.0535 },
      { lat: 45.8415, lng: 7.0601 },
      { lat: 45.8453, lng: 7.0707 },
      { lat: 45.8480, lng: 7.0760 },
      { lat: 45.8492, lng: 7.0792 }
    ],
    landmarks: [
      { name: 'Arp Nouvaz (Inizio 🥾)', lat: 45.8368, lng: 7.0535, iconEmoji: '🥾' },
      { name: 'Alpe Pré de Bar 🥛', lat: 45.8453, lng: 7.0707, iconEmoji: '🥛' },
      { name: 'Rifugio Elena 🏔️', lat: 45.8492, lng: 7.0792, iconEmoji: '🏡' }
    ],
    pasture: { lat: 45.8453, lng: 7.0707, name: "Alpe Pré de Bar" }
  },
  {
    id: 'trail-10',
    name: 'Sentiero 10: Gressoney-La-Trinité - Lago Gabiet',
    location: 'Valle del Lys (Monte Rosa)',
    difficulty: 'Difficile',
    lengthKm: 10.2,
    durationHours: 5.0,
    altitudeGain: 880,
    description: 'Salita spettacolare sotto l\'imponente massiccio del Monte Rosa. Si passa per antichi insediamenti Walser e ricchi pascoli fioriti dominati dalla rustica Bruna Alpina.',
    responsibleTips: [
      'Le mucche al pascolo stanno lavorando per produrre il latte della Fontina DOP: lasciale mangiare in pace.',
      'Segui i consigli dei pastori se ti trovi ad attraversare una mandria in transito.',
      'Non scavalcare i recinti elettrificati per il bestiame.',
      'Rispetta il silenzio della montagna.'
    ],
    cowsToEncounter: ['Bruna Alpina', 'Castana Valdostana'],
    center: { lat: 45.8400, lng: 7.8380 },
    zoom: 13,
    trailPoints: [
      { lat: 45.8471, lng: 7.8228 },
      { lat: 45.8425, lng: 7.8320 },
      { lat: 45.8385, lng: 7.8425 },
      { lat: 45.8351, lng: 7.8491 },
      { lat: 45.8340, lng: 7.8540 }
    ],
    landmarks: [
      { name: 'Staffal 🚠 (Inizio)', lat: 45.8471, lng: 7.8228, iconEmoji: '🚠' },
      { name: 'Alpeggio Gabiet 🥛', lat: 45.8351, lng: 7.8491, iconEmoji: '🥛' },
      { name: 'Rifugio Gabiet 🏔️', lat: 45.8340, lng: 7.8540, iconEmoji: '🏡' }
    ],
    pasture: { lat: 45.8351, lng: 7.8491, name: "Alpeggio Gabiet" }
  }
];

export const INITIAL_VATSADEX: Cow[] = [
  {
    id: 'pre-captured-1',
    name: 'Bimba',
    breed: 'Pezzata Rossa Valdostana',
    rarity: 'Comune',
    level: 3,
    xp: 40,
    weight: 620,
    milkProduction: 24,
    capturedAt: '2026-05-28',
    capturedLocation: 'Val Ferret (Sentiero 1)',
    combatStats: {
      strength: 48,
      resistance: 54,
      agility: 42,
      spirit: 50,
    },
    customPhoto: '/src/assets/images/pezzata_rossa.png',
    description: 'La Pezzata Rossa Valdostana è una razza bovina autoctona a duplice attitudine (latte e carne). Nota per la straordinaria robustezza e capacità di adattamento alle dure condizioni d\'alpeggio della Valle d\'Aosta.',
    funFact: 'Questa razza ha origini antichissime e fu introdotta dai Burgundi nel V secolo. È capace di camminare sui sentieri più ripidi fino a oltre 2500m di quota per pascolare l\'erba fiorita più nutriente.',
  }
];

export const DEMO_COWS = [
  {
    id: 'demo-rossa',
    breed: 'Pezzata Rossa Valdostana',
    hint: 'pezzata rossa',
    imagePath: '/src/assets/images/pezzata_rossa.png',
    displayName: 'Pezzata Rossa 🔴',
    pasture: 'Alpeggio di Tsan',
    iconEmoji: '🐄'
  },
  {
    id: 'demo-nera',
    breed: 'Pezzata Nera Valdostana',
    hint: 'pezzata nera',
    imagePath: '/src/assets/images/pezzata_nera.png',
    displayName: 'Pezzata Nera ⚫',
    pasture: 'Pascoli di Malatrà',
    iconEmoji: '🐄'
  },
  {
    id: 'demo-castana',
    breed: 'Castana Valdostana',
    hint: 'castana',
    imagePath: '/src/assets/images/castana.png',
    displayName: 'Castana Valdostana 🟤',
    pasture: 'Cogne Herbetet',
    iconEmoji: '🐃'
  },
  {
    id: 'demo-bruna',
    breed: 'Bruna Alpina',
    hint: 'bruna',
    imagePath: '', // fallback simulation
    displayName: 'Bruna Alpina 🔔',
    pasture: 'Lago Gabiet',
    iconEmoji: '🐃'
  },
  {
    id: 'demo-strana',
    breed: 'Animale Ignoto (Vespe)',
    hint: 'non e una mucca',
    imagePath: '',
    displayName: 'Teschio o Oggetto Ignoto ❌',
    pasture: 'Sentiero Errato',
    iconEmoji: '🐝'
  }
];

// Achievements for goals/activities
export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt?: string;
  icon: string;
}

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'ach-1', title: 'Primo Incontro', description: 'Cattura la prima mucca e completa la sua foto.', icon: '📸', unlockedAt: '2026-05-28' },
  { id: 'ach-2', title: 'Passi Responsabili', description: 'Simula 500 metri di camminata sui sentieri della Valle.', icon: '🥾' },
  { id: 'ach-3', title: 'Reina d\'Alpeggio', description: 'Vinci il tuo primo combattimento amichevole a Bataille de Reines.', icon: '👑' },
  { id: 'ach-4', title: 'Esperto di Fontina', description: 'Rispondi correttamente a 3 domande della Scuola d\'Alpeggio.', icon: '🧀' }
];
