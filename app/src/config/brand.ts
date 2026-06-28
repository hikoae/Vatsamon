/**
 * BRAND — configurazione centrale del marchio (parametrizzata).
 *
 * Il prodotto vive su due registri: un HUB istituzionale (per l'associazione e
 * il pubblico) e una modalità GIOCO. Cambiare qui il nome propaga ovunque, così
 * la decisione finale sul brand col cliente è un'unica modifica.
 */

export const BRAND = {
  /** Nome dell'hub istituzionale (titolo ufficiale dell'evento). */
  hubName: "Batailles de Reines",
  /** Sottotitolo / territorio (FR, dicitura ufficiale). */
  hubTagline: "Vallée d'Aoste",
  /** Nome della modalità gioco interna. */
  gameName: "Vatsamon",
  /** Ente di riferimento. */
  ente: "Association Régionale Amis des Batailles de Reines",
} as const;

/**
 * DESIGN TOKENS — palette istituzionale (bandiera/araldica VdA).
 * Riferimento per i componenti; gli stessi valori sono in CSS (:root) per l'uso
 * via classi utility. Vedi materiali/BATAILLES_DOSSIER.md §9.
 */
export const PALETTE = {
  ink: "#0E0E0E",
  red: "#C40000",
  redDeep: "#8E0E0E",
  gold: "#C9A227",
  silver: "#C7CBCE",
  paper: "#F4F0E8",
  castano: "#5A3A22",
  cat1: "#f59e0b",
  cat2: "#38bdf8",
  cat3: "#34d399",
} as const;

/**
 * SLOT SPONSOR — inventario vendibile (placeholder per la demo). Mostra
 * all'associazione dove possono comparire gli sponsor; in produzione si popola
 * con logo/url reali. Non intacca i dati sportivi.
 */
export interface SponsorSlot {
  id: string;
  posizione: string; // dove appare
  livello: "Title" | "Categoria" | "Tappa";
  placeholder: string; // testo mostrato finché lo slot è libero
}

export const SPONSOR_SLOTS: SponsorSlot[] = [
  { id: "title", posizione: "Home e finale", livello: "Title", placeholder: "Title sponsor stagionale" },
  { id: "cat", posizione: "Tabellone e risultati", livello: "Categoria", placeholder: "Sponsor di categoria" },
  { id: "tappa", posizione: "Eliminatoria nel comune", livello: "Tappa", placeholder: "Sponsor della tappa" },
] as const;
