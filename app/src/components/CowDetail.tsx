import { motion } from "motion/react";
import { X, TrendingUp, Gift } from "lucide-react";
import type { Vazzamon } from "../data/types";
import { useGame } from "../store/game";
import { rarityColor, stelle } from "../lib/rarity";
import { Portrait } from "./Portrait";
import { StatBars } from "./StatBars";

export function CowDetail({
  cow, onClose, catturata,
}: {
  cow: Vazzamon;
  onClose: () => void;
  catturata: boolean;
}) {
  const { potenzia, rilascia, getCow } = useGame();
  // se è in collezione, mostra la versione aggiornata (power-up)
  const live = getCow(cow.id) ?? cow;
  const reale = live.origine === "reale";

  return (
    <div className="fixed inset-0 z-[4000] flex items-end justify-center bg-alpino-900/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }}
        className="w-full max-w-[520px] max-h-[94vh] overflow-y-auto rounded-t-3xl bg-crema p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: rarityColor(live.rarita) }}>
            {live.rarita} {reale ? "" : "· IA"}
          </span>
          <button onClick={onClose} className="p-1 text-pietra"><X size={22} /></button>
        </div>

        <Portrait cow={live} className="w-full aspect-[4/3]" forceSilhouette={!catturata} />

        <div className="flex items-baseline gap-2 mt-3">
          <h2 className="text-2xl font-extrabold">{catturata ? live.nome : "???"}</h2>
          <span className="text-oro">{stelle(live.stelle)}</span>
          <span className="ml-auto text-sm font-bold text-pietra">CP {live.cp} · Liv. {live.level}</span>
        </div>
        <div className="text-sm text-pietra mb-2">{live.tipo} · {live.razza} · cat. {live.categoria}</div>
        <p className="text-sm leading-snug mb-3">{live.lore ?? live.descrizione}</p>

        <div className="bg-white rounded-2xl p-3.5 mb-3"><StatBars stats={live.stats} potenza={live.potenza} /></div>

        {live.eco_tip && <div className="bg-alpino-50 text-alpino-900 rounded-xl p-3 text-[13px] font-medium mb-3">🌿 {live.eco_tip}</div>}

        <div className="text-sm">
          {reale && <Row k="Riconoscimento" v={live.riconoscimento} />}
          <Row k="Comune / zona" v={live.comune} />
          {reale && <Row k="Allevatore" v={live.allevatore || "—"} />}
          {reale && live.matricola && <Row k="Matricola" v={live.matricola} />}
          <Row k="Peso" v={`${live.peso_kg} kg${live.peso_stimato ? " (stima)" : ""}`} />
        </div>

        {catturata && (
          <div className="flex gap-2 mt-4">
            <button className="btn-alpino flex-1 bg-oro" onClick={() => potenzia(live.id)}>
              <TrendingUp size={18} /> Potenzia (15🪙 + 🌾)
            </button>
            <button className="btn-alpino flex-1 bg-pietra" onClick={() => { if (confirm(`Liberare ${live.nome}? Ricevi +5 fieno.`)) { rilascia(live.id); onClose(); } }}>
              <Gift size={18} /> Libera
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-alpino-100">
      <b>{k}</b>
      <span className="text-pietra">{v}</span>
    </div>
  );
}
