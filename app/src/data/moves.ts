import { Vazzamon } from "../types";

/**
 * Le 4 mosse "firma" delle Reines, in stile carta Pokémon.
 * I valori (danno/cura/buff) sono derivati dalle statistiche REALI della bovina
 * (stats4: stazza/corna/testa/grinta), con fallback alle 3 stat di gioco.
 * Stesse mosse usate dall'Arena a turni (ArenaBattle) per coerenza.
 */
export type MoveKind = "attacco" | "difesa" | "cura" | "speciale";

export interface CowMove {
  id: "testata" | "corno" | "latte" | "incornata";
  name: string;
  emoji: string;
  kind: MoveKind;
  /** Valore principale: danno (attacco/speciale), HP curati (cura), % difesa (difesa). */
  value: number;
  /** Unità del valore, per la UI ("DMG", "HP", "+%DIF"). */
  unit: string;
  desc: string;
  /** La speciale richiede la barra energia carica. */
  requiresEnergy?: boolean;
}

function s4(cow: Vazzamon) {
  const f = cow.stats4;
  return {
    stazza: f ? f.stazza : cow.stats.defense,
    corna: f ? f.corna : cow.stats.strength,
    testa: f ? f.testa : cow.stats.defense,
    grinta: f ? f.grinta : cow.stats.agility,
  };
}

/** Calcola le 4 mosse disponibili per una specifica Reina. */
export function cowMoves(cow: Vazzamon): CowMove[] {
  const { stazza, corna, testa, grinta } = s4(cow);
  return [
    {
      id: "testata",
      name: "Testata d'Alta Quota",
      emoji: "💥",
      kind: "attacco",
      value: Math.round(16 + corna * 0.18),
      unit: "DMG",
      desc: "Spinta frontale affidabile. Carica l'energia per la Suprema.",
    },
    {
      id: "corno",
      name: "Corno Protettivo",
      emoji: "🛡️",
      kind: "difesa",
      value: 35,
      unit: "+%DIF",
      desc: "Pianta gli zoccoli: alza la difesa e dimezza i colpi in arrivo.",
    },
    {
      id: "latte",
      name: "Sorso di Latte",
      emoji: "🍼",
      kind: "cura",
      value: Math.round(55 + grinta * 0.4),
      unit: "HP",
      desc: "Rigenera HP con purezza alpina (usi limitati in battaglia).",
    },
    {
      id: "incornata",
      name: "Incornata Suprema",
      emoji: "🔱",
      kind: "speciale",
      value: Math.round((26 + corna * 0.25 + stazza * 0.15) * 2.3),
      unit: "DMG",
      desc: "Colpo devastante: richiede la barra Adrenalina carica.",
      requiresEnergy: true,
    },
  ];
}

export const MOVE_KIND_STYLE: Record<MoveKind, string> = {
  attacco: "bg-rose-950/50 border-rose-700/50 text-rose-300",
  difesa: "bg-blue-950/50 border-blue-700/50 text-blue-300",
  cura: "bg-emerald-950/50 border-emerald-700/50 text-emerald-300",
  speciale: "bg-amber-950/50 border-amber-700/50 text-amber-300",
};
