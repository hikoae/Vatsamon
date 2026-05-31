import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X as XIcon, Leaf } from "lucide-react";
import { ResponsibleQuestion } from "../data/responsibleQuestions";

/**
 * FASE 4 — Incontro educativo casuale lungo il sentiero.
 *
 * Un guardaparco/pastore ti ferma e pone UNA domanda di comportamento
 * responsabile in montagna (3 opzioni). La risposta determina la ricompensa:
 *  - giusta → +Rispetto + monete/XP;
 *  - sbagliata → -Rispetto + spiegazione educativa.
 *
 * Il componente è solo UI: la logica (punteggio, ricompense) vive in App.tsx
 * tramite la callback `onResolved(correct)`. Stile coerente con QuizScreen, ma
 * in un modale a tutto schermo (è un incontro "in cammino", non una schermata).
 */
export function RespectEncounter({
  question,
  onResolved,
}: {
  question: ResponsibleQuestion;
  /** Chiamata quando il giocatore chiude l'incontro, con l'esito. */
  onResolved: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked !== null && picked === question.indiceCorretto;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/95 z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-scale-in"
      id="respect-encounter"
    >
      <div className="w-full max-w-md bg-slate-950 border border-emerald-500/40 rounded-3xl p-5 space-y-4 shadow-2xl">
        {/* Intestazione: chi ti ferma sul sentiero */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
            {question.emoji}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-black text-sm uppercase">
              <Leaf className="w-4 h-4 shrink-0" />
              <span className="truncate">{question.npc}</span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
              Esplorazione responsabile · {question.topic}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            <p className="text-sm font-mono font-bold text-slate-100 leading-relaxed">
              {question.domanda}
            </p>

            <div className="space-y-2">
              {question.opzioni.map((opt, i) => {
                const isCorrect = i === question.indiceCorretto;
                const isPicked = picked === i;
                let cls = "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-850";
                if (picked !== null) {
                  if (isCorrect) cls = "bg-emerald-950/60 border-emerald-500 text-emerald-200";
                  else if (isPicked) cls = "bg-rose-950/60 border-rose-500 text-rose-200";
                  else cls = "bg-slate-900 border-slate-850 text-slate-500";
                }
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={picked !== null}
                    className={`w-full text-left text-[12px] font-mono px-3 py-2.5 rounded-xl border transition-all flex items-start gap-2 ${cls}`}
                  >
                    <span className="flex-shrink-0 mt-0.5">
                      {picked !== null && isCorrect ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : picked !== null && isPicked ? (
                        <XIcon className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-slate-500">{String.fromCharCode(65 + i)}</span>
                      )}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {picked !== null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-3 text-[11px] leading-relaxed border ${
                  correct
                    ? "bg-emerald-950/40 border-emerald-900 text-emerald-100"
                    : "bg-rose-950/30 border-rose-900 text-rose-100"
                }`}
              >
                <b>
                  {correct
                    ? "Bravo! Rispetto della montagna +6 🌿 "
                    : "Attenzione. Rispetto della montagna -4 🌿 "}
                </b>
                {question.spiegazione}
              </motion.div>
            )}

            {picked !== null && (
              <button
                onClick={() => onResolved(correct)}
                id="respect-continue-btn"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs py-3 rounded-xl border-b-4 border-emerald-800"
              >
                Riprendi il cammino →
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
