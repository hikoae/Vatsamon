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
  Plus,
  GraduationCap
} from 'lucide-react';
import { Vazzamon, Hotspot, BackpackItem, Egg, Trainer, BattleState, RarityType } from './types';
import { VazzamonAvatar } from './components/VazzamonAvatar';
import { CowVisual } from './components/CowVisual';
import { CowCard } from './components/CowCard';
import { TrailOverlay } from './components/TrailOverlay';
import { VALDOSTAN_TRAILS } from './data/trails';
import { QuizScreen } from './components/QuizScreen';
import { BattleTurnBased } from './components/BattleTurnBased';
import { ArenaBattle } from './components/ArenaBattle';
import { ARENAS, ArenaId } from './data/arenas';
import { TREK_ROUTES } from './data/routes';
import { soundEngine } from './utils/audio';
import { generateVazzamonClient } from './lib/generate';
import { REAL_COWS, REAL_TOTAL, REAL_CASERE, SHOWCASE_BY_RARITY } from './data/realCows';
import { distanza, fmtDist, RAGGIO_CATTURA } from './lib/geo';

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

// Classi statiche per l'accento colore dei percorsi (Tailwind JIT-safe).
const ROUTE_TONE: Record<string, { border: string; bg: string; text: string }> = {
  emerald: { border: "border-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-300" },
  sky: { border: "border-sky-400", bg: "bg-sky-500/10", text: "text-sky-300" },
  amber: { border: "border-amber-400", bg: "bg-amber-500/10", text: "text-amber-300" },
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
    return []; // si parte da Vazzadex vuota: tutte le 73 reali da catturare
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
      { id: 'item-hay', name: 'Fieno delle Vette', description: 'Nutriente speciale usato per aumentare il livello e CP dei Vazzamon.', quantity: 12, type: 'candy' }
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
      xp: 0,
      xpToNextLevel: 1000,
      capturedCount: 0,
      kmTraveled: 0,
      coins: 120
    };
  });

  // Keep all persistent items secure in localStorage
  useEffect(() => { localStorage.setItem('vazzamon_collection_go', JSON.stringify(vazzadex)); }, [vazzadex]);
  useEffect(() => { localStorage.setItem('vazzamon_bag_go', JSON.stringify(backpack)); }, [backpack]);
  useEffect(() => { localStorage.setItem('vazzamon_eggs_go', JSON.stringify(eggs)); }, [eggs]);
  useEffect(() => { localStorage.setItem('vazzamon_trainer_go', JSON.stringify(trainer)); }, [trainer]);

  // Trekking Waypoints coordinates tracking
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(() => {
    const cached = localStorage.getItem('vazzamon_waypoint_idx');
    return cached ? Number(cached) : 0; // si parte dalla prima tappa del percorso
  });
  const [waypointProgress, setWaypointProgress] = useState<number>(() => {
    const cached = localStorage.getItem('vazzamon_waypoint_progress');
    return cached ? Number(cached) : 0;
  });

  // Percorso di trekking attivo (3 itinerari selezionabili).
  const [activeRouteId, setActiveRouteId] = useState<string>(() => {
    return localStorage.getItem('vazzamon_active_route_id') || TREK_ROUTES[0].id;
  });
  useEffect(() => { localStorage.setItem('vazzamon_active_route_id', activeRouteId); }, [activeRouteId]);
  const activeRoute = TREK_ROUTES.find(r => r.id === activeRouteId) ?? TREK_ROUTES[0];
  const activeTrail = activeRoute.coords;
  // Cambia percorso: riparte dalla prima tappa.
  const selectRoute = (id: string) => {
    playClickSfx();
    setActiveRouteId(id);
    setCurrentWaypointIndex(0);
    setWaypointProgress(0);
    setGpsPos(null);
  };

  // Track hiking feeds to avoid intrusive standard popups
  const [trekkingFeed, setTrekkingFeed] = useState<string[]>([
    "Benvenuto in Valle d'Aosta! Preparati all'escursionismo alpino.",
    "Bussola sintonizzata: sei attualmente ad Aosta Centro 🏰."
  ]);

  useEffect(() => { localStorage.setItem('vazzamon_waypoint_idx', String(currentWaypointIndex)); }, [currentWaypointIndex]);
  useEffect(() => { localStorage.setItem('vazzamon_waypoint_progress', String(waypointProgress)); }, [waypointProgress]);

  // ---- 2. VIEW NAVIGATION ----
  const [activeTab, setActiveTab] = useState<'map' | 'scanner' | 'eggs' | 'vazzadex' | 'battle' | 'quiz'>('map');
  // Quiz "Scuola d'Alpeggio": miglior punteggio persistito.
  const [quizBest, setQuizBest] = useState<number>(() => {
    const saved = localStorage.getItem('vazzamon_quiz_go');
    return saved ? parseInt(saved, 10) : 0;
  });
  // Medaglie delle Arene conquistate (bonus permanenti).
  const [trainerBadges, setTrainerBadges] = useState<ArenaId[]>(() => {
    const saved = localStorage.getItem('vazzamon_badges');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => {
    localStorage.setItem('vazzamon_badges', JSON.stringify(trainerBadges));
  }, [trainerBadges]);
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

  // Calculate current player coordinates along the route link early for leaflet effect scope visibility
  const safeWaypointIndex = currentWaypointIndex % activeTrail.length;
  const currentWaypoint = activeTrail[safeWaypointIndex] || activeTrail[0];
  const nextWaypointIndex = (safeWaypointIndex + 1) % activeTrail.length;
  const nextWaypoint = activeTrail[nextWaypointIndex];
  
  const playerLat = currentWaypoint.lat + (nextWaypoint.lat - currentWaypoint.lat) * (waypointProgress / 100);
  const playerLng = currentWaypoint.lng + (nextWaypoint.lng - currentWaypoint.lng) * (waypointProgress / 100);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  // Istanza Leaflet esposta come stato per l'overlay sentieri (re-render al cambio).
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  // Sentiero reale selezionato (null = "Esplora libera").
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const selectedTrail = VALDOSTAN_TRAILS.find(t => t.id === selectedTrailId) ?? null;
  const leafletMarkersRef = useRef<L.Marker[]>([]);
  const leafletPlayerMarkerRef = useRef<L.Marker | null>(null);
  const leafletPolylineRef = useRef<L.Polyline | null>(null);
  const leafletRadiusRef = useRef<L.Circle | null>(null);

  // Posizione GPS reale o "demo" (tap sulla mappa); se null si segue il sentiero.
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsOn, setGpsOn] = useState(false);
  const gpsWatchRef = useRef<number | null>(null);

  // Posizione effettiva del giocatore (GPS/demo se presente, altrimenti sentiero)
  const effLat = gpsPos ? gpsPos.lat : playerLat;
  const effLng = gpsPos ? gpsPos.lng : playerLng;

  // Synchronize dynamic Leaflet Map Layer drawing
  useEffect(() => {
    if (activeTab === 'map' && mapMode === 'real' && mapContainerRef.current) {
      if (!leafletMapRef.current) {
        // Center on current player position
        const initMap = L.map(mapContainerRef.current, {
          center: [effLat, effLng],
          zoom: 13,
          zoomControl: true,
          attributionControl: false
        });

        // Beautiful standard OSM map layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(initMap);

        // Demo: tocca la mappa per "camminare" (se non sei in GPS reale)
        initMap.on('click', (e: L.LeafletMouseEvent) => {
          setGpsPos({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        leafletMapRef.current = initMap;
        setMapInstance(initMap);
      } else {
        // Pan dynamically on simulated steps
        leafletMapRef.current.setView([effLat, effLng], leafletMapRef.current.getZoom(), { animate: true });
      }

      const map = leafletMapRef.current;

      // Raggio di cattura attorno al giocatore
      if (leafletRadiusRef.current) leafletRadiusRef.current.remove();
      leafletRadiusRef.current = L.circle([effLat, effLng], {
        radius: RAGGIO_CATTURA,
        color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1, weight: 1.5,
        interactive: false,
      }).addTo(map);

      // Draw routing polyline representing Valle d'Aosta trial path
      if (leafletPolylineRef.current) {
        leafletPolylineRef.current.remove();
      }
      const coordsArray = activeTrail.map(wp => [wp.lat, wp.lng] as L.LatLngTuple);
      leafletPolylineRef.current = L.polyline(coordsArray, {
        color: '#10b981', // Emerald 500
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 12'
      }).addTo(map);

      // Clear previous overlay markers to avoid stack leaks
      leafletMarkersRef.current.forEach(m => m.remove());
      leafletMarkersRef.current = [];

      // Add Casera Checkpoints (PokéStops) — pascoli REALI
      REAL_CASERE.forEach(hp => {
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

      // ===== Bovine REALI (Batailles) non ancora catturate, nei comuni veri =====
      const capturedIds = new Set(vazzadex.map(c => c.id));
      REAL_COWS.filter(rc => !capturedIds.has(rc.id) && rc.lat != null && rc.lng != null).forEach(rc => {
        const d = distanza({ lat: effLat, lng: effLng }, { lat: rc.lat!, lng: rc.lng! });
        const inRange = d <= RAGGIO_CATTURA;
        const ring = inRange ? 'border-emerald-400' : 'border-slate-500';
        const photo = rc.realPhoto
          ? `background-image:url('${rc.realPhoto}');background-size:cover;background-position:center;`
          : '';
        const inner = rc.realPhoto ? '' : '<span class="text-xl">🐮</span>';
        const realIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div class="flex flex-col items-center ${inRange ? '' : 'opacity-70'}">
                   <div class="w-11 h-11 rounded-full border-2 ${ring} bg-slate-950 flex items-center justify-center shadow-lg overflow-hidden relative" style="${photo}">
                     ${inner}
                     <span class="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 font-mono text-[7px] font-black px-1 rounded-full">CP${rc.cp}</span>
                   </div>
                   <div class="px-1 rounded bg-emerald-900/90 border border-emerald-700 text-[7px] text-emerald-200 font-mono font-bold whitespace-nowrap mt-0.5">REALE · ${rc.rarity}</div>
                 </div>`,
          iconSize: [44, 56], iconAnchor: [22, 28],
        });
        const m = L.marker([rc.lat!, rc.lng!], { icon: realIcon })
          .addTo(map)
          .on('click', () => {
            playClickSfx();
            const dist = distanza({ lat: effLat, lng: effLng }, { lat: rc.lat!, lng: rc.lng! });
            if (dist <= RAGGIO_CATTURA) {
              initiateCatchWild({ id: rc.id, vazza: rc, lat: rc.lat!, lng: rc.lng!, x: 0, y: 0, angle: 0 });
            } else {
              setTrekkingFeed(prev => [`🧭 ${rc.name} (${rc.comune}) è a ${fmtDist(dist)}: cammina verso di lei!`, ...prev.slice(0, 8)]);
            }
          });
        leafletMarkersRef.current.push(m);
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

      leafletPlayerMarkerRef.current = L.marker([effLat, effLng], { icon: playerHtmlIcon, interactive: false, zIndexOffset: -1000 })
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
        setMapInstance(null);
        leafletPlayerMarkerRef.current = null;
        leafletPolylineRef.current = null;
        leafletRadiusRef.current = null;
        leafletMarkersRef.current = [];
      }
    }
  }, [activeTab, mapMode, effLat, effLng, wildCows, caseraCooldowns, vazzadex, activeRouteId]);

  // GPS reale: attiva/disattiva il tracciamento della posizione vera
  const toggleGps = () => {
    playClickSfx();
    if (gpsOn) {
      if (gpsWatchRef.current != null) navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
      setGpsOn(false);
      setGpsPos(null);
      return;
    }
    if (!navigator.geolocation) {
      setTrekkingFeed(prev => ["⚠️ GPS non disponibile su questo dispositivo.", ...prev.slice(0, 8)]);
      return;
    }
    setTrekkingFeed(prev => ["📡 Attivo il GPS reale…", ...prev.slice(0, 8)]);
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => { setGpsOn(true); setGpsPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => setTrekkingFeed(prev => ["⚠️ Permesso GPS negato: usa la demo (tocca la mappa).", ...prev.slice(0, 8)]),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  };
  useEffect(() => () => { if (gpsWatchRef.current != null) navigator.geolocation.clearWatch(gpsWatchRef.current); }, []);

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
    setTrainer(prev => {
      let currentXp = prev.xp + amount;
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
    let nextIndex = safeWaypointIndex;
    let actualProgress = nextProgress;
    let feedMsg = "";

    if (nextProgress >= 100) {
      nextIndex = (safeWaypointIndex + 1) % activeTrail.length;
      actualProgress = nextProgress - 100;
      feedMsg = `🏔️ Nuovo Traguardo! Sei arrivato a: ${activeTrail[nextIndex].name}!`;
    } else {
      const targetWp = activeTrail[nextWaypointIndex] || activeTrail[0];
      feedMsg = `🥾 Cammini verso ${targetWp.name}... Progressi: ${nextProgress}%`;
    }

    setWaypointProgress(actualProgress);
    setCurrentWaypointIndex(nextIndex);

    // Calculate updated coordinates to pass for fresh nearby spawner
    const baseWp = activeTrail[nextIndex] || activeTrail[0];
    const afterIdx = (nextIndex + 1) % activeTrail.length;
    const afterWp = activeTrail[afterIdx] || activeTrail[0];
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
      if (odds > 0.7) {
        looted.push("+1 Alpen-Bell");
        setBackpack(prev => prev.map(item => item.id === 'item-bell-giga' ? { ...item, quantity: item.quantity + 1 } : item));
      }
      if (odds > 0.9) {
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
    setSelectedBallId('item-bell-std');
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
      let captureChance = 0.40; // baseline Comune
      if (encounterCow?.rarity === 'Leggendaria') captureChance = 0.08;
      else if (encounterCow?.rarity === 'Epica') captureChance = 0.18;
      else if (encounterCow?.rarity === 'Rara') captureChance = 0.28;

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
        setCaptureStep('escaped');
        setCaptureLogMsg(`Oh no! Si è liberata dal rintocco alpino ed è svanita tra le nebbie!`);
        // Remove from spawns even if it flees to keep map fresh
        if (encounterCow) {
          setWildCows(prev => prev.filter(c => c.id !== encounterCow.id));
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

  // ---- 10. REAL-TIME TAP-AND-DODGE GYM BATTLES ----
  const handleInitiateGymMatch = () => {
    playClickSfx();
    const activeBuddy = vazzadex.find(c => c.id === activeCombatantId) || vazzadex[0];
    if (!activeBuddy) {
      alert("Sblocca un Vazzamon prima di sfidare l'arena!");
      return;
    }

    // Avversari = vere Reines (preferendo le più forti) per una sfida autentica
    const bosses = REAL_COWS.filter(c => c.rarity === 'Leggendaria' || c.rarity === 'Epica');
    const opponentCowPool = bosses.length ? bosses : REAL_COWS;
    const opponentModel = opponentCowPool[Math.floor(Math.random() * opponentCowPool.length)];
    
    // Scale opponent matching user level
    const oppPowerMult = 1.0 + (trainer.level * 0.1);
    const scaledOpponent: Vazzamon = {
      ...opponentModel,
      id: "opponent-boss",
      name: `${opponentModel.name} Boss`,
      cp: Math.floor(opponentModel.cp * oppPowerMult)
    };

    setGymState({
      playerVazzamon: activeBuddy,
      opponentVazzamon: scaledOpponent,
      playerHp: 300 + activeBuddy.level * 15,
      opponentHp: 280 + scaledOpponent.level * 25,
      playerMaxHp: 300 + activeBuddy.level * 15,
      opponentMaxHp: 280 + scaledOpponent.level * 25,
      energy: 0,
      opponentEnergy: 0,
      status: 'intro',
      history: [
        `🥊 Benvenuti all'Arena "Bataille de Reines" d'Aosta!`,
        `👉 Tappa col tempismo giusto per colpire ed accumulare energia!`,
        `🛡️ Clicca "SCHIVA" quando l'avversario carica per dimezzare il danno!`,
        `⚔️ Combattenti: ${activeBuddy.name} (CP ${activeBuddy.cp}) vs ${scaledOpponent.name} (CP ${scaledOpponent.cp})`
      ],
      winner: null,
      opponentStatsModifier: 0,
      playerAttackAnim: false,
      opponentAttackAnim: false
    });
  };

  // Start continuous background AI attack generator loop when combat begins
  useEffect(() => {
    if (gymState.status === 'active') {
      battleLoopRef.current = setInterval(() => {
        // AI Bot logic attacking player periodically
        setGymState(prev => {
          if (prev.status !== 'active') return prev;

          // Decide if AI casts standard attack or super move
          const isSuperReady = prev.opponentEnergy >= 100;
          let dmg = Math.floor(12 + (prev.opponentVazzamon?.stats.strength || 50) * 0.15 + (Math.random() * 8));
          let actionName = "Spallata";

          if (isSuperReady) {
            dmg = Math.floor(dmg * 2.3);
            actionName = "🔥 INCORNATA DEVASTANTE";
          }

          // Dodge mechanics
          let isDodged = false;
          let finalDmg = dmg;
          if (activeDodgeEffect) {
            isDodged = true;
            finalDmg = Math.floor(dmg * 0.15); // reduce damage by 85%
          }

          const logs = [...prev.history];
          logs.push(
            isDodged 
              ? `⚡ ${prev.opponentVazzamon?.name} lancia ${actionName}, MA HAI SCHIVATO CON SUCCESSO! Subito solo ${finalDmg} danni!`
              : `💥 ${prev.opponentVazzamon?.name} sferra ${actionName} infliggendo ${finalDmg} danni!`
          );

          const nextPlayerHp = Math.max(0, prev.playerHp - finalDmg);
          const nextOpponentEnergy = isSuperReady ? 0 : Math.min(100, prev.opponentEnergy + 20);

          let status: BattleState['status'] = prev.status;
          let winner: BattleState['winner'] = prev.winner;
          if (nextPlayerHp <= 0) {
            status = 'ended';
            winner = 'opponent';
            logs.push(`💀 Il tuo Vazzamon ha ceduto! Sconfitta dignitosa. Sali di livello nel Vazzadex per riprovare.`);
            if (battleLoopRef.current) clearInterval(battleLoopRef.current);
          }

          // Trigger hit sfx
          playHitSfx();

          return {
            ...prev,
            playerHp: nextPlayerHp,
            opponentEnergy: nextOpponentEnergy,
            opponentAttackAnim: true,
            status,
            winner,
            history: logs.slice(-8) // keep history short and neat
          };
        });

        // clear animation triggers after animation completed
        setTimeout(() => {
          setGymState(prev => ({ ...prev, opponentAttackAnim: false }));
        }, 300);

      }, 1800);
    }

    return () => {
      if (battleLoopRef.current) clearInterval(battleLoopRef.current);
    };
  }, [gymState.status, activeDodgeEffect]);

  const handlePlayerTapAttack = () => {
    if (gymState.status === 'intro') {
      playClickSfx();
      setGymState(prev => ({ ...prev, status: 'active' }));
      return;
    }
    if (gymState.status !== 'active') return;

    playHitSfx();
    
    setGymState(prev => {
      if (prev.status !== 'active' || !prev.playerVazzamon) return prev;

      const dmg = Math.floor(8 + prev.playerVazzamon.stats.strength * 0.12 + Math.random() * 6);
      const nextOppHp = Math.max(0, prev.opponentHp - dmg);
      const nextEnergy = Math.min(100, prev.energy + 10);
      const logs = [...prev.history];
      logs.push(`⚔️ ${prev.playerVazzamon.name} attacca infliggendo ${dmg} danni!`);

      let status: BattleState['status'] = prev.status;
      let winner: BattleState['winner'] = prev.winner;
      if (nextOppHp <= 0) {
        status = 'ended';
        winner = 'player';
        logs.push(`🏆 EPIC WIN! ${prev.playerVazzamon.name} si laurea Reina indiscussa dell'Arena! Sbloccati premi favolosi.`);
        if (battleLoopRef.current) clearInterval(battleLoopRef.current);

        // Award resources to Trainer
        addTrainerXp(500);
        setTrainer(t => ({ ...t, coins: t.coins + 60 }));
      }

      return {
        ...prev,
        opponentHp: nextOppHp,
        energy: nextEnergy,
        playerAttackAnim: true,
        status,
        winner,
        history: logs.slice(-8)
      };
    });

    setTimeout(() => {
      setGymState(prev => ({ ...prev, playerAttackAnim: false }));
    }, 200);
  };

  const handlePlayerDodge = () => {
    if (gymState.status !== 'active' || activeDodgeEffect) return;
    playClickSfx();
    setActiveDodgeEffect(true);
    
    // Dodge visual cooldown lasts 450ms
    setTimeout(() => {
      setActiveDodgeEffect(false);
    }, 450);
  };

  const handlePlayerSuperAttack = () => {
    if (gymState.status !== 'active' || gymState.energy < 100 || !gymState.playerVazzamon) return;
    playVictorySfx();

    setGymState(prev => {
      const critDmg = Math.floor((15 + (prev.playerVazzamon?.stats.strength || 50) * 0.2) * 2.5);
      const nextOppHp = Math.max(0, prev.opponentHp - critDmg);
      const logs = [...prev.history];
      logs.push(`🌟✨ SPECTACULAR STRIKE! ${prev.playerVazzamon?.name} sferra "RUGITO DELLA COGNE" infliggendo ${critDmg} danni devastanti!`);

      let status: BattleState['status'] = prev.status;
      let winner: BattleState['winner'] = prev.winner;
      if (nextOppHp <= 0) {
        status = 'ended';
        winner = 'player';
        logs.push(`🏆 EPIC WIN! ${prev.playerVazzamon?.name} ha sconfitto il Boss!`);
        if (battleLoopRef.current) clearInterval(battleLoopRef.current);
        addTrainerXp(500);
        setTrainer(t => ({ ...t, coins: t.coins + 60 }));
      }

      return {
        ...prev,
        opponentHp: nextOppHp,
        energy: 0, // reset special energy gauge
        status,
        winner,
        history: logs.slice(-8)
      };
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
      // Build statica: generazione client (niente server), stesso schema.
      const parsed: Vazzamon = await generateVazzamonClient(imgBase64, false);

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
        <div className="max-w-md mx-auto grid grid-cols-6 gap-0.5 p-1 text-[11px] font-extrabold">
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

          <button
            onClick={() => { playClickSfx(); setActiveTab('quiz'); }}
            className={`flex flex-col items-center py-2 rounded-xl transition-all ${activeTab === 'quiz' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <GraduationCap className="w-4 h-4 mb-0.5" />
            <span>Scuola</span>
          </button>
        </div>
      </nav>

      {/* 🗺️ ACTIVE VIEW DISPLAY 🗺️ */}
      <main className="flex-grow p-4 md:p-6 max-w-4xl w-full mx-auto" id="app-viewport">
        
        {/* VIEW 1: INTERACTIVE MAP OVERWORLD */}
        {activeTab === 'map' && (
          <div className="space-y-6" id="overworld-view">

            {/* SELETTORE PERCORSO (3 grandi itinerari valdostani) */}
            <div className="bg-slate-950 border border-slate-850 rounded-3xl p-4 space-y-3" id="route-selector">
              <h3 className="text-xs font-mono font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                Scegli il tuo cammino
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TREK_ROUTES.map((route) => {
                  const active = route.id === activeRouteId;
                  const t = ROUTE_TONE[route.accent] ?? ROUTE_TONE.emerald;
                  return (
                    <button
                      key={route.id}
                      onClick={() => selectRoute(route.id)}
                      className={`relative text-left rounded-2xl border-2 p-3 transition-all overflow-hidden ${active ? `${t.border} ${t.bg}` : 'border-slate-800 bg-slate-900 hover:bg-slate-850'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{route.icon}</span>
                        <div className="min-w-0">
                          <div className={`text-[11px] font-mono font-black truncate ${active ? t.text : 'text-slate-200'}`}>{route.name}</div>
                          <div className="text-[9px] font-mono text-slate-400">{route.difficulty} · {route.lengthKm} km · {route.coords.length} tappe</div>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-snug mt-1.5 line-clamp-2">{route.description}</p>
                      {active && <span className={`absolute top-2 right-2 text-[8px] font-mono font-black ${t.text}`}>● ATTIVO</span>}
                    </button>
                  );
                })}
              </div>
            </div>

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

                  {/* GPS reale */}
                  <button
                    onClick={toggleGps}
                    className={`font-black text-xs py-2.5 px-4 rounded-xl shadow active:scale-95 transition-all flex items-center gap-1.5 border-b-2 ${gpsOn ? 'bg-blue-500 text-white border-blue-700' : 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-850'}`}
                    id="gps-btn"
                  >
                    <MapPin className="w-4 h-4" />
                    {gpsOn ? 'GPS attivo' : 'GPS reale'}
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

                  {/* POKESTOPS: Traditional Dairy Casere — pascoli reali */}
                  {REAL_CASERE.map((hp) => {
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

            {/* Overlay sentieri reali (disegna su Leaflet, non rende nulla nel DOM) */}
            <TrailOverlay map={mapInstance} trail={selectedTrail} />

            {/* SELETTORE SENTIERI REALI (trekking responsabile) */}
            <div className="bg-slate-950 border border-slate-850 rounded-3xl p-4 space-y-3" id="trail-selector">
              <h4 className="text-xs font-mono font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                Sentieri reali della Valle d'Aosta
              </h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { playClickSfx(); setSelectedTrailId(null); }}
                  className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border transition-all ${selectedTrailId === null ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'}`}
                >
                  🧭 Esplora libera
                </button>
                {VALDOSTAN_TRAILS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { playClickSfx(); setMapMode('real'); setSelectedTrailId(t.id); }}
                    className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border transition-all ${selectedTrailId === t.id ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 text-amber-200 border-amber-700/40 hover:bg-slate-850'}`}
                  >
                    {t.location}
                  </button>
                ))}
              </div>

              {selectedTrail && (
                <div className="bg-slate-900/60 border border-amber-700/30 rounded-2xl p-3 space-y-3" id="trail-panel">
                  <div>
                    <div className="text-sm font-mono font-black text-amber-300">{selectedTrail.name}</div>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{selectedTrail.description}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-950 rounded-xl border border-slate-850 py-1.5">
                      <div className="text-[9px] text-slate-500 font-mono uppercase">Difficoltà</div>
                      <div className="text-[11px] font-mono font-black text-slate-100">{selectedTrail.difficulty}</div>
                    </div>
                    <div className="bg-slate-950 rounded-xl border border-slate-850 py-1.5">
                      <div className="text-[9px] text-slate-500 font-mono uppercase">Lunghezza</div>
                      <div className="text-[11px] font-mono font-black text-slate-100">{selectedTrail.lengthKm} km</div>
                    </div>
                    <div className="bg-slate-950 rounded-xl border border-slate-850 py-1.5">
                      <div className="text-[9px] text-slate-500 font-mono uppercase">Durata</div>
                      <div className="text-[11px] font-mono font-black text-slate-100">{selectedTrail.durationHours} h</div>
                    </div>
                    <div className="bg-slate-950 rounded-xl border border-slate-850 py-1.5">
                      <div className="text-[9px] text-slate-500 font-mono uppercase">Dislivello</div>
                      <div className="text-[11px] font-mono font-black text-slate-100">{selectedTrail.altitudeGain} m</div>
                    </div>
                  </div>

                  <div className="bg-emerald-950/30 border border-emerald-900 rounded-2xl p-3 space-y-1.5">
                    <div className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Trekking responsabile
                    </div>
                    <ul className="space-y-1">
                      {selectedTrail.responsibleTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-300 leading-snug">
                          <span className="text-emerald-500 mt-0.5">✓</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-[9.5px] text-slate-500 font-mono">
                    Incontri tipici: <span className="text-amber-200">{selectedTrail.cowsToEncounter.join(' · ')}</span>
                  </div>
                </div>
              )}
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
                    <CowVisual cow={encounterCow} className="w-36 h-36" />
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
                              {item.name.split(" ")[1]} ({item.quantity})
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

            {/* Avanzamento catalogo REALI (Batailles de Reines) */}
            {(() => {
              const realiPrese = vazzadex.filter(c => c.isReal).length;
              const bonus = vazzadex.filter(c => !c.isReal).length;
              return (
                <div className="bg-gradient-to-br from-emerald-950 to-slate-950 border border-emerald-800/50 rounded-3xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono font-black text-emerald-300 text-lg uppercase">Reines reali: {realiPrese}/{REAL_TOTAL}</div>
                    <div className="text-[10px] font-mono text-slate-400">{bonus > 0 ? `+${bonus} bonus IA` : 'dati Batailles 2026'}</div>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${(realiPrese / REAL_TOTAL) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-2">Le bovine reali vivono nei loro comuni veri sulla mappa: cammina e catturale.</p>
                </div>
              );
            })()}

            {/* Galleria "una Reina per tipologia": carte con foto reale per rarità */}
            <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 space-y-3" id="showcase-rarity">
              <h3 className="text-xs font-mono font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                Una Reina per rarità (carte ufficiali)
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {SHOWCASE_BY_RARITY.map((cow) => {
                  const tone =
                    cow.rarity === 'Leggendaria' ? 'border-amber-400/60 from-amber-500/15' :
                    cow.rarity === 'Epica' ? 'border-purple-400/60 from-purple-500/15' :
                    cow.rarity === 'Rara' ? 'border-blue-400/60 from-blue-500/15' : 'border-slate-700 from-slate-700/10';
                  const txt =
                    cow.rarity === 'Leggendaria' ? 'text-amber-300' :
                    cow.rarity === 'Epica' ? 'text-purple-300' :
                    cow.rarity === 'Rara' ? 'text-blue-300' : 'text-slate-300';
                  return (
                    <button
                      key={cow.id}
                      onClick={() => { playClickSfx(); setSelectedVazzamon(cow); }}
                      className={`relative bg-gradient-to-b to-slate-950 border-2 ${tone} rounded-2xl p-2 flex flex-col items-center gap-1.5 transition-transform hover:-translate-y-1 overflow-hidden`}
                    >
                      <div className="holo-sheen absolute inset-0 pointer-events-none opacity-50 rounded-2xl" />
                      <span className={`relative text-[8px] font-mono font-black uppercase tracking-widest ${txt}`}>{cow.rarity}</span>
                      <CowVisual cow={cow} className="relative w-16 h-16" />
                      <span className="relative text-[10px] font-mono font-black text-slate-100 truncate max-w-full">{cow.name}</span>
                      <span className="relative text-[8px] font-mono text-amber-300">CP {cow.cp}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 font-mono">Tocca una carta per aprire la scheda completa con statistiche reali e mosse.</p>
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
                            <CowVisual cow={cow} className="w-20 h-20 group-hover:scale-110 transition-transform" />
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
          <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in overflow-y-auto" id="details-modal">
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl max-w-md w-full p-5 text-center space-y-4 shadow-2xl relative my-auto">

              <button
                onClick={() => { playClickSfx(); setSelectedVazzamon(null); }}
                className="absolute top-3 right-3 z-20 text-slate-400 hover:text-slate-200 transition-colors p-1 bg-slate-950/60 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Scheda "carta Pokémon" (componente dedicato) */}
              <CowCard cow={selectedVazzamon} />

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

        {/* VIEW 6: SCUOLA D'ALPEGGIO (QUIZ EDUCATIVO) */}
        {activeTab === 'quiz' && (
          <div className="space-y-4" id="quiz-tab-view">
            <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 text-center">
              <h2 className="text-lg font-mono font-black text-emerald-400 flex items-center justify-center gap-1.5 uppercase">
                <GraduationCap className="w-5 h-5" /> Scuola d'Alpeggio
              </h2>
              <p className="text-xs text-slate-400 mt-1">Metti alla prova il tuo rispetto per montagna, bovine e tradizioni. Ogni risposta giusta vale monete e XP!</p>
            </div>
            <QuizScreen
              bestScore={quizBest}
              onFinish={(correct, totale) => {
                const coinsWon = correct * 10;
                setTrainer(prev => ({ ...prev, coins: prev.coins + coinsWon }));
                addTrainerXp(correct * 30);
                if (correct > quizBest) {
                  setQuizBest(correct);
                  localStorage.setItem('vazzamon_quiz_go', String(correct));
                }
                setTrekkingFeed(prev => [`🎓 Scuola d'Alpeggio: ${correct}/${totale} risposte giuste (+${coinsWon} 🪙)`, ...prev.slice(0, 8)]);
              }}
            />
          </div>
        )}

        {/* VIEW 5: BATAILLE DE REINES (TAP COMBAT arena) */}
        {activeTab === 'battle' && (
          <div className="space-y-6" id="battle-tab-view">

            {/* BATAILLE A TURNI (stile Pokémon) vs Pastori */}
            <div className="bg-slate-950 border border-amber-700/30 rounded-3xl p-5 space-y-4" id="turnbattle-card">
              <div className="text-center">
                <h2 className="text-lg font-mono font-black text-amber-400 uppercase tracking-tight flex items-center justify-center gap-1.5">
                  <Swords className="w-5 h-5" /> Bataille a Turni
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Sfida i Pastori in una spinta a turni: 4 mosse dalle statistiche reali della tua Reina.</p>
              </div>
              {vazzadex.length > 0 ? (
                <BattleTurnBased
                  playerCow={vazzadex.find(c => c.id === activeCombatantId) || vazzadex[0]}
                  playClick={playClickSfx}
                  onResult={(won, xp, coins) => {
                    if (won) {
                      addTrainerXp(xp);
                      setTrainer(prev => ({ ...prev, coins: prev.coins + coins }));
                      setTrekkingFeed(prev => [`🏆 Bataille a turni vinta! +${xp} XP · +${coins} 🪙`, ...prev.slice(0, 8)]);
                    } else {
                      setTrekkingFeed(prev => [`🐂 Bataille a turni persa: allena ancora la tua Reina!`, ...prev.slice(0, 8)]);
                    }
                  }}
                />
              ) : (
                <div className="text-center py-6 space-y-2">
                  <p className="text-xs text-slate-500">Cattura una Reina per combattere a turni!</p>
                  <button onClick={() => setActiveTab('map')} className="bg-emerald-500 text-slate-950 font-mono font-black text-xs px-4 py-2 rounded-xl">Vai alla mappa</button>
                </div>
              )}
            </div>

            {/* ARENE A TURNI (4 Palestre) — vs vere Reines boss, con medaglie */}
            <div className="bg-slate-950 border border-rose-700/30 rounded-3xl p-5 space-y-4" id="arena-card">
              <div className="text-center">
                <h2 className="text-2xl font-mono font-black text-rose-400 uppercase tracking-tight flex items-center justify-center gap-2">
                  <Swords className="w-6 h-6 fill-current" /> Arene · Bataille de Reines 🏆
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Conquista le 4 Palestre della Valle: combattimento a turni con scelta delle mosse, barra Adrenalina e medaglie con bonus permanenti.</p>
                {trainerBadges.length > 0 && (
                  <div className="mt-2 text-sm">{trainerBadges.map((id) => ARENAS.find(a => a.id === id)?.badgeEmoji).join(' ')}</div>
                )}
              </div>
              {vazzadex.length > 0 ? (
                <ArenaBattle
                  playerCow={vazzadex.find(c => c.id === activeCombatantId) || vazzadex[0]}
                  trainerLevel={trainer.level}
                  badges={trainerBadges}
                  playClick={playClickSfx}
                  onWin={(arena, xp, coins, newBadge) => {
                    addTrainerXp(xp);
                    setTrainer(prev => ({ ...prev, coins: prev.coins + coins }));
                    if (newBadge) setTrainerBadges(prev => prev.includes(arena.id) ? prev : [...prev, arena.id]);
                    setTrekkingFeed(prev => [`🏆 Arena ${arena.badgeEmoji} ${arena.name} conquistata! +${xp} XP · +${coins} 🪙`, ...prev.slice(0, 8)]);
                  }}
                />
              ) : (
                <div className="text-center py-6 space-y-2">
                  <p className="text-xs text-slate-500">Cattura una Reina per sfidare le arene!</p>
                  <button onClick={() => setActiveTab('map')} className="bg-emerald-500 text-slate-950 font-mono font-black text-xs px-4 py-2 rounded-xl">Vai alla mappa</button>
                </div>
              )}
            </div>
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
