import { Vatsamon } from "../types";
import { Fighter } from "./battle";

/**
 * "LA SPINTA" v2 — motore di combattimento INCRUENTO delle Batailles de Reines.
 * «L'allevatore conduce, ma non forza» (dossier §1): si vince LEGGENDO
 * l'animale, non martellando un bottone.
 *
 * Modello: barra di spinta contesa (0..100) + FIATO + CALMA, con due novità:
 *  • STANCE — ogni azione resta "in campo" come postura: l'azione avversaria
 *    successiva si risolve CONTRO la tua postura (matrice di counter).
 *    Incalza punisce chi recupera ma si spegne su chi Regge; Gira aggira chi
 *    Regge ma si schianta su chi Incalza frontale.
 *  • TELL — prima di ogni tua scelta l'avversaria telegrafa l'intenzione
 *    ("scalpita", "punta le zampe"…). L'affidabilità della lettura cresce col
 *    RISPETTO del giocatore: chi rispetta gli animali li sa leggere.
 * La MASSA deriva dal PESO REALE (kg): la categoria di peso conta davvero.
 */

export interface Spintatore {
  name: string;
  breed: string;
  massa: number;    // dal peso reale in kg (+ piccolo bonus allenamento)
  presa: number;    // leva di corna (a corna limate)
  volonta: number;  // testa/grinta → riserva di FIATO
  fiatoMax: number; // 100 + volonta
  visual: Pick<Vatsamon, "breed" | "rarity" | "realPhoto" | "name"> & { sightingPhotoId?: string };
}

function clamp(n: number, lo = 1, hi = 100) { return Math.max(lo, Math.min(hi, Math.round(n))); }

/**
 * PRNG deterministico (mulberry32) per test/replay: dato lo stesso seed produce
 * SEMPRE la stessa sequenza. Nessuno stato module-level — ogni chiamata crea
 * un generatore indipendente, thread-safe rispetto a più duelli in parallelo.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Massa dal peso vivo: 480 kg ≈ 25 · 560 ≈ 50 · 640 ≈ 75 · 720+ ≈ 100.
 *  Il piccolo contributo di `def` premia l'allenamento senza dominare il peso. */
export function massaFromPeso(pesoKg: number, defBonus = 50): number {
  return clamp((pesoKg - 400) / 3.2 + (defBonus - 50) / 8, 20, 100);
}

/** Deriva uno Spintatore da un Fighter (giocatore, Pastore o boss). */
export function spintatoreFromFighter(f: Fighter): Spintatore {
  const massa = massaFromPeso(f.peso, f.def);
  const presa = clamp(f.atk);
  const volonta = clamp(f.agi);
  return { name: f.name, breed: f.breed, massa, presa, volonta, fiatoMax: 100 + volonta, visual: f.visual };
}

export type AzioneId = "incalza" | "reggi" | "gira" | "incoraggia";

/**
 * Modificatori di una MOSSA (data/mosse.ts): ogni mossa è il comportamento
 * base della sua famiglia (AzioneId) + questi piccoli scostamenti. Tutti i
 * default riproducono ESATTAMENTE i numeri storici del motore, così una
 * partita senza mosse equipaggiate è identica a prima.
 */
export interface MossaMods {
  spintaMult?: number;           // ×shift per incalza/gira (default 1)
  fiatoDelta?: number;           // sommato al bilancio fiato dell'azione (negativo = costa di più)
  calmaDelta?: number;           // sommato all'effetto calma su di sé
  calmaAvv?: number;             // quanto INNERVOSISCE l'avversaria (calma avversaria -= n)
  reggiAssorbi?: number;         // postura: residuo dell'incalzata subita (default 0.4)
  reggiRimbalzo?: number;        // postura: terreno contro-guadagnato sul rimbalzo (default 2.5)
  reggiEsposizioneGira?: number; // postura: vulnerabilità al gira (default 1.35)
  recuperoMult?: number;         // ×fiato e ×calma recuperati con incoraggia (default 1)
  barraCost?: number;            // terreno ceduto incoraggiando (default 4)
  scrambleTell?: boolean;        // confonde l'avversaria: prossima scelta/lettura casuale
}

