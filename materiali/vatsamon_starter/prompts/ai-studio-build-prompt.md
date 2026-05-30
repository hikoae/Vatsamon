# Prompt unico per Google AI Studio → Build

Incolla tutto questo nel campo di Build. Poi carica `data/vatsadex.json` come dato dell'app.

---

Crea una **Progressive Web App mobile-first in italiano** chiamata **Vatsamon**, in stile
Pokémon GO ma con le mucche reali delle Bataille de Reines della Valle d'Aosta.

DATI: usa il file `vatsadex.json` che carico. Contiene `bovine` (53 schede con: id, nome,
razza, tipo, categoria, rarita, stelle, riconoscimento, comune, allevatore, matricola,
peso_kg, stats {stazza, corna, testa, grinta}, potenza, pascolo) e `pascoli` (6 luoghi con
lat/lng). Tutti i dati sono già pronti: NON inventarne di nuovi.

SCHERMATE (navbar in basso con 4 tab):
1. **Mappa** (schermata principale): mappa Leaflet con tile OpenStreetMap centrata sulla
   Valle d'Aosta (lat 45.74, lng 7.42, zoom 10). Mostra un marker per ogni pascolo.
   Tap su un marker → apre la schermata "Incontro" con una bovina casuale di quel pascolo
   (campo `pascolo`).
2. **Incontro**: mostra la silhouette (usa assets/cow-silhouette.svg se manca la foto),
   il nome offuscato ("???") e un bottone "📸 Cattura". Premendo: apri fotocamera o upload
   immagine. Manda la foto a Gemini (modello gemini-2.5-flash) con un prompt che restituisce
   SOLO JSON: { "e_mucca": bool, "razza": "Castana|Pezzata Nera|Pezzata Rossa|Sconosciuta",
   "confidenza": number }. 
   - Se e_mucca=false → messaggio simpatico, niente cattura.
   - Se razza riconosciuta → rivela la SCHEDA della bovina e salvala nella Vatsadex.
   - Se la bovina non è nel DB → apri un FORM manuale (nome, razza, note) e salvala.
   Mostra sempre un pulsante "usa mucca demo" come fallback se Gemini non risponde.
3. **Vatsadex**: griglia delle bovine catturate (salvate in localStorage). Ogni cella:
   silhouette/foto, nome, stelle di rarità (★), tipo. In alto: "Vatsadex: X / 53".
   Tap su una cella → SCHEDA dettaglio con: dati, e 4 barre statistiche (STAZZA blu,
   CORNA rosso, TESTA verde, GRINTA giallo) + POTENZA totale + comune + allevatore + matricola.
4. **Bataille**: scegli 2 bovine catturate → confronto automatico della `potenza`
   (mostra un'animazione semplice e dichiara la "Reina del pascolo"). Nessuna violenza,
   solo confronto di statistiche. +5 punti alla vittoria.

GAMIFICATION (semplice/simulata): un contatore punti in alto (+10 cattura, +5 battaglia).
Un bottone finto "🥾 Cammina +100 passi" che dà +1 punto. Un pop-up educativo casuale
("Hai incontrato una mucca? Non urlare, non fare movimenti bruschi, rispetta le recinzioni").

STILE: palette verde alpino (#2E5D34), card arrotondate, font Arial/sistema, look giocoso
ma pulito. Tutto in italiano. I dati utente (catturate, punti) vivono in localStorage.
Niente backend, niente login.

Genera codice React funzionante e mostrami l'anteprima.
