import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Save, Loader2, CheckCircle2, AlertTriangle, Newspaper, ExternalLink } from "lucide-react";
import { CALENDAR, CATEGORIES, CategoriaId } from "../data/season";
import { REAL_COWS } from "../data/realCows";
import {
  getCachedRisultato, setRisultato, RisultatoCategoria,
  getAllRisultatiAuto, getCachedRisultatoAuto, getPressHints,
} from "../lib/risultati";
import { Lang, tr } from "../i18n/hub";

/**
 * Form admin per pubblicare i risultati UFFICIALI di una tappa (S11).
 * Raggiungibile SOLO se `ADMIN_UIDS` (lib/risultati.ts) contiene l'uid
 * dell'utente loggato — vedi il gate in SeasonView. Scrive su
 * `risultati/{eventId}`, verificato anche (e soprattutto) lato
 * firestore.rules: un denial qui non deve mai far crashare la UI.
 *
 * G5: se non c'è ancora un risultato confermato su Firestore per la tappa,
 * i campi si precompilano con la cache auto (letta dal tabellone pubblicato
 * su amisdesreines.it, vedi lib/risultati.ts getCachedRisultatoAuto) — SOLO
 * come suggerimento da verificare: l'admin conferma con un tap, esattamente
 * come per un inserimento manuale. Mai una scrittura automatica su Firestore.
 */

const EMPTY: Record<CategoriaId, string> = { "1": "", "2": "", "3": "" };

function fromCache(eventId: string | undefined): { nomi: Record<CategoriaId, string>; note: Record<CategoriaId, string>; precompilato: boolean } {
  const existing = eventId ? getCachedRisultato(eventId) : undefined;
  if (existing) {
    return {
      nomi: { "1": existing.cat1?.nome ?? "", "2": existing.cat2?.nome ?? "", "3": existing.cat3?.nome ?? "" },
      note: { "1": existing.cat1?.note ?? "", "2": existing.cat2?.note ?? "", "3": existing.cat3?.note ?? "" },
      precompilato: false,
    };
  }
  const auto = eventId ? getCachedRisultatoAuto(eventId) : undefined;
  if (auto && (auto.cat1 || auto.cat2 || auto.cat3)) {
    return {
      nomi: { "1": auto.cat1?.nome ?? "", "2": auto.cat2?.nome ?? "", "3": auto.cat3?.nome ?? "" },
      note: { ...EMPTY },
      precompilato: true,
    };
  }
  return { nomi: { ...EMPTY }, note: { ...EMPTY }, precompilato: false };
}

