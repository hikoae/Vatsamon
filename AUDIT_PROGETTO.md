# Audit progetto Vatsamon

> ⚠️ **DOCUMENTO SUPERATO** (cita componenti che non esistono più, conteggi
> righe obsoleti). L'audit aggiornato è **[`AUDIT_2026-07.md`](AUDIT_2026-07.md)**;
> il piano derivato è **[`ROADMAP_V1.4.md`](ROADMAP_V1.4.md)**.

Audit svolto su `app/`, cioe la PWA attiva indicata dal README. `materiali/` e trattata come archivio di fonti, prototipi, dataset e challenge.

## Sintesi

Vatsamon risponde alla challenge "Vatsamon - L'Eco-Adventure delle Mucche Valdostane" trasformando il tema delle Reines valdostane in una PWA gamificata in stile monster-catching: l'utente esplora sentieri e comuni reali, trova bovine vere del dataset, le cattura nel Vatsadex, impara regole di comportamento responsabile e puo sfidare pastori/arene.

L'MVP e presentabile: dataset reale integrato, PWA statica, flusso principale navigabile, scanner demo, mappa Leaflet, GPS/dimostrazione, Vatsadex, quiz educativo e battaglie.

## Requisiti della challenge

- Vatsadex / riconoscimento multimodale: presente come scanner client simulato, upload/camera e generazione Vatsamon.
- Database fittizio generato con IA: presente come componente procedurale e dati ludici; inoltre il progetto usa un dataset reale molto piu forte per il pitch.
- Mappa dei sentieri e trekking responsabile: presente con Leaflet, OpenStreetMap, GPS, tap-to-move demo, raggio di cattura e overlay di sentieri.
- Gamification ed educazione: presente con cattura, zaino, uova, XP, monete, Casere, Vatsadex, quiz "Scuola d'Alpeggio", battaglie e arene.
- Demo funzionante: presente come build web statica in `app/`.

## Funzionalita verificate staticamente

- 73 bovine reali in `app/src/data/vatsadex.json`.
- 35 foto reali in `app/public/photos`.
- 6 pascoli/Casere reali.
- 34 comuni coperti dal dataset.
- Rarita dataset: 51 Rare, 11 Epiche, 11 Leggendarie.
- Razze dataset: 71 Castane, 2 Pezzate Rosse.
- PWA con manifest, icone e cache tile OpenStreetMap in `app/vite.config.ts`.
- Stato persistente in `localStorage`.
- Mappa Leaflet con marker bovine, marker Casere, posizione player e raggio cattura.
- GPS reale tramite `navigator.geolocation.watchPosition` e fallback demo con tap sulla mappa.
- Scanner locale in `app/src/lib/generate.ts`, senza server e senza chiavi API.
- Vatsadex con conteggio reali/bonus, filtri, dettaglio e foto/illustrazioni.
- Quiz educativo statico in `app/src/data/quiz.ts`.
- Battaglia a turni e Arene in `app/src/components/BattleTurnBased.tsx` e `app/src/components/ArenaBattle.tsx`.

## Stack tecnico

- React 19, TypeScript, Vite 6.
- Tailwind CSS v4, Motion, Lucide React.
- Leaflet con API imperativa.
- vite-plugin-pwa e Workbox.
- Build statica, deploy GitHub Pages con base `/vatsamon/`.

## Architettura

Punti solidi:

- Separazione netta tra app attiva (`app/`) e materiali storici (`materiali/`).
- Dataset reale convertito in modello di gioco tramite `app/src/data/realCows.ts`.
- Componenti visivi riutilizzabili per bovine reali, illustrazioni e avatar procedurali (`CowVisual`).
- Logica geografica isolata in `app/src/lib/geo.ts`.
- Scanner volutamente statico, adatto a una demo senza backend.
- PWA installabile e offline-friendly.

Criticita:

- `app/src/App.tsx` e un monolite da 2683 righe: contiene stato, persistenza, mappa, cattura, scanner, uova, Vatsadex e parte della battle logic.
- Lo scanner nel testo UI cita Gemini, ma l'implementazione reale e simulata: per il pitch va detto chiaramente.
- Il testing automatico esiste (`app/scripts/verify.mjs`) ma non ho potuto rieseguirlo in questa sessione per assenza di `node/npm` nel PATH.
- Alcune feature sono demo/procedurali, quindi non vanno vendute come riconoscimento IA reale.

## Rapporto uomo-IA

IA usata per accelerare:

- Base app AI Studio v2.
- Prompt e prototipi presenti nei materiali.
- Generazione/normalizzazione di contenuti ludici, testi, logiche di conversione e narrativa.

Tocco umano aggiunto:

- Integrazione e pulizia del dataset reale delle Reines.
- Collegamento ai comuni, pascoli e foto.
- Scelte di prodotto: raggio cattura, demo GPS, Vatsadex reale, quiz educativo, flow pitch.
- Audit e adattamento per PWA statica, presentabile senza chiavi o server.

## Stato dell'arte

L'app e un MVP pronto per una demo hackathon: racconta bene il territorio, funziona come esperienza web e ha dati reali sufficienti per distinguersi.

Prossimi passi consigliati:

- Rifattorizzare `App.tsx` in hook e feature module.
- Allineare copy e implementazione dello scanner: "simulato" ora, "Gemini/Vertex" come roadmap.
- Aggiungere riconoscimento IA reale opzionale via backend sicuro.
- Migliorare test automatici e screenshot di regressione.
- Preparare deploy pubblico e QR code per demo sul palco.

## Verifica tecnica

Comandi tentati:

```bash
npm run build
```

Esito: non eseguito, perche `npm` e `node` non sono disponibili nel PATH della sessione Codex. La repository contiene comunque `node_modules`, `dist/` e uno script Playwright di verifica gia predisposto.
