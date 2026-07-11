/**
 * I TROFEI DELLE BATAILLES — premi reali, non monete generiche.
 * Dossier §1: chi vince riceve il trofeo "Bosquet" (rami con fiori rossi di
 * cartapesta — in patois "mécro", §10), il campanaccio (sonnaille) e il
 * collare in cuoio. Nel gioco si collezionano nella bacheca del Profilo,
 * uno per tappa vinta (assegnati dai tornei ufficiali).
 */

export type TrofeoTipo = "mecro" | "sonnaille" | "collare";

export interface Trofeo {
  id: string;          // es. "trofeo-<tappaId>-mecro"
  tipo: TrofeoTipo;
  comune: string;      // dove è stato vinto
  data: string;        // ISO della tappa
  categoria: string;   // categoria di peso in cui si è vinto
  reinaNome: string;   // la Reina che l'ha conquistato
}

export const TROFEO_META: Record<TrofeoTipo, { nome: string; emoji: string; desc: string }> = {
  mecro: {
    nome: "Mécro (Bosquet)",
    emoji: "🌹",
    desc: "Rami decorati con fiori rossi di cartapesta: il trofeo della vincitrice, portato sulle corna.",
  },
  sonnaille: {
    nome: "Sonnaille",
    emoji: "🔔",
    desc: "Il campanaccio del premio: la voce della Reina che torna a casa vincitrice.",
  },
  collare: {
    nome: "Collare in cuoio",
    emoji: "🏵️",
    desc: "Il collare lavorato che regge la sonnaille: cuoio inciso di tradizione.",
  },
};
