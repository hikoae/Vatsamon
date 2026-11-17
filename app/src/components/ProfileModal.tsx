import { LogOut, X } from 'lucide-react';
import { useScrollLock } from '../lib/useScrollLock';
import type { Trofeo } from '../data/trofei';
import { TROFEO_META } from '../data/trofei';
import type { GradoStato } from '../data/gradi';
import { PEDIGREE_STAR_CAP, costoStellaPedigree } from '../data/economy';
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
  /** Riapre WhatsNewModal (S19) con la versione corrente + storico. */
  onShowWhatsNew: () => void;
};

/**
 * `profileMsg` arriva da App.tsx come stringa sola: lo stesso riquadro porta sia
 * gli esiti riusciti sia quelli falliti, e finché era tutto `.chip-positive`
 * anche "Codice non valido…" era dipinto di verde — cioè il colore diceva il
 * contrario del testo. Il tono lo riconosciamo qui dall'attacco della stringa,
 * perché il messaggio arriva senza etichetta e App.tsx non è di questa modale.
 *
 * Sono i quattro casi in cui l'azione NON è stata eseguita (App.tsx:
 * `buyPedigreeStar`, `copySaveCode`, `importSave`). Restano positivi gli esiti
 * riusciti e "Hai già tutte le Stelle…", che non è un errore ma un traguardo.
 *
 * NB: se in App.tsx nasce un nuovo messaggio di errore, va aggiunto qui. La
 * soluzione che non si può dimenticare sarebbe passare il tono insieme al
 * testo (`profileMsg: { testo, tono }`), ma tocca App.tsx.
 */
