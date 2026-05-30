import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GraduationCap, Check, X as XIcon, RotateCw } from "lucide-react";
import { QUIZ_QUESTIONS } from "../data/quiz";

const DIFF_COLOR: Record<string, string> = {
  Facile: "text-emerald-400",
  Medio: "text-amber-400",
  Difficile: "text-rose-400",
};

/**
 * Scuola d'Alpeggio: quiz educativo a punti (rispetto animali/sentieri/Fontina/
 * Batailles). Flusso: domanda → opzioni → feedback+spiegazione → punteggio →
 * ricompensa monete/XP a fine quiz. Tutto statico, nessun fetch.
 */
export function QuizScreen({
  bestScore,
  onFinish,
}: {
  bestScore: number;
  onFinish: (correct: number, total: number) => void;
}) {
  const total = QUIZ_QUESTIONS.length;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUIZ_QUESTIONS[index];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.correctAnswerIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= total) {
      setDone(true);
      onFinish(score, total);
    } else {
      setIndex((n) => n + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    const perfect = score === total;
    return (
      <div className="max-w-md mx-auto bg-slate-950 border border-slate-850 rounded-3xl p-6 text-center space-y-4">
        <div className="text-5xl">{perfect ? "🏆" : score >= total / 2 ? "🧀" : "🥾"}</div>
        <h2 className="text-xl font-mono font-black text-emerald-400">Scuola d'Alpeggio completata!</h2>
        <p className="text-sm text-slate-300 font-mono">
          Hai risposto correttamente a <b className="text-amber-300">{score}/{total}</b> domande.
        </p>
        <div className="bg-emerald-950/40 border border-emerald-900 rounded-2xl p-3 text-[11px] font-mono text-emerald-200">
          Ricompensa: <b>+{score * 10} 🪙</b> · <b>+{score * 30} XP</b>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">Miglior risultato: {Math.max(bestScore, score)}/{total}</p>
        <button
          onClick={restart}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs py-3 rounded-xl border-b-4 border-emerald-800 flex items-center justify-center gap-1.5"
        >
          <RotateCw className="w-4 h-4" /> Rigioca
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-mono font-black text-emerald-400 flex items-center gap-1.5 uppercase">
            <GraduationCap className="w-5 h-5" /> Scuola d'Alpeggio
          </h2>
          <span className="text-[10px] font-mono font-bold text-slate-400">
            {index + 1}/{total} · <span className={DIFF_COLOR[q.difficulty]}>{q.difficulty}</span>
          </span>
        </div>

        {/* progress */}
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(index / total) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            <p className="text-sm font-mono font-bold text-slate-100 leading-relaxed">{q.question}</p>

            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correctAnswerIndex;
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
                      {picked !== null && isCorrect ? <Check className="w-3.5 h-3.5" /> : picked !== null && isPicked ? <XIcon className="w-3.5 h-3.5" /> : <span className="text-slate-500">{String.fromCharCode(65 + i)}</span>}
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
                className={`rounded-2xl p-3 text-[11px] leading-relaxed border ${picked === q.correctAnswerIndex ? "bg-emerald-950/40 border-emerald-900 text-emerald-100" : "bg-rose-950/30 border-rose-900 text-rose-100"}`}
              >
                <b>{picked === q.correctAnswerIndex ? "Corretto! " : "Sbagliato. "}</b>
                {q.explanation}
              </motion.div>
            )}

            {picked !== null && (
              <button
                onClick={next}
                id="quiz-next-btn"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs py-3 rounded-xl border-b-4 border-emerald-800"
              >
                {index + 1 >= total ? "Vedi risultato" : "Prossima domanda →"}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
