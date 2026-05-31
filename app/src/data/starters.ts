/**
 * Dati per la creazione del personaggio (onboarding al primo login):
 *  - avatar/allenatore preimpostati,
 *  - valli d'origine con un piccolo bonus tematico,
 *  - Reines "starter" curate fra quelle CON FOTO reale.
 */
import { Vatsamon } from "../types";
import { REAL_COWS } from "./realCows";

export interface AvatarPreset {
  id: string;
  label: string;
  emoji: string;
}

export const AVATARS: AvatarPreset[] = [
  { id: "pastora", label: "Pastora", emoji: "👩‍🌾" },
  { id: "pastore", label: "Pastore", emoji: "👨‍🌾" },
  { id: "alpinista_f", label: "Alpinista", emoji: "🧗‍♀️" },
  { id: "alpinista_m", label: "Alpinista", emoji: "🧗‍♂️" },
  { id: "ranger", label: "Ranger", emoji: "🧝" },
  { id: "casaro", label: "Casaro", emoji: "🧑‍🍳" },
];

export interface ValleyOrigin {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** Bonus tematico di partenza (semplice per ora, espandibile in futuro). */
  bonus: { coins: number; label: string };
}

export const VALLEYS: ValleyOrigin[] = [
  {
    id: "gran_paradiso",
    name: "Gran Paradiso",
    emoji: "🐐",
    blurb: "Cresciuta tra stambecchi e pascoli reali: le tue Reines partono cariche.",
    bonus: { coins: 250, label: "+250 Scude d'avvio" },
  },
  {
    id: "cogne",
    name: "Valle di Cogne",
    emoji: "🏞️",
    blurb: "Prati di Sant'Orso e miniere di magnetite: terra di Reines tenaci.",
    bonus: { coins: 220, label: "+220 Scude d'avvio" },
  },
  {
    id: "valsavarenche",
    name: "Valsavarenche",
    emoji: "🦌",
    blurb: "Cuore selvaggio del Parco: silenzio, larici e mandrie fiere.",
    bonus: { coins: 200, label: "+200 Scude d'avvio" },
  },
  {
    id: "rhemes",
    name: "Val di Rhêmes",
    emoji: "🦅",
    blurb: "Gipeti in volo e ghiacciai lontani: le tue mucche guardano lontano.",
    bonus: { coins: 200, label: "+200 Scude d'avvio" },
  },
  {
    id: "valgrisenche",
    name: "Valgrisenche",
    emoji: "🧶",
    blurb: "Terra del Drap, panno di lana alpina: Reines calde e resistenti.",
    bonus: { coins: 200, label: "+200 Scude d'avvio" },
  },
  {
    id: "monte_rosa",
    name: "Valle del Lys (Monte Rosa)",
    emoji: "🏔️",
    blurb: "Terra Walser e Fontina DOP: parti con un gruzzolo extra di campanacci.",
    bonus: { coins: 200, label: "+200 Scude d'avvio" },
  },
  {
    id: "ayas",
    name: "Val d'Ayas",
    emoji: "⛷️",
    blurb: "Conca verde sotto il Rosa: pascoli generosi e Reines ben pasciute.",
    bonus: { coins: 220, label: "+220 Scude d'avvio" },
  },
  {
    id: "champorcher",
    name: "Valle di Champorcher",
    emoji: "🌸",
    blurb: "Fiori del Miserin e antiche vie reali: spirito gentile ma deciso.",
    bonus: { coins: 200, label: "+200 Scude d'avvio" },
  },
  {
    id: "cervino",
    name: "Valtournenche (Cervino)",
    emoji: "⛰️",
    blurb: "All'ombra della Gran Becca: le tue mucche hanno grinta da vendere.",
    bonus: { coins: 200, label: "+200 Scude d'avvio" },
  },
  {
    id: "valpelline",
    name: "Valpelline",
    emoji: "🧀",
    blurb: "Regno della vera Fontina d'alpeggio: Reines dal latte leggendario.",
    bonus: { coins: 230, label: "+230 Scude d'avvio" },
  },
  {
    id: "gran_san_bernardo",
    name: "Valle del Gran San Bernardo",
    emoji: "🐕",
    blurb: "Antico valico tra le nazioni: Reines viaggiatrici e instancabili.",
    bonus: { coins: 210, label: "+210 Scude d'avvio" },
  },
  {
    id: "monte_bianco",
    name: "Val Ferret (Monte Bianco)",
    emoji: "🗻",
    blurb: "Sotto il Tetto d'Europa: esploratrice nata, parti con più monete.",
    bonus: { coins: 300, label: "+300 Scude d'avvio" },
  },
];

export interface StarterChoice {
  /** nome della bovina reale da usare come starter (deve avere foto). */
  cowName: string;
  vibe: string;
  emoji: string;
  tagline: string;
}

/** Tre profili caratteriali; ognuno mappa a una Reina reale con foto. */
const STARTER_CHOICES: StarterChoice[] = [
  { cowName: "FURIE", vibe: "La Combattente", emoji: "🥊", tagline: "Tutta corna e coraggio: attacca per prima e fa domande dopo." },
  { cowName: "BARONNE", vibe: "La Guardiana", emoji: "🛡️", tagline: "Stazza e testa dura: piantata come una roccia, non molla mai." },
  { cowName: "GUIZZA", vibe: "La Scattante", emoji: "⚡", tagline: "Zoccoli rapidi e grinta pura: schiva e colpisce in un lampo." },
];

const cowByName = (name: string) => REAL_COWS.find((c) => c.name === name && c.realPhoto);

/** Starter effettivamente disponibili (con fallback alle prime mucche con foto). */
export const STARTERS: { choice: StarterChoice; cow: Vatsamon }[] = (() => {
  const resolved = STARTER_CHOICES.map((choice) => ({ choice, cow: cowByName(choice.cowName) }))
    .filter((s): s is { choice: StarterChoice; cow: Vatsamon } => Boolean(s.cow));
  if (resolved.length >= 3) return resolved;
  // Fallback robusto: completa con le prime Reines con foto disponibili.
  const used = new Set(resolved.map((s) => s.cow.id));
  const fallbacks = REAL_COWS.filter((c) => c.realPhoto && !used.has(c.id)).slice(0, 3 - resolved.length);
  const extra = fallbacks.map((cow, i) => ({
    choice: STARTER_CHOICES[resolved.length + i] ?? {
      cowName: cow.name,
      vibe: "La Sorprendente",
      emoji: "✨",
      tagline: "Una compagna fidata per i tuoi primi passi tra gli alpeggi.",
    },
    cow,
  }));
  return [...resolved, ...extra];
})();
