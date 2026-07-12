import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Share2, Copy, X, Check, Loader2 } from "lucide-react";
import { Vatsamon } from "../../types";
import { db } from "../../lib/firebase";
import { CowVisual } from "../CowVisual";
import { buildPlayerFighter } from "../../lib/battle";
import { mosseEquipaggiate } from "../../data/mosse";
import {
  createChallenge, cancelChallenge, movesetIdsFromEquipped, PvpError,
} from "../../lib/pvp";
import { PvpChallenge, PvpMode } from "../../lib/pvpTypes";

const MODES: { id: PvpMode; label: string; sub: string; durationMs: number }[] = [
  { id: "live", label: "Live", sub: "2 minuti a mossa, si gioca ora", durationMs: 120_000 },
  { id: "corrispondenza", label: "Per corrispondenza", sub: "48 ore a mossa, con calma", durationMs: 48 * 3600_000 },
];

const PENDING_KEY = "vatsamon_pvp_pending_challenge";

/** Salva/legge il codice della sfida in attesa: le rules vietano `list` su
 *  pvpChallenges (niente enumerazione), quindi il creator deve ricordarsi
 *  DA SOLO il codice per poterci tornare (hub → "Sfida in attesa"). */
export function readPendingChallengeCode(): string | null {
  try { return localStorage.getItem(PENDING_KEY); } catch { return null; }
}
export function clearPendingChallengeCode() {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* noop */ }
}
function savePendingChallengeCode(code: string) {
  try { localStorage.setItem(PENDING_KEY, code); } catch { /* noop */ }
}

/**
 * Crea una sfida: 1) scegli Reina, 2) scegli modalità, 3) codice generato →
 * attesa live sul SINGOLO documento della sfida (get per-id, non list: le
 * rules lo permettono anche per onSnapshot su un doc noto) → in automatico
 * apre la partita appena l'avversario accetta.
 */
export function PvpChallengeCreate({
  playerCows, creatorUid, creatorNickname, onMatchReady, onClose, playClick,
}: {
  playerCows: Vatsamon[];
  creatorUid: string;
  creatorNickname: string;
  onMatchReady: (matchId: string) => void;
  onClose: () => void;
  playClick: () => void;
}) {
  const sorted = [...playerCows].sort((a, b) => b.cp - a.cp);
  const [cowId, setCowId] = useState(sorted[0]?.id);
  const [mode, setMode] = useState<PvpMode>("live");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!code || !db) return;
    const ref = doc(db, "pvpChallenges", code);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const c = snap.data() as PvpChallenge;
      if (c.status === "accepted" && c.matchId) {
        clearPendingChallengeCode();
        onMatchReady(c.matchId);
      } else if (c.status === "cancelled" || c.status === "expired") {
        clearPendingChallengeCode();
      }
    }, () => { /* permission-denied qui è raro (rules non ancora attive): la UI resta sul codice */ });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const cow = playerCows.find((c) => c.id === cowId) ?? sorted[0];

  const doCreate = async () => {
    if (!cow || busy) return;
    playClick(); setBusy(true); setError(null);
    try {
      const fighter = buildPlayerFighter(cow);
      const moveset = movesetIdsFromEquipped(mosseEquipaggiate(cow));
      const modeDef = MODES.find((m) => m.id === mode)!;
      const newCode = await createChallenge({
        creatorUid, creatorNickname, mode, turnDurationMs: modeDef.durationMs, fighter, moveset,
      });
      codeRef.current = newCode;
      savePendingChallengeCode(newCode);
      setCode(newCode);
    } catch (err) {
      setError(err instanceof PvpError ? err.message : "Non sono riuscito a creare la sfida.");
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!code) { onClose(); return; }
    playClick();
    try { await cancelChallenge(code); } catch { /* già scaduta/accettata: chiudi comunque */ }
    clearPendingChallengeCode();
    onClose();
  };

  const canShare = typeof navigator.share === "function";

  const share = async () => {
    if (!code) return;
    const text = `Ti sfido a Vatsamon GO! Codice: ${code}`;
    if (canShare) {
      try { await navigator.share({ text }); return; } catch { /* annullato dall'utente */ }
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { setError("Copia non riuscita: seleziona il codice a mano."); }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[90] flex items-end sm:items-center justify-center p-4 backdrop-blur-xs" onClick={onClose}>
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-mono font-black text-slate-100">⚔️ Nuova sfida tra Allevatori</div>
          <button onClick={() => { playClick(); onClose(); }} className="text-slate-400 p-1"><X size={16} /></button>
        </div>

        {!code ? (
          <>
            <div>
              <div className="text-[10px] font-mono text-slate-400 mb-1">1 · Scegli la tua Reina</div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {sorted.map((c) => (
                  <button key={c.id} onClick={() => { playClick(); setCowId(c.id); }}
                    className={`flex-shrink-0 rounded-xl border-2 p-1.5 ${cowId === c.id ? "border-amber-500 bg-amber-500/15" : "border-slate-700 bg-slate-900/70"}`}>
                    <CowVisual cow={c} className="w-12 h-12" />
                    <div className="text-[10px] font-mono text-slate-200 truncate w-12">{c.name}</div>
                  </button>
                ))}
              </div>
              {sorted.length === 0 && <p className="text-[10px] text-slate-500">Nessuna Reina pronta per la spinta.</p>}
            </div>

            <div>
              <div className="text-[10px] font-mono text-slate-400 mb-1">2 · Modalità</div>
              <div className="space-y-1.5">
                {MODES.map((m) => (
                  <button key={m.id} onClick={() => { playClick(); setMode(m.id); }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left ${mode === m.id ? "border-amber-500 bg-amber-500/10" : "border-slate-800 bg-slate-950"}`}>
                    <div>
                      <div className="text-[11px] font-mono font-black text-slate-100">{m.label}</div>
                      <div className="text-[10px] text-slate-500">{m.sub}</div>
                    </div>
                    {mode === m.id && <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-[10px] font-mono text-rose-400">{error}</p>}

            <button onClick={doCreate} disabled={!cow || busy}
              className="w-full nav-active text-white font-mono font-black text-xs py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Genera codice sfida"}
            </button>
          </>
        ) : (
          <div className="text-center space-y-3 py-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Il tuo codice</div>
            <div className="text-2xl font-mono font-black text-amber-300 tracking-[0.3em] bg-slate-950 border border-slate-800 rounded-2xl py-3 select-all">{code}</div>
            <p className="text-[11px] text-slate-400">Mandalo al tuo avversario. La partita si apre da sola appena lo accetta.</p>
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" /> In attesa di un avversario…
            </div>
            <button onClick={share} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs py-2.5 rounded-xl">
              {copied ? <><Check className="w-4 h-4" /> Copiato!</> : canShare ? <><Share2 className="w-4 h-4" /> Condividi codice</> : <><Copy className="w-4 h-4" /> Copia codice</>}
            </button>
            {error && <p className="text-[10px] font-mono text-rose-400">{error}</p>}
            <button onClick={doCancel} className="w-full text-[10px] font-mono text-slate-500 hover:text-rose-300 py-1">Annulla la sfida</button>
          </div>
        )}
      </div>
    </div>
  );
}
