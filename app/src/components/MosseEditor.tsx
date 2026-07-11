import { useState } from "react";
import { AzioneId, AZIONI } from "../lib/spinta";
import { Mossa, MOSSE_BASE, MOSSE_PER_FAMIGLIA, FAMIGLIE, mosseEquipaggiate } from "../data/mosse";
import { COSTO_MEME, MOSSE_TRIGGERS, scuolaState } from "../lib/scuola";
import { MossaInfoSheet } from "./battle/MossaInfoSheet";
import { Vatsamon } from "../types";

/**
 * L'ANGOLO DELLE MOSSE — nel dettaglio Reina del Libretto: 4 slot, uno per
 * famiglia (così ogni postura ha sempre una risposta e la griglia resta 2×2).
 * Si equipaggia tra base + mosse apprese; le altre stanno in silhouette con
 * l'indizio del gesto che le insegna (come il patois nel Profilo). Le mosse
 * del catalogo globale si possono comprare da Mémé in Forme di Fontina.
 */

const FAMIGLIA_LABEL: Record<AzioneId, string> = Object.fromEntries(AZIONI.map((a) => [a.id, `${a.emoji} ${a.label}`])) as Record<AzioneId, string>;

export function MosseEditor({ cow, fontina, onEquip, onLearnFromMeme, playClick }: {
  cow: Vatsamon;
  fontina: number;
  /** Scrive cow.mosse (4 id, uno per famiglia); ritorna la scheda aggiornata. */
  onEquip: (cow: Vatsamon, mosse: string[]) => Vatsamon;
  /** Mémé insegna dal catalogo globale per Fontina; null se non basta. */
  onLearnFromMeme: (cow: Vatsamon, mossaId: string, costo: number) => Vatsamon | null;
  playClick: () => void;
}) {
  const [aperta, setAperta] = useState<AzioneId | null>(null);
  const [info, setInfo] = useState<Mossa | null>(null);
  const equip = mosseEquipaggiate(cow);
  const apprese = new Set(cow.mosseApprese ?? []);
  const globali = new Set(scuolaState().sbloccateGlobali);

  const equipaggia = (fam: AzioneId, m: Mossa) => {
    playClick();
    const next = FAMIGLIE.map((f) => (f === fam ? m.id : equip[f].id));
    onEquip(cow, next);
    setAperta(null);
  };

  const conosciuta = (m: Mossa) => m.id === MOSSE_BASE[m.famiglia] || apprese.has(m.id) || equip[m.famiglia].id === m.id;

  return (
    <div className="border-t border-slate-850 pt-3 text-left space-y-2" id="mosse-editor">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400">🎓 Le sue mosse (una per famiglia)</h4>
        <span className="text-[9px] font-mono text-slate-500">{apprese.size} apprese</span>
      </div>

      {FAMIGLIE.map((fam) => {
        const m = equip[fam];
        const alternativa = MOSSE_PER_FAMIGLIA[fam].length > 1;
        return (
          <div key={fam}>
            <button
              onClick={() => { playClick(); setAperta(aperta === fam ? null : fam); }}
              className="w-full flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2"
            >
              <div className="text-left">
                <div className="text-[9px] font-mono text-slate-500">{FAMIGLIA_LABEL[fam]}</div>
                <div className="text-[11px] font-mono font-black text-slate-100">{m.emoji} {m.nome}</div>
              </div>
              {alternativa && <span className="text-[10px] font-mono text-amber-400">{aperta === fam ? "▲" : "cambia ▼"}</span>}
            </button>

            {aperta === fam && (
              <div className="mt-1.5 space-y-1.5 pl-2 border-l-2 border-slate-800">
                {MOSSE_PER_FAMIGLIA[fam].map((alt) => {
                  const nota = conosciuta(alt);
                  const inCatalogo = globali.has(alt.id);
                  const costo = COSTO_MEME[alt.rarita];
                  const attiva = equip[fam].id === alt.id;
                  return (
                    <div key={alt.id} className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${attiva ? "border-emerald-600/60 bg-emerald-950/30" : "border-slate-800 bg-slate-950/50"} ${nota ? "" : "opacity-70"}`}>
                      <div className="flex-grow min-w-0">
                        <div className={`text-[11px] font-mono font-black ${nota ? "text-slate-100" : "text-slate-500"}`}>
                          {nota ? alt.emoji : "❔"} {alt.nome}
                          <button
                            onClick={() => { playClick(); setInfo(alt); }}
                            aria-label={`Come funziona ${alt.nome}`}
                            className="ml-1.5 text-[9px] text-sky-400 bg-slate-800 border border-slate-700 rounded-full px-1.5"
                          >i</button>
                        </div>
                        <div className="text-[9px] text-slate-500 leading-snug">
                          {nota ? alt.comeFunziona : `Si impara: ${MOSSE_TRIGGERS[alt.id] ?? "giocando"}.`}
                        </div>
                      </div>
                      {nota ? (
                        attiva
                          ? <span className="text-[9px] font-mono text-emerald-500 shrink-0">in campo</span>
                          : <button onClick={() => equipaggia(fam, alt)} className="shrink-0 text-[10px] font-mono font-black bg-amber-500 text-[#0b0820] rounded-lg px-2 py-1">Equipaggia</button>
                      ) : inCatalogo ? (
                        <button
                          onClick={() => { playClick(); onLearnFromMeme(cow, alt.id, costo); }}
                          disabled={fontina < costo}
                          className="shrink-0 text-[9px] font-mono font-black bg-slate-800 border border-amber-700/50 text-amber-300 rounded-lg px-2 py-1 disabled:opacity-40"
                        >
                          Mémé insegna · {costo} 🧀
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[9px] text-slate-500 leading-snug">
        Le mosse si guadagnano giocando: Razione d'Alpeggio, imprese in spinta, eredità di stalla.
        Quelle già sbloccate da una tua Reina, Mémé le insegna alle altre per qualche Forma di Fontina.
      </p>

      {info && <MossaInfoSheet mossa={info} onClose={() => setInfo(null)} playClick={playClick} />}
    </div>
  );
}
