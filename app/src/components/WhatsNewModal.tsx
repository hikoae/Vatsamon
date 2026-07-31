import { motion } from "motion/react";
import { X } from "lucide-react";
import { useScrollLock } from "../lib/useScrollLock";
import { CHANGELOG } from "../data/changelog";

type Props = {
  onClose: () => void;
  /**
   * "novita" (default) — cosa è CAMBIATO in questa versione: intro, highlight
   * della versione corrente e storico. È quello che vede chi aggiorna.
   * "benvenuto" — chi ha appena installato non ha un "prima" con cui
   * confrontarsi: niente elenco di cambiamenti e niente storico, solo cos'è
   * Vatsamon e qual è la prima cosa da fare.
   */
  variant?: "novita" | "benvenuto";
};

/**
 * Copia della variante "benvenuto" (primo avvio). Registro dell'app: caldo,
 * concreto, valdostano — mai markettaro. La stagione reale è citata solo con
 * il dato confermato (finale del 25 ottobre): niente orari, niente numero di
 * finaliste, che le fonti ufficiali non pubblicano o riportano in disaccordo.
 */
const BENVENUTO_PARAGRAFI = [
  "Benvenuto in Vatsamon. Qui le Batailles de Reines diventano un gioco: esplora l'alpeggio, cattura le tue Reines, allenale e portale a spingere.",
  "Intanto la stagione vera va avanti — puoi seguirla tappa dopo tappa fino alla finale del 25 ottobre.",
];
const BENVENUTO_PRIMO_PASSO = "Si comincia dall'Alpeggio: cerca una Reina vicino a te.";

/**
 * MODAL "NOVITÀ DI VERSIONE" (S19) — highlight della versione corrente in
 * evidenza, scrollabile giù allo storico delle versioni precedenti. Stesso
 * pattern degli altri modali dell'app: backdrop cliccabile + card con
 * stopPropagation (vedi ConfirmDialog.tsx / ProfileModal.tsx).
 *
 * Riusato in due punti: auto-show al mount (App.tsx, prima volta che si vede
 * una versione nuova) e riapertura manuale dal footer del Profilo — stesso
 * componente, stesso contenuto completo (versione corrente + storico).
 *
 * La prop `variant` cambia il contenuto senza cambiare il guscio: entrambe le
 * chiamate esistenti restano valide perché il default è "novita".
 */
export function WhatsNewModal({ onClose, variant = "novita" }: Props) {
  useScrollLock(true);
  const [current, ...history] = CHANGELOG;
  const benvenuto = variant === "benvenuto";

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-xs"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      onClick={onClose}
      id="whats-new-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      {/* GUSCIO — il filo verde è un'ECCEZIONE CONSAPEVOLE alla regola "verde =
          solo semantica positiva": non è uno stato (non dice "è andata bene",
          non veste testo né controlli), è la cornice con cui in questa app si
          stacca una superficie sovrapposta dal fondo, ed è la stessa su sette
          superfici (Profilo, cattura, incontro Rispetto, toast di
          aggiornamento, salita di livello, mappe). Toglierlo qui e nel Profilo
          li scollegherebbe dal resto dell'app senza rendere il sistema più
          coerente: se va cambiato, va cambiato in blocco, e non è lavoro di
          questa modale. Le due modali sorelle restano identiche. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl max-w-md w-full px-5 pb-0 pt-0 space-y-4 shadow-2xl overflow-y-auto no-scrollbar"
        style={{ maxHeight: 'calc(88dvh - env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between sticky top-0 z-10 bg-slate-900 -mx-5 px-5 pt-5 pb-3 rounded-t-3xl">
          {/* Stesso trattamento del titolo del Profilo (`.h-section` + inchiostro
              + glifo davanti): sono due modali sorelle e il titolo è il primo
              punto in cui si vedeva che erano state disegnate da due mani
              diverse. Il verde se ne va per due motivi che vanno nella stessa
              direzione: nel contratto colore vuol dire "è andata bene" (qui non
              significa niente) e il gradino tipografico unico è `.h-section`.
              La riconoscibilità non la portava il colore ma la scintilla: resta,
              come emoji — la stessa che il changelog usa di default per gli
              highlight, e la stessa forma di titolo (emoji + Fraunces) del
              Profilo. `aria-hidden` così il nome accessibile del dialog resta
              "Novità"/"Benvenuto" pulito. */}
          <h3 id="whats-new-title" className="h-section text-slate-100 flex items-center gap-2">
            <span aria-hidden="true">✨</span> {benvenuto ? "Benvenuto" : "Novità"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1"
            aria-label={benvenuto ? "Chiudi il benvenuto" : "Chiudi le novità"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {benvenuto ? (
          <div className="space-y-2.5" id="whats-new-benvenuto">
            {BENVENUTO_PARAGRAFI.map((p, i) => (
              <p key={i} className="text-[11px] text-slate-300 leading-relaxed">{p}</p>
            ))}
            <div className="flex items-center gap-2.5 bg-slate-950 rounded-2xl border border-slate-850 p-3">
              <span className="text-xl shrink-0" aria-hidden="true">⛰️</span>
              <p className="text-[11px] font-mono font-black text-slate-200 leading-snug">{BENVENUTO_PRIMO_PASSO}</p>
            </div>
          </div>
        ) : (
          <>
            {current && (
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-mono font-black text-amber-300">v{current.version}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{current.date}</span>
                </div>
                {current.intro && (
                  <p className="text-[11px] text-slate-300 leading-relaxed">{current.intro}</p>
                )}
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
          </>
        )}

        {/* Il "Fatto" resta agganciato in fondo alla card: con il changelog
            intero la card nasce scrollata e prima il bottone finiva fuori
            schermo. La pb-5 della card vive qui, così `sticky bottom-0` si
            allinea davvero al bordo interno e niente scorre nel gap. */}
        <div className="sticky bottom-0 z-10 bg-slate-900 -mx-5 px-5 pt-3 pb-5 rounded-b-3xl">
          {/* CTA della modale → `.btn-primary`, la stessa classe di "IMPORTA
              SALVATAGGIO" nel Profilo. Prima era `.nav-active`, cioè la pillola
              della tab-bar: stesso cremisi, ma si portava dietro anche il
              `translateY(-2px)` e il pop di quella pillola, su un bottone che
              non è una tab. Il bevel lo dà ora `border-color` del contratto
              (--color-primary-strong) sulla `border-b-4`; `text-white` e
              `border-rose-100` erano ridondanti — `.btn-primary` sta fuori dai
              @layer e le vincerebbe comunque. */}
          <button
            onClick={onClose}
            className="w-full btn-primary font-mono font-black text-xs min-h-[44px] py-2.5 rounded-xl border-b-4"
          >
            Fatto
          </button>
        </div>
      </motion.div>
    </div>
  );
}
