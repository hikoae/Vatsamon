import { X } from "lucide-react";
import { AzioneId, AZIONI } from "../../lib/spinta";
import { Mossa } from "../../data/mosse";
import { GLOSSARIO } from "../../data/bataillesContent";

/**
 * La scheda «come funziona» di una mossa: il fix del "non spiegate
 * correttamente". Sopra la scena di battaglia (z-[80] > z-[70]), pattern
 * modale del Profilo: backdrop cliccabile + card con stopPropagation.
 */

const FAMIGLIA_LABEL: Record<AzioneId, string> = Object.fromEntries(AZIONI.map((a) => [a.id, `${a.emoji} ${a.label}`])) as Record<AzioneId, string>;

/** La matrice di counter, per famiglia, in due righe leggibili. */
const MATRICE: Record<AzioneId, { forte: string; debole: string }> = {
  incalza: { forte: "💚 chi recupera · 🌀 chi gira", debole: "🪨 chi regge (l'urto si spegne e rimbalza)" },
  reggi: { forte: "🐂 chi incalza (lo ferma e contro-guadagna)", debole: "🌀 chi gira di leno (la aggira)" },
  gira: { forte: "🪨 chi regge · 💚 chi recupera", debole: "🐂 l'incalzata frontale (ti travolge)" },
  incoraggia: { forte: "recupero pieno se l'avversaria non attacca", debole: "🐂🌀 chi attacca mentre recuperi" },
};

const RARITA_LABEL: Record<Mossa["rarita"], { label: string; classe: string }> = {
  comune: { label: "Comune", classe: "text-slate-300 border-slate-600" },
  rara: { label: "Rara", classe: "text-sky-300 border-sky-700" },
  speciale: { label: "Speciale", classe: "text-amber-300 border-amber-700" },
  leggendaria: { label: "Leggendaria", classe: "text-fuchsia-300 border-fuchsia-700" },
};

export function MossaInfoSheet({ mossa, onClose, playClick }: {
  mossa: Mossa;
  onClose: () => void;
  playClick: () => void;
}) {
  const rar = RARITA_LABEL[mossa.rarita];
  const matrice = MATRICE[mossa.famiglia];
  const glossa = mossa.glossarioKey ? GLOSSARIO.find((g) => g.chiave === mossa.glossarioKey) : undefined;
  const req = mossa.requisiti;
  const requisiti: string[] = [];
  if (mossa.usiMax !== undefined) requisiti.push(`max ${mossa.usiMax} us${mossa.usiMax === 1 ? "o" : "i"} per spinta`);
  if (req?.calmaMin !== undefined) requisiti.push(`calma ≥ ${req.calmaMin}`);
  if (req?.fiatoMin !== undefined) requisiti.push(`fiato ≥ ${req.fiatoMin}`);
  if (req?.barraMax !== undefined) requisiti.push(`solo in svantaggio (barra ≤ ${req.barraMax})`);
  if (req?.barraMin !== undefined) requisiti.push(`solo in vantaggio (barra ≥ ${req.barraMin})`);
  if (req?.turnoMin !== undefined) requisiti.push(`dal turno ${req.turnoMin}`);

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 z-[80] flex items-end sm:items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
      onClick={() => { playClick(); onClose(); }}
    >
      <div
        className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-base font-mono font-black text-slate-100">{mossa.emoji} {mossa.nome}</div>
            <div className="flex gap-1.5 mt-1">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border border-slate-600 text-slate-300">{FAMIGLIA_LABEL[mossa.famiglia]}</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${rar.classe}`}>{rar.label}</span>
            </div>
          </div>
          <button onClick={() => { playClick(); onClose(); }} aria-label="Chiudi" className="bg-slate-800 rounded-full p-1.5 min-h-[32px] min-w-[32px]"><X size={14} /></button>
        </div>

        <p className="text-[12px] text-slate-300 italic leading-snug">«{mossa.desc}»</p>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">Come funziona</div>
          <p className="text-[11px] font-mono text-slate-200 leading-snug">{mossa.comeFunziona}</p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">La matrice della piazza</div>
          <div className="text-[11px] font-mono text-emerald-500 leading-snug">Forte contro: {matrice.forte}</div>
          <div className="text-[11px] font-mono text-rose-400 leading-snug">Attenta a: {matrice.debole}</div>
        </div>

        {requisiti.length > 0 && (
          <div className="text-[10px] font-mono text-amber-400 leading-snug">⚜️ Mossa speciale: {requisiti.join(" · ")}.</div>
        )}

        {glossa && (
          <div className="text-[10px] text-slate-400 leading-snug border-t border-slate-800 pt-2">
            📖 <b className="text-slate-300">Dal mondo vero delle batailles:</b> {glossa.it}
            {glossa.patois ? ` (patois: ${glossa.patois})` : ""} — {glossa.def}
          </div>
        )}

        <p className="text-[9px] text-slate-500 italic leading-snug">
          I nomi li inventa la piazza, la tradizione è vera: ogni mossa è una spinta a corna limate — nessuna Reina si fa male, mai.
        </p>
      </div>
    </div>
  );
}
