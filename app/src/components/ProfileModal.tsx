import { LogOut, X } from 'lucide-react';
import type { Trofeo } from '../data/trofei';
import { TROFEO_META } from '../data/trofei';
import type { GradoStato } from '../data/gradi';
import { VALUTE, PEDIGREE_STAR_CAP, costoStellaPedigree } from '../data/economy';
import { parolePatois, vociSbloccate, PATOIS_TRIGGERS, TOTALE_PAROLE } from '../lib/patois';
import { BACKUP_KEY } from '../lib/cloudSave';

type Props = {
  onClose: () => void;
  reinesCount: number;
  level: number;
  coins: number;
  gradoStato: GradoStato;
  pedigreeStars: number;
  fontina: number;
  onBuyPedigreeStar: () => void;
  onReplayTutorial: () => void;
  trofei: Trofeo[];
  onRestockResources: () => void;
  onCopySaveCode: () => void;
  onDownloadSave: () => void;
  importText: string;
  onImportTextChange: (value: string) => void;
  onImportSave: () => void;
  onUndoLastRestore: () => void;
  profileMsg: string;
  canLogout: boolean;
  onLogout: () => void;
  onResetAll: () => void;
};

/** MODAL PROFILO — riepilogo, prestigio, patois, trofei, salvataggio/export-import/reset/logout. */
export function ProfileModal({
  onClose,
  reinesCount,
  level,
  coins,
  gradoStato,
  pedigreeStars,
  fontina,
  onBuyPedigreeStar,
  onReplayTutorial,
  trofei,
  onRestockResources,
  onCopySaveCode,
  onDownloadSave,
  importText,
  onImportTextChange,
  onImportSave,
  onUndoLastRestore,
  profileMsg,
  canLogout,
  onLogout,
  onResetAll,
}: Props) {
  const hasBackup = !!localStorage.getItem(BACKUP_KEY);

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" id="profile-modal" onClick={onClose}>
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl my-auto max-h-[94dvh] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-mono font-black text-emerald-400 flex items-center gap-2">👨‍🌾 Profilo & Salvataggio</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* riepilogo */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-950 rounded-xl border border-slate-850 py-2"><div className="text-[9px] text-slate-500 font-mono uppercase">Reines</div><div className="text-sm font-mono font-black text-emerald-300">{reinesCount}</div></div>
          <div className="bg-slate-950 rounded-xl border border-slate-850 py-2"><div className="text-[9px] text-slate-500 font-mono uppercase">Livello</div><div className="text-sm font-mono font-black text-amber-300">{level}</div></div>
          <div className="bg-slate-950 rounded-xl border border-slate-850 py-2"><div className="text-[9px] text-slate-500 font-mono uppercase">Denari</div><div className="text-sm font-mono font-black text-amber-300">{coins}</div></div>
        </div>

        {/* PRESTIGIO — grado Amis des Reines + Stella di Pedigree (sink Fontina) */}
        <div className="bg-slate-950 rounded-2xl border border-amber-700/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Grado Amis des Reines</div>
              <div className="text-sm font-mono font-black text-amber-300">{gradoStato.grado.emoji} {gradoStato.grado.nome}{pedigreeStars > 0 ? ` ${'★'.repeat(Math.min(pedigreeStars, 5))}` : ''}</div>
              <div className="text-[9px] text-slate-400 italic">{gradoStato.grado.perk}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-slate-500 font-mono uppercase">Fontina</div>
              <div className="text-base font-mono font-black" style={{ color: VALUTE.fontina.colore }}>🧀 {fontina}</div>
            </div>
          </div>
          {gradoStato.next && (
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500"><span>Prestigio {gradoStato.prestigio}</span><span>→ {gradoStato.next.nome}</span></div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mt-0.5"><div className="h-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${Math.round(gradoStato.versoNext * 100)}%` }} /></div>
            </div>
          )}
          <button onClick={onBuyPedigreeStar} id="buy-pedigree" disabled={pedigreeStars >= PEDIGREE_STAR_CAP}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-[#0b0820] font-mono font-black text-[11px] py-2.5 rounded-xl border-b-4 border-amber-800">
            {pedigreeStars >= PEDIGREE_STAR_CAP ? '★ Prestigio massimo raggiunto' : `★ Stella di Pedigree — ${costoStellaPedigree(pedigreeStars)} 🧀`}
          </button>
          <p className="text-[10px] text-slate-500 text-center leading-snug">La Désarpa premia chi ha portato lontano la propria mandria: ogni Stella è un riconoscimento permanente (+Rispetto).</p>
        </div>

        {/* COME SI GIOCA — la lezione di Mémé, ripetibile quando si vuole */}
        <button
          id="replay-tutorial"
          onClick={onReplayTutorial}
          className="w-full flex items-center gap-2.5 bg-slate-950 rounded-2xl border border-[#c8102e]/40 p-3 text-left"
        >
          <span className="text-2xl" aria-hidden="true">👵</span>
          <div>
            <div className="text-[10px] font-mono font-black text-rose-300 uppercase tracking-widest">Come si gioca — la lezione di Mémé</div>
            <p className="text-[10px] text-slate-500 leading-snug">Rifai la bataille guidata con Fripouille: barra, fiato, tell e contromosse, un colpo alla volta.</p>
          </div>
        </button>

        {/* LE PAROLE DEL PATOIS — si guadagnano compiendole */}
        <div className="bg-slate-950 rounded-2xl border border-slate-850 p-3 space-y-1.5" id="patois-raccolta">
          <div className="text-[10px] font-mono font-black text-slate-300 uppercase tracking-widest">🗣️ Le tue parole di patois ({parolePatois().length}/{TOTALE_PAROLE})</div>
          {vociSbloccate().length === 0 ? (
            <p className="text-[10px] text-slate-500 leading-snug">Il patois non si studia: si vive. Ogni gesto della tradizione ti insegna la sua parola (la prima nascita in stalla, la salita all'alpe, il primo trofeo…).</p>
          ) : (
            <div className="space-y-1">
              {vociSbloccate().map(v => (
                <div key={v.chiave} className="text-[10px] font-mono text-slate-300 leading-snug">
                  <b className="text-amber-300 italic font-display">{v.patois ?? v.fr}</b>
                  <span className="text-slate-500"> · {v.it} / {v.fr}</span>
                  <span className="block text-slate-500">{v.def}</span>
                </div>
              ))}
            </div>
          )}
          {(() => {
            const mancanti = Object.entries(PATOIS_TRIGGERS).filter(([k]) => !parolePatois().includes(k));
            return mancanti.length > 0 && (
              <p className="text-[9px] text-slate-600 leading-snug pt-1">Prossima parola: {mancanti[0][1]}.</p>
            );
          })()}
        </div>

        {/* BACHECA DEI TROFEI — mécro, sonnaille, collari delle tappe vinte */}
        <div className="bg-slate-950 rounded-2xl border border-slate-850 p-3 space-y-1.5" id="bacheca-trofei">
          <div className="text-[10px] font-mono font-black text-slate-300 uppercase tracking-widest">🏆 Bacheca dei trofei ({trofei.length})</div>
          {trofei.length === 0 ? (
            <p className="text-[10px] text-slate-500 leading-snug">Vinci una tappa ufficiale del calendario per il tuo primo <b className="text-rose-400">mécro</b> — il bosquet di fiori rossi che si porta sulle corna.</p>
          ) : (
            <div className="space-y-1">
              {trofei.slice(0, 12).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
                  <span aria-hidden="true">{TROFEO_META[t.tipo].emoji}</span>
                  <span className="font-bold">{TROFEO_META[t.tipo].nome}</span>
                  <span className="text-slate-500 truncate">· {t.comune} · {t.categoria} cat. · {t.reinaNome}</span>
                </div>
              ))}
              {trofei.length > 12 && <div className="text-[9px] text-slate-500">…e altri {trofei.length - 12}</div>}
            </div>
          )}
        </div>

        {/* risorse di test */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono font-black text-slate-300 uppercase tracking-widest">🎒 Risorse di test</div>
          <button onClick={onRestockResources} className="w-full bg-emerald-600 hover:bg-emerald-500 text-[#0b0820] font-mono font-black text-xs py-3 rounded-xl border-b-4 border-emerald-800">
            RIFORNISCI TUTTO (balls, +2000 🪙, Lv ≥ 12)
          </button>
        </div>

        {/* salvataggio */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono font-black text-slate-300 uppercase tracking-widest">💾 Salva i progressi</div>
          <p className="text-[10px] text-slate-400 leading-snug">Copia il codice o scarica il file: serve a riportare i progressi su un altro dispositivo o dopo un nuovo deploy (i salvataggi sono per-browser).</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onCopySaveCode} className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 font-mono font-bold text-[11px] py-2.5 rounded-xl">📋 Copia codice</button>
            <button onClick={onDownloadSave} className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 font-mono font-bold text-[11px] py-2.5 rounded-xl">💾 Scarica file</button>
          </div>
        </div>

        {/* ripristino */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono font-black text-slate-300 uppercase tracking-widest">📥 Ripristina</div>
          <textarea
            value={importText}
            onChange={(e) => onImportTextChange(e.target.value)}
            placeholder="Incolla qui il codice di salvataggio…"
            className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl p-2 text-[11px] font-code text-slate-200 resize-none no-scrollbar"
          />
          <button onClick={onImportSave} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-xs py-2.5 rounded-xl border-b-4 border-blue-800">IMPORTA SALVATAGGIO</button>
          {hasBackup && (
            <button onClick={onUndoLastRestore} className="w-full bg-slate-950 hover:bg-slate-850 border border-amber-700/40 text-amber-300 font-mono font-bold text-[11px] py-2.5 rounded-xl">
              ↩️ Annulla ultimo ripristino
            </button>
          )}
        </div>

        {profileMsg && <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-xl p-2">{profileMsg}</div>}

        {/* account */}
        {canLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 font-mono font-bold text-[11px] py-2.5 rounded-xl"
          >
            <LogOut className="w-3.5 h-3.5" /> Esci dall'account
          </button>
        )}

        <button onClick={onResetAll} className="w-full text-[10px] font-mono text-rose-400 hover:text-rose-300 underline pt-1">Azzera tutti i progressi</button>
      </div>
    </div>
  );
}
