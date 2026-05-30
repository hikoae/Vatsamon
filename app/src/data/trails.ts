/**
 * Sentieri reali della Valle d'Aosta (trekking responsabile).
 * Dati portati da vatsamon (`src/utils/trails.ts`) — solo dati, niente server.
 * Usati dall'overlay Leaflet sul tab mappa + pannello consigli responsabili.
 */
export interface TrailPoint {
  lat: number;
  lng: number;
}

export interface TrailLandmark {
  name: string;
  lat: number;
  lng: number;
  iconEmoji: string;
}

export interface ValdostanTrail {
  id: string;
  name: string;
  location: string;
  difficulty: "Facile" | "Moderato" | "Difficile";
  lengthKm: number;
  durationHours: number;
  altitudeGain: number;
  description: string;
  responsibleTips: string[];
  cowsToEncounter: string[];
  center: TrailPoint;
  zoom: number;
  trailPoints: TrailPoint[];
  landmarks: TrailLandmark[];
  pasture: { lat: number; lng: number; name: string };
}

export const VALDOSTAN_TRAILS: ValdostanTrail[] = [
  {
    id: "trail-15",
    name: "Sentiero 15: Cogne - Rifugio Vittorio Sella",
    location: "Gran Paradiso (Cogne)",
    difficulty: "Moderato",
    lengthKm: 12.4,
    durationHours: 4.5,
    altitudeGain: 950,
    description:
      "Stupenda escursione nell'antico bacino reale di caccia del Gran Paradiso. Si attraversano pascoli alpini lussureggianti dove pascolano le Castane e le Pezzate Rosse.",
    responsibleTips: [
      "Mantieni una distanza minima di 5 metri dalle mucche.",
      "Non toccare i vitellini: le madri sono molto protettive.",
      "Chiudi sempre i cancelli di legno dei recinti dei pascoli per evitare che il bestiame si disperda.",
      "Cammina lungo il sentiero tracciato senza calpestare l'erba da sfalcio.",
    ],
    cowsToEncounter: ["Castana Valdostana", "Pezzata Rossa Valdostana"],
    center: { lat: 45.6025, lng: 7.315 },
    zoom: 13,
    trailPoints: [
      { lat: 45.5888, lng: 7.3418 },
      { lat: 45.5925, lng: 7.3312 },
      { lat: 45.5971, lng: 7.3185 },
      { lat: 45.6023, lng: 7.3045 },
      { lat: 45.6045, lng: 7.2941 },
      { lat: 45.6025, lng: 7.2881 },
    ],
    landmarks: [
      { name: "Valnontey 🅿️ (Inizio)", lat: 45.5888, lng: 7.3418, iconEmoji: "🚗" },
      { name: "Alpeggio d'Herbetet 🥛", lat: 45.5971, lng: 7.3185, iconEmoji: "🥛" },
      { name: "Rifugio Vittorio Sella 🏔️", lat: 45.6025, lng: 7.2881, iconEmoji: "🏡" },
    ],
    pasture: { lat: 45.5971, lng: 7.3185, name: "Alpeggio dell'Herbetet" },
  },
  {
    id: "trail-1",
    name: "Sentiero 1: Courmayeur - Rifugio Elena",
    location: "Val Ferret",
    difficulty: "Facile",
    lengthKm: 8.5,
    durationHours: 3.0,
    altitudeGain: 420,
    description:
      "Immerso nella splendida Val Ferret con vedute mozzafiato sulle Grandes Jorasses. I pascoli pianeggianti ospitano splendidi capi di Pezzata Nera Valdostana.",
    responsibleTips: [
      "Non urlare o fare movimenti bruschi nei pressi della mandria.",
      "Se porti un cane, mantienilo rigorosamente al guinzaglio corto.",
      "Non lanciare pietre o bastoni per allontanare le mucche.",
      "Riporta sempre a valle i tuoi rifiuti.",
    ],
    cowsToEncounter: ["Pezzata Nera Valdostana", "Pezzata Rossa Valdostana"],
    center: { lat: 45.843, lng: 7.066 },
    zoom: 14,
    trailPoints: [
      { lat: 45.8368, lng: 7.0535 },
      { lat: 45.8415, lng: 7.0601 },
      { lat: 45.8453, lng: 7.0707 },
      { lat: 45.848, lng: 7.076 },
      { lat: 45.8492, lng: 7.0792 },
    ],
    landmarks: [
      { name: "Arp Nouvaz (Inizio 🥾)", lat: 45.8368, lng: 7.0535, iconEmoji: "🥾" },
      { name: "Alpe Pré de Bar 🥛", lat: 45.8453, lng: 7.0707, iconEmoji: "🥛" },
      { name: "Rifugio Elena 🏔️", lat: 45.8492, lng: 7.0792, iconEmoji: "🏡" },
    ],
    pasture: { lat: 45.8453, lng: 7.0707, name: "Alpe Pré de Bar" },
  },
  {
    id: "trail-10",
    name: "Sentiero 10: Gressoney-La-Trinité - Lago Gabiet",
    location: "Valle del Lys (Monte Rosa)",
    difficulty: "Difficile",
    lengthKm: 10.2,
    durationHours: 5.0,
    altitudeGain: 880,
    description:
      "Salita spettacolare sotto l'imponente massiccio del Monte Rosa. Si passa per antichi insediamenti Walser e ricchi pascoli fioriti dominati dalla rustica Bruna Alpina.",
    responsibleTips: [
      "Le mucche al pascolo stanno lavorando per produrre il latte della Fontina DOP: lasciale mangiare in pace.",
      "Segui i consigli dei pastori se ti trovi ad attraversare una mandria in transito.",
      "Non scavalcare i recinti elettrificati per il bestiame.",
      "Rispetta il silenzio della montagna.",
    ],
    cowsToEncounter: ["Bruna Alpina", "Castana Valdostana"],
    center: { lat: 45.84, lng: 7.838 },
    zoom: 13,
    trailPoints: [
      { lat: 45.8471, lng: 7.8228 },
      { lat: 45.8425, lng: 7.832 },
      { lat: 45.8385, lng: 7.8425 },
      { lat: 45.8351, lng: 7.8491 },
      { lat: 45.834, lng: 7.854 },
    ],
    landmarks: [
      { name: "Staffal 🚠 (Inizio)", lat: 45.8471, lng: 7.8228, iconEmoji: "🚠" },
      { name: "Alpeggio Gabiet 🥛", lat: 45.8351, lng: 7.8491, iconEmoji: "🥛" },
      { name: "Rifugio Gabiet 🏔️", lat: 45.834, lng: 7.854, iconEmoji: "🏡" },
    ],
    pasture: { lat: 45.8351, lng: 7.8491, name: "Alpeggio Gabiet" },
  },
];
