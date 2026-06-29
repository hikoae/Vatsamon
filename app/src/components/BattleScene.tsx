import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Backpack, X } from "lucide-react";
import { Vatsamon, BackpackItem } from "../types";
import { CowVisual } from "./CowVisual";
import {
  Fighter,
  buildPlayerFighter,
  buildOpponentFighter,
  buildScaledBoss,
  computeDamage,
  pickOpponentMove,
} from "../lib/battle";
import { BattleMove, TYPES, effectivenessLabel, BATTLE_ITEMS } from "../data/combat";
import { MapBattle } from "../data/mapBattles";
import { arenaBoss } from "../data/arenas";

type Phase = "intro" | "fight" | "end";
interface Snap {
  pHp: number; oHp: number; pMax: number; oMax: number;
  pEnergy: number; oEnergy: number;
  pAtkBuff: number; pDefBuff: number; oAtkBuff: number; oDefBuff: number;
  pDef: boolean; oDef: boolean;
}
const ITEM_LABEL: Record<string, { name: string; emoji: string }> = {
  "item-potion-milk": { name: "Secchio di Latte", emoji: "🥛" },
  "item-potion-fontina": { name: "Fetta di Fontina", emoji: "🧀" },
  "item-buff-genepy": { name: "Genepy del Pastore", emoji: "🍵" },
  "item-buff-bell": { name: "Campanaccio Fortunato", emoji: "🔔" },
  "item-energy-grappa": { name: "Grappa alla Genziana", emoji: "🥃" },
};
// Emoji-particelle per tipo (effetto d'impatto).
const TYPE_FX: Record<string, string[]> = {
  corna: ["💥", "💢", "🐂"],
  roccia: ["🪨", "🌑", "💢"],
  latte: ["💧", "🥛", "✨"],
  prato: ["🍃", "🌿", "🍀"],
  tempesta: ["⚡", "🌪️", "💨"],
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function BattleScene({
  battle,
  playerCows,
  initialCowId,
  trainerLevel,
  backpack,
  onConsumeItem,
  onResult,
  onClose,
  playClick,
}: {
  battle: MapBattle;
  playerCows: Vatsamon[];
  initialCowId?: string;
  trainerLevel: number;
  backpack: BackpackItem[];
  onConsumeItem: (id: string) => void;
  onResult: (won: boolean) => void;
  onClose: () => void;
  playClick: () => void;
}) {
  const sorted = [...playerCows].sort((a, b) => b.cp - a.cp);
  const [cowId, setCowId] = useState(initialCowId || sorted[0]?.id);
  const playerCow = playerCows.find((c) => c.id === cowId) || sorted[0];

  const [phase, setPhase] = useState<Phase>("intro");
  const [log, setLog] = useState<string[]>([]);
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [busy, setBusy] = useState(false);
  const [showBag, setShowBag] = useState(false);

  // animazioni
  const [lunge, setLunge] = useState<"p" | "o" | null>(null);
  const [hit, setHit] = useState<"p" | "o" | null>(null);
  const [ko, setKo] = useState<"p" | "o" | null>(null);
  const [shake, setShake] = useState(false);
  const [fx, setFx] = useState<{ side: "p" | "o"; parts: string[]; id: number } | null>(null);
  const [floatTxt, setFloatTxt] = useState<{ side: "p" | "o"; text: string; color: string; id: number } | null>(null);
  const fxId = useRef(0);

  const playerRef = useRef<Fighter | null>(null);
  const oppRef = useRef<Fighter | null>(null);
  const stRef = useRef<Snap>({ pHp: 0, oHp: 0, pMax: 0, oMax: 0, pEnergy: 0, oEnergy: 0, pAtkBuff: 0, pDefBuff: 0, oAtkBuff: 0, oDefBuff: 0, pDef: false, oDef: false });
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const st = stRef.current;
  const player = playerRef.current;
  const opp = oppRef.current;
  const pushLog = (lines: string[]) => setLog((prev) => [...[...lines].reverse(), ...prev].slice(0, 6));
  const cap = (n: number) => Math.max(0, Math.min(100, n));

  // Costruisce l'avversario. Per le ARENE il boss è scalato sulla Reina scelta
  // (rubber-band) col tipo tematico dell'arena → sfida sempre giusta.
  const buildOpp = (ref: Fighter): Fighter => {
    if (battle.kind === "pastore" && battle.pastore) return buildOpponentFighter(battle.pastore);
    const arena = battle.arena!;
    const bossCow = arenaBoss(arena, trainerLevel);
    return buildScaledBoss(ref, bossCow, arena.bossType, arena.powerFactor, bossCow.rarity);
  };

  const begin = () => {
    playClick();
    const pf = buildPlayerFighter(playerCow);
    const of = buildOpp(pf);
    playerRef.current = pf;
    oppRef.current = of;
    stRef.current = { pHp: pf.maxHp, oHp: of.maxHp, pMax: pf.maxHp, oMax: of.maxHp, pEnergy: 0, oEnergy: 0, pAtkBuff: 0, pDefBuff: 0, oAtkBuff: 0, oDefBuff: 0, pDef: false, oDef: false };
    setLog([`${battle.emoji} ${battle.name} ti sfida con ${of.name}!`]);
    setWinner(null); setKo(null); setShowBag(false);
    setPhase("fight"); rerender();
  };

  const spawnFx = (side: "p" | "o", type: string) => {
    fxId.current += 1;
    setFx({ side, parts: TYPE_FX[type] || ["💥"], id: fxId.current });
  };
  const spawnFloat = (side: "p" | "o", text: string, color: string) => {
    fxId.current += 1;
    setFloatTxt({ side, text, color, id: fxId.current });
  };

  // Applica una mossa alla logica (mutando stRef), ritorna info per l'animazione.
  const applyMove = (side: "p" | "o", move: BattleMove) => {
    const A = side === "p" ? player! : opp!;
    const D = side === "p" ? opp! : player!;
    const s = stRef.current;
    if (move.category === "attacco" || move.category === "speciale") {
      const defending = side === "p" ? s.oDef : s.pDef;
      const atkBuff = side === "p" ? s.pAtkBuff : s.oAtkBuff;
      const defBuff = side === "p" ? s.oDefBuff : s.pDefBuff;
      const res = computeDamage(A, D, move, defending, atkBuff, defBuff);
      if (side === "p") s.oDef = false; else s.pDef = false;
      if (move.category === "speciale") { if (side === "p") s.pEnergy = 0; else s.oEnergy = 0; }
      else { if (side === "p") s.pEnergy = cap(s.pEnergy + move.energy); else s.oEnergy = cap(s.oEnergy + move.energy); }
      if (!res.missed) { if (side === "p") s.oHp = Math.max(0, s.oHp - res.dmg); else s.pHp = Math.max(0, s.pHp - res.dmg); }
      return { kind: "atk" as const, ...res, special: move.category === "speciale", name: move.name, type: move.type, attacker: A.name };
    }
    if (move.category === "difesa") {
      if (side === "p") { s.pDef = true; s.pEnergy = cap(s.pEnergy + move.energy); } else { s.oDef = true; s.oEnergy = cap(s.oEnergy + move.energy); }
      return { kind: "def" as const, name: move.name, attacker: A.name };
    }
    if (move.category === "cura") {
      const heal = move.amount || 60;
      if (side === "p") { s.pHp = Math.min(s.pMax, s.pHp + heal); s.pEnergy = cap(s.pEnergy + move.energy); }
      else { s.oHp = Math.min(s.oMax, s.oHp + heal); s.oEnergy = cap(s.oEnergy + move.energy); }
      return { kind: "heal" as const, heal, name: move.name, attacker: A.name };
    }
    const amt = move.amount || 30;
    if (move.buffStat === "atk") { if (side === "p") s.pAtkBuff = Math.min(100, s.pAtkBuff + amt); else s.oAtkBuff = Math.min(100, s.oAtkBuff + amt); }
    else { if (side === "p") s.pDefBuff = Math.min(100, s.pDefBuff + amt); else s.oDefBuff = Math.min(100, s.oDefBuff + amt); }
    if (side === "p") s.pEnergy = cap(s.pEnergy + move.energy); else s.oEnergy = cap(s.oEnergy + move.energy);
    return { kind: "buff" as const, name: move.name, attacker: A.name };
  };

  const performTurn = async (side: "p" | "o", move: BattleMove) => {
    setLunge(side); await wait(170);
    const r = applyMove(side, move);
    rerender();
    setLunge(null);
    const tgt: "p" | "o" = side === "p" ? "o" : "p";
    if (r.kind === "atk") {
      if (r.missed) pushLog([`${r.attacker} usa ${r.name}… ma manca!`]);
      else {
        pushLog([`${r.attacker} usa ${r.name}: ${r.dmg} di spinta${r.crit ? " (spinta decisa!)" : ""}`]);
        setHit(tgt); spawnFx(tgt, r.type); spawnFloat(tgt, `-${r.dmg}${r.crit ? "!" : ""}`, "#fb7185");
        if (r.crit || r.special) { setShake(true); }
        const eff = effectivenessLabel(r.mult); if (eff) pushLog([eff]);
        await wait(150); setHit(null); setShake(false);
      }
    } else if (r.kind === "heal") {
      pushLog([`${r.attacker} usa ${r.name}: +${r.heal} di tenuta`]);
      spawnFloat(side, `+${r.heal}`, "#34d399");
    } else {
      pushLog([`${r.attacker} usa ${r.name}!`]);
    }
    await wait(430);
    setFx(null); setFloatTxt(null);
  };

  const endBattle = (who: "player" | "opponent") => {
    setKo(who === "player" ? "o" : "p");
    setWinner(who); setPhase("end"); setBusy(false);
    onResult(who === "player");
  };

  const doPlayerMove = async (move: BattleMove) => {
    if (busy || phase !== "fight" || winner) return;
    if (move.category === "speciale" && st.pEnergy < move.energy) return;
    playClick(); setBusy(true); setShowBag(false);
    await performTurn("p", move);
    if (stRef.current.oHp <= 0) { endBattle("player"); return; }
    await wait(280);
    await performTurn("o", pickOpponentMove(opp!, stRef.current.oHp / st.oMax, stRef.current.oEnergy));
    if (stRef.current.pHp <= 0) { endBattle("opponent"); return; }
    setBusy(false);
  };

  const useItem = async (id: string) => {
    if (busy || phase !== "fight" || winner) return;
    const eff = BATTLE_ITEMS[id];
    const owned = backpack.find((b) => b.id === id);
    if (!eff || !owned || owned.quantity <= 0) return;
    playClick(); setBusy(true); setShowBag(false);
    const s = stRef.current; const lbl = ITEM_LABEL[id]?.name || "Oggetto";
    if (eff.kind === "heal") { s.pHp = Math.min(s.pMax, s.pHp + eff.amount); spawnFloat("p", `+${eff.amount}`, "#34d399"); pushLog([`🎒 ${lbl}: +${eff.amount} di tenuta`]); }
    else if (eff.kind === "buff_atk") { s.pAtkBuff = Math.min(100, s.pAtkBuff + eff.amount); pushLog([`🎒 ${lbl}: attacco +${eff.amount}%`]); }
    else if (eff.kind === "buff_def") { s.pDefBuff = Math.min(100, s.pDefBuff + eff.amount); pushLog([`🎒 ${lbl}: difesa +${eff.amount}%`]); }
    else { s.pEnergy = cap(s.pEnergy + eff.amount); pushLog([`🎒 ${lbl}: Adrenalina +${eff.amount}`]); }
    onConsumeItem(id); rerender();
    await wait(650);
    await performTurn("o", pickOpponentMove(opp!, stRef.current.oHp / st.oMax, stRef.current.oEnergy));
    if (stRef.current.pHp <= 0) { endBattle("opponent"); return; }
    setBusy(false);
  };

  const bagItems = backpack.filter((b) => BATTLE_ITEMS[b.id] && b.quantity > 0);

  // ===== RENDER =====
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="battle-scene">
      {/* sfondo alpeggio */}
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg,#bae6fd 0%,#e0f2fe 30%,#dcfce7 62%,#bbf7d0 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[42%]" style={{ background: "radial-gradient(120% 80% at 50% 100%, #86efac 0%, #4ade80 55%, #16a34a 100%)" }} />

      {/* header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/70 backdrop-blur border-b border-slate-800">
        <span className="text-xs font-mono font-black text-slate-100">{battle.emoji} {battle.name}</span>
        <button onClick={() => { playClick(); onClose(); }} className="text-slate-300 bg-slate-900/70 rounded-full p-1.5"><X size={16} /></button>
      </div>

      {phase === "intro" && (
        <IntroPanel battle={battle} playerCows={sorted} cowId={cowId} setCowId={setCowId} onStart={begin} onClose={onClose} playClick={playClick} trainerLevel={trainerLevel} />
      )}

      {phase !== "intro" && player && opp && (
        <motion.div animate={shake ? { x: [0, -10, 9, -7, 5, 0], y: [0, 6, -5, 3, 0] } : {}} transition={{ duration: 0.4 }} className="relative flex-1 overflow-hidden">
          {/* AVVERSARIO (in alto) */}
          <Combatant pos="top" fighter={opp} hp={st.oHp} max={st.oMax} energy={st.oEnergy} def={st.oDef} atkB={st.oAtkBuff} defB={st.oDefBuff}
            lunge={lunge === "o"} hit={hit === "o"} ko={ko === "o"} fx={fx?.side === "o" ? fx : null} floatTxt={floatTxt?.side === "o" ? floatTxt : null} />
          {/* GIOCATORE (in basso) */}
          <Combatant pos="bottom" fighter={player} hp={st.pHp} max={st.pMax} energy={st.pEnergy} def={st.pDef} atkB={st.pAtkBuff} defB={st.pDefBuff}
            lunge={lunge === "p"} hit={hit === "p"} ko={ko === "p"} fx={fx?.side === "p" ? fx : null} floatTxt={floatTxt?.side === "p" ? floatTxt : null} />
        </motion.div>
      )}

      {/* PANNELLO COMANDI / LOG / ESITO */}
      {phase !== "intro" && player && (
        <div className="bg-slate-950/85 backdrop-blur border-t border-slate-800 p-3 space-y-2">
          {/* log */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 h-[52px] overflow-y-auto no-scrollbar">
            {log.length === 0 ? <p className="text-[10px] font-mono text-slate-500">Scegli una mossa…</p> :
              log.map((l, i) => <div key={i} className={`text-[10px] font-mono leading-snug ${i === 0 ? "text-slate-100" : "text-slate-500"}`}>❖ {l}</div>)}
          </div>

          {phase === "fight" && !showBag && (
            <>
              <div className="grid grid-cols-2 gap-2" id="battle-moves">
                {player.moveset.map((m) => {
                  const locked = m.category === "speciale" && st.pEnergy < m.energy;
                  const col = TYPES[m.type].color;
                  return (
                    <button key={m.id} onClick={() => doPlayerMove(m)} disabled={busy || locked} title={m.desc}
                      className="text-left rounded-xl border p-2 transition-all disabled:opacity-40"
                      style={{ background: col + "18", borderColor: col + "66" }}>
                      <div className="text-[11px] font-mono font-black text-slate-100 leading-tight">{m.emoji} {m.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[8px] font-mono px-1 rounded" style={{ background: col + "22", color: col }}>{TYPES[m.type].emoji}{TYPES[m.type].name}</span>
                        {m.category === "speciale" && <span className="text-[8px] font-mono text-amber-400">{locked ? `⚡${st.pEnergy}/100` : "SPECIALE ⚡"}</span>}
                        {m.category === "cura" && <span className="text-[8px] font-mono text-emerald-500">CURA</span>}
                        {m.category === "difesa" && <span className="text-[8px] font-mono text-blue-400">DIFESA</span>}
                        {m.category === "buff" && <span className="text-[8px] font-mono text-purple-400">BUFF</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { playClick(); setShowBag(true); }} disabled={busy} className="flex-1 flex items-center justify-center gap-2 bg-slate-900 border border-amber-700/40 text-amber-400 font-mono font-black text-xs py-2 rounded-xl disabled:opacity-40">
                  <Backpack className="w-4 h-4" /> Zaino ({bagItems.reduce((n, b) => n + b.quantity, 0)})
                </button>
                <button onClick={() => { playClick(); onClose(); }} disabled={busy} className="px-4 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2 rounded-xl disabled:opacity-40">Fuggi</button>
              </div>
            </>
          )}

          {phase === "fight" && showBag && (
            <div className="space-y-1.5">
              {bagItems.length === 0 ? <p className="text-[10px] text-slate-500 text-center py-2">Zaino vuoto. Rifornisciti alla Casera!</p> :
                bagItems.map((b) => {
                  const meta = ITEM_LABEL[b.id]; const eff = BATTLE_ITEMS[b.id];
                  return (
                    <button key={b.id} onClick={() => useItem(b.id)} disabled={busy} className="w-full flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-2 text-left disabled:opacity-40">
                      <span className="text-xl">{meta?.emoji}</span>
                      <div className="flex-grow">
                        <div className="text-[11px] font-mono font-black text-slate-100">{meta?.name}</div>
                        <div className="text-[9px] text-slate-400">{eff.kind === "heal" ? `Recupera ${eff.amount} tenuta` : eff.kind === "buff_atk" ? `Attacco +${eff.amount}%` : eff.kind === "buff_def" ? `Difesa +${eff.amount}%` : `Adrenalina +${eff.amount}`}</div>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400">×{b.quantity}</span>
                    </button>
                  );
                })}
              <button onClick={() => { playClick(); setShowBag(false); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-1.5 rounded-xl">Chiudi zaino</button>
            </div>
          )}

          {phase === "end" && (
            <div className="text-center space-y-2 py-1">
              <div className={`text-lg font-mono font-black ${winner === "player" ? "text-emerald-600" : "text-rose-500"}`}>
                {winner === "player" ? "🏆 La rivale cede e si ritira!" : "😔 La tua Reina si ritira"}
              </div>
              <button onClick={() => { playClick(); onClose(); }} className="w-full nav-active text-white font-mono font-black text-xs py-2.5 rounded-xl">Torna alla mappa</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Schermata introduttiva: avversario + scelta della Reina + start. */
function IntroPanel({ battle, playerCows, cowId, setCowId, onStart, onClose, playClick, trainerLevel }: {
  battle: MapBattle; playerCows: Vatsamon[]; cowId: string; setCowId: (id: string) => void;
  onStart: () => void; onClose: () => void; playClick: () => void; trainerLevel: number;
}) {
  const locked = trainerLevel < battle.reqLevel;
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-5 gap-4 text-center">
      <div className="text-6xl drop-shadow">{battle.emoji}</div>
      <div>
        <div className="text-base font-mono font-black text-slate-100">{battle.name}</div>
        <div className="text-[11px] text-slate-300">{battle.subtitle}</div>
        {battle.pastore && <p className="text-[11px] text-slate-200 italic mt-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 max-w-xs">"{battle.pastore.dialogueIntro}"</p>}
        {battle.kind === "arena" && battle.arena && (
          <p className="text-[11px] font-mono mt-2">
            Boss di tipo{" "}
            <span className="font-black px-1 rounded" style={{ background: TYPES[battle.arena.bossType].color + "22", color: TYPES[battle.arena.bossType].color }}>
              {TYPES[battle.arena.bossType].emoji} {TYPES[battle.arena.bossType].name}
            </span>{" "}
            — porta una Reina del tipo che lo batte!
          </p>
        )}
      </div>
      {locked ? (
        <div className="text-rose-500 font-mono font-bold text-sm">🔒 Richiede livello {battle.reqLevel}</div>
      ) : (
        <>
          <div className="w-full max-w-sm">
            <div className="text-[10px] font-mono text-slate-400 mb-1">Scegli la tua Reina:</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {playerCows.map((c) => (
                <button key={c.id} onClick={() => { playClick(); setCowId(c.id); }}
                  className={`flex-shrink-0 rounded-xl border-2 p-1.5 ${cowId === c.id ? "border-rose-500 bg-rose-950/60" : "border-slate-700 bg-slate-900/70"}`}>
                  <CowVisual cow={c} className="w-12 h-12" />
                  <div className="text-[8px] font-mono text-slate-200 truncate w-12">{c.name}</div>
                  <div className="text-[8px] font-mono text-amber-400">CP{c.cp}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 w-full max-w-sm">
            <button onClick={() => { playClick(); onClose(); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-3 rounded-xl">Indietro</button>
            <button onClick={onStart} id="battle-start" className="flex-1 nav-active text-white font-mono font-black text-xs py-3 rounded-xl">Combatti! ⚔️</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Un combattente sul campo: foto, targhetta HP/Adrenalina, animazioni. */
function Combatant({ pos, fighter, hp, max, energy, def, atkB, defB, lunge, hit, ko, fx, floatTxt }: {
  pos: "top" | "bottom"; fighter: Fighter; hp: number; max: number; energy: number; def: boolean; atkB: number; defB: number;
  lunge: boolean; hit: boolean; ko: boolean;
  fx: { parts: string[]; id: number } | null;
  floatTxt: { text: string; color: string; id: number } | null;
}) {
  const pct = Math.round((hp / max) * 100);
  const top = pos === "top";
  const tm = TYPES[fighter.type];
  // Scatto d'attacco VERSO l'avversaria: il giocatore (in basso a sx) scatta in
  // alto-destra; l'avversaria (in alto a dx) scatta in basso-sinistra.
  const lungeX = top ? -40 : 40, lungeY = top ? 40 : -40;
  return (
    <div className={`absolute ${top ? "top-3" : "bottom-3"} ${top ? "right-3" : "left-3"} flex ${top ? "flex-col items-end" : "flex-col items-start"} gap-1`} style={{ width: "62%" }}>
      {/* targhetta */}
      <div className={`bg-slate-950/85 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-lg ${top ? "self-start" : "self-end"}`} style={{ minWidth: 150 }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-black text-slate-100 truncate">{fighter.name}</span>
          <span className="text-[8px] font-mono px-1 rounded" style={{ background: tm.color + "22", color: tm.color }}>{tm.emoji}{tm.name}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700 mt-1">
          <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: pct > 50 ? "#10b981" : pct > 20 ? "#f59e0b" : "#ef4444" }} />
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[8px] font-mono text-slate-400">{hp}/{max}</span>
          <div className="flex gap-1">
            {def && <span className="text-[7px]">🛡️</span>}
            {atkB > 0 && <span className="text-[7px] text-rose-500 font-mono">A+{atkB}</span>}
            {defB > 0 && <span className="text-[7px] text-blue-400 font-mono">D+{defB}</span>}
          </div>
        </div>
        {/* adrenalina */}
        <div className="h-1 rounded-full bg-slate-800 overflow-hidden mt-1"><div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${energy}%` }} /></div>
      </div>

      {/* la Reina */}
      <motion.div
        className="relative"
        animate={ko ? { rotate: top ? 90 : -90, y: 40, opacity: 0 } : lunge ? { x: lungeX, y: lungeY } : hit ? { x: [0, -8, 8, -6, 0] } : { x: 0, y: 0 }}
        transition={ko ? { duration: 0.6 } : lunge ? { duration: 0.18 } : { duration: 0.25 }}
      >
        <div className={`rounded-2xl overflow-hidden border-2 shadow-2xl ${top ? "border-rose-400/60" : "border-emerald-400/70"}`} style={{ filter: hit ? "brightness(2) saturate(0.3)" : "none", transition: "filter 0.12s" }}>
          <CowVisual cow={fighter.visual} className={top ? "w-24 h-24" : "w-28 h-28"} />
        </div>
        {/* ombra a terra */}
        <div className="mx-auto mt-1 rounded-[100%] bg-black/20 blur-[2px]" style={{ width: top ? 70 : 84, height: 10 }} />

        {/* effetti d'impatto */}
        <AnimatePresence>
          {fx && (
            <div key={fx.id} className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {fx.parts.map((e, i) => (
                <motion.span key={i} initial={{ opacity: 1, scale: 0.4, x: 0, y: 0 }}
                  animate={{ opacity: 0, scale: 1.6, x: (i - 1) * 34, y: -20 - i * 12 }}
                  transition={{ duration: 0.55 }} className="absolute text-2xl">{e}</motion.span>
              ))}
            </div>
          )}
        </AnimatePresence>
        {/* numero danno/cura */}
        <AnimatePresence>
          {floatTxt && (
            <motion.div key={floatTxt.id} initial={{ opacity: 1, y: 0, scale: 0.8 }} animate={{ opacity: 0, y: -46, scale: 1.3 }} transition={{ duration: 0.7 }}
              className="absolute left-1/2 top-2 -translate-x-1/2 font-mono font-black text-xl pointer-events-none" style={{ color: floatTxt.color, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
              {floatTxt.text}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
