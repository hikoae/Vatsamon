import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Backpack, X } from "lucide-react";
import { Vatsamon, BackpackItem } from "../types";
import { CowVisual } from "./CowVisual";
import { buildPlayerFighter, buildOpponentFighter, buildScaledBoss, Fighter } from "../lib/battle";
import {
  Spintatore, SpintaState, AzioneId, AZIONI, PERSONALITA_LABEL, Personalita, personalitaFromLegacy,
  spintatoreFromFighter, initSpinta, applyAzione, pickAzioneAvversaria,
} from "../lib/spinta";
import { BATTLE_ITEMS } from "../data/combat";
import { MapBattle } from "../data/mapBattles";
import { arenaBoss } from "../data/arenas";

type Phase = "intro" | "fight" | "end";
const ITEM_LABEL: Record<string, { name: string; emoji: string }> = {
  "item-potion-milk": { name: "Secchio di Latte", emoji: "🥛" },
  "item-potion-fontina": { name: "Fetta di Fontina", emoji: "🧀" },
  "item-buff-genepy": { name: "Genepy del Pastore", emoji: "🍵" },
  "item-buff-bell": { name: "Campanaccio Fortunato", emoji: "🔔" },
  "item-energy-grappa": { name: "Grappa alla Genziana", emoji: "🥃" },
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function BattleScene({
  battle, playerCows, initialCowId, trainerLevel, respectScore, backpack, onConsumeItem, onResult, onClose, playClick,
}: {
  battle: MapBattle;
  playerCows: Vatsamon[];
  initialCowId?: string;
  trainerLevel: number;
  /** Rispetto 0..100: chi rispetta gli animali li sa leggere (affidabilità dei tell). */
  respectScore: number;
  backpack: BackpackItem[];
  onConsumeItem: (id: string) => void;
  onResult: (won: boolean, cowId?: string) => void;
  onClose: () => void;
  playClick: () => void;
}) {
  const sorted = [...playerCows].sort((a, b) => b.cp - a.cp);
  const [cowId, setCowId] = useState(initialCowId || sorted[0]?.id);
  const playerCow = playerCows.find((c) => c.id === cowId) || sorted[0];

  const [phase, setPhase] = useState<Phase>("intro");
  const [log, setLog] = useState<string[]>([]);
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [busy, setBusy] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [lunge, setLunge] = useState<"p" | "o" | null>(null);
  const [shake, setShake] = useState(false);

  const playerRef = useRef<Spintatore | null>(null);
  const oppRef = useRef<Spintatore | null>(null);
  const stRef = useRef<SpintaState>({ barra: 50, fiatoP: 0, fiatoO: 0, calma: 80, stanceP: null, stanceO: null, esito: "corso" });
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const st = stRef.current;
  const player = playerRef.current;
  const opp = oppRef.current;
  const pushLog = (line: string) => setLog((prev) => [line, ...prev].slice(0, 6));

  const buildOppFighter = (): Fighter => {
    if (battle.kind === "pastore" && battle.pastore) return buildOpponentFighter(battle.pastore);
    const arena = battle.arena!;
    const bossCow = arenaBoss(arena, trainerLevel);
    return buildScaledBoss(bossCow, arena.powerFactor);
  };
  // Indole dell'avversaria: dall'arena (etichetta legacy) o dal nome del Pastore.
  const personalita: Personalita = battle.kind === "arena" && battle.arena
    ? personalitaFromLegacy(battle.arena.bossType)
    : personalitaFromLegacy(undefined, [...battle.name].reduce((n, ch) => n + ch.charCodeAt(0), 0));
  // Lettura dell'animale: il Rispetto affina l'occhio (0.68 → 0.90).
  const tellAccuracy = 0.68 + respectScore * 0.0022;

  const begin = () => {
    playClick();
    const pf = buildPlayerFighter(playerCow);
    const of = buildOppFighter();
    const ps = spintatoreFromFighter(pf);
    const os = spintatoreFromFighter(of);
    playerRef.current = ps;
    oppRef.current = os;
    stRef.current = initSpinta(ps, os, { personalita, tellAccuracy });
    setLog([`${battle.emoji} ${battle.name}: ${ps.name} affronta ${os.name}. Le corna si toccano…`]);
    setWinner(null); setShowBag(false);
    setPhase("fight"); rerender();
  };

  const performTurn = async (side: "p" | "o", azione: AzioneId) => {
    const A = side === "p" ? player! : opp!;
    const B = side === "p" ? opp! : player!;
    setLunge(side); await wait(160);
    const r = applyAzione(side, azione, stRef.current, A, B);
    stRef.current = r.state;
    pushLog(r.log);
    rerender();
    setLunge(null);
    if (azione === "incalza" || azione === "gira") { setShake(true); await wait(160); setShake(false); }
    await wait(260);
  };

  const endBattle = () => {
    const won = stRef.current.esito === "vinto";
    setWinner(won ? "player" : "opponent");
    setPhase("end"); setBusy(false);
    onResult(won, playerCow?.id);
  };

  // Ritirarsi è legittimo ma onesto: conta come sconfitta dichiarata.
  const retire = () => {
    if (busy || phase !== "fight") return;
    playClick();
    if (!window.confirm("Ritiri la tua Reina? La spinta conta come sconfitta.")) return;
    stRef.current = { ...stRef.current, esito: "perso" };
    endBattle();
  };

  const doAction = async (azione: AzioneId) => {
    if (busy || phase !== "fight" || stRef.current.esito !== "corso") return;
    playClick(); setBusy(true); setShowBag(false);
    await performTurn("p", azione);
    if (stRef.current.esito !== "corso") { endBattle(); return; }
    await wait(200);
    await performTurn("o", pickAzioneAvversaria(stRef.current, opp!, player!));
    if (stRef.current.esito !== "corso") { endBattle(); return; }
    setBusy(false);
  };

  const useItem = async (id: string) => {
    if (busy || phase !== "fight" || stRef.current.esito !== "corso") return;
    const eff = BATTLE_ITEMS[id];
    const owned = backpack.find((b) => b.id === id);
    if (!eff || !owned || owned.quantity <= 0) return;
    playClick(); setBusy(true); setShowBag(false);
    const s = stRef.current; const lbl = ITEM_LABEL[id]?.name || "Oggetto";
    if (eff.kind === "buff_atk" || eff.kind === "buff_def") { s.calma = Math.min(100, s.calma + eff.amount); pushLog(`🎒 ${lbl}: la Reina si rasserena (+calma).`); }
    else { s.fiatoP = Math.min(player!.fiatoMax, s.fiatoP + eff.amount); pushLog(`🎒 ${lbl}: +${eff.amount} fiato.`); }
    onConsumeItem(id); rerender();
    await wait(500);
    await performTurn("o", pickAzioneAvversaria(stRef.current, opp!, player!));
    if (stRef.current.esito !== "corso") { endBattle(); return; }
    setBusy(false);
  };

  const bagItems = backpack.filter((b) => BATTLE_ITEMS[b.id] && b.quantity > 0);
  const barraP = Math.round(st.barra);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="battle-scene">
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg,#bae6fd 0%,#e0f2fe 30%,#dcfce7 62%,#bbf7d0 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[42%]" style={{ background: "radial-gradient(120% 80% at 50% 100%, #86efac 0%, #4ade80 55%, #16a34a 100%)" }} />

      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/70 backdrop-blur border-b border-slate-800">
        <span className="text-xs font-mono font-black text-slate-100">{battle.emoji} {battle.name} · La Spinta</span>
        <button onClick={() => { playClick(); onClose(); }} className="text-slate-300 bg-slate-900/70 rounded-full p-1.5"><X size={16} /></button>
      </div>

      {phase === "intro" && (
        <IntroPanel battle={battle} playerCows={sorted} cowId={cowId} setCowId={setCowId} onStart={begin} onClose={onClose} playClick={playClick} trainerLevel={trainerLevel} personalita={personalita} />
      )}

      {phase !== "intro" && player && opp && (
        <motion.div animate={shake ? { x: [0, -8, 7, -5, 0] } : {}} transition={{ duration: 0.35 }} className="relative flex-1 overflow-hidden">
          <Combatant pos="top" s={opp} fiato={st.fiatoO} lunge={lunge === "o"} />
          <Combatant pos="bottom" s={player} fiato={st.fiatoP} calma={st.calma} lunge={lunge === "p"} />

          {/* BARRA DI SPINTA (contesa) */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[78%] max-w-sm">
            <div className="flex justify-between text-[10px] font-mono font-black mb-0.5">
              <span className="text-emerald-600">{player.name}</span>
              <span className="text-slate-700">SPINTA</span>
              <span className="text-rose-500">{opp.name}</span>
            </div>
            <div className="relative h-4 rounded-full bg-rose-400/40 border border-slate-700 overflow-hidden shadow-inner">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${barraP}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-slate-900/60" style={{ left: "50%" }} />
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-black text-white drop-shadow">{barraP > 50 ? `+${barraP - 50}` : barraP < 50 ? `${barraP - 50}` : "·"}</div>
            </div>
          </div>
        </motion.div>
      )}

      {phase !== "intro" && player && (
        <div className="bg-slate-950/85 backdrop-blur border-t border-slate-800 p-3 space-y-2">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 h-[50px] overflow-y-auto no-scrollbar">
            {log.length === 0 ? <p className="text-[10px] font-mono text-slate-500">Scegli come condurre la spinta…</p> :
              log.map((l, i) => <div key={i} className={`text-[10px] font-mono leading-snug ${i === 0 ? "text-slate-100" : "text-slate-500"}`}>❖ {l}</div>)}
          </div>

          {phase === "fight" && !showBag && (
            <>
              {st.tell && (
                <div id="battle-tell" className="flex items-center gap-2 bg-amber-500/10 border border-amber-600/40 rounded-xl px-3 py-1.5">
                  <span aria-hidden="true">👁</span>
                  <div className="text-[11px] font-mono text-amber-200 leading-tight">
                    L'avversaria <b>{st.tell}</b>…
                    <span className="text-[9px] text-slate-400 block">Indole {PERSONALITA_LABEL[st.personalita ?? "focosa"].label.toLowerCase()} · il Rispetto affina la lettura</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2" id="battle-moves">
                {AZIONI.map((a) => (
                  <button key={a.id} onClick={() => doAction(a.id)} disabled={busy} title={a.desc}
                    className="text-left rounded-xl border p-2 transition-all disabled:opacity-40 bg-slate-900 border-slate-700 hover:border-amber-500/60">
                    <div className="text-[11px] font-mono font-black text-slate-100 leading-tight">{a.emoji} {a.label}</div>
                    <div className="text-[10px] font-mono text-amber-500/90 leading-tight mt-0.5">{a.counterHint}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { playClick(); setShowBag(true); }} disabled={busy} className="flex-1 flex items-center justify-center gap-2 bg-slate-900 border border-amber-700/40 text-amber-400 font-mono font-black text-xs py-2 rounded-xl disabled:opacity-40">
                  <Backpack className="w-4 h-4" /> Zaino ({bagItems.reduce((n, b) => n + b.quantity, 0)})
                </button>
                <button onClick={retire} disabled={busy} className="px-4 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2 rounded-xl disabled:opacity-40">Ritìrati</button>
              </div>
            </>
          )}

          {phase === "fight" && showBag && (
            <div className="space-y-1.5">
              {bagItems.length === 0 ? <p className="text-[10px] text-slate-500 text-center py-2">Zaino vuoto. Rifornisciti alla Casera!</p> :
                bagItems.map((b) => {
                  const meta = ITEM_LABEL[b.id]; const eff = BATTLE_ITEMS[b.id];
                  const desc = eff.kind === "buff_atk" || eff.kind === "buff_def" ? `Calma +${eff.amount}` : `Fiato +${eff.amount}`;
                  return (
                    <button key={b.id} onClick={() => useItem(b.id)} disabled={busy} className="w-full flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-2 text-left disabled:opacity-40">
                      <span className="text-xl">{meta?.emoji}</span>
                      <div className="flex-grow"><div className="text-[11px] font-mono font-black text-slate-100">{meta?.name}</div><div className="text-[9px] text-slate-400">{desc}</div></div>
                      <span className="text-[10px] font-mono text-amber-400">×{b.quantity}</span>
                    </button>
                  );
                })}
              <button onClick={() => { playClick(); setShowBag(false); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-1.5 rounded-xl">Chiudi zaino</button>
            </div>
          )}

          {phase === "end" && (
            <div className="text-center space-y-2 py-1">
              <div className={`text-lg font-mono font-black ${winner === "player" ? "text-emerald-600" : "text-rose-500"}`}>
                {winner === "player" ? "🏆 La rivale cede e si ritira!" : "😔 La tua Reina si ritira"}
              </div>
              <button onClick={() => { playClick(); onClose(); }} className="w-full nav-active text-white font-mono font-black text-xs py-2.5 rounded-xl">Torna alla mappa</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntroPanel({ battle, playerCows, cowId, setCowId, onStart, onClose, playClick, trainerLevel, personalita }: {
  battle: MapBattle; playerCows: Vatsamon[]; cowId: string; setCowId: (id: string) => void;
  onStart: () => void; onClose: () => void; playClick: () => void; trainerLevel: number; personalita: Personalita;
}) {
  const locked = trainerLevel < battle.reqLevel;
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-5 gap-4 text-center">
      <div className="text-6xl drop-shadow">{battle.emoji}</div>
      <div>
        <div className="text-base font-mono font-black text-slate-100">{battle.name}</div>
        <div className="text-[11px] text-slate-300">{battle.subtitle}</div>
        {battle.pastore && <p className="text-[11px] text-slate-200 italic mt-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 max-w-xs">"{battle.pastore.dialogueIntro}"</p>}
        <p className="text-[11px] font-mono mt-2 text-slate-300">È una <b className="text-emerald-700">spinta a corna limate</b>: vince chi fa cedere l'avversaria. Osserva i suoi movimenti e rispondi — conduci, non forzare.</p>
        <p className="text-[10px] font-mono mt-1 text-amber-600">Indole avversaria: <b>{PERSONALITA_LABEL[personalita].label}</b> — {PERSONALITA_LABEL[personalita].desc}</p>
      </div>
      {locked ? (
        <div className="text-rose-500 font-mono font-bold text-sm">🔒 Richiede livello {battle.reqLevel}</div>
      ) : (
        <>
          <div className="w-full max-w-sm">
            <div className="text-[10px] font-mono text-slate-400 mb-1">Scegli la tua Reina:</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {playerCows.map((c) => (
                <button key={c.id} onClick={() => { playClick(); setCowId(c.id); }}
                  className={`flex-shrink-0 rounded-xl border-2 p-1.5 ${cowId === c.id ? "border-emerald-500 bg-emerald-950/40" : "border-slate-700 bg-slate-900/70"}`}>
                  <CowVisual cow={c} className="w-12 h-12" />
                  <div className="text-[10px] font-mono text-slate-200 truncate w-12">{c.name}</div>
                  <div className="text-[10px] font-mono text-amber-400">Pot. {c.cp}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 w-full max-w-sm">
            <button onClick={() => { playClick(); onClose(); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-3 rounded-xl">Indietro</button>
            <button onClick={onStart} id="battle-start" className="flex-1 nav-active text-white font-mono font-black text-xs py-3 rounded-xl">Alla spinta! 🐂</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Un combattente sul campo: foto + targhetta Fiato (e Calma per il giocatore). */
function Combatant({ pos, s, fiato, calma, lunge }: {
  pos: "top" | "bottom"; s: Spintatore; fiato: number; calma?: number; lunge: boolean;
}) {
  const top = pos === "top";
  const fiatoPct = Math.max(0, Math.min(100, Math.round((fiato / s.fiatoMax) * 100)));
  const lungeX = top ? -36 : 36, lungeY = top ? 36 : -36;
  return (
    <div className={`absolute ${top ? "top-16" : "bottom-3"} ${top ? "right-3" : "left-3"} flex flex-col ${top ? "items-end" : "items-start"} gap-1`} style={{ width: "60%" }}>
      <div className={`bg-slate-950/85 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-lg ${top ? "self-start" : "self-end"}`} style={{ minWidth: 150 }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-black text-slate-100 truncate">{s.name}</span>
          <span className="text-[9px] font-mono text-slate-400">{s.breed}</span>
        </div>
        <div className="text-[9px] font-mono text-slate-500 mt-0.5">FIATO</div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
          <div className="h-full bg-sky-400 transition-all duration-400" style={{ width: `${fiatoPct}%` }} />
        </div>
        {calma !== undefined && (
          <>
            <div className="text-[9px] font-mono text-slate-500 mt-0.5">CALMA</div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full transition-all duration-400" style={{ width: `${calma}%`, background: calma < 35 ? "#ef4444" : "#a78bfa" }} />
            </div>
          </>
        )}
      </div>
      <motion.div className="relative" animate={lunge ? { x: lungeX, y: lungeY } : { x: 0, y: 0 }} transition={{ duration: 0.16 }}>
        <div className={`rounded-2xl overflow-hidden border-2 shadow-2xl ${top ? "border-rose-400/60" : "border-emerald-400/70"}`}>
          <CowVisual cow={s.visual} className={top ? "w-24 h-24" : "w-28 h-28"} />
        </div>
        <div className="mx-auto mt-1 rounded-[100%] bg-black/20 blur-[2px]" style={{ width: top ? 70 : 84, height: 10 }} />
      </motion.div>
    </div>
  );
}
