# Stato attuale di `app/` — baseline per il merge

> ⚠️ **DOCUMENTO SUPERATO** (fotografa la baseline pre-merge: 5 tab, App.tsx
> 2584 righe, 6 chiavi). Per lo stato reale vedi **[`AUDIT_2026-07.md`](AUDIT_2026-07.md)**
> e `HANDOFF.md`.

Inventario verificato (codice ispezionato, non a memoria) della build attuale,
da usare come base per unire un'altra repo mantenendo il più possibile.

## Stack & build
- **React 19 + Vite 6 + TypeScript**, **Tailwind v4**, `motion`, `lucide-react`, **Leaflet** (API imperativa, non react-leaflet), `vite-plugin-pwa`.
- Build **statica** (niente server): `dev`=vite, `typecheck`=tsc --noEmit, `build`=tsc --noEmit && vite build, `verify`=Playwright.
- Origine: **AI Studio v2** (stile scuro/neon mantenuto), reso statico + innestato il DB reale.
- PWA: manifest + icone + offline (workbox, cache tile OSM). `base` = `/vatsamon/` (GitHub Pages). Workflow `.github/workflows/deploy.yml`.

## Struttura `app/src/` (3554 righe)
| File | righe | ruolo |
|---|---|---|
| `App.tsx` | **2584** | **monolite**: tutta la logica + tutte le 5 viste |
| `data/vatsadex.json` | 2098 | 73 bovine reali + 6 pascoli |
| `components/VatsamonAvatar.tsx` | 309 | avatar mucca SVG procedurale (per generati) |
| `components/CowVisual.tsx` | 27 | foto reale se presente, altrimenti avatar |
| `utils/audio.ts` | 201 | SFX Web Audio (moo, headbutt, fanfara, click) |
| `data/mockVatsamon.ts` | 145 | dati v2: 2 starter, 3 boss demo, 5 hotspot |
| `data/realCows.ts` | 80 | **convertitore** DB reale → modello Vatsamon |
| `types.ts` | 91 | tipi (Vatsamon esteso con campi reali) |
| `lib/generate.ts` | 76 | scanner client simulato (ex /api server) |
| `lib/geo.ts` | 29 | haversine, fmtDist, versoTarget, RAGGIO_CATTURA=250 |
| `index.css` | 89 | tema scuro v2 + keyframe animazioni |

`App.tsx` è organizzato in 11 sezioni logiche + 5 viste (commenti `// ---- N ----`):
1 stato persistente · 2 navigazione · 3 audio · 4 generatore selvatiche ·
5 cammino simulato · 6 schiusa uova · 7 ruota Casera · 8 cattura interattiva ·
9 power-up/transfer · 10 arena gym · 11 scanner DNA.
Viste: MAP / AR SCAN / EGGS(Vitelli) / VATSADEX / BATTLE(Gym).

## Schermate (5 tab)
`map` (Mappa) · `scanner` (AR Scan) · `eggs` (Vitelli) · `vatsadex` · `battle` (Gym).

## Stato salvato (localStorage) — 6 chiavi
`vatsamon_collection_go` (collezione) · `vatsamon_bag_go` (zaino) ·
`vatsamon_eggs_go` (uova) · `vatsamon_trainer_go` (allenatore) ·
`vatsamon_waypoint_idx` + `vatsamon_waypoint_progress` (posizione sul sentiero).
> Nessuno store/context: tutto è `useState` dentro `App.tsx` con `useEffect` di persistenza.

## Modello dati `Vatsamon` (types.ts)
Base v2: `id, breed, name, stats{strength,defense,agility}, rarity, eco_tip, lore, imageUrl?, capturedAt, cp, level, customColor?`.
Esteso per i reali: `isReal?, realPhoto?, comune?, allevatore?, matricola?, riconoscimento?, peso_kg?, pesoStimato?, lat?, lng?, stats4?{stazza,corna,testa,grinta}, potenza?`.

