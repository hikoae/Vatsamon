import type { Rarita } from "../data/types";

export const RARITA_COLORS: Record<Rarita, string> = {
  Comune: "#9ca3af",
  "Non comune": "#16a34a",
  Rara: "#3b82f6",
  Epica: "#a855f7",
  Leggendaria: "#f59e0b",
};

export const RARITA_ORDER: Rarita[] = [
  "Leggendaria",
  "Epica",
  "Rara",
  "Non comune",
  "Comune",
];

export function rarityColor(r: Rarita): string {
  return RARITA_COLORS[r] ?? "#9ca3af";
}

export function stelle(n: number): string {
  return "★".repeat(Math.max(0, n)) + "☆".repeat(Math.max(0, 5 - n));
}
