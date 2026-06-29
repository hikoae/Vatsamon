import { Vatsamon } from "../types";
import { Fighter } from "./battle";

/**
 * "LA SPINTA" — motore di combattimento INCRUENTO delle Batailles de Reines.
 * Niente HP, niente tipi, niente danni: una BARRA DI SPINTA contesa (0..100,
 * parte a 50). Tre leve reali: MASSA (peso/stazza = forza statica), PRESA
 * (corna a corna limate = leva), VOLONTÀ (grinta = riserva di FIATO). Vince chi
 * porta la barra a 100 (l'avversaria "gira la testa e si ritira") o chi resta
 * con l'avversaria senza FIATO. La CALMA rende meccanica l'etica: forzare
 * (Incalza ripetuto) innervosisce e PEGGIORA; Incoraggia/Reggi calmano.
 */

export interface Spintatore {
  name: string;
  breed: string;
  massa: number;    // forza statica (regge la posizione)
  presa: number;    // leva di corna (chi "incastra")
  volonta: number;  // testa/grinta → spinta attiva
  fiatoMax: number; // 100 + volonta
  visual: Pick<Vatsamon, "breed" | "rarity" | "realPhoto" | "name">;
}

function clamp(n: number, lo = 1, hi = 100) { return Math.max(lo, Math.min(hi, Math.round(n))); }

/** Deriva uno Spintatore da un Fighter esistente (riusa la logica avversari/boss). */
export function spintatoreFromFighter(f: Fighter): Spintatore {
  const massa = clamp(f.def);
  const presa = clamp(f.atk);
  const volonta = clamp(f.agi);
  return { name: f.name, breed: f.breed, massa, presa, volonta, fiatoMax: 100 + volonta, visual: f.visual };
}

export type AzioneId = "incalza" | "reggi" | "gira" | "incoraggia";

export interface Azione { id: AzioneId; label: string; emoji: string; desc: string }
export const AZIONI: Azione[] = [
  { id: "incalza", label: "Incalza", emoji: "🐂", desc: "Spinta decisa a fronti opposti: guadagni terreno ma consumi molto fiato." },
  { id: "reggi", label: "Reggi", emoji: "🛡️", desc: "Pianti gli zoccoli: l'avversaria guadagna metà terreno e recuperi fiato." },
  { id: "gira", label: "Gira di leno", emoji: "🌀", desc: "Sfrutti la presa di corna: se hai più presa, ribalti la leva." },
  { id: "incoraggia", label: "Incoraggia", emoji: "💚", desc: "Conduci con calma: recuperi fiato e calma, cedi un filo di terreno." },
];

export interface SpintaState {
  barra: number;     // 0..100, >50 = vantaggio giocatore
  fiatoP: number;
  fiatoO: number;
  calma: number;     // 0..100 (Reina del giocatore)
  calmaO?: number;   // 0..100 (Reina avversaria) — anche lei si innervosisce se forzata
  reggiP: boolean;   // il giocatore regge (dimezza il prossimo guadagno avversario)
  reggiO: boolean;
  turno?: number;    // contatore azioni (per la risoluzione a tempo)
  esito: "corso" | "vinto" | "perso";
}

/** Oltre questo numero di azioni il duello si risolve: vince chi guida la spinta.
 *  Garantisce che ogni scontro termini sempre (niente stalli infiniti). */
export const MAX_TURNI = 16;

/** Ingaggio iniziale: chi ha più presa parte leggermente avanti (max ±12). */
export function initSpinta(p: Spintatore, o: Spintatore): SpintaState {
  const barra = clamp(50 + (p.presa - o.presa) / 4, 30, 70);
  return { barra, fiatoP: p.fiatoMax, fiatoO: o.fiatoMax, calma: 80, calmaO: 80, reggiP: false, reggiO: false, turno: 0, esito: "corso" };
}

const FIATO_INCALZA = 22, FIATO_GIRA = 14, FIATO_RECUP = 10, FIATO_INCOR = 14;

export interface TurnResult { state: SpintaState; log: string; nervosa: boolean }

