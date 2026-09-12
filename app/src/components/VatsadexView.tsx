import { useState } from 'react';
import { BookOpen, Award, Search, X } from 'lucide-react';
import { Vatsamon } from '../types';
import { CowVisual } from './CowVisual';
import { CowCard } from './CowCard';
import { MosseEditor } from './MosseEditor';
import { REAL_TOTAL, SHOWCASE_BY_RARITY } from '../data/realCows';
import { useScrollLock } from '../lib/useScrollLock';
import { useBackCloser } from '../lib/useBackCloser';

/**
 * VATSADEX — collezione / Libretto di Mandria (vista estratta dal monolite).
 * Stato locale: ricerca, filtro rarità e scheda aperta; le azioni che toccano
 * lo stato di gioco (power-up, libera, compagno) risalgono ad App via callback.
 *
 * DIMENSIONI DEL TESTO — questo file dichiara la misura che RENDE.
 * In index.css c'è una regola di leggibilità con un ID
 * (`#vatsamon-go-app [class~="text-[9px]"]`, idem 9.5/10/10.5px) che, avendo
 * specificità di ID ed essendo fuori da ogni @layer, batte le utility
 * Tailwind: `text-[9px]` rendeva 11px e `text-[10px]`/`text-[10.5px]`
 * rendevano 12px. Il codice diceva quindi una cosa e il browser ne mostrava
 * un'altra — e i commenti che ragionano sulle larghezze erano tarati sulla
 * misura sbagliata. Qui le classi sono state riportate ai valori reali
 * (`text-[11px] leading-[1.35]` e `text-[12px] leading-[1.4]`, cioè
 * esattamente ciò che quella regola imponeva): stessa resa al pixel, ma
 * verificabile con getComputedStyle. Conseguenza da tenere a mente: questi
 * elementi non passano più da quella regola, quindi se il pavimento di
 * leggibilità cambia in index.css vanno aggiornati anche qui.
 */
