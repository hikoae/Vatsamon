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
    version: "1.6.0",
    date: "2026-07-12",
    highlights: [
      {
        emoji: "🤝",
        titolo: "Sfide online tra allevatori",
        descrizione: "Sfida un altro allevatore con un codice: partite live o per corrispondenza, una spinta a testa, con rivincita a fine incontro. Trovi tutto nella Piazza, dentro la Stalla.",
      },
      {
        emoji: "🏆",
        titolo: "Risultati veri delle tappe",
        descrizione: "I vincitori del Calendario ora possono essere quelli reali delle Batailles: ogni nome porta il badge UFFICIALE o SIMULATO, così sai sempre cosa stai guardando.",
      },
      {
        emoji: "🎟️",
        titolo: "Schedina pronostici a ogni tappa",
        descrizione: "Non solo la finale: prima di ogni eliminatoria puoi pronosticare la vincitrice di ogni categoria. Se il risultato ufficiale ti dà ragione, punti tifoso ed esperienza.",
      },
      {
        emoji: "💗",
        titolo: "La tua Reina del cuore",
        descrizione: "Segui una Reina reale: storico della sua stagione, avviso quando gareggia e un premio se vince davvero la sua categoria.",
      },
      {
        emoji: "⛰️",
        titolo: "Duelli più tattici",
        descrizione: "Ogni arena ha il suo terreno che cambia la spinta, in Arena scegli l'approccio d'ingaggio prima del duello, e la cura all'Arp mette la tua Reina in forma per la stagione.",
      },
      {
        emoji: "⚡",
        titolo: "App più veloce e leggera",
        descrizione: "Avvio più rapido e aggiornamenti più piccoli. In più: queste Novità di versione a ogni aggiornamento e il bottone per uscire dall'account in sicurezza.",
      },
    ],
  },
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
