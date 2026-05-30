import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Compass, 
  Camera, 
  BookOpen, 
  Swords, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldAlert, 
  Award, 
  MapPin, 
  Zap, 
  Shield, 
  Upload, 
  RefreshCw, 
  X,
  Play,
  Search,
  RotateCw,
  TrendingUp,
  User,
  ShoppingBag,
  Gift,
  Footprints,
  Plus
} from 'lucide-react';
import { Vazzamon, Hotspot, BackpackItem, Egg, Trainer, BattleState, RarityType } from './types';
import { VazzamonAvatar } from './components/VazzamonAvatar';
import { soundEngine } from './utils/audio';
import { INITIAL_VAZZADEX, DEMO_PREMIUM_COWS, HP_LOCATIONS } from './data/mockVazzamon';

// Real geographic trail route in Valle d'Aosta (Cammino dei Pascoli & Castelli)
export const VALLE_DAOSTA_TRAIL_COORDS = [
  { lat: 45.815, lng: 6.992, name: "Courmayeur (Alpeggi Val Ferret)" },
  { lat: 45.791, lng: 6.965, name: "La Saxe (Courmayeur)" },
  { lat: 45.764, lng: 6.985, name: "Pré-Saint-Didier (Sorgenti Termali)" },
  { lat: 45.751, lng: 7.042, name: "Morgex (Vigneti di Montagna)" },
  { lat: 45.736, lng: 7.085, name: "La Salle (Cascata di Lenteney)" },
  { lat: 45.708, lng: 7.139, name: "Avise (Gola di Leverogne)" },
  { lat: 45.705, lng: 7.164, name: "Arvier (Vigneto l'Enfer)" },
  { lat: 45.719, lng: 7.203, name: "Villeneuve (Alpeggio Châtel-Argent)" },
  { lat: 45.710, lng: 7.227, name: "Saint-Pierre (Castello di Saint-Pierre)" },
  { lat: 45.717, lng: 7.258, name: "Sarre (Castello Reale)" },
  { lat: 45.739, lng: 7.330, name: "Aosta Centro (Arco d'Augusto)" },
  { lat: 45.742, lng: 7.401, name: "Quart (Castello di Quart)" },
  { lat: 45.746, lng: 7.443, name: "Nus (Vallone di Saint-Barthélemy)" },
  { lat: 45.736, lng: 7.491, name: "Fénis (Castello dei Challant)" },
  { lat: 45.748, lng: 7.545, name: "Chambave (Vigneti di Moscato)" },
  { lat: 45.744, lng: 7.649, name: "Saint-Vincent (Col de Joux Trail)" },
  { lat: 45.698, lng: 7.692, name: "Verrès (Castello di Verrès)" },
  { lat: 45.662, lng: 7.721, name: "Arnad (Lardo DOP)" },
  { lat: 45.609, lng: 7.744, name: "Forte di Bard (Rocca Monumentale)" },
  { lat: 45.602, lng: 7.761, name: "Donnas (Antica Strada Romana)" },
  { lat: 45.608, lng: 7.355, name: "Prati di Sant'Orso (Cogne Valle)" }
];

export interface TrekRoute {
  id: string;
  name: string;
  description: string;
  difficulty: 'Turistico' | 'Escursionistico' | 'Alpinistico';
  lengthKm: number;
  icon: string;
  accent: string;
  coords: { lat: number; lng: number; name: string }[];
}

export const TREK_ROUTES: TrekRoute[] = [
  {
    id: 'alta_via_1',
    name: "Alta Via 1 (Sentiero dei Giganti) 🏔️",
    description: "Trek d'alta quota che si articola ai piedi delle cime leggendarie d'Europa: Cervino, Monte Rosa e Monte Bianco. Paesaggi celestiali e ascese eroiche.",
    difficulty: "Escursionistico",
    lengthKm: 120,
    icon: "🏔️",
    accent: "emerald",
    coords: [
      { lat: 45.776, lng: 7.824, name: "Gressoney-Saint-Jean (Conca di Gressoney)" },
      { lat: 45.839, lng: 7.728, name: "Champoluc (Alpeggi Frachey di Ayas)" },
      { lat: 45.879, lng: 7.625, name: "Valtournenche (Pascoli Fioriti sotto il Cervino)" },
      { lat: 45.852, lng: 7.377, name: "Oyace (Vallone di Tornalla, Valpelline)" },
      { lat: 45.850, lng: 7.291, name: "Ollomont (Meravigliosa Conca di By)" },
      { lat: 45.824, lng: 7.181, name: "Bosses (S. Rhémy, antica dogana d'alta quota)" },
      { lat: 45.791, lng: 6.965, name: "La Saxe (Ingresso dei Giganti Courmayeur)" },
      { lat: 45.815, lng: 6.992, name: "Val Ferret (Alpeggi alpestri di Lavachey)" }
    ]
  },
  {
    id: 'alta_via_2',
    name: "Alta Via 2 (Passo del Gran Paradiso) 🐐",
    description: "Un itinerario selvaggio nel Parco Nazionale d'Italia. Attraversa fitte foreste di larici guidato da marmotte, stambecchi regali e antiche baite in ardesia.",
    difficulty: "Alpinistico",
    lengthKm: 150,
    icon: "🐐",
    accent: "sky",
    coords: [
      { lat: 45.602, lng: 7.761, name: "Donnas (Strada Romana di Pietra)" },
      { lat: 45.623, lng: 7.618, name: "Champorcher (Rifugio Miserin e lago alpino)" },
      { lat: 45.608, lng: 7.355, name: "Cogne (Meraviglie dei Prati di Sant'Orso)" },
      { lat: 45.590, lng: 7.213, name: "Valsavarenche (Fitte pinete selvagge d'Introd)" },
      { lat: 45.568, lng: 7.118, name: "Rhêmes-Notre-Dame (Lago glaciale di Pellaud)" },
      { lat: 45.626, lng: 7.062, name: "Valgrisenche (Diga d'Alta Quota Beauregard)" },
      { lat: 45.715, lng: 6.953, name: "La Thuile (Imponenti cascate impetuose del Rutor)" },
      { lat: 45.791, lng: 6.965, name: "Courmayeur Centro (Stazione Funivia Monte Bianco)" }
    ]
  },
  {
    id: 'cammino_balteo',
    name: "Cammino Balteo (La Bassa Via dei Castelli) 🏰",
    description: "Un cammino rurale circolare di mezza quota tra vigneti eroici d'alta scuola vitivinicola, fiumi cristallini e i possenti manieri medioevali della Valle.",
    difficulty: "Turistico",
    lengthKm: 90,
    icon: "🏰",
    accent: "amber",
    coords: [
      { lat: 45.603, lng: 7.798, name: "Pont-Saint-Martin (Antico Ponte di Pietra Romano)" },
      { lat: 45.609, lng: 7.744, name: "Forte di Bard (Stupenda Rocca Fortificata)" },
      { lat: 45.662, lng: 7.721, name: "Arnad (Prati e produzione Lardo DOP)" },
      { lat: 45.698, lng: 7.692, name: "Verrès (Castello Monolito d'Ardesia)" },
      { lat: 45.736, lng: 7.491, name: "Fénis (Meraviglioso Castello dei Challant)" },
      { lat: 45.742, lng: 7.401, name: "Castello di Quart (Collina d'Aosta)" },
      { lat: 45.746, lng: 7.345, name: "Saint-Christophe (Alpeggi collinari e frutteti)" },
      { lat: 45.717, lng: 7.258, name: "Sarre (Castello Reale e parco di caccia)" },
      { lat: 45.719, lng: 7.203, name: "Villeneuve (Rovine del Châtel-Argent)" },
      { lat: 45.705, lng: 7.164, name: "Arvier (Vigneti terrazzati dell'Enfer d'Arvier)" }
    ]
  }
];

export interface Gym {
  id: 'cogne' | 'gran_paradiso' | 'fenis' | 'morgex';
  name: string;
  bossName: string;
  bossCowName: string;
  bossBreed: string;
  bossRarity: 'Rara' | 'Epica' | 'Leggendaria';
  difficulty: 'Facile' | 'Medio' | 'Difficile' | 'Leggendario';
  requiredLevel: number;
  cp: number;
  badgeName: string;
  badgeEmoji: string;
  bonusDesc: string;
  bgGradient: string;
}

export const GYMS: Gym[] = [
  {
    id: 'cogne',
    name: "Palestra dei Prati di Cogne 🌸",
    bossName: "Caterina l'Alpigiana",
    bossCowName: "Regina Fleur",
    bossBreed: "Pezzata Rossa",
    bossRarity: "Rara",
    difficulty: "Facile",
    requiredLevel: 1,
    cp: 850,
    badgeName: "Medaglia Flora",
    badgeEmoji: "🌸",
    bonusDesc: "Tutti i Latti curativi curano il +25% in più di HP in ogni battaglia.",
    bgGradient: "from-emerald-900/40 to-slate-950 border-emerald-500/30"
  },
  {
    id: 'gran_paradiso',
    name: "Palestra del Ghiacciaio delle Vette ❄️",
    bossName: "Edoardo lo Scalatore",
    bossCowName: "Ghiaccina Tempesta",
    bossBreed: "Pezzata Nera",
    bossRarity: "Epica",
    difficulty: "Medio",
    requiredLevel: 2,
    cp: 1550,
    badgeName: "Medaglia Ghiacciaio",
    badgeEmoji: "❄️",
    bonusDesc: "+25% di Punti Esperienza (XP) guadagnati da qualsiasi attività.",
    bgGradient: "from-sky-900/40 to-slate-950 border-sky-500/30"
  },
  {
    id: 'fenis',
    name: "Palestra del Castello di Fénis 🏰",
    bossName: "Duca Aimone di Challant",
    bossCowName: "Petra la Fortificata",
    bossBreed: "Evolène",
    bossRarity: "Epica",
    difficulty: "Difficile",
    requiredLevel: 3,
    cp: 2350,
    badgeName: "Medaglia Fortezza",
    badgeEmoji: "🏰",
    bonusDesc: "+15% di difesa passiva totale permanente in tutti gli scontri.",
    bgGradient: "from-amber-900/40 to-slate-950 border-amber-500/30"
  },
  {
    id: 'morgex',
    name: "Palestra dei Vigneti di Morgex 🍇",
    bossName: "Maddalena la Viticoltrice",
    bossCowName: "Regina Eroica Grappolo",
    bossBreed: "Castana Valdostana",
    bossRarity: "Leggendaria",
    difficulty: "Leggendario",
    requiredLevel: 4,
    cp: 3600,
    badgeName: "Medaglia Vigneto",
    badgeEmoji: "🍇",
    bonusDesc: "+15% di probabilità di evasione (schivata pascoli) automatica permanente.",
    bgGradient: "from-purple-900/40 to-slate-950 border-purple-500/30"
  }
];

// Fallback coordinate conversion for consistent SVG layout positioning
export const getSvgCoords = (lat: number, lng: number) => {
  const minLat = 45.55;
  const maxLat = 45.95;
  const minLng = 6.90;
  const maxLng = 7.85;
  
  const x = 5 + ((lng - minLng) / (maxLng - minLng)) * 90;
  const y = 5 + ((maxLat - lat) / (maxLat - minLat)) * 90;
  
  return {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(5, Math.min(95, y))
  };
};

// Procedural overworld spawn pool
const WILD_BREEDS = ["Castana Valdostana", "Pezzata Rossa", "Pezzata Nera", "Evolène"];
const WILD_NAMES = ["Fulmine Alpino", "Brezza d'Alpe", "Corno di Roccia", "Dama Bianca", "Fior di Fontina", "Rugiada Bianca", "Spirito dei Ghiacciai"];
const ECO_TREK_TIPS = [
  "Resta sul sentiero. Calpestare i pascoli danneggia i delicati fiori d'alpeggio necessari alle api.",
  "Riporta a valle le bucce di frutta. Alle alte quote impiegano anni a decomporsi e attraggono fauna nociva.",
  "Chiudi sempre i recinti dei pascoli alle tue spalle per impedire alle bovine di disperdersi nei canaloni.",
  "Rispetta il silenzio. I rumori forti stressano le regine al pascolo riducendone la qualità del latte.",
  "Pulisci gli scarponi prima di cambiare vallata per evitare di propagare spore floristiche infestanti."
];
const LORE_POOL = [
  "Notata spesso a saltellare gioiosamente tra le rocce della Val d'Ayas, predilige l'erba fresca coperta di rugiada.",
  "Una fiera combattente nota per la sua astuzia. Ama farsi grattare la fronte dagli escursionisti rispettosi.",
  "Si dice custodisca gli antichi segreti degli alchimisti della Fontina DOP tra i boschi sacri del Gran Paradiso.",
  "Leggerissima nei movimenti, si camuffa tra i banchi di nebbia per sorprendere i trekker pigri con simpatici baccani."
];

