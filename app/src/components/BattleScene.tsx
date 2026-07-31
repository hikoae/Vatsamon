import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Backpack, X } from "lucide-react";
import { Vatsamon, BackpackItem } from "../types";
import { CowVisual } from "./CowVisual";
import { ConfirmDialog } from "./ConfirmDialog";
import { beginCriticalActivity, endCriticalActivity } from "../lib/swUpdate";
import { buildPlayerFighter, buildOpponentFighter, buildScaledBoss, Fighter } from "../lib/battle";
import {
  Spintatore, SpintaState, AzioneId, PERSONALITA_LABEL, Personalita, personalitaFromLegacy,
  spintatoreFromFighter, initSpinta, pickAzioneAvversaria, forzaIntento, MAX_TURNI, TERRAIN_LABEL,
  Approccio, APPROCCIO_LABEL,
} from "../lib/spinta";
import { SAC_ITEMS, MAX_VIGILIA, LIMATURA_TESTO } from "../data/sac";
import { condizioneAttiva } from "../lib/condizione";
import { MapBattle } from "../data/mapBattles";
import { arenaBoss } from "../data/arenas";
import { Mossa, mosseEquipaggiate, mosseAvversaria, eseguiMossa } from "../data/mosse";
import { spiegaEsito, cronacaTurno, cronacaEsito } from "../data/telecronaca";
import { SpintaStats, nuoveSpintaStats, registraTurno, campionaBarra } from "../lib/scuola";
import { TUTORIAL_SCRIPT, TUTORIAL_VIGILIA } from "../data/tutorialBattle";
import { tipDaDare, MEME_TIPS } from "../lib/tutorial";
import { MossePanel } from "./battle/MossePanel";
import { MossaInfoSheet } from "./battle/MossaInfoSheet";

type Phase = "intro" | "fight" | "end";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Telecronaca: interlinea in px interi e altezza del box a righe intere, così il
 * taglio non cade mai a metà glifo. 18 = padding verticale (py-2) + i due bordi. */
const LOG_RIGA = 16;
const LOG_BORDI = 18;
/** Sfumatura sull'ultimo 20%: dichiara che sotto c'è dell'altro senza scrollbar. */
const LOG_SFUMA = "linear-gradient(180deg, #000 0%, #000 80%, transparent 100%)";

/** Somma delle fasce di safe-area verticali, letta dal browser con un elemento
 * sonda. E' un input STABILE — dipende dal device, non dal layout scelto — quindi
 * non innesca anelli di retroazione (misurare l'arena, invece, sì). Runtime senza
 * `env()`: la dichiarazione cade, la sonda misura 0 e si torna al comportamento
 * storico basato sul solo `window.innerHeight`. */
