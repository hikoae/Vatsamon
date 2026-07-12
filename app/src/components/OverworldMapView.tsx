import type { Dispatch, RefObject, SetStateAction } from 'react';
import type L from 'leaflet';
import { Compass, Footprints, LocateFixed, MapPin, RotateCw, ShieldAlert, Sparkles, X } from 'lucide-react';
import type { Hotspot, WildCow } from '../types';
import type { ValdostanTrail } from '../data/trails';
import { VALDOSTAN_TRAILS } from '../data/trails';
import { REAL_CASERE } from '../data/realCows';
import { WILD_BREEDS } from '../data/overworld';
import { SAC_ITEMS, BOTTEGA_EXTRA } from '../data/sac';
import { VatsamonAvatar } from './VatsamonAvatar';
import { GpsExplorerPanel, type NearbyPlace } from './GpsExplorerPanel';
import { TrailOverlay } from './TrailOverlay';

type Props = {
  // Il blocco principale (mappa/HUD/GPS/sentieri/diario) è visibile solo sul
  // tab 'map'; il modal casera resta indipendente da activeTab, come in origine
  // (selectedCasera può restare valorizzato mentre si cambia tab).
  isActiveTab: boolean;
  // Mappa (reale/radar) + HUD overworld
  mapMode: 'real' | 'radar';
  setMapMode: Dispatch<SetStateAction<'real' | 'radar'>>;
  playClickSfx: () => void;
  mapContainerRef: RefObject<HTMLDivElement | null>;
  handleSimulatedWalk: () => void;
  gpsOn: boolean;
  gpsState: 'off' | 'requesting' | 'active' | 'error';
  toggleGps: () => void;
  currentWaypoint: { lat: number; lng: number; name: string };
  effLat: number;
  effLng: number;
  waypointProgress: number;
  caseraCooldowns: Record<string, number>;
  setSelectedCasera: Dispatch<SetStateAction<Hotspot | null>>;
  setSpinState: Dispatch<SetStateAction<'idle' | 'spinning' | 'rewarded'>>;
  setSpinRewards: Dispatch<SetStateAction<string[]>>;
  wildCows: WildCow[];
  initiateCatchWild: (wc: WildCow) => void;

  // GPS Explorer Panel (passthrough)
  gpsAccuracy: number | null;
  gpsUpdatedAt: number | null;
  gpsIssue: string | null;
  gpsTargetName: string;
  gpsTargetDistance: number;
  gpsDirection: string;
  gpsRouteDistanceM: number | null;
  claimedCheckpointsCount: number;
  totalCheckpoints: number;
  checkpointReady: boolean;
  checkpointClaimed: boolean;
  checkpointMission: { title: string; detail: string };
  nearbyGpsPlaces: NearbyPlace[];
  centerGpsPosition: () => void;
  registraCheckpointGps: () => void;

  // Overlay sentieri reali + selettore
  mapInstance: L.Map | null;
  selectedTrail: ValdostanTrail | null;
  selectedTrailId: string | null;
  setSelectedTrailId: Dispatch<SetStateAction<string | null>>;

  // Diario di bordo
  trekkingFeed: string[];

  // Modal Casera (spin + bottega)
  selectedCasera: Hotspot | null;
  spinState: 'idle' | 'spinning' | 'rewarded';
  spinDeg: number;
  spinRewards: string[];
  handleSpinCasera: () => void;
  coins: number;
  buyBottega: (id: string, prezzo: number, nome: string) => void;
};