export function VatsadexView({
  collection,
  activeCombatantId,
  onSetBuddy,
  onPowerUp,
  onTransfer,
  fontina,
  onEquipMosse,
  onMemeTeach,
  playClick,
  playMoo,
  playFanfare,
}: {
  collection: Vatsamon[];
  activeCombatantId: string;
  onSetBuddy: (id: string) => void;
  /** Potenzia la Reina; ritorna la scheda aggiornata o null se mancano risorse. */
  onPowerUp: (cow: Vatsamon) => Vatsamon | null;
  /** Libera la Reina al pascolo; true se l'operazione è andata a buon fine. */
  onTransfer: (cow: Vatsamon) => boolean;
  /** Forme di Fontina possedute (per la Scuola di Mémé). */
  fontina: number;
  /** Scrive cow.mosse; ritorna la scheda aggiornata. */
  onEquipMosse: (cow: Vatsamon, mosse: string[]) => Vatsamon;
  /** Mémé insegna dal catalogo globale per Fontina; null se non basta. */
  onMemeTeach: (cow: Vatsamon, mossaId: string, costo: number) => Vatsamon | null;
  playClick: () => void;
  playMoo: () => void;
  playFanfare: () => void;
}) {
  const [selected, setSelected] = useState<Vatsamon | null>(null);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string>('All');

  // Blocca lo scroll del body mentre la scheda è aperta (L14/L11).
  useScrollLock(selected !== null);
  // Il tasto Indietro chiude la scheda, non il tab del Libretto sotto (H3).
  useBackCloser(selected !== null, () => setSelected(null));

  // Collezione filtrata da ricerca + rarità: calcolata una volta per gestire
  // sia la griglia sia l'empty-state (M6, niente più griglia vuota "muta").
  const filtered = collection.filter((cow) => {
    const q = search.toLowerCase();
    const textMatch = cow.name.toLowerCase().includes(q) || cow.breed.toLowerCase().includes(q);
    const rarityMatch = rarityFilter === 'All' || cow.rarity === rarityFilter;
    return textMatch && rarityMatch;
  });

  return (
    <>
      <div className="space-y-6" id="vatsadex-tab-view">

        {/* Quick interactive Bell soundboard bar */}
        <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 flex flex-col items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-mono font-black text-emerald-400 flex items-center gap-1.5 uppercase">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              Libretto di Mandria
            </h2>
            <p className="text-xs text-slate-400">Il tuo Vatsadex: le Reines che ti sono state affidate lungo il cammino.</p>
          </div>

          <button
            type="button"
            aria-label="Riproduci il Rintocco d'Onore"
            onClick={() => { playMoo(); playFanfare(); }}
            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-2xl py-2 px-4 text-amber-300 flex items-center gap-2 transform active:scale-95 transition-all text-xs"
          >
            <span className="text-xl">🔔</span>
            <div className="text-left font-mono">
              <div className="font-black text-[11px] leading-[1.35] uppercase">Rintocco d'Onore</div>
              <div className="text-[12px] leading-[1.4] text-slate-400">Richiamo ornamentale vacca</div>
            </div>
          </button>
        </div>

        {/* Avanzamento catalogo REALI (Batailles de Reines) */}
        {(() => {
          const realiPrese = collection.filter(c => c.isReal).length;
          const bonus = collection.filter(c => !c.isReal).length;
          return (
            <div className="bg-gradient-to-br from-emerald-950 to-slate-950 border border-emerald-800/50 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono font-black text-emerald-300 text-lg uppercase">Reines reali: {realiPrese}/{REAL_TOTAL}</div>
                <div className="text-[12px] leading-[1.4] font-mono text-slate-400">{bonus > 0 ? `+${bonus} bonus IA` : 'dati Batailles 2026'}</div>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${(realiPrese / REAL_TOTAL) * 100}%` }} />
              </div>
              <p className="text-[12px] leading-[1.4] text-slate-400 font-mono mt-2">Le bovine reali vivono nei loro comuni veri sulla mappa: cammina e catturale.</p>
            </div>
          );
        })()}

        {/* Galleria "una Reina per tipologia": carte con foto reale per rarità */}
        <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 space-y-3" id="showcase-rarity">
          <h3 className="text-xs font-mono font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            Una Reina per rarità (carte ufficiali)
          </h3>
          {/* Due colonne sotto i 375px. "LEGGENDARIA" a 11px/900 maiuscolo
              misura 80,2px: con tre colonne la card lascia 66px di luce a
              320 e 79,3 a 360, quindi la parola andava a capo a metà (unica
              parola: qualsiasi wrap è per forza dentro la parola). Non si
              può rimpicciolire il testo — 11px è il pavimento di
              leggibilità dell'app — né tagliare, quindi si
              allarga la card: a due colonne la luce sale a 109px (320) e
              129px (360), cioè ~29px di margine. Da 375 in su le tre
              colonne stanno larghe (84,3px di luce) e restano. */}
          <div className="grid grid-cols-2 min-[375px]:grid-cols-3 gap-3">
            {SHOWCASE_BY_RARITY.map((cow) => {
              const tone =
                cow.rarity === 'Leggendaria' ? 'border-amber-400/60 from-amber-500/15' :
                cow.rarity === 'Epica' ? 'border-purple-400/60 from-purple-500/15' :
                cow.rarity === 'Rara' ? 'border-blue-400/60 from-blue-500/15' : 'border-slate-700 from-slate-700/10';
              const txt =
                cow.rarity === 'Leggendaria' ? 'text-amber-300' :
                cow.rarity === 'Epica' ? 'text-purple-300' :
                cow.rarity === 'Rara' ? 'text-blue-300' : 'text-slate-300';
              return (
                <button
                  key={cow.id}
                  onClick={() => { playClick(); setSelected(cow); }}
                  className={`relative bg-gradient-to-b to-slate-950 border-2 ${tone} rounded-2xl px-1 py-2 flex flex-col items-center gap-1.5 transition-transform hover:-translate-y-1 overflow-hidden`}
                >
                  <div className="holo-sheen absolute inset-0 pointer-events-none opacity-50 rounded-2xl" />
                  {/* "Leggendaria" è l'etichetta più lunga e la carta è 1/3 di viewport: senza
                      max-w-full il testo esce dalla carta (overflow-hidden) e viene tagliato. */}
                  <span className={`relative text-[11px] leading-[1.35] font-mono font-black uppercase text-center break-words max-w-full ${txt}`}>{cow.rarity}</span>
                  {/* Box 16:9 come la sorgente: `w-16 h-16` lasciava vuoti 28
                      dei 64px di altezza (vedi CowVisual, "FORMA DEL BOX"). */}
                  <CowVisual cow={cow} fit="cover" className="relative w-full aspect-[16/9]" />
                  <span className="relative text-[12px] leading-[1.4] font-mono font-black text-slate-100 truncate max-w-full">{cow.name}</span>
                  <span className="relative text-[12px] leading-[1.4] font-mono text-amber-300">Potenza {cow.cp}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[12px] leading-[1.4] text-slate-500 font-mono">Tocca una carta per aprire la scheda completa con statistiche reali e mosse.</p>
        </div>

        {/* Grid display with Search filters */}
        <div className="bg-slate-950 border border-slate-850 rounded-3xl p-4 space-y-4">

          {/* Dynamic search / rarity ribbon controllers */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtra per nome o razza..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-700 font-mono"
              />
            </div>

            {/* Segmented dei filtri: il selezionato era ambra, cioè il colore
                che il contratto UI riserva a valuta e ricompensa. Ora usa il
                rosso primario (.chip-active) e la controparte .chip-idle; la
                pista attorno dà al gruppo l'affordance che .chip-idle, per
                contratto trasparente, da sola non darebbe.
                NB: qui NON si applica la scala .t-meta. Il suo MAIUSCOLO +
                `letter-spacing: 0.08em` porta "Leggendaria" da 83 a 94px e a
                320px di larghezza l'ultimo chip esce dalla card di 11px
                (misurato). Le cinque etichette restano alla dimensione di
                prima; del contratto si applica il ruolo-colore.
                DIMENSIONE: qui c'era `text-[10.5px]`, ma la regola di
                leggibilità di index.css (`#vatsamon-go-app
                [class~="text-[10.5px]"]`) ha un ID e la riportava a 12px:
                il codice dichiarava una misura e ne rendeva un'altra, e i
                calcoli di larghezza qui sopra sono infatti fatti sui 12px
                reali. Ora dichiara i 12px che rende davvero
                (getComputedStyle: 12px).
                (Ri-verificato: la scelta regge. Con .t-meta "Leggendaria"
                sborda ancora, senza resta dentro a 320/360/390/430.)
                PADDING: sotto i 360px i fianchi dei chip scendono da 4 a 2px.
                "Tutte" è 10px più larga di "All" e a 320 spingeva l'ultimo
                chip 1,7px FUORI dalla card (misurato); i 20px recuperati
                riportano la fila dentro con più aria di prima. Da 360 in su
                lo spazio avanza e il padding resta quello di sempre. */}
            <div className="flex gap-0.5 w-full font-mono text-[12px] leading-[1.4] bg-slate-900 border border-slate-800 rounded-xl p-0.5">
              {['All', 'Comune', 'Rara', 'Epica', 'Leggendaria'].map((rarity) => (
                <button
                  key={rarity}
                  onClick={() => setRarityFilter(rarity)}
                  aria-pressed={rarityFilter === rarity}
                  className={`flex-1 py-1.5 px-0.5 min-[360px]:px-1 rounded-lg border font-bold transition-all whitespace-nowrap cursor-pointer min-h-[36px] ${rarityFilter === rarity ? 'chip-active' : 'chip-idle'}`}
                >
                  {/* 'All' è il VALORE del filtro (confrontato con `cow.rarity`
                      più sopra e usato come stato iniziale): si traduce solo
                      l'etichetta visibile, la logica resta sulla stringa. */}
                  {rarity === 'All' ? 'Tutte' : rarity}
                </button>
              ))}
            </div>
          </div>

          {/* Grid cards collection display */}
          {filtered.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/10 border border-slate-850 rounded-2xl p-6" id="collection-empty">
              <p className="text-slate-500 text-xs font-mono">
                {collection.length === 0
                  ? 'Il tuo Libretto è ancora vuoto: cammina sulla mappa e cattura le Reines.'
                  : search.trim()
                    ? 'Nessun risultato per la ricerca.'
                    : 'Nessuna Reina di questa rarità.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 bg-slate-950" id="collection-grid">
              {filtered
                .map((cow) => {
                  const isActiveBuddy = cow.id === activeCombatantId;
                  const edgeColor =
                    cow.rarity === 'Leggendaria' ? 'border-amber-500/40 hover:border-amber-400' :
                    cow.rarity === 'Epica' ? 'border-purple-500/40 hover:border-purple-400' :
                    cow.rarity === 'Rara' ? 'border-blue-500/40 hover:border-blue-400' : 'border-slate-850 hover:border-slate-700';

                  return (
                    <button
                      type="button"
                      aria-label={`Apri la scheda di ${cow.name}`}
                      key={cow.id}
                      onClick={() => { playClick(); setSelected(cow); }}
                      className={`relative w-full bg-slate-900 border-2 rounded-2xl p-3 text-center transition-all hover:-translate-y-1 overflow-hidden group shadow ${edgeColor}`}
                    >
                      {/* "di punta" È lo stato attivo della collezione: usa la
                          classe del contratto (.chip-active) invece del
                          rose-600 a mano. La classe porta fondo, inchiostro,
                          colore del bordo e ombra, quindi qui restano solo
                          geometria e testo — `bg-rose-600`, `text-white` e
                          `shadow` sarebbero stati sovrascritti. */}
                      {isActiveBuddy && (
                        <div className="absolute top-1.5 right-1.5 chip-active border text-[12px] leading-[1.4] font-mono font-black px-2 py-0.5 rounded-full uppercase">
                          DI PUNTA 👑
                        </div>
                      )}

                      {/* Aura glow representation inside card */}
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-slate-700/5 to-transparent"></div>

                      {/* Box 16:9 come la sorgente (vedi CowVisual, "FORMA DEL
                          BOX"): prima la foto rendeva 80×45 dentro 80×80. */}
                      <div className="my-2.5">
                        <CowVisual cow={cow} fit="cover" className="w-full aspect-[16/9] group-hover:scale-110 transition-transform" />
                      </div>

                      <div className="space-y-1 flex flex-col items-center">
                        <h4 className="font-mono font-extrabold text-[#211b3a] text-xs truncate max-w-full leading-none">
                          {cow.name}
                        </h4>
                        <span className="text-[11px] leading-[1.35] bg-slate-950 font-mono font-black text-yellow-400 border border-slate-800 px-1.5 py-0.5 rounded-md mt-1 shadow-sm uppercase">
                          Potenza {cow.cp}
                        </span>
                      </div>

                    </button>
                  );
                })}
            </div>
          )}

        </div>
      </div>

      {/* DETAILS POPUP MODAL SCREEN FOR SINGLE SELECTED VATSAMON
          Il velo è `fixed inset-0`: senza safe-area il bordo alto della card
          finiva sotto la notch (a 393×852 partiva a y≈43px, contro i 59px del
          ritaglio) e la X ci passava sotto per qualche pixel. Anche il
          `max-height` scala con le fasce, altrimenti il 90% dell'altezza sfora
          la zona sicura. Tap sullo sfondo = chiudi, come gli altri modali
          (ConfirmDialog/ProfileModal): passa dallo stesso `setSelected(null)`
          della X, quindi la profondità dei layer del tasto Indietro (H3) resta
          allineata senza voci di history orfane. */}
      {selected && (
        <div
          className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          style={{
            paddingTop: 'calc(1rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
          }}
          id="details-modal"
          onClick={() => { playClick(); setSelected(null); }}
          role="dialog"
          aria-modal="true"
          aria-label={`Scheda di ${selected.name}`}
        >
          <div
            className="bg-slate-900 border-2 border-slate-800 rounded-3xl max-w-md w-full flex flex-col shadow-2xl relative overflow-hidden"
            style={{ maxHeight: 'calc(90dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Header sticky: la X di chiusura resta sempre raggiungibile (L12) */}
            <div className="sticky top-0 z-20 flex justify-end p-3 bg-slate-900/95 backdrop-blur-sm border-b border-slate-850 rounded-t-3xl shrink-0">
              <button
                onClick={() => { playClick(); setSelected(null); }}
                aria-label="Chiudi la scheda"
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 bg-slate-950/60 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Corpo scorrevole della scheda */}
            <div className="overflow-y-auto px-5 pb-5 pt-3 text-center space-y-4">

            {/* Scheda "carta Pokémon" (componente dedicato) */}
            <CowCard cow={selected} />

            {/* L'angolo delle mosse: equipaggia, impara da Mémé (solo cow possedute) */}
            {collection.some((c) => c.id === selected.id) && (
              <MosseEditor
                cow={selected}
                fontina={fontina}
                onEquip={(c, mosse) => { const u = onEquipMosse(c, mosse); setSelected(u); return u; }}
                onLearnFromMeme={(c, id, costo) => { const u = onMemeTeach(c, id, costo); if (u) setSelected(u); return u; }}
                playClick={playClick}
              />
            )}

            {/* Pokemon GO Action: Power Up and Transfers */}
            <div className="border-t border-slate-850 pt-3 flex gap-2">

              {/* Activate Combat buddy */}
              <button
                onClick={() => {
                  playClick();
                  onSetBuddy(selected.id);
                  setSelected(null);
                }}
                /* Terzo trattamento di "attivo" rimasto in questa vista: lo
                   stato "è già la Reina di punta" era `bg-rose-950` +
                   `text-rose-400`, cioè rosa chiaro su rosa chiaro — 2,36:1
                   misurati dai pixel. Ora è la coppia del contratto:
                   .chip-active-soft per lo stato selezionato (6,9:1),
                   .btn-primary per l'azione. Il `border` sta sulla base
                   perché entrambe le classi dipingono solo il COLORE del
                   bordo, non la sua larghezza. */
                className={`flex-1 border text-[11px] font-mono font-bold py-2.5 px-3 rounded-xl transition-all ${
                  activeCombatantId === selected.id ? 'chip-active-soft' : 'btn-primary'
                }`}
              >
                {activeCombatantId === selected.id ? 'REINA DI PUNTA 👑' : 'SCEGLI DI PUNTA'}
              </button>

              {/* Power Up */}
              <button
                onClick={() => {
                  const updated = onPowerUp(selected);
                  if (updated) setSelected(updated);
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#0b0820] font-mono font-black text-[11px] py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow border-b-4 border-amber-700 flex items-center justify-center gap-1"
              >
                🌾 RAZIONE D'ALPEGGIO (+75 · +4 kg)
              </button>

              {/* Transfer */}
              <button
                onClick={() => {
                  if (onTransfer(selected)) setSelected(null);
                }}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors py-2 px-3 rounded-xl"
                title="Libera al pascolo"
              >
                🌾 Libera
              </button>

            </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