## Dati reali (vatsadex.json)
- **73 bovine** (Batailles de Reines 2026), **6 pascoli**, **35 foto reali** in `public/photos/`.
- Razze: Castana / Pezzata Rossa. Rarità: Rara / Epica / Leggendaria.
- Geocodate nei comuni reali (`app/scripts/place_bovine.py`).
- Conversione (realCows.ts): `strength=corna, defense=testa, agility=grinta`; `cp` da formula v2; `rarity` "Non comune"→Rara.

## Funzioni di gioco (tutte di v2, conservate)
`spawnWildCowAtRandom`, `addTrainerXp`, `handleSimulatedWalk`, `triggerEggHatching`,
`handleSpinCasera`, `initiateCatchWild`, `handleFeedApple`, `executeThrow`,
`handlePowerUpCow`, `handleTransferCow`, `handleInitiateGymMatch`,
`handlePlayerTapAttack/Dodge/SuperAttack`, `processImageScanGo`, `handleFileUploadGo`, `startCameraGo`.

## Cosa abbiamo AGGIUNTO a v2 (punti d'innesto del reale)
1. **Mappa**: disegna le `REAL_COWS` non catturate nei comuni veri (foto thumbnail nel marker), con **prossimità** (`RAGGIO_CATTURA=250`); tap in raggio → `initiateCatchWild`, fuori raggio → feed "avvicinati".
2. **GPS reale + demo**: `effLat/effLng = gpsPos ?? posizione-sul-sentiero`; bottone `#gps-btn` (watchPosition) + **tap sulla mappa per camminare**; player e cerchio resi non interattivi.
3. **Vatsadex**: card "Reines reali: X/73" + nella scheda **4 statistiche reali** e provenienza (comune/allevatore/peso/riconoscimento) quando `isReal`.
4. **CowVisual**: foto reale nei marker, cattura, griglia, dettaglio, arena.
5. **Scanner**: `generateVatsamonClient` (statico, niente server/chiavi). Camera reale via getUserMedia funziona; l'analisi è simulata.

## Verificato (Playwright, `npm run verify`)
Header VATSAMON GO · 5 tab navigabili · 73 marker reali sulla mappa · GPS si attiva ·
catalogo "0/73" · scanner→cattura→presa (master ball) · **cattura reale end-to-end** (ALLEGRA, CP 448) · **0 errori console**. Desktop 1280 (+ mobile in run precedenti).

## Incongruenze RISOLTE (fix applicati)
- ✅ **Casere = i 6 pascoli reali** (`REAL_CASERE`), non più i 5 fittizi di v2. Export non più morto.
- ✅ **Avvio pulito**: Vatsadex vuota (0/73), allenatore a 0 catture/XP. Niente più "+2 bonus IA" fasullo.
- ✅ **Avversari Gym = vere Reines** (Epiche/Leggendarie reali, con foto nell'arena).
- ✅ Rimosso `src/data/mockVatsamon.ts` (interamente inutilizzato dopo i fix).
- ✅ Typecheck pulito (`tsc --noEmit`); cattura reale verificata end-to-end (ALLEGRA → 1/73).

## Limiti / decisioni note (rilevanti per il merge)
- **`App.tsx` è un monolite da ~2580 righe**: difficile da unire file-per-file; il refactor in moduli è il prossimo lavoro pianificato.
- **Scanner = simulato** (niente Gemini reale, niente server). Statico per scelta.
- Le bovine reali sono sparse nei comuni: alcune lontane dal sentiero a 21 tappe di v2 (raggiungibili con GPS reale o tap-to-move).
- Nessuna gestione stato centralizzata (tutto in App.tsx) → punto di attrito per integrare feature esterne.
- Restano le **selvatiche IA** procedurali di v2 e lo scanner: i loro Vatsamon contano come "bonus IA" nel conteggio collezione (separati dalle 73 reali).

## Repo
- `app/` = build attiva. `materiali/` = sorgenti/riferimenti (incluso `vatsamon_v2` originale, `foto`, dataset, prompt, challenge).
- Backup su GitHub: `git@github.com:hikoae/vatsamon.git`, branch `main` (pushato).
