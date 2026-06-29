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

/** Colore/etichetta del Punteggio Rispetto (0..100) per l'HUD.
 *  Alto = verde (esploratore modello), basso = rosso (poco rispettoso). */
export function respectTone(score: number): { color: string; label: string } {
  if (score >= 80) return { color: "#10b981", label: "Esemplare" };
  if (score >= 60) return { color: "#22c55e", label: "Buono" };
  if (score >= 40) return { color: "#eab308", label: "Discreto" };
  if (score >= 20) return { color: "#f97316", label: "Scarso" };
  return { color: "#ef4444", label: "Critico" };
}

/** Anello colorato di difficoltà (verde→rosso) come il cerchio target di Pokémon GO. */
export function catchDifficulty(p: number): { color: string; label: string } {
  if (p >= 1)    return { color: "#10b981", label: "GARANTITA" };
  if (p >= 0.6)  return { color: "#22c55e", label: "FACILE" };
  if (p >= 0.35) return { color: "#eab308", label: "MEDIA" };
  if (p >= 0.15) return { color: "#f97316", label: "DIFFICILE" };
  return { color: "#ef4444", label: "ARDUA" };
}