/** Riferimento leggero a una mossa: basta al motore (il registry vive in data/mosse.ts). */
export interface MossaRef { id: string; nome: string; emoji: string; mods: MossaMods }

/**
 * Effetto di TERRENO (S16): deriva dal bossType tematico dell'arena
 * (data/arenas.ts). Modificatori SIMMETRICI — si applicano a ENTRAMBI i lati
 * del duello, mai solo all'attaccante o solo al giocatore. Valori piccoli,
 * validati da scripts/sim-spinta.ts (nessuna combo terreno×mossa fuori soglia).
 * undefined (Dungeon/Éliminatoire/PvP/Pastori) = comportamento storico
 * bit-identico: nessuna arena, nessun terreno, nessun cambio di numeri.
 */
export type TerrainEffect = "prato" | "latte" | "tempesta" | "roccia" | "corna";

interface TerrainMods {
  fiatoRecupMult?: number;   // ×fiato recuperato con Reggi/Incoraggia (chiunque lo usi)
  calmaRecupMult?: number;   // ×calma recuperata con Reggi/Incoraggia (chiunque lo usi)
  calmaCaloMult?: number;    // ×calma persa attaccando (Incalza/Gira, chiunque attacchi)
  reggiAssorbiMult?: number; // ×reggiAssorbi quando SI regge un'incalzata (chiunque regga)
  reggiRimbalzoAdd?: number; // + terreno guadagnato sul rimbalzo di chi regge
  incalzaMult?: number;      // ×pushGain dell'Incalza (chiunque incalzi)
}

const TERRAIN_MODS: Record<TerrainEffect, TerrainMods> = {
  prato: { fiatoRecupMult: 1.03 },
  latte: { calmaRecupMult: 1.10 },
  tempesta: { calmaCaloMult: 1.02 },
  roccia: { reggiAssorbiMult: 0.92, reggiRimbalzoAdd: 0.25 },
  corna: { incalzaMult: 1.04 },
};

/** Etichetta + hint di 1 riga per il pannello di vigilia (BattleScene). */
export const TERRAIN_LABEL: Record<TerrainEffect, { label: string; hint: string }> = {
  prato: { label: "Prato d'alpeggio", hint: "il fiato si recupera meglio" },
  latte: { label: "Alpe da latte", hint: "la calma si ritrova più in fretta" },
  tempesta: { label: "Tempesta", hint: "la calma cala più in fretta per entrambe" },
  roccia: { label: "Roccia", hint: "chi regge assorbe meglio l'urto" },
  corna: { label: "Corna", hint: "le incalzate spingono un po' più forte" },
};

export interface Azione { id: AzioneId; label: string; emoji: string; desc: string; counterHint: string }
export const AZIONI: Azione[] = [
  { id: "incalza", label: "Incalza", emoji: "🐂", desc: "Spinta decisa a fronti opposti: la massa conta, il fiato se ne va.", counterHint: "forte su chi recupera o gira · si spegne su chi regge" },
  { id: "reggi", label: "Reggi", emoji: "🪨", desc: "Pianti gli zoccoli e assorbi la spinta, guadagnando terreno sul rimbalzo.", counterHint: "ferma chi incalza · aggirabile da chi gira" },
  { id: "gira", label: "Gira di leno", emoji: "🌀", desc: "Cerchi il fianco con la leva delle corna.", counterHint: "aggira chi regge · punita dall'incalzata frontale" },
  { id: "incoraggia", label: "Incoraggia", emoji: "💚", desc: "Conduci con la voce: la Reina ritrova fiato e calma.", counterHint: "recupero pieno se l'avversaria non attacca" },
];

/** Indole dell'avversaria: guida le sue scelte (e i suoi tell). */
export type Personalita = "focosa" | "paziente" | "astuta" | "nervosa";
export const PERSONALITA_LABEL: Record<Personalita, { label: string; desc: string }> = {
  focosa:   { label: "Focosa",   desc: "Spinge a testa bassa: reggila e lasciala sfiancarsi." },
  paziente: { label: "Paziente", desc: "Regge e aspetta l'errore: aggirala di leno." },
  astuta:   { label: "Astuta",   desc: "Cerca sempre il fianco: incalzala frontale." },
  nervosa:  { label: "Nervosa",  desc: "Imprevedibile ma fragile di calma." },
};

