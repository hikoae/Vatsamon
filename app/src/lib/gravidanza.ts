/**
 * GRAVIDANZA-REQUISITO — la regola più identitaria delle Batailles.
 * Dossier §1 (verificato): alle gare partecipano bovine GRAVIDE — almeno
 * 3 mesi alle eliminatorie estive, almeno 4 alle autunnali. Il regolamento
 * la enuncia così; il gioco la applica ai TORNEI UFFICIALI (le tappe del
 * calendario), mentre le sfide coi Pastori restano allenamento libero.
 *
 * NB: il dossier NON spiega il perché della regola → il gioco la enuncia
 * senza inventare motivazioni (paletto v1.5: niente tradizioni ricamate).
 *
 * Nel gioco la gestazione è COMPRESSA (breeding.ts): il progresso 0–100%
 * mappa i ~9 mesi reali → mesi = progress × 9 / 100.
 */
import { Pregnancy } from "../data/breeding";
import { FaseGara } from "../data/pesa";

export const LS_PREG = "vatsamon_stalla_preg";

/** Legge le gravidanze in corso; migra il vecchio formato singolo → array. */
export function gravidanzeCorrenti(): Pregnancy[] {
  try {
    const raw = localStorage.getItem(LS_PREG);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return parsed && typeof parsed === "object" ? [parsed as Pregnancy] : [];
  } catch {
    return [];
  }
}

/** Mesi di gestazione equivalenti (gestazione bovina ≈ 9 mesi). */
export function mesiGravidanza(p: Pregnancy): number {
  return (p.progress / 100) * 9;
}

/** Soglia del regolamento per la fase: ≥3 mesi (primaverili/estive),
 *  ≥4 (autunnali e finale). */
export function sogliaMesi(fase: FaseGara): 3 | 4 {
  return fase === "autunno" || fase === "autunno-finale" || fase === "finale" ? 4 : 3;
}

export interface Idoneita {
  ok: boolean;
  mesi: number;    // mesi di gestazione della madre (0 se non gravida)
  soglia: 3 | 4;
}

/** Verifica del veterinario all'iscrizione: la Reina è gravida a sufficienza? */
export function idoneaAllaTappa(cowId: string, fase: FaseGara): Idoneita {
  const soglia = sogliaMesi(fase);
  const preg = gravidanzeCorrenti().find((p) => p.motherId === cowId);
  const mesi = preg ? mesiGravidanza(preg) : 0;
  return { ok: mesi >= soglia, mesi, soglia };
}
