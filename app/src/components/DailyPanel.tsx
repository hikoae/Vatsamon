import { useState } from "react";
import { Flame, Check, Footprints, Sparkles } from "lucide-react";
import { DailyMission, missionsForDay, todayKey, yesterdayKey } from "../data/dailyMissions";

const LS = "vatsamon_daily";

interface DailyState {
  day: string;
  snapCaptured: number;
  snapKm: number;
  claimed: string[];
  streakCount: number;
  streakLastDay: string;
}

/**
 * "Il Giro di Stalla" — pannello retention: streak giornaliero + 3 missioni daily
 * deterministiche, tracciate dai contatori del giocatore. Self-contained.
 */
export function DailyPanel({ captured, km, onReward, playClick }: {
  captured: number;
  km: number;
  onReward: (coins: number, xp: number) => void;
  playClick: () => void;
}) {
  // Rollover giornaliero calcolato all'apertura del pannello.
  const [state, setState] = useState<DailyState>(() => {
    const today = todayKey();
    let prev: DailyState | null = null;
    try { const r = localStorage.getItem(LS); if (r) prev = JSON.parse(r); } catch { /* ignore */ }

    if (prev && prev.day === today) return prev;

    // nuovo giorno → aggiorna streak (con grazia del maltempo)
    let streakCount = 1;
    if (prev) {
      if (prev.streakLastDay === yesterdayKey(today)) streakCount = prev.streakCount + 1;
      else if (prev.streakLastDay === yesterdayKey(yesterdayKey(today))) streakCount = prev.streakCount; // 1 giorno saltato: congelato
      else streakCount = 1;
    }
    const next: DailyState = { day: today, snapCaptured: captured, snapKm: km, claimed: [], streakCount, streakLastDay: today };
    try { localStorage.setItem(LS, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  const missions = missionsForDay(state.day);

  function progressOf(m: DailyMission): number {
    if (m.kind === "visita") return 1;
    if (m.kind === "cattura") return Math.max(0, Math.min(m.n, captured - state.snapCaptured));
    return Math.max(0, Math.min(m.n, Math.floor(km - state.snapKm)));
  }

  function claim(m: DailyMission) {
    if (state.claimed.includes(m.id) || progressOf(m) < m.n) return;
    playClick();
    onReward(m.coins, m.xp);
    setState((s) => {
      const next = { ...s, claimed: [...s.claimed, m.id] };
      try { localStorage.setItem(LS, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  const allDone = missions.every((m) => state.claimed.includes(m.id));
  const milestone = state.streakCount >= 30 ? "🔔 30 giorni: campanaccio d'oro!" : state.streakCount >= 7 ? "🌺 7 giorni: fiori del Bosquet!" : state.streakCount >= 3 ? "✨ 3 giorni di fila!" : "";

  return (
    <div className="bg-slate-950 border border-amber-700/30 rounded-3xl p-4 space-y-3" id="daily-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">🐄 Il Giro di Stalla</h3>
        <span className="flex items-center gap-1 bg-orange-500/15 border border-orange-500/40 text-orange-400 text-[10px] font-mono font-black px-2 py-1 rounded-lg">
          <Flame className="w-3.5 h-3.5" /> {state.streakCount} <span className="text-orange-300/80">in alpeggio</span>
        </span>
      </div>
      {milestone && <div className="text-[10px] font-mono text-amber-400">{milestone}</div>}

      <div className="space-y-2">
        {missions.map((m) => {
          const prog = progressOf(m);
          const done = prog >= m.n;
          const claimed = state.claimed.includes(m.id);
          return (
            <div key={m.id} className={`flex items-center gap-2.5 rounded-xl p-2.5 border ${claimed ? "border-emerald-700/40 bg-emerald-950/30" : done ? "border-amber-600/50 bg-amber-500/10" : "border-slate-850 bg-slate-900/60"}`}>
              <span className="text-lg flex-shrink-0">{m.kind === "cammina" ? "🥾" : m.kind === "cattura" ? "🐮" : "🏡"}</span>
              <div className="min-w-0 flex-grow">
                <div className="text-[11px] font-mono font-bold text-slate-200 truncate">{m.label}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-grow bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-850">
                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${(prog / m.n) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{prog}/{m.n}</span>
                </div>
              </div>
              {claimed ? (
                <span className="text-[9px] font-mono font-black text-emerald-400 px-2 flex items-center gap-0.5"><Check className="w-3 h-3" /> fatto</span>
              ) : (
                <button
                  data-claim={m.id}
                  disabled={!done}
                  onClick={() => claim(m)}
                  className={`text-[9px] font-mono font-black px-2.5 py-1.5 rounded-lg border flex-shrink-0 ${done ? "border-amber-600/60 bg-amber-500/20 text-amber-200" : "border-slate-850 bg-slate-900/50 text-slate-600"}`}
                >
                  +{m.coins}🪙
                </button>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded-xl py-2">
          <Sparkles className="w-3.5 h-3.5" /> Giro completato! Torna domani per non perdere lo streak.
        </div>
      )}
      <p className="text-[10px] font-mono text-slate-600 leading-snug flex items-center gap-1">
        <Footprints className="w-3 h-3" /> Le missioni si rinnovano ogni giorno. Saltare un giorno congela lo streak, non lo azzera.
      </p>
    </div>
  );
}
