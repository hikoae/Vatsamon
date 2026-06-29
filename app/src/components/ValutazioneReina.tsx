import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Vatsamon } from "../types";
import { CowVisual } from "./CowVisual";

/**
 * "VALUTAZIONE DEL GIUDICE" — il giocatore fa il giudice di Bataille e valuta la
 * Reina con 3 gesti, prima che l'allevatore decida l'affidamento. Sostituisce il
 * "DNA scanner" sci-fi con un rito autentico, tutto touch (niente DeviceMotion):
 *   1. STAZZA  — tieni premuto e rilascia quando la stadera è in zona (peso).
 *   2. CORNA   — tocca a ritmo per contare le corna a corna limate (presa).
 *   3. SGUARDO — tieni premuto a lungo per sostenere lo sguardo (volontà).
 * Ogni gesto dà 0–100; la media è l'accuratezza della valutazione, che migliora
 * l'affidamento (NON gonfia le stat: resta legata a peso/categoria).
 */

type Step = "intro" | "stazza" | "corna" | "sguardo" | "done";

export default function ValutazioneReina({ cow, onDone, onClose, playClick }: {
  cow: Vatsamon;
  onDone: (accuratezza: number) => void;
  onClose: () => void;
  playClick: () => void;
}) {
  const [step, setStep] = useState<Step>("intro");
  const [scores, setScores] = useState<{ stazza?: number; corna?: number; sguardo?: number }>({});

  // ---- 1. STAZZA: stadera oscillante, rilascia in zona target ----
  const [needle, setNeedle] = useState(0); // 0..100 oscillante
  const dirRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (step !== "stazza") return;
    let last = 0;
    const tick = (t: number) => {
      if (!last) last = t;
      const dt = Math.min(48, t - last); last = t;
      setNeedle((n) => {
        let v = n + dirRef.current * dt * 0.09;
        if (v >= 100) { v = 100; dirRef.current = -1; }
        if (v <= 0) { v = 0; dirRef.current = 1; }
        return v;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [step]);
  const TARGET_LO = 38, TARGET_HI = 62, TARGET_MID = 50;
  const lockStazza = () => {
    playClick();
    const dist = Math.abs(needle - TARGET_MID);
    const acc = Math.max(0, Math.round(100 - (dist / 50) * 100));
    setScores((s) => ({ ...s, stazza: acc }));
    setStep("corna");
  };

  // ---- 2. CORNA: tocca a ritmo; conta i tap in finestra ----
  const [taps, setTaps] = useState(0);
  const [cornaLeft, setCornaLeft] = useState(4.0);
  const cornaActive = step === "corna";
  useEffect(() => {
    if (!cornaActive) return;
    setTaps(0); setCornaLeft(4.0);
    const id = setInterval(() => {
      setCornaLeft((t) => {
        const nt = +(t - 0.1).toFixed(1);
        if (nt <= 0) { clearInterval(id); finishCorna(); return 0; }
        return nt;
      });
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cornaActive]);
  const tapsRef = useRef(0);
  useEffect(() => { tapsRef.current = taps; }, [taps]);
  const TARGET_TAPS = 12; // ritmo ideale ~3/s per 4s
  const finishCorna = () => {
    const t = tapsRef.current;
    const acc = Math.max(0, Math.round(100 - (Math.abs(t - TARGET_TAPS) / TARGET_TAPS) * 100));
    setScores((s) => ({ ...s, corna: acc }));
    setStep("sguardo");
  };

  // ---- 3. SGUARDO: press-and-hold a lungo (più reggi, meglio è, fino a 2.2s) ----
  const [holding, setHolding] = useState(false);
  const [held, setHeld] = useState(0); // ms
  const holdStartRef = useRef(0);
  const holdRafRef = useRef<number | null>(null);
  const HOLD_TARGET = 2200;
  const startHold = () => {
    if (step !== "sguardo" || holding) return;
    setHolding(true); holdStartRef.current = performance.now();
    const tick = () => {
      const e = performance.now() - holdStartRef.current;
      setHeld(e);
      if (e >= HOLD_TARGET) { endHold(true); return; }
      holdRafRef.current = requestAnimationFrame(tick);
    };
    holdRafRef.current = requestAnimationFrame(tick);
  };
  const endHold = (auto = false) => {
    if (!holding && !auto) return;
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    setHolding(false);
    const e = Math.min(HOLD_TARGET, performance.now() - holdStartRef.current);
    const acc = Math.round((e / HOLD_TARGET) * 100);
    const final = { stazza: scores.stazza ?? 0, corna: scores.corna ?? 0, sguardo: acc };
    setScores((s) => ({ ...s, sguardo: acc }));
    const media = Math.round((final.stazza + final.corna + final.sguardo) / 3);
    setMediaFinale(media);
    setStep("done");
  };
  const [mediaFinale, setMediaFinale] = useState(0);

  const badge = mediaFinale >= 85 ? { t: "VALUTAZIONE ECCELLENTE", c: "#10b981" }
    : mediaFinale >= 60 ? { t: "BUONA VALUTAZIONE", c: "#f59e0b" }
    : { t: "VALUTAZIONE INCERTA", c: "#94a3b8" };

  return (
    <div className="fixed inset-0 z-[75] flex flex-col bg-slate-950/95 text-slate-100 p-4" id="valutazione-scene">
      <div className="max-w-md mx-auto w-full flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-black text-amber-400">⚖️ Valutazione del Giudice</span>
          <button onClick={() => { playClick(); onClose(); }} className="text-slate-400 text-xs font-bold">Salta ✕</button>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-2.5 mb-3">
          <div className="rounded-xl overflow-hidden border-2 border-amber-500/40"><CowVisual cow={cow} className="w-16 h-16" /></div>
          <div className="min-w-0">
            <div className="font-mono font-black text-sm text-amber-300 truncate">{cow.name}</div>
            <div className="text-[10px] text-slate-400">{cow.breed} · {cow.rarity}</div>
          </div>
          <div className="ml-auto flex gap-1 text-[9px] font-mono">
            <Pip on={scores.stazza !== undefined} label="stazza" />
            <Pip on={scores.corna !== undefined} label="corna" />
            <Pip on={scores.sguardo !== undefined} label="sguardo" />
          </div>
        </div>

        <div className="flex-grow flex flex-col items-center justify-center text-center gap-4">
          {step === "intro" && (
            <>
              <p className="text-sm text-slate-300 leading-relaxed">Prima dell'affidamento, valuta la Reina come un <b className="text-amber-300">giudice di Bataille</b>: stazza, corna e sguardo. Tre gesti.</p>
              <button id="val-start" onClick={() => { playClick(); setStep("stazza"); }} className="nav-active text-white font-mono font-black text-sm py-3 px-8 rounded-2xl">Inizia la valutazione</button>
            </>
          )}

          {step === "stazza" && (
            <>
              <div className="text-[11px] font-mono uppercase tracking-widest text-amber-400">1 · Stazza</div>
              <p className="text-xs text-slate-400">Tieni a mente la stadera: ferma l'ago al centro.</p>
              <div className="relative w-full h-6 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div className="absolute inset-y-0 bg-emerald-500/30" style={{ left: `${TARGET_LO}%`, width: `${TARGET_HI - TARGET_LO}%` }} />
                <div className="absolute inset-y-0 w-1 bg-amber-400" style={{ left: `calc(${needle}% - 2px)` }} />
                <div className="absolute inset-y-0 w-px bg-slate-500" style={{ left: "50%" }} />
              </div>
              <button id="val-stazza" onClick={lockStazza} className="nav-active text-white font-mono font-black text-sm py-3 px-8 rounded-2xl">Ferma la stadera ⚖️</button>
            </>
          )}

          {step === "corna" && (
            <>
              <div className="text-[11px] font-mono uppercase tracking-widest text-amber-400">2 · Corna a corna limate</div>
              <p className="text-xs text-slate-400">Tocca a ritmo per contarle. Tempo: <b className="text-amber-300">{cornaLeft.toFixed(1)}s</b></p>
              <div className="text-3xl font-mono font-black text-amber-300">{taps} <span className="text-sm text-slate-500">tap</span></div>
              <button id="val-corna" onClick={() => { if (cornaLeft > 0) { setTaps((t) => t + 1); playClick(); } }} className="w-32 h-32 rounded-full nav-active text-white font-mono font-black text-lg active:scale-90 transition-transform">TOCCA 🐂</button>
            </>
          )}

          {step === "sguardo" && (
            <>
              <div className="text-[11px] font-mono uppercase tracking-widest text-amber-400">3 · Sostieni lo sguardo</div>
              <p className="text-xs text-slate-400">Tieni premuto a lungo, con calma.</p>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700"><div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-none" style={{ width: `${Math.min(100, (held / HOLD_TARGET) * 100)}%` }} /></div>
              <button id="val-sguardo"
                onMouseDown={startHold} onMouseUp={() => endHold()} onMouseLeave={() => holding && endHold()}
                onTouchStart={(e) => { e.preventDefault(); startHold(); }} onTouchEnd={(e) => { e.preventDefault(); endHold(); }}
                className={`w-36 h-36 rounded-full font-mono font-black text-sm transition-all ${holding ? "bg-emerald-600 scale-105" : "nav-active"} text-white`}>
                {holding ? "REGGI…" : "TIENI PREMUTO 👁️"}
              </button>
            </>
          )}

          {step === "done" && (
            <>
              <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: badge.c }}>{badge.t}</div>
              <div className="text-5xl font-mono font-black" style={{ color: badge.c }}>{mediaFinale}<span className="text-xl text-slate-500">/100</span></div>
              <div className="grid grid-cols-3 gap-2 w-full text-[10px] font-mono">
                <Mini label="Stazza" v={scores.stazza ?? 0} />
                <Mini label="Corna" v={scores.corna ?? 0} />
                <Mini label="Sguardo" v={scores.sguardo ?? 0} />
              </div>
              <p className="text-[11px] text-slate-400">Una buona valutazione conquista la fiducia dell'allevatore: l'affidamento sarà più probabile.</p>
              <button id="val-done" onClick={() => { playClick(); onDone(mediaFinale); }} className="nav-active text-white font-mono font-black text-sm py-3 px-8 rounded-2xl">Presentati all'allevatore →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Pip({ on, label }: { on: boolean; label: string }) {
  return <span className={`px-1.5 py-0.5 rounded-full border ${on ? "border-emerald-500 text-emerald-400 bg-emerald-950/40" : "border-slate-700 text-slate-600"}`}>{label}</span>;
}
function Mini({ label, v }: { label: string; v: number }) {
  return <div className="bg-slate-900 border border-slate-800 rounded-lg py-1.5"><div className="text-slate-500 uppercase text-[8px]">{label}</div><div className="font-black text-amber-300">{v}</div></div>;
}