/** Mappa i vecchi 'tipi' (etichette legacy nei dati arena/lega) su un'indole. */
export function personalitaFromLegacy(t: string | undefined, seed = 0): Personalita {
  switch (t) {
    case "corna": return "focosa";
    case "roccia": return "paziente";
    case "prato": return "astuta";
    case "tempesta": return "nervosa";
    case "latte": return "paziente";
    default: {
      const all: Personalita[] = ["focosa", "paziente", "astuta", "nervosa"];
      return all[Math.abs(seed) % all.length];
    }
  }
}

/** Tell comportamentali (descrizioni d'osservazione, non "tradizioni"). */
const TELLS: Record<AzioneId, string[]> = {
  incalza: ["scalpita e abbassa la testa", "punta dritta, muso a terra"],
  reggi: ["pianta gli zoccoli nel terreno", "si fa bassa e compatta"],
  gira: ["ti gira attorno, cerca il fianco", "sposta il peso di lato"],
  incoraggia: ["soffia e alza la testa per respirare", "allenta la pressione, riprende fiato"],
};

export interface SpintaState {
  barra: number;     // 0..100, >50 = vantaggio giocatore
  fiatoP: number;
  fiatoO: number;
  calma: number;     // Reina del giocatore
  calmaO?: number;   // Reina avversaria (si innervosisce se forzata)
  stanceP: AzioneId | null; // ultima azione in campo (postura)
  stanceO: AzioneId | null;
  stanceMossaP?: MossaRef | null; // la MOSSA in campo come postura (i mods del Reggi
  stanceMossaO?: MossaRef | null; // si esprimono quando l'avversaria la attacca)
  confusaP?: boolean;       // la prossima LETTURA del giocatore è casuale (tell inaffidabile)
  confusaO?: boolean;       // la prossima SCELTA dell'avversaria è casuale (ignora indole)
  usiMosse?: Record<string, number>; // usi per spinta delle mosse speciali (chiave `p:${id}`)
  intentO?: AzioneId;       // intenzione telegrafata dell'avversaria
  tell?: string;            // il tell mostrato (può ingannare)
  tellAzione?: AzioneId;    // l'azione che il tell LASCIA INTENDERE (per capire se ha mentito)
  turno?: number;
  personalita?: Personalita;
  terrain?: TerrainEffect;  // effetto d'arena (S16), simmetrico, undefined altrove
  tellAccuracy?: number;    // 0..1, dal Rispetto del giocatore
  rng?: () => number;       // PRNG seedabile (mulberry32) per replay/test deterministici;
                             // assente = Math.random (comportamento identico a oggi)
  esito: "corso" | "vinto" | "perso";
}

/** Prossimo numero pseudocasuale: usa il PRNG dello stato se presente,
 *  altrimenti Math.random (nessun cambio di comportamento senza rng). */
function rand(s: SpintaState): number {
  return (s.rng ?? Math.random)();
}

/** Oltre questo numero di azioni il duello si risolve al giudizio di condotta. */
export const MAX_TURNI = 16;

/** Ingaggio: chi ha più presa parte leggermente avanti. */
export function initSpinta(
  p: Spintatore,
  o: Spintatore,
  opts?: { personalita?: Personalita; tellAccuracy?: number; rng?: () => number; terrain?: TerrainEffect },
): SpintaState {
  const barra = clamp(50 + (p.presa - o.presa) / 4, 30, 70);
  const st: SpintaState = {
    barra, fiatoP: p.fiatoMax, fiatoO: o.fiatoMax, calma: 80, calmaO: 80,
    stanceP: null, stanceO: null, turno: 0,
    personalita: opts?.personalita ?? "focosa",
    terrain: opts?.terrain,
    tellAccuracy: opts?.tellAccuracy ?? 0.75,
    rng: opts?.rng,
    esito: "corso",
  };
  // rng già in stato PRIMA del primo prepareIntent: replay deterministico dal turno 0.
  prepareIntent(st, o, p);
  return st;
}

