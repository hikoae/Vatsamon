/**
 * LO SAC DU BERGER — le scorte dell'allevatore.
 *
 * Nome in francese (lingua ufficiale dell'evento): il glossario patois
 * verificato NON ha una voce per "zaino", e non si inventa patois (paletto
 * v1.5). Ogni oggetto dichiara ONESTAMENTE il suo effetto nella Spinta:
 * niente più descrizioni-fantasma. Alla VIGILIA di una bataille ufficiale se
 * ne scelgono al massimo 3 (MAX_VIGILIA): decidere cosa portare È strategia.
 * I prezzi sono in Denari d'Alpeggio, alla Bottega della Casera.
 */

export type EffettoSac = "fiato" | "calma" | "presa" | "ristoro";

export interface SacItem {
  id: string;
  nome: string;
  emoji: string;
  effetto: EffettoSac;
  fiato?: number;
  calma?: number;
  presa?: number;
  desc: string;   // descrizione VERA dell'effetto
  prezzo: number; // Denari alla Bottega della Casera
}

/** Oggetti utilizzabili durante la Spinta (id storici = salvataggi compatibili). */
export const SAC_ITEMS: Record<string, SacItem> = {
  "item-potion-milk":    { id: "item-potion-milk",    nome: "Secchio di Latte",      emoji: "🥛", effetto: "fiato",   fiato: 50, desc: "Latte tiepido d'alpeggio: ristora +50 fiato.", prezzo: 25 },
  "item-potion-fontina": { id: "item-potion-fontina", nome: "Fetta di Fontina DOP",  emoji: "🧀", effetto: "fiato",   fiato: 90, desc: "Energia casearia concentrata: +90 fiato.", prezzo: 60 },
  "item-buff-genepy":    { id: "item-buff-genepy",    nome: "Genepy del Pastore",    emoji: "🍵", effetto: "calma",   calma: 35, desc: "Infuso d'erbe che rasserena: +35 calma.", prezzo: 30 },
  "item-buff-bell":      { id: "item-buff-bell",      nome: "Campanaccio Fortunato", emoji: "🔔", effetto: "presa",   presa: 8,  desc: "Il rintocco familiare dà sicurezza: +8 presa per tutta la spinta.", prezzo: 45 },
  "item-energy-grappa":  { id: "item-energy-grappa",  nome: "Grolla dell'Amicizia",  emoji: "🍵", effetto: "ristoro", fiato: 30, calma: 15, desc: "Il giro della grolla rincuora: +30 fiato e +15 calma.", prezzo: 35 },
};

/** Altre scorte in vendita alla Bottega (non usabili in Spinta). */
export const BOTTEGA_EXTRA: { id: string; nome: string; emoji: string; desc: string; prezzo: number }[] = [
  { id: "item-hay",   nome: "Fieno delle Vette",  emoji: "🌾", desc: "Serve per la Razione d'Alpeggio (crescita e peso).", prezzo: 10 },
  { id: "item-apple", nome: "Mela Alpina d'Oro",  emoji: "🍏", desc: "Addolcisce l'approccio con le Reines (+50%).", prezzo: 15 },
];

/** Quante scorte si portano alla vigilia di una bataille ufficiale. */
export const MAX_VIGILIA = 3;

/** Il rito della limatura: gesto obbligatorio prima di ogni bataille.
 *  Dossier §1: le corna si limano/spuntano — è la garanzia dell'incruenza. */
export const LIMATURA_TESTO =
  "Prima di ogni bataille le corna si limano: è la garanzia che nessuna Reina si faccia male. Lo scontro è una prova di forza e gerarchia, mai di sangue.";
