import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Clock, Flag, AlertTriangle } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { CowVisual } from "../CowVisual";
import { ConfirmDialog } from "../ConfirmDialog";
import { beginCriticalActivity, endCriticalActivity } from "../../lib/swUpdate";
import { Mossa } from "../../data/mosse";
import { MossePanel } from "../battle/MossePanel";
import { MossaInfoSheet } from "../battle/MossaInfoSheet";
import {
  buildPvpView, subscribeMatch, submitMove, claimTimeout, abandonMatch,
  PvpError, PvpNotYourTurnError, PvpPermissionDeniedError, PvpView,
} from "../../lib/pvp";
import { PvpMatch } from "../../lib/pvpTypes";

type MatchDoc = PvpMatch & { id: string };

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  if (days > 0) return `${days}g ${Math.floor((totalSec % 86400) / 3600)}h`;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Mirror di BattleScene per il PvP online (S9). Differenze chiave rispetto
 * al PvE:
 *  - lo stato NON è locale: arriva da `subscribeMatch` (onSnapshot), attivo
 *    SOLO mentre questa scena è montata (mai in idle nell'hub).
 *  - chi è di turno gioca via `submitMove` (transazione server-side); chi
 *    non lo è vede lo stato aggiornarsi da solo quando l'avversario muove.
 *  - la vista di p2 è GIÀ invertita da `buildPvpView` (vedi lib/pvp.ts):
 *    qui dentro "displayState" si legge sempre come se fossi "p" (io).
 *  - "X" chiude solo la SCENA (la partita resta viva su Firestore); il
 *    forfeit esplicito passa dal bottone "Abbandona".
 */
export default function PvpBattleScene({ matchId, onClose, playClick }: {
  matchId: string;
  onClose: () => void;
  playClick: () => void;
}) {
  const { user } = useAuth();
  const uid = user?.uid;

  const [match, setMatch] = useState<MatchDoc | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing">("loading");
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [infoMossa, setInfoMossa] = useState<Mossa | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [lunge, setLunge] = useState<"me" | "opp" | null>(null);
  const [shake, setShake] = useState(false);
  const lastTurnRef = useRef<number | null>(null);

  // Partita PvP live = attività critica (stesso principio di BattleScene):
  // il SW non deve ricaricare la pagina a metà transazione.
  useEffect(() => {
    beginCriticalActivity();
    return () => endCriticalActivity();
  }, []);

  useEffect(() => {
    const unsub = subscribeMatch(
      matchId,
      (m) => { setMatch(m); setLoadState(m ? "ready" : "missing"); },
      (err) => {
        setBanner(err instanceof PvpPermissionDeniedError ? err.message : err.message);
        if (loadState === "loading") setLoadState("missing");
      },
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Anima lunge/shake quando arriva UNA MOSSA NUOVA (turnNumber avanzato) —
  // non al primo caricamento (lastTurnRef parte da null).
  useEffect(() => {
    if (!match?.lastMove) return;
    if (lastTurnRef.current === match.turnNumber) return;
    const first = lastTurnRef.current === null;
    lastTurnRef.current = match.turnNumber;
    if (first) return;
    const bySelf = uid && match.players[match.lastMove.by].uid === uid;
    setLunge(bySelf ? "me" : "opp");
    const famiglia = match.lastMove.azione;
    if (famiglia === "incalza" || famiglia === "gira") { setShake(true); setTimeout(() => setShake(false), 320); }
    const t = setTimeout(() => setLunge(null), 260);
    return () => clearTimeout(t);
  }, [match?.lastMove, match?.turnNumber, match?.players, uid]);

  const view: PvpView | null = useMemo(() => {
    if (!match || !uid) return null;
    try { return buildPvpView(match, uid); } catch { return null; }
  }, [match, uid]);

  const handleMove = async (mossa: Mossa) => {
    if (!uid || !view || !match || submitting || !view.isMyTurn || match.status !== "active") return;
    playClick(); setSubmitting(true);
    try {
      await submitMove(matchId, uid, mossa.id);
    } catch (err) {
      // doppio tap / race innocua: la transazione ha già vinto altrove, non
      // mostrare nulla — è esattamente il comportamento atteso.
      if (!(err instanceof PvpNotYourTurnError)) {
        setBanner(err instanceof PvpError ? err.message : "Mossa non riuscita. Riprova.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const doClaimTimeout = async () => {
    if (!uid) return;
    playClick();
    try { await claimTimeout(matchId, uid); }
    catch (err) { setBanner(err instanceof PvpError ? err.message : "Non sono riuscito a reclamare il timeout."); }
  };

  const doAbandon = async () => {
    if (!uid) return;
    setConfirmAbandon(false);
    try { await abandonMatch(matchId, uid); }
    catch (err) { setBanner(err instanceof PvpError ? err.message : "Non sono riuscito ad abbandonare la partita."); }
  };

  const deadlineMs = match?.turnDeadline ? match.turnDeadline.toMillis() - now : null;
  const timedOut = deadlineMs !== null && deadlineMs <= 0;
  const canClaim = !!(match && view && match.status === "active" && timedOut && !view.isMyTurn);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="pvp-battle-scene">
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg,#bae6fd 0%,#e0f2fe 30%,#dcfce7 62%,#bbf7d0 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[42%]" style={{ background: "radial-gradient(120% 80% at 50% 100%, #86efac 0%, #4ade80 55%, #16a34a 100%)" }} />

      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/70 backdrop-blur border-b border-slate-800">
        <span className="text-xs font-mono font-black text-slate-100">
          ⚔️ {view ? `vs ${view.oppNickname}` : "Sfida tra Allevatori"} {match ? `· ${match.mode === "live" ? "Live" : "Per corrispondenza"}` : ""}
        </span>
        <button onClick={() => { playClick(); onClose(); }} className="text-slate-300 bg-slate-900/70 rounded-full p-1.5"><X size={16} /></button>
      </div>

      {banner && (
        <div className="mx-3 mt-2 flex items-start gap-2 bg-rose-950/50 border border-rose-700/50 rounded-xl px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-300 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] font-mono text-rose-200 leading-snug flex-grow">{banner}</p>
          <button onClick={() => setBanner(null)} className="text-rose-300 text-[10px] font-mono font-black px-1">✕</button>
        </div>
      )}

      {loadState === "loading" && (
        <div className="flex-1 flex items-center justify-center text-[11px] font-mono text-slate-400">Sto preparando la partita…</div>
      )}
      {loadState === "missing" && !banner && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
          <p className="text-[11px] font-mono text-slate-400">Partita non trovata (potrebbe non essere stata ancora creata).</p>
          <button onClick={() => { playClick(); onClose(); }} className="nav-active text-white font-mono font-black text-xs py-2.5 px-5 rounded-xl">Torna alla mandria</button>
        </div>
      )}

      {match && view && (
        <>
          <motion.div animate={shake ? { x: [0, -8, 7, -5, 0] } : {}} transition={{ duration: 0.35 }} className="relative flex-1 overflow-hidden">
            <PvpCombatant pos="top" name={view.oppFighter.name} breed={view.oppFighter.breed} fiato={view.displayState.fiatoO} fiatoMax={view.oppFiatoMax} lunge={lunge === "opp"} />
            <PvpCombatant pos="bottom" name={view.myFighter.name} breed={view.myFighter.breed} fiato={view.displayState.fiatoP} fiatoMax={view.myFiatoMax} calma={view.displayState.calma} lunge={lunge === "me"} />

            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[78%] max-w-sm">
              <div className="flex justify-between text-[10px] font-mono font-black mb-0.5">
                <span className="text-emerald-600">{view.myFighter.name}</span>
                <span className="text-slate-700">SPINTA</span>
                <span className="text-rose-500">{view.oppFighter.name}</span>
              </div>
              <div className="relative h-4 rounded-full bg-rose-400/40 border border-slate-700 overflow-hidden shadow-inner">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${Math.round(view.displayState.barra)}%` }} />
                <div className="absolute inset-y-0 w-0.5 bg-slate-900/60" style={{ left: "50%" }} />
              </div>
            </div>

            {match.status === "active" && deadlineMs !== null && (
              <div className={`absolute top-11 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-mono font-black ${timedOut ? "bg-rose-600 text-white animate-pulse" : view.isMyTurn ? "bg-amber-500 text-[#0b0820]" : "bg-slate-900/80 text-slate-300 border border-slate-700"}`}>
                <Clock className="w-3 h-3" /> {view.isMyTurn ? "Tocca a te" : "Turno avversario"} · {fmtCountdown(Math.max(0, deadlineMs))}
              </div>
            )}
          </motion.div>

          <div className="bg-slate-950/85 backdrop-blur border-t border-slate-800 p-3 space-y-2">
            {match.lastMove && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 h-[38px] overflow-hidden">
                <div className="text-[10px] font-mono leading-snug text-slate-200">❖ {match.lastMove.log}</div>
              </div>
            )}

            {match.status === "active" && (
              <>
                <MossePanel id="pvp-battle-moves" mosse={view.myMoveset} st={view.displayState} busy={submitting || !view.isMyTurn}
                  onMossa={handleMove} onInfo={(m) => { playClick(); setInfoMossa(m); }}
                  hintDisabilitata={view.isMyTurn ? undefined : "in attesa dell'avversario"} />

                <div className="flex gap-2">
                  {canClaim && (
                    <button onClick={doClaimTimeout} className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-[11px] py-2 rounded-xl">
                      <Clock className="w-3.5 h-3.5" /> Reclama per timeout
                    </button>
                  )}
                  <button onClick={() => setConfirmAbandon(true)} className="px-4 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2 rounded-xl flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5" /> Abbandona
                  </button>
                </div>
              </>
            )}

            {match.status !== "active" && (
              <div className="text-center space-y-2 py-1">
                <div className={`text-lg font-mono font-black ${view.amWinner ? "text-emerald-600" : "text-rose-500"}`}>
                  {view.amWinner ? "🏆 Hai vinto la spinta!" : "😔 Hai perso questa spinta"}
                </div>
                {match.status === "abandoned" && (
                  <div className="text-[10px] font-mono text-slate-500">
                    {match.forfeitedBy === uid ? "Ti sei ritirato." : `${view.oppNickname} si è ritirata.`}
                  </div>
                )}
                {match.forfeitedBy && match.status === "finished" && (
                  <div className="text-[10px] font-mono text-slate-500">Chiusa per timeout.</div>
                )}
                <button onClick={() => { playClick(); onClose(); }} className="w-full nav-active text-white font-mono font-black text-xs py-2.5 rounded-xl">Torna alla mandria</button>
              </div>
            )}
          </div>
        </>
      )}

      {infoMossa && <MossaInfoSheet mossa={infoMossa} onClose={() => setInfoMossa(null)} playClick={playClick} />}

      {confirmAbandon && (
        <ConfirmDialog
          title="Abbandonare la partita?"
          message="L'avversario vince per abbandono. Non si torna indietro."
          confirmLabel="Abbandona"
          danger
          onConfirm={doAbandon}
          onCancel={() => setConfirmAbandon(false)}
        />
      )}
    </div>
  );
}

/** Combattente PvP: nessuna `visual` reale nello snapshot congelato (di
 *  proposito, S8 — niente foto nei documenti PvP): CowVisual ripiega
 *  sull'illustrazione per razza. La propria Reina resta quella vera nella
 *  Stalla; qui mostriamo un'identità coerente e uguale per entrambi i lati. */
function PvpCombatant({ pos, name, breed, fiato, fiatoMax, calma, lunge }: {
  pos: "top" | "bottom"; name: string; breed: string; fiato: number; fiatoMax: number; calma?: number; lunge: boolean;
}) {
  const top = pos === "top";
  const fiatoPct = Math.max(0, Math.min(100, Math.round((fiato / fiatoMax) * 100)));
  const lungeX = top ? -36 : 36, lungeY = top ? 36 : -36;
  const visual = { name, breed, rarity: "Comune" as const, realPhoto: null };
  return (
    <div className={`absolute ${top ? "top-16" : "bottom-3"} ${top ? "right-3" : "left-3"} flex flex-col ${top ? "items-end" : "items-start"} gap-1`} style={{ width: "60%" }}>
      <div className={`bg-slate-950/85 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-lg ${top ? "self-start" : "self-end"}`} style={{ minWidth: 150 }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-black text-slate-100 truncate">{name}</span>
          <span className="text-[9px] font-mono text-slate-400">{breed}</span>
        </div>
        <div className="text-[9px] font-mono text-slate-500 mt-0.5">FIATO</div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
          <div className="h-full bg-sky-400 transition-all duration-400" style={{ width: `${fiatoPct}%` }} />
        </div>
        {calma !== undefined && (
          <>
            <div className="text-[9px] font-mono text-slate-500 mt-0.5">CALMA</div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full transition-all duration-400" style={{ width: `${calma}%`, background: calma < 35 ? "#ef4444" : "#a78bfa" }} />
            </div>
          </>
        )}
      </div>
      <motion.div className="relative" animate={lunge ? { x: lungeX, y: lungeY } : { x: 0, y: 0 }} transition={{ duration: 0.16 }}>
        <div className={`rounded-2xl overflow-hidden border-2 shadow-2xl ${top ? "border-rose-400/60" : "border-emerald-400/70"}`}>
          <CowVisual cow={visual} className={top ? "w-24 h-24" : "w-28 h-28"} />
        </div>
        <div className="mx-auto mt-1 rounded-[100%] bg-black/20 blur-[2px]" style={{ width: top ? 70 : 84, height: 10 }} />
      </motion.div>
    </div>
  );
}
