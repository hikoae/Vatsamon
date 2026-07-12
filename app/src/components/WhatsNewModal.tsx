import { motion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { CHANGELOG } from "../data/changelog";

type Props = {
  onClose: () => void;
};

/**
 * MODAL "NOVITÀ DI VERSIONE" (S19) — highlight della versione corrente in
 * evidenza, scrollabile giù allo storico delle versioni precedenti. Stesso
 * pattern degli altri modali dell'app: backdrop cliccabile + card con
 * stopPropagation (vedi ConfirmDialog.tsx / ProfileModal.tsx).
 *
 * Riusato in due punti: auto-show al mount (App.tsx, prima volta che si vede
 * una versione nuova) e riapertura manuale dal footer del Profilo — stesso
 * componente, stesso contenuto completo (versione corrente + storico).
 */
export function WhatsNewModal({ onClose }: Props) {
  const [current, ...history] = CHANGELOG;

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
      id="whats-new-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl max-h-[88dvh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="whats-new-title" className="text-lg font-mono font-black text-emerald-400 flex items-center gap-2">
            <Sparkles className="w-5 h-5" aria-hidden="true" /> Novità
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1" aria-label="Chiudi">
            <X className="w-5 h-5" />
          </button>
        </div>

        {current && (
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-mono font-black text-amber-300">v{current.version}</span>
              <span className="text-[10px] text-slate-500 font-mono">{current.date}</span>
            </div>
            <ul className="space-y-2">
              {current.highlights.map((h, i) => (
                <li key={i} className="flex gap-2.5 bg-slate-950 rounded-2xl border border-slate-850 p-3">
                  <span className="text-xl shrink-0" aria-hidden="true">{h.emoji ?? "✨"}</span>
                  <div>
                    <div className="text-[11px] font-mono font-black text-slate-200">{h.titolo}</div>
                    <p className="text-[10px] text-slate-400 leading-snug">{h.descrizione}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {history.length > 0 && (
          <div className="pt-2 border-t border-slate-850 space-y-3" id="whats-new-history">
            <div className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest">Versioni precedenti</div>
            {history.map((entry) => (
              <div key={entry.version} className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-400">v{entry.version}</span>
                  <span className="text-[9px] text-slate-600 font-mono">{entry.date}</span>
                </div>
                <ul className="space-y-0.5">
                  {entry.highlights.map((h, i) => (
                    <li key={i} className="text-[10px] text-slate-500 leading-snug flex gap-1.5">
                      <span aria-hidden="true">{h.emoji ?? "✨"}</span>
                      <span>{h.titolo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full nav-active text-white font-mono font-black text-xs py-2.5 rounded-xl border-b-4 border-emerald-800"
        >
          Fatto
        </button>
      </motion.div>
    </div>
  );
}
