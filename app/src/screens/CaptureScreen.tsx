import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Apple, X } from "lucide-react";
import type { Vazzamon } from "../data/types";
import { useGame } from "../store/game";
import { soundEngine } from "../lib/audio";
import { Portrait } from "../components/Portrait";
import { rarityColor, stelle } from "../lib/rarity";

type Step = "aiming" | "flying" | "wobbling" | "secured" | "escaped";

const BASE_RATE: Record<string, number> = {
  Comune: 0.55,
  "Non comune": 0.45,
  Rara: 0.32,
  Epica: 0.2,
  Leggendaria: 0.1,
};

export function CaptureScreen({
  target,
  onClose,
  onToast,
}: {
  target: Vazzamon;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const { backpack, sound, usaItem, cattura } = useGame();
  const balls = backpack.filter((b) => b.type === "ball");
  const apple = backpack.find((b) => b.id === "food-apple");

  const [ballId, setBallId] = useState(balls[0]?.id ?? "ball-std");
  const [fedApple, setFedApple] = useState(false);
  const [gauge, setGauge] = useState(40);
  const [dir, setDir] = useState<"up" | "down">("up");
  const [step, setStep] = useState<Step>("aiming");
  const [msg, setMsg] = useState("Tocca al momento giusto per un lancio perfetto!");
  const ring = useRef(1);
  const [, force] = useState(0);

  const play = (f: () => void) => { if (sound) f(); };

  // gauge oscillante
  useEffect(() => {
    if (step !== "aiming") return;
    const t = setInterval(() => {
      setGauge((p) => {
        if (dir === "up") { if (p >= 96) { setDir("down"); return 96; } return p + 7; }
        if (p <= 8) { setDir("up"); return 8; }
        return p - 7;
      });
    }, 45);
    return () => clearInterval(t);
  }, [step, dir]);

  // anello che si stringe
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      ring.current = ring.current - 0.015 < 0.35 ? 1 : ring.current - 0.015;
      force((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };
    if (step === "aiming") raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  function feed() {
    if (fedApple || !apple || apple.quantity < 1) return;
    if (usaItem("food-apple")) {
      setFedApple(true);
      play(() => soundEngine.playClick());
      setMsg("Mmee! La mela ha calmato la Reina. Cattura facilitata!");
    }
  }

  function lancia() {
    if (step !== "aiming") return;
    if (!usaItem(ballId)) { onToast("Campanacci finiti! Cambia tipo."); return; }
    play(() => soundEngine.playClick());

    const rating = gauge >= 72 && gauge <= 92 ? "PERFETTO" : gauge >= 55 ? "OTTIMO" : "OK";
    setMsg(`Lancio: ${rating}!`);
    setStep("flying");

    setTimeout(() => { setStep("wobbling"); setMsg("Oscillazione 1…"); play(() => soundEngine.playHeadbutt()); }, 800);
    setTimeout(() => { setMsg("Oscillazione 2…"); play(() => soundEngine.playHeadbutt()); }, 1800);
    setTimeout(() => {
      let chance = BASE_RATE[target.rarita] ?? 0.4;
      if (ballId === "ball-master") chance = 1;
      else if (ballId === "ball-giga") chance *= 1.8;
      if (fedApple) chance *= 1.5;
      if (rating === "PERFETTO") chance *= 1.7;
      else if (rating === "OTTIMO") chance *= 1.3;

      if (Math.random() <= chance) {
        setStep("secured");
        setMsg(`Presa! ${target.nome} è entrata nel Vazzadex!`);
        play(() => soundEngine.playVictoryFanfare());
        const nuova = cattura(target);
        onToast(nuova ? `🎉 ${target.nome} catturata! +25 🪙` : "Già nella collezione");
      } else {
        setStep("escaped");
        setMsg("Oh no! Si è liberata dal rintocco ed è svanita tra le nebbie!");
      }
    }, 3000);
  }

  return (
    <div className="fixed inset-0 z-[4000] flex items-end justify-center bg-alpino-900/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="w-full max-w-[520px] max-h-[94vh] overflow-y-auto rounded-t-3xl bg-crema p-4 pb-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-1">
          <span className="rarity-badge text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full"
            style={{ background: rarityColor(target.rarita) }}>
            {target.rarita} · {stelle(target.stelle)}
          </span>
          <button onClick={onClose} className="p-1 text-pietra"><X size={22} /></button>
        </div>

        {/* arena cattura */}
        <div className="relative grid place-items-center h-56 my-2 rounded-2xl bg-gradient-to-b from-alpino-100 to-alpino-50 overflow-hidden">
          {step === "aiming" && (
            <div
              className="absolute rounded-full border-[3px] border-alpino-700/70"
              style={{ width: 190, height: 190, transform: `scale(${ring.current})` }}
            />
          )}
          <motion.div
            animate={
              step === "flying" ? { y: [-10, -90, -40], scale: [1, 0.6, 0.5] }
              : step === "wobbling" ? { rotate: [0, -12, 12, -8, 0] }
              : step === "secured" ? { scale: [1, 1.15, 1] }
              : step === "escaped" ? { x: [0, -20, 20, 0], opacity: [1, 1, 0.3] } : {}
            }
            transition={{ duration: step === "wobbling" ? 0.9 : 0.8, repeat: step === "wobbling" ? 1 : 0 }}
            className="w-36 h-36"
          >
            <Portrait cow={target} className="w-36 h-36" rounded="rounded-2xl" forceSilhouette={step === "aiming"} />
          </motion.div>
        </div>

        <div className="text-center font-bold text-sm min-h-[20px] mb-2 text-alpino-900">{msg}</div>

        {step === "aiming" && (
          <>
            {/* power gauge */}
            <div className="h-3 rounded-full bg-alpino-100 overflow-hidden mb-3">
              <div className="h-full rounded-full"
                style={{
                  width: `${gauge}%`,
                  background: gauge >= 72 && gauge <= 92 ? "#22c55e" : "#e0a82e",
                }} />
            </div>

            <div className="flex gap-2 mb-2">
              {balls.map((b) => (
                <button key={b.id} data-ball={b.id} onClick={() => setBallId(b.id)}
                  className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold border-2 ${
                    ballId === b.id ? "border-alpino-700 bg-alpino-50" : "border-transparent bg-white"
                  } ${b.quantity < 1 ? "opacity-40" : ""}`}>
                  🔔 ×{b.quantity}
                  <div className="text-[9px] font-medium text-pietra leading-tight mt-0.5">{b.name.split(" ")[0]}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={feed} disabled={fedApple || !apple || apple.quantity < 1}
                className="btn-alpino flex-1 bg-oro disabled:opacity-50">
                <Apple size={18} /> Mela {apple ? `×${apple.quantity}` : ""}
              </button>
              <button onClick={lancia} className="btn-alpino flex-[2]">🔔 Lancia il campanaccio</button>
            </div>
          </>
        )}

        {(step === "secured" || step === "escaped") && (
          <button onClick={onClose} className="btn-alpino w-full mt-2">
            {step === "secured" ? "Aggiungi al Vazzadex 📒" : "Chiudi"}
          </button>
        )}
      </motion.div>
    </div>
  );
}
