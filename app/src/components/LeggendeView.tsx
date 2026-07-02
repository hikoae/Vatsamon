import { useRef, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Vatsamon } from "../types";
import { CowVisual } from "./CowVisual";
import { buildPlayerFighter } from "../lib/battle";
import {
  Spintatore, SpintaState, AzioneId, AZIONI, PERSONALITA_LABEL, Personalita,
  spintatoreFromFighter, initSpinta, applyAzione, pickAzioneAvversaria,
} from "../lib/spinta";
import { LIMATURA_TESTO } from "../data/sac";
import { LEGGENDE, Leggenda, reinaByName } from "../data/season";

/**
 * L'ALBO DELLE LEGGENDE — sfide della memoria contro le campionesse VERE
 * dell'albo d'oro (dossier §5): Falchetta (4 titoli 3ª cat. 2022–25, Rosset
 * di Nus), Sirène (record 1966–69, imbattuto da oltre 55 anni), Suisse
 * (bicampionessa 1ª cat.). Fuori calendario, niente requisiti: è un omaggio.
 * I profili di spinta sono un'INTERPRETAZIONE DI GIOCO; la cartolina che si
 * vince riporta SOLO i fatti verificati dell'albo.
 */

type Phase = "scelta" | "fight" | "vinta" | "persa";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Profilo di spinta di ogni leggenda (interpretazione di gioco, dichiarata). */
const PROFILI: Record<string, { peso: number; presa: number; volonta: number; personalita: Personalita }> = {
  Falchetta: { peso: 575, presa: 95, volonta: 100, personalita: "astuta" },   // 3ª cat., 4 titoli: leggera e scaltra
  "Sirène":  { peso: 640, presa: 85, volonta: 95,  personalita: "paziente" }, // il record eterno: regge e aspetta
  Suisse:    { peso: 705, presa: 90, volonta: 85,  personalita: "focosa" },   // 1ª cat.: massa dominante
};

