import { useState, useRef } from "react";
import { motion } from "motion/react";
import { Backpack } from "lucide-react";
import { Vatsamon, BackpackItem } from "../types";
import { NPC_OPPONENTS, Pastore } from "../data/opponents";
import { CowVisual } from "./CowVisual";
import {
  Fighter,
  buildPlayerFighter,
  buildOpponentFighter,
  computeDamage,
  pickOpponentMove,
} from "../lib/battle";
import {
  BattleMove,
  TYPES,
  effectivenessLabel,
  BATTLE_ITEMS,
} from "../data/combat";

type Phase = "choose" | "intro" | "fighting" | "ended";

interface Snap {
  pHp: number; oHp: number;
  pDef: boolean; oDef: boolean;
  pAtkBuff: number; pDefBuff: number;
  oAtkBuff: number; oDefBuff: number;
  pEnergy: number; oEnergy: number;
}

const ITEM_LABEL: Record<string, { name: string; emoji: string }> = {
  "item-potion-milk":    { name: "Secchio di Latte", emoji: "🥛" },
  "item-potion-fontina": { name: "Fetta di Fontina", emoji: "🧀" },
  "item-buff-genepy":    { name: "Genepy del Pastore", emoji: "🍵" },
  "item-buff-bell":      { name: "Campanaccio Fortunato", emoji: "🔔" },
  "item-energy-grappa":  { name: "Grappa alla Genziana", emoji: "🥃" },
};

/**
 * Bataille de Reines a TURNI "seria" (stile Pokémon): mosse tipizzate con
 * efficacie, speciali ad Adrenalina, buff persistenti, e zaino da combattimento
 * (cure + buff). Vive nel tab Gym accanto alle Arene.
 */
