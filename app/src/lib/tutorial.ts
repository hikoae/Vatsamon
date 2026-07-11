/**
 * IL TUTORIAL DI MÉMÉ — «beat giocati», mai slide (GAME_REDESIGN §4.7).
 *
 * Mémé di Nus, vecchia allevatrice, accompagna il nuovo giocatore in 4 beat:
 *  1. Benvenuto nella valle (mappa, Diario di Bordo, cammino)
 *  2. Nutri la tua Reina (Stalla/Libretto, Razione, peso→categoria)
 *  3. La tua prima bataille (guidata, vs Fripouille — data/tutorialBattle.ts)
 *  4. Il mondo là fuori (sfide sulla mappa, Stagione) → done
 *
 * `pending: true` viene scritto SOLO da Onboarding.finish(): i salvataggi
 * esistenti e il verify (che pre-scrive vatsamon_onboarded) non hanno la
 * chiave → il tutorial non parte mai da solo: zero regressioni.
 * I `tips` sono i «Consigli di Mémé» contestuali già mostrati (once-only).
 */

export const LS_TUTORIAL = "vatsamon_tutorial";

export interface TutorialState {
  pending: boolean; // creato dall'onboarding, in attesa di partire
  beat: number;     // 0..4 (4 = percorso finito)
  done: boolean;
  tips: string[];   // consigli contestuali già dati
}

const DEFAULT: TutorialState = { pending: false, beat: 0, done: false, tips: [] };

export function tutorialState(): TutorialState {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_TUTORIAL) || "null");
    if (!raw || typeof raw !== "object") return { ...DEFAULT };
    return {
      pending: !!raw.pending,
      beat: typeof raw.beat === "number" ? raw.beat : 0,
      done: !!raw.done,
      tips: Array.isArray(raw.tips) ? raw.tips : [],
    };
  } catch { return { ...DEFAULT }; }
}

export function saveTutorial(st: TutorialState): void {
  localStorage.setItem(LS_TUTORIAL, JSON.stringify(st));
}

/** Chiamata da Onboarding.finish(): il nuovo giocatore riceverà Mémé al primo avvio. */
export function avviaTutorialAlProssimoAvvio(): void {
  saveTutorial({ ...DEFAULT, pending: true });
}

/** Un consiglio contestuale va dato una volta sola: true se è la prima. */
export function tipDaDare(chiave: string): boolean {
  const st = tutorialState();
  if (st.tips.includes(chiave)) return false;
  saveTutorial({ ...st, tips: [...st.tips, chiave] });
  return true;
}

/** Il premio della bataille-lezione si ritira UNA volta: la lezione resta
 *  rigiocabile dal Profilo, ma senza XP/Genepy farmabili. */
export function premioLezioneDaRitirare(): boolean {
  return tipDaDare("premio-prima-lezione");
}

/** I «Consigli di Mémé» contestuali (once-only, via Diario di Bordo). */
export const MEME_TIPS: Record<string, string> = {
  "primo-counter-subito": "👵 Mémé: «Hai visto? La tua mossa si è spenta sulla sua postura. Guarda cosa ha IN CAMPO l'avversaria, non solo cosa sta per fare.»",
  "primo-fiato-basso": "👵 Mémé: «Fiato corto! Ora INCORAGGIA: si vince anche facendo sfiatare l'altra, sai?»",
  "prima-speciale-pronta": "👵 Mémé: «Quella mossa col nome matto è pronta. Le speciali hanno usi contati: spendile quando contano.»",
  "primo-tell-ingannevole": "👵 Mémé: «Il tell può mentire, eh. Il Rispetto affina l'occhio: chi rispetta gli animali li sa leggere.»",
};
