import {
  Binoculars,
  CheckCircle2,
  CircleStop,
  Flag,
  LocateFixed,
  MapPinned,
  Milk,
  Navigation,
  Radio,
  ShieldCheck,
  Signal,
  TriangleAlert,
} from 'lucide-react';
import { fmtDist } from '../lib/geo';

export type NearbyPlace = {
  id: string;
  kind: 'Reina' | 'Casera' | 'Sfida';
  label: string;
  detail: string;
  distanceM: number;
  ready: boolean;
};

type Props = {
  gpsState: 'off' | 'requesting' | 'active' | 'error';
  gpsAccuracy: number | null;
  gpsUpdatedAt: number | null;
  gpsIssue: string | null;
  nextName: string;
  nextDistanceM: number;
  direction: string;
  routeDistanceM: number | null;
  claimedCheckpoints: number;
  totalCheckpoints: number;
  checkpointReady: boolean;
  checkpointClaimed: boolean;
  checkpointMission: { title: string; detail: string };
  nearby: NearbyPlace[];
  onToggleGps: () => void;
  onCenter: () => void;
  onCheckIn: () => void;
};

const PLACE_ICON = {
  Reina: Binoculars,
  Casera: Milk,
  Sfida: Flag,
} as const;

function gpsLabel(state: Props['gpsState'], accuracy: number | null) {
  if (state === 'requesting') return { label: 'Ricerca segnale…', tone: 'text-amber-400', Icon: Radio };
  if (state === 'error') return { label: 'Segnale non disponibile', tone: 'text-rose-500', Icon: TriangleAlert };
  if (state === 'off') return { label: 'GPS spento', tone: 'text-slate-500', Icon: Signal };
  if (accuracy !== null && accuracy <= 20) return { label: 'Posizione precisa · ±' + Math.round(accuracy) + ' m', tone: 'text-emerald-500', Icon: Signal };
  if (accuracy !== null && accuracy <= 60) return { label: 'Segnale buono · ±' + Math.round(accuracy) + ' m', tone: 'text-sky-400', Icon: Signal };
  return { label: accuracy !== null ? 'Segnale approssimato · ±' + Math.round(accuracy) + ' m' : 'GPS attivo', tone: 'text-amber-400', Icon: Signal };
}

export function GpsExplorerPanel(props: Props) {
  const signal = gpsLabel(props.gpsState, props.gpsAccuracy);
  const SignalIcon = signal.Icon;
  const secondsAgo = props.gpsUpdatedAt ? Math.max(0, Math.round((Date.now() - props.gpsUpdatedAt) / 1000)) : null;
  const routeState = props.routeDistanceM === null
    ? 'Attiva il GPS per seguire il tracciato'
    : props.routeDistanceM <= 120
      ? 'Sei sul percorso'
      : 'Fuori dal tracciato · rientra verso ' + props.direction;
  const gpsActive = props.gpsState === 'active' || props.gpsState === 'requesting';

  return (
    <section className="bg-slate-950 border border-emerald-800/40 rounded-3xl p-4 space-y-4" id="gps-explorer-panel" aria-labelledby="gps-explorer-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <LocateFixed className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h3 id="gps-explorer-title" className="text-sm font-mono font-black text-emerald-400 uppercase tracking-wide">Guida sul posto</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">La posizione resta sul dispositivo e viene usata solo mentre il GPS è attivo.</p>
        </div>
              <button
                type="button"
          onClick={props.onToggleGps}
          aria-pressed={gpsActive}
          className={gpsActive
            ? 'flex-shrink-0 min-h-[44px] px-3 rounded-xl border font-mono font-black text-xs flex items-center gap-1.5 bg-rose-950 border-rose-600/50 text-rose-500'
            : 'flex-shrink-0 min-h-[44px] px-3 rounded-xl border font-mono font-black text-xs flex items-center gap-1.5 bg-emerald-950 border-emerald-600/50 text-emerald-500'}
        >
          {gpsActive ? <CircleStop className="w-4 h-4" /> : <LocateFixed className="w-4 h-4" />}
          {gpsActive ? 'Ferma GPS' : 'Attiva GPS'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 flex items-start gap-2.5">
        <SignalIcon className={'w-5 h-5 flex-shrink-0 mt-0.5 ' + signal.tone} aria-hidden="true" />
        <div className="min-w-0">
          <div className={'text-xs font-mono font-black ' + signal.tone}>{signal.label}</div>
          {props.gpsIssue ? (
            <p className="text-xs text-slate-500 mt-0.5">{props.gpsIssue}</p>
          ) : secondsAgo !== null ? (
            <p className="text-xs text-slate-500 mt-0.5">Aggiornato {secondsAgo <= 5 ? 'ora' : secondsAgo + ' s fa'}. Puoi fermarlo in qualsiasi momento.</p>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5">Nessuna coordinata viene salvata o condivisa.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/30 p-3">
          <div className="flex items-start gap-2.5">
            <Navigation className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-grow">
              <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-500">Prossima tappa · {props.direction}</div>
              <div className="text-sm font-mono font-black text-slate-200 mt-0.5">{props.nextName}</div>
              <p className="text-xs text-slate-500 mt-0.5">{fmtDist(props.nextDistanceM)} · {routeState}</p>
            </div>
            <button type="button" onClick={props.onCenter} className="min-h-[40px] min-w-[40px] rounded-xl border border-emerald-700/50 bg-slate-950 text-emerald-500 flex items-center justify-center" aria-label="Centra la mia posizione sulla mappa">
              <MapPinned className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-700/40 bg-amber-950/30 p-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-grow">
              <div className="text-[11px] font-mono uppercase tracking-widest text-amber-500">Micro-missione sicura · {props.claimedCheckpoints}/{props.totalCheckpoints}</div>
              <div className="text-sm font-mono font-black text-slate-200 mt-0.5">{props.checkpointMission.title}</div>
              <p className="text-xs text-slate-500 mt-0.5">{props.checkpointMission.detail}</p>
            </div>
          </div>
          <button
            id="gps-checkpoint-btn"
            type="button"
            onClick={props.onCheckIn}
            disabled={!props.checkpointReady || props.checkpointClaimed}
            className="w-full min-h-[44px] mt-3 rounded-xl border border-amber-600/50 bg-amber-500/10 text-amber-500 font-mono font-black text-xs disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {props.checkpointClaimed ? <><CheckCircle2 className="inline w-4 h-4 mr-1" />Timbro già registrato</> : props.checkpointReady ? 'Registra arrivo · +15 🪙 · +50 XP' : 'Avvicìnati alla tappa con il GPS attivo'}
          </button>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-mono font-black uppercase tracking-widest text-slate-400 mb-2">Vicino a te</div>
        <div className="space-y-2">
          {props.nearby.map((place) => {
            const Icon = PLACE_ICON[place.kind];
            return (
              <div key={place.id} className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                <div className={place.ready ? 'w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-950 text-emerald-500' : 'w-9 h-9 rounded-xl flex items-center justify-center bg-slate-950 text-slate-500'}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-grow">
                  <div className="text-xs font-mono font-black text-slate-200 truncate">{place.label}</div>
                  <div className="text-xs text-slate-500 truncate">{place.detail}</div>
                </div>
                <div className={place.ready ? 'text-xs font-mono font-black text-right text-emerald-500' : 'text-xs font-mono font-black text-right text-slate-500'}>
                  {fmtDist(place.distanceM)}
                  <div className="text-[10px] font-normal">{place.ready ? 'a portata' : 'avvicìnati'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
