import type { Bovina, Razza } from "../data/types";

export interface Riconoscimento {
  e_mucca: boolean;
  razza: Razza;
  confidenza: number;
  motivazione: string;
}

/**
 * Riconoscimento SIMULATO (Demo Mode) — nessuna chiamata di rete.
 * Per il pitch: deterministico e sempre funzionante, anche senza connessione.
 *
 * Nella demo l'incontro è già pre-assegnato dal pascolo: la "foto" serve solo
 * a confermare razza + confidenza e a rivelare la scheda. Restituiamo la razza
 * reale della bovina con una confidenza alta ma realistica.
 */
export async function riconosci(target: Bovina): Promise<Riconoscimento> {
  await delay(900 + (hash(target.id) % 700)); // finta latenza IA

  const confidenza = 0.82 + (hash(target.nome) % 16) / 100; // 0.82–0.97
  return {
    e_mucca: true,
    razza: target.razza,
    confidenza: Math.min(0.97, Number(confidenza.toFixed(2))),
    motivazione: motivazionePerRazza(target.razza),
  };
}

/** Variante che simula "non è una mucca" (per testare il ramo). */
export async function riconosciNonMucca(): Promise<Riconoscimento> {
  await delay(800);
  return {
    e_mucca: false,
    razza: "Sconosciuta",
    confidenza: 0.3,
    motivazione: "Non vedo una Reina in questa foto.",
  };
}

function motivazionePerRazza(razza: Razza): string {
  switch (razza) {
    case "Castana":
      return "Mantello castano uniforme: una vera regina della lotta.";
    case "Pezzata Rossa":
      return "Mantello pezzato bianco e rosso, tipico delle vacche da latte.";
    case "Pezzata Nera":
      return "Mantello pezzato bianco e nero.";
    default:
      return "Razza non chiara dall'immagine.";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
