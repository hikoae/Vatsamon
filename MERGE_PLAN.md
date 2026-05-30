# Piano di merge — Vazzamon (`app/`) ⨉ Vatsamon

> **Per una NUOVA chat a contesto pulito.** Questo file contiene tutto il
> necessario per unire i due progetti **senza perdere pezzi né rompere nulla**.
> Leggi anche [`STATO_ATTUALE.md`](STATO_ATTUALE.md) (inventario della base).

## 0. Regola d'oro
- **La base resta `app/`** (la nostra: v2 statica + 73 bovine reali + GPS + PWA). NON sostituirla.
- Da `vatsamon` si portano **asset, dati e idee**, non l'impalcatura.
- Ogni aggiunta è **additiva**: non cancellare né degradare feature esistenti.
- Mantieni: **build statica** (niente server/Gemini/chiavi), **Leaflet** (niente Google Maps), **privacy = iniziali** allevatore, **chiavi localStorage** attuali, **PWA**.
- Non gonfiare ancora `app/src/App.tsx` (~2580 righe): le **nuove feature vanno in moduli/componenti separati** sotto `app/src/`.
- Lavora **su branch dedicati**, un passo per volta, con `typecheck`+`build`+`verify` verdi prima di ogni commit.

---

## 1. I due progetti

### Base — `app/` (da tenere)
React 19 · Vite 6 · Tailwind v4 · `motion` · `lucide-react` · **Leaflet imperativo** · PWA · **statica**.
- Monolite `app/src/App.tsx`. Stato in `useState`+localStorage (chiavi `vazzamon_*_go`, `vazzamon_waypoint_*`).
- 5 tab: **map / scanner / eggs / vazzadex / battle**.
- 73 bovine reali (`app/src/data/vazzadex.json`) con foto (`app/public/photos/`), geocodate nei comuni (`app/scripts/place_bovine.py`), modello `Vazzamon` (4 stat reali: `stats4{stazza,corna,testa,grinta}` + `stats{strength,defense,agility}` di gioco, `cp`, `level`, `isReal`, `realPhoto`, `comune`, ecc. — vedi `app/src/types.ts`).
- Mappa: bovine reali catturabili per **prossimità** (raggio 250 m), **GPS reale** + tap‑to‑move, **Casere = 6 pascoli reali**, selvatiche IA, uova, **scanner client simulato** (`app/src/lib/generate.ts`).
- Vazzadex: catalogo **X/73** + scheda con 4 stat reali. Battaglia: arena **tap‑and‑dodge** (real‑time).
- Convertitore reale→modello: `app/src/data/realCows.ts`. Visual: `app/src/components/CowVisual.tsx` (foto reale → avatar `VazzamonAvatar`).

### Sorgente — `materiali/vatsamon/` (già copiata qui)
Stesso base v2 ma **con server+Gemini+GoogleMaps** (NON portare). Valore da estrarre:
| Risorsa | File | Cosa è |
|---|---|---|
| **Illustrazioni PNG stile Pokémon** | `materiali/vatsamon/src/assets/images/*.png` | 3 per‑razza (`castana.png`, `pezzata_nera.png`, `pezzata_rossa.png`) + 8 bovine (`tormenta, victoire, liban, malice, bijou, amara, contessa, guerra`). ~1 MB l'una. |
| **Sentieri reali** | `materiali/vatsamon/src/utils/trails.ts` | 3 `ValdostanTrail` con `center/zoom/trailPoints[]/landmarks[]/pasture`, `difficulty`, `lengthKm`, `altitudeGain`, **`responsibleTips[]`**, `cowsToEncounter[]`. |
| **Mappa sentieri (Leaflet)** | `materiali/vatsamon/src/components/OpenSourceTrailMap.tsx` | componente Leaflet che disegna un trail selezionato (polyline+landmark+hiker). Riferimento per overlay. |
| **Quiz educativo** | `materiali/vatsamon/server.ts` riga **94** `PASTORAL_QUIZ_QUESTIONS` (5 domande) | `{id, question, options[], correctAnswerIndex, explanation, difficulty}`. **Da estrarre in statico.** |
| **Pastori avversari** | `materiali/vatsamon/src/App.tsx` riga **48** `NPC_OPPONENTS` (3) | `{name,title,avatar,dialogueIntro/Win/Loss, cowName, cowBreed, cowLevel, cowStats{strength,resistance,agility,spirit}, rewardXp}`. |
| **Derivazione dati ricca** | `materiali/vatsamon/src/utils/bovineDatabase.ts` | regole razza, rarità, **categoria** (1ª/2ª/3ª/Manze), **attacco/difesa**, `note`, mappatura illustrazioni. Idee per arricchire le schede. |

**Da NON portare**: `server.ts`, `@google/genai`, `express`, `@vis.gl/react-google-maps`, i **nomi proprietari per esteso** (anonimizza in iniziali), il loro `App.tsx`/UI in blocco.

---

