import { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import {
  Mountain,
  Warehouse,
  Compass,
  Camera,
  BookOpen,
  Volume2,
  VolumeX,
  Gift,
  GraduationCap,
} from 'lucide-react';
import { Vatsamon, Hotspot, BackpackItem, Trainer, RarityType, WildCow } from './types';
import { normalizeSaveKey } from './lib/migrateSaveKeys';
import { savePhoto } from './lib/photoStore';
import { useAuth } from './lib/auth';
import { backupLocalSave, restoreLocalBackup, saveCloudSave, BACKUP_KEY } from './lib/cloudSave';
import { ConfirmDialog } from './components/ConfirmDialog';
import { APP_VERSION, BRAND } from './config/brand';
import { VALDOSTAN_TRAILS } from './data/trails';
import { RESPONSIBLE_QUESTIONS, ResponsibleQuestion } from './data/responsibleQuestions';
import { MAP_BATTLES, MapBattle } from './data/mapBattles';
import { DUNGEONS, Dungeon } from './data/dungeons';
import { ArenaId } from './data/arenas';
import { TREK_ROUTES } from './data/routes';
import { Challenges } from './components/Challenges';
import { ScattaView } from './components/ScattaView';
import { DailyPanel } from './components/DailyPanel';
import { type NearbyPlace } from './components/GpsExplorerPanel';
import { RoutesView } from './components/RoutesView';
import { OverworldMapView } from './components/OverworldMapView';
import { CaptureScreen } from './components/CaptureScreen';
import { ProfileModal } from './components/ProfileModal';
import { WhatsNewModal } from './components/WhatsNewModal';
import { CHANGELOG } from './data/changelog';
import { SceneFallback } from './components/SceneFallback';
import { soundEngine } from './utils/audio';
import { generateVatsamonClient } from './lib/generate';
import { REAL_COWS, REAL_CASERE } from './data/realCows';
import { abbinaPosizioneAPercorso, direzioneVerso, distanza, fmtDist, RAGGIO_CATTURA } from './lib/geo';
import { gradoCorrente } from './data/gradi';
import { faseCorrente } from './data/fase';
import { oggiISO } from './lib/oggi';
import { VALUTE, FONTINA_REWARD, costoStellaPedigree, PEDIGREE_STAR_CAP } from './data/economy';
import { WILD_BREEDS, WILD_NAMES, ECO_TREK_TIPS, LORE_POOL, BALL_META, DEFAULT_BAG, SEED_COLLECTION } from './data/overworld';
import { BASE_CATCH, respectTone } from './lib/capture';
import { Trofeo } from './data/trofei';
import type { EsitoTappa } from './components/EliminatoireView';
import { tappe, tappaStato, STATO_LABEL, LS_ELIMINATOIRE, EliminatoireSave } from './data/eliminatoire';
import { ArpPanel } from './components/ArpPanel';
import { sbloccaParola, parolePatois, TOTALE_PAROLE } from './lib/patois';
import { SpintaStats, valutaImprese, insegnaMosse, mosseDaLivello, sbloccaGlobale } from './lib/scuola';
import { TutorialState, tutorialState, saveTutorial, premioLezioneDaRitirare } from './lib/tutorial';
import { TUTORIAL_BATTLE } from './data/tutorialBattle';
import { MemeGuide } from './components/MemeGuide';
import LeggendeView from './components/LeggendeView';
import { ArpState, ARP_VUOTO, LS_ARP, ARP_KG_PER_CURA, ARP_GIORNI_PER_FONTINA } from './data/arp';
import { SeasonEvent } from './data/season';

// S4 perf: scene pesanti caricate on-demand (code-splitting). Restano eager solo
// mappa/HUD/ScattaView, che servono al primo paint o hanno già il proprio
// lazy-loading interno (rilevatore TF.js in lib/detector.ts).
const BattleScene = lazy(() => import('./components/BattleScene'));
const PvpBattleScene = lazy(() => import('./components/pvp/PvpBattleScene'));
const DungeonRun = lazy(() => import('./components/DungeonRun'));
const EliminatoireView = lazy(() => import('./components/EliminatoireView'));
const QuizScreen = lazy(() => import('./components/QuizScreen').then(m => ({ default: m.QuizScreen })));
const SeasonView = lazy(() => import('./components/SeasonView').then(m => ({ default: m.SeasonView })));
const StallaScreen = lazy(() => import('./components/StallaScreen').then(m => ({ default: m.StallaScreen })));
const VatsadexView = lazy(() => import('./components/VatsadexView').then(m => ({ default: m.VatsadexView })));
const RespectEncounter = lazy(() => import('./components/RespectEncounter').then(m => ({ default: m.RespectEncounter })));

// Indice delle Reines reali del bundle (per i codici di salvataggio compatti:
// si salva l'id + le sole differenze, non l'intera scheda statica).
const REAL_BY_ID = new Map(REAL_COWS.map(c => [c.id, c]));
const BAG_BY_ID = new Map(DEFAULT_BAG.map(i => [i.id, i]));

const GPS_ROUTE_TOLERANCE = 120;
const GPS_CHECKPOINT_RANGE = 90;
const BATTLE_RANGE = 800;
const GPS_CHECKPOINT_MISSIONS = [
  { title: 'Sosta sicura', detail: 'Raggiungi il punto, fermati in un luogo sicuro e scopri il timbro del sentiero.' },
  { title: 'Sguardo sul paesaggio', detail: 'Osserva il paesaggio dal punto indicato: nessuna foto o azione è richiesta mentre cammini.' },
  { title: 'Passo rispettoso', detail: 'Resta sul tracciato, lascia spazio alle mandrie e registra il tuo arrivo.' },
] as const;

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

const DISCOVERY_RADIUS = 1500; // metri: entro questo raggio una Reina viene "avvistata"

// ---- Leaflet icon builders (S4 perf) ----
// Estratti dall'effetto mappa cosi la ricreazione strutturale (lista entita)
// e l'aggiornamento posizione-only (setIcon sui marker esistenti) producono
// esattamente lo stesso HTML, senza duplicare le stringhe in due punti.

function buildCaseraIcon(hp: { name: string }, cooldownActive: boolean): L.DivIcon {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div class="flex flex-col items-center">
             <div class="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center shadow-md relative ${cooldownActive ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 text-white animate-pulse'}" style="transform: translateY(-8px);">
               <span class="text-base">🍼</span>
               ${cooldownActive ? '' : '<span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-400 rounded-full border border-white animate-ping"></span>'}
             </div>
             <div class="px-1.5 py-0.5 rounded bg-[#211b3a]/95 border border-[#3a3460] text-[10px] text-white font-mono font-bold whitespace-nowrap shadow-sm" style="transform: translateY(-12px);">
               ${hp.name.substring(0, 10)}...
             </div>
           </div>`,
    iconSize: [40, 50],
    iconAnchor: [20, 25]
  });
}

function buildWildCowIcon(wc: { vatsa: Vatsamon }): L.DivIcon {
  const isRealWild = !!wc.vatsa.realPhoto || wc.vatsa.isReal;
  const emoji = wc.vatsa.breed.toLowerCase().includes('pezza') ? '🐮' : '🐄';
  const ringCol = isRealWild ? 'border-emerald-400' : 'border-amber-500';
  const photoStyle = wc.vatsa.realPhoto
    ? `background-image:url('${wc.vatsa.realPhoto}');background-size:contain;background-repeat:no-repeat;background-position:center;background-color:#eef1f6;`
    : '';
  const inner = wc.vatsa.realPhoto ? '' : `<span class="text-xl animate-float">${emoji}</span>`;
  const label = isRealWild ? `REALE · ${wc.vatsa.rarity}` : wc.vatsa.rarity;
  const labelCls = isRealWild ? 'bg-emerald-900/90 border-emerald-700 text-emerald-200' : 'bg-[#211b3a] border-amber-550/40 text-yellow-300';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div class="flex flex-col items-center">
             <div class="w-11 h-11 rounded-full bg-[#211b3a] border-2 ${ringCol} flex items-center justify-center shadow-lg relative cursor-pointer hover:scale-110 transition-transform overflow-hidden" style="transform: translateY(-8px);${photoStyle}">
               ${inner}
               <span class="absolute -top-1 -right-1 bg-amber-500 text-[#0b0820] font-mono text-[9px] font-black px-1 rounded-full leading-tight">
                 CP${wc.vatsa.cp}
               </span>
             </div>
             <div class="px-1 py-0.2 rounded border text-[9px] font-mono font-bold whitespace-nowrap shadow-sm ${labelCls}" style="transform: translateY(-10px);">
               ${label}
             </div>
           </div>`,
    iconSize: [44, 54],
    iconAnchor: [22, 27]
  });
}

function buildRealCowIcon(rc: Vatsamon, isDiscovered: boolean, inRange: boolean): L.DivIcon {
  if (isDiscovered) {
    const ring = inRange ? 'border-emerald-400' : 'border-slate-500';
    const photo = rc.realPhoto
      ? `background-image:url('${rc.realPhoto}');background-size:contain;background-repeat:no-repeat;background-position:center;background-color:#eef1f6;`
      : '';
    const inner = rc.realPhoto ? '' : '<span class="text-xl">🐮</span>';
    return L.divIcon({
      className: 'custom-leaflet-marker cow-real-marker',
      html: `<div class="flex flex-col items-center ${inRange ? '' : 'opacity-70'}">
               <div class="w-11 h-11 rounded-full border-2 ${ring} bg-[#211b3a] flex items-center justify-center shadow-lg overflow-hidden relative" style="${photo}">
                 ${inner}
                 <span class="absolute -top-1 -right-1 bg-emerald-500 text-[#0b0820] font-mono text-[9px] font-black px-1 rounded-full">CP${rc.cp}</span>
               </div>
               <div class="px-1 rounded bg-emerald-900/90 border border-emerald-700 text-[9px] text-emerald-200 font-mono font-bold whitespace-nowrap mt-0.5">REALE · ${rc.rarity}</div>
             </div>`,
      iconSize: [44, 56], iconAnchor: [22, 28],
    });
  }
  return L.divIcon({
    className: 'custom-leaflet-marker cow-real-marker',
    html: `<div class="flex flex-col items-center opacity-80">
             <div class="w-10 h-10 rounded-full border-2 border-dashed border-slate-500 bg-[#211b3a]/80 flex items-center justify-center shadow-lg">
               <span class="text-lg">❓</span>
             </div>
             <div class="px-1 rounded bg-slate-900/90 border border-slate-700 text-[9px] text-slate-300 font-mono font-bold whitespace-nowrap mt-0.5">REINA ?</div>
           </div>`,
    iconSize: [40, 52], iconAnchor: [20, 26],
  });
}

function buildBattleIcon(mb: MapBattle, inRange: boolean, locked: boolean, distLabel: string): L.DivIcon {
  const ring = locked ? '#64748b' : mb.accent;
  return L.divIcon({
    className: 'custom-leaflet-marker battle-marker',
    html: `<div class="flex flex-col items-center ${inRange && !locked ? '' : 'opacity-75'}">
             <div class="w-12 h-12 rounded-2xl border-2 flex items-center justify-center shadow-lg relative ${inRange && !locked ? 'animate-bounce' : ''}" style="border-color:${ring};background:#211b3a;transform:translateY(-8px);">
               <span class="text-2xl">${locked ? '🔒' : mb.emoji}</span>
               <span class="absolute -top-1 -right-1 text-[9px] font-mono font-black px-1 rounded-full" style="background:${ring};color:#0b0820;">${mb.kind === 'arena' ? 'BOSS' : 'VS'}</span>
             </div>
             <div class="px-1 rounded border text-[9px] font-mono font-bold whitespace-nowrap shadow-sm" style="background:#211b3a;border-color:${ring}55;color:${ring};transform:translateY(-10px);">${locked ? `🔒 Lv ${mb.reqLevel}` : (inRange ? '⚔️ SFIDA' : distLabel)}</div>
           </div>`,
    iconSize: [48, 60], iconAnchor: [24, 30],
  });
}

function buildDungeonIcon(dg: Dungeon, inRange: boolean, locked: boolean, cleared: boolean, distLabel: string): L.DivIcon {
  const ring = locked ? '#64748b' : dg.accent;
  return L.divIcon({
    className: 'custom-leaflet-marker dungeon-marker',
    html: `<div class="flex flex-col items-center ${inRange && !locked ? '' : 'opacity-75'}">
             <div class="w-14 h-14 rounded-2xl border-2 flex items-center justify-center shadow-xl relative ${inRange && !locked ? 'animate-pulse' : ''}" style="border-color:${ring};background:#1a1430;transform:translateY(-8px);">
               <span class="text-3xl">${locked ? '🔒' : dg.emoji}</span>
               <span class="absolute -top-1 -right-1 text-[9px] font-mono font-black px-1 rounded-full" style="background:${ring};color:#fff;">LEGA</span>
               ${cleared ? '<span class="absolute -bottom-1 -right-1 text-[10px]">✅</span>' : ''}
             </div>
             <div class="px-1 rounded border text-[9px] font-mono font-bold whitespace-nowrap shadow-sm" style="background:#1a1430;border-color:${ring}66;color:${ring};transform:translateY(-10px);">${locked ? `🔒 Lv ${dg.reqLevel}` : (inRange ? '🏰 ENTRA' : distLabel)}</div>
           </div>`,
    iconSize: [56, 70], iconAnchor: [28, 35],
  });
}

