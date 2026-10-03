import { RarityType } from "../types";
import { BALL_META } from "../data/overworld";

/** Tasso di cattura base per rarità (prima di ball / mela / precisione del lancio). */
export const BASE_CATCH: Record<RarityType, number> = {
  Comune: 0.45, Rara: 0.30, Epica: 0.18, Leggendaria: 0.09,
};

/** Stima "a riposo" del tasso di cattura (ball + mela, precisione media) → 0..1.
 *  Mostrata in anticipo per far capire quanto sarà facile, in stile Pokémon GO. */
export function estimateCatch(rarity: RarityType | undefined, ballId: string, fedApple: boolean): number {
  const meta = BALL_META[ballId];
  if (meta && meta.mult === null) return 1;
  let p = BASE_CATCH[rarity ?? "Comune"];
  p *= meta?.mult ?? 1;
  if (fedApple) p *= 1.5;
  return Math.max(0, Math.min(1, p));
}

/** SCALA D'ESITO "bene → male" in cinque gradini, condivisa da `respectTone()`
 *  e `catchDifficulty()` (avevano la stessa sequenza duplicata: una sola fonte
 *  evita che divergano al prossimo ritocco).
 *
 *  PERCHÉ QUESTI VALORI. I precedenti (#10b981 / #22c55e / #eab308 / #f97316 /
 *  #ef4444) erano scelti quando il fondo dell'app era scuro: sulle superfici
 *  chiare di oggi come TESTO non passano AA. Qui sono sostituiti dai token già
 *  corretti di index.css:
 *    ottimo   = --color-positive     #05603a   (misurato 5,95:1)
 *    buono    = --color-emerald-200  #08613f   (misurato 5,84:1)
 *    medio    = --color-slate-300    #423a64   (misurato 7,97:1) — inchiostro
 *                                     neutro: l'ambra, che sarebbe la scelta
 *                                     "semaforo", il contratto UI la riserva a
 *                                     valuta e ricompensa
 *    scarso   = --color-rose-200     #99162f   (misurato 6,35:1)
 *    pessimo  = --color-rose-100     #7a1228   (misurato 8,12:1)
 *  I due verdi sono volutamente vicini: è tutto lo spazio che resta se si vuole
 *  restare sui token e passare AA anche sul velo (sotto). Il gradino lo dice
 *  comunque l'etichetta — GARANTITA / FACILE, Esemplare / Buono.
 *  Scartato --color-emerald-300 (#0a7d54): sul velo del riquadro di cattura
 *  misura 4,09:1, sotto la soglia.
 *
 *  PERCHÉ RESTANO HEX LETTERALI E NON `var(--color-…)`. I chiamanti compongono
 *  l'alfa concatenando la stringa (`color + "1a"` nel riquadro di cattura,
 *  `color + "66"` sui bordi dell'HUD): con una `var()` verrebbe fuori CSS non
 *  valido. Sono quindi un MIRROR dei token: se index.css cambia quei valori, si
 *  aggiornano anche qui.
 *
 *  DOPPIO RUOLO. Ogni gradino finisce sia come testo, sia come bordo, sia come
 *  velo di fondo al 10% (`+ "1a"`), sia come pallino pieno. Un solo valore regge
 *  tutti e quattro perché è scuro: come testo su chiaro dà contrasto alto, e al
 *  10% su chiaro resta un velo chiaro. Se un domani servisse un FONDO PIENO,
 *  quel gradino va accoppiato a un inchiostro chiaro (come fa `--color-primary`
 *  con `--color-primary-ink`), non usato così com'è. */
const SCALA_ESITO = ["#05603a", "#08613f", "#423a64", "#99162f", "#7a1228"] as const;

/** Colore/etichetta del Punteggio Rispetto (0..100) per l'HUD.
 *  Alto = verde (esploratore modello), basso = rosso (poco rispettoso). */
export function respectTone(score: number): { color: string; label: string } {
  if (score >= 80) return { color: SCALA_ESITO[0], label: "Esemplare" };
  if (score >= 60) return { color: SCALA_ESITO[1], label: "Buono" };
  if (score >= 40) return { color: SCALA_ESITO[2], label: "Discreto" };
  if (score >= 20) return { color: SCALA_ESITO[3], label: "Scarso" };
  return { color: SCALA_ESITO[4], label: "Critico" };
}

/** Anello colorato di difficoltà (verde→rosso) come il cerchio target di Pokémon GO. */
export function catchDifficulty(p: number): { color: string; label: string } {
  if (p >= 1)    return { color: SCALA_ESITO[0], label: "GARANTITA" };
  if (p >= 0.6)  return { color: SCALA_ESITO[1], label: "FACILE" };
  if (p >= 0.35) return { color: SCALA_ESITO[2], label: "MEDIA" };
  if (p >= 0.15) return { color: SCALA_ESITO[3], label: "DIFFICILE" };
  return { color: SCALA_ESITO[4], label: "ARDUA" };
}