function insetVerticali(): number {
  if (typeof document === "undefined" || !document.body) return 0;
  const sonda = document.createElement("div");
  sonda.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;"
    + "padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
  document.body.appendChild(sonda);
  const cs = getComputedStyle(sonda);
  const tot = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  sonda.remove();
  return tot;
}

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
  onResult: (won: boolean, cowId?: string, stats?: SpintaStats) => void;
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
  // VIGILIA: cosa porti nello Sac (max 3 scorte) e il rito della limatura
  const [loadout, setLoadout] = useState<string[]>([]);
  const [limato, setLimato] = useState(false);
  // APPROCCIO D'INGAGGIO (S17): scelta tattica pre-match, SOLO in Arena (mai Pastore/Tutorial).
  const [approccio, setApproccio] = useState<Approccio>("naturale");
  const [lunge, setLunge] = useState<"p" | "o" | null>(null);
  const [shake, setShake] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);
  // Spazio verticale REALMENTE disponibile per l'arena: su iPhone corti (toolbar
  // Safari, portrait-lock) l'arena deve restringersi invece di far accavallare le
  // card dei combattenti (fix mobile-qa 2026-07-13). `window.innerHeight` da solo
  // non basta: INCLUDE le fasce di safe-area, che pero' se le mangiano testata
  // (paddingTop) e pulsantiera (paddingBottom) — col notch la testata passa da 61 a
  // 120px. Decidere sul numero grezzo sceglieva la diagonale proprio dove l'arena si
  // stringe di piu' (fix notch 2026-07-29).
  const [spazioUtile, setSpazioUtile] = useState<number>(() => (typeof window !== "undefined" ? window.innerHeight : 844));
  useLayoutEffect(() => {
    const misura = () => setSpazioUtile(window.innerHeight - insetVerticali());
    misura(); // prima del paint: nessuno sfarfallio diagonale→compatto all'apertura
    window.addEventListener("resize", misura); // rotazione e toolbar cambiano le fasce
    return () => window.removeEventListener("resize", misura);
  }, []);
  // Sotto questa soglia il layout "a diagonale" assoluto non ha fisicamente spazio
  // per le due card senza accavallarsi. Soglia misurata nella nuova unita' (Chromium
  // + WebKit, fasce 59/34, bataille di Mémé = pulsantiera piu' alta, campionando a
  // meta' turno): le targhette si toccano a spazio utile ~825, a 845 restano ~20px di
  // margine. 845 e' anche il valore che, a fasce nulle, lascia invariati i device
  // senza notch. Sotto soglia si passa a uno stack verticale in normal flow (mai
  // overlap per costruzione) con scroll di fallback.
  const compactArena = spazioUtile < 845;
  // SECONDA soglia, NUOVA e indipendente dalla prima (fix iPhone SE 2026-07-31).
  // Sotto questa soglia nemmeno lo stack compatto entra: a 375×667 con le fasce
  // l'arena resta alta 76px contro 248px di contenuto (172px nascosti) e
  // finiscono fuori schermo la targhetta del giocatore, la sua foto e — la cosa
  // grave — la barra SPINTA, cioè l'unico indicatore di chi sta vincendo. Qui la
  // scena COLLASSA invece di scrollare: targhette su UNA riga (nome + FIATO
  // inline, CALMA come pallino) e barra SPINTA pinnata fuori dall'area
  // scrollabile.
  // 700 era troppo bassa e lasciava scoperta la banda 700-730 (fix 2026-07-31,
  // secondo giro): lì lo stack compatto sfora l'arena e il taglio cade proprio
  // sulla foto del GIOCATORE — a spazio utile 702 restano nascosti 27px, di cui
  // 23,5 dei suoi 48px di foto (misurato su bataille di Mémé, il caso peggiore:
  // pulsantiera più alta). Il contenuto rientra tutto da 729 in su (identico su
  // Chromium e WebKit a 390/393px di larghezza); 735 aggiunge il margine per le
  // battute di Mémé più lunghe e per il riquadro del tell che va e viene.
  // Nessun device reale peggiora: iPhone 12/13 mini (375×812 col notch ≈ 719-728)
  // entra qui — ed è proprio il caso che si rompeva — mentre un iPhone 14 con le
  // fasce (751) resta allo stack normale, che a quella taglia funziona.
  const ultraCompact = spazioUtile < 735;
  // Lo stack compatto ha taglia fissa dentro un'arena elastica: sotto 845px avanzavano
  // fino a ~190px vuoti in fondo. Misuriamo l'avanzo reale — che dipende anche dalla
  // safe-area del device — e lo diamo alle figure, tra un minimo (= taglia storica) e
  // un massimo. Banda morta ampia: le battute di Mémé cambiano altezza a ogni turno e
  // non devono far respirare le Reine.
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);
  const [figura, setFigura] = useState(48);
  // Nello stack ultra-compatto la figura sta IN RIGA con la targhetta: il minimo
  // storico (48) non entrerebbe mai, quindi il pavimento si abbassa. Il tetto
  // invece si alza in fase `end`, dove il pannello è quasi vuoto e la Reina deve
  // riempire lo spazio invece di lasciare un terzo di schermo bianco.
  const figuraMin = ultraCompact ? 22 : 48;
  const figuraMax = phase === "end" ? (ultraCompact ? 108 : 168) : 128;
  // La fase va riletta DENTRO la callback, non solo alla registrazione: su WebKit
  // una notifica del ResizeObserver arriva PRIMA del cleanup dell'effect (passivo,
  // post-paint) e le figure scattavano 104→128 sulla schermata finale. Il ref si
  // aggiorna in render, quindi è già "end" quando l'arena cresce.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useEffect(() => {
    const arena = arenaRef.current, stack = stackRef.current;
    if (!compactArena || phase !== "fight" || !arena || !stack) return;
    const adatta = () => {
      if (phaseRef.current !== "fight") return;
      const avanzo = (arena.getBoundingClientRect().height - stack.getBoundingClientRect().height) / 2;
      if (avanzo > -2 && avanzo < 12) return;
      setFigura((f) => Math.max(figuraMin, Math.min(figuraMax, Math.floor(f + avanzo))));
    };
    // Senza guardia, un runtime privo di ResizeObserver (o col getter che lancia)
    // fa risalire l'eccezione a React e sostituisce l'app con l'error boundary:
    // qui degradiamo come dichiarato sopra — niente refit, figura alla taglia iniziale.
    let RO: typeof ResizeObserver | undefined;
    try { RO = ResizeObserver; } catch { /* getter che lancia */ }
    if (typeof RO !== "function") return;
    const ro = new RO(adatta);
    ro.observe(arena); ro.observe(stack);
    return () => ro.disconnect();
  }, [compactArena, phase, figuraMin, figuraMax]);

  // Alla vittoria il pannello si svuota e l'arena raddoppia (misurato: 295→535px),
  // ma le figure restavano alla taglia del combattimento — anzi si rimpicciolivano
  // (54px contro 62px) proprio quando lo spazio raddoppiava. Il refit continuo NON
  // va riacceso in fase `end`: la guardia `phaseRef.current !== "fight"` sopra
  // esiste per fermare un pop delle Reine su WebKit. Qui si fa UN SOLO passaggio,
  // in layout effect (prima del paint, niente scatto visibile) e solo per
  // CRESCERE: le dipendenze non cambiano dopo il setFigura, quindi non si ripete.
  useLayoutEffect(() => {
    if (!compactArena || phase !== "end") return;
    const arena = arenaRef.current, stack = stackRef.current;
    if (!arena || !stack) return;
    const avanzo = (arena.getBoundingClientRect().height - stack.getBoundingClientRect().height) / 2;
    if (avanzo < 2) return;
    setFigura((f) => Math.max(figuraMin, Math.min(figuraMax, Math.floor(f + avanzo))));
  }, [compactArena, phase, figuraMin, figuraMax]);

  // Una battaglia intera (intro→fight→end) è "attività critica": il SW non
  // deve ricaricare la pagina a metà spinta (vedi lib/swUpdate.ts).
  useEffect(() => {
    beginCriticalActivity();
    return () => endCriticalActivity();
  }, []);

  const playerRef = useRef<Spintatore | null>(null);
  const oppRef = useRef<Spintatore | null>(null);
  const stRef = useRef<SpintaState>({ barra: 50, fiatoP: 0, fiatoO: 0, calma: 80, stanceP: null, stanceO: null, esito: "corso" });
  const mossePRef = useRef<Record<AzioneId, Mossa> | null>(null);
  const mosseORef = useRef<Record<AzioneId, Mossa> | null>(null);
  const statsRef = useRef<SpintaStats>(nuoveSpintaStats());
  const [infoMossa, setInfoMossa] = useState<Mossa | null>(null);
  // Bataille-lezione di Mémé: sceneggiatura per turno del giocatore
  const isTutorial = !!battle.tutorial;
  const tutStepRef = useRef(0);
  const tutStep = isTutorial ? TUTORIAL_SCRIPT[Math.min(tutStepRef.current, TUTORIAL_SCRIPT.length - 1)] : null;
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
    mossePRef.current = mosseEquipaggiate(playerCow);
    mosseORef.current = mosseAvversaria(os.name, personalita, battle.kind === "arena");
    statsRef.current = nuoveSpintaStats();
    // Approccio esposto SOLO in Arena (battle.kind === "arena"): Pastori e Tutorial
    // restano "naturale" anche se lo stato locale fosse rimasto sporco da una selezione precedente.
    stRef.current = initSpinta(ps, os, {
      personalita: isTutorial ? "paziente" : personalita,
      tellAccuracy: isTutorial ? 1 : tellAccuracy,
      terrain: battle.arena?.terrain,
      approccio: isTutorial || battle.kind !== "arena" ? "naturale" : approccio,
    });
    campionaBarra(statsRef.current, stRef.current.barra); // l'ingaggio può già partire in svantaggio
    if (isTutorial) {
      tutStepRef.current = 0;
      const primo = TUTORIAL_SCRIPT[0].intentoAvversaria;
      if (primo) forzaIntento(stRef.current, primo);
    }
    // S18: "In forma dopo la cura all'Arp" — riga d'intro se il nudge di
    // condizione stagionale (lib/condizione.ts) è attivo per questa Reina.
    const inForma = condizioneAttiva(playerCow.id);
    setLog([
      `${battle.emoji} ${battle.name}: ${ps.name} affronta ${os.name}. Le corna si toccano…`,
      ...(inForma ? [`💪 ${ps.name} è in forma dopo la cura all'Arp.`] : []),
    ]);
    setWinner(null); setShowBag(false);
    setPhase("fight"); rerender();
  };

  const performTurn = async (side: "p" | "o", mossaId: string) => {
    const A = side === "p" ? player! : opp!;
    const B = side === "p" ? opp! : player!;
    setLunge(side); await wait(160);
    const r = eseguiMossa(side, mossaId, stRef.current, A, B, battle.arena?.terrain);
    stRef.current = r.state;
    if (side === "p" && r.dettaglio) registraTurno(statsRef.current, r.dettaglio.famiglia, r.state.barra, r.state.turno ?? 0);
    campionaBarra(statsRef.current, r.state.barra); // anche i cali causati dall'avversaria
    pushLog(spiegaEsito(r) ?? r.log);
    const cronaca = cronacaTurno(r, { p: player!.name, o: opp!.name });
    if (cronaca) pushLog(cronaca);
    rerender();
    setLunge(null);
    const fam = r.dettaglio?.famiglia;
    if (fam === "incalza" || fam === "gira") { setShake(true); await wait(160); setShake(false); }
    await wait(260);
    return r;
  };

  const endBattle = () => {
    const won = stRef.current.esito === "vinto";
    const condotta = (stRef.current.turno ?? 0) >= MAX_TURNI;
    statsRef.current.vittoriaPerFiato = won && stRef.current.fiatoO <= 0;
    if (condotta) statsRef.current.giudizio = true;
    pushLog(cronacaEsito(won, condotta, { p: player?.name ?? "La tua Reina", o: opp?.name ?? "la rivale" }));
    setWinner(won ? "player" : "opponent");
    setPhase("end"); setBusy(false);
    onResult(won, playerCow?.id, statsRef.current);
  };

  // Ritirarsi è legittimo ma onesto: conta come sconfitta dichiarata.
  const retire = () => {
    if (busy || phase !== "fight") return;
    playClick();
    setConfirmRetire(true);
  };
  const confirmRetireYes = () => {
    setConfirmRetire(false);
    stRef.current = { ...stRef.current, esito: "perso" };
    endBattle();
  };

  const mossaAvversaria = () => mosseORef.current![pickAzioneAvversaria(stRef.current, opp!, player!)].id;

  // Consigli di Mémé contestuali (una volta sola, in QUALSIASI battaglia)
  const consigliaSeServe = (r: ReturnType<typeof eseguiMossa>, side: "p" | "o", tellPromesso?: AzioneId) => {
    const punito = (side === "p" && r.counter === "B") || (side === "o" && r.counter === "A");
    if (punito && tipDaDare("primo-counter-subito")) { pushLog(MEME_TIPS["primo-counter-subito"]); return; }
    if (side === "o" && tellPromesso && r.dettaglio && r.dettaglio.famiglia !== tellPromesso && tipDaDare("primo-tell-ingannevole")) {
      pushLog(MEME_TIPS["primo-tell-ingannevole"]); return;
    }
    if (r.state.esito === "corso" && r.state.fiatoP < 30 && tipDaDare("primo-fiato-basso")) pushLog(MEME_TIPS["primo-fiato-basso"]);
  };

  const doAction = async (mossa: Mossa) => {
    if (busy || phase !== "fight" || stRef.current.esito !== "corso") return;
    playClick(); setBusy(true); setShowBag(false);
    const rP = await performTurn("p", mossa.id);
    if (!isTutorial && rP) consigliaSeServe(rP, "p");
    if (isTutorial) {
      tutStepRef.current += 1;
      // la lezione del fiato (passo Incoraggia) chiede il fiato corto: la sceneggiatura lo prepara
      if (tutStepRef.current === 3) stRef.current.fiatoP = Math.min(stRef.current.fiatoP, 40);
    }
    if (stRef.current.esito !== "corso") { endBattle(); return; }
    await wait(200);
    const tellPromesso = stRef.current.tellAzione;
    const rOpp = await performTurn("o", mossaAvversaria());
    if (isTutorial && stRef.current.esito === "corso") {
      const prossimo = TUTORIAL_SCRIPT[tutStepRef.current]?.intentoAvversaria;
      if (prossimo) forzaIntento(stRef.current, prossimo);
      rerender();
    }
    if (!isTutorial && rOpp) consigliaSeServe(rOpp, "o", tellPromesso);
    if (stRef.current.esito !== "corso") { endBattle(); return; }
    setBusy(false);
  };

  const applyItem = async (id: string) => {
    if (busy || phase !== "fight" || stRef.current.esito !== "corso") return;
    const eff = SAC_ITEMS[id];
    const owned = backpack.find((b) => b.id === id);
    if (!eff || !owned || owned.quantity <= 0) return;
    playClick(); setBusy(true); setShowBag(false);
    const s = stRef.current;
    if (eff.fiato) s.fiatoP = Math.min(player!.fiatoMax, s.fiatoP + eff.fiato);
    if (eff.calma) s.calma = Math.min(100, s.calma + eff.calma);
    if (eff.presa && player) player.presa = Math.min(110, player.presa + eff.presa);
    pushLog(`🎒 ${eff.nome}: ${eff.desc}`);
    onConsumeItem(id); rerender();
    await wait(500);
    await performTurn("o", mossaAvversaria());
    if (isTutorial && stRef.current.esito === "corso") {
      const prossimo = TUTORIAL_SCRIPT[tutStepRef.current]?.intentoAvversaria;
      if (prossimo) forzaIntento(stRef.current, prossimo);
    }
    if (stRef.current.esito !== "corso") { endBattle(); return; }
    setBusy(false);
  };

  // in Spinta si usa SOLO ciò che hai messo nello Sac alla vigilia
  const bagItems = backpack.filter((b) => SAC_ITEMS[b.id] && b.quantity > 0 && loadout.includes(b.id));
  const barraP = Math.round(st.barra);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" id="battle-scene">
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg,#bae6fd 0%,#e0f2fe 30%,#dcfce7 62%,#bbf7d0 100%)" }} />
      {/* Il prato partiva già a #16a34a pieno sul BORDO SUPERIORE del box e contro il
          gradiente di pagina faceva una cucitura netta di un pixel (misurata:
          rgb(221,251,234) → rgb(22,163,74)). Due correzioni: una maschera sfuma gli
          80px in cima al box — è la transizione che mancava — e il verde più cupo
          scende a #22c55e, così il testo secondario che ci finisce sopra torna
          sopra il 4,5:1 (era 2,26:1). */}
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[42%]" style={{
        background: "radial-gradient(120% 80% at 50% 100%, #86efac 0%, #4ade80 55%, #22c55e 100%)",
        maskImage: "linear-gradient(180deg, transparent 0px, #000 80px)",
        WebkitMaskImage: "linear-gradient(180deg, transparent 0px, #000 80px)",
      }} />

      {/* Barra a filo schermo: la safe-area si somma a py-2 (0.5rem), altrimenti su
          iPhone col notch titolo e X finiscono dentro la fascia (tap non affidabile). */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/70 backdrop-blur border-b border-slate-800"
        style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}>
        <span className="text-xs font-mono font-black text-slate-100">{battle.emoji} {battle.name} · La Spinta</span>
        {/* aria-label con prefisso "Chiudi": è anche l'aggancio del tap target 44px (index.css). */}
        <button onClick={() => { playClick(); onClose(); }} aria-label="Chiudi la battaglia e torna alla mappa" className="text-slate-300 bg-slate-900/70 rounded-full p-1.5"><X size={16} /></button>
      </div>

      {phase === "intro" && (
        <IntroPanel battle={battle} playerCows={sorted} cowId={cowId} setCowId={setCowId} onStart={begin} onClose={onClose} playClick={playClick} trainerLevel={trainerLevel} personalita={personalita}
          backpack={backpack} loadout={loadout} setLoadout={setLoadout} limato={limato} setLimato={setLimato}
          approccio={approccio} setApproccio={setApproccio} />
      )}

      {phase !== "intro" && player && opp && ultraCompact && (
        // Spazio utile sotto ~700px (iPhone SE): la scena COLLASSA invece di
        // scrollare. La barra SPINTA sta FUORI dall'area scrollabile — non deve
        // mai poter uscire dallo schermo, è l'unico indicatore di chi sta
        // vincendo — e le targhette stanno su una riga sola. Lo scroll sotto
        // resta solo come rete di sicurezza (runtime senza ResizeObserver: niente
        // refit, quindi il contenuto potrebbe eccedere di poco).
        <motion.div animate={shake ? { x: [0, -8, 7, -5, 0] } : {}} transition={{ duration: 0.35 }} className="relative flex-1 min-h-0 flex flex-col gap-0.5 px-3 py-0.5">
          <div className="shrink-0 flex justify-center">
            <SpintaBar playerName={player.name} oppName={opp.name} barraP={barraP} compact pinned />
          </div>
          <div ref={arenaRef} className="flex-1 min-h-0 overflow-y-auto">
            <div ref={stackRef} className="flex flex-col gap-0.5">
              <Combatant pos="top" s={opp} fiato={st.fiatoO} lunge={lunge === "o"} compact ultra figura={figura} />
              <Combatant pos="bottom" s={player} fiato={st.fiatoP} calma={st.calma} lunge={lunge === "p"} compact ultra figura={figura} />
            </div>
          </div>
        </motion.div>
      )}

      {phase !== "intro" && player && opp && compactArena && !ultraCompact && (
        // Spazio utile corto (<845px, fasce di safe-area già scalate): stack
        // verticale in normal flow — le card non
        // possono MAI accavallarsi (a differenza del layout assoluto) e se il
        // contenuto non entra tutto, l'area scrolla invece di clippare/sovrapporre.
        <motion.div ref={arenaRef} animate={shake ? { x: [0, -8, 7, -5, 0] } : {}} transition={{ duration: 0.35 }} className="relative flex-1 min-h-0 overflow-y-auto">
          <div ref={stackRef} className="flex flex-col items-center gap-1 px-3 py-1">
            <Combatant pos="top" s={opp} fiato={st.fiatoO} lunge={lunge === "o"} compact figura={figura} />
            <SpintaBar playerName={player.name} oppName={opp.name} barraP={barraP} compact />
            <Combatant pos="bottom" s={player} fiato={st.fiatoP} calma={st.calma} lunge={lunge === "p"} compact figura={figura} />
          </div>
        </motion.div>
      )}

      {phase !== "intro" && player && opp && !compactArena && (
        // Layout originale "a diagonale" — invariato, per non regredire il look con ≥845px di spazio utile (844 è già stack compatto).
        <motion.div animate={shake ? { x: [0, -8, 7, -5, 0] } : {}} transition={{ duration: 0.35 }} className="relative flex-1 min-h-0 overflow-hidden">
          <Combatant pos="top" s={opp} fiato={st.fiatoO} lunge={lunge === "o"} />
          <Combatant pos="bottom" s={player} fiato={st.fiatoP} calma={st.calma} lunge={lunge === "p"} />
          <SpintaBar playerName={player.name} oppName={opp.name} barraP={barraP} />
        </motion.div>
      )}

      {phase !== "intro" && player && (
        // Idem: la pulsantiera è a filo schermo, la safe-area si somma a p-3 (0.75rem).
        <div className={`bg-slate-950/85 backdrop-blur border-t border-slate-800 ${ultraCompact ? "p-2 space-y-1.5" : "p-3 space-y-2"}`}
          style={{ paddingBottom: `calc(${ultraCompact ? "0.5rem" : "0.75rem"} + env(safe-area-inset-bottom))` }}>
          {/* Telecronaca ad altezza in RIGHE INTERE. Prima era `h-[50px]` con
              interlinea 1,4 su 12px (16,8px): entravano 1,90 righe e il taglio
              cadeva in mezzo all'altezza-x delle lettere — sembrava un bug di
              rendering. L'interlinea si fissa inline perché le regole di
              leggibilità di index.css hanno un ID e batterebbero `leading-*`.
              2 righe durante la spinta, 6 alla fine: lì il pannello si svuota e
              la cronaca ci sta tutta invece di lasciare schermo vuoto. */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 overflow-hidden"
            style={{ height: `${LOG_RIGA * (phase === "end" ? 6 : 2) + LOG_BORDI}px` }}>
            <div className="h-full overflow-y-auto no-scrollbar" style={{ maskImage: LOG_SFUMA, WebkitMaskImage: LOG_SFUMA }}>
              {log.length === 0 ? <p className="text-[10px] font-mono text-slate-500" style={{ lineHeight: `${LOG_RIGA}px` }}>Scegli come condurre la spinta…</p> :
                log.map((l, i) => <div key={i} style={{ lineHeight: `${LOG_RIGA}px` }} className={`text-[10px] font-mono ${i === 0 ? "text-slate-100" : "text-slate-500"}`}>❖ {l}</div>)}
            </div>
          </div>

          {phase === "fight" && !showBag && (
            <>
              {isTutorial && tutStep && (
                <div className="flex items-start gap-2 bg-rose-950/40 border border-[#c8102e]/50 rounded-xl px-3 py-2" id="tutorial-meme">
                  <span className="text-xl" aria-hidden="true">👵</span>
                  <p className="text-[11px] text-rose-100 leading-snug">{tutStep.memeText}</p>
                </div>
              )}
              {st.tell && (
                <div id="battle-tell" className="flex items-center gap-2 bg-amber-500/10 border border-amber-600/40 rounded-xl px-3 py-1.5">
                  <span aria-hidden="true">👁</span>
                  <div className="text-[11px] font-mono text-amber-200 leading-tight">
                    L'avversaria <b>{st.tell}</b>…
                    <span className="text-[9px] text-slate-400 block">Indole {PERSONALITA_LABEL[st.personalita ?? "focosa"].label.toLowerCase()} · il Rispetto affina la lettura</span>
                  </div>
                </div>
              )}
              {mossePRef.current && (
                <MossePanel id="battle-moves" mosse={mossePRef.current} st={st} busy={busy}
                  onMossa={doAction} onInfo={(m) => { playClick(); setInfoMossa(m); }}
                  famiglieAbilitate={tutStep?.famiglieAbilitate}
                  hintDisabilitata="👵 non ora — segui Mémé" />
              )}
              <div className="flex gap-2">
                <button onClick={() => { playClick(); setShowBag(true); }} disabled={busy} className="flex-1 flex items-center justify-center gap-2 bg-slate-900 border border-amber-700/40 text-amber-400 font-mono font-black text-xs py-2 rounded-xl disabled:opacity-40">
                  <Backpack className="w-4 h-4" /> Sac ({bagItems.reduce((n, b) => n + b.quantity, 0)})
                </button>
                <button onClick={retire} disabled={busy} className="px-4 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-2 rounded-xl disabled:opacity-40">Ritìrati</button>
              </div>
            </>
          )}

          {phase === "fight" && showBag && (
            <div className="space-y-1.5">
              {bagItems.length === 0 ? <p className="text-[10px] text-slate-500 text-center py-2">Sac vuoto: alla vigilia non hai portato scorte.</p> :
                bagItems.map((b) => {
                  const eff = SAC_ITEMS[b.id];
                  return (
                    <button key={b.id} onClick={() => applyItem(b.id)} disabled={busy} className="w-full flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-2 text-left disabled:opacity-40">
                      <span className="text-xl">{eff.emoji}</span>
                      <div className="flex-grow"><div className="text-[11px] font-mono font-black text-slate-100">{eff.nome}</div><div className="text-[9px] text-slate-400">{eff.desc}</div></div>
                      <span className="text-[10px] font-mono text-amber-400">×{b.quantity}</span>
                    </button>
                  );
                })}
              <button onClick={() => { playClick(); setShowBag(false); }} className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-1.5 rounded-xl">Chiudi zaino</button>
            </div>
          )}

          {phase === "end" && (
            <div className="text-center space-y-2 py-1">
              {/* Verdetto: più grande (la schermata finale aveva ~32% di vuoto) e su
                  token d'inchiostro — `text-emerald-600`/`text-rose-500` scendevano
                  sotto AA sul pannello chiaro. Restano `font-mono font-black`: è
                  l'aggancio di scripts/verify.mjs per la fine battaglia. */}
              <div className={`text-xl font-mono font-black ${winner === "player" ? "tone-positive" : "text-primary-strong"}`}>
                {winner === "player" ? "🏆 La rivale cede e si ritira!" : "😔 La tua Reina si ritira"}
              </div>
              <button onClick={() => { playClick(); onClose(); }} className="w-full nav-active text-white font-mono font-black text-xs py-2.5 rounded-xl">Torna alla mappa</button>
            </div>
          )}
        </div>
      )}

      {infoMossa && <MossaInfoSheet mossa={infoMossa} onClose={() => setInfoMossa(null)} playClick={playClick} />}

      {confirmRetire && (
        <ConfirmDialog
          title="Ritirarsi dalla spinta?"
          message="La spinta conta come sconfitta."
          confirmLabel="Ritìrati"
          danger
          onConfirm={confirmRetireYes}
          onCancel={() => setConfirmRetire(false)}
        />
      )}
    </div>
  );
}

