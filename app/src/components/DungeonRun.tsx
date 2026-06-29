import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Backpack, X, Repeat } from "lucide-react";
import { Vatsamon, BackpackItem } from "../types";
import { CowVisual } from "./CowVisual";
import {
  Fighter,
  buildPlayerFighter,
  buildScaledBoss,
  computeDamage,
  pickOpponentMove,
} from "../lib/battle";
import { BattleMove, TYPES, effectivenessLabel, BATTLE_ITEMS, cowType } from "../data/combat";
import { Dungeon } from "../data/dungeons";
import { REAL_COWS } from "../data/realCows";

type Phase = "team" | "fight" | "won" | "lost";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ITEM_LABEL: Record<string, { name: string; emoji: string }> = {
  "item-potion-milk": { name: "Secchio di Latte", emoji: "🥛" },
  "item-potion-fontina": { name: "Fetta di Fontina", emoji: "🧀" },
  "item-buff-genepy": { name: "Genepy del Pastore", emoji: "🍵" },
  "item-buff-bell": { name: "Campanaccio Fortunato", emoji: "🔔" },
  "item-energy-grappa": { name: "Grappa alla Genziana", emoji: "🥃" },
};

interface St {
  teamHp: number[];
  oppHp: number;
  pEnergy: number; oEnergy: number;
  pAtkBuff: number; pDefBuff: number; oAtkBuff: number; oDefBuff: number;
  pDef: boolean; oDef: boolean;
}

