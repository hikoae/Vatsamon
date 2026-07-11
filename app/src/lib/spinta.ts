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
  intentO?: AzioneId;       // intenzione telegrafata dell'avversaria
  tell?: string;            // il tell mostrato (può ingannare)
  turno?: number;
  personalita?: Personalita;
  tellAccuracy?: number;    // 0..1, dal Rispetto del giocatore
  esito: "corso" | "vinto" | "perso";
}

/** Oltre questo numero di azioni il duello si risolve al giudizio di condotta. */
export const MAX_TURNI = 16;

/** Ingaggio: chi ha più presa parte leggermente avanti. */
export function initSpinta(
  p: Spintatore,
  o: Spintatore,
  opts?: { personalita?: Personalita; tellAccuracy?: number },
): SpintaState {
  const barra = clamp(50 + (p.presa - o.presa) / 4, 30, 70);
  const st: SpintaState = {
    barra, fiatoP: p.fiatoMax, fiatoO: o.fiatoMax, calma: 80, calmaO: 80,
    stanceP: null, stanceO: null, turno: 0,
    personalita: opts?.personalita ?? "focosa",
    tellAccuracy: opts?.tellAccuracy ?? 0.75,
    esito: "corso",
  };
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

export interface TurnResult { state: SpintaState; log: string; nervosa: boolean; counter: "A" | "B" | null }

/** Applica un'azione di un lato. L'azione si risolve CONTRO la postura (stance)
 *  dell'altro lato: è la matrice di counter che rende leggibile il duello. */
export function applyAzione(side: "p" | "o", azione: AzioneId, st: SpintaState, A: Spintatore, B: Spintatore): TurnResult {
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
  const varia = () => 1 + (Math.random() * 2 - 1) * (agitata ? 0.16 : 0.08);
  const stanceAvv = side === "p" ? s.stanceO : s.stanceP;
  let log = "";
  let counter: "A" | "B" | null = null;

  if (azione === "incalza") {
    let shift = pushGain(A, B) * varia() * (agitata ? 0.75 : 1);
    if (stanceAvv === "reggi") {
      // si spegne sulla postura piantata: l'avversaria contro-guadagna terreno
      shift = shift * 0.4 - 2.5;
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
    setMyCalma(myCalma - 10);
    addMyFiato(-FIATO_INCALZA);
  } else if (azione === "reggi") {
    setMyCalma(myCalma + 5);
    addMyFiato(FIATO_RECUP);
    log = `${A.name} pianta gli zoccoli e regge la posizione.`;
  } else if (azione === "gira") {
    let shift = giraGain(A, B) * varia() * (agitata ? 0.85 : 1);
    if (stanceAvv === "reggi") {
      shift *= 1.35; counter = "A";
      log = `${A.name} aggira la presa piantata di ${B.name}: leva di fianco!`;
    } else if (stanceAvv === "incalza") {
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
    setMyCalma(myCalma - 4);
    addMyFiato(-FIATO_GIRA);
  } else {
    // incoraggia: recupero pieno se l'avversaria non sta attaccando
    const sottoAttacco = stanceAvv === "incalza" || stanceAvv === "gira";
    setMyCalma(myCalma + (sottoAttacco ? 8 : 14));
    addMyFiato(sottoAttacco ? 8 : FIATO_INCOR);
    s.barra = clamp(s.barra - dir * 4, 0, 100);
    log = `${A.name} viene incoraggiata: ritrova calma e fiato${sottoAttacco ? " (sotto pressione)" : ""}.`;
  }

  // la mia azione diventa la mia postura in campo
  if (side === "p") s.stanceP = azione; else s.stanceO = azione;

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

  return { state: s, log, nervosa: agitata, counter };
}

/** Sceglie la prossima intenzione dell'avversaria secondo l'indole, e genera il
 *  tell mostrato al giocatore (veritiero con probabilità = tellAccuracy). */
export function prepareIntent(s: SpintaState, _o?: Spintatore, _p?: Spintatore): void {
  const pers = s.personalita ?? "focosa";
  const r = Math.random();
  let intent: AzioneId;

  // guardie di buon senso (valgono per tutte le indoli)
  if (s.fiatoO < 25) intent = r < 0.7 ? "incoraggia" : "reggi";
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
    const x = Math.random();
    intent = x < w[0] ? "incalza" : x < w[0] + w[1] ? "reggi" : x < w[0] + w[1] + w[2] ? "gira" : "incoraggia";
  }

  s.intentO = intent;
  // tell: veritiero con probabilità tellAccuracy, altrimenti fuorviante
  const truthful = Math.random() < (s.tellAccuracy ?? 0.75);
  const shownAction: AzioneId = truthful
    ? intent
    : (["incalza", "reggi", "gira", "incoraggia"] as AzioneId[]).filter((a) => a !== intent)[Math.floor(Math.random() * 3)];
  const variants = TELLS[shownAction];
  s.tell = variants[Math.floor(Math.random() * variants.length)];
}

/** L'azione che l'avversaria esegue è quella telegrafata (il tell può aver
 *  ingannato il giocatore, ma l'animale fa ciò che aveva in testa). */
export function pickAzioneAvversaria(st: SpintaState, _o: Spintatore, _p: Spintatore): AzioneId {
  return st.intentO ?? "incalza";
}
