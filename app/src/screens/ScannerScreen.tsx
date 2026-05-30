import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, Sparkles, RefreshCw } from "lucide-react";
import type { Vazzamon } from "../data/types";
import { useGame } from "../store/game";
import { generaVazzamon } from "../lib/vazzamon";
import { soundEngine } from "../lib/audio";
import { Portrait } from "../components/Portrait";
import { StatBars } from "../components/StatBars";
import { rarityColor, stelle } from "../lib/rarity";

type Phase = "idle" | "analisi" | "fatto";

export function ScannerScreen({ onToast }: { onToast: (m: string) => void }) {
  const { cattura, sound } = useGame();
  const [phase, setPhase] = useState<Phase>("idle");
  const [img, setImg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Vazzamon | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => analizza(reader.result as string);
    reader.readAsDataURL(f);
  }

  function analizza(dataUrl: string | undefined) {
    setImg(dataUrl ?? null);
    setPhase("analisi");
    setProgress(0);
    let p = 0;
    const t = setInterval(() => {
      p += 7;
      if (p >= 100) {
        clearInterval(t);
        setProgress(100);
        const seed = Math.floor(Math.random() * 1_000_000);
        const v = generaVazzamon({ seed, origine: "generata", lat: 45.737, lng: 7.32, imageUrl: dataUrl });
        setResult(v);
        setPhase("fatto");
        if (sound) soundEngine.playVictoryFanfare();
        cattura(v);
        onToast(`✨ ${v.nome} generata e aggiunta!`);
      } else {
        setProgress(p);
      }
    }, 90);
  }

  function reset() {
    setPhase("idle"); setImg(null); setResult(null); setProgress(0);
  }

  return (
    <div className="h-full overflow-y-auto p-4 pb-6">
      <h2 className="text-xl font-extrabold mb-1">Scanner Vazzamon 📸</h2>
      <p className="text-sm text-pietra mb-4">
        Fotografa una mucca, un prato o una baita: l'IA conia un <b>Vazzamon bonus</b> ispirato al territorio alpino. (riconoscimento simulato, offline)
      </p>

      {phase === "idle" && (
        <div className="glass rounded-card p-6 text-center">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
          <div className="text-6xl mb-3">🔬</div>
          <p className="text-sm text-pietra mb-4">Inquadra il DNA alpino da analizzare</p>
          <button className="btn-alpino w-full mb-2" onClick={() => fileRef.current?.click()}>
            <Camera size={18} /> Scatta / Carica foto
          </button>
          <button className="btn-alpino w-full bg-alpino-500" onClick={() => analizza(undefined)}>
            <Sparkles size={18} /> Genera a sorpresa
          </button>
        </div>
      )}

      {phase === "analisi" && (
        <div className="glass rounded-card p-6 text-center">
          {img && <img src={img} alt="scan" className="w-full h-48 object-cover rounded-2xl mb-4" />}
          <div className="text-sm font-bold mb-2">Analisi del DNA alpino…</div>
          <div className="h-2.5 rounded-full bg-alpino-100 overflow-hidden">
            <div className="h-full bg-alpino-600 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {phase === "fatto" && result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: rarityColor(result.rarita) }}>
              {result.rarita}
            </span>
            <span className="text-oro text-sm">{stelle(result.stelle)}</span>
            <span className="ml-auto text-xs font-bold text-pietra">CP {result.cp}</span>
          </div>
          <Portrait cow={result} className="w-full h-52" />
          <h3 className="text-lg font-extrabold mt-3">{result.nome}</h3>
          <div className="text-xs text-pietra mb-2">{result.tipo} · {result.razza}</div>
          <p className="text-sm leading-snug mb-3">{result.lore}</p>
          <div className="bg-white rounded-2xl p-3 mb-3"><StatBars stats={result.stats} potenza={result.potenza} /></div>
          {result.eco_tip && <div className="bg-alpino-50 text-alpino-900 rounded-xl p-3 text-[13px] font-medium mb-3">🌿 {result.eco_tip}</div>}
          <button className="btn-alpino w-full" onClick={reset}><RefreshCw size={18} /> Analizza un'altra</button>
        </motion.div>
      )}
    </div>
  );
}
