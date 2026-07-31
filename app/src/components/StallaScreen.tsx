import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ChevronRight, Check, Heart } from "lucide-react";
import { CowVisual } from "./CowVisual";
import { Vatsamon } from "../types";
import { PvpHub } from "./pvp/PvpHub";
import {
  TORI, Toro, Pregnancy, Stats4, stats4Of, predictStats, inheritRazza, birthCalf, growCow,
  STAGE_LABEL, stageForAge, CARE_COOLDOWN_MS, CARE_PROGRESS, CARE_BENESSERE, GROW_COOLDOWN_MS, GROW_MONTHS,
} from "../data/breeding";
import { FONTINA_REWARD } from "../data/economy";

import { gravidanzeCorrenti, LS_PREG, mesiGravidanza } from "../lib/gravidanza";

/**
 * STALLA — allevamento e genealogia (sostituisce la "Culla dei Vitellini" a uova).
 * Loop: scegli MADRE + TORO → MONTA → GRAVIDANZA (cura quotidiana) → NASCITA del
 * moudzon (eredita le 4 stat reali) → CRESCITA a stadi. Tutto statico/localStorage.
 */
export function StallaScreen({ collection, onBorn, onUpdateCow, onReward, onOpenPvpMatch, playClick }: {
  collection: Vatsamon[];
  onBorn: (cow: Vatsamon) => void;
  onUpdateCow: (cow: Vatsamon) => void;
  /** fontina: Forme di Fontina di prestigio (es. moudzon che diventa Reina). */
  onReward: (coins: number, xp: number, fontina?: number) => void;
  /** Apre la scena PvpBattleScene (overlay a livello App, come BattleScene). */
  onOpenPvpMatch: (matchId: string) => void;
  playClick: () => void;
}) {
  // più gravidanze in parallelo (una per madre): requisito per i tornei ufficiali
  const [pregs, setPregs] = useState<Pregnancy[]>(() => gravidanzeCorrenti());
  const [motherId, setMotherId] = useState<string | null>(null);
  const [toroId, setToroId] = useState<string>(TORI[0].id);
  const [justBorn, setJustBorn] = useState<Vatsamon | null>(null);
  const [growCd, setGrowCd] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 400); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (pregs.length) localStorage.setItem(LS_PREG, JSON.stringify(pregs));
    else localStorage.removeItem(LS_PREG);
  }, [pregs]);

  const natiInStalla = collection.filter((c) => c.bornInStalla);
  // le tue Reines adulte: la mandria che vedi in cima alla schermata. Restano
  // in elenco anche quando sono gravide (con lo stato addosso), altrimenti
  // sparirebbero dalla stalla proprio mentre ci stanno lavorando.
  const reines = collection.filter((c) =>
    (c.stats4 || c.geneticStats4 || c.isReal) &&
    (!c.bornInStalla || (c.stage ?? "reina") === "reina"));
  const gravida = (c: Vatsamon) => pregs.some((p) => p.motherId === c.id);
  // madri ammesse: capi con statistiche reali, ADULTI (un moudzon non può
  // essere madre) e non già gravidi
  const madri = reines.filter((c) => !gravida(c));
  const mother = collection.find((c) => c.id === motherId) ?? null;
  const toro: Toro = TORI.find((t) => t.id === toroId) ?? TORI[0];

  const previewMother: Stats4 = mother ? stats4Of(mother) : { stazza: 70, corna: 70, testa: 70, grinta: 70 };
  const preview = predictStats(previewMother, toro.stats4, 50);
  const previewRazza = mother ? inheritRazza(mother.breed, toro.razza) : toro.razza;

  function avviaMonta() {
    if (!mother) return;
    playClick();
    setPregs((prev) => [...prev, {
      id: "preg-" + Math.floor(now) + "-" + mother.id,
      motherId: mother.id,
      motherName: mother.name,
      motherStats4: stats4Of(mother),
      motherRazza: mother.breed,
      fatherId: toro.id,
      fatherName: toro.nome,
      fatherStats4: toro.stats4,
      fatherRazza: toro.razza,
      progress: 0,
      benessere: 70,
      ambiente: 50,
      lastCareAt: {},
      startedAt: now,
    }]);
    setMotherId(null);
  }

  const careCd = (p: Pregnancy, action: string) => Math.max(0, CARE_COOLDOWN_MS - (now - (p.lastCareAt[action] ?? 0)));

  function care(pregId: string, action: string) {
    const p = pregs.find((x) => x.id === pregId);
    if (!p || careCd(p, action) > 0 || p.progress >= 100) return;
    playClick();
    setPregs((prev) => prev.map((x) => x.id === pregId ? {
      ...x,
      progress: Math.min(100, x.progress + CARE_PROGRESS),
      benessere: Math.min(100, x.benessere + CARE_BENESSERE),
      lastCareAt: { ...x.lastCareAt, [action]: now },
    } : x));
    onReward(1, 12);
  }

  function nascita(pregId: string) {
    const p = pregs.find((x) => x.id === pregId);
    if (!p || p.progress < 100) return;
    playClick();
    const motherCow = collection.find((c) => c.id === p.motherId);
    const gen = (motherCow?.generation ?? 0) + 1;
    const calf = birthCalf(p, collection, gen);
    onBorn(calf);
    onReward(25, 250);
    setJustBorn(calf);
    setPregs((prev) => prev.filter((x) => x.id !== pregId));
  }

  function cresci(cow: Vatsamon) {
    if (now - (growCd[cow.id] ?? 0) < GROW_COOLDOWN_MS) return;
    playClick();
    const grown = growCow(cow, GROW_MONTHS);
    onUpdateCow(grown);
    setGrowCd((p) => ({ ...p, [cow.id]: now }));
    // Traguardo di prestigio: il moudzon è diventato Reina adulta → Fontina.
    const eraReina = (cow.stage ?? stageForAge(cow.ageMonths ?? 0)) === "reina";
    const diventataReina = !eraReina && grown.stage === "reina";
    onReward(0, 50, diventataReina ? FONTINA_REWARD.reinaCresciuta : 0);
  }

  const CARE_ACTIONS: [string, string, string][] = [
    ["nutri", "🌾", "Nutri"],
    ["abbevera", "💧", "Abbevera"],
    ["conduci", "🐄", "Conduci"],
  ];

  // Perché la CTA è spenta: uno stato disabilitato deve dire cosa manca, non
  // limitarsi a sbiadire. null = la monta si può avviare.
  const motivoMonta = mother ? null
    : reines.length === 0 ? "Serve una Reina adulta: catturane una o fai crescere un moudzon."
    : madri.length === 0 ? "Tutte le tue Reines sono già gravide: aspetta una nascita."
    : "Scegli qui sopra la Reina che farà da madre.";

  return (
    <div className="max-w-2xl mx-auto space-y-4" id="stalla-view">
      {/* LE TUE REINES — in cima, prima di ogni spiegazione: foto grande,
          statistiche e l'azione che apre il loop (scegliere la madre). Il
          testo che introduceva la schermata è finito nel "Come funziona"
          richiudibile qui sotto: chi sa già cosa fare non lo incontra. */}
      <div className="bg-gradient-to-br from-amber-950/40 to-slate-950 border border-amber-800/40 rounded-3xl p-4 space-y-3" id="stalla-mandria">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="h-section text-slate-100">🐮 Stalla</h2>
          <span className="t-meta text-slate-500">{reines.length} {reines.length === 1 ? "Reina" : "Reines"}</span>
        </div>

        <div>
          <div className="t-meta text-slate-500 mb-1.5">1 · Scegli la madre</div>
          {reines.length === 0 ? (
            <p className="is-empty t-body">Nessuna Reina adulta: cattura o fatti affidare una Reina per iniziare l'allevamento.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-[26rem] overflow-y-auto no-scrollbar" id="stalla-reines">
              {reines.map((c) => {
                const attesa = gravida(c);
                const scelta = motherId === c.id;
                const s = stats4Of(c);
                return (
                  <button
                    key={c.id}
                    data-mother={c.id}
                    disabled={attesa}
                    aria-pressed={scelta}
                    onClick={() => { playClick(); setMotherId(c.id); }}
                    className={`is-disabled block w-full text-left p-2 rounded-2xl border transition-all ${scelta ? "chip-active-soft" : "border-slate-850 bg-slate-900"}`}
                  >
                    {/* box 16:9 + cover: è il rapporto delle foto e delle
                        illustrazioni, quindi la Reina riempie il riquadro
                        invece di galleggiare in una cornice (vedi CowVisual). */}
                    <CowVisual cow={c} fit="cover" className="w-full aspect-[16/9]" />
                    <div className="flex items-baseline justify-between gap-2 mt-2">
                      <span className="h-card truncate">{c.name}</span>
                      <span className={`t-meta flex-shrink-0 ${scelta || attesa ? "" : "text-slate-500"}`}>{attesa ? "In attesa" : scelta ? "✓ Scelta" : "Scegli"}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                      {([["Stazza", s.stazza], ["Corna", s.corna], ["Testa", s.testa], ["Grinta", s.grinta]] as [string, number][]).map(([l, v]) => (
                        <div key={l} className="rounded-lg border border-slate-850 bg-slate-950/70 py-1 text-center">
                          <div className="t-meta text-slate-500">{l}</div>
                          <div className="h-card tabular-nums">{v}</div>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* la spiegazione della schermata sta DOPO l'azione e chiusa: chi sa
            già cosa fare non ci sbatte contro. */}
        <details className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2" id="stalla-come-funziona">
          <summary className="t-meta text-slate-400 cursor-pointer">Come funziona</summary>
          <p className="t-body text-slate-300 mt-1.5">
            Allevamento e genealogia: dalla <b className="text-slate-100">monta</b> con un toro alla{" "}
            <b className="text-slate-100">nascita</b> del moudzon, che eredita la linea di sangue, fino alla{" "}
            <b className="text-slate-100">crescita</b> in Reina. Tutto con la cura quotidiana.
          </p>
        </details>
      </div>

      {/* GRAVIDANZE IN CORSO (una per madre): requisito per i tornei ufficiali */}
      {pregs.map((preg) => (
        <div key={preg.id} className="bg-slate-950 border border-slate-850 rounded-3xl p-4 space-y-3" id="stalla-pregnancy" data-preg={preg.motherId}>
          <div className="flex items-center justify-between gap-2">
            {/* era `text-rose-400`, che nella palette invertita resta il rosa
                chiaro di Tailwind: 1,9:1 su carta. `text-primary-strong` è il
                rosso-testo sicuro su ogni superficie (contratto UI). */}
            <span className="t-meta text-primary-strong flex items-center gap-1"><Heart className="w-3 h-3 fill-current" /> Gravidanza in corso</span>
            <span className="t-meta text-slate-500" data-mesi={preg.motherId}>≈ {mesiGravidanza(preg).toFixed(1)} mesi / 9</span>
          </div>
          <div className="h-card text-slate-100">
            {preg.motherName} <span className="text-slate-500">×</span> {preg.fatherName} <span className="t-meta text-slate-500">({preg.fatherRazza})</span>
          </div>

          <div>
            <div className="flex justify-between t-body text-slate-400"><span>Gestazione</span><span className="h-card text-slate-100 tabular-nums">{Math.round(preg.progress)}%</span></div>
            <div className="bg-slate-900 border border-slate-800 rounded-full h-2.5 overflow-hidden mt-1">
              <motion.div className="bg-primary h-full" animate={{ width: `${preg.progress}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between t-body text-slate-400"><span>Benessere della madre</span><span className="h-card tone-positive tabular-nums">{Math.round(preg.benessere)}%</span></div>
            <div className="bg-slate-900 border border-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
              <div className="bg-positive h-full transition-all" style={{ width: `${preg.benessere}%` }} />
            </div>
          </div>

          <p className="t-body text-slate-400">📋 Regolamento: alle tappe ufficiali si iscrivono bovine gravide — ≥3 mesi (estive), ≥4 (autunnali).</p>

          {preg.progress < 100 ? (
            <div className="grid grid-cols-3 gap-2">
              {CARE_ACTIONS.map(([id, emoji, label]) => {
                const cd = careCd(preg, id);
                return (
                  <button
                    key={id}
                    data-care={id}
                    disabled={cd > 0}
                    onClick={() => care(preg.id, id)}
                    className="is-disabled flex flex-col items-center gap-0.5 py-2.5 rounded-xl border border-slate-700 bg-slate-855 text-slate-100 h-card transition-all hover:bg-slate-850"
                  >
                    <span className="text-lg">{emoji}</span>
                    {cd > 0 ? `${(cd / 1000).toFixed(1)}s` : label}
                  </button>
                );
              })}
            </div>
          ) : (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              data-born
              onClick={() => nascita(preg.id)}
              className="btn-primary w-full h-card py-3 rounded-xl flex items-center justify-center gap-1.5 border-b-4"
            >
              <Sparkles className="w-4 h-4" /> È nata! Fai venire al mondo il moudzon
            </motion.button>
          )}

          <button onClick={() => { playClick(); setPregs((prev) => prev.filter((x) => x.id !== preg.id)); }} className="w-full t-meta text-slate-500 hover:text-primary-strong pt-1">Annulla la monta</button>
        </div>
      ))}

      {/* PROGRAMMA UNA MONTA — la madre si sceglie nella card in cima, qui
          resta il seguito del passo (toro, anteprima, avvio). */}
      <div className="bg-slate-950 border border-slate-850 rounded-3xl p-4 space-y-3" id="stalla-monta">
        <div className="h-card text-slate-200">Programma una monta</div>

        {/* madre scelta (riepilogo) */}
        <div className="flex items-center justify-between gap-2">
          <span className="t-meta text-slate-500">Madre</span>
          {mother
            ? <span className="chip-active-soft border rounded-full px-2.5 py-0.5 h-card" data-madre-scelta>{mother.name}</span>
            : <span className="t-body text-slate-400">nessuna — scegli qui sopra</span>}
        </div>

        {/* selezione toro */}
        <div>
          <div className="t-meta text-slate-500 mb-1">2 · Scegli il toro di monta</div>
          <div className="space-y-1.5">
            {TORI.map((t) => (
              <button
                key={t.id}
                data-toro={t.id}
                aria-pressed={toroId === t.id}
                onClick={() => { playClick(); setToroId(t.id); }}
                className={`w-full flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${toroId === t.id ? "chip-active-soft" : "chip-idle"}`}
              >
                <span className="text-xl">🐂</span>
                <div className="min-w-0 flex-grow">
                  <div className="h-card">{t.nome} <span className="t-meta text-slate-500">· {t.razza}</span></div>
                  <div className="t-body truncate">{t.descr}</div>
                </div>
                {toroId === t.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* anteprima genetica */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          <div className="t-meta text-slate-500 mb-1">Anteprima del vitello {mother ? `(${previewRazza})` : ""}</div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {([["Stazza", preview.stazza], ["Corna", preview.corna], ["Testa", preview.testa], ["Grinta", preview.grinta]] as [string, number][]).map(([l, v]) => (
              <div key={l} className="bg-slate-950 rounded-lg border border-slate-850 py-1">
                <div className="t-meta text-slate-500">{l}</div>
                <div className="h-card text-slate-100 tabular-nums">{mother ? v : "—"}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <button
            disabled={!mother}
            data-avvia-monta
            aria-describedby={motivoMonta ? "stalla-monta-motivo" : undefined}
            onClick={avviaMonta}
            className={`is-disabled w-full h-card py-3 rounded-xl flex items-center justify-center gap-1.5 ${mother ? "btn-primary border-b-4" : ""}`}
          >
            Avvia la monta <ChevronRight className="w-4 h-4" />
          </button>
          {motivoMonta && <p className="t-body text-slate-400 text-center mt-1.5" id="stalla-monta-motivo">{motivoMonta}</p>}
        </div>
      </div>

      {/* NATI IN STALLA */}
      {natiInStalla.length > 0 && (
        <div className="bg-slate-950 border border-slate-850 rounded-3xl p-4 space-y-2">
          <div className="h-card text-slate-200">I tuoi nati in stalla ({natiInStalla.length})</div>
          {natiInStalla.map((c) => {
            const stage = c.stage ?? stageForAge(c.ageMonths ?? 0);
            const isReina = stage === "reina";
            const cd = now - (growCd[c.id] ?? 0) < GROW_COOLDOWN_MS;
            return (
              <div key={c.id} className="flex items-center gap-2.5 bg-slate-900/60 rounded-xl p-2 border border-slate-850">
                <CowVisual cow={c} fit="cover" className="w-16 aspect-[16/9] flex-shrink-0" />
                <div className="min-w-0 flex-grow">
                  <div className="h-card text-slate-200 truncate">{c.name} <span className="t-meta text-slate-500">G{c.generation ?? 1}</span></div>
                  <div className="t-body text-slate-400">{STAGE_LABEL[stage]} · {c.peso_kg ?? 42} kg</div>
                  {c.lineTrait && <div className="t-body text-slate-500 truncate italic">{c.lineTrait}</div>}
                </div>
                {isReina ? (
                  <span className="t-meta tone-positive px-2">✓ adulta</span>
                ) : (
                  <button
                    data-grow={c.id}
                    disabled={cd}
                    onClick={() => cresci(c)}
                    className="is-disabled t-meta px-2.5 py-2 rounded-lg border border-slate-700 bg-slate-855 text-slate-100 hover:bg-slate-850"
                  >
                    {cd ? "…" : "Cresci"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SFIDE TRA ALLEVATORI (PvP live a turni, S9) — sezione, non una tab
          nuova: hub di creazione/join/lista partite, gated su login reale
          (niente sfide online in modalità locale/ospite). Sta DOPO il loop
          della stalla: da ospite è solo un cartello, e prima occupava lo
          spazio buono sopra le azioni. */}
      <PvpHub collection={collection} onOpenMatch={onOpenPvpMatch} playClick={playClick} />

      {/* REVEAL NASCITA */}
      <AnimatePresence>
        {justBorn && (
          <motion.div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setJustBorn(null)}>
            <motion.div
              className="bg-gradient-to-br from-amber-950/60 to-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-sm w-full p-6 text-center space-y-3"
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="t-meta text-slate-500 flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> È nata in stalla</div>
              <CowVisual cow={justBorn} fit="cover" className="w-52 aspect-[16/9] mx-auto" />
              <div className="h-section text-slate-100">{justBorn.name}</div>
              <div className="t-body text-slate-400">Moudzon · {justBorn.breed} · G{justBorn.generation}</div>
              <div className="bg-slate-950/60 rounded-xl p-2 t-body text-slate-300">{justBorn.lore}</div>
              <div className="grid grid-cols-4 gap-1.5">
                {([["Stazza", justBorn.geneticStats4?.stazza], ["Corna", justBorn.geneticStats4?.corna], ["Testa", justBorn.geneticStats4?.testa], ["Grinta", justBorn.geneticStats4?.grinta]] as [string, number][]).map(([l, v]) => (
                  <div key={l} className="bg-slate-950 rounded-lg border border-slate-850 py-1">
                    <div className="t-meta text-slate-500">{l}</div>
                    <div className="h-card text-slate-100 tabular-nums">{v}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setJustBorn(null)} className="btn-primary w-full h-card py-2.5 rounded-xl flex items-center justify-center gap-1 border-b-4"><Check className="w-4 h-4" /> Aggiungi al Libretto di Mandria</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