const FIATO_INCALZA = 20, FIATO_GIRA = 13, FIATO_RECUP = 10, FIATO_INCOR = 14;

/** Spinta frontale: la massa (peso reale) è la leva principale. */
function pushGain(A: Spintatore, B: Spintatore): number {
  return Math.max(2.5, ((A.massa * 0.65 + A.volonta * 0.35) - B.massa * 0.55) / 4.2);
}
/** Leva di fianco: conta il vantaggio di presa. */
function giraGain(A: Spintatore, B: Spintatore): number {
  return 5 + Math.max(0, A.presa - B.presa) / 4.5;
}

export interface TurnResult {
  state: SpintaState;
  log: string;
  nervosa: boolean;
  counter: "A" | "B" | null;
  /** Dati per la UI di spiegazione e la telecronaca (che cosa è successo e perché). */
  dettaglio?: { shift?: number; famiglia: AzioneId; counter: "A" | "B" | null; mossa?: MossaRef; mossaAvv?: MossaRef | null };
}

/** Applica un'azione di un lato. L'azione si risolve CONTRO la postura (stance)
 *  dell'altro lato: è la matrice di counter che rende leggibile il duello.
 *  `opts.mossa` è la variante-mossa dell'azione (data/mosse.ts): senza di essa
 *  tutti i default riproducono il comportamento storico. */