## 2. Mappatura ai punti della Challenge (obiettivo: coprirli quasi tutti)
| Punto Challenge | Stato base `app/` | Cosa aggiunge il merge |
|---|---|---|
| 1. Vazzadex (scan & riconoscimento) | ✅ scanner simulato | — (resta) |
| 2. Database bovino | ✅ 73 reali | + categoria/attacco/difesa/funFact opzionali |
| 3. **Mappa sentieri (trekking responsabile)** | ⚠️ solo pascoli+GPS | **+ 3 sentieri reali con tracciato, landmark e `responsibleTips`** |
| 4. **Gamification & Educazione (quiz/rispetto)** | ⚠️ solo eco‑tip | **+ Quiz educativo a punti + consigli responsabili** |
| 5. Multiplayer Bataille (statistiche) | ✅ arena real‑time | **→ battaglia a TURNI con scelta mosse + Pastori narrativi** |
| Pitch/slide | (a parte) | invariato |

---

## 3. Mappatura illustrazioni → bovine (IMPORTANTE)
I PNG vanno copiati in `app/public/illustrations/`. Logica di scelta immagine (in `CowVisual`):
1. **foto reale** (`realPhoto`, le 35 in `public/photos/`) → priorità massima.
2. **illustrazione specifica** per nome, se esiste: solo **`TORMENTA`** e **`VICTOIRE`** combaciano coi nostri 73.
3. **illustrazione per razza** (jolly grafico, copre TUTTE le 73): `Castana → castana.png`, `Pezzata Rossa → pezzata_rossa.png`, (`Pezzata Nera → pezzata_nera.png` se aggiungerai cow di quella razza).
4. avatar procedurale `VazzamonAvatar` come ultimo fallback.

> Le altre 6 illustrazioni (`amara,bijou,contessa,guerra,liban,malice`) NON hanno una bovina corrispondente nei nostri 73 (sono extra di vatsamon). **Opzione T6**: aggiungerle come 6 bovine **leggendarie illustrate** bonus (espandendo a 79) — vedi tappa opzionale.

---

## 4. Piano a tappe (ognuna: branch → typecheck → build → verify → commit)

### T1 — Illustrazioni nelle schede (schede "stile Pokémon" base)
- Copia i PNG in `app/public/illustrations/`.
- Crea `app/src/data/illustrations.ts`: mappa `byName` (`TORMENTA→…`, `VICTOIRE→…`) e `byBreed` (`Castana→castana.png`, `Pezzata Rossa→pezzata_rossa.png`, `Pezzata Nera→pezzata_nera.png`), risolvendo l'URL con `import.meta.env.BASE_URL`.
- In `realCows.ts` aggiungi a ogni cow un campo `illustration` (nome→razza fallback).
- In `CowVisual.tsx` applica la priorità del §3 (foto > illustrazione > avatar).
- **Effetto**: ogni Reina senza foto mostra una bella illustrazione di razza invece dell'avatar grigio. Verifica visiva su mappa/Vazzadex/cattura/arena.

### T2 — Vazzadex: scheda dettaglio "carta Pokémon"
- Nuovo componente `app/src/components/CowCard.tsx` (NON dentro App.tsx): cornice olografica per rarità (riusa le classi `.legendary-glow/.epic-glow/.rare-glow` già in `app/src/index.css`), illustrazione grande, **4 barre stat reali** (stazza/corna/testa/grinta) animate, badge rarità/stelle, **categoria** + **comune** + **peso** + **funFact**, CP/livello.
- Sostituisci/avvolgi il modale dettaglio attuale del tab `vazzadex` con `CowCard` (mantieni i bottoni Potenzia/Libera/Compagno esistenti).
- (Opz.) effetto tilt/holographic con `motion`. Mantieni la griglia X/73 e la ricerca.

### T3 — Sentieri reali (trekking responsabile, punto #3)
- Porta `materiali/vatsamon/src/utils/trails.ts` → `app/src/data/trails.ts` (solo i dati; tipi adattati).
- Sul tab **map** aggiungi un **selettore sentiero** (chip in alto) che, quando attivo, disegna `trailPoints` come polyline + `landmarks` (Leaflet `L.polyline`/`L.marker`) sopra la mappa esistente, e un pannello con `difficulty/lengthKm/altitudeGain/durationHours` + lista **`responsibleTips`** (educazione).
- Non rimuovere il sentiero a 21 tappe già presente: il selettore alterna "Esplora libera" / i 3 sentieri reali.
- Implementa in un componente `app/src/components/TrailOverlay.tsx` che riceve la `L.Map` (evita di gonfiare App.tsx).

### T4 — Quiz educativo (gamification & educazione, punto #4)
- Estrai `PASTORAL_QUIZ_QUESTIONS` da `materiali/vatsamon/server.ts` (riga 94) in **`app/src/data/quiz.ts`** (statico). Aggiungi 5–10 domande sul rispetto animali/sentieri/Fontina/Batailles.
- Aggiungi una **6ª tab "Quiz"** (o "Educa") in `BottomNav`/navbar — o, se preferisci 5 tab, fondi il quiz dentro il tab `eggs`/profilo come sezione. Nuovo componente `app/src/components/QuizScreen.tsx`.
- Flusso: domanda → opzioni → feedback (corretto/sbagliato) + `explanation` → punteggio → ricompensa monete/XP a fine quiz. Niente fetch: dati statici.

