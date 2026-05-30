import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Swords, Shield, Zap } from "lucide-react";
import type { Vazzamon } from "../data/types";
import { useGame } from "../store/game";
import { soundEngine } from "../lib/audio";
import { Portrait } from "../components/Portrait";
import { stelle } from "../lib/rarity";

type Status = "select" | "intro" | "active" | "ended";

export function BattleScreen({ onToast }: { onToast: (m: string) => void }) {
  const { collezione, trainer, addXp, addCoins, sound } = useGame();

  const [status, setStatus] = useState<Status>("select");
  const [mine, setMine] = useState<Vazzamon | null>(null);
  const [opp, setOpp] = useState<Vazzamon | null>(null);
  const [pHp, setPHp] = useState(100); const [pMax, setPMax] = useState(100);
  const [oHp, setOHp] = useState(100); const [oMax, setOMax] = useState(100);
  const [energy, setEnergy] = useState(0);
  const [oEnergy, setOEnergy] = useState(0);
  const [dodge, setDodge] = useState(false);
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [pAnim, setPAnim] = useState(false);
  const [oAnim, setOAnim] = useState(false);
  const loop = useRef<ReturnType<typeof setInterval> | null>(null);
  const dodgeRef = useRef(false);

  const play = (f: () => void) => { if (sound) f(); };
  const push = (m: string) => setLog((l) => [...l.slice(-5), m]);

  function avvia(c: Vazzamon) {
    // avversario scalato: una bovina forte dalla collezione o un boss
    const pool = collezione.filter((x) => x.id !== c.id);
    const base = pool.sort((a, b) => b.cp - a.cp)[0] ?? c;
    const mult = 1 + trainer.level * 0.08;
    const o: Vazzamon = { ...base, id: "boss", nome: base.nome + " Boss", cp: Math.round(base.cp * mult) };
    const phm = 280 + c.level * 12, ohm = 260 + o.level * 18;
    setMine(c); setOpp(o);
    setPHp(phm); setPMax(phm); setOHp(ohm); setOMax(ohm);
    setEnergy(0); setOEnergy(0); setWinner(null);
    setLog([`🥊 Arena Bataille de Reines d'Aosta!`, `⚔️ ${c.nome} (CP ${c.cp}) vs ${o.nome} (CP ${o.cp})`, `👉 Tocca per colpire, 🛡️ schiva quando carica!`]);
    setStatus("intro");
  }

  // AI loop
  useEffect(() => {
    if (status !== "active") return;
    loop.current = setInterval(() => {
      setOpp((o) => o);
      setOHp((curO) => curO); // noop to keep deps simple
      const dmgBase = Math.floor(12 + (opp?.stats.corna ?? 60) * 0.15 + Math.random() * 8);
      let superMove = false;
      setOEnergy((e) => { if (e >= 100) { superMove = true; return 0; } return Math.min(100, e + 22); });
      const dmg = superMove ? Math.floor(dmgBase * 2.2) : dmgBase;
      const final = dodgeRef.current ? Math.floor(dmg * 0.15) : dmg;
      play(() => soundEngine.playHeadbutt());
      setOAnim(true); setTimeout(() => setOAnim(false), 250);
      push(dodgeRef.current
        ? `🛡️ Hai schivato ${superMove ? "l'INCORNATA" : "l'attacco"}! Solo ${final} danni.`
        : `💥 ${opp?.nome} ${superMove ? "INCORNATA DEVASTANTE" : "spallata"}: ${final} danni!`);
      setPHp((hp) => {
        const next = Math.max(0, hp - final);
        if (next <= 0) { endMatch("opponent"); }
        return next;
      });
    }, 1700);
    return () => { if (loop.current) clearInterval(loop.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, opp]);

  function endMatch(w: "player" | "opponent") {
    if (loop.current) clearInterval(loop.current);
    setWinner(w); setStatus("ended");
    if (w === "player") {
      play(() => soundEngine.playVictoryFanfare());
      addXp(500); addCoins(60);
      onToast("🏆 Vittoria! +500 XP, +60 🪙");
    } else onToast("Sconfitta dignitosa: potenzia le tue Reines!");
  }

  function attacca() {
    if (status === "intro") { setStatus("active"); return; }
    if (status !== "active" || !mine) return;
    play(() => soundEngine.playHeadbutt());
    setPAnim(true); setTimeout(() => setPAnim(false), 200);
    const dmg = Math.floor(10 + mine.stats.corna * 0.16 + Math.random() * 8);
    setEnergy((e) => Math.min(100, e + 12));
    setOHp((hp) => { const next = Math.max(0, hp - dmg); if (next <= 0) endMatch("player"); return next; });
    push(`⚔️ ${mine.nome} colpisce: ${dmg} danni!`);
  }
  function schiva() {
    if (status !== "active" || dodgeRef.current) return;
    play(() => soundEngine.playClick());
    dodgeRef.current = true; setDodge(true);
    setTimeout(() => { dodgeRef.current = false; setDodge(false); }, 500);
  }
  function super_() {
    if (status !== "active" || energy < 100 || !mine) return;
    play(() => soundEngine.playVictoryFanfare());
    setEnergy(0);
    const dmg = Math.floor((16 + mine.stats.corna * 0.22) * 2.4);
    setOHp((hp) => { const next = Math.max(0, hp - dmg); if (next <= 0) endMatch("player"); return next; });
    push(`🌟 RUGITO DELLA COGNE: ${dmg} danni devastanti!`);
  }

  if (collezione.length < 1) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <h2 className="text-xl font-extrabold mb-2">Bataille de Reines 👑</h2>
        <div className="bg-alpino-50 text-alpino-900 rounded-xl p-4 text-sm font-medium">
          Cattura almeno una Reina sulla mappa per combattere nell'arena!
        </div>
      </div>
    );
  }

  if (status === "select") {
    return (
      <div className="h-full overflow-y-auto p-4 pb-6">
        <h2 className="text-xl font-extrabold mb-1">Bataille de Reines 👑</h2>
        <p className="text-sm text-pietra mb-4">Scegli la tua campionessa. Niente violenza: è una sfida di tecnica e statistiche.</p>
        <div className="grid grid-cols-3 gap-2.5">
          {collezione.map((c) => (
            <button key={c.id} onClick={() => avvia(c)} className="bg-white rounded-2xl shadow-sm overflow-hidden text-center pb-2">
              <div className="aspect-square"><Portrait cow={c} className="w-full h-full" rounded="rounded-none" /></div>
              <div className="font-bold text-xs mt-1 truncate px-1">{c.nome}</div>
              <div className="text-[10px] text-pietra">⚡ CP {c.cp}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 pb-6">
      {/* avversario */}
      <Fighter cow={opp!} hp={oHp} max={oMax} energy={oEnergy} anim={oAnim} flip />
      <div className="text-center text-2xl font-black my-1 text-alpino-700">VS</div>
      {/* giocatore */}
      <Fighter cow={mine!} hp={pHp} max={pMax} energy={energy} anim={pAnim} dodge={dodge} />

      <div className="bg-alpino-900/90 text-white rounded-xl p-2.5 h-24 overflow-y-auto text-[11px] my-3 space-y-0.5">
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {status === "intro" && <button onClick={attacca} className="btn-alpino w-full">▶️ Inizia la sfida</button>}

      {status === "active" && (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={attacca} className="btn-alpino"><Swords size={18} /> Attacca</button>
          <button onClick={schiva} className={`btn-alpino ${dodge ? "bg-cielo" : "bg-alpino-500"}`}><Shield size={18} /> Schiva</button>
          <button onClick={super_} disabled={energy < 100} className="btn-alpino bg-oro disabled:opacity-40"><Zap size={18} /> Super</button>
        </div>
      )}

      {status === "ended" && (
        <div className="text-center">
          <div className="text-4xl mb-2">{winner === "player" ? "🏆" : "💪"}</div>
          <div className="font-extrabold text-lg mb-3">{winner === "player" ? "Reina del pascolo!" : "Sconfitta dignitosa"}</div>
          <button onClick={() => setStatus("select")} className="btn-alpino w-full">Nuova sfida</button>
        </div>
      )}
    </div>
  );
}

function Fighter({ cow, hp, max, energy, anim, flip, dodge }: {
  cow: Vazzamon; hp: number; max: number; energy: number; anim: boolean; flip?: boolean; dodge?: boolean;
}) {
  return (
    <div className="glass rounded-card p-3 flex items-center gap-3">
      <motion.div animate={anim ? { x: flip ? [-6, 6, 0] : [6, -6, 0] } : dodge ? { x: [-12, 12, -8, 0] } : {}} transition={{ duration: 0.25 }} className="w-16 h-16 shrink-0">
        <Portrait cow={cow} className="w-16 h-16" />
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm truncate">{cow.nome}</span>
          <span className="text-[11px] text-oro">{stelle(cow.stelle)}</span>
          <span className="ml-auto text-[11px] font-bold text-pietra">CP {cow.cp}</span>
        </div>
        <div className="h-2.5 mt-1 rounded-full bg-alpino-100 overflow-hidden">
          <div className="h-full transition-[width]" style={{ width: `${(hp / max) * 100}%`, background: hp / max > 0.3 ? "#22c55e" : "#ef4444" }} />
        </div>
        <div className="h-1.5 mt-1 rounded-full bg-alpino-100 overflow-hidden">
          <div className="h-full bg-oro transition-[width]" style={{ width: `${energy}%` }} />
        </div>
      </div>
    </div>
  );
}
