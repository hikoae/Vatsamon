import { lazy, Suspense, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { X } from 'lucide-react';
import type { BackpackItem, Vatsamon } from '../types';
import { CowVisual } from './CowVisual';
import { ThrowGauge, CaptureRing, ThrowPowerBar } from './ThrowGauge';
import { SceneFallback } from './SceneFallback';
import { BALL_META, BALL_ORDER } from '../data/overworld';
import { estimateCatch, catchDifficulty } from '../lib/capture';

const ValutazioneReina = lazy(() => import('./ValutazioneReina'));

type CaptureStep = 'aiming' | 'flying' | 'wobbling' | 'secured' | 'escaped';

type Props = {
  isCapturingMode: boolean;
  encounterCow: Vatsamon | null;
  captureStep: CaptureStep;
  throwSpeedRef: RefObject<number>;
  playClickSfx: () => void;
  setIsCapturingMode: Dispatch<SetStateAction<boolean>>;
  setEncounterCow: Dispatch<SetStateAction<Vatsamon | null>>;
  valutazione: number | null;
  showValutazione: boolean;
  setShowValutazione: Dispatch<SetStateAction<boolean>>;
  setValutazione: Dispatch<SetStateAction<number | null>>;
  hasFedApple: boolean;
  captureLogMsg: string;
  selectedBallId: string;
  setSelectedBallId: Dispatch<SetStateAction<string>>;
  backpack: BackpackItem[];
  handleFeedApple: () => void;
  executeThrow: () => void;
};

/** SCHERMO DI CATTURA AR — incontro con una Reina selvatica (mira, lancio, esito). */
export function CaptureScreen({
  isCapturingMode,
  encounterCow,
  captureStep,
  throwSpeedRef,
  playClickSfx,
  setIsCapturingMode,
  setEncounterCow,
  valutazione,
  showValutazione,
  setShowValutazione,
  setValutazione,
  hasFedApple,
  captureLogMsg,
  selectedBallId,
  setSelectedBallId,
  backpack,
  handleFeedApple,
  executeThrow,
}: Props) {
  return (
    <>
      {/* WILD CAPTURE / AR WILD ENCOUNTER SCREEN */}
      {isCapturingMode && encounterCow && (
        <ThrowGauge isCapturingMode={isCapturingMode} captureStep={captureStep} speedRef={throwSpeedRef}>
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-3 sm:p-4 animate-scale-in overflow-y-auto" id="encounter-screen">
          <div className="encounter-flash" aria-hidden="true" />
          <div className="bg-gradient-to-b from-sky-950 via-emerald-950 to-slate-900 border-2 border-emerald-500/50 rounded-3xl max-w-lg w-full p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 shadow-2xl relative max-h-[94dvh] overflow-y-auto overflow-x-hidden no-scrollbar my-auto">

            {/* Back out button */}
            <button
              onClick={() => { playClickSfx(); setIsCapturingMode(false); setEncounterCow(null); }}
              className="absolute top-4 left-4 z-20 bg-slate-950/70 text-slate-300 py-1.5 px-3 rounded-xl hover:text-slate-100 transition-colors flex items-center gap-1 cursor-pointer text-xs font-bold"
            >
              <X className="w-4 h-4" />
              Fuggi al sentiero
            </button>

            {/* Stat HUD Top Card */}
            <div className="bg-slate-950/80 border border-slate-850 p-3 rounded-2xl z-10 flex items-center justify-between gap-4 mt-6">
              <div>
                <h3 className="font-mono font-black text-amber-400 tracking-tight flex items-center gap-1.5 text-base">
                  {encounterCow.name}
                </h3>
                <div className="flex items-center gap-1 text-[10.5px] text-slate-400 mt-0.5">
                  <span>Razza: {encounterCow.breed}</span>
                  <span className="text-slate-600">•</span>
                  <span className={`font-bold ${encounterCow.rarity === 'Leggendaria' ? 'text-amber-400' : encounterCow.rarity === 'Epica' ? 'text-purple-400' : 'text-blue-400'}`}>{encounterCow.rarity}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-mono">POTENZA</div>
                <div className="font-mono font-black text-xl text-yellow-400 leading-none">{encounterCow.cp}</div>
              </div>
            </div>

            {/* FASE 3 — Valutazione del Giudice: evento speciale per Reine rare+ */}
            {encounterCow.rarity !== 'Comune' && captureStep === 'aiming' && (
              valutazione === null ? (
                <button id="open-valutazione" onClick={() => { playClickSfx(); setShowValutazione(true); }}
                  className="bg-amber-950/40 border border-amber-600/50 text-amber-300 font-mono font-black text-[11px] py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-900/40">
                  ⚖️ Valuta la Reina (Giudice) — migliora l'affidamento
                </button>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-600/40 text-emerald-300 font-mono text-[11px] py-2 rounded-xl text-center" id="valutazione-esito">
                  ⚖️ Valutazione del giudice: <b>{valutazione}/100</b> · affidamento più probabile
                </div>
              )
            )}

            {/* IMMERSIVE MIDDLE STAGE: BOUNCING COW & SHRINKING CAPTURE RING */}
            <div className="flex-grow flex flex-col items-center justify-center relative my-4">

              {/* Simulated landscape grid */}
              <div className="absolute inset-x-0 bottom-10 h-1 bg-emerald-500/10 border-b border-emerald-500/5 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col items-center">

                {/* Bouncing Cow Avatar with Custom Keyframe Glow */}
                <div className={`transition-all duration-300 ${captureStep === 'wobbling' ? 'scale-0 translate-y-24 opacity-0 rotate-180 duration-[1200ms]' : captureStep === 'secured' ? 'opacity-0 scale-0' : 'animate-bounce'}`}>
                  <CowVisual cow={encounterCow} className="w-36 h-36" />
                </div>

                {/* Circular target shrinking selector HUD (S4 perf: tick isolato in ThrowGauge) */}
                {captureStep === 'aiming' && (
                  <CaptureRing hasFedApple={hasFedApple} isLegendary={encounterCow.rarity === 'Leggendaria'} />
                )}

                {/* Golden schweiz bell capture wobbling representation */}
                {captureStep === 'wobbling' && (
                  <div className="animate-wobble flex flex-col items-center">
                    <div className="w-16 h-16 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center shadow-2xl relative">
                      <span className="text-3xl">🔔</span>
                      <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full animate-ping"></span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-300 mt-2 animate-pulse">SI FIDERÀ?</span>
                  </div>
                )}

                {/* Success capture sparkle overlay */}
                {captureStep === 'secured' && (
                  <div className="text-center p-3 space-y-2 animate-scale-in">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center text-3xl animate-bounce">
                      ✨💖✨
                    </div>
                    <h4 className="font-mono font-black text-xl text-emerald-400 capitalize">REINA SILLY CATTURATA!</h4>
                    <p className="text-xs text-slate-300 font-mono">+120 XP • +25 Monete 🪙</p>
                  </div>
                )}

                {/* Escaped alert */}
                {captureStep === 'escaped' && (
                  <div className="text-center p-3 space-y-2 animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-400 mx-auto flex items-center justify-center text-3xl">
                      💨🐂
                    </div>
                    <h4 className="font-mono font-black text-lg text-red-400">Si è spezzato lo scontro!</h4>
                    <p className="text-xs text-slate-300">La Regina è sfuggita lungo i boschi.</p>
                  </div>
                )}

              </div>

            </div>

            {/* ADVENTURE CAPTURE UTILITY CONSOLE BOX */}
            <div className="bg-slate-950/95 border-b-2 border-slate-850 p-4 rounded-2xl z-10 space-y-3">

              {/* Console Log Logline */}
              <div className="text-center text-[11px] font-mono text-emerald-400 leading-none">
                📟 {captureLogMsg}
              </div>

              {captureStep === 'aiming' && (() => {
                // Probabilità stimata con la ball selezionata (stile Pokémon GO).
                const selMeta = BALL_META[selectedBallId];
                const estP = estimateCatch(encounterCow.rarity, selectedBallId, hasFedApple);
                const diff = catchDifficulty(estP);
                const pctLabel = selMeta?.mult === null ? '100%' : `${Math.round(estP * 100)}%`;
                return (
                <div className="space-y-3">

                  {/* Indicatore difficoltà di cattura (reagisce a ball + mela + rarità) */}
                  <div
                    id="catch-chance"
                    className="flex items-center justify-between rounded-xl px-3 py-1.5 border"
                    style={{ borderColor: diff.color, backgroundColor: `${diff.color}1a` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: diff.color }} />
                      <span className="text-[10px] font-mono font-black tracking-wide" style={{ color: diff.color }}>
                        CATTURA {diff.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-black" style={{ color: diff.color }}>{pctLabel}</span>
                  </div>

                  {/* Throw speed bar indicator (S4 perf: tick isolato in ThrowGauge) */}
                  <ThrowPowerBar />

                  {/* Selettore del campanaccio: una tessera per potenza di richiamo */}
                  <div id="ball-selector" className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-slate-400">
                      <span>Scegli il campanaccio</span>
                      <span className="text-slate-500">{selMeta?.bestFor}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BALL_ORDER.map(id => {
                        const meta = BALL_META[id];
                        const item = backpack.find(b => b.id === id);
                        const qty = item?.quantity ?? 0;
                        const selected = selectedBallId === id;
                        const out = qty <= 0;
                        return (
                          <button
                            key={id}
                            id={`ball-${id}`}
                            onClick={() => { if (!out) { playClickSfx(); setSelectedBallId(id); } }}
                            disabled={out}
                            title={meta.description}
                            className={`relative bg-slate-900 hover:bg-slate-850 rounded-xl py-2 px-1 flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${selected ? 'border-2' : 'border border-slate-800'}`}
                            style={selected ? { borderColor: meta.color, boxShadow: `0 0 10px ${meta.color}66` } : undefined}
                          >
                            {/* badge quantità */}
                            <span
                              className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-mono font-black flex items-center justify-center text-[#0b0820]"
                              style={{ backgroundColor: meta.color }}
                            >
                              {qty}
                            </span>
                            <span className="text-lg leading-none">{meta.emoji}</span>
                            <span className="text-[10px] font-mono font-bold mt-1 leading-tight" style={{ color: selected ? meta.color : '#cbd5e1' }}>
                              {meta.short}
                            </span>
                            <span className="text-[10px] font-mono font-black mt-0.5" style={{ color: meta.color }}>
                              {meta.mult === null ? '100%' : `×${meta.mult}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Azioni: mela alpina + lancio */}
                  <div className="grid grid-cols-[1fr_1.4fr] gap-2 py-0.5">
                    {/* Interactive Feed apple */}
                    <button
                      onClick={handleFeedApple}
                      disabled={hasFedApple || backpack.find(item => item.id === 'item-apple')?.quantity === 0}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:opacity-50 py-2 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all group"
                    >
                      <span className="text-xl group-hover:scale-125 transition-transform">🍏</span>
                      <span className="text-[9px] font-mono text-slate-300 mt-1">{hasFedApple ? 'Mela offerta!' : 'Mela Alpina'}</span>
                      <span className="text-[9px] font-bold text-emerald-400 mt-0.5">×1.5 ({backpack.find(item => item.id === 'item-apple')?.quantity || 0})</span>
                    </button>

                    {/* Launch Trigger Button */}
                    <button
                      onClick={executeThrow}
                      className="text-[#0b0820] font-mono font-black text-sm px-2 rounded-xl border-b-4 flex flex-col items-center justify-center text-center active:scale-95 cursor-pointer"
                      style={{ backgroundColor: selMeta?.color ?? '#f59e0b', borderColor: 'rgba(0,0,0,0.35)' }}
                      id="throw-btn"
                    >
                      <span className="text-lg">{selMeta?.emoji ?? '📢'}</span>
                      <span>SUONA · {selMeta?.short || ''}</span>
                    </button>
                  </div>

                </div>
                );
              })()}

              {captureStep !== 'aiming' && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => { playClickSfx(); setIsCapturingMode(false); setEncounterCow(null); }}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-mono text-xs py-2 px-8 rounded-xl cursor-pointer"
                  >
                    Torna al Sentiero
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
        </ThrowGauge>
      )}

      {/* FASE 3 — Overlay Valutazione del Giudice (sopra l'incontro) */}
      {showValutazione && encounterCow && (
        <Suspense fallback={<SceneFallback />}>
          <ValutazioneReina
            cow={encounterCow}
            playClick={playClickSfx}
            onClose={() => setShowValutazione(false)}
            onDone={(acc) => { setValutazione(acc); setShowValutazione(false); }}
          />
        </Suspense>
      )}
    </>
  );
}
