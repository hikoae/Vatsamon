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
 *
 * LAYOUT (2026-07-31): questo pannello è renderizzato PRIMA di `StallaScreen`,
 * quindi era il primo blocco della schermata Stalla — 216px a 393px di
 * larghezza (231 su iPhone SE) di sola spiegazione prima di qualcosa di
 * azionabile. Riordinato con lo stesso criterio della Stalla: in testa cosa si
 * può fare e cosa serve (quanti capi sono all'arp, quante cure restano oggi,
 * se l'inarpa è aperta), la spiegazione lunga in un "Come funziona"
 * richiudibile in fondo. Nessun testo è stato tolto: il paragrafo che stava in
 * cima è dentro il details, parola per parola.
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
  // Il gesto di cura è uno al giorno reale: quante cure restano da dare è
  // l'unica cosa del pannello che scade, quindi va detta in testata.
  const daCurare = allArp.filter((c) => arp.capi[c.id].ultimaCura !== oggi).length;
  const stato = allArp.length > 0
    ? `${allArp.length} all'arp${daCurare > 0 ? ` · ${daCurare} da curare` : ""}`
    : inalpaAperta ? "Inalpa aperta" : "Si sale a metà giugno";

  return (
    <div className="bg-gradient-to-br from-sky-950/40 to-slate-950 border border-sky-800/40 rounded-3xl p-4 space-y-3" id="arp-panel">
      {/* Testata: nome del pannello e stato operativo su una riga sola. */}
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="h-section text-sky-300 flex-shrink-0">⛰️ L'Arp</h2>
        <span className="t-meta text-slate-500 text-right" id="arp-stato">{stato}</span>
      </div>

      {/* capi all'arp — il gesto di cura quotidiano, l'azione ricorrente */}
      {allArp.length > 0 && (
        <div className="space-y-1.5" id="arp-capi">
          {allArp.map((c) => {
            const capo = arp.capi[c.id];
            const curataOggi = capo.ultimaCura === oggi;
            const versoFontina = capo.giorniCura % ARP_GIORNI_PER_FONTINA;
            return (
              // Capo sopra, bottoni su una riga propria: tutto affiancato, a
              // 375px il dato andava a capo e "Cura (+2 kg)" pure, dentro un
              // bersaglio di 61×52. Così la riga cresce (68 → 108px) ma il dato
              // sta su una riga sola e i due bottoni sono 44px pieni.
              <div key={c.id} className="bg-slate-900/60 rounded-xl p-2 border border-sky-800/40 space-y-2">
                <div className="flex items-center gap-2">
                  {/* Box 16:9 come la sorgente + `fit="cover"` (contratto in
                      CowVisual): nel riquadro quadrato la Reina rendeva 40×22 e
                      lasciava vuoto il 44% del bollo. Stesso taglio della riga
                      "nati in stalla" di StallaScreen. */}
                  <CowVisual cow={c} fit="cover" className="w-16 aspect-[16/9] flex-shrink-0" />
                  <div className="min-w-0 flex-grow">
                    <div className="h-card text-slate-100 truncate">
                      {c.name} <span className="t-meta text-sky-300">· all'arp</span>
                    </div>
                    <div className="t-body text-slate-400">
                      {c.peso_kg ?? "—"} kg · {capo.giorniCura} gg di cura ·{" "}
                      <span className="tone-reward">🧀 fra {ARP_GIORNI_PER_FONTINA - versoFontina} gg</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    data-arp-cura={c.id}
                    disabled={curataOggi}
                    onClick={() => { playClick(); onCura(c.id); }}
                    className="is-disabled h-card flex-grow px-2.5 rounded-lg border border-sky-600/50 bg-sky-500/10 text-sky-300 min-h-[44px]"
                  >
                    {curataOggi ? "✓ curata oggi" : `🌿 Cura (+${ARP_KG_PER_CURA} kg)`}
                  </button>
                  <button
                    data-arp-scendi={c.id}
                    onClick={() => { playClick(); onScendi(c.id); }}
                    aria-label={`Fai scendere ${c.name} a valle`}
                    className="h-card px-3 rounded-lg border border-slate-800 text-slate-400 min-h-[44px] flex-shrink-0"
                  >
                    ⬇ valle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* inarpa (solo durante la pausa) */}
      {inalpaAperta && aValle.length > 0 && (
        <div>
          <div className="t-meta text-slate-500 mb-1.5">Manda all'arp · non gareggia</div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {aValle.map((c) => (
              <button key={c.id} data-arp-sali={c.id} onClick={() => { playClick(); onInarpa(c.id); }}
                aria-label={`Manda ${c.name} all'arp`}
                className="flex-shrink-0 rounded-xl border-2 border-slate-700 bg-slate-900/70 p-1.5 hover:border-sky-500/60">
                {/* idem: 16:9 + `cover`. La riga scorre in orizzontale, quindi la
                    scheda più larga non stringe nulla; il nome sotto segue la
                    stessa larghezza della foto per restare centrato. */}
                <CowVisual cow={c} fit="cover" className="w-16 aspect-[16/9]" />
                <div className="t-meta text-slate-300 truncate w-16 text-center">{c.name}</div>
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
          <div className="h-card tone-reward">🌸 È il giorno della Désarpa! (29/9)</div>
          <div className="t-body text-slate-300 mt-0.5">
            La mandria scende a valle in festa: si incoronano la <b className="text-rose-300">Reina di corne</b> (fiori
            rossi, la più combattiva) e la <b className="text-slate-100">Reine du lait</b> (fiori bianchi, la più
            produttiva all'alpe).
          </div>
        </button>
      )}
      {cerimonia?.celebrata && (
        <div className="rounded-xl border border-amber-700/40 bg-slate-900/60 p-2.5 t-body text-slate-300" id="desarpa-esito">
          🌸 Désarpa {anno}: <b className="text-rose-300">🌹 {cerimonia.corne ?? "—"}</b> (Reina di corne) ·{" "}
          <b className="text-slate-100">🤍 {cerimonia.lait ?? "—"}</b> (Reine du lait)
        </div>
      )}

      {/* La spiegazione lunga sta DOPO le azioni e chiusa: il pannello apre la
          schermata Stalla, e chi sa già cosa fare non deve scavalcarla ogni
          volta. Testo identico a quello che stava in testa al pannello. */}
      <details className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2" id="arp-come-funziona">
        <summary className="t-meta text-slate-400 cursor-pointer">Come funziona l'alpeggio</summary>
        <p className="t-body text-slate-300 mt-1.5">
          {inalpaAperta
            ? "È l'inalpa: le batailles si fermano perché le mandrie salgono all'alpe. Un gesto di cura al giorno fa crescere il peso; l'alpe rende Fontina."
            : "L'inarpa si fa a metà giugno (pausa della stagione). Chi è ancora all'alpe cresce ma non gareggia."}
        </p>
      </details>
    </div>
  );
}
