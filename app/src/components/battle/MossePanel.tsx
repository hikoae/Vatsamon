import { AzioneId, AZIONI, SpintaState } from "../../lib/spinta";
import { Mossa, FAMIGLIE, bloccoMossa } from "../../data/mosse";

/**
 * La griglia 2×2 delle mosse (una per famiglia), condivisa dai 4 UI di
 * battaglia (BattleScene, DungeonRun, EliminatoireView, LeggendeView).
 *
 * VINCOLO PLAYWRIGHT (scripts/verify.mjs): dentro il contenitore `id` devono
 * esserci ESATTAMENTE 4 <button> — il selettore è `#…-moves button:not([disabled])`
 * e clicca il primo per giocare. Per questo l'icona ⓘ è uno <span role="button">
 * fuori dal bottone (posizionato sopra), mai un <button> in più: così resta
 * cliccabile anche quando la mossa è bloccata/disabilitata.
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
          <div key={fam} className="relative">
            <button
              onClick={() => onMossa(m)}
              disabled={disabled}
              className={`w-full h-full text-left rounded-xl border p-2 pr-6 transition-all disabled:opacity-40 bg-slate-900 hover:border-amber-500/60 ${RARITA_STILE[m.rarita]}`}
            >
              <div className="text-[11px] font-mono font-black text-slate-100 leading-tight">
                {m.emoji} {m.nome}
                {usiLeft !== null && <span className="ml-1 text-[9px] text-amber-400">×{Math.max(0, usiLeft)}</span>}
              </div>
              <div className="text-[10px] font-mono text-amber-500/90 leading-tight mt-0.5">
                {guidataOff && hintDisabilitata ? hintDisabilitata : blocco ? `🔒 ${blocco}` : HINT[fam]}
              </div>
            </button>
            <span
              role="button"
              tabIndex={0}
              aria-label={`Come funziona ${m.nome}`}
              onClick={() => onInfo(m)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onInfo(m); }}
              className="absolute top-1.5 right-1.5 text-[10px] font-mono font-black text-sky-400 bg-slate-800 border border-slate-700 rounded-full min-w-[18px] min-h-[18px] flex items-center justify-center cursor-pointer"
            >
              i
            </span>
          </div>
        );
      })}
    </div>
  );
}
