import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Backpack, X, Repeat } from "lucide-react";
import { Vatsamon, BackpackItem } from "../types";
import { CowVisual } from "./CowVisual";
import { buildPlayerFighter, buildScaledBoss } from "../lib/battle";
import {
  Spintatore, SpintaState, AzioneId, PERSONALITA_LABEL, Personalita, personalitaFromLegacy,
  spintatoreFromFighter, initSpinta, pickAzioneAvversaria, MAX_TURNI,
} from "../lib/spinta";
import { SAC_ITEMS, MAX_VIGILIA, LIMATURA_TESTO } from "../data/sac";
import { Dungeon } from "../data/dungeons";
import { REAL_COWS } from "../data/realCows";
import { Mossa, mosseEquipaggiate, mosseAvversaria, eseguiMossa } from "../data/mosse";
import { spiegaEsito, cronacaTurno, cronacaEsito } from "../data/telecronaca";
import { SpintaStats, nuoveSpintaStats, registraTurno, campionaBarra } from "../lib/scuola";
import { MossePanel } from "./battle/MossePanel";
import { MossaInfoSheet } from "./battle/MossaInfoSheet";

type Phase = "team" | "fight" | "won" | "lost";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function DungeonRun({
  dungeon, playerCows, respectScore, backpack, onConsumeItem, onResult, onClose, playClick,
}: {
  dungeon: Dungeon;
  playerCows: Vatsamon[];
  /** Rispetto 0..100: affina la lettura dei tell. */
  respectScore: number;
  backpack: BackpackItem[];
  onConsumeItem: (id: string) => void;
  /** `squadra` = TUTTE le partecipanti con le proprie stats: le imprese di
   *  stile le impara chi le compie, anche se non chiude la Lega. */
  onResult: (won: boolean, cowId?: string, stats?: SpintaStats, squadra?: { cowId: string; stats: SpintaStats }[]) => void;
  onClose: () => void;
  playClick: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("team");
  const [picked, setPicked] = useState<string[]>(() => [...playerCows].sort((a, b) => b.cp - a.cp).slice(0, 4).map((c) => c.id));
  const [activeIdx, setActiveIdx] = useState(0);
  const [oppIdx, setOppIdx] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [loadout, setLoadout] = useState<string[]>([]);
  const [limato, setLimato] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [lunge, setLunge] = useState<"p" | "o" | null>(null);
  const [shake, setShake] = useState(false);

  const teamRef = useRef<Spintatore[]>([]);
  const oppsRef = useRef<Spintatore[]>([]);
  const fiatoRef = useRef<number[]>([]); // fiato per Reina della squadra (si trascina)
  const stRef = useRef<SpintaState>({ barra: 50, fiatoP: 0, fiatoO: 0, calma: 80, stanceP: null, stanceO: null, esito: "corso" });
  const persRef = useRef<Personalita[]>([]);
  const cowIdsRef = useRef<string[]>([]);
  const mosseTeamRef = useRef<Record<AzioneId, Mossa>[]>([]);
  const mosseOppsRef = useRef<Record<AzioneId, Mossa>[]>([]);
  // Stile di gioco PER REINA: le imprese le impara chi le compie, non chi chiude la Lega.
  const statsTeamRef = useRef<SpintaStats[]>([]);
  const [infoMossa, setInfoMossa] = useState<Mossa | null>(null);
  const tellAccuracy = 0.68 + respectScore * 0.0022;
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const st = stRef.current;
  const pushLog = (line: string) => setLog((prev) => [line, ...prev].slice(0, 6));

  const active = teamRef.current[activeIdx];
  const opp = oppsRef.current[oppIdx];

  const start = () => {
    playClick();
    const cows = picked.map((id) => playerCows.find((c) => c.id === id)!).filter(Boolean);
    const teamF = cows.map(buildPlayerFighter);
    const team = teamF.map(spintatoreFromFighter);
    teamRef.current = team;
    cowIdsRef.current = cows.map((c) => c.id);
    fiatoRef.current = team.map((s) => s.fiatoMax);
    // Avversarie con STAT ASSOLUTE: Reines reali al loro assetto, modulate dal
    // powerFactor del percorso — niente più boss "elastici" sul giocatore.
    oppsRef.current = dungeon.opponents.map((o) => {
      const visual = REAL_COWS.find((c) => c.name === o.name) ||
        REAL_COWS.filter((c) => c.rarity === o.rarity && c.realPhoto)[0] ||
        REAL_COWS.filter((c) => c.realPhoto)[0] || REAL_COWS[0];
      return spintatoreFromFighter(buildScaledBoss({ ...visual, name: o.name }, o.powerFactor));
    });
    persRef.current = dungeon.opponents.map((o, i) => personalitaFromLegacy(o.type, i));
    mosseTeamRef.current = cows.map(mosseEquipaggiate);
    // il Campione (ultima spinta) porta una mossa rara coerente con l'indole
    mosseOppsRef.current = dungeon.opponents.map((o, i) =>
      mosseAvversaria(o.name, persRef.current[i], i === dungeon.opponents.length - 1));
    statsTeamRef.current = cows.map(() => nuoveSpintaStats());
    const s0 = initSpinta(team[0], oppsRef.current[0], { personalita: persRef.current[0], tellAccuracy });
    s0.fiatoP = fiatoRef.current[0];
    stRef.current = s0;
    campionaBarra(statsTeamRef.current[0], s0.barra); // l'ingaggio può già partire in svantaggio
    setActiveIdx(0); setOppIdx(0);
    setLog([`${dungeon.emoji} ${dungeon.league}: 5 spinte consecutive! Sfidante 1 — ${dungeon.opponents[0].name}`]);
    setShowBag(false); setShowSwitch(false);
    setPhase("fight"); rerender();
  };

  const performTurn = async (side: "p" | "o", mossaId: string) => {
    const A = side === "p" ? teamRef.current[activeIdx] : oppsRef.current[oppIdx];
    const B = side === "p" ? oppsRef.current[oppIdx] : teamRef.current[activeIdx];
    setLunge(side); await wait(150);
    const r = eseguiMossa(side, mossaId, stRef.current, A, B);
    stRef.current = r.state;
    fiatoRef.current[activeIdx] = r.state.fiatoP; // il fiato della Reina attiva si trascina
    if (side === "p" && r.dettaglio) registraTurno(statsTeamRef.current[activeIdx], r.dettaglio.famiglia, r.state.barra, r.state.turno ?? 0);
    campionaBarra(statsTeamRef.current[activeIdx], r.state.barra); // anche i cali causati dall'avversaria
    pushLog(spiegaEsito(r) ?? r.log);
    const cronaca = cronacaTurno(r, { p: teamRef.current[activeIdx].name, o: oppsRef.current[oppIdx].name });
    if (cronaca) pushLog(cronaca);
    rerender();
    setLunge(null);
    const fam = r.dettaglio?.famiglia;
    if (fam === "incalza" || fam === "gira") { setShake(true); await wait(150); setShake(false); }
    await wait(240);
  };

  // L'avversaria cede → prossimo sfidante (il fiato della tua Reina si trascina)
  const advanceOpponent = async () => {
    if (oppIdx >= oppsRef.current.length - 1) {
      const stats = statsTeamRef.current[activeIdx]; // la Reina che chiude
      stats.vittoriaPerFiato = stRef.current.fiatoO <= 0;
      // il giudizio può arrivare sull'azione avversaria: registraTurno non lo vede
      if ((stRef.current.turno ?? 0) >= MAX_TURNI) stats.giudizio = true;
      // tutte le partecipanti (chi ha giocato almeno un'azione), con le PROPRIE stats
      const squadra = cowIdsRef.current
        .map((cowId, i) => ({ cowId, stats: statsTeamRef.current[i] }))
        .filter((m) => Object.values(m.stats.perFamiglia).some((n) => n > 0));
      pushLog(cronacaEsito(true, false, { p: teamRef.current[activeIdx].name, o: oppsRef.current[oppIdx].name }));
      setPhase("won"); onResult(true, cowIdsRef.current[activeIdx], stats, squadra); return;
    }
    const next = oppIdx + 1;
    const s = initSpinta(teamRef.current[activeIdx], oppsRef.current[next], { personalita: persRef.current[next], tellAccuracy });
    s.fiatoP = fiatoRef.current[activeIdx]; // carry
    stRef.current = s;
    campionaBarra(statsTeamRef.current[activeIdx], s.barra);
    setOppIdx(next);
    pushLog(`⬇️ ${dungeon.opponents[oppIdx].name} cede e si ritira! Sfidante ${next + 1}: ${dungeon.opponents[next].name}`);
    rerender();
    await wait(500);
  };

  // La tua Reina cede → entra la prossima viva (riparte la spinta sullo stesso sfidante)
  const cowRetreats = (): boolean => {
    fiatoRef.current[activeIdx] = 0;
    pushLog(`💨 ${teamRef.current[activeIdx].name} cede e si ritira.`);
    const nextAlive = fiatoRef.current.findIndex((f) => f > 0);
    if (nextAlive === -1) {
      pushLog(cronacaEsito(false, false, { p: teamRef.current[activeIdx].name, o: oppsRef.current[oppIdx].name }));
      setPhase("lost"); onResult(false); return false;
    }
    const s = initSpinta(teamRef.current[nextAlive], oppsRef.current[oppIdx], { personalita: persRef.current[oppIdx], tellAccuracy });
    s.fiatoP = fiatoRef.current[nextAlive];
    stRef.current = s;
    campionaBarra(statsTeamRef.current[nextAlive], s.barra);
    setActiveIdx(nextAlive);
    pushLog(`➡️ Scende in campo ${teamRef.current[nextAlive].name}!`);
    rerender();
    return true;
  };

  const opponentTurn = async () => {
    const fam = pickAzioneAvversaria(stRef.current, oppsRef.current[oppIdx], teamRef.current[activeIdx]);
    await performTurn("o", mosseOppsRef.current[oppIdx][fam].id);
    // la spinta può risolversi anche nel turno avversario (es. risoluzione a tempo)
    if (stRef.current.esito === "vinto") { await advanceOpponent(); setBusy(false); return; }
    if (stRef.current.esito === "perso") { if (!cowRetreats()) return; }
    setBusy(false);
  };

  const doAction = async (mossa: Mossa) => {
    if (busy || phase !== "fight") return;
    playClick(); setBusy(true); setShowBag(false); setShowSwitch(false);
    await performTurn("p", mossa.id);
    if (stRef.current.esito === "vinto") { await advanceOpponent(); setBusy(false); return; }
    if (stRef.current.esito === "perso") { if (!cowRetreats()) return; }
    await wait(220);
    await opponentTurn();
  };

  const useItem = async (id: string) => {
    if (busy || phase !== "fight") return;
    const eff = SAC_ITEMS[id]; const owned = backpack.find((b) => b.id === id);
    if (!eff || !owned || owned.quantity <= 0) return;
    playClick(); setBusy(true); setShowBag(false);
    const s = stRef.current; const A = teamRef.current[activeIdx];
    if (eff.fiato) { s.fiatoP = Math.min(A.fiatoMax, s.fiatoP + eff.fiato); fiatoRef.current[activeIdx] = s.fiatoP; }
    if (eff.calma) s.calma = Math.min(100, s.calma + eff.calma);
    if (eff.presa) A.presa = Math.min(110, A.presa + eff.presa);
    pushLog(`🎒 ${eff.nome}: ${eff.desc}`);
    onConsumeItem(id); rerender();
    await wait(450);
    await opponentTurn();
  };

  const switchTo = async (idx: number) => {
    if (busy || phase !== "fight" || idx === activeIdx || fiatoRef.current[idx] <= 0) return;
    playClick(); setBusy(true); setShowSwitch(false);
    const s = stRef.current;
    s.fiatoP = fiatoRef.current[idx]; s.calma = 80;
    setActiveIdx(idx);
    pushLog(`🔄 Entra in campo ${teamRef.current[idx].name}!`);
    rerender();
    await wait(420);
    await opponentTurn();
  };

  // ====== RENDER team select ======
  if (phase === "team") {
    const sorted = [...playerCows].sort((a, b) => b.cp - a.cp);
    return (
      <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="dungeon-scene">
        <div className="aurora-bg" />
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800">
          <span className="text-xs font-mono font-black">{dungeon.emoji} {dungeon.league}</span>
          <button onClick={() => { playClick(); onClose(); }} className="bg-slate-900 rounded-full p-1.5"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-[11px] text-slate-300 text-center bg-slate-900/70 border border-slate-800 rounded-2xl p-3">
            {dungeon.blurb}<br /><b className="text-amber-400">5 spinte di fila</b> (4 sfidanti + Campione). Il <b>fiato</b> delle tue Reines si trascina: dai il cambio con saggezza. Se tutta la mandria si ritira, riparti da capo.
          </p>
          <div className="text-[10px] font-mono text-slate-400 text-center">Scegli fino a 4 Reines per la squadra ({picked.length}/4):</div>
          <div className="grid grid-cols-3 gap-2">
            {sorted.map((c) => {
              const sel = picked.includes(c.id);
              return (
                <button key={c.id} onClick={() => { playClick(); setPicked((p) => p.includes(c.id) ? p.filter((x) => x !== c.id) : p.length < 4 ? [...p, c.id] : p); }}
                  className={`rounded-xl border-2 p-1.5 ${sel ? "border-emerald-500 bg-emerald-950/50" : "border-slate-700 bg-slate-900/70"}`}>
                  <CowVisual cow={c} className="w-full h-14" />
                  <div className="text-[10px] font-mono text-slate-200 truncate mt-0.5">{c.name}</div>
                  <div className="text-[10px] font-mono text-amber-400">Pot. {c.cp}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 space-y-2">
          {/* Lo Sac du Berger + rito della limatura */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {backpack.filter((b) => SAC_ITEMS[b.id] && b.quantity > 0).map((b) => {
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
            className={`w-full rounded-xl border-2 p-2 text-left ${limato ? "border-emerald-500 bg-emerald-950/40" : "border-amber-600/60 bg-amber-500/10 animate-pulse"}`}
          >
            <div className={`text-[11px] font-mono font-black ${limato ? "text-emerald-500" : "text-amber-400"}`}>
              {limato ? "✓ Corna limate — la mandria è pronta" : "🪒 Lima le corna (rito obbligatorio)"}
            </div>
            <div className="text-[9.5px] text-slate-400 leading-snug mt-0.5">{LIMATURA_TESTO}</div>
          </button>
          <div className="flex gap-2">
            <button onClick={() => { playClick(); onClose(); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-3 rounded-xl">Annulla</button>
            <button onClick={start} disabled={picked.length === 0 || !limato} id="dungeon-start" className="flex-1 nav-active text-white font-mono font-black text-xs py-3 rounded-xl disabled:opacity-40 disabled:grayscale">Entra nella Lega! 🐂</button>
          </div>
        </div>
      </div>
    );
  }

  if (!active || !opp) return null;
  const barraP = Math.round(st.barra);
  const bagItems = backpack.filter((b) => SAC_ITEMS[b.id] && b.quantity > 0 && loadout.includes(b.id));

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="dungeon-scene">
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg,#cdd5e3 0%,#e2e8f0 35%,#dcfce7 70%,#bbf7d0 100%)" }} />
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/75 backdrop-blur border-b border-slate-800">
        <span className="text-xs font-mono font-black">{dungeon.emoji} {dungeon.league} · Spinta {oppIdx + 1}/5</span>
        <button onClick={() => { playClick(); onClose(); }} className="bg-slate-900/70 rounded-full p-1.5"><X size={16} /></button>
      </div>

      {phase === "fight" && (
        <motion.div animate={shake ? { x: [0, -8, 7, -5, 0] } : {}} transition={{ duration: 0.35 }} className="relative flex-1 overflow-hidden">
          {/* avversario */}
          <div className="absolute top-16 right-3 flex flex-col items-end gap-1" style={{ width: "60%" }}>
            <Plate name={opp.name} breed={opp.breed} fiato={st.fiatoO} fiatoMax={opp.fiatoMax} calma={st.calmaO ?? 80} champion={oppIdx === 4} />
            <motion.div animate={lunge === "o" ? { x: -34, y: 34 } : { x: 0, y: 0 }} transition={{ duration: 0.15 }}>
              <div className="rounded-2xl overflow-hidden border-2 border-rose-400/60 shadow-xl"><CowVisual cow={opp.visual} className="w-24 h-24" /></div>
            </motion.div>
          </div>
          {/* giocatore */}
          <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1" style={{ width: "60%" }}>
            <Plate name={active.name} breed={active.breed} fiato={st.fiatoP} fiatoMax={active.fiatoMax} calma={st.calma} />
            <motion.div animate={lunge === "p" ? { x: 34, y: -34 } : { x: 0, y: 0 }} transition={{ duration: 0.15 }}>
              <div className="rounded-2xl overflow-hidden border-2 border-emerald-400/70 shadow-xl"><CowVisual cow={active.visual} className="w-28 h-28" /></div>
            </motion.div>
          </div>

          {/* BARRA DI SPINTA */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[78%] max-w-sm">
            <div className="flex justify-between text-[10px] font-mono font-black mb-0.5"><span className="text-emerald-600">{active.name}</span><span className="text-slate-700">SPINTA</span><span className="text-rose-500">{opp.name}</span></div>
            <div className="relative h-4 rounded-full bg-rose-400/40 border border-slate-700 overflow-hidden shadow-inner">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${barraP}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-slate-900/60" style={{ left: "50%" }} />
            </div>
          </div>
        </motion.div>
      )}

      {/* roster squadra (fiato che si trascina) */}
      {phase === "fight" && (
        <div className="flex justify-center gap-1.5 px-3 py-1.5 bg-slate-950/70">
          {teamRef.current.map((f, i) => {
            const fi = fiatoRef.current[i]; const out = fi <= 0; const cur = i === activeIdx;
            return (
              <div key={i} className={`flex flex-col items-center rounded-lg px-1.5 py-1 border ${cur ? "border-emerald-500 bg-emerald-950/40" : out ? "border-slate-800 bg-slate-900/40 opacity-50" : "border-slate-700 bg-slate-900/60"}`}>
                <span className="text-[10px] font-mono text-slate-200 truncate max-w-[52px]">{out ? "💨" : "🐮"} {f.name.slice(0, 6)}</span>
                <div className="w-12 h-1 rounded-full bg-slate-800 overflow-hidden mt-0.5"><div className="h-full bg-sky-400" style={{ width: `${Math.max(0, Math.round((fi / f.fiatoMax) * 100))}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-slate-950/85 backdrop-blur border-t border-slate-800 p-3 space-y-2">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 h-[50px] overflow-y-auto no-scrollbar">
          {log.map((l, i) => <div key={i} className={`text-[10px] font-mono leading-snug ${i === 0 ? "text-slate-100" : "text-slate-500"}`}>❖ {l}</div>)}
        </div>

        {phase === "fight" && !showBag && !showSwitch && (
          <>
            {st.tell && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-600/40 rounded-xl px-3 py-1.5">
                <span aria-hidden="true">👁</span>
                <div className="text-[11px] font-mono text-amber-200 leading-tight">
                  L'avversaria <b>{st.tell}</b>…
                  <span className="text-[9px] text-slate-400 block">Indole {PERSONALITA_LABEL[st.personalita ?? "focosa"].label.toLowerCase()}</span>
                </div>
              </div>
            )}
            {mosseTeamRef.current[activeIdx] && (
              <MossePanel id="dungeon-moves" mosse={mosseTeamRef.current[activeIdx]} st={st} busy={busy}
                onMossa={doAction} onInfo={(m) => { playClick(); setInfoMossa(m); }} />
            )}
            <div className="flex gap-2">
              <button onClick={() => { playClick(); setShowSwitch(true); }} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 border border-emerald-700/40 text-emerald-600 font-mono font-black text-xs py-2 rounded-xl disabled:opacity-40"><Repeat className="w-4 h-4" /> Cambia</button>
              <button onClick={() => { playClick(); setShowBag(true); }} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 border border-amber-700/40 text-amber-400 font-mono font-black text-xs py-2 rounded-xl disabled:opacity-40"><Backpack className="w-4 h-4" /> Sac ({bagItems.reduce((n, b) => n + b.quantity, 0)})</button>
              <button onClick={() => {
                if (busy) return;
                playClick();
                if (!window.confirm("Ritiri la mandria? La Lega conta come persa.")) return;
                setPhase("lost"); onResult(false);
              }} disabled={busy} className="px-3 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2 rounded-xl disabled:opacity-40">Ritìrati</button>
            </div>
          </>
        )}

        {phase === "fight" && showSwitch && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono text-slate-400 text-center">Dai il cambio (consuma il turno)</div>
            <div className="grid grid-cols-2 gap-2">
              {teamRef.current.map((f, i) => (
                <button key={i} disabled={busy || i === activeIdx || fiatoRef.current[i] <= 0} onClick={() => switchTo(i)} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 text-left disabled:opacity-40">
                  <CowVisual cow={f.visual} className="w-9 h-9" />
                  <div><div className="text-[10px] font-mono font-black text-slate-100">🐮 {f.name}</div><div className="text-[10px] font-mono text-slate-400">{fiatoRef.current[i] <= 0 ? "si ritira" : `${Math.round(fiatoRef.current[i])} fiato`}</div></div>
                </button>
              ))}
            </div>
            <button onClick={() => { playClick(); setShowSwitch(false); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-1.5 rounded-xl">Indietro</button>
          </div>
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

        {phase === "won" && (
          <div className="text-center space-y-2 py-1">
            <div className="text-lg font-mono font-black text-emerald-600">🏆 LEGA CONQUISTATA!</div>
            <div className="text-[11px] font-mono text-slate-300">Medaglia {dungeon.badgeEmoji} {dungeon.badgeName} · +{dungeon.rewardCoins} 🪙 · +{dungeon.rewardXp} XP · oggetti rari!</div>
            <button onClick={() => { playClick(); onClose(); }} className="w-full nav-active text-white font-mono font-black text-xs py-2.5 rounded-xl">Torna alla mappa</button>
          </div>
        )}
        {phase === "lost" && (
          <div className="text-center space-y-2 py-1">
            <div className="text-lg font-mono font-black text-rose-500">😔 La tua mandria si ritira</div>
            <div className="text-[11px] font-mono text-slate-300">La {dungeon.league} ti ha respinto. Rinforza la squadra e riprova!</div>
            <button onClick={() => { playClick(); onClose(); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-black text-xs py-2.5 rounded-xl">Torna alla mappa</button>
          </div>
        )}
      </div>

      {infoMossa && <MossaInfoSheet mossa={infoMossa} onClose={() => setInfoMossa(null)} playClick={playClick} />}
    </div>
  );
}

/** Targhetta Fiato (+ Calma per il giocatore) di un combattente nel dungeon. */
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
