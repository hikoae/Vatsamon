import { useState } from "react";
import { motion } from "motion/react";
import { X, Gift } from "lucide-react";
import type { Casera } from "../data/types";
import { useGame } from "../store/game";
import { soundEngine } from "../lib/audio";

export function CaseraScreen({ casera, onClose }: { casera: Casera; onClose: () => void }) {
  const { aggiungiItem, addCoins, addXp, sound } = useGame();
  const [state, setState] = useState<"idle" | "spinning" | "done">("idle");
  const [deg, setDeg] = useState(0);
  const [rewards, setRewards] = useState<string[]>([]);

  function gira() {
    if (state !== "idle") return;
    setState("spinning");
    setDeg((d) => d + 1080 + Math.floor(Math.random() * 360));
    setTimeout(() => {
      if (sound) soundEngine.playVictoryFanfare();
      const r: string[] = [];
      const odds = Math.random();
      aggiungiItem("ball-std", 4); r.push("+4 Vazza-ball");
      if (odds > 0.4) { aggiungiItem("food-apple", 2); r.push("+2 Mele d'Oro"); }
      if (odds > 0.7) { aggiungiItem("ball-giga", 1); r.push("+1 Alpen-Bell"); }
      if (odds > 0.9) { aggiungiItem("candy-hay", 1); r.push("+1 Fieno delle Vette"); }
      addCoins(15); r.push("+15 🪙");
      addXp(150);
      setRewards(r);
      setState("done");
    }, 2200);
  }

  return (
    <div className="fixed inset-0 z-[4000] flex items-end justify-center bg-alpino-900/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }}
        className="w-full max-w-[520px] rounded-t-3xl bg-crema p-5 pb-8 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <div className="text-left">
            <div className="text-[11px] font-bold text-cielo uppercase tracking-wide">Casera d'Alpeggio</div>
            <h2 className="font-extrabold text-lg leading-tight">{casera.name}</h2>
            <div className="text-xs text-pietra">{casera.comune}</div>
          </div>
          <button onClick={onClose} className="p-1 text-pietra"><X size={22} /></button>
        </div>

        <div className="grid place-items-center my-5">
          <motion.div animate={{ rotate: deg }} transition={{ duration: 2, ease: "easeOut" }}
            className="w-40 h-40 rounded-full border-8 border-cielo grid place-items-center text-5xl shadow-inner"
            style={{ background: "conic-gradient(#dbeafe, #fff7ed, #dcfce7, #fef9c3, #dbeafe)" }}>
            🍼
          </motion.div>
        </div>

        {state === "done" ? (
          <>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {rewards.map((r, i) => (
                <span key={i} className="bg-white rounded-full px-3 py-1 text-sm font-bold shadow-sm flex items-center gap-1">
                  <Gift size={14} className="text-oro" /> {r}
                </span>
              ))}
            </div>
            <button onClick={onClose} className="btn-alpino w-full">Raccogli e prosegui</button>
          </>
        ) : (
          <button onClick={gira} disabled={state === "spinning"} className="btn-alpino w-full">
            {state === "spinning" ? "Gira…" : "🎡 Gira la ruota dell'alpeggio"}
          </button>
        )}
      </motion.div>
    </div>
  );
}