export default function App() {
  const { user, firebaseEnabled, signOut } = useAuth();

  // ---- 1. PERSISTENT STATS ----
  const [vatsadex, setVatsadex] = useState<Vatsamon[]>(() => {
    const cached = localStorage.getItem('vatsamon_collection_go');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { console.error(e); }
    }
    return SEED_COLLECTION(); // stato demo-ready: alcune Reines già catturate
  });

  const [backpack, setBackpack] = useState<BackpackItem[]>(() => {
    const cached = localStorage.getItem('vatsamon_bag_go');
    if (cached) {
      try {
        const parsed: BackpackItem[] = JSON.parse(cached);
        // Migrazione: assicura che esista l'intera linea di campanacci anche per
        // i salvataggi vecchi (es. nuovo Campanaccio Runico), senza azzerare le scorte.
        DEFAULT_BAG.forEach(def => {
          if (!parsed.find(p => p.id === def.id)) parsed.push({ ...def });
        });
        return parsed;
      } catch (e) { console.error(e); }
    }
    return DEFAULT_BAG.map(i => ({ ...i }));
  });


  const [trainer, setTrainer] = useState<Trainer>(() => {
    const cached = localStorage.getItem('vatsamon_trainer_go');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { console.error(e); }
    }
    return {
      name: "TrekkerGO",
      level: 6,
      xp: 420,
      xpToNextLevel: 1000,
      capturedCount: 8,
      kmTraveled: 18,
      coins: 360
    };
  });

  // ---- FASE 4: Punteggio RISPETTO (esplorazione responsabile) ----
  // 0..100, parte da 50. Persistito in localStorage (chiave aggiunta anche a
  // SAVE_KEYS in cloudSave.ts per la sincronizzazione cloud). Un Rispetto alto
  // dà un piccolo vantaggio di gameplay (vedi spawnWildCowAtRandom: bonus rarità).
  const [respectScore, setRespectScore] = useState<number>(() => {
    const cached = localStorage.getItem('vatsamon_respect');
    if (cached !== null) {
      const n = Number(cached);
      if (!Number.isNaN(n)) return Math.max(0, Math.min(100, n));
    }
    return 50;
  });
  // Applica una variazione al Rispetto mantenendolo nel range 0..100.
  const adjustRespect = (delta: number) =>
    setRespectScore(prev => Math.max(0, Math.min(100, prev + delta)));

  // Keep all persistent items secure in localStorage
  useEffect(() => { localStorage.setItem('vatsamon_collection_go', JSON.stringify(vatsadex)); }, [vatsadex]);
  useEffect(() => { localStorage.setItem('vatsamon_bag_go', JSON.stringify(backpack)); }, [backpack]);
  useEffect(() => { localStorage.setItem('vatsamon_trainer_go', JSON.stringify(trainer)); }, [trainer]);
  useEffect(() => { localStorage.setItem('vatsamon_respect', String(respectScore)); }, [respectScore]);
  // Rispecchia il Rispetto nell'oggetto trainer così la classifica cloud
  // (leaderboard in cloudSave.ts, che legge trainer.respectScore) resta accurata.
  useEffect(() => {
    setTrainer(prev => prev.respectScore === respectScore ? prev : { ...prev, respectScore });
  }, [respectScore]);

  // ---- FASE 2: Identità (Gradi Amis des Reines), valuta di prestigio (Fontina),
  //      motore di fase della stagione. Tutto derivato, niente stato nuovo. ----
  const gradoStato = gradoCorrente({ xp: trainer.xp, capturedCount: trainer.capturedCount, respectScore });
  const faseStato = faseCorrente(oggiISO());
  const fontina = trainer.fontina ?? 0;
  const pedigreeStars = trainer.pedigreeStars ?? 0;
  // Accredita Forme di Fontina (valuta di prestigio) con un avviso nel feed.
  const guadagnaFontina = (n: number, motivo: string) => {
    if (n <= 0) return;
    setTrainer(prev => ({ ...prev, fontina: (prev.fontina ?? 0) + n }));
    setTrekkingFeed(prev => [`🧀 +${n} ${n === 1 ? 'Forma' : 'Forme'} di Fontina · ${motivo}`, ...prev.slice(0, 8)]);
  };

  // Trekking Waypoints coordinates tracking
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(() => {
    const cached = localStorage.getItem('vatsamon_waypoint_idx');
    return cached ? Number(cached) : 0; // si parte dalla prima tappa del percorso
  });
  const [waypointProgress, setWaypointProgress] = useState<number>(() => {
    const cached = localStorage.getItem('vatsamon_waypoint_progress');
    return cached ? Number(cached) : 0;
  });

  // Percorso di trekking attivo (3 itinerari selezionabili).
  const [activeRouteId, setActiveRouteId] = useState<string>(() => {
    return localStorage.getItem('vatsamon_active_route_id') || TREK_ROUTES[0].id;
  });
  useEffect(() => { localStorage.setItem('vatsamon_active_route_id', activeRouteId); }, [activeRouteId]);
  const activeRoute = TREK_ROUTES.find(r => r.id === activeRouteId) ?? TREK_ROUTES[0];
  const activeTrail = activeRoute.coords;

  // ---- Progressione Fase 2: percorsi completati + bovine scoperte (fog-of-war) ----
  const [completedRoutes, setCompletedRoutes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('vatsamon_completed_routes') || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('vatsamon_completed_routes', JSON.stringify(completedRoutes)); }, [completedRoutes]);

  // Checkpoint GPS: timbri locali per ogni percorso. La posizione non viene
  // persistita: salviamo solo l'avanzamento scelto dall'utente.
  const [gpsCheckpoints, setGpsCheckpoints] = useState<Record<string, number[]>>(() => {
    try { return JSON.parse(localStorage.getItem('vatsamon_gps_checkpoints') || '{}'); } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem('vatsamon_gps_checkpoints', JSON.stringify(gpsCheckpoints)); }, [gpsCheckpoints]);

  const [discoveredCows, setDiscoveredCows] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('vatsamon_discovered_cows') || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('vatsamon_discovered_cows', JSON.stringify(discoveredCows)); }, [discoveredCows]);
  // "Latest ref" per l'effetto mappa (S4 perf): l'effetto posizione-only non ha
  // discoveredCows tra le dipendenze (per non rifare il layer ad ogni tick), quindi
  // legge sempre il valore corrente da qui invece che da una closure potenzialmente stale.
  const discoveredCowsRef = useRef(discoveredCows);
  discoveredCowsRef.current = discoveredCows;
  // Cambia percorso: riparte dalla prima tappa.
  const selectRoute = (id: string) => {
    playClickSfx();
    const route = TREK_ROUTES.find(r => r.id === id);
    // Blocco di progressione: serve il livello allenatore minimo.
    if (route && trainer.level < route.reqLevel) {
      setTrekkingFeed(prev => [`🔒 "${route.name}" è bloccato: raggiungi il livello ${route.reqLevel} (sei al ${trainer.level}). Cattura e cammina per salire!`, ...prev.slice(0, 8)]);
      return;
    }
    setActiveRouteId(id);
    setCurrentWaypointIndex(0);
    setWaypointProgress(0);
    setGpsPos(null);
  };

  // Track hiking feeds to avoid intrusive standard popups
  const [trekkingFeed, setTrekkingFeed] = useState<string[]>([
    "Benvenuto in Valle d'Aosta! Preparati all'escursionismo alpino.",
    "Bussola pronta: sei attualmente ad Aosta Centro 🏰."
  ]);

  useEffect(() => { localStorage.setItem('vatsamon_waypoint_idx', String(currentWaypointIndex)); }, [currentWaypointIndex]);
  useEffect(() => { localStorage.setItem('vatsamon_waypoint_progress', String(waypointProgress)); }, [waypointProgress]);

  // ---- 2. VIEW NAVIGATION ----
  const [activeTab, setActiveTab] = useState<'map' | 'routes' | 'stagione' | 'scanner' | 'stalla' | 'vatsadex' | 'quiz' | 'premi'>('map');
  // Battaglia attiva (scena stile Pokémon lanciata dalla mappa).
  const [activeBattle, setActiveBattle] = useState<MapBattle | null>(null);
  // Partita PvP attiva (S9): overlay separato, aperto dall'hub "Sfide tra
  // Allevatori" dentro la Stalla — mai una nuova tab.
  const [activePvpMatchId, setActivePvpMatchId] = useState<string | null>(null);
  // Il tutorial di Mémé (beat giocati): pending solo per i NUOVI onboarding.
  const [tutorial, setTutorial] = useState<TutorialState>(() => tutorialState());
  const tutorialAttivo = tutorial.pending && !tutorial.done;
  // Rileggi SEMPRE lo stato fresco da localStorage: i tips/premi vengono
  // scritti anche da BattleScene (tipDaDare) e non devono essere sovrascritti.
  const passaBeat = (beat: number) => { const st = { ...tutorialState(), beat }; setTutorial(st); saveTutorial(st); };
  const chiudiTutorial = () => { const st = { ...tutorialState(), done: true }; setTutorial(st); saveTutorial(st); };
  const [activeDungeon, setActiveDungeon] = useState<Dungeon | null>(null); // Lega/dungeon in corso
  const [dungeonsCleared, setDungeonsCleared] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('vatsamon_dungeons') || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('vatsamon_dungeons', JSON.stringify(dungeonsCleared)); }, [dungeonsCleared]);
  const [encounterFlash, setEncounterFlash] = useState(false); // flash d'incontro casuale
  // FASE 4: incontro educativo casuale (guardaparco/pastore) attivo, o null.
  const [respectEncounter, setRespectEncounter] = useState<ResponsibleQuestion | null>(null);
  // Quiz "Scuola d'Alpeggio": miglior punteggio persistito.
  const [quizBest, setQuizBest] = useState<number>(() => {
    const saved = localStorage.getItem('vatsamon_quiz_go');
    return saved ? parseInt(saved, 10) : 0;
  });
  // Medaglie delle Arene conquistate (bonus permanenti).
  const [trainerBadges, setTrainerBadges] = useState<ArenaId[]>(() => {
    const saved = localStorage.getItem('vatsamon_badges');
    if (!saved) return ['cogne', 'gran_paradiso'];
    try { return JSON.parse(saved); } catch { return ['cogne', 'gran_paradiso']; }
  });
  useEffect(() => {
    localStorage.setItem('vatsamon_badges', JSON.stringify(trainerBadges));
  }, [trainerBadges]);
  // Sfide riscosse (per non riscuotere due volte la ricompensa).
  const [claimedChallenges, setClaimedChallenges] = useState<string[]>(() => {
    const saved = localStorage.getItem('vatsamon_challenges_go');
    if (!saved) return [];
    try { return JSON.parse(saved); } catch { return []; }
  });
  useEffect(() => {
    localStorage.setItem('vatsamon_challenges_go', JSON.stringify(claimedChallenges));
  }, [claimedChallenges]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Overworld spawned wild Vatsamons (tipo WildCow in ./types, S7)
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
  // Marker categorizzati per id (S4 perf): permettono all'effetto posizione-only
  // di aggiornare setLatLng/setIcon sui marker esistenti senza ricrearli.
  const leafletCaseraMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const leafletWildMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const leafletRealCowMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const leafletBattleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const leafletDungeonMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const leafletPlayerMarkerRef = useRef<L.Marker | null>(null);
  const leafletPolylineRef = useRef<L.Polyline | null>(null);
  const leafletRadiusRef = useRef<L.Circle | null>(null);

  // Posizione GPS reale o "demo" (tap sulla mappa); se null si segue il sentiero.
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsOn, setGpsOn] = useState(false);
  const [gpsState, setGpsState] = useState<'off' | 'requesting' | 'active' | 'error'>('off');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsUpdatedAt, setGpsUpdatedAt] = useState<number | null>(null);
  const [gpsIssue, setGpsIssue] = useState<string | null>(null);
  const gpsWatchRef = useRef<number | null>(null);
  const gpsSessionRef = useRef(0);

  // Posizione effettiva del giocatore (GPS/demo se presente, altrimenti sentiero)
  const effLat = gpsPos ? gpsPos.lat : playerLat;
  const effLng = gpsPos ? gpsPos.lng : playerLng;
  // "Latest ref" per l'effetto mappa (S4 perf): i click handler dei marker REALI
  // restano vivi tra una ricreazione strutturale e l'altra, quindi leggono la
  // posizione corrente da qui invece che da una closure catturata a creazione-marker.
  const posRef = useRef({ lat: effLat, lng: effLng });
  posRef.current = { lat: effLat, lng: effLng };

  const gpsRouteMatch = useMemo(
    () => gpsPos ? abbinaPosizioneAPercorso(gpsPos, activeTrail) : null,
    [gpsPos, activeTrail],
  );
  const gpsTargetIndex = Math.min(safeWaypointIndex + 1, activeTrail.length - 1);
  const gpsTarget = activeTrail[gpsTargetIndex] ?? currentWaypoint;
  const gpsTargetDistance = distanza({ lat: effLat, lng: effLng }, gpsTarget);
  const gpsDirection = direzioneVerso({ lat: effLat, lng: effLng }, gpsTarget);
  // Il checkpoint è il punto del tracciato raggiunto davvero: usare solo la
  // prossima tappa renderebbe impossibile timbrare un punto appena superato.
  const gpsCheckpointIndex = gpsRouteMatch
    ? Math.max(1, Math.min(
      gpsRouteMatch.segmentIndex + (gpsRouteMatch.progress >= 0.9 ? 1 : 0),
      activeTrail.length - 1,
    ))
    : gpsTargetIndex;
  const gpsCheckpoint = activeTrail[gpsCheckpointIndex] ?? gpsTarget;
  const gpsCheckpointDistance = distanza({ lat: effLat, lng: effLng }, gpsCheckpoint);
  const claimedGpsCheckpoints = gpsCheckpoints[activeRouteId] ?? [];
  const checkpointClaimed = claimedGpsCheckpoints.includes(gpsCheckpointIndex);
  const checkpointReady = Boolean(gpsOn && gpsPos && gpsRouteMatch && gpsRouteMatch.distanceM <= GPS_ROUTE_TOLERANCE && gpsCheckpointDistance <= GPS_CHECKPOINT_RANGE);
  const checkpointMission = GPS_CHECKPOINT_MISSIONS[gpsCheckpointIndex % GPS_CHECKPOINT_MISSIONS.length];

  const nearbyGpsPlaces = useMemo<NearbyPlace[]>(() => {
    const here = { lat: effLat, lng: effLng };
    const captured = new Set(vatsadex.map(c => c.id));
    const closestCow = REAL_COWS
      .filter(c => !captured.has(c.id) && c.lat != null && c.lng != null)
      .map(c => ({ cow: c, distanceM: distanza(here, { lat: c.lat!, lng: c.lng! }) }))
      .sort((a, b) => a.distanceM - b.distanceM)[0];
    const closestCasera = REAL_CASERE
      .map(c => ({ casera: c, distanceM: distanza(here, c) }))
      .sort((a, b) => a.distanceM - b.distanceM)[0];
    const closestBattle = MAP_BATTLES
      .map(b => ({ battle: b, distanceM: distanza(here, b) }))
      .sort((a, b) => a.distanceM - b.distanceM)[0];
    const places: NearbyPlace[] = [];
    if (closestCow) places.push({ id: closestCow.cow.id, kind: 'Reina', label: closestCow.cow.name, detail: closestCow.cow.comune ?? 'Reina reale', distanceM: closestCow.distanceM, ready: closestCow.distanceM <= RAGGIO_CATTURA });
    if (closestCasera) places.push({ id: closestCasera.casera.id, kind: 'Casera', label: closestCasera.casera.name, detail: closestCasera.casera.valley, distanceM: closestCasera.distanceM, ready: closestCasera.distanceM <= RAGGIO_CATTURA });
    if (closestBattle) places.push({ id: closestBattle.battle.id, kind: 'Sfida', label: closestBattle.battle.name, detail: closestBattle.battle.subtitle, distanceM: closestBattle.distanceM, ready: trainer.level >= closestBattle.battle.reqLevel && closestBattle.distanceM <= BATTLE_RANGE });
    return places;
  }, [effLat, effLng, trainer.level, vatsadex]);

  // ---- Battaglie sulla mappa: ingaggio + ricompense ----
  const tryStartBattle = (mb: MapBattle) => {
    playClickSfx();
    if (vatsadex.length === 0) {
      setTrekkingFeed(prev => [`🐮 Cattura prima una Reina per poter combattere!`, ...prev.slice(0, 8)]);
      return;
    }
    if (trainer.level < mb.reqLevel) {
      setTrekkingFeed(prev => [`🔒 ${mb.name}: serve livello ${mb.reqLevel} (sei al ${trainer.level}).`, ...prev.slice(0, 8)]);
      return;
    }
    const d = distanza({ lat: effLat, lng: effLng }, { lat: mb.lat, lng: mb.lng });
    if (d > BATTLE_RANGE) {
      setTrekkingFeed(prev => [`🧭 ${mb.name} è a ${fmtDist(d)}: avvicinati per sfidarlo!`, ...prev.slice(0, 8)]);
      return;
    }
    setActiveBattle(mb);
  };
  // "Latest ref" (S4 perf): il click handler del marker battaglia, bound nell'effetto
  // strutturale, deve sempre invocare la versione più recente di tryStartBattle
  // (che chiude su trainer/vatsadex/effLat correnti), non quella catturata all'ultima
  // ricreazione del layer marker.
  const tryStartBattleRef = useRef(tryStartBattle);
  tryStartBattleRef.current = tryStartBattle;
  // Il patois giocato: una parola si sblocca compiendola (feed + Profilo).
  const [, setPatoisTick] = useState(0); // ri-render del Profilo dopo uno sblocco
  const impara = (chiave: string) => {
    const voce = sbloccaParola(chiave);
    if (voce) {
      setPatoisTick(n => n + 1);
      setTrekkingFeed(prev => [`🗣️ Nuova parola di patois: «${voce.patois ?? voce.fr}» — ${voce.it}. (${parolePatois().length}/${TOTALE_PAROLE})`, ...prev.slice(0, 8)]);
    }
  };

  // ---- L'ARP: inarpa, cura quotidiana, discesa, désarpa ----
  const inarpa = (cowId: string) => {
    if (faseStato.id !== 'inalpa' || arpState.capi[cowId]) return;
    const c = vatsadex.find(x => x.id === cowId);
    setArpState(prev => ({ ...prev, capi: { ...prev.capi, [cowId]: { salitaIl: oggiISO(), ultimaCura: null, giorniCura: 0 } } }));
    setTrekkingFeed(prev => [`⛰️ Inarpa! ${c?.name ?? 'La Reina'} sale all'alpe: crescerà, ma non gareggia finché è su.`, ...prev.slice(0, 8)]);
    impara('inarpa');
  };
  const curaArp = (cowId: string) => {
    const capo = arpState.capi[cowId];
    const oggi = oggiISO();
    if (!capo || capo.ultimaCura === oggi) return;
    const giorni = capo.giorniCura + 1;
    setArpState(prev => ({ ...prev, capi: { ...prev.capi, [cowId]: { ...capo, ultimaCura: oggi, giorniCura: giorni } } }));
    setVatsadex(prev => prev.map(c => c.id === cowId ? { ...c, peso_kg: Math.min(750, (c.peso_kg ?? 550) + ARP_KG_PER_CURA) } : c));
    if (giorni === 3) insegnaAllaReina(cowId, ['flemma-ghiacciaio']);
    addTrainerXp(15);
    if (giorni % ARP_GIORNI_PER_FONTINA === 0) { guadagnaFontina(1, "l'alpe ha reso una forma"); impara('alpeggio'); }
    else setTrekkingFeed(prev => [`🌿 Cura all'arp: +${ARP_KG_PER_CURA} kg. L'erba d'alta quota fa la stazza.`, ...prev.slice(0, 8)]);
  };
  const consolidaProduzione = (prev: ArpState, cowId: string, anno: string): ArpState => {
    const capo = prev.capi[cowId];
    if (!capo) return prev;
    const capi = { ...prev.capi };
    delete capi[cowId];
    const annoProd = { ...(prev.produzione[anno] ?? {}) };
    annoProd[cowId] = (annoProd[cowId] ?? 0) + capo.giorniCura;
    return { ...prev, capi, produzione: { ...prev.produzione, [anno]: annoProd } };
  };
  const scendiDallArp = (cowId: string) => {
    const anno = oggiISO().slice(0, 4);
    setArpState(prev => consolidaProduzione(prev, cowId, anno));
    setTrekkingFeed(prev => [`⬇️ Discesa a valle: la Reina torna disponibile per le batailles.`, ...prev.slice(0, 8)]);
  };
  const celebraDesarpa = () => {
    const oggi = oggiISO();
    const anno = oggi.slice(0, 4);
    // consolida la produzione di TUTTI i capi ancora all'arp (la désarpa è la discesa)
    let stato = arpState;
    for (const id of Object.keys(stato.capi)) stato = consolidaProduzione(stato, id, anno);
    const prodAnno = stato.produzione[anno] ?? {};
    // Reina di corne: la più combattiva della TUA stagione (più vittorie)
    const corne = [...vatsadex].filter(c => (c.vittorie ?? 0) > 0).sort((a, b) => (b.vittorie ?? 0) - (a.vittorie ?? 0))[0];
    // Reine du lait: la più produttiva all'alpe quest'anno
    const laitId = Object.entries(prodAnno).sort((a, b) => b[1] - a[1]).filter(([, g]) => g > 0)[0]?.[0];
    const lait = vatsadex.find(c => c.id === laitId);
    setArpState({ ...stato, desarpa: { ...stato.desarpa, [anno]: { celebrata: true, corne: corne?.name, lait: lait?.name } } });
    setVatsadex(prev => prev.map(c =>
      c.id === corne?.id ? { ...c, fioriRossi: anno } : c.id === lait?.id ? { ...c, fioriBianchi: anno } : c
    ));
    guadagnaFontina(2, 'la festa della désarpa');
    impara('desarpa');
    if (corne) insegnaAllaReina(corne.id, ['sguardo-regale']);
    if (corne) impara('reina_corne');
    if (lait) impara('reina_latte');
    setTrekkingFeed(prev => [`🌸 DÉSARPA ${anno}! ${corne ? `🌹 ${corne.name} è la Reina di corne` : 'Nessuna Reina di corne (serve almeno una vittoria)'}${lait ? ` · 🤍 ${lait.name} è la Reine du lait` : ''}. La mandria scende a valle in festa.`, ...prev.slice(0, 8)]);
  };

  // Bottega della Casera: i Denari si spendono in scorte per lo Sac.
  const buyBottega = (id: string, prezzo: number, nome: string) => {
    if (trainer.coins < prezzo) {
      setTrekkingFeed(prev => [`🛒 Bottega: ti mancano ${prezzo - trainer.coins} 🪙 per ${nome}.`, ...prev.slice(0, 8)]);
      return;
    }
    playClickSfx();
    setTrainer(prev => ({ ...prev, coins: prev.coins - prezzo }));
    setBackpack(prev => {
      const found = prev.find(it => it.id === id);
      if (found) return prev.map(it => it.id === id ? { ...it, quantity: it.quantity + 1 } : it);
      const tpl = DEFAULT_BAG.find(it => it.id === id);
      return tpl ? [...prev, { ...tpl, quantity: 1 }] : prev;
    });
    setTrekkingFeed(prev => [`🛒 Bottega della Casera: ${nome} (−${prezzo} 🪙)`, ...prev.slice(0, 8)]);
  };

  // Esito di una tappa dell'Éliminatoire: trofei reali, timbro della domenica, albo.
  const handleTappaFinish = (esito: EsitoTappa) => {
    const t = activeTappa;
    if (!t) return;
    impara('eliminatoria');
    const oggi = oggiISO();
    const stato = tappaStato(t, oggi);
    const giaVinta = tappeSave[t.id]?.vinta === true;

    if (esito.vinta) {
      setVatsadex(prev => prev.map(c => c.id === esito.reinaId ? { ...c, vittorie: (c.vittorie ?? 0) + 1 } : c));
      insegnaAllaReina(esito.reinaId, valutaImprese(esito.stats, t.finale ? 'finale' : 'tappa'));
      if (!giaVinta) {
        // Prima vittoria della tappa: i TRE premi reali (dossier §1) + XP pieno.
        const nuovi: Trofeo[] = (["mecro", "sonnaille", "collare"] as const).map(tipo => ({
          id: `trofeo-${t.id}-${tipo}`, tipo, comune: t.comune, data: t.data, categoria: esito.categoria, reinaNome: esito.reinaNome,
        }));
        setTrofei(prev => [...nuovi, ...prev]);
        impara('bosquet');
        if (t.finale) impara('reine_des_reines');
        addTrainerXp(t.finale ? 800 : 400);
        setTrekkingFeed(prev => [`🌹 ${t.comune}: ${esito.reinaNome} vince la tappa! Mécro, sonnaille e collare in bacheca${t.finale ? ' — REINE DES REINES!' : ''}`, ...prev.slice(0, 8)]);
      } else {
        addTrainerXp(150);
        setTrekkingFeed(prev => [`📯 ${t.comune} (memoriale): ${esito.reinaNome} si conferma. +150 XP`, ...prev.slice(0, 8)]);
      }
      setTappeSave(prev => ({
        ...prev,
        [t.id]: {
          vinta: true,
          timbro: (prev[t.id]?.timbro ?? false) || stato === 'aperta',
          reinaNome: esito.reinaNome,
          categoria: esito.categoria as EliminatoireSave[string]['categoria'],
          quando: oggi,
        },
      }));
    } else {
      setTrekkingFeed(prev => [`📯 ${t.comune}: eliminata ai ${esito.turniSuperati === 0 ? 'quarti' : esito.turniSuperati === 1 ? 'la semifinale' : 'la finale di tappa'}. La tappa resta rigiocabile.`, ...prev.slice(0, 8)]);
    }
  };

  // LA SCUOLA DELLA REINA: assegna le mosse guadagnate da un'impresa alla
  // Reina che l'ha compiuta e le sblocca nel catalogo globale (Mémé insegna).
  const insegnaAllaReina = (cowId: string | undefined, ids: string[]) => {
    if (!ids.length) return;
    ids.forEach(sbloccaGlobale);
    if (!cowId) return;
    const c = vatsadex.find(x => x.id === cowId);
    if (!c) return;
    const { cow, nuove } = insegnaMosse(c, ids);
    if (!nuove.length) return;
    setVatsadex(prev => prev.map(x => x.id === cowId ? { ...x, mosseApprese: cow.mosseApprese } : x));
    setTrekkingFeed(f => [`🎓 ${c.name} ha imparato ${nuove.map(m => `${m.emoji} ${m.nome.toUpperCase()}`).join(' · ')}! Equipaggiala dal Libretto.`, ...f.slice(0, 8)]);
  };

  const handleBattleResult = (won: boolean, cowId?: string, stats?: SpintaStats) => {
    const mb = activeBattle;
    if (!mb) return;
    // La bataille-lezione di Mémé: premi suoi, niente circuito normale.
    if (mb.tutorial) {
      if (won) {
        impara('bataille');
        // Il premio si ritira solo alla PRIMA vittoria: la lezione è
        // rigiocabile dal Profilo ma non è una fattoria di XP/Genepy.
        if (premioLezioneDaRitirare()) {
          addTrainerXp(100);
          setBackpack(prev => {
            const found = prev.find(it => it.id === 'item-buff-genepy');
            if (found) return prev.map(it => it.id === 'item-buff-genepy' ? { ...it, quantity: it.quantity + 1 } : it);
            const tpl = DEFAULT_BAG.find(it => it.id === 'item-buff-genepy');
            return tpl ? [...prev, { ...tpl, quantity: 1 }] : prev;
          });
          setTrekkingFeed(prev => [`👵 «${mb.pastore?.dialogueWin}» +100 XP e un 🍵 Genepy da parte di Mémé.`, ...prev.slice(0, 8)]);
        } else {
          setTrekkingFeed(prev => [`👵 «${mb.pastore?.dialogueWin}» (Il ripasso fa bene; il premio, quello, fu dato.)`, ...prev.slice(0, 8)]);
        }
        if (tutorialAttivo && tutorial.beat <= 2) passaBeat(3);
      } else {
        setTrekkingFeed(prev => [`👵 «${mb.pastore?.dialogueLoss}»`, ...prev.slice(0, 8)]);
      }
      return;
    }
    // palmares personale della Reina che ha condotto la spinta
    if (won && cowId) setVatsadex(prev => prev.map(c => c.id === cowId ? { ...c, vittorie: (c.vittorie ?? 0) + 1 } : c));
    if (won) impara('bataille');
    if (won) insegnaAllaReina(cowId, valutaImprese(stats, 'battle'));
    if (won && mb.kind === 'pastore' && mb.pastore) {
      const xp = mb.pastore.rewardXp, coins = Math.round(xp / 5);
      addTrainerXp(xp);
      setTrainer(prev => ({ ...prev, coins: prev.coins + coins }));
      setTrekkingFeed(prev => [`🏆 Hai battuto ${mb.name}! +${xp} XP · +${coins} 🪙`, ...prev.slice(0, 8)]);
    } else if (won && mb.kind === 'arena' && mb.arena) {
      const arena = mb.arena;
      const newBadge = !trainerBadges.includes(arena.id);
      addTrainerXp(500);
      setTrainer(prev => ({ ...prev, coins: prev.coins + 80 }));
      if (newBadge) setTrainerBadges(prev => prev.includes(arena.id) ? prev : [...prev, arena.id]);
      setTrekkingFeed(prev => [`🏆 Arena ${arena.badgeEmoji} ${arena.badgeName} conquistata! +500 XP · +80 🪙${newBadge ? ' · nuova medaglia!' : ''}`, ...prev.slice(0, 8)]);
    } else if (!won) {
      setTrekkingFeed(prev => [`🐂 Sconfitta contro ${mb.name}. Allena la tua Reina e riprova!`, ...prev.slice(0, 8)]);
    }
  };

  // ---- DUNGEON / Lega delle Reines (castelli) ----
  const tryStartDungeon = (d: Dungeon) => {
    playClickSfx();
    if (vatsadex.length === 0) {
      setTrekkingFeed(prev => [`🐮 Cattura prima qualche Reina per formare una squadra!`, ...prev.slice(0, 8)]);
      return;
    }
    if (trainer.level < d.reqLevel) {
      setTrekkingFeed(prev => [`🔒 ${d.name}: serve livello ${d.reqLevel} (sei al ${trainer.level}). È contenuto endgame!`, ...prev.slice(0, 8)]);
      return;
    }
    const dist = distanza({ lat: effLat, lng: effLng }, { lat: d.lat, lng: d.lng });
    if (dist > BATTLE_RANGE) {
      setTrekkingFeed(prev => [`🧭 ${d.name} è a ${fmtDist(dist)}: avvicinati per entrare nella Lega!`, ...prev.slice(0, 8)]);
      return;
    }
    setActiveDungeon(d);
  };
  // "Latest ref" (S4 perf): stesso motivo di tryStartBattleRef sopra, per il marker dungeon.
  const tryStartDungeonRef = useRef(tryStartDungeon);
  tryStartDungeonRef.current = tryStartDungeon;
  const handleDungeonResult = (won: boolean, cowId?: string, stats?: SpintaStats, squadra?: { cowId: string; stats: SpintaStats }[]) => {
    const d = activeDungeon;
    if (!d) return;
    if (won && cowId) setVatsadex(prev => prev.map(c => c.id === cowId ? { ...c, vittorie: (c.vittorie ?? 0) + 1 } : c));
    // Regola della Lega: le imprese di STILE le impara ogni partecipante
    // (sulle proprie stats); il premio contestuale (Concerto) va a chi chiude.
    if (won) insegnaAllaReina(cowId, valutaImprese(stats, 'dungeon'));
    if (won) squadra?.filter(m => m.cowId !== cowId).forEach(m =>
      insegnaAllaReina(m.cowId, valutaImprese(m.stats, 'battle')));
    if (won) {
      addTrainerXp(d.rewardXp);
      setTrainer(prev => ({ ...prev, coins: prev.coins + d.rewardCoins }));
      // assegna gli oggetti rari in premio
      setBackpack(prev => {
        const next = prev.map(it => ({ ...it }));
        d.rewardItems.forEach(r => {
          const found = next.find(it => it.id === r.id);
          if (found) found.quantity += r.qty;
        });
        return next;
      });
      if (!dungeonsCleared.includes(d.id)) setDungeonsCleared(prev => [...prev, d.id]);
      // Prestigio: conquistare una Lega rende Forme di Fontina.
      setTrainer(prev => ({ ...prev, fontina: (prev.fontina ?? 0) + FONTINA_REWARD.legaConquistata }));
      const items = d.rewardItems.map(r => r.label).join(' · ');
      setTrekkingFeed(prev => [`🏆 ${d.league} CONQUISTATA! Medaglia ${d.badgeEmoji} · +${d.rewardCoins} 🪙 · +${FONTINA_REWARD.legaConquistata} 🧀 · +${d.rewardXp} XP · ${items}`, ...prev.slice(0, 8)]);
    } else {
      setTrekkingFeed(prev => [`💀 La ${d.league} ti ha respinto. Rinforza la squadra e riprova!`, ...prev.slice(0, 8)]);
    }
  };

  // Incontro casuale stile Pokémon: un Pastore errante ti sfida mentre cammini.
  const triggerRandomEncounter = () => {
    const pool = MAP_BATTLES.filter(mb => mb.kind === 'pastore' && trainer.level >= mb.reqLevel);
    if (pool.length === 0) return;
    const npc = pool[Math.floor(Math.random() * pool.length)];
    setEncounterFlash(true);
    if (soundEnabled) soundEngine.playHeadbutt();
    setTrekkingFeed(prev => [`⚔️ Incontro! ${npc.emoji} ${npc.name} ti sbarra il sentiero e ti sfida!`, ...prev.slice(0, 8)]);
    setTimeout(() => {
      setEncounterFlash(false);
      // posiziona l'incontro alla tua posizione (così è "in raggio")
      setActiveBattle({ ...npc, lat: effLat, lng: effLng, id: `enc-${npc.id}-${Date.now()}` });
    }, 750);
  };

  // FASE 4: incontro EDUCATIVO casuale. Un guardaparco/pastore ti ferma con una
  // domanda di comportamento responsabile (vedi data/responsibleQuestions.ts).
  const triggerRespectEncounter = () => {
    const q = RESPONSIBLE_QUESTIONS[Math.floor(Math.random() * RESPONSIBLE_QUESTIONS.length)];
    if (soundEnabled) playClickSfx();
    setTrekkingFeed(prev => [`${q.emoji} ${q.npc} ti ferma sul sentiero con una domanda sull'esplorazione responsabile…`, ...prev.slice(0, 8)]);
    setRespectEncounter(q);
  };
  // Esito dell'incontro educativo: aggiorna Rispetto, ricompense e feed.
  const resolveRespectEncounter = (correct: boolean) => {
    if (correct) {
      adjustRespect(6);
      addTrainerXp(80);
      setTrainer(prev => ({ ...prev, coins: prev.coins + 15 }));
      setTrekkingFeed(prev => [`🌿 Risposta corretta! Rispetto +6 · +15 🪙 · +80 XP`, ...prev.slice(0, 8)]);
    } else {
      adjustRespect(-4);
      setTrekkingFeed(prev => [`🌿 Risposta sbagliata: Rispetto -4. Hai imparato qualcosa di nuovo sulla montagna!`, ...prev.slice(0, 8)]);
    }
    setRespectEncounter(null);
  };

  // Synchronize dynamic Leaflet Map Layer drawing
  // S4 perf: split in due effetti. Questo (strutturale) ricrea l'intero layer
  // SOLO quando cambia la LISTA di entità (mapMode, wildCows, caseraCooldowns,
  // vatsadex, activeRouteId) o si entra/esce dalla tab mappa — non ad ogni tick
  // di posizione. L'effetto successivo (posizione-only) muove i marker esistenti.
  useEffect(() => {
    if (activeTab === 'map' && mapMode === 'real' && mapContainerRef.current) {
      const { lat: curLat, lng: curLng } = posRef.current;
      if (!leafletMapRef.current) {
        // Center on current player position
        const initMap = L.map(mapContainerRef.current, {
          center: [curLat, curLng],
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
      }

      const map = leafletMapRef.current;

      // Raggio di cattura attorno al giocatore
      if (leafletRadiusRef.current) leafletRadiusRef.current.remove();
      leafletRadiusRef.current = L.circle([curLat, curLng], {
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
      leafletCaseraMarkersRef.current.forEach(m => m.remove());
      leafletCaseraMarkersRef.current.clear();
      leafletWildMarkersRef.current.forEach(m => m.remove());
      leafletWildMarkersRef.current.clear();
      leafletRealCowMarkersRef.current.forEach(m => m.remove());
      leafletRealCowMarkersRef.current.clear();
      leafletBattleMarkersRef.current.forEach(m => m.remove());
      leafletBattleMarkersRef.current.clear();
      leafletDungeonMarkersRef.current.forEach(m => m.remove());
      leafletDungeonMarkersRef.current.clear();

      // Add Casera Checkpoints (PokéStops) — pascoli REALI
      REAL_CASERE.forEach(hp => {
        const hpLat = hp.lat ?? curLat;
        const hpLng = hp.lng ?? curLng;
        const cooldownActive = caseraCooldowns[hp.id] && caseraCooldowns[hp.id] > Date.now();

        const hpMarker = L.marker([hpLat, hpLng], { icon: buildCaseraIcon(hp, !!cooldownActive) })
          .addTo(map)
          .on('click', () => {
            playClickSfx();
            setSelectedCasera(hp);
            setSpinState('idle');
            setSpinRewards([]);
          });

        leafletCaseraMarkersRef.current.set(hp.id, hpMarker);
      });

      // Add Wild Cow Markers
      wildCows.forEach(wc => {
        const wcLat = wc.lat ?? curLat;
        const wcLng = wc.lng ?? curLng;

        const wcMarker = L.marker([wcLat, wcLng], { icon: buildWildCowIcon(wc) })
          .addTo(map)
          .on('click', () => {
            playClickSfx();
            initiateCatchWild(wc);
          });

        leafletWildMarkersRef.current.set(wc.id, wcMarker);
      });

      // ===== Bovine REALI (Batailles) non ancora catturate, nei comuni veri =====
      // Fog-of-war: l'identità di una Reina resta nascosta finché non ti avvicini
      // (entro DISCOVERY_RADIUS): allora viene "avvistata" e resta rivelata.
      const capturedIds = new Set(vatsadex.map(c => c.id));
      const roamingIds = new Set(wildCows.map(w => w.vatsa.id));
      const discSet = new Set(discoveredCowsRef.current);
      const newlyFound: { id: string; name: string; comune?: string }[] = [];
      REAL_COWS.filter(rc => !capturedIds.has(rc.id) && !roamingIds.has(rc.id) && rc.lat != null && rc.lng != null).forEach(rc => {
        const d = distanza({ lat: curLat, lng: curLng }, { lat: rc.lat!, lng: rc.lng! });
        const inRange = d <= RAGGIO_CATTURA;
        const isDiscovered = discSet.has(rc.id) || d <= DISCOVERY_RADIUS;
        if (d <= DISCOVERY_RADIUS && !discSet.has(rc.id)) newlyFound.push({ id: rc.id, name: rc.name, comune: rc.comune });

        const m = L.marker([rc.lat!, rc.lng!], { icon: buildRealCowIcon(rc, isDiscovered, inRange) })
          .addTo(map)
          .on('click', () => {
            playClickSfx();
            const { lat: nowLat, lng: nowLng } = posRef.current;
            const dist = distanza({ lat: nowLat, lng: nowLng }, { lat: rc.lat!, lng: rc.lng! });
            const known = new Set(discoveredCowsRef.current).has(rc.id) || dist <= DISCOVERY_RADIUS;
            if (!known) {
              setTrekkingFeed(prev => [`🌫️ Una Reina misteriosa pascola qui (a ${fmtDist(dist)}). Avvicinati per scoprirla!`, ...prev.slice(0, 8)]);
              return;
            }
            if (dist <= RAGGIO_CATTURA) {
              initiateCatchWild({ id: rc.id, vatsa: rc, lat: rc.lat!, lng: rc.lng!, x: 0, y: 0, angle: 0 });
            } else {
              setTrekkingFeed(prev => [`🧭 ${rc.name} (${rc.comune}) è a ${fmtDist(dist)}: cammina verso di lei!`, ...prev.slice(0, 8)]);
            }
          });
        leafletRealCowMarkersRef.current.set(rc.id, m);
      });
      // Registra le nuove Reines avvistate (persistito → sincronizzato sul cloud)
      if (newlyFound.length > 0) {
        setDiscoveredCows(prev => Array.from(new Set([...prev, ...newlyFound.map(n => n.id)])));
        newlyFound.slice(0, 3).forEach(n =>
          setTrekkingFeed(prev => [`🔭 Hai avvistato ${n.name}${n.comune ? ` (${n.comune})` : ''}!`, ...prev.slice(0, 8)]),
        );
      }

      // ===== BATTAGLIE sulla mappa (Pastori + Boss-Arena) =====
      MAP_BATTLES.forEach(mb => {
        const d = distanza({ lat: curLat, lng: curLng }, { lat: mb.lat, lng: mb.lng });
        const inRange = d <= BATTLE_RANGE;
        const locked = trainer.level < mb.reqLevel;
        const distLabel = inRange ? '⚔️ SFIDA' : fmtDist(d);
        const bm = L.marker([mb.lat, mb.lng], { icon: buildBattleIcon(mb, inRange, locked, distLabel) })
          .addTo(map)
          .on('click', () => tryStartBattleRef.current(mb));
        leafletBattleMarkersRef.current.set(mb.id, bm);
      });

      // ===== DUNGEON "Lega delle Reines" (castelli endgame) =====
      DUNGEONS.forEach(dg => {
        const d = distanza({ lat: curLat, lng: curLng }, { lat: dg.lat, lng: dg.lng });
        const inRange = d <= BATTLE_RANGE;
        const locked = trainer.level < dg.reqLevel;
        const cleared = dungeonsCleared.includes(dg.id);
        const distLabel = inRange ? '🏰 ENTRA' : fmtDist(d);
        const dm = L.marker([dg.lat, dg.lng], { icon: buildDungeonIcon(dg, inRange, locked, cleared, distLabel) })
          .addTo(map)
          .on('click', () => tryStartDungeonRef.current(dg));
        leafletDungeonMarkersRef.current.set(dg.id, dm);
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

      leafletPlayerMarkerRef.current = L.marker([curLat, curLng], { icon: playerHtmlIcon, interactive: false, zIndexOffset: -1000 })
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
        leafletCaseraMarkersRef.current.clear();
        leafletWildMarkersRef.current.clear();
        leafletRealCowMarkersRef.current.clear();
        leafletBattleMarkersRef.current.clear();
        leafletDungeonMarkersRef.current.clear();
      }
    }
  }, [activeTab, mapMode, wildCows, caseraCooldowns, vatsadex, activeRouteId]);

  // S4 perf: effetto leggero eseguito ad ogni tick di posizione (GPS reale o
  // passo simulato). NON ricrea marker: sposta la mappa/il player/il raggio di
  // cattura con setLatLng e aggiorna solo l'icona dei marker la cui resa dipende
  // dalla distanza (Reines reali in fog-of-war, battaglie, dungeon).
  useEffect(() => {
    if (activeTab !== 'map' || mapMode !== 'real' || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    map.setView([effLat, effLng], map.getZoom(), { animate: true });

    if (leafletRadiusRef.current) leafletRadiusRef.current.setLatLng([effLat, effLng]);
    if (leafletPlayerMarkerRef.current) leafletPlayerMarkerRef.current.setLatLng([effLat, effLng]);

    // Reines reali: aggiorna solo l'icona (fog-of-war/inRange) in base alla nuova distanza.
    const discSet = new Set(discoveredCowsRef.current);
    const newlyFound: { id: string; name: string; comune?: string }[] = [];
    leafletRealCowMarkersRef.current.forEach((marker, id) => {
      const rc = REAL_BY_ID.get(id);
      if (!rc || rc.lat == null || rc.lng == null) return;
      const d = distanza({ lat: effLat, lng: effLng }, { lat: rc.lat, lng: rc.lng });
      const inRange = d <= RAGGIO_CATTURA;
      const isDiscovered = discSet.has(rc.id) || d <= DISCOVERY_RADIUS;
      if (d <= DISCOVERY_RADIUS && !discSet.has(rc.id)) newlyFound.push({ id: rc.id, name: rc.name, comune: rc.comune });
      marker.setIcon(buildRealCowIcon(rc, isDiscovered, inRange));
    });
    if (newlyFound.length > 0) {
      setDiscoveredCows(prev => Array.from(new Set([...prev, ...newlyFound.map(n => n.id)])));
      newlyFound.slice(0, 3).forEach(n =>
        setTrekkingFeed(prev => [`🔭 Hai avvistato ${n.name}${n.comune ? ` (${n.comune})` : ''}!`, ...prev.slice(0, 8)]),
      );
    }

    // Battaglie: aggiorna solo l'icona (inRange/distanza mostrata).
    leafletBattleMarkersRef.current.forEach((marker, id) => {
      const mb = MAP_BATTLES.find(b => b.id === id);
      if (!mb) return;
      const d = distanza({ lat: effLat, lng: effLng }, { lat: mb.lat, lng: mb.lng });
      const inRange = d <= BATTLE_RANGE;
      const locked = trainer.level < mb.reqLevel;
      const distLabel = inRange ? '⚔️ SFIDA' : fmtDist(d);
      marker.setIcon(buildBattleIcon(mb, inRange, locked, distLabel));
    });

    // Dungeon: aggiorna solo l'icona (inRange/distanza mostrata).
    leafletDungeonMarkersRef.current.forEach((marker, id) => {
      const dg = DUNGEONS.find(d => d.id === id);
      if (!dg) return;
      const d = distanza({ lat: effLat, lng: effLng }, { lat: dg.lat, lng: dg.lng });
      const inRange = d <= BATTLE_RANGE;
      const locked = trainer.level < dg.reqLevel;
      const cleared = dungeonsCleared.includes(dg.id);
      const distLabel = inRange ? '🏰 ENTRA' : fmtDist(d);
      marker.setIcon(buildDungeonIcon(dg, inRange, locked, cleared, distLabel));
    });
  }, [activeTab, mapMode, effLat, effLng]);

  // GPS reale: attiva/disattiva il tracciamento della posizione vera
  const toggleGps = () => {
    playClickSfx();
    if (gpsOn || gpsState === 'requesting') {
      gpsSessionRef.current += 1;
      if (gpsWatchRef.current != null) navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
      setGpsOn(false);
      setGpsPos(null);
      setGpsState('off');
      setGpsAccuracy(null);
      setGpsUpdatedAt(null);
      setGpsIssue(null);
      setTrekkingFeed(prev => ['📍 GPS fermato: la posizione non viene più usata.', ...prev.slice(0, 8)]);
      return;
    }
    if (!navigator.geolocation) {
      setGpsState('error');
      setGpsIssue('Il dispositivo non espone la geolocalizzazione. Puoi continuare con la mappa e il cammino simulato.');
      setTrekkingFeed(prev => ['⚠️ GPS non disponibile su questo dispositivo.', ...prev.slice(0, 8)]);
      return;
    }
    setGpsState('requesting');
    setGpsIssue(null);
    setTrekkingFeed(prev => ['📡 Attivo il GPS reale: la posizione resta solo su questo dispositivo.', ...prev.slice(0, 8)]);
    const session = gpsSessionRef.current + 1;
    gpsSessionRef.current = session;
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (session !== gpsSessionRef.current) return;
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const match = abbinaPosizioneAPercorso(position, activeTrail);
        setGpsOn(true);
        setGpsState('active');
        setGpsPos(position);
        setGpsAccuracy(Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null);
        setGpsUpdatedAt(Date.now());
        if (match && match.distanceM <= GPS_ROUTE_TOLERANCE) {
          setCurrentWaypointIndex(match.segmentIndex);
          setWaypointProgress(match.progress);
          setGpsIssue(null);
        } else {
          setGpsIssue('Sei fuori dal tracciato attivo: usa la bussola per rientrare senza scorciatoie.');
        }
      },
      () => {
        if (session !== gpsSessionRef.current) return;
        if (gpsWatchRef.current != null) navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
        setGpsOn(false);
        setGpsState('error');
        setGpsIssue('Permesso negato o segnale assente. Nessuna posizione è stata salvata.');
        setTrekkingFeed(prev => ['⚠️ GPS non disponibile: puoi continuare con la mappa e il cammino simulato.', ...prev.slice(0, 8)]);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  };

  const centerGpsPosition = () => {
    playClickSfx();
    setMapMode('real');
    setTimeout(() => {
      leafletMapRef.current?.setView([effLat, effLng], Math.max(leafletMapRef.current.getZoom(), 15), { animate: true });
    }, 120);
  };

  const registraCheckpointGps = () => {
    playClickSfx();
    if (!gpsOn || !gpsPos) {
      setTrekkingFeed(prev => ['📍 Attiva il GPS e raggiungi la tappa per registrare il timbro.', ...prev.slice(0, 8)]);
      return;
    }
    if (!gpsRouteMatch || gpsRouteMatch.distanceM > GPS_ROUTE_TOLERANCE || gpsCheckpointDistance > GPS_CHECKPOINT_RANGE) {
      setTrekkingFeed(prev => ['🧭 Sei a ' + fmtDist(gpsCheckpointDistance) + ' dal checkpoint: resta sul sentiero e avvicìnati con calma.', ...prev.slice(0, 8)]);
      return;
    }
    if (checkpointClaimed) return;

    setGpsCheckpoints(prev => ({
      ...prev,
      [activeRouteId]: [...new Set([...(prev[activeRouteId] ?? []), gpsCheckpointIndex])],
    }));
    setTrainer(prev => ({ ...prev, coins: prev.coins + 15 }));
    addTrainerXp(50);
    setCurrentWaypointIndex(gpsCheckpointIndex);
    setWaypointProgress(0);
    setTrekkingFeed(prev => ['📍 Timbro registrato a ' + gpsCheckpoint.name + ': +15 🪙 · +50 XP · ' + checkpointMission.title + '.', ...prev.slice(0, 8)]);

    if (gpsCheckpointIndex === activeTrail.length - 1 && !completedRoutes.includes(activeRouteId)) {
      setCompletedRoutes(prev => prev.includes(activeRouteId) ? prev : [...prev, activeRouteId]);
      setTrainer(prev => ({ ...prev, coins: prev.coins + 200, fontina: (prev.fontina ?? 0) + FONTINA_REWARD.percorsoCompletato }));
      addTrainerXp(300);
      setTrekkingFeed(prev => ['🏁 Percorso completato con i checkpoint GPS: +300 XP · +200 🪙 · +' + FONTINA_REWARD.percorsoCompletato + ' 🧀.', ...prev.slice(0, 8)]);
    }
  };
  useEffect(() => () => {
    gpsSessionRef.current += 1;
    if (gpsWatchRef.current != null) navigator.geolocation.clearWatch(gpsWatchRef.current);
  }, []);

  // La mappa vive dentro la cornice "telefono" a larghezza fissa: se la finestra
  // viene ridimensionata (es. desktop ↔ mobile, rotazione), forza Leaflet a
  // ricalcolare le sue dimensioni così le tile non restano sfocate/tagliate.
  useEffect(() => {
    const onResize = () => { if (leafletMapRef.current) leafletMapRef.current.invalidateSize(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // PokeStop: Casere d'Alpeggio active interactions
  const [selectedCasera, setSelectedCasera] = useState<Hotspot | null>(null);
  // Bacheca dei trofei reali (mécro/sonnaille/collare) vinti nelle tappe ufficiali
  const [trofei, setTrofei] = useState<Trofeo[]>(() => {
    try { return JSON.parse(localStorage.getItem('vatsamon_trofei') || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('vatsamon_trofei', JSON.stringify(trofei)); }, [trofei]);
  // L'Éliminatoire du Dimanche: tappa in gioco + registro tappe giocate
  const [activeTappa, setActiveTappa] = useState<SeasonEvent | null>(null);
  const [tappeSave, setTappeSave] = useState<EliminatoireSave>(() => {
    try { return JSON.parse(localStorage.getItem(LS_ELIMINATOIRE) || '{}'); } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem(LS_ELIMINATOIRE, JSON.stringify(tappeSave)); }, [tappeSave]);
  const [showLeggende, setShowLeggende] = useState(false);
  // Leggende dell'albo già battute (cartoline storiche conquistate)
  const [leggendeBattute, setLeggendeBattute] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('vatsamon_leggende') || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('vatsamon_leggende', JSON.stringify(leggendeBattute)); }, [leggendeBattute]);
  // L'Arp: capi all'alpeggio, produzione annua, cerimonia della désarpa
  const [arpState, setArpState] = useState<ArpState>(() => {
    try { return { ...ARP_VUOTO, ...JSON.parse(localStorage.getItem(LS_ARP) || '{}') }; } catch { return ARP_VUOTO; }
  });
  useEffect(() => { localStorage.setItem(LS_ARP, JSON.stringify(arpState)); }, [arpState]);
  // chi è all'arp non gareggia: la selezione per battaglie/tornei usa questa lista
  const disponibili = vatsadex.filter(c => !arpState.capi[c.id]);
  const [spinState, setSpinState] = useState<'idle' | 'spinning' | 'rewarded'>('idle');
  const [spinDeg, setSpinDeg] = useState(0);
  const [spinRewards, setSpinRewards] = useState<string[]>([]);

  // Capture mode variables
  const [isCapturingMode, setIsCapturingMode] = useState(false);
  const [encounterCow, setEncounterCow] = useState<Vatsamon | null>(null);
  // FASE 3 — Valutazione del Giudice (evento speciale per Reine rare+): accuratezza
  // 0..100 che migliora l'affidamento. null = non ancora valutata.
  const [valutazione, setValutazione] = useState<number | null>(null);
  const [showValutazione, setShowValutazione] = useState(false);
  const [selectedBallId, setSelectedBallId] = useState<string>('item-bell-std');
  const [hasFedApple, setHasFedApple] = useState(false);
  // S4 perf: targetRingScale/throwSpeedGauge (tick 60fps/50ms) vivono ora dentro
  // <ThrowGauge> (src/components/ThrowGauge.tsx), non più come stato di App —
  // altrimenti ogni tick ri-eseguiva l'intero render di App durante il lancio.
  // throwSpeedRef riceve l'ultimo valore per la lettura one-shot in executeThrow.
  const throwSpeedRef = useRef(40);
  const [captureStep, setCaptureStep] = useState<'aiming' | 'flying' | 'wobbling' | 'secured' | 'escaped'>('aiming');
  const [captureLogMsg, setCaptureLogMsg] = useState('');


  // Backpack general item utility drawer
  const [activeCombatantId, setActiveCombatantId] = useState<string>(() => vatsadex[0]?.id || "");

  // Level Up overlay reward popup
  const [levelUpAward, setLevelUpAward] = useState<number | null>(null);

  // ---- 3. AUDIO MANAGEMENT & EVENT SFX ----
  const playClickSfx = () => { if (soundEnabled) soundEngine.playClick(); };
  const playMooSfx = () => { if (soundEnabled) soundEngine.playMoo(); };
  const playHitSfx = () => { if (soundEnabled) soundEngine.playHeadbutt(); };
  const playVictorySfx = () => { if (soundEnabled) soundEngine.playVictoryFanfare(); };



  // ---- 4. OVERWORLD PROCEDURAL GENERATOR ----
  const spawnWildCowAtRandom = (customLat?: number, customLng?: number, exclude?: Set<string>): WildCow => {
    // Posizione roaming vicino al giocatore
    const originLat = customLat !== undefined ? customLat : playerLat;
    const originLng = customLng !== undefined ? customLng : playerLng;
    const latOff = (Math.random() - 0.5) * 0.024;
    const lngOff = (Math.random() - 0.5) * 0.036;
    const cLat = originLat + latOff;
    const cLng = originLng + lngOff;
    const svg = getSvgCoords(cLat, cLng);

    // 🐄 80%: una VERA Reina non ancora catturata (così le reali dominano sulle inventate).
    const capturedIds = new Set(vatsadex.map(c => c.id));
    const roaming = exclude ?? new Set(wildCows.map(w => w.vatsa.id));
    const realPool = REAL_COWS.filter(c => !capturedIds.has(c.id) && !roaming.has(c.id));
    if (realPool.length > 0 && Math.random() < 0.8) {
      const real = realPool[Math.floor(Math.random() * realPool.length)];
      return { id: real.id, vatsa: real, lat: cLat, lng: cLng, x: svg.x, y: svg.y, angle: Math.random() * 360 };
    }

    const randBreed = WILD_BREEDS[Math.floor(Math.random() * WILD_BREEDS.length)];
    const randName = WILD_NAMES[Math.floor(Math.random() * WILD_NAMES.length)];
    const rarities: RarityType[] = ['Comune', 'Comune', 'Comune', 'Rara', 'Rara', 'Epica'];
    let randRarity = rarities[Math.floor(Math.random() * rarities.length)];

    // FASE 4 — EFFETTO DEL RISPETTO sul gameplay: un esploratore rispettoso della
    // montagna (Rispetto > 70) ha il 25% di probabilità di "promuovere" di un
    // gradino la rarità di una Reina selvatica generata (Comune→Rara→Epica→
    // Leggendaria). Vantaggio piccolo ma reale che premia il buon comportamento.
    if (respectScore > 70 && Math.random() < 0.25) {
      const ladder: RarityType[] = ['Comune', 'Rara', 'Epica', 'Leggendaria'];
      const idx = ladder.indexOf(randRarity);
      if (idx >= 0 && idx < ladder.length - 1) randRarity = ladder[idx + 1];
    }

    let str = 30 + Math.floor(Math.random() * 45);
    let def = 30 + Math.floor(Math.random() * 45);
    let agl = 30 + Math.floor(Math.random() * 45);

    if (randRarity === 'Leggendaria') { str += 20; def += 20; agl += 10; }
    else if (randRarity === 'Epica') { str += 10; def += 10; agl += 5; }

    const cp = Math.floor((str * 2 + def + agl) * (1.1 + (randRarity === 'Leggendaria' ? 1.0 : randRarity === 'Epica' ? 0.5 : randRarity === 'Rara' ? 0.2 : 0)));

    const generated: Vatsamon = {
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

    return {
      id: generated.id,
      vatsa: generated,
      lat: cLat,
      lng: cLng,
      x: svg.x,
      y: svg.y,
      angle: Math.random() * 360
    };
  };

  // Pannello Profilo / Salvataggio (export-import, rifornimento test)
  const [showProfile, setShowProfile] = useState(false);
  const [importText, setImportText] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

  // Modale generico di conferma/avviso — sostituisce i vari alert()/window.confirm()
  // sparsi nei flussi core (bloccano l'intera pagina, fuori stile con l'app).
  const [dialog, setDialog] = useState<{
    title: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean;
    onConfirm: () => void; onCancel?: () => void;
  } | null>(null);
  const showAlert = (title: string, message: string) => setDialog({ title, message, onConfirm: () => setDialog(null) });
  const showConfirm = (
    title: string, message: string, onYes: () => void,
    opts?: { confirmLabel?: string; danger?: boolean },
  ) => setDialog({
    title, message, confirmLabel: opts?.confirmLabel, danger: opts?.danger,
    onConfirm: () => { setDialog(null); onYes(); },
    onCancel: () => setDialog(null),
  });

  // Rifornimento "modalità test": scorte abbondanti, monete e livello per provare tutto.
  const restockResources = () => {
    playClickSfx();
    setBackpack(prev => {
      const want: Record<string, number> = {
        'item-bell-std': 50, 'item-bell-giga': 30, 'item-bell-iper': 20, 'item-bell-master': 15,
        'item-apple': 30, 'item-hay': 50,
      };
      const next = prev.map(it => ({ ...it, quantity: Math.max(it.quantity, want[it.id] ?? it.quantity) }));
      DEFAULT_BAG.forEach(def => { if (!next.find(n => n.id === def.id)) next.push({ ...def, quantity: want[def.id] ?? def.quantity }); });
      return next;
    });
    setTrainer(prev => ({ ...prev, coins: prev.coins + 2000, level: Math.max(prev.level, 12), xpToNextLevel: Math.max(prev.xpToNextLevel, 1000) }));
    setProfileMsg("Rifornimento completato: +2000 🪙, scorte piene, livello ≥ 12 (arene sbloccate).");
  };

  // SINK Fontina — Stella di Pedigree: riconoscimento permanente alla Désarpa.
  const buyPedigreeStar = () => {
    playClickSfx();
    const owned = trainer.pedigreeStars ?? 0;
    if (owned >= PEDIGREE_STAR_CAP) { setProfileMsg(`Hai già tutte le ${PEDIGREE_STAR_CAP} Stelle di Pedigree: massimo prestigio raggiunto! ★`); return; }
    const costo = costoStellaPedigree(owned);
    if ((trainer.fontina ?? 0) < costo) { setProfileMsg(`Ti servono ${costo} 🧀 Forme di Fontina per la prossima Stella (ne hai ${trainer.fontina ?? 0}). Vinci le Leghe e fai crescere le Reines!`); return; }
    setTrainer(prev => ({ ...prev, fontina: (prev.fontina ?? 0) - costo, pedigreeStars: (prev.pedigreeStars ?? 0) + 1 }));
    adjustRespect(3);
    setProfileMsg(`★ Stella di Pedigree n°${owned + 1} ottenuta! −${costo} 🧀 · prestigio permanente (+Rispetto).`);
  };

  // Raccoglie tutte le chiavi di salvataggio (prefisso vatsamon_).
  // La collezione viene COMPATTATA: le Reines reali del bundle si salvano come
  // id + sole differenze rispetto alla scheda originale (foto/lore/stat statiche
  // non si ripetono); le Reines generate o nate in stalla si salvano per intero.
  const collectSave = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      // salta il backup interno (macchinario cloud, non è progresso da esportare)
      if (k && k.startsWith('vatsamon_') && k !== 'vatsamon_backup_latest') data[k] = localStorage.getItem(k) ?? "";
    }
    try {
      const coll = JSON.parse(data['vatsamon_collection_go'] || '[]') as Vatsamon[];
      data['vatsamon_collection_go'] = JSON.stringify(coll.map(c => {
        const base = REAL_BY_ID.get(c.id);
        if (!base) return { f: c }; // generata / nata in stalla → intera
        const d: Record<string, unknown> = {};
        for (const key of Object.keys(c) as (keyof Vatsamon)[]) {
          if (JSON.stringify(c[key]) !== JSON.stringify(base[key])) d[key] = c[key];
        }
        return { i: c.id, d };
      }));
    } catch { /* lascia la collezione com'è se il parsing fallisce */ }
    try {
      // lo zaino è dato statico: salva solo id + quantità (le descrizioni si reidratano)
      const bag = JSON.parse(data['vatsamon_bag_go'] || '[]') as BackpackItem[];
      data['vatsamon_bag_go'] = JSON.stringify(bag.map(b => BAG_BY_ID.has(b.id) ? [b.id, b.quantity] : { f: b }));
    } catch { /* idem */ }
    return JSON.stringify({ app: "vatsamon", v: 2, data });
  };

  // Reidrata una collezione compattata (v2) nella forma completa attesa dal gioco.
  const rehydrateCollection = (raw: string): string => {
    try {
      const mini = JSON.parse(raw) as Array<{ f?: Vatsamon; i?: string; d?: Partial<Vatsamon> }>;
      if (!Array.isArray(mini) || !mini.length || !('f' in mini[0] || 'i' in mini[0])) return raw; // già completa
      const full = mini.map(m => {
        if (m.f) return m.f;
        const base = REAL_BY_ID.get(m.i ?? '');
        return base ? { ...base, ...(m.d ?? {}) } : m.d;
      });
      return JSON.stringify(full);
    } catch { return raw; }
  };

  // Reidrata lo zaino compattato ([id, quantità]) dalle definizioni di DEFAULT_BAG.
  const rehydrateBag = (raw: string): string => {
    try {
      const mini = JSON.parse(raw) as Array<[string, number] | { f: BackpackItem }>;
      if (!Array.isArray(mini) || !mini.length || !(Array.isArray(mini[0]) || 'f' in (mini[0] as object))) return raw;
      const full = mini.map(m => {
        if (Array.isArray(m)) { const base = BAG_BY_ID.get(m[0]); return base ? { ...base, quantity: m[1] } : { id: m[0], name: m[0], description: '', quantity: m[1], type: 'ball' }; }
        return (m as { f: BackpackItem }).f;
      });
      return JSON.stringify(full);
    } catch { return raw; }
  };

  // Codice di salvataggio COMPATTO: il JSON viene compresso (gzip) e codificato
  // in base64url → stringa molto più corta, comoda da passare tra browser.
  // Prefisso "V~" = compresso; fallback "B~" = base64 puro se gzip non c'è.
  const encodeSave = async (): Promise<string> => {
    const json = collectSave();
    if (typeof CompressionStream === "undefined") {
      return "B~" + btoa(unescape(encodeURIComponent(json)));
    }
    const cs = new CompressionStream("gzip");
    const stream = new Blob([new TextEncoder().encode(json)]).stream().pipeThrough(cs);
    const buf = new Uint8Array(await new Response(stream).arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return "V~" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  // Decodifica un codice in JSON, riconoscendo i formati: V~ (gzip), B~/base64, JSON grezzo.
  const decodeSave = async (raw: string): Promise<string> => {
    if (raw.startsWith("V~")) {
      const b64 = raw.slice(2).replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const ds = new DecompressionStream("gzip");
      const stream = new Blob([bytes]).stream().pipeThrough(ds);
      return new TextDecoder().decode(await new Response(stream).arrayBuffer());
    }
    if (raw.startsWith("{")) return raw;                          // JSON grezzo
    const b64 = raw.startsWith("B~") ? raw.slice(2) : raw;         // base64 (con o senza prefisso)
    return decodeURIComponent(escape(atob(b64)));
  };

  const copySaveCode = async () => {
    playClickSfx();
    const code = await encodeSave();
    try { await navigator.clipboard.writeText(code); setProfileMsg(`Codice copiato negli appunti ✅ (${code.length} caratteri)`); }
    catch { setImportText(code); setProfileMsg("Copia non disponibile: codice mostrato qui sotto, selezionalo a mano."); }
  };

  const downloadSave = () => {
    playClickSfx();
    const blob = new Blob([collectSave()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "vatsamon-salvataggio.json"; a.click();
    URL.revokeObjectURL(url);
    setProfileMsg("File di salvataggio scaricato 💾");
  };

  const importSave = async () => {
    playClickSfx();
    const raw = importText.trim();
    if (!raw) { setProfileMsg("Incolla prima un codice o un JSON di salvataggio."); return; }
    try {
      const json = await decodeSave(raw);
      const obj = JSON.parse(json);
      const data = obj.data ?? obj;
      // Backup di sicurezza PRIMA di sovrascrivere: se l'importazione era un
      // errore, "Annulla ultimo ripristino" nel Profilo la disfa.
      backupLocalSave('pre-import');
      Object.entries(data).forEach(([rawKey, v]) => {
        // accetta anche i codici esportati prima della rinomina (vazzamon_*)
        const k = normalizeSaveKey(rawKey);
        if (!k.startsWith('vatsamon_')) return;
        let val = String(v);
        if (k === 'vatsamon_collection_go') val = rehydrateCollection(val);
        else if (k === 'vatsamon_bag_go') val = rehydrateBag(val);
        localStorage.setItem(k, val);
      });
      setProfileMsg("Salvataggio importato! Ricarico il gioco…");
      setTimeout(() => window.location.reload(), 700);
    } catch {
      setProfileMsg("Codice non valido. Controlla di averlo incollato per intero.");
    }
  };

  const resetAll = () => {
    playClickSfx();
    showConfirm(
      "Azzerare tutti i progressi?",
      "L'operazione non è reversibile (puoi comunque provare \"Annulla ultimo ripristino\" nel Profilo se cambi idea subito dopo).",
      () => {
        // Backup PRIMA di azzerare: è quello che "Annulla ultimo ripristino" userà.
        backupLocalSave('pre-reset');
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          // azzera anche le copie legacy pre-rinomina, o la migrazione le farebbe risorgere.
          // Esclude BACKUP_KEY: è il backup appena fatto, non va perso nell'azzeramento.
          if (k && k !== BACKUP_KEY && (k.startsWith('vatsamon_') || k.startsWith('vazzamon_'))) localStorage.removeItem(k);
        }
        window.location.reload();
      },
      { confirmLabel: "Azzera tutto", danger: true },
    );
  };

  /** "Annulla ultimo ripristino": disfa l'ultimo reset/import ripristinando il backup pre-operazione. */
  const undoLastRestore = () => {
    playClickSfx();
    showConfirm(
      "Annullare l'ultimo ripristino?",
      "Ripristina i progressi salvati prima dell'ultimo azzeramento o importazione.",
      () => {
        if (restoreLocalBackup()) window.location.reload();
        else showAlert("Nessun backup disponibile", "Non c'è un backup locale da ripristinare.");
      },
    );
  };

  // ProfileModal (S7): handler composti, identici agli onClick inline che sostituiscono.
  const canLogoutFromProfile = firebaseEnabled && !!user && !user.isGuest;
  const handleReplayTutorial = () => { playClickSfx(); setShowProfile(false); setActiveBattle(TUTORIAL_BATTLE); };
  const handleLogoutClick = () => {
    if (!user) return;
    showConfirm(
      "Uscire dall'account?",
      "I progressi vengono sincronizzati col cloud prima di uscire.",
      () => {
        saveCloudSave(user.uid).catch(() => { /* sync best-effort: non blocca il logout */ })
          .finally(() => { signOut().catch(() => { /* logout locale già avvenuto: best-effort */ }); });
      },
      { confirmLabel: "Esci", danger: true },
    );
  };

  // NOVITÀ DI VERSIONE (S19): modale "cosa c'è di nuovo" al primo mount dopo
  // login/onboarding (App monta solo a fase "ready", vedi AuthGate.tsx) — mai
  // durante il tutorial di Mémé o una scena di combattimento (stesso guard
  // già usato per il bubble del tutorial più sotto: !activeBattle &&
  // !activeDungeon && !activeTappa). Una volta chiuso, la versione vista
  // resta in localStorage per-device (mai in SAVE_KEYS: non è un dato di gioco).
  const WHATS_NEW_SEEN_KEY = 'vatsamon_versione_vista';
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  useEffect(() => {
    if (tutorialAttivo || activeBattle || activeDungeon || activeTappa) return;
    if (localStorage.getItem(WHATS_NEW_SEEN_KEY) === __APP_VERSION__) return;
    if (!CHANGELOG.some(entry => entry.version === __APP_VERSION__)) return;
    setShowWhatsNew(true);
  }, [tutorialAttivo, activeBattle, activeDungeon, activeTappa]);
  const closeWhatsNew = () => { localStorage.setItem(WHATS_NEW_SEEN_KEY, __APP_VERSION__); setShowWhatsNew(false); };
  const handleShowWhatsNew = () => { playClickSfx(); setShowProfile(false); setShowWhatsNew(true); };

  // Pre-spawn some wild cows around the screen if none exist (senza duplicati)
  useEffect(() => {
    if (wildCows.length === 0) {
      const ex = new Set<string>();
      const arr: WildCow[] = [];
      for (let i = 0; i < 4; i++) {
        const w = spawnWildCowAtRandom(playerLat, playerLng, ex);
        ex.add(w.vatsa.id);
        arr.push(w);
      }
      setWildCows(arr);
    }
  }, []);

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

    // Update trek coordinates progress
    const nextProgress = waypointProgress + 20; // 5 steps of 500m = 2.5km segment
    let nextIndex = safeWaypointIndex;
    let actualProgress = nextProgress;
    let feedMsg = "";

    if (nextProgress >= 100) {
      nextIndex = (safeWaypointIndex + 1) % activeTrail.length;
      actualProgress = nextProgress - 100;
      feedMsg = `🏔️ Nuovo Traguardo! Sei arrivato a: ${activeTrail[nextIndex].name}!`;
      // Percorso COMPLETATO al raggiungimento dell'ultima tappa.
      if (nextIndex === activeTrail.length - 1 && !completedRoutes.includes(activeRouteId)) {
        setCompletedRoutes(prev => prev.includes(activeRouteId) ? prev : [...prev, activeRouteId]);
        setTrainer(prev => ({ ...prev, coins: prev.coins + 200, fontina: (prev.fontina ?? 0) + FONTINA_REWARD.percorsoCompletato }));
        addTrainerXp(300);
        setTrekkingFeed(prev => [`🏁 Percorso "${activeRoute.name}" COMPLETATO! +300 XP · +200 🪙 · +${FONTINA_REWARD.percorsoCompletato} 🧀 · ora rigiocabile liberamente`, ...prev.slice(0, 8)]);
      }
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

    // Spawn another wild Vatsamon nearby
    if (Math.random() > 0.3) {
      setWildCows(prev => [...prev.slice(-3), spawnWildCowAtRandom(nextLat, nextLng, new Set(prev.map(w => w.vatsa.id)))]); // max 4 roaming, niente doppioni
    }

    // Update the live feed list
    setTrekkingFeed(prev => [
      `🌳 Hai camminato per altri 500m! (+2 monete d'oro 🪙)`,
      feedMsg,
      ...prev.slice(0, 8)
    ]);

    // INCONTRI CASUALI mentre cammini. Mutuamente esclusivi: parte al più uno per
    // passo, e solo se non c'è già una battaglia o un incontro educativo in corso.
    const busy = activeBattle || respectEncounter;
    if (!busy && vatsadex.length > 0 && Math.random() < 0.22) {
      // a) Incontro di BATTAGLIA stile Pokémon: un Pastore errante ti sfida.
      triggerRandomEncounter();
    } else if (!busy && Math.random() < 0.20) {
      // b) FASE 4 — Incontro EDUCATIVO: un guardaparco/pastore pone una domanda
      //    di comportamento responsabile in montagna (probabilità separata).
      triggerRespectEncounter();
    }
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
      looted.push("+4 Campanacci d'Ottone");
      setBackpack(prev => prev.map(item => item.id === 'item-bell-std' ? { ...item, quantity: item.quantity + 4 } : item));
      
      if (odds > 0.4) {
        looted.push("+2 Mele d'Oro");
        setBackpack(prev => prev.map(item => item.id === 'item-apple' ? { ...item, quantity: item.quantity + 2 } : item));
      }
      if (odds > 0.7) {
        looted.push("+1 Campanaccio d'Acciaio");
        setBackpack(prev => prev.map(item => item.id === 'item-bell-giga' ? { ...item, quantity: item.quantity + 1 } : item));
      }
      if (odds > 0.88) {
        looted.push("+1 Campanaccio Runico");
        setBackpack(prev => prev.map(item => item.id === 'item-bell-iper' ? { ...item, quantity: item.quantity + 1 } : item));
      }
      if (odds > 0.9) {
        looted.push("+1 Fieno Vette");
        setBackpack(prev => prev.map(item => item.id === 'item-hay' ? { ...item, quantity: item.quantity + 1 } : item));
      }
      // Oggetti DA BATTAGLIA (cure + buff) — così si raccolgono e si usano in combattimento.
      if (odds > 0.45) {
        looted.push("+2 Secchi di Latte 🥛");
        setBackpack(prev => prev.map(item => item.id === 'item-potion-milk' ? { ...item, quantity: item.quantity + 2 } : item));
      }
      if (odds > 0.72) {
        looted.push("+1 Genepy del Pastore 🍵 (ATK)");
        setBackpack(prev => prev.map(item => item.id === 'item-buff-genepy' ? { ...item, quantity: item.quantity + 1 } : item));
      }
      if (odds > 0.8) {
        looted.push("+1 Campanaccio Fortunato 🔔 (DIF)");
        setBackpack(prev => prev.map(item => item.id === 'item-buff-bell' ? { ...item, quantity: item.quantity + 1 } : item));
      }
      if (odds > 0.91) {
        looted.push("+1 Fetta di Fontina 🧀 (cura+)");
        setBackpack(prev => prev.map(item => item.id === 'item-potion-fontina' ? { ...item, quantity: item.quantity + 1 } : item));
      }
      if (odds > 0.95) {
        looted.push("+1 Grappa alla Genziana 🥃 (Adrenalina)");
        setBackpack(prev => prev.map(item => item.id === 'item-energy-grappa' ? { ...item, quantity: item.quantity + 1 } : item));
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
    setEncounterCow(wild.vatsa);
    setIsCapturingMode(true);
    setValutazione(null);
    setShowValutazione(false);
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
      showAlert("Campanaccio esaurito", "Nessun campanello rimasto di questo tipo! Cambia ball.");
      return;
    }

    setBackpack(prev => prev.map(item => {
      if (item.id === selectedBallId) {
        return { ...item, quantity: item.quantity - 1 };
      }
      return item;
    }));

    setCaptureStep('flying');
    
    // Assess throw precision (letto da throwSpeedRef: S4 perf, vedi dichiarazione sopra)
    const throwSpeedAtRelease = throwSpeedRef.current;
    let rating: 'EXCELLENT' | 'GREAT' | 'NICE' | 'MISS' = 'NICE';
    if (throwSpeedAtRelease >= 75 && throwSpeedAtRelease <= 92) {
      rating = 'EXCELLENT';
    } else if (throwSpeedAtRelease >= 55 && throwSpeedAtRelease <= 95) {
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
      // Tasso finale: rarità base × potenza del campanaccio × mela × precisione lancio.
      const ballMeta = BALL_META[selectedBallId];
      let captureChance: number;
      if (ballMeta && ballMeta.mult === null) {
        captureChance = 1.0; // Campanaccio di Platino: cattura garantita
      } else {
        captureChance = BASE_CATCH[encounterCow?.rarity ?? 'Comune'];
        captureChance *= ballMeta?.mult ?? 1;       // potenza della ball
        if (hasFedApple) captureChance *= 1.5;       // mela alpina
        if (rating === 'EXCELLENT') captureChance *= 1.6;
        else if (rating === 'GREAT') captureChance *= 1.35;
        // FASE 3 — la Valutazione del Giudice conquista la fiducia dell'allevatore.
        if (valutazione !== null) captureChance *= valutazione >= 85 ? 1.6 : valutazione >= 60 ? 1.3 : 1.1;
      }

      const isCaught = Math.random() <= captureChance;

      if (isCaught && encounterCow) {
        setCaptureStep('secured');
        setCaptureLogMsg(`${encounterCow.name} si fida di te! Registrata nel Libretto di Mandria.`);
        playVictorySfx();

        // Add to permanent collection (con la valutazione del giudice, se fatta)
        const registrata = valutazione !== null ? { ...encounterCow, valutazioneGiudice: valutazione } : encounterCow;
        setVatsadex(prev => [registrata, ...prev]);
        setActiveCombatantId(registrata.id);
        impara('reine');
        
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
  /** Potenzia la Reina; ritorna la scheda aggiornata (o null se mancano risorse). */
  const handlePowerUpCow = (cow: Vatsamon): Vatsamon | null => {
    // Costs 10 coins and 1 Fieno delle Vette
    const hasHayObj = backpack.find(item => item.id === 'item-hay' && item.quantity > 0);
    if (trainer.coins < 15 || !hasHayObj) {
      showAlert("Risorse insufficienti", "Mancano monete (costo: 15🪙) o Fieno delle Vette (costo: 1 fieno🌾) per nutrire e potenziare questa bovina.");
      return null;
    }

    playVictorySfx();

    // Deduct inputs
    setTrainer(prev => ({ ...prev, coins: prev.coins - 15 }));
    setBackpack(prev => prev.map(item => item.id === 'item-hay' ? { ...item, quantity: item.quantity - 1 } : item));

    // Empower stats — la razione nutre anche il PESO VIVO (+4 kg, cap 750):
    // è così che si sale di categoria quando le soglie crescono con la fase.
    const pesoBase = cow.peso_kg ?? 480 + Math.round(((cow.stats4?.stazza ?? cow.stats.defense) - 50) * 2.4);
    const updated: Vatsamon = {
      ...cow,
      level: cow.level + 1,
      cp: cow.cp + 75 + Math.floor(Math.random() * 30),
      peso_kg: Math.min(750, pesoBase + 4),
      stats: {
        strength: Math.min(cow.stats.strength + 2, 100),
        defense: Math.min(cow.stats.defense + 2, 100),
        agility: Math.min(cow.stats.agility + 1, 100)
      },
    };
    // Scuola della Reina: crescendo si imparano le mosse dei livelli (3/5/8/12)
    const scuola = mosseDaLivello(updated);
    if (scuola.nuove.length) {
      scuola.nuove.forEach(m => sbloccaGlobale(m.id));
      setTrekkingFeed(prev => [`🎓 ${scuola.cow.name} ha imparato ${scuola.nuove.map(m => `${m.emoji} ${m.nome.toUpperCase()}`).join(' · ')}! Equipaggiala dal Libretto.`, ...prev.slice(0, 8)]);
    }
    setVatsadex(prev => prev.map(c => (c.id === cow.id ? scuola.cow : c)));
    // Tutorial di Mémé, beat «Nutri la tua Reina»: la Razione è il gesto giocato.
    if (tutorialAttivo && tutorial.beat === 1) passaBeat(2);
    return scuola.cow;
  };

  /** Equipaggia le mosse (4 id, una per famiglia) sulla Reina. */
  const handleEquipMosse = (cow: Vatsamon, mosse: string[]): Vatsamon => {
    setVatsadex(prev => prev.map(c => (c.id === cow.id ? { ...c, mosse } : c)));
    return { ...cow, mosse };
  };

  /** Mémé insegna una mossa del catalogo globale in cambio di Fontina. */
  const handleMemeTeach = (cow: Vatsamon, mossaId: string, costo: number): Vatsamon | null => {
    if ((trainer.fontina ?? 0) < costo) {
      setTrekkingFeed(prev => [`👵 Mémé: «Torna con ${costo} 🧀, il sapere si scambia con la fontina.»`, ...prev.slice(0, 8)]);
      return null;
    }
    const { cow: updated, nuove } = insegnaMosse(cow, [mossaId]);
    if (!nuove.length) return cow;
    setTrainer(prev => ({ ...prev, fontina: (prev.fontina ?? 0) - costo }));
    setVatsadex(prev => prev.map(c => (c.id === cow.id ? { ...c, mosseApprese: updated.mosseApprese } : c)));
    setTrekkingFeed(prev => [`👵 Mémé insegna ${nuove[0].emoji} ${nuove[0].nome.toUpperCase()} a ${cow.name} (−${costo} 🧀).`, ...prev.slice(0, 8)]);
    return updated;
  };

  /** Libera la Reina al pascolo; true se l'operazione è andata a buon fine. */
  const handleTransferCow = (cow: Vatsamon): boolean => {
    if (vatsadex.length <= 1) {
      showAlert("Non puoi liberare questa Reina", "Non puoi liberare la tua unica Regina al pascolo! Devi tenere almeno un Vatsamon.");
      return false;
    }
    playClickSfx();
    // NOTA: resta window.confirm() (non il ConfirmDialog custom) perché il
    // chiamante (VatsadexView, fuori scope in questo step) si aspetta un
    // boolean SINCRONO per decidere se chiudere subito il pannello di
    // dettaglio — un modale React risolverebbe la conferma solo al giro di
    // render successivo, disallineando "libera confermata" da "pannello chiuso".
    const confirmed = window.confirm(`Vuoi davvero liberare ${cow.name} rimandandola al pascolo libero? Riceverai +5 kg di Fieno delle Vette in premio!`);
    if (!confirmed) return false;

    // Filter out
    setVatsadex(prev => {
      const filtered = prev.filter(c => c.id !== cow.id);
      if (activeCombatantId === cow.id) {
        setActiveCombatantId(filtered[0]?.id || "");
      }
      return filtered;
    });

    // Reward fodder
    setBackpack(prev => prev.map(item => item.id === 'item-hay' ? { ...item, quantity: item.quantity + 5 } : item));
    showAlert("Reina liberata", `${cow.name} è tornata felice nell'alpeggio d'alta quota! Ricevuti +5 fieni.`);
    return true;
  };

  // ---- 10. REAL-TIME TAP-AND-DODGE GYM BATTLES ----
  // ---- 11. SCATTA LA REINA: dall'avvistamento verificato alla cattura ----
  // La verifica on-device avviene in ScattaView; qui la foto (già ritagliata)
  // viene archiviata in IndexedDB e l'avvistamento entra nel flusso di
  // avvicinamento col campanaccio come qualsiasi altra Reina.
  const handleSighting = async (photoDataUrl: string | null) => {
    const parsed = await generateVatsamonClient(null);
    const str = parsed.stats.strength;
    const def = parsed.stats.defense;
    const agl = parsed.stats.agility;
    const calculatedCp = Math.floor((str * 2 + def + agl) * (1.1 + (parsed.rarity === 'Leggendaria' ? 1.0 : parsed.rarity === 'Epica' ? 0.5 : parsed.rarity === 'Rara' ? 0.2 : 0)));

    let sightingPhotoId: string | undefined;
    if (photoDataUrl) {
      try {
        sightingPhotoId = `sight-${Date.now()}`;
        const blob = await (await fetch(photoDataUrl)).blob();
        await savePhoto(sightingPhotoId, blob);
      } catch {
        sightingPhotoId = undefined; // quota piena: la carta userà l'illustrazione
      }
    }

    const fullySynthesized: Vatsamon = { ...parsed, cp: calculatedCp, level: 15, sightingPhotoId };
    playMooSfx();
    setEncounterCow(fullySynthesized);
    setValutazione(null);
    setShowValutazione(false);
    setIsCapturingMode(true); // → approccio col campanaccio
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-rose-50 to-sky-100 font-sans text-slate-100 antialiased selection:bg-emerald-500 selection:text-white relative overflow-x-hidden flex justify-center" id="vatsamon-go-app">

      {/* Sfondo aurora animato (tema Pokémon moderno) */}
      <div className="aurora-bg" aria-hidden="true" />

      {/* CORNICE "TELEFONO": su desktop l'esperienza resta in una colonna centrata
          di larghezza massima mobile, con bordo/ombra ai lati; su mobile occupa
          tutto lo schermo senza cornice. */}
      <div className="phone-frame w-full max-w-md min-h-screen flex flex-col relative bg-slate-950/0 lg:shadow-2xl lg:border-x lg:border-slate-800/60 pb-24">

      {/* 🎒 HUD ALLEVATORE — 1 riga compatta + barra XP sottile (sticky, safe-area) 🎒 */}
      <div className="sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="bg-slate-950 shadow-md" id="trainer-hud">
        {/* accento bandiera valdostana: nero | rosso */}
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#1a1626 0 50%, #c8102e 50% 100%)" }} aria-hidden="true" />
        <div className="px-2.5 py-1.5 flex items-center justify-between gap-1.5">
          {/* identità: avatar + nome gioco + grado → apre il Profilo */}
          <button
            aria-label="Profilo e salvataggio"
            onClick={() => { playClickSfx(); setProfileMsg(""); setShowProfile(true); }}
            className="flex items-center gap-2 min-w-0 text-left rounded-xl px-1 py-1 hover:bg-slate-900 transition-colors"
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full border-2 border-[#c8102e] bg-slate-850 flex items-center justify-center overflow-hidden shadow-inner">
                <span className="text-xl">👨‍🌾</span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#c8102e] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow border border-white/30">
                {trainer.level}
              </div>
            </div>
            <div className="min-w-0">
              <div className="font-mono font-black text-[13px] tracking-wide title-gradient leading-tight">{BRAND.gameName.toUpperCase()}</div>
              <div className="text-[9.5px] font-mono text-slate-400 truncate max-w-[110px]" title={gradoStato.grado.perk}>
                <span className="text-amber-400 font-bold">{gradoStato.grado.emoji} {gradoStato.grado.nome}</span>
                {pedigreeStars > 0 && <span className="text-amber-300"> {'★'.repeat(Math.min(pedigreeStars, 5))}</span>}
              </div>
            </div>
          </button>

          {/* chip risorse + premi + audio */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="bg-slate-900 border border-amber-700/40 rounded-xl px-1.5 py-1 min-h-[40px] flex flex-col items-center justify-center min-w-[42px]" title="Denari d'Alpeggio">
              <span className="text-[11px] leading-none">🪙</span>
              <span className="text-[10.5px] font-mono font-extrabold text-amber-300 leading-tight tabular-nums">{trainer.coins}</span>
            </div>
            <div className="bg-slate-900 border rounded-xl px-1.5 py-1 min-h-[40px] flex flex-col items-center justify-center min-w-[38px]" style={{ borderColor: VALUTE.fontina.colore + "66" }} id="fontina-hud" title="Forme di Fontina — valuta di prestigio">
              <span className="text-[11px] leading-none">🧀</span>
              <span className="text-[10.5px] font-mono font-extrabold leading-tight tabular-nums" style={{ color: VALUTE.fontina.colore }}>{fontina}</span>
            </div>
            <div className="bg-slate-900 border rounded-xl px-1.5 py-1 min-h-[40px] flex flex-col items-center justify-center min-w-[38px]" style={{ borderColor: respectTone(respectScore).color + "66" }} id="respect-hud" title={`Rispetto: ${respectTone(respectScore).label} (${respectScore}/100)`}>
              <span className="text-[11px] leading-none">🌿</span>
              <span className="text-[10.5px] font-mono font-extrabold leading-tight tabular-nums" style={{ color: respectTone(respectScore).color }}>{respectScore}</span>
            </div>
            <button
              id="premi-chip"
              aria-label="Giro di Stalla: premi e missioni del giorno"
              onClick={() => { playClickSfx(); setActiveTab('premi'); }}
              className={`rounded-xl px-2 min-h-[40px] min-w-[40px] flex items-center justify-center border transition-colors ${activeTab === 'premi' ? 'nav-active text-white border-transparent' : 'bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800'}`}
            >
              <Gift className="w-[18px] h-[18px]" />
            </button>
            <button
              aria-label={soundEnabled ? 'Disattiva audio' : 'Attiva audio'}
              onClick={() => { playClickSfx(); setSoundEnabled(!soundEnabled); }}
              className="rounded-xl px-2 min-h-[40px] min-w-[40px] flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
            >
              {soundEnabled ? <Volume2 className="w-[18px] h-[18px] text-emerald-400" /> : <VolumeX className="w-[18px] h-[18px] text-slate-500" />}
            </button>
          </div>
        </div>

        {/* barra XP sottile a tutta larghezza */}
        <div className="h-1.5 bg-slate-800 w-full" title={`Lv ${trainer.level} · ${trainer.xp}/${trainer.xpToNextLevel} XP`}>
          <div className="bg-gradient-to-r from-[#c8102e] to-amber-400 h-full transition-all" style={{ width: `${Math.min(100, (trainer.xp / trainer.xpToNextLevel) * 100)}%` }} />
        </div>
      </header>
      </div>

      {/* 🗺️ ACTIVE VIEW DISPLAY 🗺️ */}
      <main className="flex-grow p-4 max-w-4xl w-full mx-auto" id="app-viewport">
        <div key={activeTab} className="view-in">
        
        {/* VIEW 1: INTERACTIVE MAP OVERWORLD (S7: estratta in OverworldMapView) */}
        <OverworldMapView
          isActiveTab={activeTab === 'map'}
          mapMode={mapMode}
          setMapMode={setMapMode}
          playClickSfx={playClickSfx}
          mapContainerRef={mapContainerRef}
          handleSimulatedWalk={handleSimulatedWalk}
          gpsOn={gpsOn}
          gpsState={gpsState}
          toggleGps={toggleGps}
          currentWaypoint={currentWaypoint}
          effLat={effLat}
          effLng={effLng}
          waypointProgress={waypointProgress}
          caseraCooldowns={caseraCooldowns}
          setSelectedCasera={setSelectedCasera}
          setSpinState={setSpinState}
          setSpinRewards={setSpinRewards}
          wildCows={wildCows}
          initiateCatchWild={initiateCatchWild}
          gpsAccuracy={gpsAccuracy}
          gpsUpdatedAt={gpsUpdatedAt}
          gpsIssue={gpsIssue}
          gpsTargetName={gpsTarget.name}
          gpsTargetDistance={gpsTargetDistance}
          gpsDirection={gpsDirection}
          gpsRouteDistanceM={gpsRouteMatch?.distanceM ?? null}
          claimedCheckpointsCount={claimedGpsCheckpoints.length}
          totalCheckpoints={activeTrail.length - 1}
          checkpointReady={checkpointReady}
          checkpointClaimed={checkpointClaimed}
          checkpointMission={checkpointMission}
          nearbyGpsPlaces={nearbyGpsPlaces}
          centerGpsPosition={centerGpsPosition}
          registraCheckpointGps={registraCheckpointGps}
          mapInstance={mapInstance}
          selectedTrail={selectedTrail}
          selectedTrailId={selectedTrailId}
          setSelectedTrailId={setSelectedTrailId}
          trekkingFeed={trekkingFeed}
          selectedCasera={selectedCasera}
          spinState={spinState}
          spinDeg={spinDeg}
          spinRewards={spinRewards}
          handleSpinCasera={handleSpinCasera}
          coins={trainer.coins}
          buyBottega={buyBottega}
        />

        {/* WILD CAPTURE / AR WILD ENCOUNTER SCREEN + Valutazione (S7: estratte in CaptureScreen) */}
        <CaptureScreen
          isCapturingMode={isCapturingMode}
          encounterCow={encounterCow}
          captureStep={captureStep}
          throwSpeedRef={throwSpeedRef}
          playClickSfx={playClickSfx}
          setIsCapturingMode={setIsCapturingMode}
          setEncounterCow={setEncounterCow}
          valutazione={valutazione}
          showValutazione={showValutazione}
          setShowValutazione={setShowValutazione}
          setValutazione={setValutazione}
          hasFedApple={hasFedApple}
          captureLogMsg={captureLogMsg}
          selectedBallId={selectedBallId}
          setSelectedBallId={setSelectedBallId}
          backpack={backpack}
          handleFeedApple={handleFeedApple}
          executeThrow={executeThrow}
        />

        {/* VIEW 2: PERCORSI — pianificazione separata dall'esplorazione */}
        {activeTab === 'routes' && (
          <RoutesView
            routes={TREK_ROUTES}
            activeRouteId={activeRouteId}
            completedRoutes={completedRoutes}
            trainerLevel={trainer.level}
            position={{ lat: effLat, lng: effLng }}
            battles={MAP_BATTLES}
            dungeons={DUNGEONS}
            onSelectRoute={(id) => { selectRoute(id); setActiveTab('map'); }}
            onStartBattle={tryStartBattle}
            onStartDungeon={tryStartDungeon}
            onOpenSeason={() => { playClickSfx(); setActiveTab('stagione'); }}
          />
        )}

        {/* VIEW 2: SCATTA LA REINA — riconoscimento fotografico on-device */}
        {activeTab === 'scanner' && (
          <ScattaView onSighting={handleSighting} playClick={playClickSfx} />
        )}

        {/* VIEW 3: CALF GESTATION & WEANING STABLE */}
        {activeTab === 'stalla' && (
          <div className="space-y-4">
          <ArpPanel
            fase={faseStato.id}
            oggi={oggiISO()}
            collection={vatsadex}
            arp={arpState}
            onInarpa={inarpa}
            onCura={curaArp}
            onScendi={scendiDallArp}
            onDesarpa={celebraDesarpa}
            playClick={playClickSfx}
          />
          <Suspense fallback={<SceneFallback />}>
            <StallaScreen
              collection={vatsadex}
              onBorn={(cow) => { setVatsadex(prev => [cow, ...prev]); impara('moudzon'); }}
              onUpdateCow={(updated) => setVatsadex(prev => prev.map(c => c.id === updated.id ? updated : c))}
              onReward={(coins, xp, fontinaN) => {
                if (coins) setTrainer(prev => ({ ...prev, coins: prev.coins + coins }));
                if (xp) addTrainerXp(xp);
                if (fontinaN) guadagnaFontina(fontinaN, 'un moudzon di stalla è diventato Reina');
              }}
              onOpenPvpMatch={(matchId) => setActivePvpMatchId(matchId)}
              playClick={playClickSfx}
            />
          </Suspense>
          </div>
        )}

        {/* VIEW 4: DETAILS/VATSADEX SHEET LIST */}
        {activeTab === 'vatsadex' && (
          <Suspense fallback={<SceneFallback />}>
          <VatsadexView
            collection={vatsadex}
            activeCombatantId={activeCombatantId}
            onSetBuddy={setActiveCombatantId}
            onPowerUp={handlePowerUpCow}
            onTransfer={handleTransferCow}
            fontina={trainer.fontina ?? 0}
            onEquipMosse={handleEquipMosse}
            onMemeTeach={handleMemeTeach}
            playClick={playClickSfx}
            playMoo={playMooSfx}
            playFanfare={playVictorySfx}
          />
          </Suspense>
        )}

        {/* VIEW: STAGIONE (second screen ufficiale delle Batailles de Reines) */}
        {activeTab === 'stagione' && (
          <div className="space-y-3">
            {/* Banda FASE CORRENTE — motore di fase della stagione reale */}
            <div id="fase-banner" className="rounded-2xl border border-[#c8102e]/40 p-3 flex items-center gap-3" style={{ background: "linear-gradient(90deg,#1a1626,#241a2e)" }}>
              <span className="text-3xl flex-shrink-0">{faseStato.emoji}</span>
              <div className="min-w-0 flex-grow">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#f6c873]">Fase · {faseStato.label}</div>
                <div className="text-xs text-slate-900 leading-snug">{faseStato.nota}</div>
                {faseStato.prossimo && (
                  <div className="text-[10px] text-slate-800 mt-0.5">📍 Prossima: <b className="text-slate-900">{faseStato.prossimo.comune}</b> · {faseStato.prossimo.data}</div>
                )}
              </div>
              {faseStato.giorniAllaFinale >= 0 && (
                <div className="text-center flex-shrink-0 bg-slate-950/60 rounded-xl px-2.5 py-1.5 border border-amber-700/40">
                  <div className="text-base font-mono font-black text-amber-300 leading-none">{faseStato.giorniAllaFinale}</div>
                  <div className="text-[9px] font-mono uppercase text-slate-500">gg alla finale</div>
                </div>
              )}
            </div>
          {/* ingresso alla Scuola d'Alpeggio (il quiz non è più una tab) */}
          <button
            id="quiz-entry"
            onClick={() => { playClickSfx(); setActiveTab('quiz'); }}
            className="w-full bg-slate-950 border border-emerald-800/50 rounded-2xl p-3 flex items-center gap-3 text-left hover:border-emerald-600/60 transition-colors"
          >
            <GraduationCap className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div className="min-w-0 flex-grow">
              <div className="text-[12px] font-mono font-black text-emerald-300 uppercase">Scuola d'Alpeggio</div>
              <div className="text-[10px] text-slate-400 truncate">Quiz su tradizioni, regole e rispetto{quizBest > 0 ? ` · record ${quizBest}` : ''}</div>
            </div>
            <span className="text-slate-500 text-lg" aria-hidden="true">›</span>
          </button>
          {/* L'ÉLIMINATOIRE DU DIMANCHE — le tappe reali si giocano */}
          <div className="bg-slate-950 border border-rose-800/40 rounded-2xl p-3 space-y-2" id="tappe-list">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-mono font-black uppercase tracking-widest text-rose-400">📯 L'Éliminatoire du Dimanche</div>
              <div className="text-[9px] font-mono text-slate-500">{Object.values(tappeSave).filter(r => r.vinta).length}/{tappe().length} vinte</div>
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">Ogni domenica del calendario vero si gioca: eliminazione diretta nella tua categoria alla pesa. Vinci il <b className="text-rose-300">mécro</b> della tappa; chi gioca la tappa mentre è aperta guadagna il timbro della domenica.</p>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {(() => {
                const oggi = oggiISO();
                return tappe().map(ev => {
                  const stato = tappaStato(ev, oggi);
                  const rec = tappeSave[ev.id];
                  const chiusa = stato === 'futura';
                  return (
                    <button
                      key={ev.id}
                      data-tappa={ev.id}
                      disabled={chiusa || vatsadex.length === 0}
                      onClick={() => { playClickSfx(); setActiveTappa(ev); }}
                      className={`flex-shrink-0 rounded-xl border-2 px-2.5 py-1.5 text-left min-h-[52px] ${
                        stato === 'aperta' ? 'border-emerald-500 bg-emerald-950/40' :
                        stato === 'memoriale' ? 'border-slate-700 bg-slate-900/70' : 'border-slate-850 bg-slate-900/40 opacity-60'}`}
                    >
                      <div className="text-[10px] font-mono font-black text-slate-100 whitespace-nowrap">{rec?.vinta ? '🌹 ' : ''}{ev.finale ? '👑 ' : ''}{ev.comune}</div>
                      <div className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                        {new Date(ev.data + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} ·{' '}
                        <span className={STATO_LABEL[stato].tone}>{STATO_LABEL[stato].label}</span>{rec?.timbro ? ' · ✓ domenica' : ''}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
          {/* L'ALBO DELLE LEGGENDE — sfida le campionesse vere della memoria */}
          <button
            id="leggende-entry"
            disabled={vatsadex.length === 0}
            onClick={() => { playClickSfx(); setShowLeggende(true); }}
            className="w-full bg-slate-950 border border-amber-700/40 rounded-2xl p-3 flex items-center gap-3 text-left hover:border-amber-500/60 transition-colors disabled:opacity-50"
          >
            <span className="text-2xl" aria-hidden="true">🏛️</span>
            <div className="min-w-0 flex-grow">
              <div className="text-[12px] font-mono font-black text-amber-300 uppercase">L'Albo delle Leggende</div>
              <div className="text-[10px] text-slate-400 truncate">Sfida Falchetta, Sirène e Suisse — le campionesse vere ({leggendeBattute.length}/3)</div>
            </div>
            <span className="text-slate-500 text-lg" aria-hidden="true">›</span>
          </button>
          <Suspense fallback={<SceneFallback />}>
            <SeasonView
              onReward={(coins, xp, kind, trofeoReale) => {
                setTrainer(prev => ({ ...prev, coins: prev.coins + coins }));
                addTrainerXp(xp);
                if (kind === 'reale' && trofeoReale) {
                  // S13 — ponte gioco↔realtà: la Reina seguita ha vinto DAVVERO
                  // la sua categoria (risultato ufficiale, mai simulato).
                  setTrofei(prev => [{
                    id: `trofeo-${trofeoReale.eventId}-mecro-reale`,
                    tipo: 'mecro-reale',
                    comune: trofeoReale.comune,
                    data: trofeoReale.data,
                    categoria: trofeoReale.categoria,
                    reinaNome: trofeoReale.reinaNome,
                  }, ...prev]);
                }
                const msg = kind === 'reale'
                  ? `📰 ${trofeoReale?.reinaNome ?? 'La Reina che segui'} ha vinto DAVVERO a ${trofeoReale?.comune ?? '—'}! Mécro reale in bacheca (+${coins} 🪙 +${xp} XP)`
                  : kind === 'tappa'
                    ? `🔮 Pronostico di tappa azzeccato! (+${coins} 🪙 +${xp} XP)`
                    : `🏆 Tabellone completato! Pronostico finale fatto (+${coins} 🪙 +${xp} XP)`;
                setTrekkingFeed(prev => [msg, ...prev.slice(0, 8)]);
              }}
            />
          </Suspense>
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
            <Suspense fallback={<SceneFallback />}>
              <QuizScreen
                bestScore={quizBest}
                onFinish={(correct, totale) => {
                  const coinsWon = correct * 10;
                  setTrainer(prev => ({ ...prev, coins: prev.coins + coinsWon }));
                  addTrainerXp(correct * 30);
                  if (correct > quizBest) {
                    setQuizBest(correct);
                    localStorage.setItem('vatsamon_quiz_go', String(correct));
                  }
                  setTrekkingFeed(prev => [`🎓 Scuola d'Alpeggio: ${correct}/${totale} risposte giuste (+${coinsWon} 🪙)`, ...prev.slice(0, 8)]);
                }}
              />
            </Suspense>
          </div>
        )}

        {/* VIEW: PREMI & OBIETTIVI (Sfide del Trekker, spostate qui dal tab Mappa) */}
        {activeTab === 'premi' && (
          <div className="space-y-6" id="premi-view">
            <DailyPanel
              captured={trainer.capturedCount}
              km={trainer.kmTraveled}
              onReward={(coins, xp) => {
                setTrainer(prev => ({ ...prev, coins: prev.coins + coins }));
                addTrainerXp(xp);
                setTrekkingFeed(prev => [`🐄 Giro di Stalla: +${coins} 🪙 +${xp} XP`, ...prev.slice(0, 8)]);
              }}
              playClick={playClickSfx}
            />
            <div className="bg-slate-950 border border-rose-700/30 rounded-3xl p-4">
              <Challenges
                stats={{
                  capturedReal: vatsadex.filter(c => c.isReal).length,
                  badges: trainerBadges.length,
                  quizBest,
                  km: trainer.kmTraveled,
                  level: trainer.level,
                }}
                claimed={claimedChallenges}
                onClaim={(id, coins, xp) => {
                  if (claimedChallenges.includes(id)) return;
                  playClickSfx();
                  setClaimedChallenges(prev => [...prev, id]);
                  setTrainer(prev => ({ ...prev, coins: prev.coins + coins }));
                  addTrainerXp(xp);
                  setTrekkingFeed(prev => [`🎯 Sfida completata! +${coins} 🪙 +${xp} XP`, ...prev.slice(0, 8)]);
                }}
              />
            </div>
          </div>
        )}

        {/* Le battaglie ora vivono sulla MAPPA (marker Pastori/Boss) + pannello "Sfide nei dintorni". */}
        </div>

      </main>

      {/* 🧭 NAV PRINCIPALE IN BASSO — 5 destinazioni, zona pollice, safe-area 🧭 */}
      <nav
        id="bottom-nav"
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-slate-950/95 backdrop-blur border-t border-slate-850 shadow-[0_-4px_16px_rgba(0,0,0,0.25)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 items-end gap-1 px-2 pt-1.5 pb-1.5 text-[11px] font-extrabold">
          <button
            onClick={() => { playClickSfx(); setActiveTab('map'); }}
            aria-label="Alpeggio: mappa ed esplorazione"
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] py-1.5 rounded-xl transition-all ${activeTab === 'map' ? 'nav-active text-white' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <Mountain className="w-5 h-5" />
            <span>Alpeggio</span>
          </button>

          <button
            onClick={() => { playClickSfx(); setActiveTab('routes'); }}
            aria-label="Percorsi: cammini, sfide e stagione"
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] py-1.5 rounded-xl transition-all ${activeTab === 'routes' ? 'nav-active text-white' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <Compass className="w-5 h-5" />
            <span>Percorsi</span>
          </button>

          {/* bottone centrale rialzato: Scatta la Reina */}
          <button
            onClick={() => { playClickSfx(); setActiveTab('scanner'); }}
            aria-label="Scatta la Reina: fotocamera"
            className="flex flex-col items-center justify-end gap-0.5 group"
          >
            <span
              className={`-mt-7 w-14 h-14 rounded-full flex items-center justify-center border-4 border-slate-950 shadow-lg transition-transform group-active:scale-95 ${activeTab === 'scanner' ? 'bg-gradient-to-br from-[#c8102e] to-amber-500 text-white' : 'bg-[#c8102e] text-white group-hover:brightness-110'}`}
            >
              <Camera className="w-6 h-6" />
            </span>
            <span className={activeTab === 'scanner' ? 'text-white' : 'text-slate-400'}>Scatta</span>
          </button>

          <button
            onClick={() => { playClickSfx(); setActiveTab('stalla'); }}
            aria-label="Stalla: allevamento e genealogia"
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] py-1.5 rounded-xl transition-all ${activeTab === 'stalla' ? 'nav-active text-white' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <Warehouse className="w-5 h-5" />
            <span>Stalla</span>
          </button>

          <button
            onClick={() => { playClickSfx(); setActiveTab('vatsadex'); }}
            aria-label="Libretto di Mandria: la tua collezione"
            className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] py-1.5 rounded-xl transition-all ${activeTab === 'vatsadex' ? 'nav-active text-white' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Libretto</span>
            {vatsadex.length > 0 && (
              <span className="absolute top-0.5 right-1.5 bg-amber-500 text-[#0b0820] text-[9px] px-1.5 rounded-full font-black">
                {vatsadex.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Flash d'incontro casuale (transizione stile Pokémon) */}
      {encounterFlash && <div className="encounter-flash" />}

      {/* SCENA DI BATTAGLIA stile Pokémon (lanciata dai marker/pannello sulla mappa) */}
      {activeBattle && (
        <Suspense fallback={<SceneFallback />}>
          <BattleScene
            battle={activeBattle}
            playerCows={disponibili}
            initialCowId={activeCombatantId}
            trainerLevel={trainer.level}
            respectScore={respectScore}
            backpack={backpack}
            onConsumeItem={(id) => setBackpack(prev => prev.map(it => it.id === id ? { ...it, quantity: Math.max(0, it.quantity - 1) } : it))}
            onResult={handleBattleResult}
            onClose={() => setActiveBattle(null)}
            playClick={playClickSfx}
          />
        </Suspense>
      )}

      {/* SCENA PvP live a turni (S9) — aperta dall'hub "Sfide tra Allevatori"
          nella Stalla. La partita vive su Firestore: chiudere la scena non
          la abbandona (il forfeit esplicito passa dal bottone dentro). */}
      {activePvpMatchId && (
        <Suspense fallback={<SceneFallback />}>
          <PvpBattleScene
            matchId={activePvpMatchId}
            onClose={() => setActivePvpMatchId(null)}
            playClick={playClickSfx}
          />
        </Suspense>
      )}

      {/* L'ALBO DELLE LEGGENDE — sfide della memoria */}
      {showLeggende && (
        <LeggendeView
          playerCows={disponibili}
          respectScore={respectScore}
          battute={leggendeBattute}
          onWin={(nome, cowId, stats) => {
            // la mossa-leggenda si guadagna solo alla PRIMA vittoria su QUELLA
            // leggenda; la progressione (Muggito → Slavina) segue le Leggende
            // DISTINTE già battute, non il catalogo globale. Le imprese di
            // stile restano valutate anche nelle riprese.
            const primaVolta = !leggendeBattute.includes(nome);
            insegnaAllaReina(cowId, valutaImprese(stats, primaVolta ? 'leggenda' : 'battle',
              { leggendeGiaBattute: leggendeBattute.length }));
            if (primaVolta) {
              setLeggendeBattute(prev => [...prev, nome]);
              addTrainerXp(300);
              setTrekkingFeed(prev => [`🏛️ Hai onorato la memoria: ${nome} battuta! Cartolina storica conquistata (+300 XP)`, ...prev.slice(0, 8)]);
            }
          }}
          onClose={() => setShowLeggende(false)}
          playClick={playClickSfx}
        />
      )}

      {/* L'ÉLIMINATOIRE DU DIMANCHE — la tappa reale in gioco */}
      {activeTappa && (
        <Suspense fallback={<SceneFallback />}>
          <EliminatoireView
            evento={activeTappa}
            stato={tappaStato(activeTappa, oggiISO())}
            playerCows={disponibili}
            respectScore={respectScore}
            backpack={backpack}
            onConsumeItem={(id) => setBackpack(prev => prev.map(it => it.id === id ? { ...it, quantity: Math.max(0, it.quantity - 1) } : it))}
            onFinish={handleTappaFinish}
            onClose={() => setActiveTappa(null)}
            playClick={playClickSfx}
          />
        </Suspense>
      )}

      {/* DUNGEON "Lega delle Reines" (gauntlet di 5 battaglie con squadra di 4) */}
      {activeDungeon && (
        <Suspense fallback={<SceneFallback />}>
          <DungeonRun
            dungeon={activeDungeon}
            playerCows={disponibili}
            respectScore={respectScore}
            backpack={backpack}
            onConsumeItem={(id) => setBackpack(prev => prev.map(it => it.id === id ? { ...it, quantity: Math.max(0, it.quantity - 1) } : it))}
            onResult={handleDungeonResult}
            onClose={() => setActiveDungeon(null)}
            playClick={playClickSfx}
          />
        </Suspense>
      )}

      {/* FASE 4 — INCONTRO EDUCATIVO casuale (guardaparco/pastore con una domanda
          di esplorazione responsabile) */}
      {respectEncounter && (
        <Suspense fallback={<SceneFallback />}>
          <RespectEncounter
            question={respectEncounter}
            onResolved={resolveRespectEncounter}
          />
        </Suspense>
      )}

      {/* IL TUTORIAL DI MÉMÉ — beat giocati, bubble sopra la nav (non blocca l'input) */}
      {tutorialAttivo && !activeBattle && !activeDungeon && !activeTappa && (
        tutorial.beat === 0 ? (
          <MemeGuide
            testo="Ohilà! Mémé, di Nus: tre generazioni di Reines. Ti insegno io come si sta in questa valle. Intanto due cose: quel riquadro è il DIARIO DI BORDO — racconta tutto quel che ti succede — e qui si va A PIEDI: cammina, e la valle si apre."
            labelAvanti="Avanti"
            onAvanti={() => {
              // Mémé mette in sacca ciò che serve alla lezione della Razione
              setBackpack(prev => {
                const found = prev.find(it => it.id === 'item-hay');
                if (found && found.quantity > 0) return prev;
                if (found) return prev.map(it => it.id === 'item-hay' ? { ...it, quantity: 1 } : it);
                const tpl = DEFAULT_BAG.find(it => it.id === 'item-hay');
                return tpl ? [...prev, { ...tpl, quantity: 1 }] : prev;
              });
              setTrainer(prev => prev.coins < 15 ? { ...prev, coins: prev.coins + 20 } : prev);
              setTrekkingFeed(prev => [`👵 Mémé ti mette in sacca 1 🌾 Fieno e qualche denaro: «Alla tua Reina serve la Razione.»`, ...prev.slice(0, 8)]);
              passaBeat(1);
            }}
            onSalta={chiudiTutorial}
            playClick={playClickSfx}
          />
        ) : tutorial.beat === 1 ? (
          <MemeGuide
            testo="Una Reina si NUTRE. Apri il 🐄 Libretto qui sotto, tocca la tua Reina e dalle la RAZIONE D'ALPEGGIO: cresce il peso, e il peso decide la categoria alla pesa — come nelle batailles vere."
            onSalta={chiudiTutorial}
            playClick={playClickSfx}
          />
        ) : tutorial.beat === 2 ? (
          <MemeGuide
            testo="Ora la piazza. Fripouille, la mia vecchia Reina, ti aspetta per la tua PRIMA BATAILLE: vieni, ti spiego tutto io, un colpo alla volta."
            labelAvanti="Alla lezione! 🐂"
            onAvanti={() => setActiveBattle(TUTORIAL_BATTLE)}
            onSalta={chiudiTutorial}
            playClick={playClickSfx}
          />
        ) : (
          <MemeGuide
            testo="Hai condotto, non hai forzato: così si fa. Là fuori trovi Pastori e arene sulla mappa, e la STAGIONE con le tappe della domenica. Le mosse nuove? Si guadagnano giocando. Adesso vai. E salutami la valle."
            labelAvanti="Vado! ⛰️"
            onAvanti={chiudiTutorial}
            playClick={playClickSfx}
          />
        )
      )}

      {/* PROFILO & SALVATAGGIO (S7: estratto in ProfileModal) */}
      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          reinesCount={vatsadex.length}
          level={trainer.level}
          coins={trainer.coins}
          gradoStato={gradoStato}
          pedigreeStars={pedigreeStars}
          fontina={fontina}
          onBuyPedigreeStar={buyPedigreeStar}
          onReplayTutorial={handleReplayTutorial}
          trofei={trofei}
          onRestockResources={restockResources}
          onCopySaveCode={copySaveCode}
          onDownloadSave={downloadSave}
          importText={importText}
          onImportTextChange={setImportText}
          onImportSave={importSave}
          onUndoLastRestore={undoLastRestore}
          profileMsg={profileMsg}
          canLogout={canLogoutFromProfile}
          onLogout={handleLogoutClick}
          onResetAll={resetAll}
          onShowWhatsNew={handleShowWhatsNew}
        />
      )}

      {/* NOVITÀ DI VERSIONE (S19): auto al mount fuori tutorial/battaglia, o riaperta dal Profilo */}
      {showWhatsNew && <WhatsNewModal onClose={closeWhatsNew} />}

      {/* FOOTER GENERAL LEGALS AND RESET ACCENTS */}
      <footer className="bg-slate-950 text-slate-500 text-[10px] text-center py-4 px-6 border-t border-slate-850 mt-12 gap-2 flex flex-col items-center relative z-10">
        <p>© 2026 {BRAND.gameName} — il gioco delle Batailles de Reines · Vallée d'Aoste.</p>
        <p className="flex items-center gap-1.5 text-slate-400 font-mono font-bold">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "linear-gradient(90deg,#1a1626 0 50%, #c8102e 50% 100%)" }} aria-hidden="true" />
          versione <span className="text-amber-400">v{APP_VERSION}</span>
        </p>
        <div className="flex gap-4">
          <button
            onClick={resetAll}
            className="text-[9px] text-slate-500 hover:text-rose-500 underline decoration-dotted underline-offset-2 cursor-pointer transition-colors"
          >
            Cancella memoria locale (Reset)
          </button>
          <span>•</span>
          <span>Campanacci del latte & Bataille de Reines®</span>
        </div>
      </footer>

      </div>{/* /phone-frame */}

      {/* OVERLAY LEVEL UP POPUP */}
      {levelUpAward && (
        <div className="fixed inset-0 bg-slate-950/95 z-55 flex items-center justify-center p-4 backdrop-blur-xs animate-scale-in" id="level-up-modal">
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border-2 border-emerald-500 p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-red-500"></div>
            
            <div className="text-4xl">👑🎒⭐</div>
            <h1 className="text-3xl font-mono font-black text-emerald-400">LIVELLO SUPERATO!</h1>
            <p className="text-sm text-slate-200">Congratulazioni! Sei salito al <b className="text-amber-300">Livello {levelUpAward}</b>!</p>
            
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-850">
              <h5 className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Premi Sbloccati d'alta quota</h5>
              <div className="flex justify-center gap-4 text-xs font-mono font-bold text-amber-300 mt-2">
                <span>+50 Monete 🪙</span>
                <span>+5 Campanacci d'Acciaio 🛎️</span>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSfx();
                setTrainer(prev => ({ ...prev, coins: prev.coins + 50 }));
                setBackpack(prev => prev.map(item => item.id === 'item-bell-giga' ? { ...item, quantity: item.quantity + 5 } : item));
                setLevelUpAward(null);
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0b0820] font-mono font-bold text-xs py-2.5 rounded-xl border-b-4 border-emerald-700 cursor-pointer"
            >
              RITIRA RICOMPENSE!
            </button>
          </div>
        </div>
      )}

      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          danger={dialog.danger}
          onConfirm={dialog.onConfirm}
          onCancel={dialog.onCancel}
        />
      )}

    </div>
  );
}