export default function DungeonRun({
  dungeon,
  playerCows,
  backpack,
  onConsumeItem,
  onResult,
  onClose,
  playClick,
}: {
  dungeon: Dungeon;
  playerCows: Vatsamon[];
  backpack: BackpackItem[];
  onConsumeItem: (id: string) => void;
  onResult: (won: boolean) => void;
  onClose: () => void;
  playClick: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("team");
  const [picked, setPicked] = useState<string[]>(() => [...playerCows].sort((a, b) => b.cp - a.cp).slice(0, 4).map((c) => c.id));
  const [activeIdx, setActiveIdx] = useState(0);
  const [oppIdx, setOppIdx] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [hit, setHit] = useState<"p" | "o" | null>(null);
  const [shake, setShake] = useState(false);

  const teamRef = useRef<Fighter[]>([]);
  const oppsRef = useRef<Fighter[]>([]);
  const stRef = useRef<St>({ teamHp: [], oppHp: 0, pEnergy: 0, oEnergy: 0, pAtkBuff: 0, pDefBuff: 0, oAtkBuff: 0, oDefBuff: 0, pDef: false, oDef: false });
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const st = stRef.current;
  const pushLog = (lines: string[]) => setLog((prev) => [...[...lines].reverse(), ...prev].slice(0, 6));
  const cap = (n: number) => Math.max(0, Math.min(100, n));

  const active = teamRef.current[activeIdx];
  const opp = oppsRef.current[oppIdx];

  // ---- Avvio dungeon: costruisce squadra + 5 avversari scalati sulla media squadra ----
  const start = () => {
    playClick();
    const cows = picked.map((id) => playerCows.find((c) => c.id === id)!).filter(Boolean);
    const team = cows.map(buildPlayerFighter);
    teamRef.current = team;
    const avg = {
      atk: team.reduce((s, f) => s + f.atk, 0) / team.length,
      def: team.reduce((s, f) => s + f.def, 0) / team.length,
      agi: team.reduce((s, f) => s + f.agi, 0) / team.length,
      maxHp: team.reduce((s, f) => s + f.maxHp, 0) / team.length,
    };
    const ref = { ...team[0], atk: avg.atk, def: avg.def, agi: avg.agi, maxHp: avg.maxHp };
    oppsRef.current = dungeon.opponents.map((o) => {
      const visual = REAL_COWS.find((c) => c.name === o.name) ||
        REAL_COWS.filter((c) => c.rarity === o.rarity && c.realPhoto)[0] ||
        REAL_COWS.filter((c) => c.realPhoto)[0] || REAL_COWS[0];
      return buildScaledBoss(ref, { ...visual, name: o.name }, o.type, o.powerFactor, o.rarity);
    });
    stRef.current = {
      teamHp: team.map((f) => f.maxHp),
      oppHp: oppsRef.current[0].maxHp,
      pEnergy: 0, oEnergy: 0, pAtkBuff: 0, pDefBuff: 0, oAtkBuff: 0, oDefBuff: 0, pDef: false, oDef: false,
    };
    setActiveIdx(0); setOppIdx(0);
    setLog([`${dungeon.emoji} ${dungeon.league}: 5 sfide consecutive! Sfidante 1 — ${dungeon.opponents[0].name}`]);
    setShowBag(false); setShowSwitch(false);
    setPhase("fight"); rerender();
  };

  const resetTransient = () => {
    const s = stRef.current;
    s.pEnergy = 0; s.oEnergy = 0; s.pAtkBuff = 0; s.pDefBuff = 0; s.oAtkBuff = 0; s.oDefBuff = 0; s.pDef = false; s.oDef = false;
  };

  // Utility HP (oppHp + teamHp[]) chiuse sullo stato.
  const oppHpGet = () => stRef.current.oppHp;
  const oppHpAdd = (d: number, max = Infinity) => { stRef.current.oppHp = Math.max(0, Math.min(max, stRef.current.oppHp + d)); };
  const teamHpAdd = (i: number, d: number, max = Infinity) => { const s = stRef.current; s.teamHp[i] = Math.max(0, Math.min(max, s.teamHp[i] + d)); };

  const performTurn = async (side: "p" | "o", move: BattleMove) => {
    const A = side === "p" ? teamRef.current[activeIdx] : oppsRef.current[oppIdx];
    const D = side === "p" ? oppsRef.current[oppIdx] : teamRef.current[activeIdx];
    const s = stRef.current;
    // calcola e applica (gestiamo gli HP qui, non in applyMove, per chiarezza)
    if (move.category === "attacco" || move.category === "speciale") {
      const defending = side === "p" ? s.oDef : s.pDef;
      const res = computeDamage(A, D, move, defending, side === "p" ? s.pAtkBuff : s.oAtkBuff, side === "p" ? s.oDefBuff : s.pDefBuff);
      if (side === "p") s.oDef = false; else s.pDef = false;
      if (move.category === "speciale") { if (side === "p") s.pEnergy = 0; else s.oEnergy = 0; } else { if (side === "p") s.pEnergy = cap(s.pEnergy + move.energy); else s.oEnergy = cap(s.oEnergy + move.energy); }
      if (res.missed) pushLog([`${A.name} usa ${move.name}… ma manca!`]);
      else {
        if (side === "p") oppHpAdd(-res.dmg); else teamHpAdd(activeIdx, -res.dmg);
        pushLog([`${A.name} usa ${move.name}: ${res.dmg} di spinta${res.crit ? " (spinta decisa!)" : ""}`]);
        setHit(side === "p" ? "o" : "p"); if (res.crit || move.category === "speciale") setShake(true);
        const eff = effectivenessLabel(res.mult); if (eff) pushLog([eff]);
        await wait(140); setHit(null); setShake(false);
      }
    } else if (move.category === "difesa") { if (side === "p") { s.pDef = true; s.pEnergy = cap(s.pEnergy + move.energy); } else { s.oDef = true; s.oEnergy = cap(s.oEnergy + move.energy); } pushLog([`${A.name} usa ${move.name}: si protegge.`]); }
    else if (move.category === "cura") { const h = move.amount || 60; if (side === "p") teamHpAdd(activeIdx, h, A.maxHp); else oppHpAdd(h, D.maxHp); if (side === "p") s.pEnergy = cap(s.pEnergy + move.energy); else s.oEnergy = cap(s.oEnergy + move.energy); pushLog([`${A.name} usa ${move.name}: +${h} di tenuta.`]); }
    else { const amt = move.amount || 30; if (move.buffStat === "atk") { if (side === "p") s.pAtkBuff = Math.min(100, s.pAtkBuff + amt); else s.oAtkBuff = Math.min(100, s.oAtkBuff + amt); } else { if (side === "p") s.pDefBuff = Math.min(100, s.pDefBuff + amt); else s.oDefBuff = Math.min(100, s.oDefBuff + amt); } if (side === "p") s.pEnergy = cap(s.pEnergy + move.energy); else s.oEnergy = cap(s.oEnergy + move.energy); pushLog([`${A.name} usa ${move.name}!`]); }
    rerender();
    await wait(380);
  };

  // Avversario sconfitto → prossimo, oppure dungeon vinto
  const advanceOpponent = async () => {
    if (oppIdx >= oppsRef.current.length - 1) { setPhase("won"); onResult(true); return; }
    const next = oppIdx + 1;
    resetTransient();
    stRef.current.oppHp = oppsRef.current[next].maxHp;
    setOppIdx(next);
    pushLog([`⬇️ ${dungeon.opponents[oppIdx].name} si ritira! Sfidante ${next + 1}: ${dungeon.opponents[next].name}`]);
    rerender();
    await wait(500);
  };

  // Reina KO → passa alla prossima viva, oppure dungeon fallito
  const afterPlayerHit = (): boolean => {
    const s = stRef.current;
    if (s.teamHp[activeIdx] > 0) return true;
    pushLog([`💀 ${teamRef.current[activeIdx].name} è esausta!`]);
    const nextAlive = s.teamHp.findIndex((hp) => hp > 0);
    if (nextAlive === -1) { setPhase("lost"); onResult(false); return false; }
    setActiveIdx(nextAlive);
    pushLog([`➡️ Scende in campo ${teamRef.current[nextAlive].name}!`]);
    return true;
  };

  const opponentTurn = async () => {
    const O = oppsRef.current[oppIdx];
    const move = pickOpponentMove(O, stRef.current.oppHp / O.maxHp, stRef.current.oEnergy);
    await performTurn("o", move);
    if (!afterPlayerHit()) return;
    setBusy(false);
  };

  const doMove = async (move: BattleMove) => {
    if (busy || phase !== "fight") return;
    if (move.category === "speciale" && st.pEnergy < move.energy) return;
    playClick(); setBusy(true); setShowBag(false); setShowSwitch(false);
    await performTurn("p", move);
    if (oppHpGet() <= 0) { await advanceOpponent(); setBusy(false); return; }
    await wait(250);
    await opponentTurn();
  };

  const useItem = async (id: string) => {
    if (busy || phase !== "fight") return;
    const eff = BATTLE_ITEMS[id]; const owned = backpack.find((b) => b.id === id);
    if (!eff || !owned || owned.quantity <= 0) return;
    playClick(); setBusy(true); setShowBag(false);
    const s = stRef.current; const A = teamRef.current[activeIdx];
    if (eff.kind === "heal") { teamHpAdd(activeIdx, eff.amount, A.maxHp); pushLog([`🎒 ${ITEM_LABEL[id]?.name}: +${eff.amount} tenuta a ${A.name}`]); }
    else if (eff.kind === "buff_atk") { s.pAtkBuff = Math.min(100, s.pAtkBuff + eff.amount); pushLog([`🎒 ${ITEM_LABEL[id]?.name}: ATK +${eff.amount}%`]); }
    else if (eff.kind === "buff_def") { s.pDefBuff = Math.min(100, s.pDefBuff + eff.amount); pushLog([`🎒 ${ITEM_LABEL[id]?.name}: DIF +${eff.amount}%`]); }
    else { s.pEnergy = cap(s.pEnergy + eff.amount); pushLog([`🎒 ${ITEM_LABEL[id]?.name}: Adrenalina +${eff.amount}`]); }
    onConsumeItem(id); rerender();
    await wait(500);
    await opponentTurn();
  };

  const switchTo = async (idx: number) => {
    if (busy || phase !== "fight" || idx === activeIdx || stRef.current.teamHp[idx] <= 0) return;
    playClick(); setBusy(true); setShowSwitch(false);
    setActiveIdx(idx);
    pushLog([`🔄 Entra in campo ${teamRef.current[idx].name}!`]);
    resetTransient();
    rerender();
    await wait(450);
    await opponentTurn();
  };

  // ====== RENDER ======
  if (phase === "team") {
    const sorted = [...playerCows].sort((a, b) => b.cp - a.cp);
    return (
      <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="dungeon-scene">
        <div className="aurora-bg" />
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800">
          <span className="text-xs font-mono font-black">{dungeon.emoji} {dungeon.league}</span>
          <button onClick={() => { playClick(); onClose(); }} className="bg-slate-900 rounded-full p-1.5"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-[11px] text-slate-300 text-center bg-slate-900/70 border border-slate-800 rounded-2xl p-3">
            {dungeon.blurb}<br /><b className="text-amber-400">5 battaglie di fila</b> (4 sfidanti + Campione). La tenuta si trascina: la recuperi solo con gli oggetti. Se tutta la mandria si ritira, riparti da capo.
          </p>
          <div className="text-[10px] font-mono text-slate-400 text-center">Scegli fino a 4 Reines per la squadra ({picked.length}/4):</div>
          <div className="grid grid-cols-3 gap-2">
            {sorted.map((c) => {
              const sel = picked.includes(c.id);
              const tm = TYPES[cowType(c)];
              return (
                <button key={c.id} onClick={() => { playClick(); setPicked((p) => p.includes(c.id) ? p.filter((x) => x !== c.id) : p.length < 4 ? [...p, c.id] : p); }}
                  className={`rounded-xl border-2 p-1.5 ${sel ? "border-rose-500 bg-rose-950/60" : "border-slate-700 bg-slate-900/70"}`}>
                  <CowVisual cow={c} className="w-full h-14" />
                  <div className="text-[8px] font-mono text-slate-200 truncate mt-0.5">{c.name}</div>
                  <div className="text-[8px] font-mono" style={{ color: tm.color }}>{tm.emoji} CP{c.cp}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex gap-2">
          <button onClick={() => { playClick(); onClose(); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-3 rounded-xl">Annulla</button>
          <button onClick={start} disabled={picked.length === 0} id="dungeon-start" className="flex-1 nav-active text-white font-mono font-black text-xs py-3 rounded-xl disabled:opacity-40">Entra nella Lega! ⚔️</button>
        </div>
      </div>
    );
  }

  if (!active || !opp) return null;
  const oppMax = opp.maxHp;
  const oppPct = Math.round((st.oppHp / oppMax) * 100);
  const aPct = Math.round((st.teamHp[activeIdx] / active.maxHp) * 100);
  const bagItems = backpack.filter((b) => BATTLE_ITEMS[b.id] && b.quantity > 0);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="dungeon-scene">
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg,#cdd5e3 0%,#e2e8f0 35%,#dcfce7 70%,#bbf7d0 100%)" }} />
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/75 backdrop-blur border-b border-slate-800">
        <span className="text-xs font-mono font-black">{dungeon.emoji} {dungeon.league} · Sfida {oppIdx + 1}/5</span>
        <button onClick={() => { playClick(); onClose(); }} className="bg-slate-900/70 rounded-full p-1.5"><X size={16} /></button>
      </div>

      {phase === "fight" && (
        <motion.div animate={shake ? { x: [0, -9, 8, -5, 0] } : {}} transition={{ duration: 0.35 }} className="relative flex-1 overflow-hidden">
          {/* avversario */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1" style={{ width: "60%" }}>
            <Plate name={opp.name} type={opp.type} hp={st.oppHp} max={oppMax} pct={oppPct} energy={st.oEnergy} champion={oppIdx === 4} />
            <motion.div animate={hit === "o" ? { x: [0, -8, 8, 0] } : {}} transition={{ duration: 0.25 }}>
              <div className="rounded-2xl overflow-hidden border-2 border-rose-400/60 shadow-xl" style={{ filter: hit === "o" ? "brightness(2)" : "none", transition: "filter .12s" }}>
                <CowVisual cow={opp.visual} className="w-24 h-24" />
              </div>
            </motion.div>
          </div>
          {/* giocatore */}
          <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1" style={{ width: "60%" }}>
            <Plate name={active.name} type={active.type} hp={st.teamHp[activeIdx]} max={active.maxHp} pct={aPct} energy={st.pEnergy} atkB={st.pAtkBuff} defB={st.pDefBuff} def={st.pDef} />
            <motion.div animate={hit === "p" ? { x: [0, -8, 8, 0] } : {}} transition={{ duration: 0.25 }}>
              <div className="rounded-2xl overflow-hidden border-2 border-emerald-400/70 shadow-xl" style={{ filter: hit === "p" ? "brightness(2)" : "none", transition: "filter .12s" }}>
                <CowVisual cow={active.visual} className="w-28 h-28" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* roster squadra */}
      {phase === "fight" && (
        <div className="flex justify-center gap-1.5 px-3 py-1.5 bg-slate-950/70">
          {teamRef.current.map((f, i) => {
            const hp = st.teamHp[i]; const ko = hp <= 0; const cur = i === activeIdx;
            return (
              <div key={i} className={`flex flex-col items-center rounded-lg px-1.5 py-1 border ${cur ? "border-emerald-500 bg-emerald-950/40" : ko ? "border-slate-800 bg-slate-900/40 opacity-50" : "border-slate-700 bg-slate-900/60"}`}>
                <span className="text-[8px] font-mono text-slate-200 truncate max-w-[52px]">{ko ? "💀" : TYPES[f.type].emoji} {f.name.slice(0, 6)}</span>
                <div className="w-12 h-1 rounded-full bg-slate-800 overflow-hidden mt-0.5"><div className="h-full" style={{ width: `${Math.round((hp / f.maxHp) * 100)}%`, background: hp / f.maxHp > 0.4 ? "#10b981" : "#ef4444" }} /></div>
              </div>
            );
          })}
        </div>
      )}

      {/* pannello comandi */}
      <div className="bg-slate-950/85 backdrop-blur border-t border-slate-800 p-3 space-y-2">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 h-[52px] overflow-y-auto no-scrollbar">
          {log.map((l, i) => <div key={i} className={`text-[10px] font-mono leading-snug ${i === 0 ? "text-slate-100" : "text-slate-500"}`}>❖ {l}</div>)}
        </div>

        {phase === "fight" && !showBag && !showSwitch && (
          <>
            <div className="grid grid-cols-2 gap-2" id="dungeon-moves">
              {active.moveset.map((m) => {
                const locked = m.category === "speciale" && st.pEnergy < m.energy; const col = TYPES[m.type].color;
                return (
                  <button key={m.id} onClick={() => doMove(m)} disabled={busy || locked} className="text-left rounded-xl border p-2 disabled:opacity-40" style={{ background: col + "18", borderColor: col + "66" }}>
                    <div className="text-[11px] font-mono font-black text-slate-100 leading-tight">{m.emoji} {m.name}</div>
                    <div className="text-[8px] font-mono mt-0.5" style={{ color: col }}>{TYPES[m.type].emoji}{TYPES[m.type].name}{m.category === "speciale" ? (locked ? ` ⚡${st.pEnergy}/100` : " ⚡") : ""}</div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { playClick(); setShowSwitch(true); }} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 border border-emerald-700/40 text-emerald-600 font-mono font-black text-xs py-2 rounded-xl disabled:opacity-40"><Repeat className="w-4 h-4" /> Cambia</button>
              <button onClick={() => { playClick(); setShowBag(true); }} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 border border-amber-700/40 text-amber-400 font-mono font-black text-xs py-2 rounded-xl disabled:opacity-40"><Backpack className="w-4 h-4" /> Zaino ({bagItems.reduce((n, b) => n + b.quantity, 0)})</button>
              <button onClick={() => { playClick(); onClose(); }} disabled={busy} className="px-3 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2 rounded-xl disabled:opacity-40">Fuggi</button>
            </div>
          </>
        )}

        {phase === "fight" && showSwitch && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono text-slate-400 text-center">Cambia Reina (consuma il turno)</div>
            <div className="grid grid-cols-2 gap-2">
              {teamRef.current.map((f, i) => (
                <button key={i} disabled={busy || i === activeIdx || st.teamHp[i] <= 0} onClick={() => switchTo(i)} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 text-left disabled:opacity-40">
                  <CowVisual cow={f.visual} className="w-9 h-9" />
                  <div><div className="text-[10px] font-mono font-black text-slate-100">{TYPES[f.type].emoji} {f.name}</div><div className="text-[8px] font-mono text-slate-400">{st.teamHp[i] <= 0 ? "si ritira" : `${Math.round(st.teamHp[i])}/${f.maxHp} tenuta`}</div></div>
                </button>
              ))}
            </div>
            <button onClick={() => { playClick(); setShowSwitch(false); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-1.5 rounded-xl">Indietro</button>
          </div>
        )}

        {phase === "fight" && showBag && (
          <div className="space-y-1.5">
            {bagItems.length === 0 ? <p className="text-[10px] text-slate-500 text-center py-2">Zaino vuoto!</p> : bagItems.map((b) => {
              const meta = ITEM_LABEL[b.id]; const eff = BATTLE_ITEMS[b.id];
              return (
                <button key={b.id} onClick={() => useItem(b.id)} disabled={busy} className="w-full flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-2 text-left disabled:opacity-40">
                  <span className="text-xl">{meta?.emoji}</span>
                  <div className="flex-grow"><div className="text-[11px] font-mono font-black text-slate-100">{meta?.name}</div><div className="text-[9px] text-slate-400">{eff.kind === "heal" ? `Recupera ${eff.amount} tenuta` : eff.kind === "buff_atk" ? `ATK +${eff.amount}%` : eff.kind === "buff_def" ? `DIF +${eff.amount}%` : `Adrenalina +${eff.amount}`}</div></div>
                  <span className="text-[10px] font-mono text-amber-400">×{b.quantity}</span>
                </button>
              );
            })}
            <button onClick={() => { playClick(); setShowBag(false); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-1.5 rounded-xl">Chiudi</button>
          </div>
        )}

        {phase === "won" && (
          <div className="text-center space-y-2 py-1">
            <div className="text-lg font-mono font-black text-emerald-600">🏆 LEGA CONQUISTATA!</div>
            <div className="text-[11px] font-mono text-slate-300">Medaglia {dungeon.badgeEmoji} {dungeon.badgeName} · +{dungeon.rewardCoins} 🪙 · +{dungeon.rewardXp} XP · oggetti rari!</div>
            <button onClick={() => { playClick(); onClose(); }} className="w-full nav-active text-white font-mono font-black text-xs py-2.5 rounded-xl">Torna alla mappa</button>
          </div>
        )}
        {phase === "lost" && (
          <div className="text-center space-y-2 py-1">
            <div className="text-lg font-mono font-black text-rose-500">😔 La tua mandria si ritira</div>
            <div className="text-[11px] font-mono text-slate-300">La {dungeon.league} ti ha respinto. Rinforza la squadra e riprova!</div>
            <button onClick={() => { playClick(); onClose(); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-black text-xs py-2.5 rounded-xl">Torna alla mappa</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Targhetta HP/Adrenalina di un combattente nel dungeon. */
function Plate({ name, type, hp, max, pct, energy, atkB = 0, defB = 0, def = false, champion = false }: {
  name: string; type: keyof typeof TYPES; hp: number; max: number; pct: number; energy: number; atkB?: number; defB?: number; def?: boolean; champion?: boolean;
}) {
  const tm = TYPES[type];
  return (
    <div className={`bg-slate-950/85 border rounded-xl px-2.5 py-1.5 shadow-lg ${champion ? "border-amber-500" : "border-slate-700"}`} style={{ minWidth: 150 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono font-black text-slate-100 truncate">{champion ? "👑 " : ""}{name}</span>
        <span className="text-[8px] font-mono px-1 rounded" style={{ background: tm.color + "22", color: tm.color }}>{tm.emoji}{tm.name}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700 mt-1"><div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: pct > 50 ? "#10b981" : pct > 20 ? "#f59e0b" : "#ef4444" }} /></div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[8px] font-mono text-slate-400">{Math.round(hp)}/{max}</span>
        <div className="flex gap-1">{def && <span className="text-[7px]">🛡️</span>}{atkB > 0 && <span className="text-[7px] text-rose-500 font-mono">A+{atkB}</span>}{defB > 0 && <span className="text-[7px] text-blue-400 font-mono">D+{defB}</span>}</div>
      </div>
      <div className="h-1 rounded-full bg-slate-800 overflow-hidden mt-1"><div className="h-full bg-amber-400 transition-all" style={{ width: `${energy}%` }} /></div>
    </div>
  );
}
