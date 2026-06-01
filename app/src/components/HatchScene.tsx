import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Vatsamon, RarityType } from "../types";
import { CowVisual } from "./CowVisual";

/**
 * Animazione di NASCITA stile Pokémon (parto nella stalla):
 *  fase 0 — la mucca dondola nella paglia ("La gravidanza è al termine…")
 *  fase 1 — tremori sempre più forti + muggito ("La mucca sta partorendo!")
 *  fase 2 — flash accecante
 *  fase 3 — il vitellino emerge tra le scintille + scheda riepilogo
 */
const RARITY_META: Record<RarityType, { color: string; stars: number; glow: string }> = {
  Comune:      { color: "#64748b", stars: 2, glow: "rgba(100,116,139,0.5)" },
  Rara:        { color: "#3b7fe0", stars: 3, glow: "rgba(59,127,224,0.6)" },
  Epica:       { color: "#a855f7", stars: 4, glow: "rgba(168,85,247,0.65)" },
  Leggendaria: { color: "#f59e0b", stars: 5, glow: "rgba(245,158,11,0.7)" },
};

export default function HatchScene({
  cow,
  onClose,
  playMoo,
  playVictory,
}: {
  cow: Vatsamon;
  onClose: () => void;
  playMoo: () => void;
  playVictory: () => void;
}) {
  const [phase, setPhase] = useState(0);
  const rm = RARITY_META[cow.rarity] ?? RARITY_META.Comune;

  useEffect(() => {
    const t1 = setTimeout(() => { setPhase(1); playMoo(); }, 1400);
    const t2 = setTimeout(() => setPhase(2), 2600);
    const t3 = setTimeout(() => { setPhase(3); playVictory(); }, 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [playMoo, playVictory]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950 text-slate-100" id="hatch-scene">
      {/* sfondo stalla caldo */}
      <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(120% 90% at 50% 30%, #3a2a14 0%, #211608 55%, #0b0a06 100%)" }} />
      {/* alone di rarità */}
      <motion.div
        className="absolute -z-10 rounded-full"
        style={{ width: 360, height: 360, background: `radial-gradient(circle, ${rm.glow} 0%, transparent 70%)` }}
        animate={{ opacity: phase >= 1 ? [0.4, 0.9, 0.5] : 0.25, scale: phase >= 2 ? 1.4 : 1 }}
        transition={{ duration: 1.2, repeat: phase >= 1 && phase < 3 ? Infinity : 0 }}
      />

      {/* flash */}
      <AnimatePresence>
        {phase === 2 && (
          <motion.div
            className="absolute inset-0 z-10"
            style={{ background: "#fff" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.55 }}
          />
        )}
      </AnimatePresence>

      {/* ===== FASI 0-2: MUCCA NELLA STALLA ===== */}
      {phase < 3 && (
        <div className="flex flex-col items-center gap-4">
          {/* paglia decorativa */}
          <div className="text-3xl opacity-25 tracking-widest">🌾🌾🌾🌾🌾</div>

          <motion.div
            animate={
              phase === 0
                ? { rotate: [0, -3, 3, -2, 2, 0], y: [0, -5, 0] }
                : phase === 1
                ? { rotate: [0, -14, 14, -11, 11, -8, 8, 0], x: [0, -7, 7, -5, 5, 0] }
                : { scale: [1, 1.3, 0], opacity: [1, 1, 0] }
            }
            transition={{
              duration: phase === 2 ? 0.5 : phase === 1 ? 0.45 : 2,
              repeat: phase < 2 ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="text-[96px] leading-none drop-shadow-2xl"
          >
            🐮
          </motion.div>

          <div className="text-2xl opacity-20 tracking-widest">🌾🌾🌾🌾🌾</div>

          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.1, repeat: Infinity }}
            className="text-sm font-mono font-bold text-amber-300 text-center px-10"
          >
            {phase === 0
              ? "🌾 La gestazione è al termine, nella stalla qualcosa si muove…"
              : phase === 1
              ? "⚡ La mucca sta partorendo!"
              : "💥"}
          </motion.p>
        </div>
      )}

      {/* ===== FASE 3: VITELLINO RIVELATO ===== */}
      {phase === 3 && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 16 }}
          className="relative w-full max-w-sm mx-auto p-5 text-center"
        >
          {/* scintille */}
          {[...Array(10)].map((_, i) => (
            <span
              key={i}
              className="absolute sparkle text-lg"
              style={{ left: `${10 + (i * 8) % 80}%`, top: `${15 + (i * 37) % 70}%`, animationDelay: `${i * 0.18}s`, color: rm.color }}
            >✦</span>
          ))}
          <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 mb-1">🐄 È nato un vitellino!</div>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="flex justify-center my-2"
          >
            <div className="rounded-3xl overflow-hidden border-4 shadow-2xl" style={{ borderColor: rm.color, boxShadow: `0 0 40px ${rm.glow}` }}>
              <CowVisual cow={cow} className="w-40 h-40" />
            </div>
          </motion.div>
          <div className="text-2xl font-mono font-black text-slate-100">{cow.name}</div>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full" style={{ background: rm.color + "22", color: rm.color }}>{cow.rarity}</span>
            <span style={{ color: rm.color }}>{"★".repeat(rm.stars)}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{cow.breed} · CP {cow.cp} · Lv {cow.level}</div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {([["💪 Forza", cow.stats.strength], ["🛡️ Difesa", cow.stats.defense], ["⚡ Agilità", cow.stats.agility]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-slate-900/70 border border-slate-800 rounded-xl py-1.5">
                <div className="text-[8px] font-mono text-slate-400">{l}</div>
                <div className="text-sm font-mono font-black text-slate-100">{v}</div>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="mt-4 w-full nav-active text-white font-mono font-black text-sm py-3 rounded-2xl">
            Accogli il vitellino! 🐄
          </button>
        </motion.div>
      )}
    </div>
  );
}