const ATTACCHI_ERRORE = [
  'Ti servono',           // Fontina insufficiente per la prossima Stella
  'Copia non disponibile', // clipboard negata dal browser
  'Incolla prima',        // importazione senza codice
  'Codice non valido',    // importazione fallita
];
const isMessaggioDiErrore = (msg: string) => ATTACCHI_ERRORE.some((a) => msg.startsWith(a));

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
  onShowWhatsNew,
}: Props) {
  useScrollLock(true);
  const hasBackup = !!localStorage.getItem(BACKUP_KEY);

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" id="profile-modal" onClick={onClose}>
      {/* GUSCIO — il filo verde è un'ECCEZIONE CONSAPEVOLE alla regola "verde =
          solo semantica positiva": non è uno stato (non dice "è andata bene",
          non veste testo né controlli), è la cornice con cui in questa app si
          stacca una superficie sovrapposta dal fondo, ed è la stessa su sette
          superfici (Novità, cattura, incontro Rispetto, toast di aggiornamento,
          salita di livello, mappe). Toglierlo qui e nelle Novità li
          scollegherebbe dal resto dell'app senza rendere il sistema più
          coerente: se va cambiato, va cambiato in blocco, e non è lavoro di
          questa modale. Le due modali sorelle restano identiche. */}
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl max-w-md w-full px-5 pb-5 pt-0 space-y-4 shadow-2xl my-auto overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(94dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between sticky top-0 z-10 bg-slate-900 -mx-5 px-5 pt-5 pb-3 rounded-t-3xl">
          <h3 className="h-section text-slate-100 flex items-center gap-2">👨‍🌾 Profilo & Salvataggio</h3>
          <button onClick={onClose} aria-label="Chiudi il profilo" className="text-slate-400 hover:text-slate-200 p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* riepilogo — solo i Denari sono valuta, quindi solo loro portano l'ambra
            (§ RUOLI COLORE): Reines e Livello sono conteggi, vanno in inchiostro. */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-950 rounded-xl border border-slate-850 py-2"><div className="t-meta text-slate-500">Reines</div><div className="text-sm font-mono font-black text-slate-200">{reinesCount}</div></div>
          <div className="bg-slate-950 rounded-xl border border-slate-850 py-2"><div className="t-meta text-slate-500">Livello</div><div className="text-sm font-mono font-black text-slate-200">{level}</div></div>
          <div className="bg-slate-950 rounded-xl border border-slate-850 py-2"><div className="t-meta text-slate-500">Denari</div><div className="text-sm font-mono font-black tone-reward">{coins}</div></div>
        </div>

        {/* PRESTIGIO — grado Amis des Reines + Stella di Pedigree (sink Fontina) */}
        <div className="bg-slate-950 rounded-2xl border border-amber-700/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="t-meta text-slate-500">Grado Amis des Reines</div>
              <div className="text-sm font-mono font-black tone-reward">{gradoStato.grado.emoji} {gradoStato.grado.nome}{pedigreeStars > 0 ? ` ${'★'.repeat(Math.min(pedigreeStars, 5))}` : ''}</div>
              <div className="text-[9px] text-slate-400 italic">{gradoStato.grado.perk}</div>
            </div>
            <div className="text-right">
              <div className="t-meta text-slate-500">Fontina</div>
              {/* Il colore di VALUTE.fontina (#e0b15e) era pensato per il vecchio tema
                  scuro: su questa superficie chiara fa 1,8:1, illeggibile. L'ambra
                  "da testo" del contratto (.tone-reward) tiene lo stesso significato
                  di valuta e passa AA. */}
              <div className="text-base font-mono font-black tone-reward">🧀 {fontina}</div>
            </div>
          </div>
          {gradoStato.next && (
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500"><span>Prestigio {gradoStato.prestigio}</span><span>→ {gradoStato.next.nome}</span></div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mt-0.5"><div className="h-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${Math.round(gradoStato.versoNext * 100)}%` }} /></div>
            </div>
          )}
          {/* Acquisto in valuta → ambra del contratto. A cap raggiunto era solo
              opacity-40: restava un CTA acceso e sbiadito. Ora `.is-disabled` lo
              rende uno stato vero (fondo pieno, testo leggibile, bordo tratteggiato). */}
          <button onClick={onBuyPedigreeStar} id="buy-pedigree" disabled={pedigreeStars >= PEDIGREE_STAR_CAP}
            className="w-full is-disabled bg-reward-strong hover:brightness-110 text-reward-ink font-mono font-black text-[11px] py-2.5 rounded-xl border-b-4 border-reward">
            {pedigreeStars >= PEDIGREE_STAR_CAP ? '★ Prestigio massimo raggiunto' : `★ Stella di Pedigree — ${costoStellaPedigree(pedigreeStars)} 🧀`}
          </button>
          <p className="t-body text-slate-500 text-center">La Désarpa premia chi ha portato lontano la propria mandria: ogni Stella è un riconoscimento permanente (+Rispetto).</p>
        </div>

        {/* COME SI GIOCA — la lezione di Mémé, ripetibile quando si vuole */}
        <button
          id="replay-tutorial"
          onClick={onReplayTutorial}
          className="w-full flex items-center gap-2.5 bg-slate-950 rounded-2xl border border-primary/40 p-3 text-left"
        >
          <span className="text-2xl" aria-hidden="true">👵</span>
          <div>
            <div className="h-card text-primary-strong">Come si gioca — la lezione di Mémé</div>
            <p className="t-body text-slate-500">Rifai la bataille guidata con Fripouille: barra, fiato, tell e contromosse, un colpo alla volta.</p>
          </div>
        </button>

        {/* LE PAROLE DEL PATOIS — si guadagnano compiendole */}
        <div className="bg-slate-950 rounded-2xl border border-slate-850 p-3 space-y-1.5" id="patois-raccolta">
          <div className="h-card text-slate-200">🗣️ Le tue parole di patois ({parolePatois().length}/{TOTALE_PAROLE})</div>
          {vociSbloccate().length === 0 ? (
            /* `.is-empty` è un contenitore (flex column): il testo va DENTRO, non
               sull'elemento stesso, o ogni pezzo inline diventa una riga a sé. */
            <div className="is-empty"><p className="t-body">Il patois non si studia: si vive. Ogni gesto della tradizione ti insegna la sua parola (la prima nascita in stalla, la salita all'alpe, il primo trofeo…).</p></div>
          ) : (
            <div className="space-y-1">
              {vociSbloccate().map(v => (
                <div key={v.chiave} className="text-[10px] font-mono text-slate-300 leading-snug">
                  {/* parola del patois in inchiostro: l'ambra ora vuol dire solo valuta */}
                  <b className="text-slate-100 italic font-display">{v.patois ?? v.fr}</b>
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
          <div className="h-card text-slate-200">🏆 Bacheca dei trofei ({trofei.length})</div>
          {trofei.length === 0 ? (
            <div className="is-empty"><p className="t-body">Vinci una tappa ufficiale del calendario per il tuo primo <b className="text-primary-strong">mécro</b> — il bosquet di fiori rossi che si porta sulle corna.</p></div>
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

        {/* RISORSE DI TEST — solo in sviluppo. Nel build di produzione questo blocco
            non viene emesso affatto (`import.meta.env.DEV` è la costante che Vite
            sostituisce a build-time, quindi il ramo è eliminato dal bundle):
            era un bottone "rifornisci tutto" spedito a tutti i giocatori. */}
        {import.meta.env.DEV && (
          <div className="space-y-2">
            <div className="h-card text-slate-200">🎒 Risorse di test</div>
            <button onClick={onRestockResources} className="w-full bg-emerald-600 hover:bg-emerald-500 text-[#0b0820] font-mono font-black text-xs py-3 rounded-xl border-b-4 border-emerald-800">
              RIFORNISCI TUTTO (balls, +2000 🪙, Lv ≥ 12)
            </button>
          </div>
        )}

        {/* salvataggio */}
        <div className="space-y-2">
          <div className="h-card text-slate-200">💾 Salva i progressi</div>
          <p className="t-body text-slate-400">Copia il codice o scarica il file: serve a riportare i progressi su un altro dispositivo o dopo un nuovo deploy (i salvataggi sono per-browser).</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onCopySaveCode} className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 font-mono font-bold text-[11px] py-2.5 rounded-xl">📋 Copia codice</button>
            <button onClick={onDownloadSave} className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 font-mono font-bold text-[11px] py-2.5 rounded-xl">💾 Scarica file</button>
          </div>
        </div>

        {/* ripristino */}
        <div className="space-y-2">
          <div className="h-card text-slate-200">📥 Ripristina</div>
          <textarea
            value={importText}
            onChange={(e) => onImportTextChange(e.target.value)}
            placeholder="Incolla qui il codice di salvataggio…"
            className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl p-2 text-[11px] font-code text-slate-200 resize-none no-scrollbar"
          />
          {/* unica CTA piena della modale in produzione → .btn-primary (il blu non
              ha un ruolo nel contratto colore) */}
          <button onClick={onImportSave} className="w-full btn-primary font-mono font-black text-xs py-2.5 rounded-xl border-b-4">IMPORTA SALVATAGGIO</button>
          {hasBackup && (
            /* annullare un ripristino non è né valuta né ricompensa: via l'ambra,
               resta un secondario come "Copia codice" / "Scarica file" */
            <button onClick={onUndoLastRestore} className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 font-mono font-bold text-[11px] py-2.5 rounded-xl">
              ↩️ Annulla ultimo ripristino
            </button>
          )}
        </div>

        {/* L'errore non ha un token suo nel contratto: prende il cremisi, che in
            questa app è già la tinta dell'attenzione (anello di focus, "Azzera
            tutti i progressi"). Fondo tenue + testo `primary-strong` per
            leggerlo comodamente (#9b0f23 su #ffe1e4 ≈ 6,9:1). */}
        {profileMsg && (
          <div
            className={`t-body border rounded-xl p-2 ${isMessaggioDiErrore(profileMsg) ? 'bg-primary-soft text-primary-strong border-primary' : 'chip-positive'}`}
            id="profile-msg"
          >
            {profileMsg}
          </div>
        )}

        {/* account */}
        {canLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 font-mono font-bold text-[11px] py-2.5 rounded-xl"
          >
            <LogOut className="w-3.5 h-3.5" /> Esci dall'account
          </button>
        )}

        {/* FOOTER — novità di versione + azzeramento */}
        <div className="flex flex-col items-center gap-1 pt-1">
          {/* il verde vuol dire "è andata bene", non "è un link": qui basta un
              secondario neutro. Il rosso resta all'azione distruttiva (che passa
              comunque dalla conferma `showConfirm` in App.tsx). */}
          {/* Erano due righe di testo sottolineato alte ~17px: la regola dei 44px
              in index.css alza solo i controlli già marcati `min-h-[36px]` e le
              X di chiusura, qui non arrivava niente. L'area di tocco la fa il
              padding, il disegno resta piccolo com'era (un `<button>` centra da
              solo il contenuto quando è più alto del testo). */}
          <button onClick={onShowWhatsNew} id="show-whats-new" className="t-body text-slate-400 hover:text-slate-200 underline min-h-[44px] px-4">✨ Novità di versione</button>
          <button onClick={onResetAll} className="t-body text-primary-strong hover:text-primary underline min-h-[44px] px-4">Azzera tutti i progressi</button>
        </div>
      </div>
    </div>
  );
}
