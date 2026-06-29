/**
 * GRADI AMIS DES REINES — identità del giocatore dentro l'associazione.
 *
 * Non è il "livello allenatore" (che resta il gate meccanico XP per arene/leghe):
 * è il PRESTIGIO riconosciuto dagli Amis des Batailles de Reines, che cresce con
 * l'esperienza sul campo, le Reines affidate e il Rispetto guadagnato.
 * Curva sub-esponenziale (≈ 600·n^1.35): si sale con costanza, non a strappi.
 */

export interface Grado {
  n: number;        // 1..6
  nome: string;     // IT
  nomeFr: string;   // FR
  emoji: string;
  soglia: number;   // prestigio minimo per raggiungerlo
  perk: string;     // riconoscimento (flavor)
  perkFr: string;
}

export const GRADI: Grado[] = [
  { n: 1, nome: "Forestiero",   nomeFr: "Étranger",      emoji: "🌱", soglia: 0,    perk: "Benvenuto fra gli Amis des Reines.",        perkFr: "Bienvenue chez les Amis des Reines." },
  { n: 2, nome: "Apprendista",  nomeFr: "Apprenti",      emoji: "🥾", soglia: 600,  perk: "Sai avvicinare una Reina senza spaventarla.", perkFr: "Tu sais approcher une Reine sans l'effrayer." },
  { n: 3, nome: "Mandriano",    nomeFr: "Bouvier",       emoji: "🐂", soglia: 1530, perk: "Conduci la mandria all'alpeggio.",          perkFr: "Tu mènes le troupeau à l'alpage." },
  { n: 4, nome: "Allevatore",   nomeFr: "Éleveur",       emoji: "🌿", soglia: 2650, perk: "La tua stalla ha una linea di sangue.",     perkFr: "Ton étable a une lignée." },
  { n: 5, nome: "Capo-Mandria", nomeFr: "Chef d'alpage", emoji: "🏔️", soglia: 3900, perk: "Gli alpeggi alti rispondono al tuo campanaccio.", perkFr: "Les hauts alpages répondent à ta sonnaille." },
  { n: 6, nome: "Grand Éleveur", nomeFr: "Grand Éleveur", emoji: "👑", soglia: 5270, perk: "Un nome che conta alla Croix-Noire.",        perkFr: "Un nom qui compte à la Croix-Noire." },
];

/** Punteggio di prestigio: esperienza + Reines affidate + Rispetto. */
export function prestigio(t: { xp?: number; capturedCount?: number; respectScore?: number }): number {
  const xp = t.xp ?? 0;
  const reines = t.capturedCount ?? 0;
  const rispetto = t.respectScore ?? 50;
  return Math.round(xp + reines * 60 + rispetto * 6);
}

export interface GradoStato {
  grado: Grado;
  next: Grado | null;      // prossimo grado (null al massimo)
  prestigio: number;
  versoNext: number;       // 0..1 di avanzamento verso il prossimo grado
}

/** Restituisce il grado attuale del giocatore e l'avanzamento verso il prossimo. */
export function gradoCorrente(t: { xp?: number; capturedCount?: number; respectScore?: number }): GradoStato {
  const p = prestigio(t);
  let idx = 0;
  for (let i = GRADI.length - 1; i >= 0; i--) {
    if (p >= GRADI[i].soglia) { idx = i; break; }
  }
  const grado = GRADI[idx];
  const next = idx < GRADI.length - 1 ? GRADI[idx + 1] : null;
  const versoNext = next ? Math.max(0, Math.min(1, (p - grado.soglia) / (next.soglia - grado.soglia))) : 1;
  return { grado, next, prestigio: p, versoNext };
}
