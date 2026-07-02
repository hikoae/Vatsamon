import { motion } from "motion/react";
import { Vatsamon, RarityType } from "../types";
import { CowVisual } from "./CowVisual";
import { massaFromPeso } from "../lib/spinta";

/** Stelle di rarità (badge carta). */
const RARITY_STARS: Record<RarityType, number> = {
  Leggendaria: 5,
  Epica: 4,
  Rara: 3,
  Comune: 2,
};

/** Stile completo per rarità: cornice, sfondo, gemma, testo, intensità holo. */
const RARITY: Record<
  RarityType,
  { frame: string; bg: string; text: string; gem: string; ring: string; holo: number; glow: string; label: string }
> = {
  Leggendaria: {
    frame: "border-amber-400/70",
    bg: "from-amber-500/20 via-amber-900/10 to-slate-950",
    text: "text-amber-600",
    gem: "bg-amber-400",
    ring: "shadow-[0_0_28px_rgba(245,158,11,0.35)]",
    holo: 1,
    glow: "legendary-glow opacity-40",
    label: "★ LEGGENDARIA ★",
  },
  Epica: {
    frame: "border-purple-400/70",
    bg: "from-purple-500/20 via-purple-900/10 to-slate-950",
    text: "text-purple-600",
    gem: "bg-purple-400",
    ring: "shadow-[0_0_24px_rgba(168,85,247,0.3)]",
    holo: 0.7,
    glow: "epic-glow opacity-30",
    label: "EPICA",
  },
  Rara: {
    frame: "border-blue-400/60",
    bg: "from-blue-500/15 via-blue-900/10 to-slate-950",
    text: "text-blue-600",
    gem: "bg-blue-400",
    ring: "shadow-[0_0_18px_rgba(59,130,246,0.25)]",
    holo: 0.4,
    glow: "rare-glow opacity-25",
    label: "RARA",
  },
  Comune: {
    frame: "border-slate-600",
    bg: "from-slate-700/15 to-slate-950",
    text: "text-slate-300",
    gem: "bg-slate-400",
    ring: "",
    holo: 0,
    glow: "opacity-0",
    label: "COMUNE",
  },
};

const REAL_STATS = [
  ["STAZZA", "stazza", "#3b82f6"],
  ["CORNA", "corna", "#ef4444"],
  ["TESTA", "testa", "#22c55e"],
  ["GRINTA", "grinta", "#eab308"],
] as const;

/**
 * Scheda dettaglio di una Reina: grafica che cambia con la rarità
 * (cornice/sfondo/gemme/holo), illustrazione o foto reale, 4 statistiche reali
 * animate, provenienza, e le grandezze della Spinta (massa dal peso, presa,
 * volontà) con il palmares personale.
 */
export function CowCard({ cow }: { cow: Vatsamon }) {
  const r = RARITY[cow.rarity];
  const stars = RARITY_STARS[cow.rarity];
  const peso = cow.peso_kg ?? 480 + Math.round(((cow.stats4?.stazza ?? cow.stats.defense) - 50) * 2.4);
  const massa = massaFromPeso(peso, cow.stats.defense);

  return (
    <motion.div
      initial={{ rotateX: 8, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      whileHover={{ rotateY: 4, rotateX: -4 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      style={{ transformPerspective: 900 }}
      className={`relative rounded-3xl border-2 bg-gradient-to-b ${r.frame} ${r.bg} ${r.ring} p-4 space-y-3 overflow-hidden`}
    >
      {/* sheen olografico (intensità per rarità) */}
      {r.holo > 0 && <div className="absolute inset-0 holo-sheen pointer-events-none rounded-3xl" style={{ opacity: r.holo }} />}

      {/* gemme angolari per rarità */}
      <span className={`absolute top-2 left-2 w-2.5 h-2.5 rounded-full ${r.gem} shadow`} />
      <span className={`absolute top-2 right-9 w-2.5 h-2.5 rounded-full ${r.gem} shadow`} />

      {/* intestazione: rarità + stelle */}
      <div className="relative flex items-center justify-between pl-5">
        <span className={`text-[10px] bg-slate-950/70 border border-current/20 font-mono font-black tracking-widest px-3 py-1 rounded-full uppercase ${r.text}`}>
          {r.label}
        </span>
        <span className={`text-sm tracking-tight ${r.text}`}>
          {"★".repeat(stars)}<span className="text-slate-700">{"★".repeat(5 - stars)}</span>
        </span>
      </div>

      {/* nome + CP/livello + tipo */}
      <div className="relative text-center space-y-0.5">
        <h1 className="text-2xl font-mono font-black text-[#211b3a] tracking-tight leading-none uppercase">{cow.name}</h1>
        <div className="text-xs text-slate-400 font-mono">
          Potenza <b className="text-amber-600">{cow.cp}</b> • Lv {cow.level} • {cow.breed}
          {cow.categoria ? ` • ${cow.categoria}` : ""}
        </div>
      </div>

      {/* illustrazione / foto reale con cornice rarità */}
      <div className="relative py-2 flex justify-center">
        <div className={`absolute inset-6 rounded-full pointer-events-none filter blur-xl ${r.glow}`} />
        <div className={`relative z-10 rounded-2xl border-2 ${r.frame} p-1 bg-slate-950/40`}>
          <CowVisual cow={cow} className="w-40 h-40 animate-float" />
        </div>
      </div>

      {/* Le tre leve della Spinta (massa dal peso reale, presa, volontà) */}
      <div className="relative grid grid-cols-3 gap-2 py-2 bg-slate-950/70 rounded-2xl border border-slate-850">
        <div>
          <span className="block font-mono font-black text-sm text-amber-400">{massa}</span>
          <span className="text-[9.5px] text-slate-400 uppercase font-mono">Massa · {peso} kg</span>
        </div>
        <div>
          <span className="block font-mono font-black text-sm text-rose-400">{cow.stats.strength}</span>
          <span className="text-[9.5px] text-slate-400 uppercase font-mono">Presa 🐂</span>
        </div>
        <div>
          <span className="block font-mono font-black text-sm text-emerald-400">{cow.stats.agility}</span>
          <span className="text-[9.5px] text-slate-400 uppercase font-mono">Volontà 💨</span>
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

      {/* ALLA BATAILLE — come si comporta alla spinta + palmares */}
      <div className="relative bg-slate-950/70 border border-slate-850 rounded-2xl p-3 space-y-1.5 text-left">
        <div className="text-[9px] font-mono font-black text-slate-300 uppercase tracking-widest flex items-center justify-between gap-1">
          <span>🐂 Alla bataille</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 font-mono">
            {cow.vittorie ? `🏆 ${cow.vittorie} ${cow.vittorie === 1 ? "vittoria" : "vittorie"}` : "debuttante"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400">
          <div>Categoria: <b className="text-slate-200">{cow.categoria ?? "—"}</b></div>
          <div>Peso vivo: <b className="text-slate-200">{peso} kg{cow.pesoStimato ? "*" : ""}</b></div>
          {cow.bornInStalla && <div>Nata in stalla: <b className="text-emerald-500">G{cow.generation ?? 1}</b></div>}
          {cow.valutazioneGiudice !== undefined && <div>Giudizio: <b className="text-slate-200">{cow.valutazioneGiudice}/100</b></div>}
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          La spinta è a <b className="text-slate-400">corna limate</b>: si vince facendo desistere
          l'avversaria, mai ferendola. Conta la condotta, non la forza bruta.
        </p>
      </div>

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
