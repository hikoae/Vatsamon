import { useEffect, useState } from "react";
import { LogIn, RefreshCw, Swords, Ticket, Loader2 } from "lucide-react";
import { Vatsamon } from "../../types";
import { useAuth } from "../../lib/auth";
import {
  getChallengePreview, listMyMatches, slotForUid, PvpError,
} from "../../lib/pvp";
import { PvpMatch } from "../../lib/pvpTypes";
import { PvpChallengeCreate, readPendingChallengeCode, clearPendingChallengeCode } from "./PvpChallengeCreate";
import { PvpChallengeJoin } from "./PvpChallengeJoin";

type MatchRow = PvpMatch & { id: string };

/**
 * Hub "Sfide tra Allevatori" — sezione dentro StallaScreen (non una tab).
 * Gate: nascosto/CTA-login se offline, senza utente, o ospite (le sfide
 * online richiedono un account reale, vedi istruzioni S9 punto c).
 *
 * Niente listener persistente qui: SOLO fetch one-shot all'apertura
 * dell'hub (`listMyMatches`, `getChallengePreview` per la sfida in attesa) —
 * i listener live vivono SOLO dentro PvpBattleScene, mentre una partita è a
 * schermo.
 */
export function PvpHub({ collection, onOpenMatch, playClick }: {
  collection: Vatsamon[];
  onOpenMatch: (matchId: string) => void;
  playClick: () => void;
}) {
  const { user, firebaseEnabled, signInWithGoogle } = useAuth();
  const [matches, setMatches] = useState<MatchRow[] | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<"open" | "gone" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const eligible = firebaseEnabled && !!user && !user.isGuest;

  const refresh = async () => {
    if (!eligible || !user) return;
    setLoading(true); setError(null);
    try {
      const [rows, code] = await Promise.all([
        listMyMatches(user.uid),
        Promise.resolve(readPendingChallengeCode()),
      ]);
      setMatches(rows);
      if (code) {
        const c = await getChallengePreview(code).catch(() => null);
        if (c && c.status === "open") { setPendingCode(code); setPendingStatus("open"); }
        else { clearPendingChallengeCode(); setPendingCode(null); setPendingStatus(null); }
      } else {
        setPendingCode(null); setPendingStatus(null);
      }
    } catch (err) {
      setError(err instanceof PvpError ? err.message : "Non riesco a caricare le sfide.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eligible) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, user?.uid]);

  if (!eligible) {
    return (
      <div className="bg-slate-950 border border-slate-850 rounded-3xl p-4 space-y-2.5" id="pvp-hub">
        <div className="text-[11px] font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5"><Swords className="w-3.5 h-3.5 text-amber-400" /> Sfide tra Allevatori</div>
        <p className="text-[10px] font-mono text-slate-500 leading-snug">
          {!firebaseEnabled ? "Le sfide online richiedono la connessione al cloud (non disponibile in modalità locale)." : "Accedi con un account per sfidare altri allevatori online — l'accesso di prova resta solo su questo dispositivo."}
        </p>
        {firebaseEnabled && (
          <button onClick={() => { playClick(); signInWithGoogle().catch(() => {}); }} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-[11px] py-2.5 rounded-xl">
            <LogIn className="w-3.5 h-3.5" /> Accedi per sfidare
          </button>
        )}
      </div>
    );
  }

  const attive = (matches ?? []).filter((m) => m.status === "active");
  const chiuse = (matches ?? []).filter((m) => m.status !== "active").slice(0, 5);
  const toccaATe = user ? attive.filter((m) => slotForUid(m, user.uid) && m.turnOf === slotForUid(m, user.uid)).length : 0;

  return (
    <div className="bg-slate-950 border border-slate-850 rounded-3xl p-4 space-y-3" id="pvp-hub">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-mono font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5"><Swords className="w-3.5 h-3.5 text-amber-400" /> Sfide tra Allevatori</div>
        <button onClick={() => { playClick(); refresh(); }} disabled={loading} className="text-slate-500 hover:text-slate-300 p-1" aria-label="Aggiorna">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
      </div>

      {toccaATe > 0 && (
        <div className="bg-amber-500/10 border border-amber-600/40 rounded-xl px-3 py-1.5 text-[10px] font-mono text-amber-300">
          🔔 Tocca a te in {toccaATe} {toccaATe === 1 ? "partita" : "partite"}
        </div>
      )}

      {pendingCode && pendingStatus === "open" && (
        <button onClick={() => { playClick(); setShowCreate(true); }} className="w-full flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-left">
          <div>
            <div className="text-[10px] font-mono text-slate-400">Sfida in attesa</div>
            <div className="text-[13px] font-mono font-black text-amber-300 tracking-widest">{pendingCode}</div>
          </div>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
        </button>
      )}

      {error && <p className="text-[10px] font-mono text-rose-400">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { playClick(); setShowCreate(true); }} className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-[#0b0820] font-mono font-black text-[11px] py-2.5 rounded-xl">
          <Swords className="w-3.5 h-3.5" /> Sfida
        </button>
        <button onClick={() => { playClick(); setShowJoin(true); }} className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-black text-[11px] py-2.5 rounded-xl">
          <Ticket className="w-3.5 h-3.5" /> Ho un codice
        </button>
      </div>

      {attive.length > 0 && (
        <div className="space-y-1.5">
          {attive.map((m) => {
            const slot = user ? slotForUid(m, user.uid) : null;
            const mine = !!slot && m.turnOf === slot;
            const oppNick = slot === "p1" ? m.players.p2.nickname : m.players.p1.nickname;
            return (
              <button key={m.id} data-pvp-match={m.id} onClick={() => { playClick(); onOpenMatch(m.id); }}
                className="w-full flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-left hover:border-amber-600/40">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-black text-slate-200 truncate">vs {oppNick}</div>
                  <div className="text-[9px] font-mono text-slate-500">{m.mode === "live" ? "Live" : "Per corrispondenza"}</div>
                </div>
                <span className={`text-[9px] font-mono font-black px-2 py-1 rounded-full flex-shrink-0 ${mine ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-500"}`}>
                  {mine ? "Tocca a te" : "In attesa"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {matches !== null && attive.length === 0 && chiuse.length === 0 && (
        <p className="text-[10px] font-mono text-slate-500 text-center py-1">Nessuna sfida ancora. Creane una o inserisci un codice.</p>
      )}

      {chiuse.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-slate-900">
          <div className="text-[9px] font-mono uppercase text-slate-600">Concluse di recente</div>
          {chiuse.map((m) => {
            const won = user && m.winnerUid === user.uid;
            const slot = user ? slotForUid(m, user.uid) : null;
            const oppNick = slot === "p1" ? m.players.p2.nickname : m.players.p1.nickname;
            return (
              <button key={m.id} onClick={() => { playClick(); onOpenMatch(m.id); }} className="w-full flex items-center justify-between px-3 py-1.5 text-left">
                <span className="text-[10px] font-mono text-slate-400 truncate">vs {oppNick}</span>
                <span className={`text-[9px] font-mono font-black ${won ? "text-emerald-400" : "text-rose-400"}`}>{won ? "Vittoria" : "Sconfitta"}</span>
              </button>
            );
          })}
        </div>
      )}

      {showCreate && user && (
        <PvpChallengeCreate
          playerCows={collection}
          creatorUid={user.uid}
          creatorNickname={user.displayName || "Allevatore"}
          onMatchReady={(matchId) => { setShowCreate(false); onOpenMatch(matchId); }}
          onClose={() => { setShowCreate(false); refresh(); }}
          playClick={playClick}
        />
      )}
      {showJoin && user && (
        <PvpChallengeJoin
          playerCows={collection}
          acceptorUid={user.uid}
          acceptorNickname={user.displayName || "Allevatore"}
          onMatchReady={(matchId) => { setShowJoin(false); onOpenMatch(matchId); }}
          onClose={() => setShowJoin(false)}
          playClick={playClick}
        />
      )}
    </div>
  );
}
