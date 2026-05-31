/**
 * Percorsi di trekking selezionabili (da `materiali/vatsamon_arene`).
 * Sostituiscono il singolo sentiero a 21 tappe: 3 grandi itinerari valdostani
 * con selettore. Le bovine reali, GPS, Casere e l'overlay sentieri T3 restano.
 */
export interface TrekRoute {
  id: string;
  name: string;
  description: string;
  difficulty: "Turistico" | "Escursionistico" | "Alpinistico";
  lengthKm: number;
  icon: string;
  accent: string; // chiave colore Tailwind: emerald | sky | amber
  /** Livello allenatore minimo per sbloccare il percorso (progressione). */
  reqLevel: number;
  coords: { lat: number; lng: number; name: string }[];
}

export const TREK_ROUTES: TrekRoute[] = [
  {
    id: "valnontey_sella",
    name: "Valnontey → Rifugio Vittorio Sella 🥾",
    description:
      "Il sentiero perfetto per iniziare: dal villaggio di Valnontey si sale dolcemente tra i pascoli reali del Gran Paradiso fino allo storico rifugio, regno di stambecchi e Reines al pascolo.",
    difficulty: "Turistico",
    lengthKm: 12,
    icon: "🥾",
    accent: "emerald",
    reqLevel: 1,
    coords: [
      { lat: 45.5888, lng: 7.3418, name: "Valnontey (Cogne) — partenza" },
      { lat: 45.5925, lng: 7.3312, name: "Ponte sul torrente" },
      { lat: 45.5971, lng: 7.3185, name: "Alpeggio dell'Herbetet 🥛" },
      { lat: 45.6023, lng: 7.3045, name: "Pian delle Marmotte" },
      { lat: 45.6025, lng: 7.2881, name: "Rifugio Vittorio Sella 🏔️" },
    ],
  },
  {
    id: "lago_gabiet",
    name: "Gressoney → Lago Gabiet (Walser) ⛰️",
    description:
      "Salita tra antichi insediamenti Walser sotto il massiccio del Monte Rosa, fino al lago alpino del Gabiet e ai pascoli della rustica Bruna Alpina.",
    difficulty: "Escursionistico",
    lengthKm: 10,
    icon: "🛶",
    accent: "sky",
    reqLevel: 4,
    coords: [
      { lat: 45.8471, lng: 7.8228, name: "Staffal (Gressoney-La-Trinité)" },
      { lat: 45.8425, lng: 7.832, name: "Pista di Sitten" },
      { lat: 45.8385, lng: 7.8425, name: "Pianalunga" },
      { lat: 45.8351, lng: 7.8491, name: "Alpeggio Gabiet 🥛" },
      { lat: 45.834, lng: 7.854, name: "Lago e Rifugio Gabiet 🏔️" },
    ],
  },
  {
    id: "alta_via_1",
    name: "Alta Via 1 (Sentiero dei Giganti) 🏔️",
    description:
      "Trek d'alta quota ai piedi delle cime leggendarie d'Europa: Cervino, Monte Rosa e Monte Bianco. Paesaggi celestiali e ascese eroiche.",
    difficulty: "Escursionistico",
    lengthKm: 120,
    icon: "🏔️",
    accent: "emerald",
    reqLevel: 6,
    coords: [
      { lat: 45.776, lng: 7.824, name: "Gressoney-Saint-Jean (Conca di Gressoney)" },
      { lat: 45.839, lng: 7.728, name: "Champoluc (Alpeggi Frachey di Ayas)" },
      { lat: 45.879, lng: 7.625, name: "Valtournenche (Pascoli sotto il Cervino)" },
      { lat: 45.852, lng: 7.377, name: "Oyace (Vallone di Tornalla, Valpelline)" },
      { lat: 45.850, lng: 7.291, name: "Ollomont (Conca di By)" },
      { lat: 45.824, lng: 7.181, name: "Bosses (S. Rhémy, antica dogana d'alta quota)" },
      { lat: 45.791, lng: 6.965, name: "La Saxe (Ingresso dei Giganti, Courmayeur)" },
      { lat: 45.815, lng: 6.992, name: "Val Ferret (Alpeggi di Lavachey)" },
    ],
  },
  {
    id: "alta_via_2",
    name: "Alta Via 2 (Passo del Gran Paradiso) 🐐",
    description:
      "Itinerario selvaggio nel Parco Nazionale del Gran Paradiso. Foreste di larici, marmotte, stambecchi regali e antiche baite in ardesia.",
    difficulty: "Alpinistico",
    lengthKm: 150,
    icon: "🐐",
    accent: "sky",
    reqLevel: 12,
    coords: [
      { lat: 45.602, lng: 7.761, name: "Donnas (Strada Romana di Pietra)" },
      { lat: 45.623, lng: 7.618, name: "Champorcher (Rifugio Miserin e lago alpino)" },
      { lat: 45.608, lng: 7.355, name: "Cogne (Prati di Sant'Orso)" },
      { lat: 45.590, lng: 7.213, name: "Valsavarenche (Pinete d'Introd)" },
      { lat: 45.568, lng: 7.118, name: "Rhêmes-Notre-Dame (Lago glaciale di Pellaud)" },
      { lat: 45.626, lng: 7.062, name: "Valgrisenche (Diga di Beauregard)" },
      { lat: 45.715, lng: 6.953, name: "La Thuile (Cascate del Rutor)" },
      { lat: 45.791, lng: 6.965, name: "Courmayeur (Funivia Monte Bianco)" },
    ],
  },
  {
    id: "cammino_balteo",
    name: "Cammino Balteo (Bassa Via dei Castelli) 🏰",
    description:
      "Cammino rurale di mezza quota tra vigneti eroici, fiumi cristallini e i manieri medievali della Valle.",
    difficulty: "Turistico",
    lengthKm: 90,
    icon: "🏰",
    accent: "amber",
    reqLevel: 3,
    coords: [
      { lat: 45.603, lng: 7.798, name: "Pont-Saint-Martin (Ponte Romano)" },
      { lat: 45.609, lng: 7.744, name: "Forte di Bard (Rocca Fortificata)" },
      { lat: 45.662, lng: 7.721, name: "Arnad (Lardo DOP)" },
      { lat: 45.698, lng: 7.692, name: "Verrès (Castello d'Ardesia)" },
      { lat: 45.736, lng: 7.491, name: "Fénis (Castello dei Challant)" },
      { lat: 45.742, lng: 7.401, name: "Castello di Quart (Collina d'Aosta)" },
      { lat: 45.746, lng: 7.345, name: "Saint-Christophe (Frutteti collinari)" },
      { lat: 45.717, lng: 7.258, name: "Sarre (Castello Reale)" },
      { lat: 45.719, lng: 7.203, name: "Villeneuve (Châtel-Argent)" },
      { lat: 45.705, lng: 7.164, name: "Arvier (Vigneti dell'Enfer)" },
    ],
  },
  {
    id: "tour_monte_rosa",
    name: "Tour del Monte Rosa (Valli Walser) 🥽",
    description:
      "Trekking d'anello sotto la seconda vetta delle Alpi: ghiacciai sospesi, villaggi Walser in legno e altipiani dove pascolano le mandrie più alte d'Europa.",
    difficulty: "Alpinistico",
    lengthKm: 163,
    icon: "🥽",
    accent: "sky",
    reqLevel: 15,
    coords: [
      { lat: 45.839, lng: 7.728, name: "Champoluc (Val d'Ayas)" },
      { lat: 45.879, lng: 7.625, name: "Colle Superiore delle Cime Bianche" },
      { lat: 45.879, lng: 7.578, name: "Breuil-Cervinia" },
      { lat: 45.776, lng: 7.824, name: "Gressoney-Saint-Jean" },
      { lat: 45.847, lng: 7.823, name: "Alpe Gabiet (Monte Rosa)" },
    ],
  },
  {
    id: "tour_combins",
    name: "Tour des Combins (Gran San Bernardo) 🐕",
    description:
      "Anello internazionale tra Italia e Svizzera attorno al massiccio dei Combins: colli storici, ospizi millenari e alpeggi della Valpelline.",
    difficulty: "Alpinistico",
    lengthKm: 130,
    icon: "🐕",
    accent: "sky",
    reqLevel: 18,
    coords: [
      { lat: 45.869, lng: 7.171, name: "Ollomont (Conca di By)" },
      { lat: 45.876, lng: 7.18, name: "Col Fenêtre de Durand" },
      { lat: 45.852, lng: 7.377, name: "Oyace (Valpelline)" },
      { lat: 45.864, lng: 7.279, name: "Bionaz · Lago di Place Moulin" },
      { lat: 45.868, lng: 7.156, name: "Rifugio Champillon" },
    ],
  },
  {
    id: "giro_gran_paradiso",
    name: "Giro dei Rifugi del Gran Paradiso 🦌",
    description:
      "Collega i grandi rifugi reali del Parco: Vittorio Emanuele II, Chabod e Sella, tra colonie di stambecchi, marmotte e laghi glaciali turchesi.",
    difficulty: "Escursionistico",
    lengthKm: 45,
    icon: "🦌",
    accent: "emerald",
    reqLevel: 8,
    coords: [
      { lat: 45.59, lng: 7.213, name: "Pont Valsavarenche" },
      { lat: 45.547, lng: 7.218, name: "Rifugio Vittorio Emanuele II" },
      { lat: 45.561, lng: 7.246, name: "Rifugio Federico Chabod" },
      { lat: 45.608, lng: 7.355, name: "Cogne (Prati di Sant'Orso)" },
      { lat: 45.6025, lng: 7.2881, name: "Rifugio Vittorio Sella" },
    ],
  },
  {
    id: "lago_loie",
    name: "Cogne → Lago di Loie e Cascate 💧",
    description:
      "Anello panoramico tra le spettacolari cascate di Lillaz e il limpido Lago di Loie, immerso nei lariceti dove pascolano le Castane.",
    difficulty: "Escursionistico",
    lengthKm: 11,
    icon: "💧",
    accent: "emerald",
    reqLevel: 5,
    coords: [
      { lat: 45.605, lng: 7.39, name: "Lillaz (Cascate)" },
      { lat: 45.598, lng: 7.398, name: "Goilles" },
      { lat: 45.588, lng: 7.4, name: "Lago di Loie 💧" },
      { lat: 45.6, lng: 7.388, name: "Ritorno per il vallone" },
    ],
  },
  {
    id: "rutor",
    name: "La Thuile → Cascate del Rutor 🏔️",
    description:
      "Salita alle tre maestose cascate del Rutor fino al lago glaciale e al rifugio Deffeyes, sotto uno dei ghiacciai più estesi della Valle.",
    difficulty: "Escursionistico",
    lengthKm: 14,
    icon: "🌊",
    accent: "sky",
    reqLevel: 7,
    coords: [
      { lat: 45.689, lng: 6.95, name: "La Joux (La Thuile)" },
      { lat: 45.679, lng: 6.962, name: "Prima cascata del Rutor" },
      { lat: 45.668, lng: 6.978, name: "Terza cascata" },
      { lat: 45.659, lng: 6.99, name: "Rifugio Deffeyes 🏔️" },
    ],
  },
];
