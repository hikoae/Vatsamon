/**
 * CHANGELOG — "Novità di versione" (S19).
 *
 * Una entry per versione pubblicata, ordinate dalla più recente alla più
 * vecchia (indice 0 = versione corrente). `version` deve combaciare
 * ESATTAMENTE con `package.json`'s `version` — è la stessa stringa che la CI
 * confronta in .github/workflows/ci.yml ("Check changelog su version bump") e
 * che WhatsNewModal confronta con `__APP_VERSION__` (vite.config.ts define)
 * per decidere se mostrare il modale.
 *
 * Ogni release aggiunge una NUOVA entry in testa (mai editare quelle vecchie:
 * sono lo storico mostrato nel modale). Max ~5 highlight per entry — sceglie
 * solo cambi user-facing, non refactor interni o dettagli tecnici.
 */

export interface ChangelogHighlight {
  titolo: string;
  descrizione: string;
  /** Emoji singola per la riga; default ✨ se assente. */
  emoji?: string;
}

export interface ChangelogEntry {
  /** Deve combaciare con package.json "version". */
  version: string;
  /** YYYY-MM-DD */
  date: string;
  highlights: ChangelogHighlight[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.4.0-dev",
    date: "2026-07-12",
    highlights: [
      {
        emoji: "👵",
        titolo: "Il tutorial di Mémé",
        descrizione: "I nuovi giocatori vengono accompagnati passo passo (mai a slide): la prima Razione, poi la prima bataille guidata contro Fripouille.",
      },
      {
        emoji: "🥊",
        titolo: "21 mosse comiche + la Scuola della Reina",
        descrizione: "Nuove mosse sopra il motore La Spinta, con telecronaca e spiegazioni. Si imparano giocando: livello, imprese in combattimento, eredità in stalla.",
      },
      {
        emoji: "🏆",
        titolo: "Risultati ufficiali del Calendario",
        descrizione: "I vincitori delle tappe ora sono etichettati UFFICIALE o SIMULATO: mai più un calcolo interno spacciato per un dato di gara vero.",
      },
      {
        emoji: "⚡",
        titolo: "App più veloce",
        descrizione: "Avvio più leggero: le schermate pesanti (battaglie, dungeon, stagione) si caricano solo quando servono davvero.",
      },
      {
        emoji: "🚪",
        titolo: "Esci dall'account",
        descrizione: "Nuovo bottone nel Profilo per uscire in sicurezza: i progressi vengono sincronizzati col cloud prima del logout.",
      },
    ],
  },
];
