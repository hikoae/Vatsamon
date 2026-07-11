/**
 * MÉMÉ DI NUS — la bubble-guida del tutorial (beat giocati, mai slide).
 * Fissa sopra la bottom-nav (z-45 > nav z-40), NON blocca l'input: il
 * giocatore GIOCA il beat (cammina, nutre, spinge) mentre Mémé parla.
 */
export function MemeGuide({ testo, labelAvanti, onAvanti, onSalta, playClick }: {
  testo: string;
  /** Se presente, il beat avanza col bottone; se assente, avanza giocando. */
  labelAvanti?: string;
  onAvanti?: () => void;
  onSalta?: () => void;
  playClick: () => void;
}) {
  return (
    <div className="fixed inset-x-3 bottom-24 z-[45] max-w-md mx-auto animate-fade-in" id="meme-guide">
      <div className="flex items-start gap-2.5 bg-slate-900/95 border-2 border-[#c8102e]/50 rounded-2xl p-3 shadow-2xl backdrop-blur">
        <span className="text-3xl drop-shadow" aria-hidden="true">👵</span>
        <div className="flex-grow min-w-0">
          <div className="text-[9px] font-mono uppercase tracking-widest text-rose-400">Mémé di Nus</div>
          <p className="text-[11px] text-slate-200 leading-snug mt-0.5">{testo}</p>
          <div className="flex items-center gap-3 mt-2">
            {onAvanti && labelAvanti && (
              <button
                onClick={() => { playClick(); onAvanti(); }}
                className="nav-active text-white font-mono font-black text-[11px] py-1.5 px-4 rounded-xl"
              >
                {labelAvanti}
              </button>
            )}
            {onSalta && (
              <button
                onClick={() => { playClick(); onSalta(); }}
                className="text-[9px] font-mono text-slate-500 underline underline-offset-2"
              >
                Salta la lezione
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
