import { useState, useRef } from "react";
import { motion } from "motion/react";
import { Backpack } from "lucide-react";
import { Vatsamon, BackpackItem } from "../types";
import { ARENAS, Arena, ArenaId, arenaBoss } from "../data/arenas";
import { BATTLE_ITEMS } from "../data/combat";
import { CowVisual } from "./CowVisual";

type Phase = "select" | "intro" | "fighting" | "ended";

interface Snap {
  pHp: number; pMax: number;
  oHp: number; oMax: number;
  energy: number; oEnergy: number;
  pDef: number; oDef: number;
  atkBuff: number; defBuff: number; // bonus da zaino/buff (in %)
  milk: number;
}

const ITEM_LABEL: Record<string, { name: string; emoji: string }> = {
  "item-potion-milk":    { name: "Secchio di Latte", emoji: "🥛" },
  "item-potion-fontina": { name: "Fetta di Fontina", emoji: "🧀" },
  "item-buff-genepy":    { name: "Genepy del Pastore", emoji: "🍵" },
  "item-buff-bell":      { name: "Campanaccio Fortunato", emoji: "🔔" },
  "item-energy-grappa":  { name: "Grappa alla Genziana", emoji: "🥃" },
};

/**
 * Arena a TURNI (le 4 Palestre). 4 mosse firma (Testata/Corno Protettivo/
 * Sorso di Latte/Incornata Suprema), barra Adrenalina per la speciale, buff
 * difesa, evasione, bonus d'arena e bonus permanenti delle medaglie.
 * Boss = vere Reines Epiche/Leggendarie scalate. Stato interamente locale.
 */
