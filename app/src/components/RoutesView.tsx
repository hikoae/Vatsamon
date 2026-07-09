import { ChevronRight, Compass, MapPin, Swords, Trophy } from 'lucide-react';
import type { TrekRoute } from '../data/routes';
import type { MapBattle } from '../data/mapBattles';
import type { Dungeon } from '../data/dungeons';
import { ROUTE_TONE } from '../data/overworld';
import { distanza, fmtDist } from '../lib/geo';

type Props = {
  routes: TrekRoute[];
  activeRouteId: string;
  completedRoutes: string[];
  trainerLevel: number;
  position: { lat: number; lng: number };
  battles: MapBattle[];
  dungeons: Dungeon[];
  onSelectRoute: (id: string) => void;
  onStartBattle: (battle: MapBattle) => void;
  onStartDungeon: (dungeon: Dungeon) => void;
  onOpenSeason: () => void;
};

export function RoutesView({
  routes,
  activeRouteId,
  completedRoutes,
  trainerLevel,
  position,
  battles,
  dungeons,
  onSelectRoute,
  onStartBattle,
  onStartDungeon,
  onOpenSeason,
}: Props) {
  const nearbyBattles = [...battles]
    .map((battle) => ({ battle, distanceM: distanza(position, battle) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 3);
  const nearbyDungeons = [...dungeons]
    .map((dungeon) => ({ dungeon, distanceM: distanza(position, dungeon) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 3);

  return (
    <section id="routes-view" className="space-y-5 pb-4" aria-labelledby="routes-title">
      <header className="bg-slate-950 border border-slate-850 rounded-3xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400">
              <Compass className="w-5 h-5" aria-hidden="true" />
              <h1 id="routes-title" className="font-mono font-black text-lg uppercase tracking-wide">Percorsi</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">Scegli un cammino: tornerai subito alla mappa per iniziare a esplorare.</p>
          </div>
          <button id="open-season-btn" type="button" onClick={onOpenSeason} className="min-h-[44px] shrink-0 rounded-xl border border-amber-700/50 bg-amber-950/30 px-3 text-xs font-mono font-black text-amber-300 flex items-center gap-1.5">
            <Trophy className="w-4 h-4" aria-hidden="true" />
            Stagione
          </button>
        </div>
      </header>

      <div className="space-y-2" aria-label="Cammini disponibili">
        {routes.map((route) => {
          const active = route.id === activeRouteId;
          const completed = completedRoutes.includes(route.id);
          const locked = trainerLevel < route.reqLevel;
          const tone = ROUTE_TONE[route.accent] ?? ROUTE_TONE.emerald;
          return (
            <button
              key={route.id}
              type="button"
              onClick={() => onSelectRoute(route.id)}
              disabled={locked}
              aria-current={active ? 'page' : undefined}
              className={`w-full min-h-[104px] rounded-2xl border-2 p-4 text-left transition-colors ${locked ? 'border-slate-800 bg-slate-900/60 opacity-65' : active ? `${tone.border} ${tone.bg}` : 'border-slate-800 bg-slate-950 hover:bg-slate-900'}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none" aria-hidden="true">{locked ? '🔒' : route.icon}</span>
                <span className="min-w-0 flex-grow">
                  <span className={`block text-sm font-mono font-black leading-snug ${active ? tone.text : 'text-slate-100'}`}>{route.name}</span>
                  <span className="block text-xs text-slate-400 mt-1">{route.difficulty} · {route.lengthKm} km · {route.coords.length} tappe</span>
                  <span className="block text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{route.description}</span>
                </span>
                <span className={`text-xs font-mono font-black shrink-0 ${locked ? 'text-slate-500' : completed ? 'text-emerald-400' : active ? tone.text : 'text-slate-400'}`}>
                  {locked ? `Lv ${route.reqLevel}` : completed ? 'FATTO' : active ? 'ATTIVO' : <ChevronRight className="w-5 h-5" aria-hidden="true" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <section id="battle-nearby" className="bg-slate-950 border border-slate-850 rounded-3xl p-4 space-y-2" aria-labelledby="nearby-battles-title">
        <h2 id="nearby-battles-title" className="text-xs font-mono font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
          <Swords className="w-4 h-4 text-rose-500" aria-hidden="true" /> Sfide vicine
        </h2>
        {nearbyBattles.map(({ battle, distanceM }) => {
          const locked = trainerLevel < battle.reqLevel;
          const inRange = distanceM <= 800;
          return (
            <button key={battle.id} type="button" onClick={() => onStartBattle(battle)} disabled={locked} className={`w-full min-h-[64px] flex items-center gap-3 rounded-2xl border p-3 text-left ${locked ? 'opacity-50 border-slate-800 bg-slate-900/60' : inRange ? 'border-rose-700/50 bg-rose-950/30' : 'border-slate-800 bg-slate-900'}`}>
              <span className="text-2xl" aria-hidden="true">{locked ? '🔒' : battle.emoji}</span>
              <span className="min-w-0 flex-grow"><span className="block text-sm font-mono font-black text-slate-100 truncate">{battle.name}</span><span className="block text-xs text-slate-400 truncate">{battle.subtitle}</span></span>
              <span className={`text-right text-xs font-mono font-black shrink-0 ${locked ? 'text-slate-500' : inRange ? 'text-rose-400' : 'text-amber-400'}`}>{locked ? `Lv ${battle.reqLevel}` : inRange ? 'COMBATTI' : fmtDist(distanceM)}</span>
            </button>
          );
        })}
      </section>

      <section id="dungeon-nearby" className="bg-slate-950 border border-purple-700/30 rounded-3xl p-4 space-y-2" aria-labelledby="nearby-league-title">
        <h2 id="nearby-league-title" className="text-xs font-mono font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5"><MapPin className="w-4 h-4 text-purple-400" aria-hidden="true" /> Lega delle Reines</h2>
        {nearbyDungeons.map(({ dungeon, distanceM }) => {
          const locked = trainerLevel < dungeon.reqLevel;
          return (
            <button key={dungeon.id} type="button" onClick={() => onStartDungeon(dungeon)} disabled={locked} className={`w-full min-h-[64px] flex items-center gap-3 rounded-2xl border p-3 text-left ${locked ? 'opacity-50 border-slate-800 bg-slate-900/60' : 'border-purple-700/40 bg-purple-950/20'}`}>
              <span className="text-2xl" aria-hidden="true">{locked ? '🔒' : dungeon.emoji}</span>
              <span className="min-w-0 flex-grow"><span className="block text-sm font-mono font-black text-slate-100 truncate">{dungeon.league}</span><span className="block text-xs text-slate-400 truncate">5 sfide · squadra di 4 · {fmtDist(distanceM)}</span></span>
              <span className="text-xs font-mono font-black text-slate-500 shrink-0">Lv {dungeon.reqLevel}</span>
            </button>
          );
        })}
      </section>
    </section>
  );
}
