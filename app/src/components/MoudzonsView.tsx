import { useRef, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Vatsamon } from "../types";
import { CowVisual } from "./CowVisual";
import { buildPlayerFighter } from "../lib/battle";
import {
  Spintatore, SpintaState, AzioneId, AZIONI, PERSONALITA_LABEL, personalitaFromLegacy,
  spintatoreFromFighter, initSpinta, applyAzione, pickAzioneAvversaria,
} from "../lib/spinta";
import { LIMATURA_TESTO } from "../data/sac";

/**
 * LA BATAILLE DES MOUDZONS — il torneo junior reale (dossier §3: categoria
 * collaterale "Bataille des moudzons", manze/junior). I capi NATI NELLA TUA
 * STALLA (stadi moudzon/manza) debuttano qui, tra pari età: 2 spinte
 * amichevoli contro giovani avversarie. Chi vince "si fa un nome" prima
 * della carriera da adulta. Niente requisito di gravidanza: sono giovani.
 * Le avversarie junior sono generate dal gioco (come i Pastori), non
 * spacciate per animali reali.
 */

type Phase = "intro" | "fight" | "vinto" | "perso";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TURNI = ["Prima spinta", "Finale junior"] as const;

export default function MoudzonsView({ giovani, respectScore, anno, onResult, onClose, playClick }: {
  giovani: Vatsamon[];             // capi bornInStalla in stadio moudzon/manza
  respectScore: number;
  anno: string;
  onResult: (won: boolean, cowId: string) => void;
  onClose: () => void;
  playClick: () => void;
}) {
  const [cowId, setCowId] = useState(giovani[0]?.id);
  const cow = giovani.find((c) => c.id === cowId) || giovani[0];
  const [phase, setPhase] = useState<Phase>("intro");
  const [turno, setTurno] = useState(0);
  const [limato, setLimato] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [lunge, setLunge] = useState<"p" | "o" | null>(null);

  const playerRef = useRef<Spintatore | null>(null);
  const oppsRef = useRef<Spintatore[]>([]);
  const stRef = useRef<SpintaState>({ barra: 50, fiatoP: 0, fiatoO: 0, calma: 80, stanceP: null, stanceO: null, esito: "corso" });
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const st = stRef.current;
  const player = playerRef.current;
  const opp = oppsRef.current[turno];
  const tellAccuracy = 0.68 + respectScore * 0.0022;
  const pushLog = (line: string) => setLog((prev) => [line, ...prev].slice(0, 6));

  /** Avversarie junior GENERATE (dichiarate: livello di gioco, non anagrafe). */
  const juniorOpp = (i: number): Spintatore => {
    const nomi = ["Modzon de Vertosan", "Modzon de Cogne"];
    const presa = 42 + i * 12;
    const volonta = 60 + i * 10;
    return {
      name: nomi[i], breed: "Castana",
      massa: 22 + i * 6, presa, volonta, fiatoMax: 100 + volonta,
      visual: { name: nomi[i], breed: "Castana", rarity: "Comune", realPhoto: null },
    };
  };

  const begin = () => {
    if (!cow || !limato) return;
    playClick();
    playerRef.current = spintatoreFromFighter(buildPlayerFighter(cow));
    oppsRef.current = [juniorOpp(0), juniorOpp(1)];
    stRef.current = initSpinta(playerRef.current, oppsRef.current[0], { personalita: personalitaFromLegacy(undefined, anno.length + 1), tellAccuracy });
    setTurno(0);
    setLog([`🐮 Bataille des Moudzons: ${cow.name} debutta contro ${oppsRef.current[0].name}!`]);
    setPhase("fight");
    rerender();
  };

  const performTurn = async (side: "p" | "o", azione: AzioneId) => {
    const A = side === "p" ? player! : oppsRef.current[turno];
    const B = side === "p" ? oppsRef.current[turno] : player!;
    setLunge(side); await wait(140);
    const r = applyAzione(side, azione, stRef.current, A, B);
    stRef.current = r.state;
    pushLog(r.log);
    rerender();
    setLunge(null);
    await wait(220);
  };

  const avanza = async () => {
    if (turno >= 1) { setPhase("vinto"); setBusy(false); onResult(true, cow!.id); return; }
    const s = initSpinta(player!, oppsRef.current[1], { personalita: personalitaFromLegacy(undefined, anno.length + 5), tellAccuracy });
    s.fiatoP = stRef.current.fiatoP; // anche i giovani fanno la giornata intera
    stRef.current = s;
    setTurno(1);
    pushLog(`🐮 ${TURNI[1]}: entra ${oppsRef.current[1].name}!`);
    rerender();
  };

  const doAction = async (azione: AzioneId) => {
    if (busy || phase !== "fight" || stRef.current.esito !== "corso") return;
    playClick(); setBusy(true);
    await performTurn("p", azione);
    let esito = stRef.current.esito as SpintaState["esito"];
    if (esito === "vinto") { await avanza(); setBusy(false); return; }
    if (esito === "perso") { setPhase("perso"); setBusy(false); onResult(false, cow!.id); return; }
    await wait(180);
    await performTurn("o", pickAzioneAvversaria(stRef.current, oppsRef.current[turno], player!));
    esito = stRef.current.esito as SpintaState["esito"];
    if (esito === "vinto") { await avanza(); setBusy(false); return; }
    if (esito === "perso") { setPhase("perso"); setBusy(false); onResult(false, cow!.id); return; }
    setBusy(false);
  };

  const barraP = Math.round(st.barra);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="moudzons-scene">
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg,#fef3c7 0%,#e0f2fe 40%,#dcfce7 100%)" }} />
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/75 backdrop-blur border-b border-slate-800">
        <span className="text-xs font-mono font-black">🐮 Bataille des Moudzons {anno}{phase === "fight" ? ` · ${TURNI[turno]}` : ""}</span>
        <button onClick={() => { playClick(); onClose(); }} aria-label="Chiudi" className="bg-slate-900/70 rounded-full p-1.5 min-h-[36px] min-w-[36px]"><X size={16} /></button>
      </div>

      {phase === "intro" && (
        <div className="flex-1 flex flex-col items-center justify-center p-5 gap-4 text-center overflow-y-auto">
          <div className="text-5xl" aria-hidden="true">🐮</div>
          <p className="text-[11px] text-slate-300 bg-slate-900/70 border border-slate-800 rounded-2xl p-3 max-w-sm">
            Il circuito ha il suo vivaio: la <b className="text-amber-400">Bataille des moudzons</b> è la gara
            delle giovani (manze/junior). I tuoi capi nati in stalla debuttano tra pari età —
            niente gravidanza richiesta, si impara a spingere.
          </p>
          <div className="w-full max-w-sm">
            <div className="text-[10px] font-mono text-slate-400 mb-1">Chi debutta oggi?</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-center">
              {giovani.map((c) => (
                <button key={c.id} data-moudzon={c.id} onClick={() => { playClick(); setCowId(c.id); }}
                  className={`flex-shrink-0 rounded-xl border-2 p-1.5 ${cowId === c.id ? "border-emerald-500 bg-emerald-950/40" : "border-slate-700 bg-slate-900/70"}`}>
                  <CowVisual cow={c} className="w-12 h-12" />
                  <div className="text-[10px] font-mono text-slate-200 truncate w-12">{c.name}</div>
                </button>
              ))}
            </div>
          </div>
          <button
            id="rito-limatura"
            onClick={() => { if (!limato) { playClick(); setLimato(true); } }}
            className={`w-full max-w-sm rounded-xl border-2 p-2.5 text-left ${limato ? "border-emerald-500 bg-emerald-950/40" : "border-amber-600/60 bg-amber-500/10 animate-pulse"}`}
          >
            <div className={`text-[11px] font-mono font-black ${limato ? "text-emerald-500" : "text-amber-400"}`}>
              {limato ? "✓ Corna limate — anche per i giovani" : "🪒 Lima le corna (rito obbligatorio)"}
            </div>
            <div className="text-[9.5px] text-slate-400 leading-snug mt-0.5">{LIMATURA_TESTO}</div>
          </button>
          <div className="flex gap-2 w-full max-w-sm">
            <button onClick={() => { playClick(); onClose(); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-3 rounded-xl">Indietro</button>
            <button onClick={begin} id="moudzons-start" disabled={!cow || !limato} className="flex-1 nav-active text-white font-mono font-black text-xs py-3 rounded-xl disabled:opacity-40 disabled:grayscale">Al debutto! 🐮</button>
          </div>
        </div>
      )}

      {phase !== "intro" && player && opp && (
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute top-14 right-3 flex flex-col items-end gap-1" style={{ width: "58%" }}>
            <div className="bg-slate-950/85 border border-slate-700 rounded-xl px-2.5 py-1.5" style={{ minWidth: 140 }}>
              <span className="text-[11px] font-mono font-black text-slate-100">{opp.name}</span>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-1"><div className="h-full bg-sky-400 transition-all" style={{ width: `${Math.max(0, Math.round((st.fiatoO / opp.fiatoMax) * 100))}%` }} /></div>
            </div>
            <motion.div animate={lunge === "o" ? { x: -30, y: 30 } : { x: 0, y: 0 }} transition={{ duration: 0.14 }}>
              <div className="rounded-2xl overflow-hidden border-2 border-rose-400/60 shadow-xl"><CowVisual cow={opp.visual} className="w-20 h-20" /></div>
            </motion.div>
          </div>
          <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1" style={{ width: "58%" }}>
            <div className="bg-slate-950/85 border border-slate-700 rounded-xl px-2.5 py-1.5" style={{ minWidth: 140 }}>
              <span className="text-[11px] font-mono font-black text-slate-100">{player.name}</span>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-1"><div className="h-full bg-sky-400 transition-all" style={{ width: `${Math.max(0, Math.round((st.fiatoP / player.fiatoMax) * 100))}%` }} /></div>
            </div>
            <motion.div animate={lunge === "p" ? { x: 30, y: -30 } : { x: 0, y: 0 }} transition={{ duration: 0.14 }}>
              <div className="rounded-2xl overflow-hidden border-2 border-emerald-400/70 shadow-xl"><CowVisual cow={player.visual} className="w-24 h-24" /></div>
            </motion.div>
          </div>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[78%] max-w-sm">
            <div className="relative h-4 rounded-full bg-rose-400/40 border border-slate-700 overflow-hidden shadow-inner">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${barraP}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-slate-900/60" style={{ left: "50%" }} />
            </div>
          </div>
        </div>
      )}

      {phase !== "intro" && (
        <div className="bg-slate-950/85 backdrop-blur border-t border-slate-800 p-3 space-y-2">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 h-[46px] overflow-y-auto no-scrollbar">
            {log.map((l, i) => <div key={i} className={`text-[10px] font-mono leading-snug ${i === 0 ? "text-slate-100" : "text-slate-500"}`}>❖ {l}</div>)}
          </div>

          {phase === "fight" && (
            <>
              {st.tell && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-600/40 rounded-xl px-3 py-1.5" id="moudzons-tell">
                  <span aria-hidden="true">👁</span>
                  <div className="text-[11px] font-mono text-amber-200 leading-tight">
                    La giovane <b>{st.tell}</b>…
                    <span className="text-[9px] text-slate-400 block">Indole {PERSONALITA_LABEL[st.personalita ?? "focosa"].label.toLowerCase()}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2" id="moudzons-moves">
                {AZIONI.map((a) => (
                  <button key={a.id} onClick={() => doAction(a.id)} disabled={busy} title={a.desc} className="text-left rounded-xl border p-2 disabled:opacity-40 bg-slate-900 border-slate-700 hover:border-amber-500/60">
                    <div className="text-[11px] font-mono font-black text-slate-100 leading-tight">{a.emoji} {a.label}</div>
                    <div className="text-[10px] font-mono text-amber-500/90 leading-tight mt-0.5">{a.counterHint}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {phase === "vinto" && (
            <div className="text-center space-y-2 py-1" id="moudzons-vinto">
              <div className="text-lg font-mono font-black text-emerald-600">🐮 {cow?.name} SI È FATTA UN NOME!</div>
              <div className="text-[11px] font-mono text-slate-300">Campionessa junior {anno}: il debutto da adulta parlerà di lei.</div>
              <button onClick={() => { playClick(); onClose(); }} className="w-full nav-active text-white font-mono font-black text-xs py-2.5 rounded-xl">Alla Stalla</button>
            </div>
          )}
          {phase === "perso" && (
            <div className="text-center space-y-2 py-1" id="moudzons-perso">
              <div className="text-lg font-mono font-black text-rose-500">Si cresce anche perdendo</div>
              <div className="text-[11px] font-mono text-slate-300">La giovane ha imparato: falla crescere e riprova.</div>
              <button onClick={() => { playClick(); onClose(); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-black text-xs py-2.5 rounded-xl">Alla Stalla</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