### T5 — Battaglia a TURNI stile Pokémon (punto #5, richiesta esplicita)
- Nuovo engine in `app/src/components/BattleTurnBased.tsx` + (opz.) hook `app/src/lib/battle.ts`. Sostituisce/affianca l'arena tap‑and‑dodge nel tab `battle` (tieni la selezione del "compagno").
- **Mosse** (4, derivate dalle nostre 4 stat reali): es. `Spallata` (da `corna`/attacco, danno medio affidabile), `Incornata` (alto danno, precisione minore), `Difesa/Resistenza` (riduce danno prossimo turno, usa `testa`), `Sguardo Regale` (buff/agilità, usa `grinta`/spirito). HP iniziali da `stazza`+peso. Ordine turno da `grinta` (agilità).
- **Avversari = Pastori**: porta `NPC_OPPONENTS` (3) in `app/src/data/opponents.ts` con `dialogueIntro/Win/Loss`, campionessa scalata per livello; in più, opzione "sfida una vera Reina" (come ora). Mostra i **dialoghi** del pastore prima/dopo. Ricompense `rewardXp` + monete.
- Niente sangue: confronto di tecnica/statistiche (coerente con la challenge). Animazioni con `motion`.

### T6 — (Opzionale) 6 Reines leggendarie illustrate bonus
- Aggiungi `AMARA, BIJOU, CONTESSA, GUERRA, LIBAN, MALICE` (da `bovineDatabase.ts`, con le loro illustrazioni e `specialAward`) come bovine reali **bonus** nel dataset (geocodale nei comuni indicati, **anonimizza l'allevatore in iniziali**). Aggiorna il totale (es. 73→79) e il contatore. Sono "Castana" con illustrazione dedicata: ottime come obiettivi rari sulla mappa.

---

## 5. Conflitti & decisioni da rispettare
- **Modello stat**: la base usa 4 stat reali `stats4{stazza,corna,testa,grinta}` (verità) + 3 di gioco. Vatsamon usa `{strength,resistance,agility,spirit}` + attack/defense. **Mantieni le nostre**; eventualmente **aggiungi** campi extra opzionali (`categoria`, `attack`, `defense`, `funFact`) al tipo `Vazzamon` senza rompere nulla. Non rinominare i campi esistenti.
- **localStorage**: NON cambiare le chiavi attuali (`vazzamon_*_go`, `vazzamon_waypoint_*`). Quiz/battaglie a turni possono aggiungere chiavi nuove (`vazzamon_quiz_go`, ecc.).
- **Privacy**: la base usa **iniziali** allevatore; vatsamon ha nomi interi → se importi cow/dati, **converti in iniziali** (es. "BUSSO PIERO" → "B.P.").
- **Mappa**: resta **Leaflet**; ignora `@vis.gl/react-google-maps`. Nessuna chiave Google.
- **Static**: niente server. Quiz/opponents/trails diventano **dati statici** in `app/src/data/`.
- **PWA/precache**: aggiungere ~11 MB di PNG aumenta la cache. Includili in `includeAssets`/`globPatterns` di `vite.config.ts` (già coperto da `**/*.png`) e valuta di **comprimere** le illustrazioni (es. ridurle a ~150–250 KB) per non appesantire troppo.
- **Non espandere App.tsx**: ogni tappa crea **componenti/moduli nuovi**; al limite aggiungi al monolite solo il punto di innesto (render del tab, import). Valuta un mini‑refactor di supporto se serve.

---

## 6. Guardrail di verifica (ad ogni tappa)
```bash
cd app
npm install            # se aggiungi dipendenze
npm run typecheck      # tsc --noEmit pulito
npm run build          # tsc + vite build
npm run dev            # prova manuale
npm run verify         # Playwright: tab, mappa reali, GPS, catalogo, scanner→cattura
```
Aggiorna/estendi `app/scripts/verify.mjs` con i nuovi flussi (quiz risponde, battaglia a turni conclude, trail si disegna, illustrazione presente). **Checklist "non rompere"**: 5 tab esistenti funzionanti, 73 reali sulla mappa, GPS, cattura reale → contatore +1, scanner, Casere reali, 0 errori console.

Commit piccoli e descrittivi su branch dedicato; merge su `main` solo a tappa verde. Push: `git@github.com:hikoae/vazzamon.git`.

---

## 7. Dove trovi tutto
- Base app: `app/` (vedi `STATO_ATTUALE.md`).
- Sorgente da unire: **`materiali/vatsamon/`** (sorgenti + 11 PNG + 35 jpg + `server.ts` con quiz).
- Dataset reale: `app/src/data/vazzadex.json` (73 bovine, 6 pascoli). Foto: `app/public/photos/`.
- v2 originale di riferimento: `materiali/vazzamon_v2/`.

## 8. Ordine consigliato
T1 (illustrazioni) → T2 (carte Pokémon) → T3 (sentieri+tips) → T4 (quiz) → T5 (battaglia a turni) → T6 (bonus, opz.).
Ogni tappa è indipendente e verificabile: anche fermandosi prima, l'app resta funzionante e migliorata.
