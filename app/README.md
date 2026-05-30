# 🐮 Vazzamon — PWA (build unica)

Fusione dei due prototipi: i **dati reali** (73 Reines con foto, comuni veri,
4 statistiche) + il **gioco stile Pokémon GO** di v2 (cattura, item, uova,
arena, allenatore, audio). Build **statica**, niente server, riconoscimento IA
**simulato** (offline-proof). PC-first, installabile come PWA.

## Stack
- **Vite + React + TypeScript**, **Tailwind v4**, `motion` (animazioni), `lucide-react` (icone)
- **react-leaflet** + OpenStreetMap (nessuna API key)
- Stato in **localStorage** (`vazzamon.save.v2`): collezione, allenatore, zaino, uova
- Audio sintetizzato via Web Audio (`src/lib/audio.ts`)
- PWA offline via `vite-plugin-pwa`

## Schermate (5 tab + barra allenatore)
1. **Mappa** — player + GPS reale / demo (tocca per camminare), raggio di cattura 150 m,
   sentiero reale, bovine reali (con foto) + selvatiche IA, **Casere/PokéStop** con ruota premi.
2. **Scanner** — foto/camera → analisi simulata → **Vazzamon bonus** generato (avatar + lore + eco-tip).
3. **Uova** — incubazione/schiusa camminando.
4. **Vazzadex** — griglia reali (X/73) + bonus IA, ricerca, scheda dettaglio, **potenzia / libera**.
5. **Bataille** — arena in tempo reale: attacca / schiva / super (energia).

## Comandi
```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build statica in dist/
npm run verify    # Playwright: navbar, mappa, cattura, scanner, contatore (desktop+mobile)
```

## Dati e collocazione
- `src/data/vazzadex.json` — 73 bovine + 6 pascoli (v0.3), con lat/lng nei comuni reali.
- `scripts/place_bovine.py` — geocoding/pulizia comuni (rigenera le coordinate).
- Foto reali in `public/photos/`.

## Deploy su GitHub Pages
Repo chiamato **`vazzamon`** (il `base` in `vite.config.ts` è `/vazzamon/`).
Push su `main` → la Action `.github/workflows/deploy.yml` builda `app/` e pubblica.
Poi *Settings → Pages → Source: GitHub Actions*.
