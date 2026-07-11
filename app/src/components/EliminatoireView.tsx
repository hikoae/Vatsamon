import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Backpack, X } from "lucide-react";
import { Vatsamon, BackpackItem } from "../types";
import { CowVisual } from "./CowVisual";
import { buildPlayerFighter, buildScaledBoss } from "../lib/battle";
import {
  Spintatore, SpintaState, AzioneId, PERSONALITA_LABEL, personalitaFromLegacy,
  spintatoreFromFighter, initSpinta, pickAzioneAvversaria, MAX_TURNI,
} from "../lib/spinta";
import { SAC_ITEMS, MAX_VIGILIA, LIMATURA_TESTO } from "../data/sac";
import { Mossa, mosseEquipaggiate, mosseAvversaria, eseguiMossa } from "../data/mosse";
import { spiegaEsito, cronacaTurno, cronacaEsito } from "../data/telecronaca";
import { SpintaStats, nuoveSpintaStats, registraTurno } from "../lib/scuola";
import { MossePanel } from "./battle/MossePanel";
import { MossaInfoSheet } from "./battle/MossaInfoSheet";
import { SeasonEvent } from "../data/season";
import { categoriaAllaPesa, etichettaPesa } from "../data/pesa";
import { avversarieTappa, faseTappa, TappaStato, TURNI_TAPPA } from "../data/eliminatoire";
import { idoneaAllaTappa } from "../lib/gravidanza";

/**
 * L'ÉLIMINATOIRE DU DIMANCHE — la tappa reale si gioca: pesa (stadera della
 * fase!), vigilia (Sac + limatura), poi il tabellone a eliminazione diretta:
 * quarti → semifinale → finale di tappa, contro Reines REALI della stessa
 * categoria. Il fiato si trascina tra i turni, come in una vera giornata di
 * eliminatorie: gestirlo È la gara.
 */

type Phase = "iscrizione" | "fight" | "passaggio" | "vinta" | "eliminata";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface EsitoTappa {
  vinta: boolean;
  categoria: string;
  reinaId: string;
  reinaNome: string;
  turniSuperati: number;
  /** Stile di gioco della giornata (per la Scuola della Reina). */
  stats?: SpintaStats;
}

