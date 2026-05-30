import type { Rarita } from "../data/types";

export const RARITA_COLORS: Record<Rarita, string> = {
  Comune: "#7c8a82",
  "Non comune": "#16a34a",
  Rara: "#2b7fff",
  Epica: "#a855f7",
  Leggendaria: "#e0a82e",
};

export function rarityColor(r: Rarita): string {
  return RARITA_COLORS[r] ?? "#7c8a82";
}

export function stelle(n: number): string {
  return "★".repeat(Math.max(0, n)) + "☆".repeat(Math.max(0, 5 - n));
}