export default function LeggendeView({ playerCows, respectScore, battute, onWin, onClose, playClick }: {
  playerCows: Vatsamon[];
  respectScore: number;
  battute: string[]; // nomi delle leggende già battute
  onWin: (nomeLeggenda: string) => void;
  onClose: () => void;
  playClick: () => void;
}) {
  const sorted = [...playerCows].sort((a, b) => b.cp - a.cp);
  const [cowId, setCowId] = useState(sorted[0]?.id);
  const cow = playerCows.find((c) => c.id === cowId) || sorted[0];
  const [leggenda, setLeggenda] = useState<Leggenda | null>(null);
  const [phase, setPhase] = useState<Phase>("scelta");
  const [limato, setLimato] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [lunge, setLunge] = useState<"p" | "o" | null>(null);

  const playerRef = useRef<Spintatore | null>(null);
  const oppRef = useRef<Spintatore | null>(null);
  const stRef = useRef<SpintaState>({ barra: 50, fiatoP: 0, fiatoO: 0, calma: 80, stanceP: null, stanceO: null, esito: "corso" });
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const st = stRef.current;
  const player = playerRef.current;
  const opp = oppRef.current;
  const tellAccuracy = 0.68 + respectScore * 0.0022;
  const pushLog = (line: string) => setLog((prev) => [line, ...prev].slice(0, 6));

  const sfida = (l: Leggenda) => {
    if (!cow || !limato) return;
    playClick();
    setLeggenda(l);
    const prof = PROFILI[l.nome] ?? PROFILI.Falchetta;
    const visual = reinaByName(l.nome) ?? { name: l.nome, breed: "Castana", rarity: "Leggendaria" as const, realPhoto: null };
    playerRef.current = spintatoreFromFighter(buildPlayerFighter(cow));
    oppRef.current = {
      name: l.nome, breed: "Castana",
      massa: Math.max(20, Math.min(100, Math.round((prof.peso - 400) / 3.2))),
      presa: prof.presa, volonta: prof.volonta, fiatoMax: 100 + prof.volonta,
      visual: { name: visual.name, breed: visual.breed, rarity: visual.rarity, realPhoto: visual.realPhoto ?? null },
    };
    stRef.current = initSpinta(playerRef.current, oppRef.current, { personalita: prof.personalita, tellAccuracy });
    setLog([`🏛️ La memoria si fa spinta: ${cow.name} affronta ${l.nome} — ${l.titolo}.`]);
    setPhase("fight");
    rerender();
  };

  const performTurn = async (side: "p" | "o", azione: AzioneId) => {
    const A = side === "p" ? player! : opp!;
    const B = side === "p" ? opp! : player!;
    setLunge(side); await wait(150);
    const r = applyAzione(side, azione, stRef.current, A, B);
    stRef.current = r.state;
    pushLog(r.log);
    rerender();
    setLunge(null);
    await wait(230);
  };

  const doAction = async (azione: AzioneId) => {
    if (busy || phase !== "fight" || stRef.current.esito !== "corso") return;
    playClick(); setBusy(true);
    await performTurn("p", azione);
    let esito = stRef.current.esito as SpintaState["esito"];
    if (esito !== "corso") { finisci(esito === "vinto"); return; }
    await wait(180);
    await performTurn("o", pickAzioneAvversaria(stRef.current, opp!, player!));
    esito = stRef.current.esito as SpintaState["esito"];
    if (esito !== "corso") { finisci(esito === "vinto"); return; }
    setBusy(false);
  };

  const finisci = (vinta: boolean) => {
    setPhase(vinta ? "vinta" : "persa");
    setBusy(false);
    if (vinta && leggenda) onWin(leggenda.nome);
  };

  const barraP = Math.round(st.barra);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="leggende-scene">
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg,#fef9c3 0%,#f5f3fb 40%,#e0e7ff 100%)" }} />
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <span className="text-xs font-mono font-black">🏛️ L'Albo delle Leggende</span>
        <button onClick={() => { playClick(); onClose(); }} aria-label="Chiudi" className="bg-slate-900/70 rounded-full p-1.5 min-h-[36px] min-w-[36px]"><X size={16} /></button>
      </div>

      {phase === "scelta" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-[11px] text-slate-300 text-center bg-slate-900/70 border border-slate-800 rounded-2xl p-3">
            Le campionesse vere dell'albo d'oro, ricostruite per una <b className="text-amber-400">sfida della
            memoria</b> (fuori calendario, il loro stile è un'interpretazione di gioco). Battile per la cartolina
            storica coi fatti veri.
          </p>

          <div className="text-[10px] font-mono text-slate-400 text-center">La tua Reina:</div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-center">
            {sorted.map((c) => (
              <button key={c.id} onClick={() => { playClick(); setCowId(c.id); }}
                className={`flex-shrink-0 rounded-xl border-2 p-1.5 ${cowId === c.id ? "border-emerald-500 bg-emerald-950/40" : "border-slate-700 bg-slate-900/70"}`}>
                <CowVisual cow={c} className="w-12 h-12" />
                <div className="text-[10px] font-mono text-slate-200 truncate w-12">{c.name}</div>
              </button>
            ))}
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

          <div className="space-y-2">
            {LEGGENDE.map((l) => {
              const battuta = battute.includes(l.nome);
              const prof = PROFILI[l.nome];
              return (
                <button
                  key={l.nome}
                  data-leggenda={l.nome}
                  disabled={!cow || !limato}
                  onClick={() => sfida(l)}
                  className={`w-full text-left rounded-2xl border-2 p-3 transition-all disabled:opacity-40 ${battuta ? "border-amber-500/60 bg-amber-500/10" : "border-slate-700 bg-slate-900/70 hover:border-amber-500/60"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-black text-slate-100">{battuta ? "🏆 " : ""}{l.nome} <span className="text-[10px] text-amber-500 font-mono">· {l.titolo}</span></div>
                    <span className="text-[9px] font-mono text-slate-500">indole {PERSONALITA_LABEL[prof.personalita].label.toLowerCase()}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{l.descr}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase !== "scelta" && player && opp && (
        <>
          <div className="relative flex-1 overflow-hidden">
            <div className="absolute top-14 right-3 flex flex-col items-end gap-1" style={{ width: "58%" }}>
              <div className="bg-slate-950/85 border border-amber-500 rounded-xl px-2.5 py-1.5" style={{ minWidth: 140 }}>
                <span className="text-[11px] font-mono font-black text-amber-300">👑 {opp.name}</span>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-1"><div className="h-full bg-sky-400 transition-all" style={{ width: `${Math.max(0, Math.round((st.fiatoO / opp.fiatoMax) * 100))}%` }} /></div>
              </div>
              <motion.div animate={lunge === "o" ? { x: -30, y: 30 } : { x: 0, y: 0 }} transition={{ duration: 0.14 }}>
                <div className="rounded-2xl overflow-hidden border-2 border-amber-400/70 shadow-xl"><CowVisual cow={opp.visual} className="w-24 h-24" /></div>
              </motion.div>
            </div>
            <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1" style={{ width: "58%" }}>
              <div className="bg-slate-950/85 border border-slate-700 rounded-xl px-2.5 py-1.5" style={{ minWidth: 140 }}>
                <span className="text-[11px] font-mono font-black text-slate-100">{player.name}</span>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-1"><div className="h-full bg-sky-400 transition-all" style={{ width: `${Math.max(0, Math.round((st.fiatoP / player.fiatoMax) * 100))}%` }} /></div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mt-0.5"><div className="h-full transition-all" style={{ width: `${st.calma}%`, background: st.calma < 35 ? "#ef4444" : "#a78bfa" }} /></div>
              </div>
              <motion.div animate={lunge === "p" ? { x: 30, y: -30 } : { x: 0, y: 0 }} transition={{ duration: 0.14 }}>
                <div className="rounded-2xl overflow-hidden border-2 border-emerald-400/70 shadow-xl"><CowVisual cow={player.visual} className="w-28 h-28" /></div>
              </motion.div>
            </div>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[78%] max-w-sm">
              <div className="relative h-4 rounded-full bg-rose-400/40 border border-slate-700 overflow-hidden shadow-inner">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${barraP}%` }} />
                <div className="absolute inset-y-0 w-0.5 bg-slate-900/60" style={{ left: "50%" }} />
              </div>
            </div>
          </div>

          <div className="bg-slate-950/85 backdrop-blur border-t border-slate-800 p-3 space-y-2">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 h-[46px] overflow-y-auto no-scrollbar">
              {log.map((l, i) => <div key={i} className={`text-[10px] font-mono leading-snug ${i === 0 ? "text-slate-100" : "text-slate-500"}`}>❖ {l}</div>)}
            </div>

            {phase === "fight" && (
              <>
                {st.tell && (
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-600/40 rounded-xl px-3 py-1.5" id="leggende-tell">
                    <span aria-hidden="true">👁</span>
                    <div className="text-[11px] font-mono text-amber-200 leading-tight">
                      {opp.name} <b>{st.tell}</b>…
                      <span className="text-[9px] text-slate-400 block">Indole {PERSONALITA_LABEL[st.personalita ?? "focosa"].label.toLowerCase()}</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2" id="leggende-moves">
                  {AZIONI.map((a) => (
                    <button key={a.id} onClick={() => doAction(a.id)} disabled={busy} title={a.desc} className="text-left rounded-xl border p-2 disabled:opacity-40 bg-slate-900 border-slate-700 hover:border-amber-500/60">
                      <div className="text-[11px] font-mono font-black text-slate-100 leading-tight">{a.emoji} {a.label}</div>
                      <div className="text-[10px] font-mono text-amber-500/90 leading-tight mt-0.5">{a.counterHint}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {phase === "vinta" && leggenda && (
              <div className="text-center space-y-2 py-1" id="leggende-vinta">
                <div className="text-lg font-mono font-black text-amber-400">🏛️ CARTOLINA STORICA</div>
                <div className="bg-slate-900/80 border border-amber-600/40 rounded-xl p-3 text-left space-y-1">
                  <div className="text-sm font-black text-slate-100">{leggenda.nome} — {leggenda.titolo}</div>
                  <p className="text-[11px] text-slate-300 leading-snug">{leggenda.descr}</p>
                  <p className="text-[9px] text-slate-500 italic">Fonte: albo d'oro Batailles de Reines. Lo stile in spinta è un'interpretazione di gioco.</p>
                </div>
                <button onClick={() => { playClick(); onClose(); }} className="w-full nav-active text-white font-mono font-black text-xs py-2.5 rounded-xl">Nell'albo dei ricordi</button>
              </div>
            )}
            {phase === "persa" && leggenda && (
              <div className="text-center space-y-2 py-1" id="leggende-persa">
                <div className="text-lg font-mono font-black text-rose-500">{leggenda.nome} è una leggenda per qualcosa</div>
                <div className="text-[11px] font-mono text-slate-300">Allena la tua Reina e riprova: la memoria aspetta.</div>
                <button onClick={() => { playClick(); setPhase("scelta"); setLog([]); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-black text-xs py-2.5 rounded-xl">Riprova</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
