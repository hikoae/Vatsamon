/**
 * Illustrazioni stile Pokémon (da vatsamon), risolte come URL statici.
 * Priorità d'uso (vedi CowVisual): foto reale > illustrazione per nome >
 * illustrazione per razza > avatar procedurale.
 */
const BASE = import.meta.env.BASE_URL;
const url = (file: string) => `${BASE}illustrations/${file}`;

/** Illustrazioni dedicate a una specifica Reina (combaciano con i nostri 73). */
const BY_NAME: Record<string, string> = {
  TORMENTA: url("tormenta.png"),
  VICTOIRE: url("victoire.png"),
};

/** Jolly grafico per razza: copre TUTTE le bovine senza foto. */
const BY_BREED: Record<string, string> = {
  Castana: url("castana.png"),
  "Pezzata Rossa": url("pezzata_rossa.png"),
  "Pezzata Nera": url("pezzata_nera.png"),
};

/** Restituisce l'illustrazione migliore per (nome, razza) o null. */
export function resolveIllustration(name?: string, breed?: string): string | null {
  if (name) {
    const byName = BY_NAME[name.trim().toUpperCase()];
    if (byName) return byName;
  }
  if (breed && BY_BREED[breed]) return BY_BREED[breed];
  return null;
}