/** VIEW 1: MAPPA — esplorazione overworld (mappa reale/radar, GPS, sentieri, casere). */
export function OverworldMapView({
  isActiveTab,
  mapMode,
  setMapMode,
  playClickSfx,
  mapContainerRef,
  handleSimulatedWalk,
  gpsOn,
  gpsState,
  toggleGps,
  currentWaypoint,
  effLat,
  effLng,
  waypointProgress,
  caseraCooldowns,
  setSelectedCasera,
  setSpinState,
  setSpinRewards,
  wildCows,
  initiateCatchWild,
  gpsAccuracy,
  gpsUpdatedAt,
  gpsIssue,
  gpsTargetName,
  gpsTargetDistance,
  gpsDirection,
  gpsRouteDistanceM,
  claimedCheckpointsCount,
  totalCheckpoints,
  checkpointReady,
  checkpointClaimed,
  checkpointMission,
  nearbyGpsPlaces,
  centerGpsPosition,
  registraCheckpointGps,
  mapInstance,
  selectedTrail,
  selectedTrailId,
  setSelectedTrailId,
  trekkingFeed,
  selectedCasera,
  spinState,
  spinDeg,
  spinRewards,
  handleSpinCasera,
  coins,
  buyBottega,
}: Props) {
  return (
    <>
      {isActiveTab && (
      <div className="flex flex-col gap-6" id="overworld-view">

        <div className="bg-slate-950 rounded-3xl p-3 border border-slate-850 relative overflow-hidden shadow-2xl">

          {/* Overworld Title HUD */}
          <div className="flex flex-col items-start justify-between gap-3 mb-4 z-10 relative border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-mono font-black text-emerald-400 flex items-center gap-1.5 uppercase">
                <Compass className="w-5 h-5 text-emerald-500" />
                Sentiero d'Alta Quota
              </h2>
              <p className="text-xs text-slate-400">Esplora la Valle d'Aosta reale. Tocca le casere o cattura i Vatsamon sul cammino!</p>
            </div>

            {/* Map Mode Toggle & Simulated Walk in flex */}
            <div className="flex flex-wrap items-center gap-2 w-full">
              {/* Selector Segment */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => { playClickSfx(); setMapMode('real'); }}
                  className={`font-mono text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${mapMode === 'real' ? 'bg-emerald-500 text-[#0b0820] font-black' : 'text-slate-400 hover:bg-slate-850'}`}
                >
                  Mappa OSM Reale
                </button>
                <button
                  onClick={() => { playClickSfx(); setMapMode('radar'); }}
                  className={`font-mono text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${mapMode === 'radar' ? 'bg-emerald-500 text-[#0b0820] font-black' : 'text-slate-400 hover:bg-slate-850'}`}
                >
                  Sguardo del Pastore
                </button>
              </div>

              {/* Hike Button */}
              <button
                onClick={handleSimulatedWalk}
                disabled={gpsOn || gpsState === 'requesting'}
                aria-label={gpsOn || gpsState === 'requesting' ? 'Il GPS sta aggiornando il percorso' : 'Cammina 500 metri in modalità simulata'}
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-[#0b0820] font-black text-xs py-2.5 px-4 rounded-xl shadow active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-b-2 border-emerald-700 ml-auto"
                id="simulate-walk-btn"
              >
                <Footprints className="w-4 h-4 fill-current animate-bounce" />
                {gpsOn || gpsState === 'requesting' ? 'GPS guida il percorso' : 'CAMMINA 500m'}
              </button>

              {/* GPS reale */}
              <button
                onClick={toggleGps}
                aria-pressed={gpsOn || gpsState === 'requesting'}
                aria-label={gpsOn || gpsState === 'requesting' ? 'Ferma GPS' : 'Attiva GPS reale'}
                className={`font-black text-xs py-2.5 px-4 rounded-xl shadow active:scale-95 transition-all flex items-center gap-1.5 border-b-2 ${gpsOn ? 'bg-blue-500 text-white border-blue-700' : 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-850'}`}
                id="gps-btn"
              >
                <LocateFixed className="w-4 h-4" />
                {gpsOn || gpsState === 'requesting' ? 'Ferma GPS' : 'Attiva GPS'}
              </button>
            </div>
          </div>

          {/* Conditional Map View Frame */}
          {mapMode === 'real' ? (
            /* GEOGRAPHIC INTERACTIVE REAL MAP VIEW */
            <div className="relative w-full h-[460px] bg-slate-900 border-2 border-emerald-500/20 rounded-2xl overflow-hidden shadow-inner group z-0">
              <div ref={mapContainerRef} className="w-full h-full" id="real-gps-map" />

              {/* Overlay HUD status regarding current trekking location */}
              <div className="absolute top-3 left-3 bg-slate-950/95 border border-slate-855 font-mono text-[9px] text-slate-200 px-3.5 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl pointer-events-none z-35 max-w-[260px] space-y-1.5">
                <span className="text-emerald-400 font-extrabold uppercase block tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500 animate-bounce" />
                  {gpsOn ? 'Posizione GPS' : 'Tappa attuale'}
                </span>
                <div className="font-mono text-[11px] font-black text-slate-100 truncate">{currentWaypoint.name}</div>
                <div className="text-slate-400 text-[10px]">Coordinate: <span className="text-emerald-300 font-bold">{effLat.toFixed(4)}°N, {effLng.toFixed(4)}°E</span></div>

                <div className="pt-1">
                  <div className="w-full bg-slate-900 rounded-full h-1 relative overflow-hidden">
                    <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${waypointProgress}%` }} />
                  </div>
                  <div className="text-[9.5px] text-slate-500 flex justify-between mt-1">
                    <span>Punto Successivo</span>
                    <span>{waypointProgress}%</span>
                  </div>
                </div>
              </div>

              {/* Leaflet Tip Ribbon overlay */}
              <div className="absolute bottom-2.5 right-2.5 bg-slate-950/80 border border-slate-850 rounded-full py-0.5 px-3 text-[10px] text-slate-400 font-mono tracking-tight text-center whitespace-nowrap backdrop-blur-xs z-35">
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
                      <span className="text-[10px] bg-slate-950/80 font-mono text-slate-300 py-0.5 px-1.5 rounded-md mt-1 group-hover/marker:bg-slate-950 border border-slate-800">
                        {hp.name.split(" ")[0]} 🥛
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* WILD ROAMING VATSAMONS POPPING OUT */}
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
                      <VatsamonAvatar breed={wc.vatsa.breed} rarity={wc.vatsa.rarity} className="w-14 h-14 bg-slate-950/40 rounded-full border border-amber-500/30 p-1 backdrop-blur-xs transition-transform group-hover/cow:scale-125" />
                    </div>
                    <span className="text-[10px] font-mono font-black bg-slate-950/95 text-yellow-400 border border-amber-500/20 px-1.5 py-0.5 rounded shadow">
                      Potenza {wc.vatsa.cp}
                    </span>
                  </div>
                </button>
              ))}

              {/* Bottom instructions ribbon */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/80 border border-slate-800/80 rounded-full py-1 px-4 text-[10px] text-slate-400 font-mono tracking-tight text-center whitespace-nowrap backdrop-blur-xs">
                🐮 Sintonizzati {wildCows.length} Vatsamon selvatici nelle vicinanze
              </div>
            </div>
          )}

        </div>

        <GpsExplorerPanel
          gpsState={gpsState}
          gpsAccuracy={gpsAccuracy}
          gpsUpdatedAt={gpsUpdatedAt}
          gpsIssue={gpsIssue}
          nextName={gpsTargetName}
          nextDistanceM={gpsTargetDistance}
          direction={gpsDirection}
          routeDistanceM={gpsRouteDistanceM}
          claimedCheckpoints={claimedCheckpointsCount}
          totalCheckpoints={totalCheckpoints}
          checkpointReady={checkpointReady}
          checkpointClaimed={checkpointClaimed}
          checkpointMission={checkpointMission}
          nearby={nearbyGpsPlaces}
          onToggleGps={toggleGps}
          onCenter={centerGpsPosition}
          onCheckIn={registraCheckpointGps}
        />

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
              className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border transition-all ${selectedTrailId === null ? 'bg-emerald-500 text-[#0b0820] border-emerald-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'}`}
            >
              🧭 Esplora libera
            </button>
            {VALDOSTAN_TRAILS.map((t) => (
              <button
                key={t.id}
                onClick={() => { playClickSfx(); setMapMode('real'); setSelectedTrailId(t.id); }}
                className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border transition-all ${selectedTrailId === t.id ? 'bg-amber-500 text-[#0b0820] border-amber-400' : 'bg-slate-900 text-amber-200 border-amber-700/40 hover:bg-slate-850'}`}
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
              <p className="text-[10px] text-slate-500 font-mono">Inizia a camminare per incontrare nuovi eventi sul sentiero...</p>
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
            Vatsamon Selvatici Vicini (Sospetti)
          </h4>
          <div className="grid grid-cols-4 gap-3">
            {WILD_BREEDS.map((breed, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-500">{(idx + 1) * 150}m</div>
                <div className="w-14 h-14 brightness-0 opacity-40 group-hover:opacity-60 transition-opacity">
                  <VatsamonAvatar breed={breed} rarity="Comune" className="w-12 h-12" />
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
                Casera d'Alpeggio 🏔️
              </span>
              <h3 className="text-xl font-mono font-black text-slate-100 mt-2">{selectedCasera.name}</h3>
              <p className="text-xs text-slate-400">{selectedCasera.valley}</p>
            </div>

            {/* Spinning photo-disc graphics */}
            <div className="flex justify-center py-4">
              <button type="button" aria-label="Ruota il disco della casera" className="relative w-40 h-40 rounded-full border-4 border-blue-400 flex items-center justify-center bg-slate-800 overflow-hidden shadow-inner" onClick={handleSpinCasera}>

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
              </button>
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

            {/* BOTTEGA DELLA CASERA — qui si spendono i Denari */}
            <div className="text-left space-y-1.5" id="casera-shop">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400">🛒 Bottega della Casera</span>
                <span className="text-[10px] font-mono text-amber-300">🪙 {coins}</span>
              </div>
              {[...Object.values(SAC_ITEMS), ...BOTTEGA_EXTRA].map((it) => (
                <div key={it.id} className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-xl p-1.5">
                  <span className="text-lg w-7 text-center" aria-hidden="true">{it.emoji}</span>
                  <div className="flex-grow min-w-0">
                    <div className="text-[11px] font-mono font-bold text-slate-100 truncate">{it.nome}</div>
                    <div className="text-[9px] text-slate-500 truncate">{it.desc}</div>
                  </div>
                  <button
                    data-buy={it.id}
                    onClick={() => buyBottega(it.id, it.prezzo, it.nome)}
                    disabled={coins < it.prezzo}
                    className="flex-shrink-0 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-[#0b0820] font-mono font-black text-[10px] px-2.5 py-1.5 rounded-lg min-h-[36px]"
                  >
                    {it.prezzo} 🪙
                  </button>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 italic font-sans px-4">
              "{selectedCasera.description}"
            </p>

          </div>
        </div>
      )}
    </>
  );
}
