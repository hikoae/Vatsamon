import { useState } from 'react';
import { BookOpen, Award, Search, X } from 'lucide-react';
import { Vatsamon } from '../types';
import { CowVisual } from './CowVisual';
import { CowCard } from './CowCard';
import { REAL_TOTAL, SHOWCASE_BY_RARITY } from '../data/realCows';

/**
 * VATSADEX — collezione / Libretto di Mandria (vista estratta dal monolite).
 * Stato locale: ricerca, filtro rarità e scheda aperta; le azioni che toccano
 * lo stato di gioco (power-up, libera, compagno) risalgono ad App via callback.
 */
export function VatsadexView({
  collection,
  activeCombatantId,
  onSetBuddy,
  onPowerUp,
  onTransfer,
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
  playClick: () => void;
  playMoo: () => void;
  playFanfare: () => void;
}) {
  const [selected, setSelected] = useState<Vatsamon | null>(null);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string>('All');

  return (
    <>
      <div className="space-y-6" id="vatsadex-tab-view">

        {/* Quick interactive Bell soundboard bar */}
        <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-mono font-black text-emerald-400 flex items-center gap-1.5 uppercase">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              Libretto di Mandria
            </h2>
            <p className="text-xs text-slate-400">Il tuo Vatsadex: le Reines che ti sono state affidate lungo il cammino.</p>
          </div>

          <div
            onClick={() => { playMoo(); playFanfare(); }}
            className="bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer border border-amber-500/20 rounded-2xl py-2 px-4 text-amber-300 flex items-center gap-2 transform active:scale-95 transition-all text-xs"
          >
            <span className="text-xl">🔔</span>
            <div className="text-left font-mono">
              <div className="font-black text-[9px] uppercase">Rintocco d'Onore</div>
              <div className="text-[8px] text-slate-400">Richiamo ornamentale vacca</div>
            </div>
          </div>
        </div>

        {/* Avanzamento catalogo REALI (Batailles de Reines) */}
        {(() => {
          const realiPrese = collection.filter(c => c.isReal).length;
          const bonus = collection.filter(c => !c.isReal).length;
          return (
            <div className="bg-gradient-to-br from-emerald-950 to-slate-950 border border-emerald-800/50 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono font-black text-emerald-300 text-lg uppercase">Reines reali: {realiPrese}/{REAL_TOTAL}</div>
                <div className="text-[10px] font-mono text-slate-400">{bonus > 0 ? `+${bonus} bonus IA` : 'dati Batailles 2026'}</div>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${(realiPrese / REAL_TOTAL) * 100}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-2">Le bovine reali vivono nei loro comuni veri sulla mappa: cammina e catturale.</p>
            </div>
          );
        })()}

        {/* Galleria "una Reina per tipologia": carte con foto reale per rarità */}
        <div className="bg-slate-950 border border-slate-850 rounded-3xl p-5 space-y-3" id="showcase-rarity">
          <h3 className="text-xs font-mono font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            Una Reina per rarità (carte ufficiali)
          </h3>
          <div className="grid grid-cols-3 gap-3">
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
                  className={`relative bg-gradient-to-b to-slate-950 border-2 ${tone} rounded-2xl p-2 flex flex-col items-center gap-1.5 transition-transform hover:-translate-y-1 overflow-hidden`}
                >
                  <div className="holo-sheen absolute inset-0 pointer-events-none opacity-50 rounded-2xl" />
                  <span className={`relative text-[8px] font-mono font-black uppercase tracking-widest ${txt}`}>{cow.rarity}</span>
                  <CowVisual cow={cow} className="relative w-16 h-16" />
                  <span className="relative text-[10px] font-mono font-black text-slate-100 truncate max-w-full">{cow.name}</span>
                  <span className="relative text-[8px] font-mono text-amber-300">Potenza {cow.cp}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Tocca una carta per aprire la scheda completa con statistiche reali e mosse.</p>
        </div>

        {/* Grid display with Search filters */}
        <div className="bg-slate-950 border border-slate-850 rounded-3xl p-4 space-y-4">

          {/* Dynamic search / rarity ribbon controllers */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtra per nome o razza..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-700 font-mono"
              />
            </div>

            <div className="flex gap-1 w-full sm:w-auto font-mono text-[10.5px]">
              {['All', 'Comune', 'Rara', 'Epica', 'Leggendaria'].map((rarity) => (
                <button
                  key={rarity}
                  onClick={() => setRarityFilter(rarity)}
                  className={`flex-1 sm:flex-none py-1.5 px-2.5 rounded-lg border font-bold transition-all whitespace-nowrap cursor-pointer ${rarityFilter === rarity ? 'bg-amber-500 border-amber-500 text-[#0b0820]' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                >
                  {rarity}
                </button>
              ))}
            </div>
          </div>

          {/* Grid cards collection display */}
          {collection.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/10 border border-slate-850 rounded-2xl p-6">
              <p className="text-slate-500 text-xs font-mono">Nessuna Reina corrisponde ai criteri di ricerca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950" id="collection-grid">
              {collection
                .filter(cow => {
                  const textMatch = cow.name.toLowerCase().includes(search.toLowerCase()) || cow.breed.toLowerCase().includes(search.toLowerCase());
                  const rarityMatch = rarityFilter === 'All' || cow.rarity === rarityFilter;
                  return textMatch && rarityMatch;
                })
                .map((cow) => {
                  const isActiveBuddy = cow.id === activeCombatantId;
                  const edgeColor =
                    cow.rarity === 'Leggendaria' ? 'border-amber-500/40 hover:border-amber-400' :
                    cow.rarity === 'Epica' ? 'border-purple-500/40 hover:border-purple-400' :
                    cow.rarity === 'Rara' ? 'border-blue-500/40 hover:border-blue-400' : 'border-slate-850 hover:border-slate-700';

                  return (
                    <div
                      key={cow.id}
                      onClick={() => { playClick(); setSelected(cow); }}
                      className={`relative bg-slate-900 border-2 rounded-2xl p-3 text-center cursor-pointer transition-all hover:-translate-y-1 overflow-hidden group shadow ${edgeColor}`}
                    >
                      {isActiveBuddy && (
                        <div className="absolute top-1.5 right-1.5 bg-rose-600 text-[8px] font-mono font-black text-white px-2 py-0.5 rounded-full uppercase shadow">
                          DI PUNTA 👑
                        </div>
                      )}

                      {/* Aura glow representation inside card */}
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-slate-700/5 to-transparent"></div>

                      <div className="my-2.5 flex justify-center">
                        <CowVisual cow={cow} className="w-20 h-20 group-hover:scale-110 transition-transform" />
                      </div>

                      <div className="space-y-1 flex flex-col items-center">
                        <h4 className="font-mono font-extrabold text-[#211b3a] text-xs truncate max-w-full leading-none">
                          {cow.name}
                        </h4>
                        <span className="text-[9px] bg-slate-950 font-mono font-black text-yellow-400 border border-slate-800 px-1.5 py-0.5 rounded-md mt-1 shadow-sm uppercase">
                          Potenza {cow.cp}
                        </span>
                      </div>

                    </div>
                  );
                })}
            </div>
          )}

        </div>
      </div>

      {/* DETAILS POPUP MODAL SCREEN FOR SINGLE SELECTED VATSAMON */}
      {selected && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in overflow-y-auto" id="details-modal">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl max-w-md w-full p-5 text-center space-y-4 shadow-2xl relative my-auto">

            <button
              onClick={() => { playClick(); setSelected(null); }}
              className="absolute top-3 right-3 z-20 text-slate-400 hover:text-slate-200 transition-colors p-1 bg-slate-950/60 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Scheda "carta Pokémon" (componente dedicato) */}
            <CowCard cow={selected} />

            {/* Pokemon GO Action: Power Up and Transfers */}
            <div className="border-t border-slate-850 pt-3 flex gap-2">

              {/* Activate Combat buddy */}
              <button
                onClick={() => {
                  playClick();
                  onSetBuddy(selected.id);
                  setSelected(null);
                }}
                className={`flex-1 text-[11px] font-mono font-bold py-2.5 px-3 rounded-xl transition-all shadow ${
                  activeCombatantId === selected.id
                    ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
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
                🌾 RAZIONE D'ALPEGGIO (+75)
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
      )}
    </>
  );
}