function IntroPanel({ battle, playerCows, cowId, setCowId, onStart, onClose, playClick, trainerLevel, personalita, backpack, loadout, setLoadout, limato, setLimato, approccio, setApproccio }: {
  battle: MapBattle; playerCows: Vatsamon[]; cowId: string; setCowId: (id: string) => void;
  onStart: () => void; onClose: () => void; playClick: () => void; trainerLevel: number; personalita: Personalita;
  backpack: BackpackItem[]; loadout: string[]; setLoadout: (v: string[]) => void; limato: boolean; setLimato: (v: boolean) => void;
  approccio: Approccio; setApproccio: (v: Approccio) => void;
}) {
  const locked = trainerLevel < battle.reqLevel;
  // Scelta tattica SOLO in Arena (mai Pastore, mai Tutorial — che è sempre kind "pastore").
  const showApproccio = battle.kind === "arena" && !battle.tutorial;
  const sacDisponibili = backpack.filter((b) => SAC_ITEMS[b.id] && b.quantity > 0);
  const toggleSac = (id: string) => {
    playClick();
    setLoadout(loadout.includes(id) ? loadout.filter((x) => x !== id) : loadout.length < MAX_VIGILIA ? [...loadout, id] : loadout);
  };
  return (
    // Safe-area sommata a p-5 (1.25rem): "Alla spinta!" è l'ultimo elemento
    // scrollabile e senza compensazione finisce sotto l'home indicator.
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-start p-5 gap-4 text-center"
      style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
      <div className="text-6xl drop-shadow">{battle.emoji}</div>
      <div>
        <div className="text-base font-mono font-black text-slate-100">{battle.name}</div>
        <div className="text-[11px] text-slate-300">{battle.subtitle}</div>
        {battle.pastore && <p className="text-[11px] text-slate-200 italic mt-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 max-w-xs">"{battle.pastore.dialogueIntro}"</p>}
        {battle.tutorial && <p className="text-[11px] text-rose-100 mt-2 bg-rose-950/40 border border-[#c8102e]/50 rounded-2xl p-3 max-w-xs leading-snug">{TUTORIAL_VIGILIA}</p>}
        <p className="text-[11px] font-mono mt-2 text-slate-300">È una <b className="text-emerald-700">spinta a corna limate</b>: vince chi fa cedere l'avversaria. Osserva i suoi movimenti e rispondi — conduci, non forzare.</p>
        {/* Stessa famiglia di difetto della limatura qui sotto: `text-amber-600`
            non è nemmeno intercettato dal blocco di correzione contrasto di
            index.css (copre 300/400/500) e misurava 2,88:1 dai pixel sul verde
            del prato. È una riga informativa, quindi inchiostro: `text-slate-200`
            misura 6,2:1 nel punto peggiore del gradiente. */}
        <p className="text-[10px] font-mono mt-1 text-slate-200">Indole avversaria: <b>{PERSONALITA_LABEL[personalita].label}</b> — {PERSONALITA_LABEL[personalita].desc}</p>
        {battle.arena?.terrain && (
          <p className="text-[10px] font-mono mt-1 text-sky-300">Terreno: <b>{TERRAIN_LABEL[battle.arena.terrain].label}</b> — {TERRAIN_LABEL[battle.arena.terrain].hint}.</p>
        )}
      </div>
      {locked ? (
        <div className="text-rose-500 font-mono font-bold text-sm">🔒 Richiede livello {battle.reqLevel}</div>
      ) : (
        <>
          <div className="w-full max-w-sm">
            <div className="text-[10px] font-mono text-slate-200 mb-1">Scegli la tua Reina:</div>
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
          {/* LO SAC DU BERGER: scegli fino a 3 scorte da portare */}
          <div className="w-full max-w-sm" id="vigilia-sac">
            <div className="text-[10px] font-mono text-slate-200 mb-1">Lo Sac du Berger — porta fino a {MAX_VIGILIA} scorte:</div>
            {sacDisponibili.length === 0 ? (
              <p className="text-[10px] text-slate-300">Nessuna scorta: rifornisciti alla Bottega della Casera.</p>
            ) : (
              <div className="flex gap-1.5 flex-wrap justify-center">
                {sacDisponibili.map((b) => {
                  const eff = SAC_ITEMS[b.id];
                  const sel = loadout.includes(b.id);
                  return (
                    <button key={b.id} data-sac={b.id} onClick={() => toggleSac(b.id)} title={eff.desc}
                      className={`rounded-xl border-2 px-2 py-1.5 text-[10px] font-mono font-bold min-h-[40px] ${sel ? "border-amber-500 bg-amber-500/15 text-amber-200" : "border-slate-700 bg-slate-900/70 text-slate-300"}`}>
                      {eff.emoji} {eff.nome.split(" ")[0]} ×{b.quantity}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* APPROCCIO D'INGAGGIO (S17) — scelta tattica, solo in Arena */}
          {showApproccio && (
            <div className="w-full max-w-sm" id="vigilia-approccio">
              <div className="text-[10px] font-mono text-slate-200 mb-1">Approccio all'ingaggio:</div>
              <div className="flex gap-1.5 justify-center">
                {(Object.keys(APPROCCIO_LABEL) as Approccio[]).map((a) => {
                  const sel = approccio === a;
                  return (
                    <button key={a} data-approccio={a} onClick={() => { playClick(); setApproccio(a); }} title={APPROCCIO_LABEL[a].desc}
                      className={`flex-1 rounded-xl border-2 px-2 py-1.5 text-[10px] font-mono font-bold min-h-[40px] ${sel ? "border-sky-500 bg-sky-500/15 text-sky-200" : "border-slate-700 bg-slate-900/70 text-slate-300"}`}>
                      {APPROCCIO_LABEL[a].label}
                    </button>
                  );
                })}
              </div>
              <div className="text-[9px] text-slate-300 mt-1 leading-snug">{APPROCCIO_LABEL[approccio].desc}</div>
            </div>
          )}

          {/* IL RITO DELLA LIMATURA — obbligatorio, garanzia d'incruenza */}
          <button
            id="rito-limatura"
            onClick={() => { if (!limato) { playClick(); setLimato(true); } }}
            className={`relative w-full max-w-sm rounded-xl border-2 p-2.5 text-left transition-all ${limato ? "border-emerald-500 bg-emerald-950/40" : "border-amber-600/60 bg-amber-500/10"}`}
          >
            {/* Il richiamo pulsa su una velatura DIETRO il testo, non più
                sull'intero bottone: `animate-pulse` porta l'opacità a 0.5 e con
                essa anche tutte le scritte, e a metà ciclo su quel verde NESSUN
                colore può arrivare a 4,5:1 (il tetto è 3,35:1 pure a testo nero).
                Misurato dai pixel prima: 2,31:1 nel punto basso del ciclo. */}
            {!limato && <span aria-hidden="true" className="absolute inset-0 rounded-xl bg-amber-500/10 animate-pulse" />}
            {/* `text-emerald-500` (#066b49) sopra il prato misurava 4,25:1 dai pixel:
                sotto AA. `tone-positive` è il token del contratto per "completato".
                Sul lato "da fare" l'ambra è fuori ruolo (nel contratto è la valuta)
                e comunque non regge: #7a4700 sul verde del prato misura 4,38:1,
                sotto la soglia. Inchiostro, che tiene su prato e su carta. */}
            <div className={`relative text-[11px] font-mono font-black ${limato ? "tone-positive" : "text-slate-100"}`}>
              {limato ? "✓ Corna limate — si può spingere" : "🪒 Lima le corna (rito obbligatorio)"}
            </div>
            <div className="relative text-[9.5px] text-slate-200 leading-snug mt-0.5">{LIMATURA_TESTO}</div>
          </button>

          <div className="flex gap-2 w-full max-w-sm">
            <button onClick={() => { playClick(); onClose(); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs py-3 rounded-xl">Indietro</button>
            <button onClick={onStart} id="battle-start" disabled={!limato} className="flex-1 nav-active text-white font-mono font-black text-xs py-3 rounded-xl disabled:opacity-40 disabled:grayscale">Alla spinta! 🐂</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Barra SPINTA (contesa): posizionamento assoluto (layout diagonale, spazio utile
 * ≥845px), inline (stack compatto <845px, fix mobile-qa 2026-07-13) oppure pinnata
 * in cima all'arena fuori dallo scroll (stack ultra-compatto <700px). */
function SpintaBar({ playerName, oppName, barraP, compact, pinned }: {
  playerName: string; oppName: string; barraP: number; compact?: boolean; pinned?: boolean;
}) {
  const vantaggio = barraP - 50;
  return (
    <div className={compact ? (pinned ? "w-full max-w-sm" : "w-full max-w-[220px]") : "absolute top-2 left-1/2 -translate-x-1/2 w-[78%] max-w-sm"}>
      {/* `text-slate-700` è il token dei BORDI (#bcb4da): come testo sul fondo
          chiaro dell'arena valeva 1,56:1, la scritta meno leggibile dello schermo
          proprio sulla meccanica centrale. Inchiostro per l'etichetta, e i due
          nomi passano a token di testo sicuri (erano 3,43:1 e 4,49:1).
          Il vantaggio numerico esce dalla barra: dentro era bianco su bianco
          quando la contesa stava sotto il 50%, e copriva la tacca di metà. */}
      <div className={`flex justify-between items-baseline gap-2 text-[10px] font-mono font-black ${compact ? "" : "mb-0.5"}`}>
        <span className="tone-positive truncate">{playerName}</span>
        <span className="shrink-0 text-slate-200">
          SPINTA <span className={vantaggio > 0 ? "tone-positive" : vantaggio < 0 ? "text-primary-strong" : "text-slate-400"}>
            {vantaggio > 0 ? `+${vantaggio}` : vantaggio < 0 ? `${vantaggio}` : "·"}
          </span>
        </span>
        <span className="text-primary-strong truncate text-right">{oppName}</span>
      </div>
      <div className={`relative rounded-full bg-rose-400/40 border border-slate-700 overflow-hidden shadow-inner ${compact && !pinned ? "h-2" : compact ? "h-3" : "h-4"}`}>
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${barraP}%` }} />
        {/* Tacca di metà: era `bg-slate-900/60`, cioè un token CHIARO al 60%, e
            spariva sia sotto il riempimento verde sia sul fondo chiaro. Bianca con
            un anello scuro si legge su entrambi, ed è l'ultimo elemento dipinto. */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/90 shadow-[0_0_0_1px_rgba(18,14,38,0.55)]" />
      </div>
    </div>
  );
}

/** Un combattente sul campo: foto + targhetta Fiato (e Calma per il giocatore).
 * `compact`: stack verticale in normal flow (spazio utile <845px, mai overlap per
 * costruzione) invece del posizionamento assoluto "a diagonale" (fix mobile-qa 2026-07-13). */
function Combatant({ pos, s, fiato, calma, lunge, compact, ultra, figura }: {
  pos: "top" | "bottom"; s: Spintatore; fiato: number; calma?: number; lunge: boolean; compact?: boolean; ultra?: boolean; figura?: number;
}) {
  const top = pos === "top";
  const fiatoPct = Math.max(0, Math.min(100, Math.round((fiato / s.fiatoMax) * 100)));
  // Ampiezza della stoccata. Era ±36 e mangiava il margine reale fra i box
  // dipinti (32,8px in verticale, 32,0px in orizzontale sui viewport stretti):
  // al culmine la figura dell'avversaria entrava di 3,2px nella targhetta del
  // giocatore. ±30 lascia il margine positivo su tutte le taglie misurate e lo
  // scarto resta ampio quanto la figura stessa: il gesto non si spegne.
  const lungeX = top ? -30 : 30, lungeY = top ? 30 : -30;
  if (ultra) {
    // Riga sola: foto + nome + FIATO inline + CALMA come pallino (col valore
    // accanto, che un pallino da solo non dice quanto). Il riquadro della foto
    // ha lo stesso rapporto della sorgente (16:9, vedi "FORMA DEL BOX" in
    // CowVisual) e `fit="cover"`: era 3:2 con il ritaglio di default, cioè
    // ancora letterbox. `aspectRatio` invece di un'altezza fissa perché il tetto
    // del 45% può stringere la larghezza: con il rapporto imposto dal CSS il
    // ritaglio resta verticale (solo la cornice beige stampata nelle foto) e non
    // può mai mangiare la testa dell'animale di lato.
    // `data-fighter`/`data-paint` marcano i box DIPINTI: sono quelli da
    // confrontare nei test anti-sovrapposizione (i wrapper del layout diagonale
    // sono larghi il 60% e si intersecano per costruzione).
    const lato = figura ?? 48;
    return (
      <div data-fighter={pos} className="w-full flex items-center gap-2">
        <motion.div data-paint="figura"
          className={`shrink-0 rounded-xl overflow-hidden border-2 shadow-lg ${top ? "border-rose-400/60" : "border-emerald-400/70"}`}
          style={{ width: Math.round((lato * 16) / 9), aspectRatio: "16 / 9", maxWidth: "45%" }}
          animate={lunge ? { x: top ? -10 : 10 } : { x: 0 }} transition={{ duration: 0.16 }}>
          <CowVisual cow={s.visual} fit="cover" className="w-full h-full" />
        </motion.div>
        <div data-paint="card" className="flex-1 min-w-0 flex items-center gap-2 bg-slate-950/85 border border-slate-700 rounded-xl px-2 py-0.5 shadow-lg">
          <span className="text-[11px] font-mono font-black text-slate-100 truncate">{s.name}</span>
          <span className="text-[9px] font-mono text-slate-400 shrink-0">FIATO</span>
          <div className="flex-1 min-w-[36px] h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div className="h-full bg-sky-400 transition-all duration-400" style={{ width: `${fiatoPct}%` }} />
          </div>
          {calma !== undefined && (
            <span className="shrink-0 flex items-center gap-1" title={`Calma ${Math.round(calma)}%`}>
              <span aria-hidden="true" className="block w-2.5 h-2.5 rounded-full border border-slate-700"
                style={{ background: calma < 35 ? "#ef4444" : "#a78bfa" }} />
              <span className="sr-only">Calma</span>
              <span className="text-[9px] font-mono text-slate-300">{Math.round(calma)}</span>
            </span>
          )}
        </div>
      </div>
    );
  }
  // Box con lo stesso rapporto della sorgente (16:9) + `fit="cover"`: il
  // contratto di CowVisual, che era già applicato a Vatsadex/CowCard/Stalla ma
  // non qui — proprio dove le Reines sono più grandi.
  // Nel ramo diagonale si tiene la LARGHEZZA storica (96/112px) e si abbassa
  // l'altezza: la Reina resta grande esattamente com'era (dentro il quadrato
  // rendeva 96×54 e 112×63, cioè il 56% del riquadro) ma sparisce il letterbox.
  // Crescere in larghezza invece che calare in altezza NON si può: le due card
  // stanno in wrapper assoluti larghi il 60%, ancorati agli angoli opposti, e a
  // 390px un box 16:9 alto 96px sarebbe largo 199 — misurato, le due figure si
  // intersecano (e la figura in alto entra nella targhetta del giocatore).
  const imgCls = compact ? "w-full h-full" : (top ? "w-24 aspect-[16/9]" : "w-28 aspect-[16/9]");
  const cardPad = compact ? "px-2 py-0.5" : "px-2.5 py-1.5";
  const cardMinW = compact ? 128 : 150;
  const blobW = top ? 70 : 84;
  const blobH = 10;
  const wrapperCls = compact
    ? "flex flex-col items-center gap-0"
    : `absolute ${top ? "top-16" : "bottom-3"} ${top ? "right-3" : "left-3"} flex flex-col ${top ? "items-end" : "items-start"} gap-1`;
  return (
    <div data-fighter={pos} className={wrapperCls} style={compact ? undefined : { width: "60%" }}>
      <div data-paint="card" className={`bg-slate-950/85 border border-slate-700 rounded-xl ${cardPad} shadow-lg ${compact ? "" : (top ? "self-start" : "self-end")}`} style={{ minWidth: cardMinW }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-black text-slate-100 truncate">{s.name}</span>
          <span className="text-[9px] font-mono text-slate-400">{s.breed}</span>
        </div>
        <div className={`text-[9px] font-mono text-slate-500 ${compact ? "" : "mt-0.5"}`}>FIATO</div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
          <div className="h-full bg-sky-400 transition-all duration-400" style={{ width: `${fiatoPct}%` }} />
        </div>
        {calma !== undefined && (
          <>
            <div className={`text-[9px] font-mono text-slate-500 ${compact ? "" : "mt-0.5"}`}>CALMA</div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full transition-all duration-400" style={{ width: `${calma}%`, background: calma < 35 ? "#ef4444" : "#a78bfa" }} />
            </div>
          </>
        )}
      </div>
      <motion.div className="relative" animate={lunge ? { x: lungeX, y: lungeY } : { x: 0, y: 0 }} transition={{ duration: 0.16 }}>
        <div data-paint="figura" className={`rounded-2xl overflow-hidden border-2 shadow-2xl ${top ? "border-rose-400/60" : "border-emerald-400/70"}`}
          style={compact ? { width: Math.round(((figura ?? 48) * 16) / 9), aspectRatio: "16 / 9", maxWidth: "100%" } : undefined}>
          <CowVisual cow={s.visual} fit="cover" className={imgCls} />
        </div>
        {!compact && <div className="mx-auto mt-1 rounded-[100%] bg-black/20 blur-[2px]" style={{ width: blobW, height: blobH }} />}
      </motion.div>
    </div>
  );
}
