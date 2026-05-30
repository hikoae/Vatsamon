# 🐮 Vazzamon — PWA

La Vazzadex delle **Reines reali** delle Bataille de Reines valdostane.
Stile Pokémon GO, ma con mucche vere: mappa dei pascoli → incontro → cattura
(riconoscimento razza) → scheda → Vazzadex → Bataille amichevole.

> Hackathon **BuildWithAI – GDG Valle d'Aosta**.

## Stack
- **Vite + React + TypeScript** (PWA installabile, offline-ready via `vite-plugin-pwa`)
- **Leaflet** + tile OpenStreetMap (nessuna API key)
- Stato utente in **localStorage** (catturate, punti, passi) — niente backend, niente login
- Dataset **reale** v0.3: 73 bovine + 6 pascoli (`src/data/vazzadex.json`), 35 foto reali in `public/photos/`

## Riconoscimento — Demo Mode
Il riconoscimento razza è **simulato in locale** (`src/lib/recognition.ts`): nessuna
chiamata di rete, la demo funziona sempre anche offline (a prova di palco).
L'incontro è pre-assegnato dal pascolo; la "foto" conferma razza + confidenza e
rivela la scheda. Pronto a essere sostituito con una vera chiamata Gemini multimodale.

## Sviluppo
```bash
cd app
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/
npm run preview  # anteprima della build
```

## Deploy su GitHub Pages
1. Il repository **deve chiamarsi `vazzamon`** (il `base` in `vite.config.ts` è `/vazzamon/`).
   Se usi un altro nome, cambia quel valore.
2. Push su `main`: la GitHub Action in `.github/workflows/deploy.yml` builda e pubblica.
3. Su GitHub → **Settings → Pages → Source: GitHub Actions**.
4. URL finale: `https://<utente>.github.io/vazzamon/` → apri da Safari su iPhone →
   *Condividi → Aggiungi a Home* per installare la PWA.

## Struttura
```
app/src/
├─ data/        vazzadex.json (v0.3) + types + loader (db.ts)
├─ store/       game.tsx  → stato localStorage (catture, punti, custom)
├─ lib/         recognition.ts (Demo Mode) · rarity.ts
├─ components/  CowImage · StatBars · CowDetail · Navbar · EducationPopup
├─ screens/     MapScreen · EncounterScreen · VazzadexScreen · BattleScreen · ProfileScreen
└─ App.tsx
```
