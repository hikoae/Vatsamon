# 🐮 Vatsamon — PWA (base v2 + dati reali)

Costruita **a partire dal progetto v2 (AI Studio)** — stile scuro/neon, animazioni,
audio, capture minigame, casere, uova, arena Gym — reso **statico** (niente server)
e arricchito con il **database reale** delle Bataille de Reines.

## Cosa è di v2 (~80%)
Stile e UI originali, 5 schermate (Mappa / AR Scan / Vitelli / Vatsadex / Gym),
mini-gioco di cattura (gauge + campanacci + mela), Casere/PokéStop, uova, allenatore
(livello/XP/monete), audio sintetizzato, scanner DNA.

## Cosa abbiamo aggiunto
- **DB reale**: 73 Reines del calendario 2026 con **foto vere**, comuni corretti,
  4 statistiche reali dai pesi → convertite nel modello di v2 (`src/data/realCows.ts`).
- **Bovine reali sulla mappa** nei loro **comuni veri**, catturabili col mini-gioco di v2.
- **GPS reale di prossimità** + raggio di cattura (250 m); demo: tocca la mappa per camminare.
- **Vatsadex**: catalogo **X/73** con foto reali e 4 statistiche reali nella scheda.
- **Scanner statico**: generazione client simulata (niente server, niente chiavi).
- **PWA** installabile/offline.

## Stack
React 19 + Vite 6 + Tailwind v4 + `motion` + `lucide-react` + Leaflet (imperativo).
Stato in `localStorage`. Build **statica** (`vite build`).

## Comandi
```bash
npm install
npx playwright install chromium  # una tantum: scarica il browser usato da npm run verify

npm run dev       # http://localhost:5173 — tienilo attivo in un terminale separato
npm run build     # typecheck + build statica in dist/
npm run lint      # ESLint (typescript-eslint + react-hooks)

# npm run dev deve essere già avviato altrove: verify.mjs punta a http://localhost:5173
# (override con la env var URL) e lancia Chromium via Playwright.
npm run verify    # Playwright: tab, mappa reali, GPS, catalogo, scanner→cattura
```

`verify.mjs` risolve l'eseguibile Chromium con `process.env.PW_EXEC || "/opt/pw-browsers/..."`
— quel fallback è un path da sandbox CI/agent, quasi certamente assente in locale. Dopo
`npx playwright install chromium`, esporta sempre `PW_EXEC` con l'eseguibile installato:
```bash
PW_EXEC=$(node -e "console.log(require('playwright').chromium.executablePath())") npm run verify
```

## Dati
- `src/data/vatsadex.json` — 73 bovine + 6 pascoli (lat/lng nei comuni reali).
- `scripts/place_bovine.py` — geocoding/pulizia comuni.
- Foto reali in `public/photos/`.

## Deploy
Netlify, automatico a ogni merge su `main` (build da `app/`). GitHub Pages
dismesso — `.github/workflows/deploy.yml` rimosso.
