import { AzioneId } from "../lib/spinta";
import { MapBattle } from "./mapBattles";

/**
 * LA PRIMA BATAILLE — la lezione giocata di Mémé di Nus.
 *
 * Un MapBattle speciale (tutorial: true), NON incluso in MAP_BATTLES: non
 * appare mai sulla mappa, si lancia solo dal percorso di Mémé (beat 3) o dal
 * replay nel Profilo, bypassando i vincoli di distanza/livello.
 * L'avversaria è Fripouille, la vecchia Reina di Mémé: leggera (480 kg) e
 * paziente — battibile, ma abbastanza vera da insegnare.
 *
 * Mémé parla italiano con le parole di patois GIÀ nel glossario verificato
 * (reine, bataille, moudzon…): mai patois inventato (paletto v1.5).
 */

export const TUTORIAL_BATTLE: MapBattle = {
  id: "mb-tutorial-meme",
  kind: "pastore",
  name: "Mémé di Nus",
  subtitle: "La lezione della vecchia allevatrice",
  emoji: "👵",
  lat: 45.7409, // Nus
  lng: 7.4674,
  reqLevel: 1,
  accent: "#c8102e",
  tutorial: true,
  pastore: {
    id: "pastore-meme",
    name: "Mémé di Nus",
    title: "Allevatrice da tre generazioni",
    avatar: "👵",
    dialogueIntro:
      "A Nus le chiamavamo batailles anche prima che nascessi tu. Vieni: Fripouille è vecchia come me, ma una lezione la spinge ancora volentieri.",
    dialogueWin: "Brava la tua Reina. E bravo tu: hai condotto, non hai forzato. Adesso vai a farti la stagione.",
    dialogueLoss: "Eh, Fripouille ne sa una più del lupo. Riprova: si impara più da una spinta persa che da dieci vinte.",
    cowName: "Fripouille",
    cowBreed: "Castana",
    cowLevel: 2,
    cowStats: { strength: 24, resistance: 24, agility: 22, spirit: 30 },
    rewardXp: 100,
  },
};

/** Un passo della lezione: cosa dice Mémé e cosa può fare il giocatore. */
export interface TutorialStep {
  memeText: string;
  /** Le sole famiglie giocabili in questo passo (undefined = tutte). */
  famiglieAbilitate?: AzioneId[];
  /** L'azione che l'avversaria TELEGRAFA durante questo passo e che ESEGUE
   *  subito dopo l'azione del giocatore (tell veritiero forzato). */
  intentoAvversaria?: AzioneId;
}

/**
 * La sceneggiatura, indicizzata sul numero del turno del GIOCATORE (0-based).
 * ATTENZIONE alla coerenza tell/stance: la contromossa del giocatore al passo
 * N si risolve contro la STANCE avversaria (= la sua azione del passo N−1),
 * mentre il tell del passo N annuncia l'azione che lei eseguirà DOPO.
 * Sequenza: Incalza → Reggi (lei si spegne sul muro) → Incoraggia (lei si
 * pianta) → Gira (aggiri la postura piantata) → gioco libero.
 */
export const TUTORIAL_SCRIPT: TutorialStep[] = [
  {
    memeText: "Spingi, con fiducia. Guarda la BARRA lassù: quella è la piazza contesa. E guarda il FIATO che se ne va: niente è gratis. Anche lei spingerà: va bene così, è la piazza.",
    famiglieAbilitate: ["incalza"],
    intentoAvversaria: "incalza",
  },
  {
    memeText: "Ora guardala: scalpita a testa bassa = sta per incalzare ANCORA. Tu REGGI: pianta gli zoccoli, e la sua spinta si spegnerà sul tuo muro.",
    famiglieAbilitate: ["reggi"],
    intentoAvversaria: "incalza",
  },
  {
    memeText: "Vista? La sua spinta s'è spenta sul tuo muro. Ora si pianta anche lei — e tu RESPIRA: incoraggia la tua Reina. Il fiato è tutto: recupero pieno se l'avversaria non attacca.",
    famiglieAbilitate: ["incoraggia"],
    intentoAvversaria: "reggi",
  },
  {
    memeText: "S'è piantata come un larice, e adesso rifiata. Contro un muro non si spinge: ci si GIRA attorno, di leno. Cerca il fianco.",
    famiglieAbilitate: ["gira"],
    intentoAvversaria: "incoraggia",
  },
  {
    memeText: "Adesso sai leggere e rispondere. Finiscila tu: ogni famiglia ha più MOSSE, coi nomi un po' matti — i nomi li inventa la piazza, la tradizione è vera. Tocca la ⓘ per conoscerle.",
  },
];

/** Cosa dice Mémé alla vigilia, prima del rito della limatura. */
export const TUTORIAL_VIGILIA =
  "👵 Prima di tutto, il rito più vecchio: si LIMANO LE CORNA. Nessuna si fa male, MAI — è la regola che regge tutto il resto. Poi scegli la Reina e… alla spinta!";
