/**
 * LA STADERA — pesa e categorie per fase (dossier §3, tabella verificata).
 *
 * Le soglie NON sono fisse: salgono di fase in fase durante la stagione
 * (le bovine crescono di peso), fino alla finale (≥631 / 581–630 / ≤580 kg).
 * Regola del dossier §0.3: mai mostrare una categoria senza etichetta di fase.
 * Qui vivono i numeri; le stringhe descrittive per l'hub sono in
 * season.SOGLIE_PER_FASE (stessa fonte, doppia vista).
 */
import { FaseId } from "./fase";

/** Fase di gara ai fini della pesa (granularità della tabella ufficiale). */
export type FaseGara = "primavera" | "estate" | "autunno" | "autunno-finale" | "finale";

export type CategoriaId = "1ª" | "2ª" | "3ª";

export interface SogliePesa {
  fase: FaseGara;
  label: string;    // etichetta di fase OBBLIGATORIA accanto alla categoria
  labelFr: string;
  min1: number;     // peso minimo 1ª categoria (kg)
  min2: number;     // peso minimo 2ª categoria (kg); sotto → 3ª
}

export const SOGLIE_PESA: Record<FaseGara, SogliePesa> = {
  "primavera":      { fase: "primavera",      label: "eliminatorie primaverili",      labelFr: "éliminatoires de printemps",   min1: 571, min2: 521 },
  "estate":         { fase: "estate",         label: "eliminatorie estive",           labelFr: "éliminatoires d'été",          min1: 591, min2: 541 },
  "autunno":        { fase: "autunno",        label: "autunnali (primi concorsi)",    labelFr: "automne (premiers concours)",  min1: 601, min2: 551 },
  "autunno-finale": { fase: "autunno-finale", label: "autunnali (ultimi 3 concorsi)", labelFr: "automne (3 derniers)",         min1: 611, min2: 561 },
  "finale":         { fase: "finale",         label: "finale regionale",              labelFr: "finale régionale",             min1: 631, min2: 581 },
};

/** Macro-fase dell'HUD → fase di pesa. Durante l'inalpa (pausa) si pesa già
 *  con le soglie ESTIVE: è la crescita d'alpeggio che prepara la ripresa. */
export function faseGaraCorrente(faseId: FaseId): FaseGara {
  switch (faseId) {
    case "preseason":
    case "primavera": return "primavera";
    case "inalpa":
    case "estate": return "estate";
    case "autunno": return "autunno";
    case "finale":
    case "postseason": return "finale";
  }
}

export interface EsitoPesa {
  cat: CategoriaId;
  soglie: SogliePesa;
  /** kg mancanti per salire di categoria (null se già in 1ª). */
  allaCategoriaSopra: number | null;
  /** margine kg prima di scivolare nella categoria sotto (null se in 3ª). */
  margineSotto: number | null;
}

/** Il rito della stadera: dal peso vivo alla categoria DELLA FASE. */
export function categoriaAllaPesa(pesoKg: number, fase: FaseGara): EsitoPesa {
  const soglie = SOGLIE_PESA[fase];
  const cat: CategoriaId = pesoKg >= soglie.min1 ? "1ª" : pesoKg >= soglie.min2 ? "2ª" : "3ª";
  return {
    cat,
    soglie,
    allaCategoriaSopra: cat === "1ª" ? null : cat === "2ª" ? soglie.min1 - pesoKg : soglie.min2 - pesoKg,
    margineSotto: cat === "3ª" ? null : cat === "1ª" ? pesoKg - soglie.min1 : pesoKg - soglie.min2,
  };
}

/** Etichetta completa a norma di dossier: "2ª cat. (eliminatorie estive 2026)". */
export function etichettaPesa(pesoKg: number, fase: FaseGara, anno = 2026): string {
  const e = categoriaAllaPesa(pesoKg, fase);
  return `${e.cat} cat. (${e.soglie.label} ${anno})`;
}
