import { Vatsamon } from "../types";
import { CowVisual } from "./CowVisual";
import { ArpState, desarpaDisponibile, ARP_KG_PER_CURA, ARP_GIORNI_PER_FONTINA } from "../data/arp";
import { FaseId } from "../data/fase";

/**
 * L'ARP — pannello dell'alpeggio nella Stalla. Durante l'inalpa (la pausa
 * reale della stagione) i capi salgono all'alpe: un gesto di cura al giorno
 * reale li fa crescere di peso, e l'alpe rende Fontina. Chi è all'arp non
 * gareggia. Alla désarpa (29/9) la cerimonia incorona le regine della TUA
 * mandria: Reina di corne (fiori rossi) e Reine du lait (fiori bianchi).
 */
export function ArpPanel({ fase, oggi, collection, arp, onInarpa, onCura, onScendi, onDesarpa, playClick }: {
  fase: FaseId;
  oggi: string;
  collection: Vatsamon[];
  arp: ArpState;
  onInarpa: (cowId: string) => void;
  onCura: (cowId: string) => void;
  onScendi: (cowId: string) => void;
  onDesarpa: () => void;
  playClick: () => void;
}) {
  const anno = oggi.slice(0, 4);
  const allArp = collection.filter((c) => arp.capi[c.id]);
  const aValle = collection.filter((c) => !arp.capi[c.id]);
  const inalpaAperta = fase === "inalpa";
  const desarpaPronta = desarpaDisponibile(oggi, arp);
  const cerimonia = arp.desarpa[anno];

  return (
    <div className="bg-gradient-to-br from-sky-950/40 to-slate-950 border border-sky-800/40 rounded-3xl p-4 space-y-3" id="arp-panel">
      <div>
        <h2 className="text-base font-black text-sky-300 uppercase tracking-wide">⛰️ L'Arp — l'alpeggio</h2>
        <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
          {inalpaAperta
            ? "È l'inalpa: le batailles si fermano perché le mandrie salgono all'alpe. Un gesto di cura al giorno fa crescere il peso; l'alpe rende Fontina."
            : "L'inarpa si fa a metà giugno (pausa della stagione). Chi è ancora all'alpe cresce ma non gareggia."}
        </p>
      </div>

      {/* capi all'arp */}
      {allArp.length > 0 && (
        <div className="space-y-1.5" id="arp-capi">
          {allArp.map((c) => {
            const capo = arp.capi[c.id];
            const curataOggi = capo.ultimaCura === oggi;
            const versoFontina = capo.giorniCura % ARP_GIORNI_PER_FONTINA;
            return (
              <div key={c.id} className="flex items-center gap-2 bg-slate-900/60 rounded-xl p-2 border border-sky-800/40">
                <CowVisual cow={c} className="w-10 h-10 flex-shrink-0" />
                <div className="min-w-0 flex-grow">
                  <div className="text-[11px] font-mono font-black text-slate-100 truncate">{c.name} <span className="text-[9px] text-sky-400">· all'arp</span></div>
                  <div className="text-[9.5px] font-mono text-slate-400">
                    {c.peso_kg ?? "—"} kg · {capo.giorniCura} gg di cura · 🧀 fra {ARP_GIORNI_PER_FONTINA - versoFontina} gg
                  </div>
                </div>
                <button
                  data-arp-cura={c.id}
                  disabled={curataOggi}
                  onClick={() => { playClick(); onCura(c.id); }}
                  className={`text-[10px] font-mono font-black px-2.5 py-2 rounded-lg border min-h-[40px] ${curataOggi ? "border-slate-850 bg-slate-900/50 text-slate-600" : "border-sky-600/50 bg-sky-500/10 text-sky-300"}`}
                >
                  {curataOggi ? "✓ curata" : `🌿 Cura (+${ARP_KG_PER_CURA} kg)`}
                </button>
                <button
                  data-arp-scendi={c.id}
                  onClick={() => { playClick(); onScendi(c.id); }}
                  aria-label={`Fai scendere ${c.name} a valle`}
                  className="text-[10px] font-mono px-2 py-2 rounded-lg border border-slate-800 text-slate-400 min-h-[40px]"
                >
                  ⬇ valle
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* inarpa (solo durante la pausa) */}
      {inalpaAperta && aValle.length > 0 && (
        <div>
          <div className="text-[9px] font-mono uppercase text-slate-500 mb-1">Manda all'arp (non potrà gareggiare finché è su):</div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {aValle.map((c) => (
              <button key={c.id} data-arp-sali={c.id} onClick={() => { playClick(); onInarpa(c.id); }}
                className="flex-shrink-0 rounded-xl border-2 border-slate-700 bg-slate-900/70 p-1.5 hover:border-sky-500/60">
                <CowVisual cow={c} className="w-10 h-10" />
                <div className="text-[9px] font-mono text-slate-300 truncate w-10 text-center">{c.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LA DÉSARPA — cerimonia annuale */}
      {desarpaPronta && (
        <button
          id="desarpa-btn"
          onClick={() => { playClick(); onDesarpa(); }}
          className="w-full rounded-xl border-2 border-amber-500 bg-amber-500/10 p-3 text-left animate-pulse"
        >
          <div className="text-sm font-black text-amber-300">🌸 È il giorno della Désarpa! (29/9)</div>
          <div className="text-[10px] text-slate-300 leading-snug mt-0.5">
            La mandria scende a valle in festa: si incoronano la <b className="text-rose-300">Reina di corne</b> (fiori
            rossi, la più combattiva) e la <b className="text-slate-100">Reine du lait</b> (fiori bianchi, la più
            produttiva all'alpe).
          </div>
        </button>
      )}
      {cerimonia?.celebrata && (
        <div className="rounded-xl border border-amber-700/40 bg-slate-900/60 p-2.5 text-[10px] font-mono text-slate-300" id="desarpa-esito">
          🌸 Désarpa {anno}: <b className="text-rose-300">🌹 {cerimonia.corne ?? "—"}</b> (Reina di corne) ·{" "}
          <b className="text-slate-100">🤍 {cerimonia.lait ?? "—"}</b> (Reine du lait)
        </div>
      )}
    </div>
  );
}
