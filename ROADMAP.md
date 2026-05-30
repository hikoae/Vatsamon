# Roadmap prototipo — 4 ore, da solo

Obiettivo: una **demo che gira** sul telefono per il pitch. Non un'app completa.
Regola d'oro: se una feature rischia di rompere la demo, **simulala**.

## ⏱ Blocco 0 — Setup (0:00 – 0:20)
- [ ] Google AI Studio → Build → incolla `prompts/ai-studio-build-prompt.md`.
- [ ] Carica `data/vazzadex.json`.
- [ ] Verifica che l'app generata mostri Vazzadex + mappa anche senza IA.
- [ ] Ottieni/incolla la **API key Gemini** (AI Studio la gestisce in Build).

## ⏱ Blocco 1 — Mappa + incontri (0:20 – 1:20)  ← PRIORITÀ
- [ ] Leaflet con i 6 pascoli (coordinate già in `vazzadex.json` → `pascoli`).
- [ ] Tap su marker → mostra una bovina assegnata a quel pascolo.
- [ ] Bottone "Cattura" che apre la fotocamera / upload.
- [ ] Fallback demo: una mucca precaricata se l'utente non scatta.

## ⏱ Blocco 2 — Riconoscimento Gemini (1:20 – 2:30)  ← PRIORITÀ
- [ ] Integra il prompt di `prompts/recognition.md` (structured output JSON).
- [ ] Foto → Gemini → `{ è_mucca, razza, confidenza }`.
- [ ] Se razza ok → apri scheda dal DB (match per pascolo/razza).
- [ ] Se mucca nuova → form manuale (nome, razza, note) → salva in localStorage.
- [ ] Se non è una mucca → messaggio simpatico.
- [ ] **Testa con 3-4 foto vere prima del pitch** (cruciale).

## ⏱ Blocco 3 — Vazzadex + scheda (2:30 – 3:10)
- [ ] Griglia delle catturate con silhouette/foto, stelle, rarità.
- [ ] Scheda dettaglio con le 4 statistiche (barre).
- [ ] Contatore "Vazzadex completata: X/53".

## ⏱ Blocco 4 — Bataille + educazione (3:10 – 3:40)
- [ ] Schermata battaglia: scegli 2 mucche → confronto `potenza` → vincitrice "Reina".
- [ ] Pop-up educativo (1-2 consigli: non urlare, rispetta le recinzioni).
- [ ] Punti simulati: +10 cattura, +5 battaglia, +1 "passo" (bottone finto).

## ⏱ Blocco 5 — Rifinitura + pitch (3:40 – 4:00)
- [ ] Installa la PWA su iPhone via Safari (come hai già fatto per l'Olanda).
- [ ] Slide pitch (Gamma): problema → idea → demo → stack → Uomo-IA → roadmap.
- [ ] Prepara la "frase killer": *dati reali delle nostre Reines, non mostri inventati*.

## Prossimi passi (da dire alla giuria — "stato dell'arte")
- Riconoscimento razza fine-tuned su dataset valdostano reale.
- Passi/GPS reali e geofencing.
- Multiplayer online vero.
- Schede con foto ufficiali (archivio Tipografia Duc / Association).
- Estensione: pedigree interattivo (alberi genealogici già nei dati).
