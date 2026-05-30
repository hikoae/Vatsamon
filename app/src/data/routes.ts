/**
 * Percorsi di trekking selezionabili (da `materiali/vazzamon_arene`).
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
  coords: { lat: number; lng: number; name: string }[];
}

export const TREK_ROUTES: TrekRoute[] = [
  {
    id: "alta_via_1",
    name: "Alta Via 1 (Sentiero dei Giganti) 🏔️",
    description:
      "Trek d'alta quota ai piedi delle cime leggendarie d'Europa: Cervino, Monte Rosa e Monte Bianco. Paesaggi celestiali e ascese eroiche.",
    difficulty: "Escursionistico",
    lengthKm: 120,
    icon: "🏔️",
    accent: "emerald",
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
];