export function applyAzione(side: "p" | "o", azione: AzioneId, st: SpintaState, A: Spintatore, B: Spintatore, opts?: { mossa?: MossaRef; terrain?: TerrainEffect }): TurnResult {
  const s: SpintaState = { ...st };
  if (s.calmaO === undefined) s.calmaO = 80;
  s.turno = (st.turno ?? 0) + 1;
  const dir = side === "p" ? 1 : -1;
  const myCalma = side === "p" ? s.calma : (s.calmaO ?? 80);
  const agitata = myCalma < 35;
  const setMyCalma = (v: number) => { if (side === "p") s.calma = clamp(v, 0, 100); else s.calmaO = clamp(v, 0, 100); };
  const addMyFiato = (d: number) => {
    if (side === "p") s.fiatoP = Math.min(A.fiatoMax, s.fiatoP + d);
    else s.fiatoO = Math.min(A.fiatoMax, s.fiatoO + d);
  };
  // effetto sull'avversaria (mosse che innervosiscono: la calma è dell'ALTRA)
  const addAvvCalma = (d: number) => {
    if (side === "p") s.calmaO = clamp((s.calmaO ?? 80) + d, 0, 100);
    else s.calma = clamp(s.calma + d, 0, 100);
  };
  const varia = () => 1 + (rand(s) * 2 - 1) * (agitata ? 0.16 : 0.08);
  const stanceAvv = side === "p" ? s.stanceO : s.stanceP;
  // i mods della MIA mossa e della POSTURA avversaria in campo
  const mods = opts?.mossa?.mods ?? {};
  const stanceMossaAvv = (side === "p" ? s.stanceMossaO : s.stanceMossaP) ?? null;
  const stanceMods = stanceMossaAvv?.mods ?? {};
  // effetto di TERRENO (S16): simmetrico, si applica a CHIUNQUE esegua l'azione.
  // opts.terrain vince se passato esplicitamente, altrimenti persiste dallo stato (initSpinta).
  const terrain = opts?.terrain ?? s.terrain;
  const tmod = terrain ? TERRAIN_MODS[terrain] : undefined;
  let log = "";
  let counter: "A" | "B" | null = null;
  let shiftOut: number | undefined;

  if (azione === "incalza") {
    let shift = pushGain(A, B) * varia() * (agitata ? 0.75 : 1) * (mods.spintaMult ?? 1) * (tmod?.incalzaMult ?? 1);
    if (stanceAvv === "reggi") {
      // si spegne sulla postura piantata: l'avversaria contro-guadagna terreno
      shift = shift * (stanceMods.reggiAssorbi ?? 0.4) * (tmod?.reggiAssorbiMult ?? 1)
        - ((stanceMods.reggiRimbalzo ?? 2.5) + (tmod?.reggiRimbalzoAdd ?? 0));
      counter = "B";
      log = `${B.name} regge l'urto: ${A.name} si spegne sulla presa piantata.`;
    } else if (stanceAvv === "incoraggia") {
      shift *= 1.25; counter = "A";
      log = `${A.name} incalza mentre ${B.name} riprendeva fiato: terreno guadagnato!`;
    } else if (stanceAvv === "gira") {
      shift *= 1.15; counter = "A";
      log = `${A.name} incalza frontale e chiude il giro di ${B.name}.`;
    } else {
      log = `${A.name} incalza a fronti opposti${agitata ? " (ma è nervosa)" : ""}.`;
    }
    s.barra = clamp(s.barra + dir * shift, 0, 100);
    shiftOut = shift;
    setMyCalma(myCalma - 10 * (tmod?.calmaCaloMult ?? 1) + (mods.calmaDelta ?? 0));
    addMyFiato(-FIATO_INCALZA + (mods.fiatoDelta ?? 0));
  } else if (azione === "reggi") {
    setMyCalma(myCalma + 5 * (tmod?.calmaRecupMult ?? 1) + (mods.calmaDelta ?? 0));
    addMyFiato(FIATO_RECUP * (tmod?.fiatoRecupMult ?? 1) + (mods.fiatoDelta ?? 0));
    log = `${A.name} pianta gli zoccoli e regge la posizione.`;
  } else if (azione === "gira") {
    let shift = giraGain(A, B) * varia() * (agitata ? 0.85 : 1) * (mods.spintaMult ?? 1);
    if (stanceAvv === "reggi") {
      shift *= (stanceMods.reggiEsposizioneGira ?? 1.35); counter = "A";
      log = `${A.name} aggira la presa piantata di ${B.name}: leva di fianco!`;
    } else if (stanceAvv === "incalza") {
      // il counter frontale che subisci non è amplificato dalla tua variante
      shift = -pushGain(B, A) * 0.5;
      counter = "B";
      log = `${A.name} cerca il fianco ma ${B.name} la travolge frontale.`;
    } else if (stanceAvv === "incoraggia") {
      shift *= 1.1; counter = "A";
      log = `${A.name} gira di leno mentre ${B.name} rifiata.`;
    } else {
      log = `${A.name} gira di leno cercando la leva.`;
    }
    s.barra = clamp(s.barra + dir * shift, 0, 100);
    shiftOut = shift;
    setMyCalma(myCalma - 4 * (tmod?.calmaCaloMult ?? 1) + (mods.calmaDelta ?? 0));
    addMyFiato(-FIATO_GIRA + (mods.fiatoDelta ?? 0));
  } else {
    // incoraggia: recupero pieno se l'avversaria non sta attaccando
    const sottoAttacco = stanceAvv === "incalza" || stanceAvv === "gira";
    const rec = mods.recuperoMult ?? 1;
    setMyCalma(myCalma + (sottoAttacco ? 8 : 14) * rec * (tmod?.calmaRecupMult ?? 1) + (mods.calmaDelta ?? 0));
    addMyFiato((sottoAttacco ? 8 : FIATO_INCOR) * rec * (tmod?.fiatoRecupMult ?? 1) + (mods.fiatoDelta ?? 0));
    s.barra = clamp(s.barra - dir * (mods.barraCost ?? 4), 0, 100);
    log = `${A.name} viene incoraggiata: ritrova calma e fiato${sottoAttacco ? " (sotto pressione)" : ""}.`;
  }

  // effetti "di carattere" della mossa: innervosire l'avversaria, confonderla
  if (mods.calmaAvv) addAvvCalma(-mods.calmaAvv);
  if (mods.scrambleTell) { if (side === "p") s.confusaO = true; else s.confusaP = true; }

  // la mia azione diventa la mia postura in campo (con la sua mossa)
  if (side === "p") { s.stanceP = azione; s.stanceMossaP = opts?.mossa ?? null; }
  else { s.stanceO = azione; s.stanceMossaO = opts?.mossa ?? null; }

  // esiti
  if (s.barra >= 100) s.esito = "vinto";
  else if (s.barra <= 0) s.esito = "perso";
  else if (s.fiatoO <= 0) s.esito = "vinto";
  else if (s.fiatoP <= 0) s.esito = "perso";
  // Giudizio di condotta: al limite delle azioni vince chi ha CONDOTTO meglio —
  // terreno + riserva di fiato + calma. «Conduce ma non forza» in formula.
  else if ((s.turno ?? 0) >= MAX_TURNI) {
    const score = s.barra + (s.fiatoP - s.fiatoO) * 0.30 + (s.calma - (s.calmaO ?? 80)) * 0.25;
    s.esito = score >= 50 ? "vinto" : "perso";
  }

  // dopo il turno dell'avversaria (e a duello vivo) prepara la prossima intenzione + tell
  if (side === "o" && s.esito === "corso") prepareIntent(s, A, B);

  return {
    state: s, log, nervosa: agitata, counter,
    dettaglio: { shift: shiftOut, famiglia: azione, counter, mossa: opts?.mossa, mossaAvv: stanceMossaAvv },
  };
}