export default function App() {
  // ---- 1. PERSISTENT STATS ----
  const [vazzadex, setVazzadex] = useState<Vazzamon[]>(() => {
    const cached = localStorage.getItem('vazzamon_collection_go');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { console.error(e); }
    }
    return INITIAL_VAZZADEX;
  });

  const [backpack, setBackpack] = useState<BackpackItem[]>(() => {
    const cached = localStorage.getItem('vazzamon_bag_go');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { console.error(e); }
    }
    return [
      { id: 'item-bell-std', name: 'Vazza-ball Ottone', description: 'Campanaccio base risonante. Ideale per catture ordinarie.', quantity: 20, type: 'ball' },
      { id: 'item-bell-giga', name: 'Alpen-Bell d\'Acciaio', description: 'Campanella massiccia dal rintocco potente. Perfetta per bovine Epiche.', quantity: 10, type: 'ball' },
      { id: 'item-bell-master', name: 'Bell di Platino', description: 'Pregiato manufatto dorato d\'alta quota. 100% tasso di cattura!', quantity: 2, type: 'ball' },
      { id: 'item-apple', name: 'Mela Alpina d\'Oro', description: 'Frutto profumatissimo. Addolcisce i Vazzamon selvatici del 40%.', quantity: 6, type: 'food' },
      { id: 'item-hay', name: 'Fieno delle Vette', description: 'Nutriente speciale usato per aumentare il livello e CP dei Vazzamon.', quantity: 12, type: 'candy' },
      { id: 'item-potion', name: 'Zabaione alle Erbe', description: 'Genuino rimedio a base di uova fresche, erbe alpine e liquore genepì. Rigenera ben +120 HP dal vivo in battaglia.', quantity: 5, type: 'potion' }
    ];
  });

  const [eggs, setEggs] = useState<Egg[]>(() => {
    const cached = localStorage.getItem('vazzamon_eggs_go');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { console.error(e); }
    }
    return [
      { id: 'egg-1', rarity: 'Comune', kmWalked: 0, kmRequired: 2, isIncubating: true },
      { id: 'egg-2', rarity: 'Epica', kmWalked: 0, kmRequired: 5, isIncubating: true }
    ];
  });

  const [trainer, setTrainer] = useState<Trainer>(() => {
    const cached = localStorage.getItem('vazzamon_trainer_go');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { console.error(e); }
    }
    return {
      name: "TrekkerGO",
      level: 1,
      xp: 150,
      xpToNextLevel: 1000,
      capturedCount: 2,
      kmTraveled: 0,
      coins: 120
    };
  });

  // Keep all persistent items secure in localStorage
  useEffect(() => { localStorage.setItem('vazzamon_collection_go', JSON.stringify(vazzadex)); }, [vazzadex]);
  useEffect(() => { localStorage.setItem('vazzamon_bag_go', JSON.stringify(backpack)); }, [backpack]);
  useEffect(() => { localStorage.setItem('vazzamon_eggs_go', JSON.stringify(eggs)); }, [eggs]);
  useEffect(() => { localStorage.setItem('vazzamon_trainer_go', JSON.stringify(trainer)); }, [trainer]);

  // Active Trekking Route Selection
  const [activeRouteId, setActiveRouteId] = useState<string>(() => {
    return localStorage.getItem('vazzamon_active_route_id') || 'alta_via_1';
  });

  // Trainer gym badges system
  const [trainerBadges, setTrainerBadges] = useState<string[]>(() => {
    const cached = localStorage.getItem('vazzamon_badges');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { console.error(e); }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('vazzamon_badges', JSON.stringify(trainerBadges));
  }, [trainerBadges]);

  useEffect(() => {
    localStorage.setItem('vazzamon_active_route_id', activeRouteId);
  }, [activeRouteId]);

  // Trekking Waypoints coordinates tracking (dynamic per route)
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(() => {
    const cached = localStorage.getItem(`vazzamon_waypoint_idx_${activeRouteId}`);
    return cached ? Number(cached) : 0;
  });
  const [waypointProgress, setWaypointProgress] = useState<number>(() => {
    const cached = localStorage.getItem(`vazzamon_waypoint_progress_${activeRouteId}`);
    return cached ? Number(cached) : 0;
  });

  // Synchronize dynamic indices when route switches
  useEffect(() => {
    const cachedIdx = localStorage.getItem(`vazzamon_waypoint_idx_${activeRouteId}`);
    const cachedProg = localStorage.getItem(`vazzamon_waypoint_progress_${activeRouteId}`);
    setCurrentWaypointIndex(cachedIdx ? Number(cachedIdx) : 0);
    setWaypointProgress(cachedProg ? Number(cachedProg) : 0);
  }, [activeRouteId]);

  useEffect(() => {
    localStorage.setItem(`vazzamon_waypoint_idx_${activeRouteId}`, String(currentWaypointIndex));
  }, [currentWaypointIndex, activeRouteId]);

  useEffect(() => {
    localStorage.setItem(`vazzamon_waypoint_progress_${activeRouteId}`, String(waypointProgress));
  }, [waypointProgress, activeRouteId]);

  // Track hiking feeds to avoid intrusive standard popups
  const [trekkingFeed, setTrekkingFeed] = useState<string[]>([
    "Benvenuto in Valle d'Aosta! Scegli il tuo sentiero preferito e cammina.",
    "Bussola sintonizzata: pronto a esplorare l'alpeggio."
  ]);

  // ---- 2. VIEW NAVIGATION ----
  const [activeTab, setActiveTab] = useState<'map' | 'scanner' | 'eggs' | 'vazzadex' | 'battle'>('map');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Overworld spawned wild Vazzamons
  interface WildCow {
    id: string;
    vazza: Vazzamon;
    lat?: number;
    lng?: number;
    x: number; // coordinates relative to map width
    y: number;
    angle: number;
  }
  const [wildCows, setWildCows] = useState<WildCow[]>([]);

  // Choose between Leaflet real OSM map & sci-fi SVG overworld sonar radar
  const [mapMode, setMapMode] = useState<'real' | 'radar'>('real');

  // PokeStop dairy cooldowns declared early for scope visibility
  const [caseraCooldowns, setCaseraCooldowns] = useState<Record<string, number>>({});

  // Dynamic Route resolution
  const activeRoute = TREK_ROUTES.find(r => r.id === activeRouteId) || TREK_ROUTES[0];
  const activeRouteCoords = activeRoute.coords;

  // Calculate current player coordinates along the route link early for leaflet effect scope visibility
  const currentWaypoint = activeRouteCoords[currentWaypointIndex] || activeRouteCoords[0];
  const nextWaypointIndex = (currentWaypointIndex + 1) % activeRouteCoords.length;
  const nextWaypoint = activeRouteCoords[nextWaypointIndex] || activeRouteCoords[0];
  
  const playerLat = currentWaypoint.lat + (nextWaypoint.lat - currentWaypoint.lat) * (waypointProgress / 100);
  const playerLng = currentWaypoint.lng + (nextWaypoint.lng - currentWaypoint.lng) * (waypointProgress / 100);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<L.Marker[]>([]);
  const leafletPlayerMarkerRef = useRef<L.Marker | null>(null);
  const leafletPolylineRef = useRef<L.Polyline | null>(null);

  // Synchronize dynamic Leaflet Map Layer drawing
  useEffect(() => {
    if (activeTab === 'map' && mapMode === 'real' && mapContainerRef.current) {
      if (!leafletMapRef.current) {
        // Center on current player position
        const initMap = L.map(mapContainerRef.current, {
          center: [playerLat, playerLng],
          zoom: 12,
          zoomControl: true,
          attributionControl: false
        });

        // Beautiful standard OSM map layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(initMap);

        leafletMapRef.current = initMap;
      } else {
        // Pan dynamically on simulated steps
        leafletMapRef.current.setView([playerLat, playerLng], leafletMapRef.current.getZoom(), { animate: true });
      }

      const map = leafletMapRef.current;

      // Draw routing polyline representing Valle d'Aosta trial path
      if (leafletPolylineRef.current) {
        leafletPolylineRef.current.remove();
      }
      const coordsArray = activeRouteCoords.map(wp => [wp.lat, wp.lng] as L.LatLngTuple);
      leafletPolylineRef.current = L.polyline(coordsArray, {
        color: '#10b981', // Emerald 500
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 12'
      }).addTo(map);

      // Clear previous overlay markers to avoid stack leaks
      leafletMarkersRef.current.forEach(m => m.remove());
      leafletMarkersRef.current = [];

      // Add Casera Checkpoints (PokéStops)
      HP_LOCATIONS.forEach(hp => {
        const hpLat = hp.lat ?? playerLat;
        const hpLng = hp.lng ?? playerLng;
        const cooldownActive = caseraCooldowns[hp.id] && caseraCooldowns[hp.id] > Date.now();

        // Beautiful emoji HTML render
        const caseraHtmlIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div class="flex flex-col items-center">
                   <div class="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center shadow-md relative ${cooldownActive ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 text-white animate-pulse'}" style="transform: translateY(-8px);">
                     <span class="text-base">🍼</span>
                     ${cooldownActive ? '' : '<span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-400 rounded-full border border-white animate-ping"></span>'}
                   </div>
                   <div class="px-1.5 py-0.5 rounded bg-slate-950/95 border border-slate-800 text-[8px] text-white font-mono font-bold whitespace-nowrap shadow-sm" style="transform: translateY(-12px);">
                     ${hp.name.substring(0, 10)}...
                   </div>
                 </div>`,
          iconSize: [40, 50],
          iconAnchor: [20, 25]
        });

        const hpMarker = L.marker([hpLat, hpLng], { icon: caseraHtmlIcon })
          .addTo(map)
          .on('click', () => {
            playClickSfx();
            setSelectedCasera(hp);
            setSpinState('idle');
            setSpinRewards([]);
          });

        leafletMarkersRef.current.push(hpMarker);
      });

      // Add Wild Cow Markers
      wildCows.forEach(wc => {
        const wcLat = wc.lat ?? playerLat;
        const wcLng = wc.lng ?? playerLng;
        const emoji = wc.vazza.breed.toLowerCase().includes('pezza') ? '🐮' : '🐄';

        const cowHtmlIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div class="flex flex-col items-center">
                   <div class="w-10 h-10 rounded-full bg-slate-950 border-2 border-amber-500 flex items-center justify-center shadow-lg relative cursor-pointer hover:scale-110 transition-transform" style="transform: translateY(-8px);">
                     <span class="text-xl animate-float">${emoji}</span>
                     <span class="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-mono text-[7px] font-black px-1 rounded-full leading-tight">
                       CP${wc.vazza.cp}
                     </span>
                   </div>
                   <div class="px-1 py-0.2 rounded bg-slate-900 border border-amber-550/20 text-[7px] text-yellow-400 font-mono font-bold whitespace-nowrap shadow-sm" style="transform: translateY(-10px);">
                     ${wc.vazza.rarity}
                   </div>
                 </div>`,
          iconSize: [40, 50],
          iconAnchor: [20, 25]
        });

        const cowMarker = L.marker([wcLat, wcLng], { icon: cowHtmlIcon })
          .addTo(map)
          .on('click', () => {
            playClickSfx();
            initiateCatchWild(wc);
          });

        leafletMarkersRef.current.push(cowMarker);
      });

      // Place or shift Player Marker
      if (leafletPlayerMarkerRef.current) {
        leafletPlayerMarkerRef.current.remove();
      }

      const playerHtmlIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="flex flex-col items-center">
                 <div class="w-12 h-12 rounded-full border-3 border-emerald-400 bg-emerald-500/10 flex items-center justify-center shadow-2xl relative" style="transform: translateY(-10px);">
                   <span class="text-2xl">🧑‍🌾</span>
                   <span class="absolute inset-0 rounded-full border border-emerald-400 animate-ping opacity-35"></span>
                 </div>
               </div>`,
        iconSize: [45, 55],
        iconAnchor: [22, 27]
      });

      leafletPlayerMarkerRef.current = L.marker([playerLat, playerLng], { icon: playerHtmlIcon })
        .addTo(map);

      // Force layout recalculations dynamically
      setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 350);
    } else {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        leafletPlayerMarkerRef.current = null;
        leafletPolylineRef.current = null;
        leafletMarkersRef.current = [];
      }
    }
  }, [activeTab, mapMode, playerLat, playerLng, wildCows, caseraCooldowns, activeRouteId]);

  // PokeStop: Casere d'Alpeggio active interactions
  const [selectedCasera, setSelectedCasera] = useState<Hotspot | null>(null);
  const [spinState, setSpinState] = useState<'idle' | 'spinning' | 'rewarded'>('idle');
  const [spinDeg, setSpinDeg] = useState(0);
  const [spinRewards, setSpinRewards] = useState<string[]>([]);

  // Capture mode variables
  const [isCapturingMode, setIsCapturingMode] = useState(false);
  const [encounterCow, setEncounterCow] = useState<Vazzamon | null>(null);
  const [selectedBallId, setSelectedBallId] = useState<string>('item-bell-std');
  const [targetRingScale, setTargetRingScale] = useState(1);
  const [hasFedApple, setHasFedApple] = useState(false);
  const [throwSpeedGauge, setThrowSpeedGauge] = useState(40);
  const [throwDirection, setThrowDirection] = useState<'up' | 'down'>('up');
  const [captureStep, setCaptureStep] = useState<'aiming' | 'flying' | 'wobbling' | 'secured' | 'escaped'>('aiming');
  const [captureLogMsg, setCaptureLogMsg] = useState('');

  // Scanner upload parameters
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Backpack general item utility drawer
  const [selectedVazzamon, setSelectedVazzamon] = useState<Vazzamon | null>(null);
  const [dexSearch, setDexSearch] = useState('');
  const [dexRarityFilter, setDexRarityFilter] = useState<string>('All');
  const [activeCombatantId, setActiveCombatantId] = useState<string>(() => vazzadex[0]?.id || "");

  // Level Up overlay reward popup
  const [levelUpAward, setLevelUpAward] = useState<number | null>(null);

  // Hatching egg modal
  const [hatchingEgg, setHatchingEgg] = useState<Egg | null>(null);

  // Interactive Bataille de Reines gym-fighter active state
  const [gymState, setGymState] = useState<BattleState>({
    playerVazzamon: null,
    opponentVazzamon: null,
    playerHp: 100,
    opponentHp: 100,
    playerMaxHp: 100,
    opponentMaxHp: 100,
    energy: 20,
    opponentEnergy: 0,
    status: 'idle',
    history: [],
    winner: null,
    opponentStatsModifier: 0,
    playerAttackAnim: false,
    opponentAttackAnim: false
  });
  const [activeDodgeEffect, setActiveDodgeEffect] = useState(false);
  const battleLoopRef = useRef<NodeJS.Timeout | null>(null);

  // ---- 3. AUDIO MANAGEMENT & EVENT SFX ----
  const playClickSfx = () => { if (soundEnabled) soundEngine.playClick(); };
  const playMooSfx = () => { if (soundEnabled) soundEngine.playMoo(); };
  const playHitSfx = () => { if (soundEnabled) soundEngine.playHeadbutt(); };
  const playVictorySfx = () => { if (soundEnabled) soundEngine.playVictoryFanfare(); };



  // ---- 4. OVERWORLD PROCEDURAL GENERATOR ----
  const spawnWildCowAtRandom = (customLat?: number, customLng?: number) => {
    const randBreed = WILD_BREEDS[Math.floor(Math.random() * WILD_BREEDS.length)];
    const randName = WILD_NAMES[Math.floor(Math.random() * WILD_NAMES.length)] + " Selvatico";
    const rarities: RarityType[] = ['Comune', 'Comune', 'Rara', 'Rara', 'Epica', 'Leggendaria'];
    const randRarity = rarities[Math.floor(Math.random() * rarities.length)];
    
    let str = 30 + Math.floor(Math.random() * 45);
    let def = 30 + Math.floor(Math.random() * 45);
    let agl = 30 + Math.floor(Math.random() * 45);

    if (randRarity === 'Leggendaria') { str += 20; def += 20; agl += 10; }
    else if (randRarity === 'Epica') { str += 10; def += 10; agl += 5; }

    const cp = Math.floor((str * 2 + def + agl) * (1.1 + (randRarity === 'Leggendaria' ? 1.0 : randRarity === 'Epica' ? 0.5 : randRarity === 'Rara' ? 0.2 : 0)));

    const generated: Vazzamon = {
      id: "wild-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      breed: randBreed,
      name: randName,
      stats: { strength: str, defense: def, agility: agl },
      rarity: randRarity,
      eco_tip: ECO_TREK_TIPS[Math.floor(Math.random() * ECO_TREK_TIPS.length)],
      lore: LORE_POOL[Math.floor(Math.random() * LORE_POOL.length)],
      capturedAt: new Date().toISOString(),
      cp,
      level: 15
    };

    // Spawn relative to baseLat if custom is provided, otherwise relative to current player positions
    const originLat = customLat !== undefined ? customLat : playerLat;
    const originLng = customLng !== undefined ? customLng : playerLng;

    const latOffset = (Math.random() - 0.5) * 0.024; // +-0.012 lat (approx 1-2km)
    const lngOffset = (Math.random() - 0.5) * 0.036; // +-0.018 lng (approx 1-2km)
    const cowLat = originLat + latOffset;
    const cowLng = originLng + lngOffset;

    const svgCoords = getSvgCoords(cowLat, cowLng);

    return {
      id: generated.id,
      vazza: generated,
      lat: cowLat,
      lng: cowLng,
      x: svgCoords.x,
      y: svgCoords.y,
      angle: Math.random() * 360
    };
  };

  // Pre-spawn some wild cows around the screen if none exist
  useEffect(() => {
    if (wildCows.length === 0) {
      setWildCows([
        spawnWildCowAtRandom(playerLat, playerLng),
        spawnWildCowAtRandom(playerLat, playerLng),
        spawnWildCowAtRandom(playerLat, playerLng)
      ]);
    }
  }, []);

  // Shrinking Capture Target Circle trigger loop
  useEffect(() => {
    let animationFrame: number;
    const tickRing = () => {
      setTargetRingScale(prev => {
        const next = prev - 0.015;
        return next < 0.35 ? 1.0 : next;
      });
      animationFrame = requestAnimationFrame(tickRing);
    };
    if (isCapturingMode) {
      animationFrame = requestAnimationFrame(tickRing);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isCapturingMode]);

  // Throw gauge power oscilator loop
  useEffect(() => {
    let inter: NodeJS.Timeout;
    if (isCapturingMode && captureStep === 'aiming') {
      inter = setInterval(() => {
        setThrowSpeedGauge(prev => {
          if (throwDirection === 'up') {
            if (prev >= 98) { setThrowDirection('down'); return 98; }
            return prev + 6;
          } else {
            if (prev <= 12) { setThrowDirection('up'); return 12; }
            return prev - 6;
          }
        });
      }, 50);
    }
    return () => clearInterval(inter);
  }, [isCapturingMode, captureStep, throwDirection]);

  // Handle Level Up calculations
  const addTrainerXp = (amount: number) => {
    let finalAmount = amount;
    if (trainerBadges.includes('gran_paradiso')) {
      finalAmount = Math.floor(amount * 1.25);
    }
    setTrainer(prev => {
      let currentXp = prev.xp + finalAmount;
      let currentLevel = prev.level;
      let nextLevelXp = prev.xpToNextLevel;

      if (currentXp >= nextLevelXp) {
        currentXp -= nextLevelXp;
        currentLevel += 1;
        nextLevelXp = Math.floor(nextLevelXp * 1.5);
        setLevelUpAward(currentLevel);
        setTimeout(() => { playVictorySfx(); }, 300);
      }

      return {
        ...prev,
        level: currentLevel,
        xp: currentXp,
        xpToNextLevel: nextLevelXp
      };
    });
  };

  // ---- 5. ADVENTURE TRAIL WALKING SIMULATOR ----
  const handleSimulatedWalk = () => {
    playClickSfx();
    const distanceStep = 0.5; // Walk 500 meters
    
    // Update Trainer distance tracker
    setTrainer(prev => ({
      ...prev,
      kmTraveled: Number((prev.kmTraveled + distanceStep).toFixed(1)),
      coins: prev.coins + 2 // Rewards with alpine exploration coins
    }));

    addTrainerXp(120); // Exploration yields XP

    // Incubate eggs & check for hatches
    let triggeredHatch: Egg | null = null;
    const updatedEggs = eggs.map(egg => {
      if (egg.isIncubating) {
        const walked = Number((egg.kmWalked + distanceStep).toFixed(1));
        if (walked >= egg.kmRequired && !triggeredHatch) {
          triggeredHatch = { ...egg, kmWalked: walked };
          return { ...egg, kmWalked: walked, isIncubating: false }; // trigger hatch flow
        }
        return { ...egg, kmWalked: walked };
      }
      return egg;
    });
    setEggs(updatedEggs);

    if (triggeredHatch) {
      triggerEggHatching(triggeredHatch);
    }

    // Update trek coordinates progress
    const nextProgress = waypointProgress + 20; // 5 steps of 500m = 2.5km segment
    let nextIndex = currentWaypointIndex;
    let actualProgress = nextProgress;
    let feedMsg = "";

    if (nextProgress >= 100) {
      nextIndex = (currentWaypointIndex + 1) % activeRouteCoords.length;
      actualProgress = nextProgress - 100;
      feedMsg = `🏔️ Nuovo Traguardo! Sei arrivato a: ${activeRouteCoords[nextIndex].name}!`;
    } else {
      const targetWp = activeRouteCoords[nextWaypointIndex] || activeRouteCoords[0];
      feedMsg = `🥾 Cammini verso ${targetWp.name}... Progressi: ${nextProgress}%`;
    }

    setWaypointProgress(actualProgress);
    setCurrentWaypointIndex(nextIndex);

    // Calculate updated coordinates to pass for fresh nearby spawner
    const baseWp = activeRouteCoords[nextIndex] || activeRouteCoords[0];
    const afterIdx = (nextIndex + 1) % activeRouteCoords.length;
    const afterWp = activeRouteCoords[afterIdx] || activeRouteCoords[0];
    const nextLat = baseWp.lat + (afterWp.lat - baseWp.lat) * (actualProgress / 100);
    const nextLng = baseWp.lng + (afterWp.lng - baseWp.lng) * (actualProgress / 100);

    // Spawn another wild Vazzamon nearby
    if (Math.random() > 0.3) {
      setWildCows(prev => [...prev.slice(-3), spawnWildCowAtRandom(nextLat, nextLng)]); // keep maximum 4 wild cows roaming
    }

    // Update the live feed list
    setTrekkingFeed(prev => [
      `🌳 Hai camminato per altri 500m! (+2 monete d'oro 🪙)`,
      feedMsg,
      ...prev.slice(0, 8)
    ]);
  };

  // ---- 6. EGG HATCHERY UTILITIES ----
  const triggerEggHatching = (egg: Egg) => {
    const breed = WILD_BREEDS[Math.floor(Math.random() * WILD_BREEDS.length)];
    const rarity = egg.rarity;
    
    let str = 45 + Math.floor(Math.random() * 45);
    let def = 45 + Math.floor(Math.random() * 45);
    let agl = 45 + Math.floor(Math.random() * 45);
    
    const cp = Math.floor((str * 2 + def + agl) * (1.3 + (rarity === 'Leggendaria' ? 1.0 : rarity === 'Epica' ? 0.5 : 0.2)));

    const hatchedCow: Vazzamon = {
      id: "hatch-" + Date.now(),
      breed,
      name: "Baby " + breed.split(" ")[0],
      stats: { strength: str, defense: def, agility: agl },
      rarity,
      eco_tip: "I piccoli pascoli fioriscono con pazienza. Proteggi i giovani germogli tenendo fermi zaini e tende.",
      lore: `Schiusa direttamente da un raro uovo montano custodito al caldo dell'incubatore alpino. Mostra una vitalità contagiosa!`,
      capturedAt: new Date().toISOString(),
      cp,
      level: 1
    };

    setHatchingEgg(egg);
    // Add to collection
    setVazzadex(prev => [hatchedCow, ...prev]);
    // Replace egg in hatchery list with a fresh one
    setEggs(prev => {
      const remaining = prev.filter(e => e.id !== egg.id);
      const nextRarities: RarityType[] = ['Comune', 'Rara', 'Epica'];
      const nextRarity = nextRarities[Math.floor(Math.random() * nextRarities.length)];
      const req = nextRarity === 'Epica' ? 5 : nextRarity === 'Rara' ? 3 : 2;
      return [...remaining, { id: "egg-new-" + Date.now(), rarity: nextRarity, kmWalked: 0, kmRequired: req, isIncubating: true }];
    });
  };

  // ---- 7. POKESTOP INTERACTIVE SPIN WHEEL ----
  const handleSpinCasera = () => {
    if (spinState === 'spinning') return;
    playClickSfx();
    setSpinState('spinning');
    
    const rotations = 3 + Math.floor(Math.random() * 3);
    const degreeTarget = spinDeg + rotations * 360 + Math.floor(Math.random() * 360);
    setSpinDeg(degreeTarget);

    setTimeout(() => {
      playVictorySfx();
      
      // Compute rewards loot box
      const looted: string[] = [];
      const odds = Math.random();

      // Normal base items
      looted.push("+4 Vazza-ball");
      setBackpack(prev => prev.map(item => item.id === 'item-bell-std' ? { ...item, quantity: item.quantity + 4 } : item));
      
      if (odds > 0.4) {
        looted.push("+2 Mele d'Oro");
        setBackpack(prev => prev.map(item => item.id === 'item-apple' ? { ...item, quantity: item.quantity + 2 } : item));
      }
      if (odds > 0.6) {
        looted.push("+1 Zabaione");
        setBackpack(prev => prev.map(item => item.id === 'item-potion' ? { ...item, quantity: item.quantity + 1 } : item));
      }
      if (odds > 0.8) {
        looted.push("+1 Alpen-Bell");
        setBackpack(prev => prev.map(item => item.id === 'item-bell-giga' ? { ...item, quantity: item.quantity + 1 } : item));
      }
      if (odds > 0.93) {
        looted.push("+1 Fieno Vette");
        setBackpack(prev => prev.map(item => item.id === 'item-hay' ? { ...item, quantity: item.quantity + 1 } : item));
      }

      setSpinRewards(looted);
      setSpinState('rewarded');

      // Record Stop Cooldown of 30 seconds
      if (selectedCasera) {
        setCaseraCooldowns(prev => ({
          ...prev,
          [selectedCasera.id]: Date.now() + 30000
        }));
      }

      // Reward Trainer Coins + XP
      setTrainer(prev => ({ ...prev, coins: prev.coins + 15 }));
      addTrainerXp(150);

    }, 2800);
  };

  // ---- 8. CATCHING INTERACTIVE CAPTURE LOGIC ----
  const initiateCatchWild = (wild: WildCow) => {
    playClickSfx();
    setEncounterCow(wild.vazza);
    setIsCapturingMode(true);
    setCaptureStep('aiming');
    setHasFedApple(false);
    
    // Auto pre-select first ball with quantity > 0
    const firstAvailableBall = backpack.find(item => item.type === 'ball' && item.quantity > 0);
    setSelectedBallId(firstAvailableBall ? firstAvailableBall.id : 'item-bell-std');
    
    setCaptureLogMsg('Pronto a lanciare il rintocco captatore!');
  };

  const handleFeedApple = () => {
    if (hasFedApple) return;
    playClickSfx();
    
    // Decrement item
    setBackpack(prev => {
      return prev.map(item => {
        if (item.id === 'item-apple' && item.quantity > 0) {
          setHasFedApple(true);
          setCaptureLogMsg('Mmeee! La mela ha calmato i battiti della bovina. Cattura facilitata!');
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      });
    });
  };

  const executeThrow = () => {
    if (captureStep !== 'aiming') return;
    playClickSfx();

    // Deduct ball from inventory
    const targetBall = backpack.find(item => item.id === selectedBallId);
    if (!targetBall || targetBall.quantity <= 0) {
      alert("Nessun campanello rimasto di questo tipo! Cambia ball.");
      return;
    }

    setBackpack(prev => prev.map(item => {
      if (item.id === selectedBallId) {
        return { ...item, quantity: item.quantity - 1 };
      }
      return item;
    }));

    setCaptureStep('flying');
    
    // Assess throw precision
    let rating: 'EXCELLENT' | 'GREAT' | 'NICE' | 'MISS' = 'NICE';
    if (throwSpeedGauge >= 75 && throwSpeedGauge <= 92) {
      rating = 'EXCELLENT';
    } else if (throwSpeedGauge >= 55 && throwSpeedGauge <= 95) {
      rating = 'GREAT';
    }

    setCaptureLogMsg(`Lancio effettuato! Precisione: ${rating}`);

    // Compute capture rates
    setTimeout(() => {
      setCaptureStep('wobbling');
      setCaptureLogMsg('Cattura in corso... Rintocco oscillante 1...');
      playHitSfx();
    }, 1000);

    setTimeout(() => {
      setCaptureLogMsg('Rintocco oscillante 2... Il battito si stabilizza...');
      playHitSfx();
    }, 2200);

    setTimeout(() => {
      // Determine final success based on rating, ball accuracy multiplier, and if apple fed
      let captureChance = 0.50; // baseline Comune
      if (encounterCow?.rarity === 'Leggendaria') captureChance = 0.15;
      else if (encounterCow?.rarity === 'Epica') captureChance = 0.25;
      else if (encounterCow?.rarity === 'Rara') captureChance = 0.35;

      // Multipliers
      if (selectedBallId === 'item-bell-master') captureChance = 1.0; // masterpiece
      else if (selectedBallId === 'item-bell-giga') captureChance *= 1.8;
      
      if (hasFedApple) captureChance *= 1.5;
      if (rating === 'EXCELLENT') captureChance *= 1.6;
      else if (rating === 'GREAT') captureChance *= 1.35;

      const isCaught = Math.random() <= captureChance;

      if (isCaught && encounterCow) {
        setCaptureStep('secured');
        setCaptureLogMsg(`Gotcha! ${encounterCow.name} è stata felicemente sintonizzata!`);
        playVictorySfx();

        // Add to permanent collection
        setVazzadex(prev => [encounterCow, ...prev]);
        setActiveCombatantId(encounterCow.id);
        
        // Remove from overworld spawns
        setWildCows(prev => prev.filter(c => c.id !== encounterCow.id));
        
        // Reward Player
        setTrainer(prev => ({
          ...prev,
          capturedCount: prev.capturedCount + 1,
          coins: prev.coins + 25
        }));
        addTrainerXp(rating === 'EXCELLENT' ? 350 : rating === 'GREAT' ? 200 : 120);

      } else {
        // Roll for retreat (flee rate depends on rarity, giving players multiple retries)
        let fleeRate = 0.15; // 15% for Common
        if (encounterCow?.rarity === 'Leggendaria') fleeRate = 0.45;
        else if (encounterCow?.rarity === 'Epica') fleeRate = 0.30;
        else if (encounterCow?.rarity === 'Rara') fleeRate = 0.20;

        const didFlee = Math.random() <= fleeRate;

        if (didFlee) {
          setCaptureStep('escaped');
          setCaptureLogMsg(`Oh no! ${encounterCow?.name || 'La Reina'} si è liberata ed è fuggita tra le nebbie!`);
          // Remove from spawns even if it flees to keep map fresh
          if (encounterCow) {
            setWildCows(prev => prev.filter(c => c.id !== encounterCow.id));
          }
        } else {
          // Breakout but stays!
          setCaptureStep('aiming');
          setCaptureLogMsg(`Mmmh! ${encounterCow?.name || 'La Reina'} si è liberata dal rintocco... Riprova a lanciare!`);
          playMooSfx();
        }
      }
    }, 3400);
  };

  // ---- 9. DETAILED CARD POWER UP & TRANSFERS ----
  const handlePowerUpCow = (cow: Vazzamon) => {
    // Costs 10 coins and 1 Fieno delle Vette
    const hasHayObj = backpack.find(item => item.id === 'item-hay' && item.quantity > 0);
    if (trainer.coins < 15 || !hasHayObj) {
      alert("Non hai abbastanza risorse! Mancano monete (costo: 15🪙) o Fieno delle Vette (costo: 1 fieno🌾) per nutrire e potenziare questa bovina.");
      return;
    }

    playVictorySfx();

    // Deduct inputs
    setTrainer(prev => ({ ...prev, coins: prev.coins - 15 }));
    setBackpack(prev => prev.map(item => item.id === 'item-hay' ? { ...item, quantity: item.quantity - 1 } : item));

    // Empower stats
    setVazzadex(prev => {
      return prev.map(c => {
        if (c.id === cow.id) {
          const nextLevel = c.level + 1;
          const nextCp = c.cp + 75 + Math.floor(Math.random() * 30);
          const nextStats = {
            strength: Math.min(c.stats.strength + 2, 100),
            defense: Math.min(c.stats.defense + 2, 100),
            agility: Math.min(c.stats.agility + 1, 100)
          };
          const updated = { ...c, level: nextLevel, cp: nextCp, stats: nextStats };
          setSelectedVazzamon(updated); // Update detail view
          return updated;
        }
        return c;
      });
    });
  };

  const handleTransferCow = (cow: Vazzamon) => {
    if (vazzadex.length <= 1) {
      alert("Non puoi liberare la tua unica Regina al pascolo! Devi tenere almeno un Vazzamon.");
      return;
    }
    playClickSfx();
    const confirmed = window.confirm(`Vuoi davvero liberare ${cow.name} rimandandola al pascolo libero? Riceverai +5 kg di Fieno delle Vette in premio!`);
    if (!confirmed) return;

    // Filter out
    setVazzadex(prev => {
      const filtered = prev.filter(c => c.id !== cow.id);
      if (activeCombatantId === cow.id) {
        setActiveCombatantId(filtered[0]?.id || "");
      }
      return filtered;
    });

    // Reward fodder
    setBackpack(prev => prev.map(item => item.id === 'item-hay' ? { ...item, quantity: item.quantity + 5 } : item));
    setSelectedVazzamon(null);
    alert(`${cow.name} è tornata felice nell'alpeggio d'alta quota! Ricevuti +5 fieni.`);
  };

  // Selected Arena before match start
  const [selectedArenaId, setSelectedArenaId] = useState<'cogne' | 'gran_paradiso' | 'fenis' | 'morgex'>('cogne');

  // Move uses inside battle to prevent spamming
  const [milkLickUses, setMilkLickUses] = useState(3);

  // Tactical sub-control tabs in battleground
  const [battleActionTab, setBattleActionTab] = useState<'moves' | 'bag' | 'swap'>('moves');

  // ---- 10. REAL-TIME TURN-BASED ARENA BATTLES ----
  const handleInitiateGymMatch = () => {
    playClickSfx();
    const activeBuddy = vazzadex.find(c => c.id === activeCombatantId) || vazzadex[0];
    if (!activeBuddy) {
      alert("Sblocca un Vazzamon prima di sfidare l'arena!");
      return;
    }

    const currentGym = GYMS.find(g => g.id === selectedArenaId) || GYMS[0];
    
    // Scale opponent matching user level
    const oppPowerMult = 1.05 + (trainer.level * 0.08);
    const scaledOpponent: Vazzamon = {
      id: "opponent-boss",
      name: currentGym.bossCowName,
      breed: currentGym.bossBreed,
      rarity: "Leggendaria",
      eco_tip: "Questo Boss leggendario combatte per proteggere i pascoli alpini incontaminati.",
      lore: "La regina indiscussa dell'arena valdostana d'alta quota.",
      capturedAt: new Date().toLocaleDateString(),
      level: Math.max(12, activeBuddy.level + 2),
      cp: Math.floor(currentGym.cp * oppPowerMult),
      stats: {
        strength: Math.floor(45 + currentGym.cp * 0.02),
        defense: Math.floor(40 + currentGym.cp * 0.015),
        agility: Math.floor(35 + currentGym.cp * 0.01)
      }
    };

    setMilkLickUses(3);

    // Initial greeting description based on the selected arena
    const introMsg = selectedArenaId === 'fenis' 
      ? `🏰 Ti trovi nell'Arena del Castello di Fénis! Le massicce mura di pietra riducono i danni subiti.`
      : selectedArenaId === 'gran_paradiso'
      ? `❄️ Ti trovi sull'Arena del Ghiacciaio! L'aria sottile rinvigorisce la determinazione e l'energia iniziale.`
      : selectedArenaId === 'morgex'
      ? `🍇 Ti trovi nell'Arena dei Vigneti di Morgex! Coltivazioni eroiche ad alta quota aumentano l'evasione naturale.`
      : `🌸 Ti trovi nell'Arena dei Prati di Sant'Orso! La brezza di Cogne infonde forza riparatrice alle mosse rigenerative.`;

    setGymState({
      playerVazzamon: activeBuddy,
      opponentVazzamon: scaledOpponent,
      playerHp: 320 + activeBuddy.level * 18,
      opponentHp: 300 + scaledOpponent.level * 22,
      playerMaxHp: 320 + activeBuddy.level * 18,
      opponentMaxHp: 300 + scaledOpponent.level * 22,
      energy: selectedArenaId === 'gran_paradiso' ? 40 : 20,
      opponentEnergy: 10,
      status: 'active', // Entra subito nell'arena di battaglia turn-based
      winner: null,
      opponentStatsModifier: 0,
      playerAttackAnim: false,
      opponentAttackAnim: false,
      arenaId: selectedArenaId,
      activeTurn: 'player',
      playerDefenseBuff: 0,
      opponentDefenseBuff: 0,
      playerEvasionBuff: 0,
      opponentEvasionBuff: 0,
      history: [
        `🏆 BENVENUTO IN ARENA: Bataille de Reines!`,
        introMsg,
        `⚔️ Scontro: ${activeBuddy.name} (CP ${activeBuddy.cp}) contro Opp Boss ${scaledOpponent.name} (CP ${scaledOpponent.cp})`,
        `👉 È il tuo turno! Seleziona una mossa d'attacco o schiva per difenderti!`
      ]
    });
  };

  // Background CPU battle machine turn
  const executeOpponentTurn = (currentState: BattleState) => {
    if (currentState.status !== 'active') return;

    // Transition state block to block multiple user click events
    setGymState(prev => ({ ...prev, activeTurn: 'processing' }));

    setTimeout(() => {
      setGymState(prev => {
        if (prev.status !== 'active' || !prev.opponentVazzamon) return prev;

        const isSuperReady = prev.opponentEnergy >= 100;
        let baseDamage = 13 + (prev.opponentVazzamon.stats.strength * 0.15) + (Math.random() * 8);
        let moveName = "Spallata Frontale Valdostana";
        let moveEmoji = "💥";
        let isHeal = false;

        if (isSuperReady) {
          baseDamage *= 2.3;
          moveName = "⚡ INCORNATA DIVINA DEL MONTE BIANCO";
          moveEmoji = "🔱";
        } else {
          // AI tactics: heal or bolster defenses randomly
          const hpPct = prev.opponentHp / prev.opponentMaxHp;
          if (hpPct < 0.38 && Math.random() > 0.45) {
            isHeal = true;
            moveName = "🥛 Mungitura Salvavita d'Alpeggio";
            moveEmoji = "🍼";
          } else if (Math.random() > 0.7) {
            moveName = "🛡️ Posizione Arroccata (Forte di Bard)";
            moveEmoji = "🛡️";
          }
        }

        const logs = [...prev.history];

        if (isHeal) {
          const healAmount = Math.floor(45 + prev.opponentVazzamon.stats.agility * 0.35);
          const nextOppHp = Math.min(prev.opponentMaxHp, prev.opponentHp + healAmount);
          logs.push(`${moveEmoji} Il Boss ${prev.opponentVazzamon.name} si ritira in difesa e usa ${moveName}! Recupera +${healAmount} HP.`);
          
          playMooSfx();

          return {
            ...prev,
            opponentHp: nextOppHp,
            opponentEnergy: Math.min(100, prev.opponentEnergy + 20),
            activeTurn: 'player',
            opponentAttackAnim: true,
            history: [...logs, `🟢 Tocca alle tue scelte! Quale mossa sferri?`].slice(-10)
          };
        } else {
          // Check player evasion rating
          const playerEvasion = prev.playerEvasionBuff || 0;
          const arenaEvasionBonus = prev.arenaId === 'morgex' ? 0.20 : 0;
          const badgeEvasionBonus = trainerBadges.includes('morgex') ? 0.15 : 0;
          const finalEvadeCheck = playerEvasion + arenaEvasionBonus + badgeEvasionBonus;

          const isPlayerEvaded = Math.random() < finalEvadeCheck;

          if (isPlayerEvaded) {
            logs.push(`💨 Fantastico! Il tuo ${prev.playerVazzamon?.name} elude e schiva con stile l'attacco ${moveName}! Nessun danno subìto.${trainerBadges.includes('morgex') ? " (Schivata Vigneto)" : ""}`);
            playClickSfx();

            return {
              ...prev,
              activeTurn: 'player',
              opponentAttackAnim: true,
              history: [...logs, `🟢 Tocca a te! Il nemico ha fallito, colpisci!`].slice(-10)
            };
          } else {
            // Apply defense reduction curves
            const playerDef = prev.playerDefenseBuff || 0;
            const arenaDefBonus = prev.arenaId === 'fenis' ? 0.25 : 0;
            const badgeDefBonus = trainerBadges.includes('fenis') ? 0.15 : 0;
            const finalDefenseFactor = 1.0 - Math.min(0.75, (playerDef + arenaDefBonus + badgeDefBonus));

            const finalDamage = Math.floor(baseDamage * finalDefenseFactor);
            const nextPlayerHp = Math.max(0, prev.playerHp - finalDamage);

            logs.push(`${moveEmoji} Boss ${prev.opponentVazzamon.name} scaglia ${moveName}! Infligge ${finalDamage} danni.`);
            playHitSfx();

            let status = prev.status;
            let winner = prev.winner;
            if (nextPlayerHp <= 0) {
              status = 'ended';
              winner = 'opponent';
              logs.push(`💀 Il tuo leale compagno ${prev.playerVazzamon?.name} è esausto! Ha dato tutto nell'arena d'alta quota.`);
            }

            return {
              ...prev,
              playerHp: nextPlayerHp,
              opponentEnergy: isSuperReady ? 0 : Math.min(100, prev.opponentEnergy + 25),
              activeTurn: 'player',
              opponentAttackAnim: true,
              status,
              winner,
              history: [...logs, status === 'ended' ? `🏁 L'incontro d'Alpeggio si è chiuso!` : `🟢 Tocca a te! Scegli la mossa strategica.`].slice(-10)
            };
          }
        }
      });

      // Clear animation classes
      setTimeout(() => {
        setGymState(prev => ({ ...prev, opponentAttackAnim: false }));
      }, 300);

    }, 1100);
  };

  // Player execution move action
  const handleExecutePlayerMove = (moveId: 'headbutt' | 'shield' | 'healing' | 'special') => {
    if (gymState.status !== 'active' || gymState.activeTurn !== 'player') return;

    setGymState(prev => {
      if (!prev.playerVazzamon || !prev.opponentVazzamon) return prev;

      const logs = [...prev.history];
      let damage = 0;
      let isHeal = false;
      let healAmount = 0;
      let energyGain = 0;
      let defenseGain = 0;
      let evasionGain = 0;
      let description = '';

      if (moveId === 'headbutt') {
        damage = Math.round(16 + (prev.playerVazzamon.stats.strength * 0.18) + Math.random() * 6);
        energyGain = 18;
        description = `sferra TESTATA D'ALTA QUOTA 💥`;
        playHitSfx();
      } else if (moveId === 'shield') {
        damage = Math.round(7 + (prev.playerVazzamon.stats.strength * 0.08) + Math.random() * 4);
        energyGain = 12;
        defenseGain = 0.35; // +35% defense for combat
        description = `usa CORNO PROTETTIVO 🛡️ alzando le sue barriere di tenacia (+35% difesa)`;
        playHitSfx();
      } else if (moveId === 'healing') {
        if (milkLickUses <= 0) {
          alert("Attenzione! Hai esaurito le ricompense di latte fresco per questo scontro!");
          return prev;
        }
        setMilkLickUses(u => u - 1);
        isHeal = true;
        // Arena Cogne bonus
        const arenaCologneHealBonus = prev.arenaId === 'cogne' ? 30 : 0;
        let baseHeal = Math.round(55 + (prev.playerVazzamon.stats.agility * 0.4) + arenaCologneHealBonus);
        if (trainerBadges.includes('cogne')) {
          baseHeal = Math.round(baseHeal * 1.25);
        }
        healAmount = baseHeal;
        energyGain = 20;
        description = `beve un SORSO DI LATTE REALE 🍼 rigenerando ben +${healAmount} HP con purezza alpina${trainerBadges.includes('cogne') ? " (Bonus Flora)" : ""}`;
        playMooSfx();
      } else if (moveId === 'special') {
        if (prev.energy < 100) {
          alert("L'energia non è ancora carica! Usa attacchi base per riempire l'indicatore.");
          return prev;
        }
        damage = Math.round((26 + prev.playerVazzamon.stats.strength * 0.25) * 2.3);
        energyGain = -100;
        description = `sprigiona la devastante INCORNATA SUPREMA DEL GRAN PARADISO 🔱 frantumando la terra`;
        playVictorySfx();
      }

      // Roll evasion check for Opponent Boss
      const oppEvasion = prev.opponentEvasionBuff || 0;
      const isOppEvaded = !isHeal && Math.random() < oppEvasion;

      let nextOppHp = prev.opponentHp;
      let nextPlayerHp = prev.playerHp;

      if (isHeal) {
        nextPlayerHp = Math.min(prev.playerMaxHp, prev.playerHp + healAmount);
        logs.push(`🍀 ${prev.playerVazzamon.name} ${description}.`);
      } else if (isOppEvaded) {
        logs.push(`💨 Boss ${prev.opponentVazzamon.name} scarta di lato, schivando abilmente la mossa di ${prev.playerVazzamon.name}!`);
      } else {
        // Compute defense formula
        const oppDef = prev.opponentDefenseBuff || 0;
        const totalOppDef = 1.0 - Math.min(0.68, oppDef);

        const finalDamage = Math.round(damage * totalOppDef);
        nextOppHp = Math.max(0, prev.opponentHp - finalDamage);
        logs.push(`⚔️ Il tuo ${prev.playerVazzamon.name} ${description} infliggendo ${finalDamage} danni!`);
      }

      let status = prev.status;
      let winner = prev.winner;

      if (nextOppHp <= 0) {
        status = 'ended';
        winner = 'player';
        
        const currentGym = GYMS.find(g => g.id === selectedArenaId);
        const alreadyHasBadge = trainerBadges.includes(selectedArenaId);
        let winLog = `🏆 RELLA D'ORO! ${prev.playerVazzamon.name} vince gloriosamente la Bataille de Reines! Ricevi +60 🪙 e +500 XP.`;
        
        if (currentGym) {
          if (!alreadyHasBadge) {
            winLog += ` Hai ottenuto la prestigiosa medaglia ${currentGym.badgeEmoji} ${currentGym.badgeName}! Bonus attivo: ${currentGym.bonusDesc}`;
            setTrainerBadges(badges => [...badges, selectedArenaId]);
          } else {
            winLog += ` Hai difeso valorosamente la medaglia ${currentGym.badgeEmoji} ${currentGym.badgeName}!`;
          }
        }
        
        logs.push(winLog);
        
        // Save resource update mechanics
        addTrainerXp(500);
        setTrainer(t => ({ ...t, coins: t.coins + 60 }));
      }

      const updatedState: BattleState = {
        ...prev,
        opponentHp: nextOppHp,
        playerHp: nextPlayerHp,
        energy: moveId === 'special' ? 0 : Math.min(100, prev.energy + energyGain),
        playerDefenseBuff: Math.max(0, (prev.playerDefenseBuff || 0) + (defenseGain ? 0.35 : 0) - 0.05), // decays slightly per turn
        playerAttackAnim: true,
        status,
        winner,
        history: logs.slice(-10)
      };

      if (status === 'ended') {
        return updatedState;
      } else {
        setTimeout(() => {
          executeOpponentTurn(updatedState);
        }, 150);
        return updatedState;
      }
    });

    setTimeout(() => {
      setGymState(prev => ({ ...prev, playerAttackAnim: false }));
    }, 200);
  };

  // Consumable Item utilization during high-intensity battles
  const handleUseBackpackItemInCombat = (itemId: string) => {
    if (gymState.status !== 'active' || gymState.activeTurn !== 'player') return;

    const item = backpack.find(i => i.id === itemId);
    if (!item || item.quantity <= 0) {
      alert("Oggetto non disponibile o esaurito!");
      return;
    }

    playClickSfx();

    // Reduce item quantity safely
    setBackpack(p => p.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i));

    setGymState(prev => {
      if (!prev.playerVazzamon) return prev;
      const logs = [...prev.history];

      let rawHeal = 0;
      let defenseAmount = 0;
      let evasionAmount = 0;
      let msg = '';

      if (itemId === 'item-apple') {
        rawHeal = 150;
        msg = `🍎 Nutri ${prev.playerVazzamon.name} con una Mela Alpina d'Oro! Pura energia che ripristina +150 HP!`;
      } else if (itemId === 'item-hay') {
        defenseAmount = 0.50; // Permanent shield for this bout
        msg = `🌾 Consumi un Fieno delle Vette! Un pasto nutriente che innalza del +50% la sua difesa robusta.`;
      } else if (itemId === 'item-potion') {
        rawHeal = 120;
        msg = `🥚 Sorseggi lo Zabaione alle Erbe! Una ricarica tonificante che ristora ben +120 HP.`;
      } else {
        // Fallback or generic recovery
        rawHeal = 50;
        msg = `🎒 Usato utile strumento nel corso del duello! (+50 HP)`;
      }

      let healAmount = rawHeal;
      if (trainerBadges.includes('cogne') && rawHeal > 0) {
        healAmount = Math.round(rawHeal * 1.25);
        msg += ` (Bonus Flora: +25% HP)`;
      }

      logs.push(msg);

      const nextHp = Math.min(prev.playerMaxHp, prev.playerHp + healAmount);
      const nextDef = (prev.playerDefenseBuff || 0) + defenseAmount;
      const nextEva = (prev.playerEvasionBuff || 0) + evasionAmount;

      const updatedState: BattleState = {
        ...prev,
        playerHp: nextHp,
        playerDefenseBuff: nextDef,
        playerEvasionBuff: nextEva,
        history: logs.slice(-10)
      };

      setTimeout(() => {
        executeOpponentTurn(updatedState);
      }, 150);

      return updatedState;
    });
  };

  // Mid-fight partner swaps
  const handleSwapCombatBuddy = (buddy: Vazzamon) => {
    if (gymState.status !== 'active' || gymState.activeTurn !== 'player') return;

    if (gymState.playerVazzamon?.id === buddy.id) {
      alert("Questo compagno d'alpeggio è già sul campo dell'arena!");
      return;
    }

    playClickSfx();

    setGymState(prev => {
      const logs = [...prev.history];
      logs.push(`🔄 Richiami ${prev.playerVazzamon?.name} in panchina. Scende in campo l'inespugnabile ${buddy.name} (CP ${buddy.cp})!`);

      const newMaxHp = 320 + buddy.level * 18;

      const updatedState: BattleState = {
        ...prev,
        playerVazzamon: buddy,
        playerMaxHp: newMaxHp,
        playerHp: Math.min(newMaxHp, prev.playerHp > 0 ? prev.playerHp : newMaxHp), // Maintain current HP levels or reset on clean entry
        history: logs.slice(-10)
      };

      // Set combat selection index
      setActiveCombatantId(buddy.id);

      setTimeout(() => {
        executeOpponentTurn(updatedState);
      }, 250);

      return updatedState;
    });
  };

  // ---- 11. GEMINI DNA SCANNER BACKEND HANDLERS ----
  const processImageScanGo = async (imgBase64: string | null) => {
    playClickSfx();
    setIsScanning(true);
    setScanProgress(5);
    setScanMessage("Aggancio antenna satellitare Monte Bianco...");

    const intervals = [
      "Caricamento lenti polarizzate d'alpeggio...",
      "Rilevamento geni della Castana Valdostana...",
      "Valutazione densità erbe alpine...",
      "Misurazione percentuale umidità alpeggi COGNE...",
      "Generazione modello genomico..."
    ];

    let currentStep = 0;
    const timer = setInterval(() => {
      if (currentStep < intervals.length) {
        setScanProgress(p => Math.min(p + 18, 90));
        setScanMessage(intervals[currentStep]);
        currentStep++;
      }
    }, 550);

    try {
      const response = await fetch('/api/generate-vazzamon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imgBase64, isDemo: false })
      });

      const parsed: Vazzamon = await response.json();
      
      clearInterval(timer);
      setScanProgress(100);
      setScanMessage("DNA sintetizzato correttamente!");

      // Supply CP & level calculations
      const str = parsed.stats.strength;
      const def = parsed.stats.defense;
      const agl = parsed.stats.agility;
      const calculatedCp = Math.floor((str * 2 + def + agl) * (1.1 + (parsed.rarity === 'Leggendaria' ? 1.0 : parsed.rarity === 'Epica' ? 0.5 : parsed.rarity === 'Rara' ? 0.2 : 0)));

      const fullySynthesized: Vazzamon = {
        ...parsed,
        cp: calculatedCp,
        level: 15
      };

      setTimeout(() => {
        playMooSfx();
        setEncounterCow(fullySynthesized);
        setIsCapturingMode(true); // Direct to AR catching view!
        setIsScanning(false);
        setScanImage(null);
        stopCamera();
      }, 700);

    } catch (e) {
      console.error(e);
      clearInterval(timer);
      setIsScanning(false);
    }
  };

  const handleFileUploadGo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      setScanImage(res);
      processImageScanGo(res);
    };
    reader.readAsDataURL(file);
  };

  const startCameraGo = async () => {
    playClickSfx();
    try {
      setCameraStreamActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log(e));
      }
    } catch (err) {
      console.warn("Camera hardware not available, falling back beautifully.", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraStreamActive(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-slate-100 antialiased selection:bg-emerald-500 selection:text-white" id="vazzamon-go-app">
      
      {/* 🎒 MAIN HUD STATUS BAR (POKEMON GO STYLE) 🎒 */}
      <header className="bg-slate-950 border-b border-emerald-900/60 p-3 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          
          {/* Trainer Avatar Info */}
          <div className="flex items-center gap-3">
            <div className="relative cursor-pointer" onClick={() => { playClickSfx(); alert("Sei un fiero Allevatore e Trekker della Valle d'Aosta! Cammina nei pascoli per completare lo svezzamento dei vitellini e collezionare le Regine."); }}>
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500 bg-slate-850 flex items-center justify-center overflow-hidden shadow-inner">
                <span className="text-2xl">👨‍🌾</span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                {trainer.level}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-sm tracking-wide text-emerald-400">VAZZAMON GO</span>
                <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                  Valle d'Aosta
                </span>
              </div>
              
              {/* Level progress bar */}
              <div className="flex items-center gap-2 mt-1">
                <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-400 h-2 rounded-full" style={{ width: `${(trainer.xp / trainer.xpToNextLevel) * 100}%` }} />
                </div>
                <span className="text-[9px] font-mono text-slate-400 font-bold">{trainer.xp}/{trainer.xpToNextLevel} XP</span>
              </div>
            </div>
          </div>

          {/* Wallet and backpack stats summary */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl py-1.5 px-3 flex items-center gap-1">
              <span className="text-amber-400 font-bold">🪙</span>
              <span className="text-xs font-mono font-extrabold text-amber-300">{trainer.coins}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl py-1.5 px-3 flex items-center gap-1" title="Chilometri Camminati">
              <span className="text-emerald-400 text-xs">🥾</span>
              <span className="text-xs font-mono font-extrabold text-slate-300">{trainer.kmTraveled} km</span>
            </div>

            <button
              onClick={() => { playClickSfx(); setSoundEnabled(!soundEnabled); }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>
          </div>

        </div>
      </header>

      {/* 🧭 PRIMARY MAIN TABS NAVIGATION 🧭 */}
      <nav className="bg-slate-950/90 border-b border-slate-850 sticky top-[73px] z-40 shadow-inner">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-0.5 p-1 text-[11px] font-extrabold">
          <button
            onClick={() => { playClickSfx(); setActiveTab('map'); }}
            className={`flex flex-col items-center py-2 rounded-xl transition-all ${activeTab === 'map' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <Compass className="w-4 h-4 mb-0.5" />
            <span>Mappa</span>
          </button>

          <button
            onClick={() => { playClickSfx(); setActiveTab('scanner'); }}
            className={`flex flex-col items-center py-2 rounded-xl transition-all ${activeTab === 'scanner' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <Camera className="w-4 h-4 mb-0.5" />
            <span>AR Scan</span>
          </button>

          <button
            onClick={() => { playClickSfx(); setActiveTab('eggs'); }}
            className={`flex flex-col items-center py-2 rounded-xl transition-all relative ${activeTab === 'eggs' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <Gift className="w-4 h-4 mb-0.5" />
            <span>Vitelli</span>
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          </button>

          <button
            onClick={() => { playClickSfx(); setActiveTab('vazzadex'); }}
            className={`flex flex-col items-center py-2 rounded-xl transition-all relative ${activeTab === 'vazzadex' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <BookOpen className="w-4 h-4 mb-0.5" />
            <span>Vazzadex</span>
            {vazzadex.length > 0 && (
              <span className="absolute top-1 right-2 bg-amber-500 text-slate-950 text-[9px] px-1.5 rounded-full font-black">
                {vazzadex.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { playClickSfx(); setActiveTab('battle'); }}
            className={`flex flex-col items-center py-2 rounded-xl transition-all ${activeTab === 'battle' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <Swords className="w-4 h-4 mb-0.5" />
            <span>Gym</span>
          </button>
        </div>
      </nav>

      {/* 🗺️ ACTIVE VIEW DISPLAY 🗺️ */}
      <main className="flex-grow p-4 md:p-6 max-w-4xl w-full mx-auto" id="app-viewport">
        
        {/* VIEW 1: INTERACTIVE MAP OVERWORLD */}
        {activeTab === 'map' && (
          <div className="space-y-6" id="overworld-view">
            <div className="bg-slate-950 rounded-3xl p-5 border border-slate-850 relative overflow-hidden shadow-2xl">
              
              {/* Overworld Title HUD */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 z-10 relative border-b border-slate-900 pb-4">
                <div>
                  <h2 className="text-xl font-mono font-black text-emerald-400 flex items-center gap-1.5 uppercase">
                    <Compass className="w-5 h-5 text-emerald-500" />
                    Sentiero d'Alta Quota
                  </h2>
                  <p className="text-xs text-slate-400">Esplora la Valle d'Aosta reale. Tocca le casere o cattura i Vazzamon sul cammino!</p>
                </div>

                {/* Map Mode Toggle & Simulated Walk in flex */}
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  {/* Selector Segment */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => { playClickSfx(); setMapMode('real'); }}
                      className={`font-mono text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${mapMode === 'real' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-850'}`}
                    >
                      Mappa OSM Reale
                    </button>
                    <button
                      onClick={() => { playClickSfx(); setMapMode('radar'); }}
                      className={`font-mono text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${mapMode === 'radar' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-850'}`}
                    >
                      Radar Sonar
                    </button>
                  </div>

                  {/* Hike Button */}
                  <button
                    onClick={handleSimulatedWalk}
                    className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl shadow active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-b-2 border-emerald-700 ml-auto sm:ml-0"
                    id="simulate-walk-btn"
                  >
                    <Footprints className="w-4 h-4 fill-current animate-bounce" />
                    CAMMINA 500m
                  </button>
                </div>
              </div>

              {/* Conditional Map View Frame */}
              {mapMode === 'real' ? (
                /* GEOGRAPHIC INTERACTIVE REAL MAP VIEW */
                <div className="relative w-full h-[400px] sm:h-[450px] bg-slate-900 border-2 border-emerald-500/20 rounded-2xl overflow-hidden shadow-inner group z-0">
                  <div ref={mapContainerRef} className="w-full h-full" id="real-gps-map" />
                  
                  {/* Overlay HUD status regarding current trekking location */}
                  <div className="absolute top-3 left-3 bg-slate-950/95 border border-slate-855 font-mono text-[9px] text-slate-200 px-3.5 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl pointer-events-none z-35 max-w-[260px] space-y-1.5">
                    <span className="text-emerald-400 font-extrabold uppercase block tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-500 animate-bounce" />
                      Tappa Attuale
                    </span>
                    <div className="font-mono text-[11px] font-black text-slate-100 truncate">{currentWaypoint.name}</div>
                    <div className="text-slate-400 text-[8.5px]">Coordinate: <span className="text-emerald-300 font-bold">{playerLat.toFixed(4)}°N, {playerLng.toFixed(4)}°E</span></div>
                    
                    <div className="pt-1">
                      <div className="w-full bg-slate-900 rounded-full h-1 relative overflow-hidden">
                        <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${waypointProgress}%` }} />
                      </div>
                      <div className="text-[7.5px] text-slate-500 flex justify-between mt-1">
                        <span>Punto Successivo</span>
                        <span>{waypointProgress}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Leaflet Tip Ribbon overlay */}
                  <div className="absolute bottom-2.5 right-2.5 bg-slate-950/80 border border-slate-850 rounded-full py-0.5 px-3 text-[8.5px] text-slate-400 font-mono tracking-tight text-center whitespace-nowrap backdrop-blur-xs z-35">
                    🧀 Tocca i campanacci sulla mappa reale per interagire
                  </div>
                </div>
              ) : (
                /* RADAR MAP INTERACTIVE SVG VISUAL FALLBACK */
                <div className="relative aspect-[16/10] bg-gradient-to-b from-slate-900 to-emerald-950/60 rounded-3xl border-2 border-emerald-500/20 overflow-hidden shadow-inner group">
                  
                  {/* Geodesic radar sonar pinging ring */}
                  <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full border border-emerald-500/10 pointer-events-none animate-radar"></div>
                  <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full border border-emerald-500/20 pointer-events-none animate-radar delay-700"></div>

                  {/* Mountains SVG background silhouette */}
                  <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
                    <path d="M 0 160 L 150 50 L 300 200 L 450 100 L 600 220 L 750 90 L 900 180 Z" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
                    <path d="M 0 240 Q 180 180, 360 270 T 720 220 T 1200 300 L 1200 800 L 0 800 Z" fill="#10b981" />
                  </svg>

                  {/* Trainer in the very center */}
                  <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-slate-100 flex items-center justify-center shadow-lg relative animate-float">
                      <span className="text-xl">🧑‍🌾</span>
                      <span className="absolute -inset-1 rounded-full border-2 border-emerald-300 animate-ping opacity-30"></span>
                    </div>
                    <span className="text-[9px] bg-slate-950/90 text-slate-200 py-0.5 px-2 rounded-full font-mono font-bold mt-1 shadow-md border border-slate-850">
                      Tu (Vetta)
                    </span>
                  </div>

                  {/* POKESTOPS: Traditional Dairy Casere */}
                  {HP_LOCATIONS.map((hp) => {
                    const onCooldown = caseraCooldowns[hp.id] && caseraCooldowns[hp.id] > Date.now();
                    return (
                      <button
                        key={hp.id}
                        onClick={() => { playClickSfx(); setSelectedCasera(hp); setSpinState('idle'); setSpinRewards([]); }}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none z-10"
                        style={{ left: `${hp.x}%`, top: `${hp.y}%` }}
                      >
                        <div className="flex flex-col items-center group/marker">
                          <div className={`w-8 h-8 rounded-full ${onCooldown ? 'bg-slate-700 border-slate-500' : 'bg-blue-500 border-white'} text-white flex items-center justify-center border-2 shadow-lg transition-transform hover:scale-110`}>
                            <RotateCw className={`w-4 h-4 ${onCooldown ? 'text-slate-400' : 'text-blue-200 animate-spin-slow'}`} />
                          </div>
                          <span className="text-[8px] bg-slate-950/80 font-mono text-slate-300 py-0.5 px-1.5 rounded-md mt-1 group-hover/marker:bg-slate-950 border border-slate-800">
                            {hp.name.split(" ")[0]} 🥛
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {/* WILD ROAMING VAZZAMONS POPPING OUT */}
                  {wildCows.map((wc) => (
                    <button
                      key={wc.id}
                      onClick={() => initiateCatchWild(wc)}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none z-10 animate-float"
                      style={{ left: `${wc.x}%`, top: `${wc.y}%`, animationDelay: `${wc.x % 2}s` }}
                    >
                      <div className="flex flex-col items-center group/cow">
                        <div className="relative">
                          {/* Sparkly pointer background */}
                          <div className="absolute -inset-1.5 bg-yellow-500/20 rounded-full animate-ping opacity-60"></div>
                          <VazzamonAvatar breed={wc.vazza.breed} rarity={wc.vazza.rarity} className="w-14 h-14 bg-slate-950/40 rounded-full border border-amber-500/30 p-1 backdrop-blur-xs transition-transform group-hover/cow:scale-125" />
                        </div>
                        <span className="text-[8px] font-mono font-black bg-slate-950/95 text-yellow-400 border border-amber-500/20 px-1.5 py-0.5 rounded shadow">
                          CP {wc.vazza.cp}
                        </span>
                      </div>
                    </button>
                  ))}

                  {/* Bottom instructions ribbon */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/80 border border-slate-800/80 rounded-full py-1 px-4 text-[10px] text-slate-400 font-mono tracking-tight text-center whitespace-nowrap backdrop-blur-xs">
                    🐮 Sintonizzati {wildCows.length} Vazzamon selvatici nelle vicinanze
                  </div>
                </div>
              )}

            </div>

            {/* REAL TREKKING ROUTES SELECTOR PANEL */}
            <div className="bg-slate-950 border border-slate-850 p-5 rounded-3xl space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                <div>
                  <h4 className="text-sm font-mono font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-500" />
                    Sentieri Alpini di Trekking Reali
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-snug">Seleziona e percorri i tracciati montani della Valle d'Aosta. I progressi vengono salvati per ciascun sentiero!</p>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                  {TREK_ROUTES.length} Percorsi
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="trekking-routes-selector">
                {TREK_ROUTES.map((route) => {
                  const isActive = activeRouteId === route.id;
                  const savedIdx = Number(localStorage.getItem(`vazzamon_waypoint_idx_${route.id}`) || 0);
                  const savedProg = Number(localStorage.getItem(`vazzamon_waypoint_progress_${route.id}`) || 0);
                  const currentWpName = route.coords[savedIdx]?.name || "Inizio";
                  
                  return (
                    <div 
                      key={route.id}
                      onClick={() => {
                        playClickSfx();
                        setActiveRouteId(route.id);
                        setTrekkingFeed(prev => [
                          `🥾 Sei entrato sul percorso: ${route.name}!`,
                          `🏔️ Posizione attuale del tuo cammino: ${currentWpName}`,
                          ...prev.slice(0, 7)
                        ]);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.01] active:scale-95 text-left h-full ${
                        isActive 
                          ? 'bg-emerald-950/20 border-emerald-500/80 shadow-md shadow-emerald-500/5' 
                          : 'bg-slate-900/40 border-slate-850/80 hover:bg-slate-900 hover:border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-2xl">{route.icon}</span>
                          <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded-full ${
                            route.difficulty === 'Alpinistico' 
                              ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' 
                              : route.difficulty === 'Escursionistico' 
                              ? 'bg-sky-500/10 text-sky-450 border border-sky-500/20' 
                              : 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'
                          }`}>
                            {route.difficulty}
                          </span>
                        </div>
                        
                        <div>
                          <h5 className="font-mono font-black text-xs text-slate-100 uppercase tracking-tight line-clamp-1">{route.name.split(" (")[0]}</h5>
                          <p className="text-[9.5px] text-slate-400 font-mono mt-0.5 leading-none">Distanza: <span className="text-emerald-400 font-extrabold">{route.lengthKm} km</span></p>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-snug line-clamp-2 mt-1.5">{route.description}</p>
                      </div>

                      <div className="border-t border-slate-900/60 pt-2.5 mt-3 space-y-1">
                        <div className="flex justify-between items-center text-[8.5px] font-mono">
                          <span className="text-slate-500">Tappa attuale:</span>
                          <span className="text-slate-300 font-black truncate max-w-[130px]">{currentWpName.split(" (")[0]}</span>
                        </div>
                        <div className="flex justify-between items-center text-[8.5px] font-mono">
                          <span className="text-slate-500">Avanzamento:</span>
                          <span className="text-emerald-400 font-extrabold">Tappa {savedIdx + 1}/{route.coords.length} ({savedProg}%)</span>
                        </div>
                        
                        {isActive && (
                          <div className="bg-emerald-500 text-slate-950 text-[8px] font-mono font-black uppercase text-center py-1 rounded-md tracking-wider mt-2.5 animate-pulse">
                            CAMMINO ATTIVO 🥾
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LIVE TREKKING ACTIVITY FEED LOG */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-3xl space-y-2">
              <h4 className="text-xs font-mono font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Footprints className="w-4 h-4 text-emerald-500" />
                Diario di Bordo del Camminatore Alpino
              </h4>
              <div className="bg-slate-900/60 border border-slate-850/80 rounded-2xl p-3 max-h-[140px] overflow-y-auto space-y-2 no-scrollbar">
                {trekkingFeed.length === 0 ? (
                  <p className="text-[10px] text-slate-500 font-mono">Inizia a camminare per sintonizzare nuovi eventi sul sentiero...</p>
                ) : (
                  trekkingFeed.map((feedItem, index) => (
                    <div key={index} className="flex items-start gap-1.5 text-[10px] font-mono leading-relaxed border-b border-slate-850/30 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-emerald-500 mt-0.5">❖</span>
                      <span className="text-slate-200">{feedItem}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RADAR SILHOUETTE NEARBY PANEL */}
            <div className="bg-slate-950 border border-slate-850 rounded-3xl p-4">
              <h4 className="text-xs font-mono font-extrabold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-550" />
                Vazzamon Selvatici Vicini (Sospetti)
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {WILD_BREEDS.map((breed, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-500">{(idx + 1) * 150}m</div>
                    <div className="w-14 h-14 brightness-0 opacity-40 group-hover:opacity-60 transition-opacity">
                      <VazzamonAvatar breed={breed} rarity="Comune" className="w-12 h-12" />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-full">{breed}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CASCADING OVERLAY MODAL: SPIN MOUNTAIN DAIRY (POKESTOP) */}
        {selectedCasera && (
          <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in" id="pokestop-modal">
            <div className="bg-slate-900 border-2 border-blue-500 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl relative">
              
              <button
                onClick={() => { playClickSfx(); setSelectedCasera(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>

              <div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-400 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-500/20">
                  PokéStop d'Alpeggio 🏔️
                </span>
                <h3 className="text-xl font-mono font-black text-slate-100 mt-2">{selectedCasera.name}</h3>
                <p className="text-xs text-slate-400">{selectedCasera.valley}</p>
              </div>

              {/* Spinning photo-disc graphics */}
              <div className="flex justify-center py-4">
                <div className="relative w-40 h-40 rounded-full border-4 border-blue-400 flex items-center justify-center bg-slate-800 overflow-hidden shadow-inner cursor-pointer" onClick={handleSpinCasera}>
                  
                  {/* Photo representation in rotate transition frame */}
                  <div 
                    className="w-full h-full rounded-full transition-transform duration-[2800ms] ease-out border-4 border-slate-900"
                    style={{ transform: `rotate(${spinDeg}deg)`, backgroundImage: 'radial-gradient(circle, #10b981 0%, #064e3b 100%)' }}
                  >
                    {/* Concentric rings styled like camera disc */}
                    <div className="absolute inset-2 border-2 border-dashed border-white/20 rounded-full"></div>
                    <div className="absolute inset-8 border border-white/10 rounded-full"></div>
                    <div className="absolute inset-14 bg-slate-900 rounded-full flex items-center justify-center text-3xl">🥛</div>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
                </div>
              </div>

              <div className="space-y-2">
                {spinState === 'idle' && (
                  <button
                    onClick={handleSpinCasera}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-xs py-3 rounded-xl shadow-lg border-b-4 border-blue-800 cursor-pointer"
                  >
                    SPINGI PER RUOTARE IL DISCO!
                  </button>
                )}

                {spinState === 'spinning' && (
                  <div className="py-2 text-blue-400 font-mono text-xs font-bold animate-pulse">
                    Munta & Analisi d'Alpeggio in corso...
                  </div>
                )}

                {spinState === 'rewarded' && (
                  <div className="space-y-3">
                    <p className="text-xs text-green-400 font-mono font-bold">Rifornimento Sbloccato con Successo! 🎒</p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {spinRewards.map((r, i) => (
                        <span key={i} className="text-xs font-mono font-black bg-slate-950 text-amber-300 border border-amber-500/20 py-1 px-3 rounded-full animate-bounce">
                          {r}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => setSelectedCasera(null)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs py-2 rounded-xl"
                    >
                      Ottimo! Chiudi zaino
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-slate-400 italic font-sans px-4">
                "{selectedCasera.description}"
              </p>

            </div>
          </div>
        )}

        {/* WILD CAPTURE / AR WILD ENCOUNTER SCREEN */}
        {isCapturingMode && encounterCow && (
          <div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-4 animate-scale-in" id="encounter-screen">
            <div className="bg-gradient-to-b from-sky-950 via-emerald-950 to-slate-900 border-2 border-emerald-500/50 rounded-3xl max-w-lg w-full aspect-[3/4] p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              
              {/* Back out button */}
              <button
                onClick={() => { playClickSfx(); setIsCapturingMode(false); setEncounterCow(null); }}
                className="absolute top-4 left-4 z-20 bg-slate-950/70 text-slate-300 py-1.5 px-3 rounded-xl hover:text-slate-100 transition-colors flex items-center gap-1 cursor-pointer text-xs font-bold"
              >
                <X className="w-4 h-4" />
                Fuggi al sentiero
              </button>

              {/* Stat HUD Top Card */}
              <div className="bg-slate-950/80 border border-slate-850 p-3 rounded-2xl z-10 flex items-center justify-between gap-4 mt-6">
                <div>
                  <h3 className="font-mono font-black text-amber-400 tracking-tight flex items-center gap-1.5 text-base">
                    {encounterCow.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[10.5px] text-slate-400 mt-0.5">
                    <span>Razza: {encounterCow.breed}</span>
                    <span className="text-slate-600">•</span>
                    <span className={`font-bold ${encounterCow.rarity === 'Leggendaria' ? 'text-amber-400' : encounterCow.rarity === 'Epica' ? 'text-purple-400' : 'text-blue-400'}`}>{encounterCow.rarity}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-mono">PUNTI COMBAT</div>
                  <div className="font-mono font-black text-xl text-yellow-400 leading-none">CP {encounterCow.cp}</div>
                </div>
              </div>

              {/* IMMERSIVE MIDDLE STAGE: BOUNCING COW & SHRINKING CAPTURE RING */}
              <div className="flex-grow flex flex-col items-center justify-center relative my-4">
                
                {/* Simulated landscape grid */}
                <div className="absolute inset-x-0 bottom-10 h-1 bg-emerald-500/10 border-b border-emerald-500/5 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center">
                  
                  {/* Bouncing Cow Avatar with Custom Keyframe Glow */}
                  <div className={`transition-all duration-300 ${captureStep === 'wobbling' ? 'scale-0 translate-y-24 opacity-0 rotate-180 duration-[1200ms]' : captureStep === 'secured' ? 'opacity-0 scale-0' : 'animate-bounce'}`}>
                    <VazzamonAvatar breed={encounterCow.breed} rarity={encounterCow.rarity} className="w-36 h-36" />
                  </div>

                  {/* Circular target shrinking selector HUD */}
                  {captureStep === 'aiming' && (
                    <div 
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 flex items-center justify-center transition-all duration-75"
                      style={{
                        width: `${targetRingScale * 110}px`,
                        height: `${targetRingScale * 110}px`,
                        borderColor: hasFedApple ? '#10b981' : encounterCow.rarity === 'Leggendaria' ? '#ef4444' : '#f59e0b',
                        boxShadow: `0 0 10px ${hasFedApple ? '#10b981' : '#f59e0b'}`
                      }}
                    >
                      {/* Inner pulsing core point */}
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                    </div>
                  )}

                  {/* Golden schweiz bell capture wobbling representation */}
                  {captureStep === 'wobbling' && (
                    <div className="animate-wobble flex flex-col items-center">
                      <div className="w-16 h-16 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center shadow-2xl relative">
                        <span className="text-3xl">🔔</span>
                        <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full animate-ping"></span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-300 mt-2 animate-pulse">SI SVEGLIERÀ?</span>
                    </div>
                  )}

                  {/* Success capture sparkle overlay */}
                  {captureStep === 'secured' && (
                    <div className="text-center p-3 space-y-2 animate-scale-in">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center text-3xl animate-bounce">
                        ✨💖✨
                      </div>
                      <h4 className="font-mono font-black text-xl text-emerald-400 capitalize">REINA SILLY CATTURATA!</h4>
                      <p className="text-xs text-slate-300 font-mono">+120 XP • +25 Monete 🪙</p>
                    </div>
                  )}

                  {/* Escaped alert */}
                  {captureStep === 'escaped' && (
                    <div className="text-center p-3 space-y-2 animate-pulse">
                      <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-400 mx-auto flex items-center justify-center text-3xl">
                        💨🐂
                      </div>
                      <h4 className="font-mono font-black text-lg text-red-400">Si è spezzato lo scontro!</h4>
                      <p className="text-xs text-slate-300">La Regina è sfuggita lungo i boschi.</p>
                    </div>
                  )}

                </div>

              </div>

              {/* ADVENTURE CAPTURE UTILITY CONSOLE BOX */}
              <div className="bg-slate-950/95 border-b-2 border-slate-850 p-4 rounded-2xl z-10 space-y-3">
                
                {/* Console Log Logline */}
                <div className="text-center text-[11px] font-mono text-emerald-400 leading-none">
                  📟 {captureLogMsg}
                </div>

                {captureStep === 'aiming' && (
                  <div className="space-y-3">
                    
                    {/* Throw speed bar indicator */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Puntamento Forza del Lancio</span>
                        <span className="font-bold text-amber-400">⚡ {throwSpeedGauge}%</span>
                      </div>
                      <div className="relative bg-slate-850 rounded-full h-3.5 overflow-hidden border border-slate-700/80">
                        {/* Perfect capture range highlight zone */}
                        <div className="absolute inset-y-0 left-[75%] right-[8%] bg-green-500/30 border-x border-green-400/40" title="Zona Perfetta" />
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full rounded-full transition-all duration-75"
                          style={{ width: `${throwSpeedGauge}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-0.5">
                      
                      {/* Interactive Feed apple */}
                      <button
                        onClick={handleFeedApple}
                        disabled={hasFedApple || backpack.find(item => item.id === 'item-apple')?.quantity === 0}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:opacity-50 py-2 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all group"
                      >
                        <span className="text-xl group-hover:scale-125 transition-transform">🍏</span>
                        <span className="text-[9px] font-mono text-slate-300 mt-1">Mela Alpina d'Oro</span>
                        <span className="text-[9px] font-bold text-emerald-400 mt-0.5">({backpack.find(item => item.id === 'item-apple')?.quantity || 0})</span>
                      </button>

                      {/* Launch Trigger Button */}
                      <button
                        onClick={executeThrow}
                        className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-mono font-black text-xs px-2 rounded-xl border-b-4 border-amber-700 flex flex-col items-center justify-center text-center active:scale-95 cursor-pointer"
                        id="throw-btn"
                      >
                        <span className="text-lg">📢</span>
                        <span>CATTURA!</span>
                      </button>

                      {/* Select active ball drawer menu */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex flex-col items-center justify-between text-center">
                        <select
                          value={selectedBallId}
                          onChange={(e) => setSelectedBallId(e.target.value)}
                          className="bg-slate-950 text-amber-300 font-mono text-[9px] font-bold p-1 rounded-md border border-slate-800 tracking-tight outline-none w-full text-center"
                        >
                          {backpack.filter(item => item.type === 'ball').map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.quantity})
                            </option>
                          ))}
                        </select>
                        <span className="text-[8px] text-slate-400 mt-1 uppercase tracking-wider font-mono font-bold">Armamento</span>
                      </div>

                    </div>

                  </div>
                )}

                {captureStep !== 'aiming' && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => { playClickSfx(); setIsCapturingMode(false); setEncounterCow(null); }}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-mono text-xs py-2 px-8 rounded-xl cursor-pointer"
                    >
                      Torna al Sentiero
                    </button>
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: AR LAB DNA SYNTHESIZER SCANNER */}
        {activeTab === 'scanner' && (
          <div className="space-y-6" id="scanner-view">
            <div className="bg-slate-950 rounded-3xl p-5 border border-slate-850 shadow-md">
              <h2 className="text-xl font-mono font-black text-emerald-400 flex items-center gap-1.5 uppercase">
                <Camera className="w-5 h-5" />
                Sintesi DNA Spaziale Valdostana
              </h2>
              <p className="text-xs text-slate-400 mt-1">Carica uno scatto dei pascoli, dei monti vette o di un fiero bovino alpino. Gemini 3.5-flash leggerà i segnali biogeografici della vallata per estrapolare un Vazzamon esclusivo!</p>

              {!isScanning && (
                <div className="mt-5 border-2 border-dashed border-slate-800 bg-slate-900/40 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                  {cameraStreamActive ? (
                    <div className="w-full max-w-sm space-y-4">
                      <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md border border-emerald-500/20 bg-black">
                        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                        <div className="absolute inset-5 border border-dashed border-yellow-400/40 rounded-xl flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-mono text-yellow-400 animate-pulse">AGGANCA DNA BOVINO</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => processImageScanGo(null)}
                          className="flex-grow bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow border-b-2 border-emerald-700"
                        >
                          Sintonizza Immagine
                        </button>
                        <button
                          onClick={stopCamera}
                          className="bg-slate-800 hover:bg-slate-705 text-slate-400 py-2.5 px-4 rounded-xl text-xs"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-sm">
                      <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl mx-auto shadow-inner">
                        📤
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-200 text-sm">Carica o Scatta una foto alpina</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">JPEG, PNG supportati. Saranno conservati nel cloud.</p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full sm:w-auto bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                        >
                          Carica File No-Limits
                        </button>
                        <button
                          onClick={startCameraGo}
                          className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                        >
                          Usa Fotocamera AR
                        </button>
                      </div>

                      <input type="file" ref={fileInputRef} onChange={handleFileUploadGo} className="hidden" accept="image/*" />

                      <div className="py-2 flex items-center text-slate-700 text-[10px] uppercase font-mono tracking-widest justify-center">
                        <div className="flex-grow border-t border-slate-800"></div>
                        <span className="mx-3">oppure</span>
                        <div className="flex-grow border-t border-slate-800"></div>
                      </div>

                      <button
                        onClick={() => processImageScanGo(null)}
                        className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-850 py-2 rounded-xl text-yellow-400 font-mono text-xs font-bold transition-all cursor-pointer shadow active:scale-95"
                      >
                        🔮 Catalizza Vazzamon Misterioso Subito!
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Loader progressing overlay */}
              {isScanning && (
                <div className="py-8 space-y-4 max-w-sm mx-auto text-center animate-pulse" id="scan-bar-loader">
                  <div className="w-14 h-14 mx-auto rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-mono font-black text-emerald-400 text-sm">Sintesi Alpeggio in corso...</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-1 italic">"{scanMessage}"</p>
                  </div>
                  <div className="bg-slate-850 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* VIEW 3: CALF GESTATION & WEANING STABLE */}
        {activeTab === 'eggs' && (
          <div className="space-y-6" id="hatchery-tab-view">
            <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-mono font-black text-emerald-400 flex items-center gap-1.5 uppercase">
                    <Gift className="w-5 h-5" />
                    Culla dei Vitellini Alpini
                  </h2>
                  <p className="text-xs text-slate-400">I piccoli vitellini necessitano che tu cammini o simuli l'escursionismo per completare la crescita e lo svezzamento d'alta quota. Accompagnali nei pascoli alpini per far nascere nuove splendide Regine!</p>
                </div>
                
                {/* Walk triggers direct step inside the hatchery */}
                <button
                  onClick={handleSimulatedWalk}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-mono font-black text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Footprints className="w-4 h-4 text-emerald-400" />
                  PASSO 500m!
                </button>
              </div>

              {/* Grid of incubating calves */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {eggs.map((egg) => {
                  const progressPct = Math.min((egg.kmWalked / egg.kmRequired) * 100, 100);
                  const rarityLabelColor = 
                    egg.rarity === 'Epica' ? 'text-purple-400 border-purple-500/20' :
                    egg.rarity === 'Rara' ? 'text-blue-400 border-blue-500/20' : 'text-slate-400 border-slate-800';

                  return (
                    <div key={egg.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden flex items-center gap-4 group hover:border-slate-700 transition-colors">
                      
                      {/* Glass Tube Capsule Overlay */}
                      <div className="w-16 h-24 rounded-full border-2 border-slate-800 bg-slate-950 flex flex-col justify-end p-1 relative overflow-hidden shadow-inner group-hover:border-slate-700">
                        {/* Bubbles or liquid gradient indicating incubation progress */}
                        <div className="absolute inset-x-0 bottom-0 bg-emerald-500/10 transition-all duration-500" style={{ height: `${progressPct}%` }}></div>
                        
                        {/* Animated Calf weaning graphics */}
                        <div className="w-12 h-12 bg-amber-100 rounded-full border-2 border-amber-600/40 shadow-md mx-auto mb-4 flex items-center justify-center animate-float relative">
                          <span className="text-2xl">🍼</span>
                        </div>

                        {/* Tiny glass reflection strip */}
                        <div className="absolute right-1.5 top-2 bottom-2 w-1.5 rounded-full bg-white/5 pointer-events-none"></div>
                      </div>

                      <div className="flex-grow space-y-2">
                        <div>
                          <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border bg-slate-950 tracking-wide ${rarityLabelColor}`}>
                            Vitellino {egg.rarity}
                          </span>
                          <h4 className="font-mono font-extrabold text-sm text-slate-100 mt-1.5">Svezzamento e Crescita</h4>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono text-slate-400">
                            <span>Sviluppo Vitello</span>
                            <span className="font-bold text-slate-200">{egg.kmWalked} / {egg.kmRequired} km</span>
                          </div>
                          
                          {/* Progress slider bar */}
                          <div className="bg-slate-950 border border-slate-850 rounded-full h-2 overflow-hidden shadow-inner">
                            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-2 rounded-full" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>

                        <p className="text-[9.5px] text-slate-500">Accompagna il vitellino nelle camminate d'alta quota per completare la crescita e vederlo svezzato in stalla!</p>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

        {/* VIEW 4: DETAILS/VAZZADEX SHEET LIST */}
        {activeTab === 'vazzadex' && (
          <div className="space-y-6" id="vazzadex-tab-view">
            
            {/* Quick interactive Bell soundboard bar */}
            <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-mono font-black text-emerald-400 flex items-center gap-1.5 uppercase">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  Vazzadex Collezione
                </h2>
                <p className="text-xs text-slate-400">Archivio biometrico del genoma delle bovine sintonizzate durante le tue scalate.</p>
              </div>

              <div
                onClick={() => { playMooSfx(); if (soundEnabled) soundEngine.playVictoryFanfare(); }}
                className="bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer border border-amber-500/20 rounded-2xl py-2 px-4 text-amber-300 flex items-center gap-2 transform active:scale-95 transition-all text-xs"
              >
                <span className="text-xl">🔔</span>
                <div className="text-left font-mono">
                  <div className="font-black text-[9px] uppercase">Rintocco d'Onore</div>
                  <div className="text-[8px] text-slate-400">Richiamo ornamentale vacca</div>
                </div>
              </div>
            </div>

            {/* Grid display with Search filters */}
            <div className="bg-slate-950 border border-slate-850 rounded-3xl p-4 space-y-4">
              
              {/* Dynamic search / rarity ribbon controllers */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative w-full sm:flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={dexSearch}
                    onChange={(e) => setDexSearch(e.target.value)}
                    placeholder="Filtra per nome o razza..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-700 font-mono"
                  />
                </div>

                <div className="flex gap-1 w-full sm:w-auto font-mono text-[10.5px]">
                  {['All', 'Comune', 'Rara', 'Epica', 'Leggendaria'].map((rarity) => (
                    <button
                      key={rarity}
                      onClick={() => setDexRarityFilter(rarity)}
                      className={`flex-1 sm:flex-none py-1.5 px-2.5 rounded-lg border font-bold transition-all whitespace-nowrap cursor-pointer ${dexRarityFilter === rarity ? 'bg-amber-500 border-amber-500 text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      {rarity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid cards collection display */}
              {vazzadex.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/10 border border-slate-850 rounded-2xl p-6">
                  <p className="text-slate-500 text-xs font-mono">Nessuna Regina sintonizzata corrispondente ai criteri.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950" id="collection-grid">
                  {vazzadex
                    .filter(cow => {
                      const textMatch = cow.name.toLowerCase().includes(dexSearch.toLowerCase()) || cow.breed.toLowerCase().includes(dexSearch.toLowerCase());
                      const rarityMatch = dexRarityFilter === 'All' || cow.rarity === dexRarityFilter;
                      return textMatch && rarityMatch;
                    })
                    .map((cow) => {
                      const isActiveBuddy = cow.id === activeCombatantId;
                      const edgeColor = 
                        cow.rarity === 'Leggendaria' ? 'border-amber-500/40 hover:border-amber-400' :
                        cow.rarity === 'Epica' ? 'border-purple-500/40 hover:border-purple-400' :
                        cow.rarity === 'Rara' ? 'border-blue-500/40 hover:border-blue-400' : 'border-slate-850 hover:border-slate-700';

                      return (
                        <div
                          key={cow.id}
                          onClick={() => { playClickSfx(); setSelectedVazzamon(cow); }}
                          className={`relative bg-slate-900 border-2 rounded-2xl p-3 text-center cursor-pointer transition-all hover:-translate-y-1 overflow-hidden group shadow ${edgeColor}`}
                        >
                          {isActiveBuddy && (
                            <div className="absolute top-1.5 right-1.5 bg-rose-600 text-[8px] font-mono font-black text-white px-2 py-0.5 rounded-full uppercase shadow">
                              BUDDY 👑
                            </div>
                          )}

                          {/* Aura glow representation inside card */}
                          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-slate-700/5 to-transparent"></div>

                          <div className="my-2.5 flex justify-center">
                            <VazzamonAvatar breed={cow.breed} rarity={cow.rarity} className="w-20 h-20 group-hover:scale-110 transition-transform" />
                          </div>

                          <div className="space-y-1 flex flex-col items-center">
                            <h4 className="font-mono font-extrabold text-[#F5F5DC] text-xs truncate max-w-full leading-none">
                              {cow.name}
                            </h4>
                            <span className="text-[9px] bg-slate-950 font-mono font-black text-yellow-400 border border-slate-800 px-1.5 py-0.5 rounded-md mt-1 shadow-sm uppercase">
                              CP {cow.cp}
                            </span>
                          </div>

                        </div>
                      );
                    })}
                </div>
              )}

            </div>
          </div>
        )}

        {/* DETAILS POPUP MODAL SCREEN FOR SINGLE SELECTED VAZZAMON */}
        {selectedVazzamon && (
          <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in" id="details-modal">
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
              
              <button
                onClick={() => { playClickSfx(); setSelectedVazzamon(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Glowing aura frame matching rarity */}
              <div className="pt-2">
                <span className={`text-[10px] bg-slate-950 border font-mono font-black tracking-widest px-3 py-1 rounded-full uppercase ${
                  selectedVazzamon.rarity === 'Leggendaria' ? 'text-amber-400 border-amber-500/20' :
                  selectedVazzamon.rarity === 'Epica' ? 'text-purple-400 border-purple-500/20' :
                  selectedVazzamon.rarity === 'Rara' ? 'text-blue-400 border-blue-500/20' : 'text-slate-400 border-slate-800'
                }`}>
                  Bovina {selectedVazzamon.rarity}
                </span>
              </div>

              {/* CP & level display */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-500 font-mono tracking-wider">REGISTRO GENOMA</div>
                <h1 className="text-3xl font-mono font-black text-[#F5F5DC] tracking-tight leading-none uppercase">CP {selectedVazzamon.cp}</h1>
                <div className="text-xs text-slate-400 font-mono">Livello {selectedVazzamon.level} • Razza: {selectedVazzamon.breed}</div>
              </div>

              {/* Massive Center Avatar View with Rarity representation classes */}
              <div className="py-4 flex justify-center relative">
                <div className={`absolute inset-4 rounded-full pointer-events-none filter blur-xl ${
                  selectedVazzamon.rarity === 'Leggendaria' ? 'legendary-glow opacity-30' :
                  selectedVazzamon.rarity === 'Epica' ? 'epic-glow opacity-25' :
                  selectedVazzamon.rarity === 'Rara' ? 'rare-glow opacity-20' : 'opacity-0'
                }`}></div>
                <VazzamonAvatar breed={selectedVazzamon.breed} rarity={selectedVazzamon.rarity} className="w-32 h-32 relative z-10 animate-float" />
              </div>

              {/* RPG Stats curved gauges bars */}
              <div className="grid grid-cols-3 gap-2 py-2 bg-slate-950 rounded-2xl border border-slate-850">
                <div>
                  <span className="block font-mono font-black text-sm text-amber-400">{selectedVazzamon.stats.strength}</span>
                  <span className="text-[9.5px] text-slate-400 uppercase font-mono">Forza 🏋️‍♂️</span>
                </div>
                <div>
                  <span className="block font-mono font-black text-sm text-blue-400">{selectedVazzamon.stats.defense}</span>
                  <span className="text-[9.5px] text-slate-400 uppercase font-mono">Difesa 🛡️</span>
                </div>
                <div>
                  <span className="block font-mono font-black text-sm text-emerald-400">{selectedVazzamon.stats.agility}</span>
                  <span className="text-[9.5px] text-slate-400 uppercase font-mono">Agilità ⚡</span>
                </div>
              </div>

              {/* Bio lore snippets */}
              <p className="text-xs text-slate-300 italic px-4 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                "{selectedVazzamon.lore}"
              </p>

              {/* Eco tracker sustainable tip */}
              <div className="bg-emerald-950/40 border-2 border-emerald-900 p-3 rounded-2xl text-left flex gap-1.5">
                <ShieldAlert className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-wide leading-none">Safari Eco-Tip</h4>
                  <p className="text-[10px] text-slate-300 leading-normal">{selectedVazzamon.eco_tip}</p>
                </div>
              </div>

              {/* Pokemon GO Action: Power Up and Transfers */}
              <div className="border-t border-slate-850 pt-3 flex gap-2">
                
                {/* Activate Combat buddy */}
                <button
                  onClick={() => {
                    playClickSfx();
                    setActiveCombatantId(selectedVazzamon.id);
                    setSelectedVazzamon(null);
                  }}
                  className={`flex-1 text-[11px] font-mono font-bold py-2.5 px-3 rounded-xl transition-all shadow ${
                    activeCombatantId === selectedVazzamon.id 
                      ? 'bg-rose-950 text-rose-400 border border-rose-500/30' 
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {activeCombatantId === selectedVazzamon.id ? 'BUDDY ATTIVO 👑' : 'IMPOSTA COMPAGNO'}
                </button>

                {/* Power Up */}
                <button
                  onClick={() => handlePowerUpCow(selectedVazzamon)}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-black text-[11px] py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow border-b-4 border-amber-700 flex items-center justify-center gap-1"
                >
                  🔋 NOCCIOLO CP (+75)
                </button>

                {/* Transfer */}
                <button
                  onClick={() => handleTransferCow(selectedVazzamon)}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors py-2 px-3 rounded-xl"
                  title="Libera al pascolo"
                >
                  🌾 Libera
                </button>

              </div>

            </div>
          </div>
        )}

        {/* VIEW 5: BATAILLE DE REINES (POKÉMON-STYLE TURN-BASED ARENA) */}
        {activeTab === 'battle' && (
          <div className="space-y-6 animate-fade-in" id="battle-tab-view">
            
            {/* Header banner */}
            <div className="bg-gradient-to-r from-red-950 via-slate-900 to-emerald-950 border border-slate-800 rounded-3xl p-6 text-center relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-lg shadow-rose-500/10 text-white animate-pulse">
                  <Swords className="w-8 h-8" />
                </div>
              </div>
              <h2 className="text-2xl font-mono font-black text-slate-100 uppercase tracking-tight">Arena Bataille de Reines 🏆</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                Affronta le grandi bovine regine in incontri olimpici d'alta quota ispirati alle tradizioni valdostane. Scegli la strategia perfetta!
              </p>
            </div>

            {/* CABINET DISPLAY: BACHECA MEDAGLIE & BONUS ALPINI */}
            <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400 animate-bounce" />
                  <h3 className="font-mono font-black text-sm text-slate-100 uppercase tracking-wider">Bacheca Medaglie & Bonus Alpini</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {trainerBadges.length} di {GYMS.length} Conquistate
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {GYMS.map((gym) => {
                  const hasBadge = trainerBadges.includes(gym.id);
                  return (
                    <div 
                      key={gym.id}
                      className={`relative p-4 rounded-2xl border flex flex-col items-center justify-center text-center space-y-2.5 transition-all overflow-hidden ${
                        hasBadge 
                          ? 'bg-gradient-to-b from-slate-900 to-amber-950/20 border-amber-500/30 shadow-md shadow-amber-500/5' 
                          : 'bg-slate-900/40 border-slate-900/80 filter opacity-60'
                      }`}
                    >
                      {/* Badge Orb representation */}
                      <div className="relative">
                        {hasBadge && (
                          <div className="absolute -inset-2 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-full blur-xs opacity-50 animate-pulse"></div>
                        )}
                        <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-3xl shadow-lg relative ${
                          hasBadge 
                            ? 'bg-gradient-to-br from-amber-400 to-yellow-500 border-yellow-200 animate-float' 
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}>
                          {gym.badgeEmoji}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-mono font-black text-xs uppercase leading-tight tracking-tight text-slate-200">{gym.badgeName}</h4>
                        <span className="text-[8.5px] font-mono font-black text-slate-500 uppercase block tracking-widest mt-0.5 mt-1">
                          {gym.name.split(" ").slice(1).join(" ")}
                        </span>
                      </div>

                      <p className={`text-[9.5px] leading-snug font-mono ${hasBadge ? 'text-amber-400' : 'text-slate-500'}`}>
                        {hasBadge ? `✅ Bonus: ${gym.bonusDesc.split(". ")[0]}` : `🔒 Sconfiggi ${gym.bossName} per sbloccare`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {gymState.status === 'idle' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. ARENA HUB SELECTION */}
                <div className="lg:col-span-2 bg-slate-950 border border-slate-850 rounded-3xl p-5 space-y-4 shadow-lg">
                  <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-mono font-black text-sm text-slate-200 uppercase tracking-wider">Passo 1: Seleziona l'Arena delle Nubi</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="arena-grid">
                    {GYMS.map((gym) => {
                      const isSelected = selectedArenaId === gym.id;
                      const hasBadge = trainerBadges.includes(gym.id);
                      return (
                        <div 
                          key={gym.id}
                          onClick={() => { playClickSfx(); setSelectedArenaId(gym.id); }}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between h-44 relative overflow-hidden group ${
                            isSelected 
                              ? 'bg-emerald-950/20 border-emerald-500/80 shadow-lg' 
                              : 'bg-slate-900/60 border-slate-850 hover:bg-slate-900 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-mono font-black text-slate-100 flex items-center gap-1.5 truncate">
                              {gym.badgeEmoji} {gym.name.split(" ")[2] || gym.name}
                            </span>
                            <div className="flex gap-1 flex-wrap">
                              {hasBadge && (
                                <span className="text-[8.5px] font-mono font-black px-2 py-0.5 bg-amber-500/25 border border-amber-500/30 rounded text-amber-300 uppercase">CONQUISTATA</span>
                              )}
                              <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                isSelected ? 'bg-red-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                              }`}>Lv.{gym.requiredLevel} RECOMMENDED</span>
                            </div>
                          </div>

                          <div className="space-y-1 mt-2">
                            <p className="text-[10px] text-slate-300 leading-snug">Boss: <span className="text-emerald-400 font-extrabold">{gym.bossName}</span> con <span className="text-emerald-300 font-extrabold">{gym.bossCowName}</span> ({gym.bossBreed} CP {gym.cp})</p>
                            <p className="text-[9.5px] text-slate-400 leading-tight">Difficoltà: <span className="text-amber-400 font-bold">{gym.difficulty}</span></p>
                          </div>

                          <span className="text-[9.5px] font-mono font-bold text-slate-300 mt-2 block bg-slate-950/80 p-1.5 rounded-lg border border-slate-850/30 z-10 leading-snug">
                            ⚡ {gym.bonusDesc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. BUDDY SELECT & CHALLENGE ACTOR */}
                <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 flex flex-col justify-between shadow-lg space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                      <User className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-mono font-black text-sm text-slate-200 uppercase tracking-wider">Passo 2: Il tuo Campione</h3>
                    </div>

                    {vazzadex.length > 0 ? (
                      <div className="space-y-4">
                        {/* Currently selected fighter card display */}
                        {(() => {
                          const activeBuddy = vazzadex.find(c => c.id === activeCombatantId) || vazzadex[0];
                          return (
                            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden">
                              <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded font-mono text-[9px] font-black text-emerald-400 uppercase">
                                COMBATTENTE ATTIVO
                              </div>
                              <div className="flex items-center gap-3">
                                <VazzamonAvatar breed={activeBuddy.breed} rarity={activeBuddy.rarity} className="w-14 h-14" />
                                <div>
                                  <h4 className="font-mono font-black text-sm text-slate-200 leading-snug">{activeBuddy.name}</h4>
                                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Tipo: {activeBuddy.breed} ({activeBuddy.rarity})</p>
                                  <div className="mt-1.5 flex gap-2">
                                    <span className="text-[10px] font-mono font-black bg-slate-950 text-yellow-400 px-1.5 py-0.5 rounded">CP: {activeBuddy.cp}</span>
                                    <span className="text-[10px] font-mono font-bold bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded">LV: {activeBuddy.level}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Short stats panel */}
                              <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-2 rounded-xl text-center text-[10px] font-mono border border-slate-900">
                                <div>
                                  <span className="text-[8px] text-slate-500 block uppercase leading-none">Forza</span>
                                  <span className="font-bold text-slate-300">{activeBuddy.stats.strength}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-500 block uppercase leading-none">Difesa</span>
                                  <span className="font-bold text-slate-300">{activeBuddy.stats.defense}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-500 block uppercase leading-none">Agilità</span>
                                  <span className="font-bold text-slate-300">{activeBuddy.stats.agility}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* List other buddies to dynamically set as main partner */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">Seleziona compagno di scorta:</label>
                          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar max-h-24">
                            {vazzadex.map(buddy => (
                              <button 
                                key={buddy.id}
                                onClick={() => { playClickSfx(); setActiveCombatantId(buddy.id); }}
                                className={`flex-shrink-0 p-2 rounded-xl border-2 transition-all flex items-center gap-2 cursor-pointer ${
                                  activeCombatantId === buddy.id 
                                    ? 'bg-emerald-950/30 border-emerald-500/60' 
                                    : 'bg-slate-900 border-slate-850 hover:bg-slate-850'
                                }`}
                              >
                                <VazzamonAvatar breed={buddy.breed} rarity={buddy.rarity} className="w-8 h-8" />
                                <div className="text-left leading-tight pr-1">
                                  <span className="text-[10px] font-mono font-bold text-slate-200 block truncate max-w-[80px]">{buddy.name}</span>
                                  <span className="text-[9px] text-yellow-400 font-mono">CP {buddy.cp}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 bg-slate-900 rounded-2xl border border-slate-850 space-y-2">
                        <p className="text-xs text-slate-450">Non possiedi alcuna Reina nel Vazzadex!</p>
                        <p className="text-[10px] text-slate-500 leading-normal">Cattura bovine lungo il percorso alpeggio prima di sfidare gli avversari delle vette.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-900">
                    <button
                      onClick={handleInitiateGymMatch}
                      disabled={vazzadex.length === 0}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono font-black tracking-wider text-xs uppercase transition-all shadow-lg shadow-red-600/10 active:scale-95 border-b-4 border-red-800 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <Swords className="w-4 h-4" />
                      Combatti nell'Arena!
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              
              /* ====== POKÉMON STYLE BATTLEGROUND INTERACTIVE GAME ===== */
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" id="battleground-matrix">
                
                {/* LEFT COLUMN: THE GRAPHIC ENCOUNTER CONTAINER */}
                <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 flex flex-col justify-between gap-5 relative overflow-hidden shadow-2xl">
                  
                  {/* Subtle vector lines mapping background inside the arena */}
                  <div className={`absolute inset-0 opacity-[0.06] pointer-events-none transition-colors duration-500 ${
                    gymState.arenaId === 'fenis' ? 'bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px]' :
                    gymState.arenaId === 'gran_paradiso' ? 'bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]' :
                    gymState.arenaId === 'morgex' ? 'bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]' :
                    'bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]'
                  }`}></div>

                  <div className="flex items-center justify-between border-b border-slate-900 pb-2 relative z-10">
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      ⚔️ ARENA: <span className="text-yellow-400">{
                        gymState.arenaId === 'fenis' ? 'CASTELLO DI FÉNIS 🏰' :
                        gymState.arenaId === 'gran_paradiso' ? 'GHIACCIAIO DEL GRAN PARADISO ❄️' :
                        gymState.arenaId === 'morgex' ? 'VIGNETI DI MORGEX 🍇' :
                        'PRATI DI SANT\'ORSO (COGNE) 🌸'
                      }</span>
                    </span>
                    <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-bold capitalize">
                      {gymState.activeTurn === 'player' ? '🟢 Tuo Turno' : gymState.winner ? '🏁 Chiuso' : '🔴 Caricamento...'}
                    </span>
                  </div>

                  {/* VIRTUAL STAGE CANVAS */}
                  <div className="my-2 space-y-6 relative z-10">
                    
                    {/* OPPONENT SCREEN (Top Right Corner aligned) */}
                    <div className="flex flex-col items-end w-[90%] md:w-[75%] ml-auto max-w-sm">
                      <div className="bg-slate-900 p-3 rounded-2xl border border-slate-850 w-full relative overflow-hidden flex flex-col gap-1.5 shadow-md">
                        {/* Elite level/Name info */}
                        <div className="flex justify-between items-center text-xs font-mono font-bold pb-1 text-slate-200">
                          <span className="text-red-400 leading-none truncate max-w-[120px]">👑 BOSS {gymState.opponentVazzamon?.name}</span>
                          <span className="text-[10px] bg-red-950 border border-red-900 text-red-300 px-1 py-0.2 rounded font-black text-right scale-95 uppercase">
                            LV {gymState.opponentVazzamon?.level}
                          </span>
                        </div>

                        {/* Health slider block */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-slate-400">
                            <span>Resistenza Boss (HP)</span>
                            <span className="font-bold text-slate-300">{gymState.opponentHp} / {gymState.opponentMaxHp}</span>
                          </div>
                          
                          {/* Animated bar using percentage thresholds */}
                          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 shadow-inner">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                (gymState.opponentHp / gymState.opponentMaxHp) >= 0.5 ? 'bg-emerald-500' :
                                (gymState.opponentHp / gymState.opponentMaxHp) >= 0.2 ? 'bg-amber-400' : 'bg-red-500'
                              }`} 
                              style={{ width: `${(gymState.opponentHp / gymState.opponentMaxHp) * 100}%` }} 
                            />
                          </div>
                        </div>

                        {/* Passive stats display for boss */}
                        <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-slate-500">
                          <span>Stato:</span>
                          <span className="text-slate-400">Naturale</span>
                          {gymState.arenaId === 'fenis' && <span className="text-amber-500 border border-amber-950 bg-amber-950/20 px-1 rounded-sm scale-95 leading-none">🛡️ Fortificato (-25% Dmg)</span>}
                        </div>
                      </div>

                      {/* Opponent Avatar with Headbutt animation */}
                      <div className="mr-6 mt-1.5 flex justify-end">
                        <div className={`transition-all duration-150 ${gymState.opponentAttackAnim ? '-translate-x-12 scale-110 -rotate-6 z-10 filter brightness-110' : ''}`}>
                          <VazzamonAvatar breed={gymState.opponentVazzamon!.breed} rarity={gymState.opponentVazzamon!.rarity} className="w-16 h-16 filter drop-shadow-[0_4px_12px_rgba(239,68,68,0.25)]" />
                          <div className="w-16 h-1 rounded-full bg-slate-900/60 blur-[2px] mt-0.5 mx-auto"></div>
                        </div>
                      </div>
                    </div>

                    {/* PLAYER STAGE COWER (Bottom Left Corner aligned) */}
                    <div className="flex flex-col items-start w-[90%] md:w-[75%] mr-auto max-w-sm">
                      {/* Player Avatar with Headbutt animation */}
                      <div className="ml-6 mb-1.5 flex h-[70px] items-end justify-start">
                        <div className={`transition-all duration-150 ${gymState.playerAttackAnim ? 'translate-x-12 scale-110 rotate-6 z-10 filter brightness-110' : ''}`}>
                          <VazzamonAvatar breed={gymState.playerVazzamon!.breed} rarity={gymState.playerVazzamon!.rarity} className="w-16 h-16 filter drop-shadow-[0_4px_12px_rgba(16,185,129,0.25)]" />
                          <div className="w-16 h-1 rounded-full bg-slate-900/60 blur-[2px] mt-0.5 mx-auto"></div>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-3 rounded-2xl border border-slate-850 w-full relative overflow-hidden flex flex-col gap-1.5 shadow-md">
                        {/* Elite level/Name info */}
                        <div className="flex justify-between items-center text-xs font-mono font-bold pb-1 text-slate-200">
                          <span className="text-emerald-400 leading-none truncate max-w-[130px] flex items-center gap-1">
                            🐮 {gymState.playerVazzamon?.name}
                          </span>
                          <span className="text-[10px] bg-emerald-950 border border-emerald-900 text-emerald-300 px-1 py-0.2 rounded font-black text-right scale-95 uppercase">
                            LV {gymState.playerVazzamon?.level}
                          </span>
                        </div>

                        {/* Health slider block */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-slate-400">
                            <span>Resistenza Buddy (HP)</span>
                            <span className="font-bold text-slate-300">{gymState.playerHp} / {gymState.playerMaxHp}</span>
                          </div>
                          
                          {/* Animated bar using percentage thresholds */}
                          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 shadow-inner">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                (gymState.playerHp / gymState.playerMaxHp) >= 0.5 ? 'bg-emerald-500' :
                                (gymState.playerHp / gymState.playerMaxHp) >= 0.2 ? 'bg-amber-400' : 'bg-red-500'
                              }`} 
                              style={{ width: `${(gymState.playerHp / gymState.playerMaxHp) * 100}%` }} 
                            />
                          </div>
                        </div>

                        {/* Special energy slider block */}
                        <div className="space-y-0.5 pt-0.5">
                          <div className="flex justify-between text-[8px] font-mono text-slate-500">
                            <span>Mossa Speciale</span>
                            <span className={`font-bold ${gymState.energy >= 100 ? 'text-sky-300 animate-pulse font-black' : 'text-slate-400'}`}>
                              {gymState.energy >= 100 ? '🌟 ADRENALINA PRONTA!' : `${gymState.energy}% / 100%`}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-920">
                            <div 
                              className={`h-full rounded-full transition-all duration-200 bg-gradient-to-r ${
                                gymState.energy >= 100 
                                  ? 'from-blue-400 via-sky-400 to-indigo-500 animate-pulse' 
                                  : 'from-blue-600 to-cyan-500'
                              }`}
                              style={{ width: `${gymState.energy}%` }} 
                            />
                          </div>
                        </div>

                        {/* State & passive buff tags */}
                        <div className="flex flex-wrap gap-1 items-center text-[8.5px] font-mono text-slate-500 pt-0.5 border-t border-slate-850/50 mt-0.5">
                          <span>Buff:</span>
                          {(gymState.playerDefenseBuff || 0) > 0 && (
                            <span className="text-amber-400 bg-amber-950/20 border border-amber-900/60 px-1 py-0.1 rounded-sm">
                              🛡️ Difesa +{Math.round((gymState.playerDefenseBuff || 0) * 100)}%
                            </span>
                          )}
                          {(gymState.arenaId === 'morgex' || (gymState.playerEvasionBuff || 0) > 0) && (
                            <span className="text-purple-400 bg-purple-950/20 border border-purple-900/60 px-1 py-0.1 rounded-sm">
                              💨 Evasione +{Math.round(((gymState.playerEvasionBuff || 0) + (gymState.arenaId === 'morgex' ? 0.2 : 0)) * 100)}%
                            </span>
                          )}
                          {((gymState.playerDefenseBuff || 0) === 0 && (gymState.arenaId !== 'morgex' && (gymState.playerEvasionBuff || 0) === 0)) && (
                            <span className="text-slate-600 italic">Nessun potenziamento attivo</span>
                          )}
                        </div>

                      </div>
                    </div>

                  </div>
                </div>

                {/* RIGHT COLUMN: ACTION RADAR + BATTLE LOGS */}
                <div className="flex flex-col justify-between gap-4">
                  
                  {/* UPPER PIECE: SCROLLABLE REAL-TIME ARENA CONSOLE LOGGER */}
                  <div className="bg-slate-950 border border-slate-850 rounded-3xl p-4 text-left shadow-lg flex-1 flex flex-col justify-between min-h-[160px] max-h-[190px]">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-1.5 mb-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-extrabold font-mono block">📜 Registro Scontro</span>
                      <span className="text-[8.5px] font-mono text-slate-600">{gymState.history.length}/100 logs</span>
                    </div>

                    <div className="font-mono text-[10px] text-slate-300 leading-relaxed overflow-y-auto no-scrollbar space-y-1.5 flex-1 pr-1">
                      {gymState.history.map((line, idx) => {
                        let colorClass = 'text-slate-300';
                        if (line.includes('⚔️') || line.includes('Vittoria') || line.includes('🏆') || line.includes('RELLA')) colorClass = 'text-emerald-400';
                        if (line.includes('💥') || line.includes('💀') || line.includes('Boss') || line.includes('Boss:')) colorClass = 'text-red-400 font-medium';
                        if (line.includes('🍼') || line.includes('🍀') || line.includes('Mela') || line.includes('Recupera') || line.includes('HP')) colorClass = 'text-amber-400';
                        if (line.includes('🛡️') || line.includes('Posizione')) colorClass = 'text-blue-400';
                        if (line.includes('💨') || line.includes('schiva')) colorClass = 'text-purple-400 font-bold';
                        
                        return (
                          <div key={idx} className={`p-1.5 bg-slate-900/40 rounded-lg border border-slate-920 leading-snug flex items-start gap-1 ${colorClass}`}>
                            <span className="text-slate-600 font-light select-none">›</span>
                            <span>{line}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* LOWER PIECE: POKÉMON DUAL COMMAND COMMAND PAD */}
                  <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 shadow-lg flex flex-col justify-between min-h-[250px]">
                    
                    {/* Command Tabs Selection */}
                    <div className="grid grid-cols-3 border-b border-slate-900 pb-3 gap-2">
                      <button
                        onClick={() => { playClickSfx(); setBattleActionTab('moves'); }}
                        className={`py-2 px-1 text-[11px] font-mono font-black rounded-xl transition-all uppercase flex items-center justify-center gap-1 cursor-pointer ${
                          battleActionTab === 'moves' 
                            ? 'bg-red-500 text-slate-950 shadow-md shadow-red-500/10' 
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <Swords className="w-3 h-3" />
                        Attacco
                      </button>

                      <button
                        onClick={() => { playClickSfx(); setBattleActionTab('bag'); }}
                        className={`py-2 px-1 text-[11px] font-mono font-black rounded-xl transition-all uppercase flex items-center justify-center gap-1 cursor-pointer ${
                          battleActionTab === 'bag' 
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10' 
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <ShoppingBag className="w-3 h-3" />
                        Zaino
                      </button>

                      <button
                        onClick={() => { playClickSfx(); setBattleActionTab('swap'); }}
                        className={`py-2 px-1 text-[11px] font-mono font-black rounded-xl transition-all uppercase flex items-center justify-center gap-1 cursor-pointer ${
                          battleActionTab === 'swap' 
                            ? 'bg-purple-550 text-slate-950 shadow-md shadow-purple-500/10' 
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <RotateCw className="w-3 h-3 animate-spin-slow" />
                        Reine
                      </button>
                    </div>

                    {/* Tab Panels Contents */}
                    <div className="flex-grow flex flex-col justify-center py-4">
                      
                      {gymState.status === 'ended' ? (
                        <div className="text-center space-y-4 py-2">
                          <span className="text-4xl block animate-bounce">{gymState.winner === 'player' ? '🏆' : '💀'}</span>
                          <div>
                            <h3 className={`text-lg font-mono font-black uppercase ${
                              gymState.winner === 'player' ? 'text-green-400' : 'text-rose-500'
                            }`}>
                              {gymState.winner === 'player' ? 'Scontro Concluso: VITTORIA!' : 'Scontro Concluso: SCONFITTA'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                              {gymState.winner === 'player' 
                                ? 'Complimenti! Hai sbaragliato il Boss della Regina. Ricevi ricompense leggendarie d\'alpeggio.' 
                                : 'Il tuo fedele amico si è stremato lungo i pendii dell\'arena Valtellina. Sali di livello o usa attacchi diversificati!'}
                            </p>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => { playClickSfx(); setGymState(prev => ({ ...prev, status: 'idle' })); }}
                              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-yellow-400 font-mono font-bold text-xs py-2.5 px-6 rounded-xl shadow cursor-pointer uppercase transition-all"
                            >
                              Torna d'Alpeggio 🎒
                            </button>
                          </div>
                        </div>
                      ) : (
                        
                        /* ACTIVE INTERACTIVE CHOICE TILES */
                        <div className="w-full">
                          
                          {/* 1. MOVES TAB PANEL */}
                          {battleActionTab === 'moves' && (
                            <div className="grid grid-cols-2 gap-3" id="moves-panel">
                              {/* 1. Basic strike */}
                              <button
                                onClick={() => handleExecutePlayerMove('headbutt')}
                                disabled={gymState.activeTurn !== 'player'}
                                className="bg-slate-900 hover:bg-slate-850 disabled:opacity-40 border border-slate-800 p-3 rounded-2xl text-left hover:border-red-500/20 cursor-pointer flex flex-col justify-between h-20 transition-all text-slate-200"
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-[11px] font-mono font-black text-rose-300">💥 Testata Alpina</span>
                                  <span className="text-[8px] bg-red-950 text-red-400 px-1 rounded-sm border border-red-950 leading-none">ATT</span>
                                </div>
                                <span className="text-[9px] text-slate-400 leading-snug">Base | CP rating. Ricarica mossa speciale (+18 E)</span>
                              </button>

                              {/* 2. Defensive block */}
                              <button
                                onClick={() => handleExecutePlayerMove('shield')}
                                disabled={gymState.activeTurn !== 'player'}
                                className="bg-slate-900 hover:bg-slate-850 disabled:opacity-40 border border-slate-800 p-3 rounded-2xl text-left hover:border-blue-500/20 cursor-pointer flex flex-col justify-between h-20 transition-all text-slate-200"
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-[11px] font-mono font-black text-sky-300">🛡️ Corno Protettivo</span>
                                  <span className="text-[8px] bg-slate-950 text-slate-400 px-1 rounded-sm border border-slate-900 leading-none">DIF</span>
                                </div>
                                <span className="text-[9px] text-slate-400 leading-snug">Rinfianco +35% Difesa per il duello (+12 E)</span>
                              </button>

                              {/* 3. Healing milk uses */}
                              <button
                                onClick={() => handleExecutePlayerMove('healing')}
                                disabled={gymState.activeTurn !== 'player' || milkLickUses <= 0}
                                className="bg-slate-900 hover:bg-slate-850 disabled:opacity-40 border border-slate-800 p-3 rounded-2xl text-left hover:border-amber-500/20 cursor-pointer flex flex-col justify-between h-20 transition-all text-slate-200 relative overflow-hidden"
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-[11px] font-mono font-black text-amber-300">🍼 Latte Reale</span>
                                  <span className="text-[9px] font-mono font-bold text-yellow-500">Usabili: {milkLickUses}/3</span>
                                </div>
                                <span className="text-[9px] text-slate-400 leading-snug">Rigenera alto HP d'emergenza (+30 HP Bonus a Cogne)</span>
                              </button>

                              {/* 4. Special strike - Incornata Divina */}
                              <button
                                onClick={() => handleExecutePlayerMove('special')}
                                disabled={gymState.activeTurn !== 'player' || gymState.energy < 100}
                                className={`p-3 rounded-2xl text-left flex flex-col justify-between h-20 transition-all relative overflow-hidden cursor-pointer ${
                                  gymState.energy >= 100 
                                    ? 'bg-gradient-to-r from-blue-900 to-indigo-900 border-2 border-sky-400 shadow-md text-white' 
                                    : 'bg-slate-900/60 border border-slate-850 text-slate-500 opacity-50 cursor-not-allowed'
                                }`}
                              >
                                {gymState.energy >= 100 && (
                                  <div className="absolute top-0 right-0 w-8 h-8 bg-sky-400/20 rounded-full blur animate-pulse pointer-events-none"></div>
                                )}
                                <div className="flex justify-between items-center w-full">
                                  <span className={`text-[11px] font-mono font-black ${gymState.energy >= 100 ? 'text-sky-300' : 'text-slate-500'}`}>
                                    🔱 INCORNATA SUPREMA
                                  </span>
                                  <span className="text-[8px] bg-blue-950 text-blue-300 px-1 rounded-sm border border-blue-900 leading-none">SPEC</span>
                                </div>
                                <span className={`text-[9px] leading-snug ${gymState.energy >= 100 ? 'text-slate-200' : 'text-slate-500'}`}>
                                  Consuma 100% Energia. Danno raddoppiato insormontabile!
                                </span>
                              </button>
                            </div>
                          )}

                          {/* 2. BAG TAB PANEL */}
                          {battleActionTab === 'bag' && (
                            <div className="space-y-2.5" id="battle-backpack-items">
                              {backpack.filter(item => ['item-apple', 'item-potion', 'item-hay'].includes(item.id)).map(item => {
                                const count = item.quantity || 0;
                                return (
                                  <div 
                                    key={item.id}
                                    className="bg-slate-900 p-2.5 rounded-2xl border border-slate-850 flex items-center justify-between gap-3"
                                  >
                                    <div className="flex items-center gap-2.5 text-left flex-1 min-w-0">
                                      <span className="text-xl flex-shrink-0">
                                        {item.id === 'item-apple' ? '🍎' : item.id === 'item-potion' ? '🥚' : '🌾'}
                                      </span>
                                      <div className="min-w-0">
                                        <h4 className="font-mono font-bold text-xs text-slate-200 leading-tight flex items-center gap-1">
                                          {item.name}
                                          <span className="text-[10px] text-amber-400 font-extrabold font-mono">({count})</span>
                                        </h4>
                                        <p className="text-[9px] text-slate-450 truncate">{item.description}</p>
                                      </div>
                                    </div>

                                    <button
                                      disabled={count <= 0 || gymState.activeTurn !== 'player'}
                                      onClick={() => handleUseBackpackItemInCombat(item.id)}
                                      className="py-1.5 px-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 rounded-xl font-mono text-[9px] font-black text-slate-950 uppercase cursor-pointer transition-colors"
                                    >
                                      Usa
                                    </button>
                                  </div>
                                );
                              })}
                              {backpack.filter(item => ['item-apple', 'item-potion', 'item-hay'].includes(item.id)).length === 0 && (
                                <p className="text-xs text-slate-500 italic text-center">Nessun oggetto consumabile da combattimento nello zaino!</p>
                              )}
                            </div>
                          )}

                          {/* 3. SWAP REINE COMBATANT TAB PANEL */}
                          {battleActionTab === 'swap' && (
                            <div className="space-y-2.5 max-h-[160px] overflow-y-auto no-scrollbar" id="partner-switchboard">
                              <span className="text-[8.5px] font-mono text-slate-500 uppercase font-black block tracking-wider text-left border-b border-slate-900 pb-1 mb-1.5">Sostituzione rapida combattente</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {vazzadex.map(buddy => {
                                  const isCurrentFighter = gymState.playerVazzamon?.id === buddy.id;
                                  return (
                                    <button
                                      key={buddy.id}
                                      disabled={isCurrentFighter || gymState.activeTurn !== 'player'}
                                      onClick={() => handleSwapCombatBuddy(buddy)}
                                      className={`p-2 rounded-2xl border flex items-center justify-between text-left transition-all ${
                                        isCurrentFighter 
                                          ? 'bg-emerald-950/20 border-emerald-500/40 opacity-70 cursor-not-allowed' 
                                          : 'bg-slate-900 border-slate-850 hover:bg-slate-850 hover:border-slate-800 cursor-pointer text-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <VazzamonAvatar breed={buddy.breed} rarity={buddy.rarity} className="w-8 h-8" />
                                        <div className="leading-tight">
                                          <h5 className="font-mono font-bold text-[10px] text-slate-300 truncate max-w-[80px]">{buddy.name}</h5>
                                          <span className="text-[9px] font-mono text-slate-500 block">LV {buddy.level} | CP {buddy.cp}</span>
                                        </div>
                                      </div>
                                      <span className={`text-[8px] font-mono font-black ${
                                        isCurrentFighter ? 'text-emerald-400' : 'text-slate-500'
                                      }`}>
                                        {isCurrentFighter ? 'IN CAMPO' : 'SWAP'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                    </div>

                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER GENERAL LEGALS AND RESET ACCENTS */}
      <footer className="bg-slate-950 text-slate-500 text-[10px] text-center py-4 px-6 border-t border-slate-850 mt-12 gap-2 flex flex-col items-center">
        <p>© 2026 Vazzamon GO - Un'esplorazione virtuale ecologica della Valle d'Aosta.</p>
        <div className="flex gap-4">
          <button
            onClick={() => {
              const confirmReset = window.confirm("Cancellare tutti i progressi memorizzati nel Vazzadex?");
              if (confirmReset) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="text-[9px] text-red-500 hover:text-red-400 cursor-pointer"
          >
            Cancella memoria locale (Reset)
          </button>
          <span>•</span>
          <span>Campanacci del latte & Bataille de Reines®</span>
        </div>
      </footer>

      {/* OVERLAY LEVEL UP POPUP */}
      {levelUpAward && (
        <div className="fixed inset-0 bg-slate-950/95 z-55 flex items-center justify-center p-4 backdrop-blur-xs animate-scale-in" id="level-up-modal">
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border-2 border-emerald-500 p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-red-500"></div>
            
            <div className="text-4xl">👑🎒⭐</div>
            <h1 className="text-3xl font-mono font-black text-emerald-400">LIVELLO SUPERATO!</h1>
            <p className="text-sm text-slate-200">Congratulazioni! Sei salito al **Livello {levelUpAward}**!</p>
            
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-850">
              <h5 className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Premi Sbloccati d'alta quota</h5>
              <div className="flex justify-center gap-4 text-xs font-mono font-bold text-amber-300 mt-2">
                <span>+50 Monete 🪙</span>
                <span>+5 Alpen-Bell 🔔</span>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSfx();
                setTrainer(prev => ({ ...prev, coins: prev.coins + 50 }));
                setBackpack(prev => prev.map(item => item.id === 'item-bell-giga' ? { ...item, quantity: item.quantity + 5 } : item));
                setLevelUpAward(null);
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs py-2.5 rounded-xl border-b-4 border-emerald-700 cursor-pointer"
            >
              RITIRA RICOMPENSE!
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY BIRTH / CALVING POPUP */}
      {hatchingEgg && (
        <div className="fixed inset-0 bg-slate-950/95 z-55 flex items-center justify-center p-4 backdrop-blur-xs animate-scale-in" id="calving-modal">
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border-2 border-amber-500 p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-emerald-500"></div>
            
            <div className="text-4xl">🍼🐮🍼</div>
            <h1 className="text-3xl font-mono font-black text-amber-400">LIETO EVENTO!</h1>
            <p className="text-sm text-slate-200">Accompagnandolo nei pascoli alpini, hai completato la crescita e svezzato il vitellino!</p>
            
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-850 space-y-3">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block">È Nata una Nuova Regina!</span>
              <div className="my-2 flex justify-center text-5xl animate-float">🐮</div>
              <p className="text-xs text-slate-300">Un dolcissimo vitellino {hatchingEgg.rarity} è cresciuto sano e forte nei nostri pascoli ed è entrato ufficialmente nel tuo **Vazzadex**!</p>
            </div>

            <button
              onClick={() => {
                playMooSfx();
                setHatchingEgg(null);
              }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs py-2.5 rounded-xl border-b-4 border-amber-700 cursor-pointer"
            >
              ACCOGLI IN STALLA! 🌾
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