/** Applica un'azione di un lato (p = giocatore, o = avversaria) mutando una copia. */
export function applyAzione(side: "p" | "o", azione: AzioneId, st: SpintaState, A: Spintatore, B: Spintatore): TurnResult {
  const s: SpintaState = { ...st };
  if (s.calmaO === undefined) s.calmaO = 80;
  s.turno = (st.turno ?? 0) + 1;
  const dir = side === "p" ? 1 : -1;
  // La CALMA vale per ENTRAMBE le Reines: chi forza troppo (Incalza ripetuto) si
  // innervosisce e perde efficacia. Così l'IA che martella la spinta si sfianca
  // da sola e una condotta paziente la batte: "conduci, non forzare".
  const myCalma = side === "p" ? s.calma : (s.calmaO ?? 80);
  const agitata = myCalma < 35;
  const setMyCalma = (v: number) => { if (side === "p") s.calma = clamp(v, 0, 100); else s.calmaO = clamp(v, 0, 100); };
  const varia = () => 1 + (Math.random() * 2 - 1) * (agitata ? 0.16 : 0.08);
  const reggeAvv = side === "p" ? s.reggiO : s.reggiP;
  let log = "";

  if (azione === "incalza") {
    let shift = ((A.massa * 0.6 + A.volonta * 0.4) - B.massa * 0.55) / 4.6;
    shift = Math.max(3.5, shift) * varia() * (agitata ? 0.78 : 1);
    if (reggeAvv) shift *= 0.5;
    s.barra = clamp(s.barra + dir * shift, 0, 100);
    setMyCalma(myCalma - 12);
    if (side === "p") { s.fiatoP -= FIATO_INCALZA; s.reggiO = false; }
    else { s.fiatoO -= FIATO_INCALZA; s.reggiP = false; }
    log = `${A.name} incalza e guadagna terreno${agitata ? " (ma è nervosa)" : ""}.`;
  } else if (azione === "reggi") {
    setMyCalma(myCalma + 6);
    if (side === "p") { s.reggiP = true; s.fiatoP = Math.min(A.fiatoMax, s.fiatoP + FIATO_RECUP); }
    else { s.reggiO = true; s.fiatoO = Math.min(A.fiatoMax, s.fiatoO + FIATO_RECUP); }
    log = `${A.name} regge la posizione e riprende fiato.`;
  } else if (azione === "gira") {
    const vantaggio = A.presa - B.presa;
    let shift = vantaggio > 0 ? (8 + vantaggio / 5) : 3;
    shift = shift * varia() * (agitata ? 0.85 : 1);
    if (reggeAvv) shift *= 0.5;
    s.barra = clamp(s.barra + dir * shift, 0, 100);
    setMyCalma(myCalma - 4);
    if (side === "p") { s.fiatoP -= FIATO_GIRA; s.reggiO = false; }
    else { s.fiatoO -= FIATO_GIRA; s.reggiP = false; }
    log = vantaggio > 0 ? `${A.name} gira di leno e ribalta la leva delle corna!` : `${A.name} prova la leva ma non ha la presa.`;
  } else {
    setMyCalma(myCalma + 14);
    if (side === "p") { s.fiatoP = Math.min(A.fiatoMax, s.fiatoP + FIATO_INCOR); }
    else { s.fiatoO = Math.min(A.fiatoMax, s.fiatoO + FIATO_INCOR); }
    s.barra = clamp(s.barra - dir * 5, 0, 100);
    log = `${A.name} viene incoraggiata: ritrova calma e fiato.`;
  }

  // esiti
  if (s.barra >= 100) s.esito = "vinto";
  else if (s.barra <= 0) s.esito = "perso";
  else if (s.fiatoO <= 0) s.esito = "vinto";
  else if (s.fiatoP <= 0) s.esito = "perso";
  // risoluzione a tempo: oltre MAX_TURNI decide chi conduce meglio la spinta.
  // Conta il terreno (barra) PIÙ la riserva di fiato: chi ha gestito la corsa
  // senza sfiancare la Reina (Reggi/Incoraggia) la spunta sui pari. Premia la
  // condotta paziente — "conduci, non forzare" — e garantisce sempre un esito.
  else if ((s.turno ?? 0) >= MAX_TURNI) {
    const score = s.barra + (s.fiatoP - s.fiatoO) * 0.15 + (s.calma - (s.calmaO ?? 80)) * 0.12;
    s.esito = score >= 50 ? "vinto" : "perso";
  }

  return { state: s, log, nervosa: agitata };
}

/** IA avversaria: sceglie un'azione sensata. Tende a forzare (Incalza): è la sua
 *  natura, ma così si innervosisce — un allevatore paziente la spunta. */
export function pickAzioneAvversaria(st: SpintaState, o: Spintatore, p: Spintatore): AzioneId {
  if (st.fiatoO < 25) return "reggi"; // a corto di fiato: recupera
  if ((st.calmaO ?? 80) < 28 && Math.random() < 0.5) return "incoraggia"; // troppo nervosa: si ricompone (a volte)
  if (o.presa > p.presa + 8 && Math.random() < 0.45) return "gira"; // sfrutta la presa
  if (st.barra > 62 && Math.random() < 0.3) return "reggi"; // sta perdendo terreno: consolida
  return Math.random() < 0.8 ? "incalza" : "gira";
}
