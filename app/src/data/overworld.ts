import { Vatsamon, BackpackItem } from "../types";
import { REAL_COWS } from "./realCows";

/**
 * Costanti dell'overworld estratte da App.tsx (FASE 4 — modularizzazione):
 * pool di spawn, lore, linea dei campanacci, zaino iniziale, collezione demo.
 * Definizioni pure e senza stato: nessun cambio di comportamento.
 */

// Classi statiche per l'accento colore dei percorsi (Tailwind JIT-safe).
export const ROUTE_TONE: Record<string, { border: string; bg: string; text: string }> = {
  emerald: { border: "border-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-300" },
  sky: { border: "border-sky-400", bg: "bg-sky-500/10", text: "text-sky-300" },
  amber: { border: "border-amber-400", bg: "bg-amber-500/10", text: "text-amber-300" },
};

// Procedural overworld spawn pool.
// Razze da combattimento reali (niente Pezzata Rossa da latte né Evolène).
export const WILD_BREEDS = ["Castana", "Pezzata Nera", "Hérens"];
// Nomi patois autentici dal corpus reale delle Reines.
export const WILD_NAMES = ["Caprice", "Malice", "Vipère", "Briganda", "Guerra", "Victoire", "Papillon", "Strega", "Difesa", "Reinette", "Sauvage", "Tempête"];

export const ECO_TREK_TIPS = [
  "Resta sul sentiero. Calpestare i pascoli danneggia i delicati fiori d'alpeggio necessari alle api.",
  "Riporta a valle le bucce di frutta. Alle alte quote impiegano anni a decomporsi e attraggono fauna nociva.",
  "Chiudi sempre i recinti dei pascoli alle tue spalle per impedire alle bovine di disperdersi nei canaloni.",
  "Rispetta il silenzio. I rumori forti stressano le regine al pascolo riducendone la qualità del latte.",
  "Pulisci gli scarponi prima di cambiare vallata per evitare di propagare spore floristiche infestanti.",
];

export const LORE_POOL = [
  "Notata spesso a saltellare gioiosamente tra le rocce della Val d'Ayas, predilige l'erba fresca coperta di rugiada.",
  "Una fiera combattente nota per la sua astuzia. Ama farsi grattare la fronte dagli escursionisti rispettosi.",
  "Si dice custodisca gli antichi segreti degli alchimisti della Fontina DOP tra i boschi sacri del Gran Paradiso.",
  "Leggerissima nei movimenti, si camuffa tra i banchi di nebbia per sorprendere i trekker pigri con simpatici baccani.",
];

// ===== Linea dei CAMPANACCI da richiamo (l'approccio con la Reina) =====
// Tre potenze crescenti + la Master garantita. `mult` moltiplica il tasso di
// cattura base; `mult: null` = cattura garantita (100%). Colori inline per
// evitare il purge di Tailwind sui nomi di classe dinamici.
export interface BallMeta {
  short: string; full: string; description: string; emoji: string;
  mult: number | null; color: string; bestFor: string;
}
export const BALL_META: Record<string, BallMeta> = {
  "item-bell-std":    { short: "Ottone",   full: "Campanaccio d'Ottone",   emoji: "🔔", mult: 1.0,  color: "#f59e0b", bestFor: "Comuni · Rare",        description: "Campanaccio in ottone risonante. Il rintocco base per le catture ordinarie." },
  "item-bell-giga":   { short: "Acciaio",  full: "Campanaccio d'Acciaio",  emoji: "🛎️", mult: 2.2,  color: "#38bdf8", bestFor: "Rare · Epiche",        description: "Campana d'acciaio dal rintocco profondo. Più che raddoppia la presa: ideale sulle Epiche." },
  "item-bell-iper":   { short: "Runico",   full: "Campanaccio Runico",     emoji: "⚜️", mult: 4.0,  color: "#a78bfa", bestFor: "Epiche · Leggendarie", description: "Bronzo runico d'alta quota. Risonanza ipnotica che doma anche le Reines Leggendarie." },
  "item-bell-master": { short: "Platino",  full: "Campanaccio di Platino", emoji: "⭐", mult: null, color: "#fb7185", bestFor: "Cattura garantita",    description: "Manufatto in platino della tradizione. Cattura garantita al 100%: usala con saggezza." },
};
export const BALL_ORDER = ["item-bell-std", "item-bell-giga", "item-bell-iper", "item-bell-master"];

// Backpack di partenza: la linea completa di campanacci a scorte decrescenti.
export const DEFAULT_BAG: BackpackItem[] = [
  { id: "item-bell-std",    name: "Campanaccio d'Ottone",        description: BALL_META["item-bell-std"].description,    quantity: 20, type: "ball" },
  { id: "item-bell-giga",   name: "Campanaccio d'Acciaio",  description: BALL_META["item-bell-giga"].description,   quantity: 8,  type: "ball" },
  { id: "item-bell-iper",   name: "Campanaccio Runico",   description: BALL_META["item-bell-iper"].description,   quantity: 3,  type: "ball" },
  { id: "item-bell-master", name: "Campanaccio di Platino", description: BALL_META["item-bell-master"].description, quantity: 1,  type: "ball" },
  { id: "item-apple", name: "Mela Alpina d'Oro", description: "Frutto profumatissimo. Addolcisce i Vatsamon selvatici del 50%.", quantity: 6, type: "food" },
  { id: "item-hay", name: "Fieno delle Vette", description: "Nutriente speciale usato per aumentare il livello e CP dei Vatsamon.", quantity: 12, type: "candy" },
  // Oggetti da BATTAGLIA (usabili dallo zaino durante la Bataille a turni)
  { id: "item-potion-milk", name: "Secchio di Latte", description: "Cura 60 HP in battaglia. Latte tiepido d'alpeggio, rimette in piedi qualsiasi Reina.", quantity: 5, type: "potion" },
  { id: "item-potion-fontina", name: "Fetta di Fontina DOP", description: "Cura 130 HP in battaglia. Energia casearia concentrata.", quantity: 2, type: "potion" },
  { id: "item-buff-genepy", name: "Genepy del Pastore", description: "In battaglia: aumenta l'Attacco del 40%. Distillato d'erbe che accende la grinta.", quantity: 3, type: "buff" },
  { id: "item-buff-bell", name: "Campanaccio Fortunato", description: "In battaglia: aumenta la Difesa del 40%. Il suo rintocco rassicura la mandria.", quantity: 3, type: "buff" },
  { id: "item-energy-grappa", name: "Grappa alla Genziana", description: "In battaglia: carica +60 Adrenalina per le mosse speciali. Da usare con prudenza!", quantity: 2, type: "buff" },
];

/** Collezione iniziale "demo-ready": alcune Reines reali già catturate, con varietà
 *  di rarità e foto. Usata solo al primo avvio (nessun salvataggio presente). */
export function SEED_COLLECTION(): Vatsamon[] {
  const withPhoto = REAL_COWS.filter((c) => c.realPhoto);
  const byR = (r: string) => withPhoto.filter((c) => c.rarity === r);
  const picks = [
    ...byR("Leggendaria").slice(0, 2),
    ...byR("Epica").slice(0, 2),
    ...byR("Rara").slice(0, 4),
  ];
  return picks.map((c) => ({ ...c, capturedAt: "2026-05-29" }));
}
