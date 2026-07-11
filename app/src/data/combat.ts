/**
 * Dati residui del combattimento. Il motore vivo è "La Spinta"
 * (lib/spinta.ts); gli oggetti vivono in data/sac.ts (Lo Sac du Berger).
 * Qui resta solo l'etichetta legacy dei dati storici.
 */

// ===================== ETICHETTE LEGACY =====================
// I 5 "tipi" restano SOLO come etichette nei dati storici di arene e Leghe
// (mappate su un'indole in lib/spinta.personalitaFromLegacy). Il motore di
// combattimento non li usa: la Spinta lavora su massa/presa/volontà reali.
export type VatsaType = "corna" | "prato" | "tempesta" | "latte" | "roccia";
