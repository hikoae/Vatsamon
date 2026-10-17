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

/* ============================================================
   I BEAT DI MÉMÉ — battuta + bersaglio del riflettore
   ------------------------------------------------------------
   Testo e bersaglio stanno nello STESSO oggetto di proposito: da quando
   la bolla accende un riflettore sull'elemento, la battuta lo NOMINA
   («il bottone che ti segno»). Tenerli in due file diversi vorrebbe dire
   riscrivere il testo senza accorgersi che il riflettore punta altrove.
   Sono quindi qui, insieme, e `MemeGuide` legge da qui.

   BERSAGLI — lista in ordine di priorità: vince il PRIMO selettore che
   esiste nel DOM ed è visibile. Serve a far seguire al riflettore il
   giocatore lungo una sequenza senza cambiare beat (esempio: prima la
   voce «Libretto» della barra in basso, poi — quando la scheda è aperta —
   la griglia della mandria). Se nessuno esiste, la bolla resta quella di
   sempre e il tutorial prosegue: il riflettore è un di più, mai un
   prerequisito.
   Tutti i selettori qui sotto puntano ad `id`/`aria-label` GIÀ presenti
   nell'app: nessun marcatore aggiunto per il tutorial.
   ============================================================ */

export interface BeatMeme {
  /** Battuta di Mémé per questo beat. */
  testo: string;
  /** Selettori del bersaglio, dal più specifico al più generico. */
  bersagli: readonly string[];
}

export const BEAT_MEME: readonly BeatMeme[] = [
  {
    // 1. Benvenuto nella valle — si cammina.
    testo:
      "Ohilà! Mémé, di Nus: tre generazioni di Reines. Ti insegno io come si sta in questa valle. " +
      "Si parte dai piedi: il bottone che ti segno, CAMMINA 500m, ti porta avanti sul sentiero — " +
      "e più cammini, più incontri. Quel che ti capita te lo ritrovi scritto nel Diario di Bordo, " +
      "in fondo a questa schermata.",
    bersagli: ["#simulate-walk-btn", '#bottom-nav button[aria-label^="Alpeggio"]'],
  },
  {
    // 2. Nutri la tua Reina. La scheda della Reina si apre SOPRA la bolla
    //    (`#details-modal` è z-50, la bolla z-45): la battuta deve bastare
    //    da sola per tutti e tre i gesti, perché sull'ultimo Mémé non si vede.
    //    LUNGHEZZA VINCOLATA: su WebKit a 375px questa battuta andava a capo
    //    su 7 righe (Chromium ne faceva 6), la bolla passava da 222 a 241px e
    //    nessuna collocazione restava libera: si sedeva sui 19px bassi della
    //    card illuminata, badge POTENZA compreso. Misurata a 375px su WebKit,
    //    ora sta in 6 righe con ~25 caratteri di margine: allungandola,
    //    ricontrollare lì prima di committare.
    testo:
      "Una Reina si nutre. Tre gesti: apri il LIBRETTO che ti segno, tocca la tua Reina, " +
      "premi 🌾 RAZIONE D'ALPEGGIO nella sua scheda. Quattro chili a razione, " +
      "e alla pesa il peso fa la categoria: 1ª, 2ª o 3ª. Si spinge solo fra pari.",
    bersagli: ["#collection-grid", '#bottom-nav button[aria-label^="Libretto"]'],
  },
  {
    // 3. La prima bataille. Nessun bersaglio: il gesto è il bottone della
    //    bolla stessa, segnarlo col riflettore sarebbe un cerchio su sé stessa.
    testo:
      "Brava. Ora la piazza. Una bataille non è una rissa: due Reines si mettono testa contro testa " +
      "e spingono finché una cede il passo. Fripouille, la mia vecchia, ti aspetta: " +
      "scendiamo insieme e ti spiego colpo per colpo — mossa, fiato, postura.",
    bersagli: [],
  },
  {
    // 4. Il mondo là fuori.
    testo:
      "Hai condotto, non hai forzato: così si fa. Da qui in poi giri da sola. Sulla mappa trovi " +
      "Pastori e arene; in PERCORSI, che ti segno, c'è la STAGIONE con le tappe della domenica. " +
      "Le mosse nuove si guadagnano giocando, non si comprano. Adesso vai. E salutami la valle.",
    bersagli: ["#open-season-btn", '#bottom-nav button[aria-label^="Percorsi"]'],
  },
];

/** Quanti beat conta la lezione: serve al contatore «2 di 4» della bolla. */
export const BEAT_TOTALI = BEAT_MEME.length;

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
