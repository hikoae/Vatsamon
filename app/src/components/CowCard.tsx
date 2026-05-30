import { motion } from "motion/react";
import { Vazzamon, RarityType } from "../types";
import { CowVisual } from "./CowVisual";

/** Stelle di rarità (badge carta). */
const RARITY_STARS: Record<RarityType, number> = {
  Leggendaria: 5,
  Epica: 4,
  Rara: 3,
  Comune: 2,
};

const RARITY_FRAME: Record<RarityType, string> = {
  Leggendaria: "border-amber-500/60 from-amber-500/15",
  Epica: "border-purple-500/60 from-purple-500/15",
  Rara: "border-blue-500/60 from-blue-500/15",
  Comune: "border-slate-700 from-slate-700/10",
};

const RARITY_TEXT: Record<RarityType, string> = {
  Leggendaria: "text-amber-400",
  Epica: "text-purple-400",
  Rara: "text-blue-400",
  Comune: "text-slate-400",
};

const REAL_STATS = [
  ["STAZZA", "stazza", "#3b82f6"],
  ["CORNA", "corna", "#ef4444"],
  ["TESTA", "testa", "#22c55e"],
  ["GRINTA", "grinta", "#eab308"],
] as const;

/**
 * Scheda dettaglio "carta Pokémon" di una Reina: cornice olografica per rarità,
 * illustrazione grande, 4 statistiche reali animate, badge + provenienza + funFact.
 * I bottoni d'azione (Potenzia/Libera/Compagno) restano in App.tsx attorno a questa card.
 */
export function CowCard({ cow }: { cow: Vazzamon }) {
  const stars = RARITY_STARS[cow.rarity];
  const glow =
    cow.rarity === "Leggendaria" ? "legendary-glow opacity-30" :
    cow.rarity === "Epica" ? "epic-glow opacity-25" :
    cow.rarity === "Rara" ? "rare-glow opacity-20" : "opacity-0";

  return (
    <motion.div
      initial={{ rotateX: 8, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      whileHover={{ rotateY: 4, rotateX: -4 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      style={{ transformPerspective: 900 }}
      className={`relative rounded-3xl border-2 bg-gradient-to-b to-slate-950 ${RARITY_FRAME[cow.rarity]} p-4 space-y-3 overflow-hidden`}
    >
      {/* sheen olografico */}
      <div className="absolute inset-0 holo-sheen pointer-events-none rounded-3xl" />

      {/* intestazione: rarità + stelle */}
      <div className="relative flex items-center justify-between">
        <span className={`text-[10px] bg-slate-950/70 border border-current/20 font-mono font-black tracking-widest px-3 py-1 rounded-full uppercase ${RARITY_TEXT[cow.rarity]}`}>
          {cow.rarity}
        </span>
        <span className={`text-sm tracking-tight ${RARITY_TEXT[cow.rarity]}`}>
          {"★".repeat(stars)}<span className="text-slate-700">{"★".repeat(5 - stars)}</span>
        </span>
      </div>

      {/* nome + CP/livello */}
      <div className="relative text-center space-y-0.5">
        <h1 className="text-2xl font-mono font-black text-[#F5F5DC] tracking-tight leading-none uppercase">{cow.name}</h1>
        <div className="text-xs text-slate-400 font-mono">
          CP <b className="text-amber-300">{cow.cp}</b> • Lv {cow.level} • {cow.breed}
          {cow.categoria ? ` • ${cow.categoria}` : ""}
        </div>
      </div>

      {/* illustrazione grande con aura rarità */}
      <div className="relative py-2 flex justify-center">
        <div className={`absolute inset-6 rounded-full pointer-events-none filter blur-xl ${glow}`} />
        <CowVisual cow={cow} className="w-40 h-40 relative z-10 animate-float" />
      </div>

      {/* 3 statistiche di gioco */}
      <div className="relative grid grid-cols-3 gap-2 py-2 bg-slate-950/70 rounded-2xl border border-slate-850">
        <div>
          <span className="block font-mono font-black text-sm text-amber-400">{cow.stats.strength}</span>
          <span className="text-[9.5px] text-slate-400 uppercase font-mono">Forza 🏋️‍♂️</span>
        </div>
        <div>
          <span className="block font-mono font-black text-sm text-blue-400">{cow.stats.defense}</span>
          <span className="text-[9.5px] text-slate-400 uppercase font-mono">Difesa 🛡️</span>
        </div>
        <div>
          <span className="block font-mono font-black text-sm text-emerald-400">{cow.stats.agility}</span>
          <span className="text-[9.5px] text-slate-400 uppercase font-mono">Agilità ⚡</span>
        </div>
      </div>

      {/* 4 statistiche reali animate + provenienza */}
      {cow.isReal && cow.stats4 && (
        <div className="relative bg-emerald-950/30 border border-emerald-900 rounded-2xl p-3 text-left space-y-2">
          <div className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest">Scheda reale · 4 statistiche</div>
          {REAL_STATS.map(([lbl, key, col]) => (
            <div key={key}>
              <div className="flex justify-between text-[10px] font-mono font-bold text-slate-300"><span>{lbl}</span><span>{cow.stats4![key]}</span></div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: col }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (cow.stats4![key] / 120) * 100)}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400 pt-1">
            <div>Potenza: <b className="text-slate-200">{cow.potenza}</b></div>
            <div>Comune: <b className="text-slate-200">{cow.comune}</b></div>
            <div>Riconosc.: <b className="text-slate-200">{cow.riconoscimento}</b></div>
            <div>Peso: <b className="text-slate-200">{cow.peso_kg} kg{cow.pesoStimato ? "*" : ""}</b></div>
            <div>Allevatore: <b className="text-slate-200">{cow.allevatore || "—"}</b></div>
            {cow.matricola && <div>Matricola: <b className="text-slate-200">{cow.matricola}</b></div>}
          </div>
        </div>
      )}

      {/* funFact (se presente) */}
      {cow.funFact && (
        <div className="relative bg-amber-950/30 border border-amber-900/60 rounded-2xl p-3 text-left flex gap-1.5">
          <span className="text-sm">💡</span>
          <p className="text-[10px] text-amber-100/90 leading-normal">{cow.funFact}</p>
        </div>
      )}

      {/* lore */}
      <p className="relative text-xs text-slate-300 italic px-3 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-850">
        "{cow.lore}"
      </p>

      {/* eco-tip */}
      <div className="relative bg-emerald-950/40 border-2 border-emerald-900 p-3 rounded-2xl text-left flex gap-1.5">
        <span className="text-emerald-400 text-sm">🛡️</span>
        <div className="space-y-0.5">
          <h4 className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-wide leading-none">Safari Eco-Tip</h4>
          <p className="text-[10px] text-slate-300 leading-normal">{cow.eco_tip}</p>
        </div>
      </div>
    </motion.div>
  );
}