export function ArenaBattle({
  playerCow,
  trainerLevel,
  badges,
  backpack,
  onConsumeItem,
  onWin,
  playClick,
}: {
  playerCow: Vatsamon;
  trainerLevel: number;
  badges: ArenaId[];
  backpack: BackpackItem[];
  onConsumeItem: (id: string) => void;
  onWin: (arena: Arena, xp: number, coins: number, newBadge: boolean) => void;
  playClick: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("select");
  const [arena, setArena] = useState<Arena | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [busy, setBusy] = useState(false);
  const [pAnim, setPAnim] = useState(false);
  const [oAnim, setOAnim] = useState(false);
  const [showBag, setShowBag] = useState(false);

  const bossRef = useRef<Vatsamon | null>(null);
  const stRef = useRef<Snap>({ pHp: 0, pMax: 0, oHp: 0, oMax: 0, energy: 0, oEnergy: 0, pDef: 0, oDef: 0, atkBuff: 0, defBuff: 0, milk: 3 });
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const st = stRef.current;
  const boss = bossRef.current;
  const has = (id: ArenaId) => badges.includes(id);
  const pushLog = (lines: string[]) => setLog((prev) => [...lines.reverse(), ...prev].slice(0, 8));

  const start = (a: Arena) => {
    if (trainerLevel < a.requiredLevel) return;
    playClick();
    const b = arenaBoss(a, trainerLevel);
    bossRef.current = b;
    const pMax = 320 + playerCow.level * 18;
    const oMax = 300 + b.level * 22;
    stRef.current = {
      pHp: pMax, pMax,
      oHp: oMax, oMax,
      energy: a.id === "gran_paradiso" ? 40 : 20,
      oEnergy: 10,
      pDef: 0, oDef: 0,
      atkBuff: 0, defBuff: 0,
      milk: 3,
    };
    setArena(a);
    setLog([a.introMsg, `⚔️ ${playerCow.name} (CP ${playerCow.cp}) sfida ${b.name} (CP ${b.cp})`, "👉 È il tuo turno: scegli una mossa!"]);
    setWinner(null);
    setBusy(false);
    setShowBag(false);
    setPhase("intro");
    rerender();
  };

  const endBattle = (who: "player" | "opponent", a: Arena) => {
    setWinner(who);
    setPhase("ended");
    setBusy(false);
    if (who === "player") {
      const newBadge = !has(a.id);
      const xp = Math.round(500 * (has("gran_paradiso") ? 1.25 : 1));
      onWin(a, xp, 60, newBadge);
    }
  };

  const opponentTurn = (a: Arena) => {
    const s = stRef.current, b = bossRef.current!;
    const isSuper = s.oEnergy >= 100;
    let dmg = 13 + b.stats.strength * 0.15 + Math.random() * 8;
    let name = "Spallata Frontale", emoji = "💥";
    let kind: "attack" | "heal" | "defend" = "attack";

    if (isSuper) {
      dmg *= 2.3; name = "INCORNATA DIVINA"; emoji = "🔱";
    } else {
      const hpPct = s.oHp / s.oMax;
      if (hpPct < 0.38 && Math.random() > 0.45) { kind = "heal"; name = "Mungitura Salvavita"; emoji = "🍼"; }
      else if (Math.random() > 0.7) { kind = "defend"; name = "Posizione Arroccata"; emoji = "🛡️"; }
    }

    const lines: string[] = [];
    if (kind === "heal") {
      const heal = Math.floor(45 + b.stats.agility * 0.35);
      s.oHp = Math.min(s.oMax, s.oHp + heal);
      s.oEnergy = Math.min(100, s.oEnergy + 20);
      lines.push(`${emoji} ${b.name} usa ${name}: recupera +${heal} HP.`);
    } else if (kind === "defend") {
      s.oDef = 0.4;
      s.oEnergy = Math.min(100, s.oEnergy + 15);
      lines.push(`${emoji} ${b.name} usa ${name}: alza la difesa.`);
    } else {
      // evasione del giocatore
      const pEva = (a.id === "morgex" ? 0.20 : 0) + (has("morgex") ? 0.15 : 0);
      if (Math.random() < pEva) {
        lines.push(`💨 ${playerCow.name} schiva ${name}! Nessun danno.${has("morgex") ? " (Schivata Vigneto)" : ""}`);
      } else {
        const defFactor = 1 - Math.min(0.85, s.pDef + (a.id === "fenis" ? 0.25 : 0) + (has("fenis") ? 0.15 : 0) + s.defBuff / 100);
        const fin = Math.floor(dmg * defFactor);
        s.pHp = Math.max(0, s.pHp - fin);
        s.oEnergy = isSuper ? 0 : Math.min(100, s.oEnergy + 25);
        lines.push(`${emoji} ${b.name} usa ${name}: ${fin} danni.`);
        setPAnim(true); setTimeout(() => setPAnim(false), 320);
      }
    }
    pushLog(lines);
    rerender();
    if (s.pHp <= 0) { endBattle("opponent", a); return; }
    setBusy(false);
  };

  const playerMove = (id: "testata" | "corno" | "latte" | "incornata") => {
    if (busy || winner || phase !== "fighting" || !arena) return;
    const a = arena, s = stRef.current, b = bossRef.current!;

    let dmg = 0, isHeal = false, heal = 0, energyGain = 0, defGain = 0, desc = "";
    if (id === "testata") {
      dmg = Math.round(16 + playerCow.stats.strength * 0.18 + Math.random() * 6);
      energyGain = 18; desc = "sferra TESTATA D'ALTA QUOTA 💥";
    } else if (id === "corno") {
      dmg = Math.round(7 + playerCow.stats.strength * 0.08 + Math.random() * 4);
      energyGain = 12; defGain = 0.35; desc = "usa CORNO PROTETTIVO 🛡️ (+35% difesa)";
    } else if (id === "latte") {
      if (s.milk <= 0) { pushLog(["⚠️ Hai esaurito i Sorsi di Latte per questo scontro!"]); rerender(); return; }
      s.milk -= 1;
      isHeal = true;
      let base = Math.round(55 + playerCow.stats.agility * 0.4 + (a.id === "cogne" ? 30 : 0));
      if (has("cogne")) base = Math.round(base * 1.25);
      heal = base; energyGain = 20;
      desc = `beve un SORSO DI LATTE 🍼 (+${heal} HP)${has("cogne") ? " (Bonus Flora)" : ""}`;
    } else if (id === "incornata") {
      if (s.energy < 100) { pushLog(["⚡ Adrenalina non ancora carica! Usa attacchi base."]); rerender(); return; }
      dmg = Math.round((26 + playerCow.stats.strength * 0.25) * 2.3);
      energyGain = -100; desc = "sprigiona l'INCORNATA SUPREMA 🔱";
    }

    playClick();
    setBusy(true);
    const lines: string[] = [];
    if (isHeal) {
      s.pHp = Math.min(s.pMax, s.pHp + heal);
      lines.push(`🍀 ${playerCow.name} ${desc}.`);
    } else {
      const oppDefFactor = 1 - Math.min(0.68, s.oDef);
      const fin = Math.round(dmg * oppDefFactor * (1 + s.atkBuff / 100));
      s.oDef = 0; // consuma la difesa avversaria
      s.oHp = Math.max(0, s.oHp - fin);
      lines.push(`⚔️ ${playerCow.name} ${desc}: ${fin} danni!`);
      setOAnim(true); setTimeout(() => setOAnim(false), 320);
    }
    s.energy = id === "incornata" ? 0 : Math.min(100, s.energy + energyGain);
    s.pDef = Math.max(0, s.pDef + (defGain ? 0.35 : 0) - 0.05);
    pushLog(lines);
    rerender();

    if (s.oHp <= 0) {
      const newBadge = !has(a.id);
      pushLog([
        newBadge
          ? `🏆 VITTORIA! Ottieni la ${a.badgeEmoji} ${a.badgeName}! Bonus: ${a.bonusDesc}`
          : `🏆 VITTORIA! Difendi la ${a.badgeEmoji} ${a.badgeName}!`,
      ]);
      rerender();
      endBattle("player", a);
      return;
    }
    setTimeout(() => opponentTurn(a), 850);
  };

  const useItem = (itemId: string) => {
    if (busy || winner || phase !== "fighting" || !arena) return;
    const eff = BATTLE_ITEMS[itemId];
    const owned = backpack.find((b) => b.id === itemId);
    if (!eff || !owned || owned.quantity <= 0) return;
    const a = arena, s = stRef.current;
    const lbl = ITEM_LABEL[itemId]?.name || "Oggetto";
    playClick();
    setBusy(true);
    setShowBag(false);
    if (eff.kind === "heal") { s.pHp = Math.min(s.pMax, s.pHp + eff.amount); pushLog([`🎒 Usi ${lbl}: +${eff.amount} HP!`]); }
    else if (eff.kind === "buff_atk") { s.atkBuff = Math.min(100, s.atkBuff + eff.amount); pushLog([`🎒 Usi ${lbl}: attacco +${eff.amount}%!`]); }
    else if (eff.kind === "buff_def") { s.defBuff = Math.min(100, s.defBuff + eff.amount); pushLog([`🎒 Usi ${lbl}: difesa +${eff.amount}%!`]); }
    else if (eff.kind === "energy") { s.energy = Math.min(100, s.energy + eff.amount); pushLog([`🎒 Usi ${lbl}: Adrenalina +${eff.amount}!`]); }
    onConsumeItem(itemId);
    rerender();
    setTimeout(() => opponentTurn(a), 850);
  };

  // ---- RENDER ----

  if (phase === "select") {
    return (
      <div className="space-y-3" id="arena-select">
        <p className="text-xs text-slate-400 text-center">Scegli una Palestra. Vinci per ottenere la <b className="text-amber-300">medaglia</b> e il suo bonus permanente. Compagna: <b className="text-emerald-300">{playerCow.name}</b>.</p>
        <div className="grid gap-2">
          {ARENAS.map((a) => {
            const locked = trainerLevel < a.requiredLevel;
            const owned = has(a.id);
            return (
              <button
                key={a.id}
                onClick={() => start(a)}
                disabled={locked}
                className={`relative text-left rounded-2xl border p-3 bg-gradient-to-r ${a.bgGradient} transition-all overflow-hidden ${locked ? "opacity-50 cursor-not-allowed border-slate-800" : "border-slate-700 hover:brightness-125"}`}
              >
                <div className="flex items-center gap-3 relative">
                  <span className="text-3xl">{a.badgeEmoji}</span>
                  <div className="flex-grow">
                    <div className="text-sm font-mono font-black text-slate-100">{a.name}</div>
                    <div className="text-[10px] text-slate-300">{a.difficulty} · Lv richiesto {a.requiredLevel} · Boss CP ~{a.cp}</div>
                    <div className="text-[9px] text-amber-200/90 font-mono mt-0.5">🏅 {a.bonusDesc}</div>
                  </div>
                  {owned && <span className="text-[9px] font-mono font-black text-emerald-300 bg-emerald-950/60 border border-emerald-700 px-1.5 py-0.5 rounded">VINTA</span>}
                  {locked && <span className="text-[9px] font-mono font-black text-slate-400">🔒 Lv {a.requiredLevel}</span>}
                </div>
              </button>
            );
          })}
        </div>
        {badges.length > 0 && (
          <div className="text-center text-[10px] font-mono text-slate-400">Medaglie: {badges.map((id) => ARENAS.find((a) => a.id === id)?.badgeEmoji).join(" ")}</div>
        )}
      </div>
    );
  }

  if (!arena || !boss) return null;

  if (phase === "intro") {
    return (
      <div className="text-center space-y-4" id="arena-intro">
        <div className="text-5xl">{arena.badgeEmoji}</div>
        <div className="text-sm font-mono font-black text-slate-100">{arena.name}</div>
        <p className="text-xs text-slate-300 italic bg-slate-900/60 border border-slate-800 rounded-2xl p-3 leading-relaxed">{arena.introMsg}</p>
        <div className="flex items-center justify-center gap-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-3">
          <CowVisual cow={boss} className="w-16 h-16" />
          <div className="text-left">
            <div className="text-xs font-mono font-black text-rose-300">BOSS: {boss.name}</div>
            <div className="text-[10px] text-slate-400">{boss.breed} · Lv {boss.level} · CP {boss.cp}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { playClick(); setPhase("select"); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2.5 rounded-xl">Indietro</button>
          <button onClick={() => { playClick(); setPhase("fighting"); }} id="arena-start" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-xs py-2.5 rounded-xl border-b-4 border-rose-800">Entra in Arena! ⚔️</button>
        </div>
      </div>
    );
  }

  const pPct = Math.round((st.pHp / st.pMax) * 100);
  const oPct = Math.round((st.oHp / st.oMax) * 100);
  const superReady = st.energy >= 100;
  const bagItems = backpack.filter((b) => BATTLE_ITEMS[b.id] && b.quantity > 0);

  return (
    <div className={`space-y-4 rounded-3xl bg-gradient-to-b ${arena.bgGradient} p-3 -m-1`} id="arena-arena">
      {/* combattenti */}
      <div className="grid grid-cols-2 gap-3">
        {[{ cow: playerCow, hp: st.pHp, max: st.pMax, pct: pPct, anim: pAnim, mine: true },
          { cow: boss, hp: st.oHp, max: st.oMax, pct: oPct, anim: oAnim, mine: false }].map((c, i) => (
          <div key={i} className={`bg-slate-950/70 border rounded-2xl p-3 text-center space-y-2 ${c.mine ? "border-emerald-700/40" : "border-rose-700/40"}`}>
            <div className="text-[10px] font-mono font-bold text-slate-400 truncate">{c.mine ? "La tua Reina" : `Boss · ${arena.badgeEmoji}`}</div>
            <motion.div animate={c.anim ? { x: [0, -6, 6, -4, 0] } : {}} transition={{ duration: 0.32 }} className="flex justify-center">
              <CowVisual cow={c.cow} className="w-20 h-20" />
            </motion.div>
            <div className="text-xs font-mono font-black text-slate-100 truncate">{c.cow.name}</div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div className={`h-full transition-all duration-300 ${c.pct > 50 ? "bg-emerald-500" : c.pct > 20 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${c.pct}%` }} />
            </div>
            <div className="text-[9px] font-mono text-slate-400">{c.hp}/{c.max} HP</div>
          </div>
        ))}
      </div>

      {/* barra adrenalina (speciale) */}
      <div className="bg-slate-950/70 border border-slate-850 rounded-xl px-3 py-2">
        <div className="flex justify-between text-[9px] font-mono mb-1">
          <span className="text-slate-400 uppercase">⚡ Adrenalina</span>
          <span className={superReady ? "text-sky-300 font-black animate-pulse" : "text-slate-500"}>{superReady ? "SUPREMA PRONTA!" : `${st.energy}%`}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className={`h-full transition-all ${superReady ? "bg-sky-400" : "bg-sky-600"}`} style={{ width: `${st.energy}%` }} />
        </div>
      </div>

      {/* log */}
      <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-3 h-[80px] overflow-y-auto no-scrollbar space-y-1">
        {log.map((l, i) => (
          <div key={i} className={`text-[10px] font-mono leading-snug ${i === 0 ? "text-slate-100" : "text-slate-500"}`}>❖ {l}</div>
        ))}
      </div>

      {/* buff attivi dallo zaino */}
      {(st.atkBuff > 0 || st.defBuff > 0) && (
        <div className="flex justify-center gap-2 -mt-1">
          {st.atkBuff > 0 && <span className="text-[8px] font-mono bg-rose-950 text-rose-400 px-1.5 py-0.5 rounded">⚔️ ATK +{st.atkBuff}%</span>}
          {st.defBuff > 0 && <span className="text-[8px] font-mono bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded">🛡️ DEF +{st.defBuff}%</span>}
        </div>
      )}

      {/* mosse / zaino / esito */}
      {phase === "fighting" && !showBag && (
        <>
          <div className="grid grid-cols-2 gap-2" id="arena-moves">
            <button onClick={() => playerMove("testata")} disabled={busy} className="text-left rounded-xl border p-2.5 bg-rose-950/40 border-rose-800 hover:bg-rose-900/50 disabled:opacity-40">
              <div className="text-xs font-mono font-black text-slate-100">💥 Testata</div>
              <div className="text-[8.5px] text-slate-400">Danno medio · carica Adrenalina</div>
            </button>
            <button onClick={() => playerMove("corno")} disabled={busy} className="text-left rounded-xl border p-2.5 bg-blue-950/40 border-blue-800 hover:bg-blue-900/50 disabled:opacity-40">
              <div className="text-xs font-mono font-black text-slate-100">🛡️ Corno Protettivo</div>
              <div className="text-[8.5px] text-slate-400">+35% difesa, danno lieve</div>
            </button>
            <button onClick={() => playerMove("latte")} disabled={busy || st.milk <= 0} className="text-left rounded-xl border p-2.5 bg-emerald-950/40 border-emerald-800 hover:bg-emerald-900/50 disabled:opacity-40">
              <div className="text-xs font-mono font-black text-slate-100">🍼 Sorso di Latte <span className="text-[8px] text-emerald-300">x{st.milk}</span></div>
              <div className="text-[8.5px] text-slate-400">Cura HP (usi limitati)</div>
            </button>
            <button onClick={() => playerMove("incornata")} disabled={busy || !superReady} className={`text-left rounded-xl border p-2.5 disabled:opacity-40 ${superReady ? "bg-amber-900/60 border-amber-500 animate-pulse" : "bg-amber-950/40 border-amber-800"}`}>
              <div className="text-xs font-mono font-black text-slate-100">🔱 Incornata Suprema</div>
              <div className="text-[8.5px] text-slate-400">Devastante · serve Adrenalina</div>
            </button>
          </div>
          <button onClick={() => { playClick(); setShowBag(true); }} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-slate-950/70 border border-amber-700/40 text-amber-400 font-mono font-black text-xs py-2.5 rounded-xl disabled:opacity-40">
            <Backpack className="w-4 h-4" /> Zaino ({bagItems.reduce((n, b) => n + b.quantity, 0)})
          </button>
        </>
      )}

      {phase === "fighting" && showBag && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-slate-400 text-center">Usa un oggetto (consuma il turno)</div>
          {bagItems.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-3">Zaino da battaglia vuoto. Rifornisciti alla Casera!</p>
          ) : bagItems.map((b) => {
            const meta = ITEM_LABEL[b.id]; const eff = BATTLE_ITEMS[b.id];
            return (
              <button key={b.id} onClick={() => useItem(b.id)} disabled={busy} className="w-full flex items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-left disabled:opacity-40">
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

      {phase === "ended" && (
        <div className="text-center space-y-3">
          <div className={`text-lg font-mono font-black ${winner === "player" ? "text-emerald-400" : "text-rose-400"}`}>
            {winner === "player" ? `🏆 Hai conquistato la ${arena.badgeEmoji} ${arena.badgeName}!` : "💀 Sconfitta in arena"}
          </div>
          {winner === "player" && <div className="text-[11px] font-mono text-emerald-300">Bonus medaglia: {arena.bonusDesc}</div>}
          <div className="flex gap-2">
            <button onClick={() => start(arena)} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-xs py-2.5 rounded-xl border-b-4 border-rose-800">Riprova</button>
            <button onClick={() => { playClick(); setPhase("select"); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2.5 rounded-xl">Altra arena</button>
          </div>
        </div>
      )}
    </div>
  );
}