/** Sceglie la prossima intenzione dell'avversaria secondo l'indole, e genera il
 *  tell mostrato al giocatore (veritiero con probabilità = tellAccuracy). */
export function prepareIntent(s: SpintaState, _o?: Spintatore, _p?: Spintatore): void {
  const pers = s.personalita ?? "focosa";
  const r = rand(s);
  const TUTTE: AzioneId[] = ["incalza", "reggi", "gira", "incoraggia"];
  let intent: AzioneId;

  if (s.confusaO) {
    // confusa da una finta: la prossima scelta ignora guardie e indole
    intent = TUTTE[Math.floor(rand(s) * 4)];
    s.confusaO = false;
  }
  // guardie di buon senso (valgono per tutte le indoli)
  else if (s.fiatoO < 25) intent = r < 0.7 ? "incoraggia" : "reggi";
  else if ((s.calmaO ?? 80) < 28 && r < 0.6) intent = "incoraggia";
  // se il giocatore si è appena piantato due volte, l'astuta/paziente lo aggira
  else if (s.stanceP === "reggi" && (pers === "astuta" || pers === "paziente") && r < 0.6) intent = "gira";
  else if (s.barra > 72 && r < 0.5) intent = "incalza"; // sta perdendo male: forza
  else {
    const W: Record<Personalita, [number, number, number, number]> = {
      // [incalza, reggi, gira, incoraggia]
      focosa:   [0.62, 0.12, 0.18, 0.08],
      paziente: [0.22, 0.38, 0.20, 0.20],
      astuta:   [0.30, 0.22, 0.38, 0.10],
      nervosa:  [0.30, 0.25, 0.25, 0.20],
    };
    const w = W[pers];
    const x = rand(s);
    intent = x < w[0] ? "incalza" : x < w[0] + w[1] ? "reggi" : x < w[0] + w[1] + w[2] ? "gira" : "incoraggia";
  }

  s.intentO = intent;
  // tell: veritiero con probabilità tellAccuracy, altrimenti fuorviante
  const truthful = rand(s) < (s.tellAccuracy ?? 0.75);
  let shownAction: AzioneId = truthful
    ? intent
    : TUTTE.filter((a) => a !== intent)[Math.floor(rand(s) * 3)];
  if (s.confusaP) {
    // la finta avversaria ha confuso la lettura: il tell mostrato è casuale
    shownAction = TUTTE[Math.floor(rand(s) * 4)];
    s.confusaP = false;
  }
  s.tellAzione = shownAction;
  const variants = TELLS[shownAction];
  s.tell = variants[Math.floor(rand(s) * variants.length)];
}

/** Forza l'intenzione dell'avversaria con tell veritiero (bataille-lezione di Mémé). */
export function forzaIntento(s: SpintaState, azione: AzioneId): void {
  s.intentO = azione;
  s.tellAzione = azione;
  const variants = TELLS[azione];
  s.tell = variants[Math.floor(rand(s) * variants.length)];
}

/** L'azione che l'avversaria esegue è quella telegrafata (il tell può aver
 *  ingannato il giocatore, ma l'animale fa ciò che aveva in testa). */
export function pickAzioneAvversaria(st: SpintaState, _o: Spintatore, _p: Spintatore): AzioneId {
  return st.intentO ?? "incalza";
}
