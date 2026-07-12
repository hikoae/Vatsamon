/**
 * S4 perf: incapsula i due tick ad alta frequenza della schermata di cattura
 *   - anello bersaglio che si restringe (rAF, ~60fps)
 *   - barra di potenza del lancio (interval, 50ms)
 * Prima vivevano come useState/useEffect diretti in App: ogni tick faceva
 * ri-eseguire l'INTERO render di App (mappa, HUD, nav...) durante ogni lancio.
 * Spostando lo stato qui dentro e distribuendolo via Context ai due soli punti
 * che lo consumano (CaptureRing, ThrowPowerBar), i tick restano isolati in
 * questo sottoalbero — il resto di App non si aggiorna più durante il lancio.
 */
import { createContext, useContext, useEffect, useState, type ReactNode, type RefObject } from 'react';

interface ThrowGaugeValue {
  targetRingScale: number;
  throwSpeedGauge: number;
}

const ThrowGaugeContext = createContext<ThrowGaugeValue>({ targetRingScale: 1, throwSpeedGauge: 40 });

interface ThrowGaugeProps {
  isCapturingMode: boolean;
  captureStep: 'aiming' | 'flying' | 'wobbling' | 'secured' | 'escaped';
  /** Rif mutabile del chiamante: riceve sempre l'ultimo throwSpeedGauge, cosi
   *  App puo leggere il valore corrente al momento del lancio (executeThrow)
   *  senza dover tenere lo stato ad alta frequenza al suo livello. */
  speedRef?: RefObject<number>;
  children: ReactNode;
}

export function ThrowGauge({ isCapturingMode, captureStep, speedRef, children }: ThrowGaugeProps) {
  const [targetRingScale, setTargetRingScale] = useState(1);
  const [throwSpeedGauge, setThrowSpeedGauge] = useState(40);
  const [throwDirection, setThrowDirection] = useState<'up' | 'down'>('up');

  // Shrinking Capture Target Circle trigger loop
  useEffect(() => {
    let animationFrame: number;
    const tickRing = () => {
      setTargetRingScale(prev => {
        const next = prev - 0.015;
        return next < 0.35 ? 1.0 : next;
      });
      animationFrame = requestAnimationFrame(tickRing);
    };
    if (isCapturingMode) {
      animationFrame = requestAnimationFrame(tickRing);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isCapturingMode]);

  // Throw gauge power oscillator loop
  useEffect(() => {
    let inter: ReturnType<typeof setInterval>;
    if (isCapturingMode && captureStep === 'aiming') {
      inter = setInterval(() => {
        setThrowSpeedGauge(prev => {
          if (throwDirection === 'up') {
            if (prev >= 98) { setThrowDirection('down'); return 98; }
            return prev + 6;
          } else {
            if (prev <= 12) { setThrowDirection('up'); return 12; }
            return prev - 6;
          }
        });
      }, 50);
    }
    return () => clearInterval(inter);
  }, [isCapturingMode, captureStep, throwDirection]);

  useEffect(() => {
    if (speedRef) speedRef.current = throwSpeedGauge;
  }, [throwSpeedGauge, speedRef]);

  return (
    <ThrowGaugeContext.Provider value={{ targetRingScale, throwSpeedGauge }}>
      {children}
    </ThrowGaugeContext.Provider>
  );
}

/** Anello bersaglio che si restringe attorno alla Reina durante la mira. */
export function CaptureRing({ hasFedApple, isLegendary }: { hasFedApple: boolean; isLegendary: boolean }) {
  const { targetRingScale } = useContext(ThrowGaugeContext);
  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 flex items-center justify-center transition-all duration-75"
      style={{
        width: `${targetRingScale * 110}px`,
        height: `${targetRingScale * 110}px`,
        borderColor: hasFedApple ? '#10b981' : isLegendary ? '#ef4444' : '#f59e0b',
        boxShadow: `0 0 10px ${hasFedApple ? '#10b981' : '#f59e0b'}`
      }}
    >
      {/* Inner pulsing core point */}
      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
    </div>
  );
}

/** Barra di potenza del lancio (label % + fill), letta da ThrowGaugeContext. */
export function ThrowPowerBar() {
  const { throwSpeedGauge } = useContext(ThrowGaugeContext);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono text-slate-400">
        <span>Puntamento Forza del Lancio</span>
        <span className="font-bold text-amber-400">⚡ {throwSpeedGauge}%</span>
      </div>
      <div className="relative bg-slate-850 rounded-full h-3.5 overflow-hidden border border-slate-700/80">
        {/* Perfect capture range highlight zone */}
        <div className="absolute inset-y-0 left-[75%] right-[8%] bg-green-500/30 border-x border-green-400/40" title="Zona Perfetta" />
        <div
          className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full rounded-full transition-all duration-75"
          style={{ width: `${throwSpeedGauge}%` }}
        />
      </div>
    </div>
  );
}
