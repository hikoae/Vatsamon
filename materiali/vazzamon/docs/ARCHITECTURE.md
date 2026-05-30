# Architettura — Vazzamon (demo)

## Priorità (decise col tempo a disposizione: 4h, 1 persona)
1. **Riconoscimento** razza con Gemini (è la feature "wow").
2. **Mappa** con pascoli a posizione fissa (è la feature "esplorazione").
Tutto il resto (passi, battaglia, multiplayer) è **simulato e semplice**.

## Stack
- **Frontend:** PWA web (React generato da Google AI Studio Build). Mobile-first.
- **IA:** Gemini API (multimodale) via `@google/genai`, modello `gemini-2.5-flash`.
- **Dati:** `data/vazzadex.json` statico, caricato all'avvio. Nessun backend.
- **Mappa:** Leaflet + tile OpenStreetMap (nessuna API key). Marker = pascoli reali VdA.
- **Stato utente:** `localStorage` (bovine catturate, punti). Niente login.
- **Deploy:** rimandato — si pubblica da Google AI Studio quando la demo gira.

## Flusso utente
1. **Home / Mappa:** mappa della Valle d'Aosta con 6 pascoli (marker). Tap su pascolo → "incontro".
2. **Incontro:** appare una bovina di quel pascolo. Bottone "📸 Cattura".
3. **Cattura:** carica/scatta foto → Gemini classifica la razza (3 razze + "non è una mucca").
   - Razza riconosciuta e mucca nel DB → si apre la **scheda** (card Pokédex) e va in Vazzadex.
   - Mucca nuova/non nel DB → si apre **form di inserimento manuale** (nome, razza, note).
   - "Non è una mucca" → messaggio simpatico, niente cattura.
4. **Vazzadex:** griglia delle bovine catturate, con stelle di rarità e stat.
5. **Bataille:** scegli 2 mucche → confronto automatico delle stat → "Reina del pascolo".
6. **Educazione:** pop-up rispetto-natura prima/dopo la cattura (non bloccante).

## Schede (Pokédex)
Ogni bovina ha: foto reale o silhouette, nome, razza, tipo, categoria, rarità (★), comune,
allevatore (iniziali), eventuale matricola, peso, e 4 statistiche → STAZZA, CORNA, TESTA, GRINTA.

## Scelte consapevoli (da dire alla giuria)
- Dati **reali** dal calendario delle Batailles → autenticità.
- Privacy: nomi allevatori ridotti a **iniziali**.
- Battaglia **senza violenza**: solo confronto di statistiche.
- Educazione al rispetto degli animali integrata nel gioco.
