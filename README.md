# Vatsamon - la Vatsadex delle Reines valdostane

Vatsamon e una PWA in stile Pokemon GO dedicata alle Reines reali delle Bataille
de Reines della Valle d'Aosta. La versione attuale riparte dalla base **AI Studio
v2** e la rende una build web statica, innestando il database reale delle bovine,
le foto disponibili e la geolocalizzazione nei comuni corretti.

> Hackathon BuildWithAI - GDG Valle d'Aosta.

## Struttura della repo

```text
.
├─ app/          <- app attiva: Vite + React + TypeScript + PWA
└─ materiali/    <- archivio sorgenti/riferimenti, non app attiva
```

`app/` e la build da sviluppare, verificare e pubblicare. `materiali/` contiene
dataset, prototipi originali, prompt, foto e challenge usati come riferimento o
fonte storica; non va trattata come codice runtime della PWA.

## Avvio

```bash
cd app
npm install
npx playwright install chromium  # una tantum, serve a npm run verify
npm run dev        # http://localhost:5173 — tienilo attivo in un terminale separato
npm run typecheck  # controllo TypeScript
npm run build      # typecheck + build statica in app/dist
npm run verify     # test Playwright sul flusso principale (richiede npm run dev già avviato; vedi PW_EXEC in app/README.md)
```

## Stato attuale

- Base v2: UI scura/neon, animazioni, audio, capture minigame, Casere, uova,
  allenatore e arena Gym.
- Dati reali: 73 bovine del calendario 2026, 35 foto vere, comuni reali,
  coordinate, statistiche e schede convertite nel modello di gioco.
- Scanner: simulato lato client, senza server e senza chiavi API.
- Deploy: Netlify, automatico a ogni merge su `main` (build da `app/`). GitHub
  Pages dismesso.

Per dettagli tecnici e workflow applicativo vedi [app/README.md](app/README.md).