export function RisultatiAdmin({ lang, onSaved }: { lang: Lang; onSaved?: () => void }) {
  const eventi = useMemo(() => CALENDAR.filter((e) => e.kind === "bataille"), []);
  const [eventId, setEventId] = useState<string>(eventi[0]?.id ?? "");
  const [nomi, setNomi] = useState<Record<CategoriaId, string>>(() => fromCache(eventi[0]?.id).nomi);
  const [note, setNote] = useState<Record<CategoriaId, string>>(() => fromCache(eventi[0]?.id).note);
  const [precompilato, setPrecompilato] = useState(() => fromCache(eventi[0]?.id).precompilato);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const evento = eventi.find((e) => e.id === eventId) ?? null;
  const nomiOptions = useMemo(() => [...REAL_COWS].map((c) => c.name).sort((a, b) => a.localeCompare(b)), []);
  const pressHints = eventId ? getPressHints(eventId) : [];

  // La cache auto (G5) arriva da un fetch async: se al primo render non è
  // ancora calda, questo effetto ri-precompila appena disponibile — MA solo
  // se l'admin non ha già iniziato a scrivere (mai sovrascrivere un input in
  // corso). Stesso pattern del bump di SeasonView.
  useEffect(() => {
    let alive = true;
    getAllRisultatiAuto().then(() => {
      if (!alive) return;
      const loaded = fromCache(eventId);
      setNomi((prev) => (Object.values(prev).every((v) => !v.trim()) ? loaded.nomi : prev));
      if (loaded.precompilato) setPrecompilato(true);
    });
    return () => { alive = false; };
  }, [eventId]);

  function selectEvento(id: string) {
    setEventId(id);
    setFeedback(null);
    const loaded = fromCache(id);
    setNomi(loaded.nomi);
    setNote(loaded.note);
    setPrecompilato(loaded.precompilato);
  }

  async function submit() {
    if (!evento) return;
    const missing = evento.categorie.some((c) => !nomi[c].trim());
    if (missing) {
      setFeedback({ ok: false, msg: tr(lang, "adm_errCampi") });
      return;
    }
    const build = (cat: CategoriaId): RisultatoCategoria => {
      const n = note[cat].trim();
      return n ? { nome: nomi[cat].trim(), note: n } : { nome: nomi[cat].trim() };
    };
    setSaving(true);
    setFeedback(null);
    const res = await setRisultato(evento.id, { cat1: build("1"), cat2: build("2"), cat3: build("3") });
    setSaving(false);
    if (res.ok) {
      setFeedback({ ok: true, msg: tr(lang, "adm_ok") });
      onSaved?.();
    } else {
      setFeedback({ ok: false, msg: res.error });
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 text-center">
        <ShieldCheck className="w-7 h-7 text-emerald-400 mx-auto mb-1" />
        <h3 className="text-sm font-mono font-black text-emerald-200">{tr(lang, "adm_title")}</h3>
        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{tr(lang, "adm_sub")}</p>
      </div>

      <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-3">
        <div>
          <label className="block text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 mb-1.5">
            {tr(lang, "adm_tappa")}
          </label>
          <select
            value={eventId}
            onChange={(e) => selectEvento(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-200"
          >
            {eventi.map((e) => (
              <option key={e.id} value={e.id}>
                {e.finale ? "👑 " : ""}{e.data} · {e.comune}
              </option>
            ))}
          </select>
        </div>

        {precompilato && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-600/40 rounded-xl p-2.5 text-[10px] font-mono text-amber-300">
            <Newspaper className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {tr(lang, "adm_precompilato")}
          </div>
        )}

        {pressHints.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400">
              {tr(lang, "adm_pressHints")}
            </div>
            {pressHints.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-mono text-sky-400 hover:text-sky-300 truncate"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{url}</span>
              </a>
            ))}
          </div>
        )}

        {evento?.categorie.map((cat) => {
          const c = CATEGORIES.find((x) => x.id === cat)!;
          return (
            <div key={cat} className="space-y-1.5 border-t border-slate-900 pt-3">
              <div className="text-[10px] font-mono font-black" style={{ color: c.accent }}>
                {c.emoji} {lang === "fr" ? c.labelFr : c.label}
              </div>
              <input
                list="risultati-admin-nomi"
                value={nomi[cat]}
                onChange={(e) => setNomi((prev) => ({ ...prev, [cat]: e.target.value }))}
                placeholder={tr(lang, "adm_nomePh")}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-200"
              />
              <input
                value={note[cat]}
                onChange={(e) => setNote((prev) => ({ ...prev, [cat]: e.target.value }))}
                placeholder={tr(lang, "adm_notePh")}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-400"
              />
            </div>
          );
        })}

        <datalist id="risultati-admin-nomi">
          {nomiOptions.map((n) => <option key={n} value={n} />)}
        </datalist>

        <button
          onClick={submit}
          disabled={saving || !evento}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0b0820] font-mono font-black text-[11px] py-2.5 rounded-xl flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {tr(lang, "adm_salva")}
        </button>

        {feedback && (
          <div
            className={`flex items-start gap-2 rounded-xl p-2.5 text-[10px] font-mono ${
              feedback.ok
                ? "bg-emerald-500/10 border border-emerald-600/40 text-emerald-300"
                : "bg-rose-500/10 border border-rose-600/40 text-rose-300"
            }`}
          >
            {feedback.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            )}
            {feedback.msg}
          </div>
        )}
      </div>
    </div>
  );
}
