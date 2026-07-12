import { useState } from "react";
import { X, Loader2, Search } from "lucide-react";
import { Vatsamon } from "../../types";
import { CowVisual } from "../CowVisual";
import { buildPlayerFighter } from "../../lib/battle";
import { mosseEquipaggiate } from "../../data/mosse";
import { acceptChallenge, getChallengePreview, movesetIdsFromEquipped, PvpError } from "../../lib/pvp";
import { PvpChallenge } from "../../lib/pvpTypes";
import { clearPendingChallengeCode } from "./PvpChallengeCreate";

/** Barra di potenza AGGREGATA (mai le stat esatte, vedi istruzioni S9): 5
 *  tacche su un massimo nominale (atk+def+agi+peso/10 ≤ 400 circa a livello
 *  60 con cap PvP 105/105/105/850). Solo un'idea approssimativa di forza. */
function potenzaPips(f: PvpChallenge["fighterSnapshot"]): number {
  const raw = f.atk + f.def + f.agi + f.peso / 10;
  const pct = Math.max(0, Math.min(1, raw / 400));
  return Math.max(1, Math.round(pct * 5));
}

export function PvpChallengeJoin({
  playerCows, acceptorUid, acceptorNickname, onMatchReady, onClose, playClick,
}: {
  playerCows: Vatsamon[];
  acceptorUid: string;
  acceptorNickname: string;
  onMatchReady: (matchId: string) => void;
  onClose: () => void;
  playClick: () => void;
}) {
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<(PvpChallenge & { id: string }) | null>(null);
  const [cowId, setCowId] = useState<string | undefined>(playerCows[0]?.id);
  const [looking, setLooking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...playerCows].sort((a, b) => b.cp - a.cp);
  const cow = playerCows.find((c) => c.id === cowId) ?? sorted[0];

  const lookUp = async () => {
    const code = input.trim().toUpperCase();
    if (!code || looking) return;
    playClick(); setLooking(true); setError(null); setPreview(null);
    try {
      const c = await getChallengePreview(code);
      if (!c) { setError("Nessuna sfida con questo codice."); return; }
      if (c.status !== "open") { setError("Questa sfida non è più disponibile (già accettata, annullata o scaduta)."); return; }
      setPreview(c);
    } catch (err) {
      setError(err instanceof PvpError ? err.message : "Ricerca non riuscita.");
    } finally {
      setLooking(false);
    }
  };

  const doAccept = async () => {
    if (!preview || !cow || joining) return;
    playClick(); setJoining(true); setError(null);
    try {
      const fighter = buildPlayerFighter(cow);
      const moveset = movesetIdsFromEquipped(mosseEquipaggiate(cow));
      const matchId = await acceptChallenge({
        code: preview.id, acceptorUid, acceptorNickname, fighter, moveset,
      });
      clearPendingChallengeCode();
      onMatchReady(matchId);
    } catch (err) {
      setError(err instanceof PvpError ? err.message : "Non sono riuscito ad accettare la sfida.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[90] flex items-end sm:items-center justify-center p-4 backdrop-blur-xs" onClick={onClose}>
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-mono font-black text-slate-100">🤝 Unisciti con un codice</div>
          <button onClick={() => { playClick(); onClose(); }} className="text-slate-400 p-1"><X size={16} /></button>
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase().slice(0, 8))}
            onKeyDown={(e) => e.key === "Enter" && lookUp()}
            placeholder="CODICE"
            className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-amber-300 tracking-[0.2em] text-center uppercase placeholder:text-slate-700"
          />
          <button onClick={lookUp} disabled={!input.trim() || looking} className="bg-slate-800 hover:bg-slate-700 rounded-xl px-3.5 disabled:opacity-40">
            {looking ? <Loader2 className="w-4 h-4 animate-spin text-slate-300" /> : <Search className="w-4 h-4 text-slate-300" />}
          </button>
        </div>

        {error && <p className="text-[10px] font-mono text-rose-400">{error}</p>}

        {preview && (
          <div className="space-y-3">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
              <div className="text-[9px] font-mono uppercase text-slate-500 mb-1">Ti sfida</div>
              <div className="text-[13px] font-mono font-black text-slate-100">{preview.creatorNickname}</div>
              <div className="text-[11px] font-mono text-amber-300 mt-1">{preview.fighterSnapshot.name} <span className="text-slate-500">· {preview.fighterSnapshot.breed}</span></div>
              <div className="text-[10px] font-mono text-slate-500">Livello {preview.fighterSnapshot.level} · {preview.mode === "live" ? "Live" : "Per corrispondenza"}</div>
              <div className="flex items-center gap-1 mt-1.5" title="Potenza aggregata (non le stat esatte)">
                <span className="text-[9px] font-mono text-slate-500 mr-1">Potenza</span>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full ${i < potenzaPips(preview.fighterSnapshot) ? "bg-amber-400" : "bg-slate-800"}`} />
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono text-slate-400 mb-1">Scegli la tua Reina per rispondere</div>
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

            <button onClick={doAccept} disabled={!cow || joining}
              className="w-full nav-active text-white font-mono font-black text-xs py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Accetta la sfida! 🐂"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