export default function EliminatoireView({
  evento, stato, playerCows, respectScore, backpack, onConsumeItem, onFinish, onClose, playClick,
}: {
  evento: SeasonEvent;
  stato: TappaStato;
  playerCows: Vatsamon[];
  respectScore: number;
  backpack: BackpackItem[];
  onConsumeItem: (id: string) => void;
  onFinish: (esito: EsitoTappa) => void;
  onClose: () => void;
  playClick: () => void;
}) {
  const sorted = [...playerCows].sort((a, b) => b.cp - a.cp);
  const [cowId, setCowId] = useState(sorted[0]?.id);
  const cow = playerCows.find((c) => c.id === cowId) || sorted[0];
  const fase = faseTappa(evento);
  const pesoCow = cow ? (cow.peso_kg ?? 480 + Math.round(((cow.stats4?.stazza ?? cow.stats.defense) - 50) * 2.4)) : 0;
  const pesa = categoriaAllaPesa(pesoCow, fase);
  const avversarie = cow ? avversarieTappa(evento, pesa.cat, cow.name) : [];
  // IL VETERINARIO: alle tappe ufficiali si iscrivono bovine gravide
  // (≥3 mesi estive / ≥4 autunnali — regolamento reale, dossier §1)
  const idoneita = cow ? idoneaAllaTappa(cow.id, fase) : { ok: false, mesi: 0, soglia: 3 as const };

  const [phase, setPhase] = useState<Phase>("iscrizione");
  const [turno, setTurno] = useState(0); // 0=quarti, 1=semi, 2=finale
  const [loadout, setLoadout] = useState<string[]>([]);
  const [limato, setLimato] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [lunge, setLunge] = useState<"p" | "o" | null>(null);
  const [shake, setShake] = useState(false);

  const playerRef = useRef<Spintatore | null>(null);
  const oppsRef = useRef<Spintatore[]>([]);
  const fiatoRef = useRef(0); // il fiato si trascina tra i turni della giornata
  const stRef = useRef<SpintaState>({ barra: 50, fiatoP: 0, fiatoO: 0, calma: 80, stanceP: null, stanceO: null, esito: "corso" });
  const mossePRef = useRef<Record<AzioneId, Mossa> | null>(null);
  const mosseOppsRef = useRef<Record<AzioneId, Mossa>[]>([]);
  const statsRef = useRef<SpintaStats>(nuoveSpintaStats());
  const [infoMossa, setInfoMossa] = useState<Mossa | null>(null);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const st = stRef.current;
  const player = playerRef.current;
  const opp = oppsRef.current[turno];
  const tellAccuracy = 0.68 + respectScore * 0.0022;
  const pushLog = (line: string) => setLog((prev) => [line, ...prev].slice(0, 6));

  const persona = (i: number) => personalitaFromLegacy(undefined, evento.id.length * 7 + i * 13 + evento.comune.length);

  const iscrivi = () => {
    if (!cow || !limato || !idoneita.ok) return;
    playClick();
    const pf = buildPlayerFighter(cow);
    playerRef.current = spintatoreFromFighter(pf);
    fiatoRef.current = playerRef.current.fiatoMax;
    oppsRef.current = avversarie.map((a, i) => spintatoreFromFighter(buildScaledBoss(a, 0.95 + i * 0.08)));
    mossePRef.current = mosseEquipaggiate(cow);
    // in finale di tappa l'avversaria porta una mossa rara coerente con l'indole
    mosseOppsRef.current = oppsRef.current.map((o, i) => mosseAvversaria(o.name, persona(i), i === 2));
    statsRef.current = nuoveSpintaStats();
    const s0 = initSpinta(playerRef.current, oppsRef.current[0], { personalita: persona(0), tellAccuracy });
    stRef.current = s0;
    setTurno(0);
    setLog([`📯 ${evento.comune} · ${TURNI_TAPPA[0]}: ${playerRef.current.name} contro ${oppsRef.current[0].name}!`]);
    setPhase("fight");
    rerender();
  };

  const performTurn = async (side: "p" | "o", mossaId: string) => {
    const A = side === "p" ? player! : oppsRef.current[turno];
    const B = side === "p" ? oppsRef.current[turno] : player!;
    setLunge(side); await wait(150);
    const r = eseguiMossa(side, mossaId, stRef.current, A, B);
    stRef.current = r.state;
    fiatoRef.current = r.state.fiatoP;
    if (side === "p" && r.dettaglio) registraTurno(statsRef.current, r.dettaglio.famiglia, r.state.barra, r.state.turno ?? 0);
    pushLog(spiegaEsito(r) ?? r.log);
    const cronaca = cronacaTurno(r, { p: player!.name, o: oppsRef.current[turno].name });
    if (cronaca) pushLog(cronaca);
    rerender();
    setLunge(null);
    const fam = r.dettaglio?.famiglia;
    if (fam === "incalza" || fam === "gira") { setShake(true); await wait(150); setShake(false); }
    await wait(240);
  };

  const chiudi = (vinta: boolean, turniSuperati: number) => {
    const condotta = (stRef.current.turno ?? 0) >= MAX_TURNI;
    statsRef.current.vittoriaPerFiato = vinta && stRef.current.fiatoO <= 0;
    pushLog(cronacaEsito(vinta, !vinta && condotta, { p: player?.name ?? cow!.name, o: oppsRef.current[turno]?.name ?? "la rivale" }));
    setPhase(vinta ? "vinta" : "eliminata");
    setBusy(false);
    onFinish({ vinta, categoria: pesa.cat, reinaId: cow!.id, reinaNome: cow!.name, turniSuperati, stats: statsRef.current });
  };

  const avanzaTurno = async () => {
    if (turno >= 2) { chiudi(true, 3); return; }
    const next = turno + 1;
    setPhase("passaggio");
    rerender();
    await wait(1400);
    const s = initSpinta(player!, oppsRef.current[next], { personalita: persona(next), tellAccuracy });
    s.fiatoP = fiatoRef.current; // la giornata è una sola: il fiato resta quello
    stRef.current = s;
    setTurno(next);
    pushLog(`📯 ${TURNI_TAPPA[next]}: entra ${oppsRef.current[next].name}!`);
    setPhase("fight");
    rerender();
  };

  const mossaAvversaria2 = () =>
    mosseOppsRef.current[turno][pickAzioneAvversaria(stRef.current, oppsRef.current[turno], player!)].id;

  const doAction = async (mossa: Mossa) => {
    if (busy || phase !== "fight" || stRef.current.esito !== "corso") return;
    playClick(); setBusy(true); setShowBag(false);
    await performTurn("p", mossa.id);
    let esito = stRef.current.esito as SpintaState["esito"];
    if (esito === "vinto") { await avanzaTurno(); setBusy(false); return; }
    if (esito === "perso") { chiudi(false, turno); return; }
    await wait(200);
    await performTurn("o", mossaAvversaria2());
    esito = stRef.current.esito as SpintaState["esito"];
    if (esito === "vinto") { await avanzaTurno(); setBusy(false); return; }
    if (esito === "perso") { chiudi(false, turno); return; }
    setBusy(false);
  };

  const useItem = async (id: string) => {
    if (busy || phase !== "fight" || stRef.current.esito !== "corso") return;
    const eff = SAC_ITEMS[id];
    const owned = backpack.find((b) => b.id === id);
    if (!eff || !owned || owned.quantity <= 0) return;
    playClick(); setBusy(true); setShowBag(false);
    const s = stRef.current;
    if (eff.fiato) { s.fiatoP = Math.min(player!.fiatoMax, s.fiatoP + eff.fiato); fiatoRef.current = s.fiatoP; }
    if (eff.calma) s.calma = Math.min(100, s.calma + eff.calma);
    if (eff.presa && player) player.presa = Math.min(110, player.presa + eff.presa);
    pushLog(`🎒 ${eff.nome}: ${eff.desc}`);
    onConsumeItem(id); rerender();
    await wait(450);
    await performTurn("o", mossaAvversaria2());
    const esito = stRef.current.esito as SpintaState["esito"];
    if (esito === "vinto") { await avanzaTurno(); setBusy(false); return; }
    if (esito === "perso") { chiudi(false, turno); return; }
    setBusy(false);
  };

  const ritirati = () => {
    if (busy || phase !== "fight") return;
    playClick();
    if (!window.confirm("Ritiri la tua Reina dalla tappa? Conta come eliminazione.")) return;
    chiudi(false, turno);
  };

  const bagItems = backpack.filter((b) => SAC_ITEMS[b.id] && b.quantity > 0 && loadout.includes(b.id));
  const barraP = Math.round(st.barra);
  const dataIT = new Date(evento.data + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long" });

  // ====== ISCRIZIONE (pesa + vigilia) ======
  if (phase === "iscrizione") {
    const sacDisponibili = backpack.filter((b) => SAC_ITEMS[b.id] && b.quantity > 0);
    return (
      <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="eliminatoire-scene">
        <div className="aurora-bg" />
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800">
          <span className="text-xs font-mono font-black">📯 Éliminatoire · {evento.comune} · {dataIT}</span>
          <button onClick={() => { playClick(); onClose(); }} aria-label="Chiudi" className="bg-slate-900 rounded-full p-1.5 min-h-[36px] min-w-[36px]"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-[11px] text-slate-300 text-center bg-slate-900/70 border border-slate-800 rounded-2xl p-3">
            {stato === "memoriale" ? "Tappa del memoriale: rigiocabile, senza il timbro della domenica." :
              evento.finale ? "LA FINALE della Croix-Noire: tre titoli, uno per categoria." :
              "La tappa è aperta: eliminazione diretta, categoria decisa alla pesa."}
            {" "}Il <b className="text-amber-400">fiato si trascina</b> tra i turni: la giornata è una sola.
          </p>

          <div className="text-[10px] font-mono text-slate-400 text-center">Iscrivi la tua Reina:</div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-center">
            {sorted.map((c) => (
              <button key={c.id} onClick={() => { playClick(); setCowId(c.id); }}
                className={`flex-shrink-0 rounded-xl border-2 p-1.5 ${cowId === c.id ? "border-emerald-500 bg-emerald-950/40" : "border-slate-700 bg-slate-900/70"}`}>
                <CowVisual cow={c} className="w-12 h-12" />
                <div className="text-[10px] font-mono text-slate-200 truncate w-12">{c.name}</div>
              </button>
            ))}
          </div>

          {/* LA PESA — rito della stadera con le soglie DELLA FASE della tappa */}
          {cow && (
            <div className="bg-slate-900/70 border border-amber-700/40 rounded-2xl p-3 text-center" id="pesa-tappa">
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">⚖️ La pesa</div>
              <div className="text-sm font-mono font-black text-slate-100 mt-0.5">
                {cow.name} · {pesoCow} kg → <span className="text-amber-300">{etichettaPesa(pesoCow, fase)}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Avversarie di categoria: {avversarie.map((a) => a.name).join(" · ")}
              </div>
            </div>
          )}

          {/* IL VETERINARIO — requisito reale di gravidanza */}
          {cow && (
            <div className={`rounded-2xl border p-2.5 text-[10.5px] font-mono leading-snug ${idoneita.ok ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-300" : "border-rose-700/50 bg-rose-950/30 text-rose-300"}`} id="veterinario">
              {idoneita.ok
                ? `🩺 Il veterinario conferma: ${cow.name} è gravida da ≈${idoneita.mesi.toFixed(1)} mesi (≥${idoneita.soglia} richiesti per questa fase). Iscrizione valida.`
                : `🩺 Il veterinario: per il regolamento le bovine si iscrivono GRAVIDE — ≥${idoneita.soglia} mesi per questa fase. ${cow.name} è a ${idoneita.mesi.toFixed(1)} mesi: passa dalla Stalla (monta e cura quotidiana).`}
            </div>
          )}

          {/* Sac + limatura */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {sacDisponibili.map((b) => {
              const eff = SAC_ITEMS[b.id];
              const sel = loadout.includes(b.id);
              return (
                <button key={b.id} data-sac={b.id} title={eff.desc}
                  onClick={() => { playClick(); setLoadout(sel ? loadout.filter((x) => x !== b.id) : loadout.length < MAX_VIGILIA ? [...loadout, b.id] : loadout); }}
                  className={`rounded-xl border-2 px-2 py-1.5 text-[10px] font-mono font-bold min-h-[40px] ${sel ? "border-amber-500 bg-amber-500/15 text-amber-200" : "border-slate-700 bg-slate-900/70 text-slate-300"}`}>
                  {eff.emoji} {eff.nome.split(" ")[0]} ×{b.quantity}
                </button>
              );
            })}
          </div>
          <button
            id="rito-limatura"
            onClick={() => { if (!limato) { playClick(); setLimato(true); } }}
            className={`w-full rounded-xl border-2 p-2.5 text-left ${limato ? "border-emerald-500 bg-emerald-950/40" : "border-amber-600/60 bg-amber-500/10 animate-pulse"}`}
          >
            <div className={`text-[11px] font-mono font-black ${limato ? "text-emerald-500" : "text-amber-400"}`}>
              {limato ? "✓ Corna limate — si può spingere" : "🪒 Lima le corna (rito obbligatorio)"}
            </div>
            <div className="text-[9.5px] text-slate-400 leading-snug mt-0.5">{LIMATURA_TESTO}</div>
          </button>
        </div>
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex gap-2">
          <button onClick={() => { playClick(); onClose(); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-3 rounded-xl">Indietro</button>
          <button onClick={iscrivi} disabled={!cow || !limato || !idoneita.ok} id="tappa-start" className="flex-1 nav-active text-white font-mono font-black text-xs py-3 rounded-xl disabled:opacity-40 disabled:grayscale">Iscriviti e spingi! 📯</button>
        </div>
      </div>
    );
  }

  // ====== SCENA (fight / passaggio / esiti) ======
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="eliminatoire-scene">
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg,#fde68a22 0%,#e0f2fe 35%,#dcfce7 70%,#bbf7d0 100%)" }} />
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/75 backdrop-blur border-b border-slate-800">
        <span className="text-xs font-mono font-black">📯 {evento.comune} · {TURNI_TAPPA[turno]} ({turno + 1}/3)</span>
        <button onClick={() => { playClick(); onClose(); }} aria-label="Chiudi" className="bg-slate-900/70 rounded-full p-1.5 min-h-[36px] min-w-[36px]"><X size={16} /></button>
      </div>

      {/* tabellone compatto */}
      <div className="flex justify-center gap-1.5 px-3 py-1.5 bg-slate-950/70" id="tappa-bracket">
        {TURNI_TAPPA.map((t, i) => (
          <div key={t} className={`text-[9px] font-mono px-2 py-1 rounded-lg border ${i < turno ? "border-emerald-600 text-emerald-500 bg-emerald-950/40" : i === turno ? "border-amber-500 text-amber-300 bg-amber-500/10" : "border-slate-800 text-slate-500"}`}>
            {i < turno ? "✓ " : ""}{t}{oppsRef.current[i] ? ` · ${oppsRef.current[i].name.slice(0, 9)}` : ""}
          </div>
        ))}
      </div>

      {(phase === "fight" || phase === "passaggio") && player && opp && (
        <motion.div animate={shake ? { x: [0, -8, 7, -5, 0] } : {}} transition={{ duration: 0.35 }} className="relative flex-1 overflow-hidden">
          <div className="absolute top-14 right-3 flex flex-col items-end gap-1" style={{ width: "60%" }}>
            <Plate name={opp.name} breed={opp.breed} fiato={st.fiatoO} fiatoMax={opp.fiatoMax} champion={turno === 2} />
            <motion.div animate={lunge === "o" ? { x: -34, y: 34 } : { x: 0, y: 0 }} transition={{ duration: 0.15 }}>
              <div className="rounded-2xl overflow-hidden border-2 border-rose-400/60 shadow-xl"><CowVisual cow={opp.visual} className="w-24 h-24" /></div>
            </motion.div>
          </div>
          <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1" style={{ width: "60%" }}>
            <Plate name={player.name} breed={player.breed} fiato={st.fiatoP} fiatoMax={player.fiatoMax} calma={st.calma} />
            <motion.div animate={lunge === "p" ? { x: 34, y: -34 } : { x: 0, y: 0 }} transition={{ duration: 0.15 }}>
              <div className="rounded-2xl overflow-hidden border-2 border-emerald-400/70 shadow-xl"><CowVisual cow={player.visual} className="w-28 h-28" /></div>
            </motion.div>
          </div>

          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[78%] max-w-sm">
            <div className="flex justify-between text-[10px] font-mono font-black mb-0.5"><span className="text-emerald-600">{player.name}</span><span className="text-slate-700">SPINTA</span><span className="text-rose-500">{opp.name}</span></div>
            <div className="relative h-4 rounded-full bg-rose-400/40 border border-slate-700 overflow-hidden shadow-inner">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${barraP}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-slate-900/60" style={{ left: "50%" }} />
            </div>
          </div>

          {phase === "passaggio" && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
              <div className="text-center space-y-1">
                <div className="text-2xl">📯</div>
                <div className="text-sm font-mono font-black text-amber-300">Turno superato!</div>
                <div className="text-[11px] font-mono text-slate-300">Il fiato resta quello: gestiscilo.</div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      <div className="bg-slate-950/85 backdrop-blur border-t border-slate-800 p-3 space-y-2">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 h-[50px] overflow-y-auto no-scrollbar">
          {log.map((l, i) => <div key={i} className={`text-[10px] font-mono leading-snug ${i === 0 ? "text-slate-100" : "text-slate-500"}`}>❖ {l}</div>)}
        </div>

        {phase === "fight" && !showBag && (
          <>
            {st.tell && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-600/40 rounded-xl px-3 py-1.5" id="tappa-tell">
                <span aria-hidden="true">👁</span>
                <div className="text-[11px] font-mono text-amber-200 leading-tight">
                  L'avversaria <b>{st.tell}</b>…
                  <span className="text-[9px] text-slate-400 block">Indole {PERSONALITA_LABEL[st.personalita ?? "focosa"].label.toLowerCase()}</span>
                </div>
              </div>
            )}
            {mossePRef.current && (
              <MossePanel id="tappa-moves" mosse={mossePRef.current} st={st} busy={busy}
                onMossa={doAction} onInfo={(m) => { playClick(); setInfoMossa(m); }} />
            )}
            <div className="flex gap-2">
              <button onClick={() => { playClick(); setShowBag(true); }} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 border border-amber-700/40 text-amber-400 font-mono font-black text-xs py-2 rounded-xl disabled:opacity-40"><Backpack className="w-4 h-4" /> Sac ({bagItems.reduce((n, b) => n + b.quantity, 0)})</button>
              <button onClick={ritirati} disabled={busy} className="px-3 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2 rounded-xl disabled:opacity-40">Ritìrati</button>
            </div>
          </>
        )}

        {phase === "fight" && showBag && (
          <div className="space-y-1.5">
            {bagItems.length === 0 ? <p className="text-[10px] text-slate-500 text-center py-2">Sac vuoto: alla vigilia non hai portato scorte.</p> : bagItems.map((b) => {
              const eff = SAC_ITEMS[b.id];
              return (
                <button key={b.id} onClick={() => useItem(b.id)} disabled={busy} className="w-full flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-2 text-left disabled:opacity-40">
                  <span className="text-xl">{eff.emoji}</span>
                  <div className="flex-grow"><div className="text-[11px] font-mono font-black text-slate-100">{eff.nome}</div><div className="text-[9px] text-slate-400">{eff.desc}</div></div>
                  <span className="text-[10px] font-mono text-amber-400">×{b.quantity}</span>
                </button>
              );
            })}
            <button onClick={() => { playClick(); setShowBag(false); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-1.5 rounded-xl">Chiudi</button>
          </div>
        )}

        {phase === "vinta" && (
          <div className="text-center space-y-2 py-1" id="tappa-vinta">
            <div className="text-lg font-mono font-black text-emerald-600">🌹 TAPPA CONQUISTATA!</div>
            <div className="text-[11px] font-mono text-slate-300">
              {evento.finale
                ? `${cow?.name} è Reine des Reines ${pesa.cat} categoria alla Croix-Noire!`
                : `${cow?.name} vince a ${evento.comune}: mécro, sonnaille e collare sono suoi.`}
            </div>
            <button onClick={() => { playClick(); onClose(); }} className="w-full nav-active text-white font-mono font-black text-xs py-2.5 rounded-xl">Alla bacheca dei trofei</button>
          </div>
        )}
        {phase === "eliminata" && (
          <div className="text-center space-y-2 py-1" id="tappa-eliminata">
            <div className="text-lg font-mono font-black text-rose-500">La tua Reina si ritira a testa alta</div>
            <div className="text-[11px] font-mono text-slate-300">Eliminazione diretta: finisce qui, come nelle batailles vere. La tappa resta rigiocabile.</div>
            <button onClick={() => { playClick(); onClose(); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-black text-xs py-2.5 rounded-xl">Torna alla Stagione</button>
          </div>
        )}
      </div>

      {infoMossa && <MossaInfoSheet mossa={infoMossa} onClose={() => setInfoMossa(null)} playClick={playClick} />}
    </div>
  );
}

function Plate({ name, breed, fiato, fiatoMax, calma, champion = false }: {
  name: string; breed: string; fiato: number; fiatoMax: number; calma?: number; champion?: boolean;
}) {
  const fiatoPct = Math.max(0, Math.min(100, Math.round((fiato / fiatoMax) * 100)));
  return (
    <div className={`bg-slate-950/85 border rounded-xl px-2.5 py-1.5 shadow-lg ${champion ? "border-amber-500" : "border-slate-700"}`} style={{ minWidth: 150 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono font-black text-slate-100 truncate">{champion ? "👑 " : ""}{name}</span>
        <span className="text-[9px] font-mono text-slate-400">{breed}</span>
      </div>
      <div className="text-[9px] font-mono text-slate-500 mt-0.5">FIATO</div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700"><div className="h-full bg-sky-400 transition-all duration-400" style={{ width: `${fiatoPct}%` }} /></div>
      {calma !== undefined && (
        <>
          <div className="text-[9px] font-mono text-slate-500 mt-0.5">CALMA</div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full transition-all duration-400" style={{ width: `${calma}%`, background: calma < 35 ? "#ef4444" : "#a78bfa" }} /></div>
        </>
      )}
    </div>
  );
}
