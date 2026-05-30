import { useState, useRef } from "react";
import { motion } from "motion/react";
import { Vazzamon } from "../types";
import { NPC_OPPONENTS, Pastore } from "../data/opponents";
import { CowVisual } from "./CowVisual";
import {
  MOVES,
  Move,
  Fighter,
  buildPlayerFighter,
  buildOpponentFighter,
  computeDamage,
  pickOpponentMove,
} from "../lib/battle";

type Phase = "choose" | "intro" | "fighting" | "ended";

interface BattleSnapshot {
  pHp: number;
  oHp: number;
  pDef: boolean;
  oDef: boolean;
  pBuff: boolean;
  oBuff: boolean;
}

/**
 * Bataille de Reines a TURNI (stile Pokémon): 4 mosse dalle 4 stat reali,
 * Pastori avversari narrativi con dialoghi, ricompense XP/monete.
 * Non sostituisce l'arena tap-and-dodge: vive accanto ad essa nel tab Gym.
 */
export function BattleTurnBased({
  playerCow,
  onResult,
  playClick,
}: {
  playerCow: Vazzamon;
  onResult: (playerWon: boolean, rewardXp: number, coins: number) => void;
  playClick: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("choose");
  const [pastore, setPastore] = useState<Pastore | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [busy, setBusy] = useState(false);
  const [pAnim, setPAnim] = useState(false);
  const [oAnim, setOAnim] = useState(false);

  const playerRef = useRef<Fighter | null>(null);
  const oppRef = useRef<Fighter | null>(null);
  const stRef = useRef<BattleSnapshot>({ pHp: 0, oHp: 0, pDef: false, oDef: false, pBuff: false, oBuff: false });
  // mirror per il render delle barre
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const player = playerRef.current;
  const opp = oppRef.current;
  const st = stRef.current;

  const pushLog = (lines: string[]) => setLog((prev) => [...lines.reverse(), ...prev].slice(0, 7));

  const startBattle = (p: Pastore) => {
    playClick();
    playerRef.current = buildPlayerFighter(playerCow);
    oppRef.current = buildOpponentFighter(p);
    stRef.current = {
      pHp: playerRef.current.maxHp,
      oHp: oppRef.current.maxHp,
      pDef: false,
      oDef: false,
      pBuff: false,
      oBuff: false,
    };
    setPastore(p);
    setLog([]);
    setWinner(null);
    setBusy(false);
    setPhase("intro");
    rerender();
  };

  const end = (who: "player" | "opponent") => {
    setWinner(who);
    setPhase("ended");
    setBusy(false);
    if (who === "player" && pastore) {
      const coins = Math.round(pastore.rewardXp / 5);
      onResult(true, pastore.rewardXp, coins);
    } else {
      onResult(false, 0, 0);
    }
  };

  const opponentTurn = () => {
    const P = playerRef.current!, O = oppRef.current!, s = stRef.current;
    const move = pickOpponentMove(s.oHp / O.maxHp);
    const lines: string[] = [];
    if (move.kind === "attack") {
      const res = computeDamage(O, P, move, s.pDef, s.oBuff);
      s.pDef = false;
      s.oBuff = false;
      if (res.missed) lines.push(`${O.name} tenta ${move.name} ma sbaglia la spinta!`);
      else {
        s.pHp = Math.max(0, s.pHp - res.dmg);
        lines.push(`${O.name} usa ${move.name}: ${res.dmg} danni${res.crit ? " (CRITICO!)" : ""}`);
      }
      setPAnim(true);
      setTimeout(() => setPAnim(false), 350);
    } else if (move.kind === "defend") {
      s.oDef = true;
      lines.push(`${O.name} si pianta sugli zoccoli (Difesa).`);
    } else {
      s.oBuff = true;
      lines.push(`${O.name} carica lo Sguardo Regale!`);
    }
    pushLog(lines);
    rerender();
    if (s.pHp <= 0) { end("opponent"); return; }
    setBusy(false);
  };

  const playerMove = (move: Move) => {
    if (busy || winner || phase !== "fighting") return;
    playClick();
    setBusy(true);
    const P = playerRef.current!, O = oppRef.current!, s = stRef.current;
    const lines: string[] = [];
    if (move.kind === "attack") {
      const res = computeDamage(P, O, move, s.oDef, s.pBuff);
      s.oDef = false;
      s.pBuff = false;
      if (res.missed) lines.push(`${P.name} usa ${move.name} ma manca il bersaglio!`);
      else {
        s.oHp = Math.max(0, s.oHp - res.dmg);
        lines.push(`${P.name} usa ${move.name}: ${res.dmg} danni${res.crit ? " (CRITICO!)" : ""}`);
      }
      setOAnim(true);
      setTimeout(() => setOAnim(false), 350);
    } else if (move.kind === "defend") {
      s.pDef = true;
      lines.push(`${P.name} si difende: il prossimo colpo sarà dimezzato.`);
    } else {
      s.pBuff = true;
      lines.push(`${P.name} carica lo Sguardo Regale: prossimo attacco potenziato!`);
    }
    pushLog(lines);
    rerender();
    if (s.oHp <= 0) { end("player"); return; }
    setTimeout(opponentTurn, 850);
  };

  // ---- RENDER ----

  if (phase === "choose") {
    return (
      <div className="space-y-3" id="turnbattle-choose">
        <p className="text-xs text-slate-400 text-center">Scegli un Pastore da sfidare in una Bataille de Reines a turni con la tua compagna <b className="text-emerald-300">{playerCow.name}</b>.</p>
        <div className="grid gap-2">
          {NPC_OPPONENTS.map((p) => (
            <button
              key={p.id}
              onClick={() => startBattle(p)}
              className="flex items-center gap-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl p-3 text-left transition-all"
            >
              <span className="text-3xl">{p.avatar}</span>
              <div className="flex-grow">
                <div className="text-sm font-mono font-black text-slate-100">{p.name}</div>
                <div className="text-[10px] text-slate-400">{p.title}</div>
                <div className="text-[10px] text-amber-300 font-mono mt-0.5">Reina: {p.cowName} · Lv {p.cowLevel} · {p.cowBreed}</div>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 font-bold text-right">+{p.rewardXp} XP</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "intro" && pastore) {
    return (
      <div className="text-center space-y-4" id="turnbattle-intro">
        <div className="text-5xl">{pastore.avatar}</div>
        <div className="text-sm font-mono font-black text-slate-100">{pastore.name}</div>
        <p className="text-xs text-slate-300 italic bg-slate-900/60 border border-slate-800 rounded-2xl p-3 leading-relaxed">"{pastore.dialogueIntro}"</p>
        <div className="flex gap-2">
          <button onClick={() => { playClick(); setPhase("choose"); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2.5 rounded-xl">Indietro</button>
          <button onClick={() => { playClick(); setPhase("fighting"); }} id="turnbattle-start" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs py-2.5 rounded-xl border-b-4 border-emerald-800">Inizia la spinta! 🐂</button>
        </div>
      </div>
    );
  }

  if (!player || !opp) return null;

  const pPct = Math.round((st.pHp / player.maxHp) * 100);
  const oPct = Math.round((st.oHp / opp.maxHp) * 100);

  return (
    <div className="space-y-4" id="turnbattle-arena">
      {/* combattenti */}
      <div className="grid grid-cols-2 gap-3">
        {[{ f: player, hp: st.pHp, pct: pPct, anim: pAnim, def: st.pDef, buff: st.pBuff, mine: true },
          { f: opp, hp: st.oHp, pct: oPct, anim: oAnim, def: st.oDef, buff: st.oBuff, mine: false }].map((c, i) => (
          <div key={i} className={`bg-slate-900 border rounded-2xl p-3 text-center space-y-2 ${c.mine ? "border-emerald-700/40" : "border-rose-700/40"}`}>
            <div className="text-[10px] font-mono font-bold text-slate-400 truncate">{c.mine ? "La tua Reina" : pastore?.name}</div>
            <motion.div animate={c.anim ? { x: [0, -6, 6, -4, 0] } : {}} transition={{ duration: 0.35 }} className="flex justify-center">
              <CowVisual cow={c.f.visual} className="w-20 h-20" />
            </motion.div>
            <div className="text-xs font-mono font-black text-slate-100 truncate">{c.f.name}</div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div className={`h-full transition-all duration-300 ${c.pct > 50 ? "bg-emerald-500" : c.pct > 20 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${c.pct}%` }} />
            </div>
            <div className="text-[9px] font-mono text-slate-400">{c.hp}/{c.f.maxHp} HP</div>
            <div className="flex justify-center gap-1 h-3">
              {c.def && <span className="text-[8px] bg-blue-950 text-blue-300 px-1 rounded font-mono">🛡️</span>}
              {c.buff && <span className="text-[8px] bg-amber-950 text-amber-300 px-1 rounded font-mono">👑</span>}
            </div>
          </div>
        ))}
      </div>

      {/* log */}
      <div className="bg-slate-950 border border-slate-850 rounded-2xl p-3 h-[88px] overflow-y-auto no-scrollbar space-y-1">
        {log.length === 0 ? (
          <p className="text-[10px] text-slate-500 font-mono">Scegli una mossa per iniziare la spinta...</p>
        ) : (
          log.map((l, i) => (
            <div key={i} className={`text-[10px] font-mono leading-snug ${i === 0 ? "text-slate-100" : "text-slate-500"}`}>❖ {l}</div>
          ))
        )}
      </div>

      {/* azioni / esito */}
      {phase === "fighting" && (
        <div className="grid grid-cols-2 gap-2" id="turnbattle-moves">
          {MOVES.map((m) => (
            <button
              key={m.id}
              onClick={() => playerMove(m)}
              disabled={busy}
              title={m.desc}
              className={`text-left rounded-xl border p-2.5 transition-all disabled:opacity-40 ${
                m.kind === "attack" ? "bg-rose-950/40 border-rose-800 hover:bg-rose-900/50" :
                m.kind === "defend" ? "bg-blue-950/40 border-blue-800 hover:bg-blue-900/50" :
                "bg-amber-950/40 border-amber-800 hover:bg-amber-900/50"
              }`}
            >
              <div className="text-xs font-mono font-black text-slate-100">{m.emoji} {m.name}</div>
              <div className="text-[8.5px] text-slate-400 leading-tight mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      )}

      {phase === "ended" && pastore && (
        <div className="text-center space-y-3">
          <div className={`text-lg font-mono font-black ${winner === "player" ? "text-emerald-400" : "text-rose-400"}`}>
            {winner === "player" ? "🏆 Hai vinto la Bataille!" : "😔 Hai perso questa volta"}
          </div>
          <p className="text-xs text-slate-300 italic bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
            {pastore.avatar} "{winner === "player" ? pastore.dialogueWin : pastore.dialogueLoss}"
          </p>
          {winner === "player" && (
            <div className="text-[11px] font-mono text-emerald-300">Ricompensa: +{pastore.rewardXp} XP · +{Math.round(pastore.rewardXp / 5)} 🪙</div>
          )}
          <div className="flex gap-2">
            <button onClick={() => startBattle(pastore)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs py-2.5 rounded-xl border-b-4 border-emerald-800">Rivincita</button>
            <button onClick={() => { playClick(); setPhase("choose"); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2.5 rounded-xl">Cambia avversario</button>
          </div>
        </div>
      )}
    </div>
  );
}
