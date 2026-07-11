import { AzioneId, AZIONI, SpintaState } from "../../lib/spinta";
import { Mossa, FAMIGLIE, bloccoMossa } from "../../data/mosse";

/**
 * La griglia 2×2 delle mosse (una per famiglia), condivisa dai 4 UI di
 * battaglia (BattleScene, DungeonRun, EliminatoireView, LeggendeView).
 *
 * Ogni cella ha DUE veri <button>: la mossa (flex-grow) e l'info «i» — un
 * rail destro con target touch ≥44px, marcato `data-mossa-info` così i test
 * Playwright selezionano solo le mosse con
 * `#…-moves button:not([disabled]):not([data-mossa-info])` (verify.mjs).
 * L'info resta cliccabile anche quando la mossa è bloccata/disabilitata.
 */

const HINT: Record<AzioneId, string> = Object.fromEntries(AZIONI.map((a) => [a.id, a.counterHint])) as Record<AzioneId, string>;

const RARITA_STILE: Record<Mossa["rarita"], string> = {
  comune: "border-slate-700",
  rara: "border-sky-700/60",
  speciale: "border-amber-600/70",
  leggendaria: "border-fuchsia-600/70",
};

export function MossePanel({ id, mosse, st, busy, onMossa, onInfo, famiglieAbilitate, hintDisabilitata }: {
  id: string;
  mosse: Record<AzioneId, Mossa>;
  st: SpintaState;
  busy: boolean;
  onMossa: (m: Mossa) => void;
  onInfo: (m: Mossa) => void;
  /** Modalità guidata (tutorial): solo queste famiglie sono giocabili. */
  famiglieAbilitate?: AzioneId[];
  /** Testo mostrato sulle famiglie spente in modalità guidata. */
  hintDisabilitata?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" id={id}>
      {FAMIGLIE.map((fam) => {
        const m = mosse[fam];
        const blocco = bloccoMossa(m, st, "p");
        const guidataOff = famiglieAbilitate ? !famiglieAbilitate.includes(fam) : false;
        const disabled = busy || !!blocco || guidataOff;
        const usiLeft = m.usiMax !== undefined ? m.usiMax - (st.usiMosse?.[`p:${m.id}`] ?? 0) : null;
        return (
          <div key={fam} className={`flex rounded-xl border overflow-hidden bg-slate-900 transition-all hover:border-amber-500/60 ${RARITA_STILE[m.rarita]}`}>
            <button
              onClick={() => onMossa(m)}
              disabled={disabled}
              className="flex-grow min-w-0 text-left p-2 min-h-[44px] disabled:opacity-40"
            >
              <div className="text-[11px] font-mono font-black text-slate-100 leading-tight">
                {m.emoji} {m.nome}
                {usiLeft !== null && <span className="ml-1 text-[9px] text-amber-400">×{Math.max(0, usiLeft)}</span>}
              </div>
              <div className="text-[10px] font-mono text-amber-500/90 leading-tight mt-0.5">
                {guidataOff && hintDisabilitata ? hintDisabilitata : blocco ? `🔒 ${blocco}` : HINT[fam]}
              </div>
            </button>
            <button
              type="button"
              data-mossa-info
              aria-label={`Come funziona ${m.nome}`}
              onClick={(e) => { e.stopPropagation(); onInfo(m); }}
              className="shrink-0 w-11 min-h-[44px] flex items-center justify-center border-l border-slate-800 text-sky-400"
            >
              <span className="text-[10px] font-mono font-black bg-slate-800 border border-slate-700 rounded-full min-w-[18px] min-h-[18px] flex items-center justify-center">i</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