export function BattleTurnBased({
  playerCow,
  backpack,
  onConsumeItem,
  onResult,
  playClick,
}: {
  playerCow: Vatsamon;
  backpack: BackpackItem[];
  onConsumeItem: (id: string) => void;
  onResult: (playerWon: boolean, rewardXp: number, coins: number) => void;
  playClick: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("choose");
  const [pastore, setPastore] = useState<Pastore | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [busy, setBusy] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [pAnim, setPAnim] = useState(false);
  const [oAnim, setOAnim] = useState(false);

  const playerRef = useRef<Fighter | null>(null);
  const oppRef = useRef<Fighter | null>(null);
  const stRef = useRef<Snap>({ pHp: 0, oHp: 0, pDef: false, oDef: false, pAtkBuff: 0, pDefBuff: 0, oAtkBuff: 0, oDefBuff: 0, pEnergy: 0, oEnergy: 0 });
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const player = playerRef.current;
  const opp = oppRef.current;
  const st = stRef.current;

  const pushLog = (lines: string[]) => setLog((prev) => [...[...lines].reverse(), ...prev].slice(0, 8));
  const cap = (n: number) => Math.min(100, n);

  const startBattle = (p: Pastore) => {
    playClick();
    playerRef.current = buildPlayerFighter(playerCow);
    oppRef.current = buildOpponentFighter(p);
    stRef.current = {
      pHp: playerRef.current.maxHp, oHp: oppRef.current.maxHp,
      pDef: false, oDef: false, pAtkBuff: 0, pDefBuff: 0, oAtkBuff: 0, oDefBuff: 0,
      pEnergy: 0, oEnergy: 0,
    };
    setPastore(p); setLog([]); setWinner(null); setBusy(false); setShowBag(false);
    setPhase("intro"); rerender();
  };

  const end = (who: "player" | "opponent") => {
    setWinner(who); setPhase("ended"); setBusy(false);
    if (who === "player" && pastore) onResult(true, pastore.rewardXp, Math.round(pastore.rewardXp / 5));
    else onResult(false, 0, 0);
  };

  // Applica la mossa di un attore. side="p" è il giocatore.
  const applyMove = (side: "p" | "o", move: BattleMove) => {
    const P = playerRef.current!, O = oppRef.current!, s = stRef.current;
    const attacker = side === "p" ? P : O;
    const defender = side === "p" ? O : P;
    const lines: string[] = [];

    if (move.category === "attacco" || move.category === "speciale") {
      const defending = side === "p" ? s.oDef : s.pDef;
      const atkBuff = side === "p" ? s.pAtkBuff : s.oAtkBuff;
      const defBuff = side === "p" ? s.oDefBuff : s.pDefBuff;
      const res = computeDamage(attacker, defender, move, defending, atkBuff, defBuff);
      if (side === "p") s.oDef = false; else s.pDef = false;
      // energia: speciale azzera, altrimenti accumula
      if (move.category === "speciale") { if (side === "p") s.pEnergy = 0; else s.oEnergy = 0; }
      else { if (side === "p") s.pEnergy = cap(s.pEnergy + move.energy); else s.oEnergy = cap(s.oEnergy + move.energy); }
      if (res.missed) lines.push(`${attacker.name} tenta ${move.name} ma manca!`);
      else {
        if (side === "p") s.oHp = Math.max(0, s.oHp - res.dmg); else s.pHp = Math.max(0, s.pHp - res.dmg);
        lines.push(`${attacker.name} usa ${move.name}: ${res.dmg} danni${res.crit ? " (CRITICO!)" : ""}`);
        const eff = effectivenessLabel(res.mult);
        if (eff) lines.push(eff);
      }
      if (side === "p") setOAnim(true); else setPAnim(true);
      setTimeout(() => { setOAnim(false); setPAnim(false); }, 350);
    } else if (move.category === "difesa") {
      if (side === "p") { s.pDef = true; s.pEnergy = cap(s.pEnergy + move.energy); } else { s.oDef = true; s.oEnergy = cap(s.oEnergy + move.energy); }
      lines.push(`${attacker.name} usa ${move.name}: si protegge.`);
    } else if (move.category === "cura") {
      const heal = move.amount || 60;
      if (side === "p") { s.pHp = Math.min(P.maxHp, s.pHp + heal); s.pEnergy = cap(s.pEnergy + move.energy); }
      else { s.oHp = Math.min(O.maxHp, s.oHp + heal); s.oEnergy = cap(s.oEnergy + move.energy); }
      lines.push(`${attacker.name} usa ${move.name}: +${heal} HP.`);
    } else if (move.category === "buff") {
      const amt = move.amount || 30;
      if (move.buffStat === "atk") { if (side === "p") s.pAtkBuff = Math.min(100, s.pAtkBuff + amt); else s.oAtkBuff = Math.min(100, s.oAtkBuff + amt); }
      else { if (side === "p") s.pDefBuff = Math.min(100, s.pDefBuff + amt); else s.oDefBuff = Math.min(100, s.oDefBuff + amt); }
      if (side === "p") s.pEnergy = cap(s.pEnergy + move.energy); else s.oEnergy = cap(s.oEnergy + move.energy);
      lines.push(`${attacker.name} usa ${move.name}!`);
    }
    pushLog(lines);
    rerender();
  };

  const opponentTurn = () => {
    const O = oppRef.current!, s = stRef.current;
    const move = pickOpponentMove(O, s.oHp / O.maxHp, s.oEnergy);
    applyMove("o", move);
    if (stRef.current.pHp <= 0) { end("opponent"); return; }
    setBusy(false);
  };

  const playerMove = (move: BattleMove) => {
    if (busy || winner || phase !== "fighting") return;
    if (move.category === "speciale" && st.pEnergy < move.energy) return;
    playClick(); setBusy(true); setShowBag(false);
    applyMove("p", move);
    if (stRef.current.oHp <= 0) { end("player"); return; }
    setTimeout(opponentTurn, 850);
  };

  const useItem = (id: string) => {
    if (busy || winner || phase !== "fighting") return;
    const eff = BATTLE_ITEMS[id];
    const owned = backpack.find((b) => b.id === id);
    if (!eff || !owned || owned.quantity <= 0) return;
    playClick(); setBusy(true); setShowBag(false);
    const P = playerRef.current!, s = stRef.current;
    const lbl = ITEM_LABEL[id]?.name || "Oggetto";
    if (eff.kind === "heal") { s.pHp = Math.min(P.maxHp, s.pHp + eff.amount); pushLog([`Usi ${lbl}: +${eff.amount} HP!`]); }
    else if (eff.kind === "buff_atk") { s.pAtkBuff = Math.min(100, s.pAtkBuff + eff.amount); pushLog([`Usi ${lbl}: attacco su!`]); }
    else if (eff.kind === "buff_def") { s.pDefBuff = Math.min(100, s.pDefBuff + eff.amount); pushLog([`Usi ${lbl}: difesa su!`]); }
    else if (eff.kind === "energy") { s.pEnergy = cap(s.pEnergy + eff.amount); pushLog([`Usi ${lbl}: Adrenalina +${eff.amount}!`]); }
    onConsumeItem(id);
    rerender();
    setTimeout(opponentTurn, 850);
  };

  // ---- RENDER ----
  if (phase === "choose") {
    return (
      <div className="space-y-3" id="turnbattle-choose">
        <p className="text-xs text-slate-400 text-center">Scegli un Pastore da sfidare con <b className="text-emerald-600">{playerCow.name}</b> <TypeChip cow={playerCow} />.</p>
        <div className="grid gap-2">
          {NPC_OPPONENTS.map((p) => (
            <button key={p.id} onClick={() => startBattle(p)} className="flex items-center gap-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl p-3 text-left transition-all">
              <span className="text-3xl">{p.avatar}</span>
              <div className="flex-grow">
                <div className="text-sm font-mono font-black text-slate-100">{p.name}</div>
                <div className="text-[10px] text-slate-400">{p.title}</div>
                <div className="text-[10px] text-amber-400 font-mono mt-0.5">Reina: {p.cowName} · Lv {p.cowLevel} · {p.cowBreed}</div>
              </div>
              <div className="text-[10px] font-mono text-emerald-600 font-bold text-right">+{p.rewardXp} XP</div>
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
  const fighters = [
    { f: player, hp: st.pHp, pct: pPct, anim: pAnim, def: st.pDef, atkB: st.pAtkBuff, defB: st.pDefBuff, energy: st.pEnergy, mine: true },
    { f: opp, hp: st.oHp, pct: oPct, anim: oAnim, def: st.oDef, atkB: st.oAtkBuff, defB: st.oDefBuff, energy: st.oEnergy, mine: false },
  ];
  const bagItems = backpack.filter((b) => BATTLE_ITEMS[b.id] && b.quantity > 0);

  return (
    <div className="space-y-4" id="turnbattle-arena">
      <div className="grid grid-cols-2 gap-3">
        {fighters.map((c, i) => (
          <div key={i} className={`bg-slate-900 border rounded-2xl p-3 text-center space-y-1.5 ${c.mine ? "border-emerald-700/40" : "border-rose-700/40"}`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold text-slate-400 truncate">{c.mine ? "La tua Reina" : pastore?.name}</span>
              <span className="text-[9px] px-1 rounded font-mono font-bold" style={{ background: TYPES[c.f.type].color + "22", color: TYPES[c.f.type].color }}>{TYPES[c.f.type].emoji} {TYPES[c.f.type].name}</span>
            </div>
            <motion.div animate={c.anim ? { x: [0, -6, 6, -4, 0] } : {}} transition={{ duration: 0.35 }} className="flex justify-center">
              <CowVisual cow={c.f.visual} className="w-20 h-20" />
            </motion.div>
            <div className="text-xs font-mono font-black text-slate-100 truncate">{c.f.name}</div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div className={`h-full transition-all duration-300 ${c.pct > 50 ? "bg-emerald-500" : c.pct > 20 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${c.pct}%` }} />
            </div>
            <div className="text-[9px] font-mono text-slate-400">{c.hp}/{c.f.maxHp} HP</div>
            {/* Adrenalina */}
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${c.energy}%` }} />
            </div>
            <div className="flex justify-center gap-1 h-3 flex-wrap">
              {c.def && <span className="text-[8px] bg-blue-950 text-blue-400 px-1 rounded font-mono">🛡️</span>}
              {c.atkB > 0 && <span className="text-[8px] bg-rose-950 text-rose-500 px-1 rounded font-mono">ATK+{c.atkB}</span>}
              {c.defB > 0 && <span className="text-[8px] bg-blue-950 text-blue-400 px-1 rounded font-mono">DEF+{c.defB}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-950 border border-slate-850 rounded-2xl p-3 h-[88px] overflow-y-auto no-scrollbar space-y-1">
        {log.length === 0 ? (
          <p className="text-[10px] text-slate-500 font-mono">Scegli una mossa per iniziare la spinta...</p>
        ) : log.map((l, i) => (
          <div key={i} className={`text-[10px] font-mono leading-snug ${i === 0 ? "text-slate-100" : "text-slate-500"}`}>❖ {l}</div>
        ))}
      </div>

      {phase === "fighting" && !showBag && (
        <>
          <div className="grid grid-cols-2 gap-2" id="turnbattle-moves">
            {player.moveset.map((m) => {
              const locked = m.category === "speciale" && st.pEnergy < m.energy;
              const col = TYPES[m.type].color;
              return (
                <button key={m.id} onClick={() => playerMove(m)} disabled={busy || locked} title={m.desc}
                  className="text-left rounded-xl border p-2.5 transition-all disabled:opacity-40"
                  style={{ background: col + "14", borderColor: col + "55" }}>
                  <div className="text-[11px] font-mono font-black text-slate-100 leading-tight">{m.emoji} {m.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[8px] font-mono px-1 rounded" style={{ background: col + "22", color: col }}>{TYPES[m.type].emoji}{TYPES[m.type].name}</span>
                    {m.category === "speciale" && <span className="text-[8px] font-mono text-amber-400">{locked ? `⚡${st.pEnergy}/100` : "SPECIALE ⚡"}</span>}
                    {m.category === "cura" && <span className="text-[8px] font-mono text-emerald-600">CURA</span>}
                    {m.category === "difesa" && <span className="text-[8px] font-mono text-blue-400">DIFESA</span>}
                    {m.category === "buff" && <span className="text-[8px] font-mono text-purple-400">BUFF</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={() => { playClick(); setShowBag(true); }} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-amber-700/40 text-amber-400 font-mono font-black text-xs py-2.5 rounded-xl disabled:opacity-40">
            <Backpack className="w-4 h-4" /> Zaino ({bagItems.reduce((n, b) => n + b.quantity, 0)})
          </button>
        </>
      )}

      {phase === "fighting" && showBag && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-slate-400 text-center">Usa un oggetto (consuma il turno)</div>
          {bagItems.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-3">Zaino da battaglia vuoto. Compra cure e buff alla Casera!</p>
          ) : bagItems.map((b) => {
            const meta = ITEM_LABEL[b.id]; const eff = BATTLE_ITEMS[b.id];
            return (
              <button key={b.id} onClick={() => useItem(b.id)} disabled={busy} className="w-full flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-left disabled:opacity-40">
                <span className="text-2xl">{meta?.emoji}</span>
                <div className="flex-grow">
                  <div className="text-[11px] font-mono font-black text-slate-100">{meta?.name}</div>
                  <div className="text-[9px] text-slate-400">{eff.kind === "heal" ? `Cura ${eff.amount} HP` : eff.kind === "buff_atk" ? `Attacco +${eff.amount}%` : eff.kind === "buff_def" ? `Difesa +${eff.amount}%` : `Adrenalina +${eff.amount}`}</div>
                </div>
                <span className="text-[10px] font-mono text-amber-400">×{b.quantity}</span>
              </button>
            );
          })}
          <button onClick={() => { playClick(); setShowBag(false); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2 rounded-xl">Chiudi zaino</button>
        </div>
      )}

      {phase === "ended" && pastore && (
        <div className="text-center space-y-3">
          <div className={`text-lg font-mono font-black ${winner === "player" ? "text-emerald-600" : "text-rose-500"}`}>
            {winner === "player" ? "🏆 Hai vinto la Bataille!" : "😔 Hai perso questa volta"}
          </div>
          <p className="text-xs text-slate-300 italic bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
            {pastore.avatar} "{winner === "player" ? pastore.dialogueWin : pastore.dialogueLoss}"
          </p>
          {winner === "player" && <div className="text-[11px] font-mono text-emerald-600">Ricompensa: +{pastore.rewardXp} XP · +{Math.round(pastore.rewardXp / 5)} 🪙</div>}
          <div className="flex gap-2">
            <button onClick={() => startBattle(pastore)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs py-2.5 rounded-xl border-b-4 border-emerald-800">Rivincita</button>
            <button onClick={() => { playClick(); setPhase("choose"); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2.5 rounded-xl">Cambia avversario</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TypeChip({ cow }: { cow: Vatsamon }) {
  // chip tipo della Reina del giocatore (nella schermata di scelta)
  const tm = TYPES[buildPlayerFighter(cow).type];
  return <span className="text-[10px] font-mono px-1 rounded" style={{ background: tm.color + "22", color: tm.color }}>{tm.emoji} {tm.name}</span>;
}
