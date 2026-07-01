/**
 * ECONOMIA — MVP a 2 valute (coerente con il mondo Batailles de Reines).
 *
 *  • DENARI D'ALPEGGIO (soft, `trainer.coins`, 🪙): si guadagnano camminando,
 *    nelle casere, nelle sfide; si spendono in campanacci, cure e oggetti.
 *  • FORME DI FONTINA (prestigio, `trainer.fontina`, 🧀): rare. Si guadagnano
 *    vincendo le Leghe delle Reines e portando i moudzon fino a Reina; si
 *    spendono in riconoscimenti permanenti (Stelle di Pedigree alla Désarpa).
 *
 * Ogni valuta ha sink raggiungibili presto: i Denari nel negozio/cure, la
 * Fontina nella Stella di Pedigree (prima Stella ottenibile in pochi giorni).
 */

export interface Valuta {
  id: "denari" | "fontina";
  nome: string;
  nomeFr: string;
  emoji: string;
  colore: string;
  campo: "coins" | "fontina";
  desc: string;
  descFr: string;
}

export const VALUTE: Record<Valuta["id"], Valuta> = {
  denari: {
    id: "denari", nome: "Denari d'Alpeggio", nomeFr: "Deniers d'alpage", emoji: "🪙", colore: "#fbbf24", campo: "coins",
    desc: "Moneta di tutti i giorni: cammino, casere, sfide.", descFr: "Monnaie de tous les jours : marche, fruitières, défis.",
  },
  fontina: {
    id: "fontina", nome: "Forme di Fontina", nomeFr: "Meules de Fontina", emoji: "🧀", colore: "#e0b15e", campo: "fontina",
    desc: "Prestigio: vinci le Leghe e fai crescere le Reines.", descFr: "Prestige : gagne les Ligues et élève tes Reines.",
  },
};

/** Quante Forme di Fontina rende ogni traguardo di prestigio. */
export const FONTINA_REWARD = {
  legaConquistata: 2,   // vincere una Lega delle Reines (dungeon)
  reinaCresciuta: 1,    // un moudzon di stalla diventa Reina adulta
  percorsoCompletato: 1, // completare un grande percorso d'alta quota
} as const;

/** Costo (in Forme di Fontina) della prossima Stella di Pedigree.
 *  Sale dolcemente: 3, 5, 7, 9, … (la prima è raggiungibile in pochi giorni). */
export function costoStellaPedigree(stellePossedute: number): number {
  return 3 + stellePossedute * 2;
}

/** Bonus di prestigio permanente per Stella (flavor + leggero, cap a 10 stelle). */
export const PEDIGREE_STAR_BONUS_PCT = 2; // +2% cad. (cap +20%)
export const PEDIGREE_STAR_CAP = 10;
