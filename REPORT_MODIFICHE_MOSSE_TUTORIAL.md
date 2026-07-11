# Report modifiche — mosse comiche, Scuola della Reina, tutorial Mémé

Branch: `claude/game-combat-tutorial-review-ca4ds9` · Data: 2026-07-11
Documento per la revisione esterna: descrive cosa è cambiato, le decisioni
prese e come verificarle. Commit di riferimento (in ordine):

1. `feat(mosse)` — mosse comiche sopra La Spinta + spiegazioni + telecronaca
2. `feat(scuola)` — apprendimento mosse (4 canali)
3. `feat(tutorial)` — Mémé di Nus, beat giocati
4. `docs` — questa relazione + ROADMAP_DIVERTIMENTO.md

---

## 1. Richiesta e diagnosi

Richiesta utente: (a) mosse di combattimento più divertenti — «prima facevano
ridere, ora sono molto serie e non spiegate correttamente»; (b) un tutorial
per il nuovo giocatore; (c) un sistema di apprendimento mosse per le reines;
(d) piano per un gioco divertente oltre che educativo.

Diagnosi sul codice/storia del repo:
- Le mosse comiche esistevano («Incornata della Suocera», «Testata
  Termonucleare», «Muggito dell'Apocalisse»…) e furono rimosse in due commit
  (`55ae5d6`, `e8d495a`; ROADMAP_V1.5.md:52 «I nomi comici delle mosse
  spariscono»). Il motore attuale "La Spinta" aveva 4 azioni universali
  spiegate solo da un tooltip `title=` → «non spiegate correttamente».
- Nessun tutorial: solo la creazione personaggio (4 passi), poi mappa nuda.
  Il «Mentore Mémé a beat giocati» era già progettato nei doc (GAME_REDESIGN
  §4.7, ROADMAP_V1.4:135-137) ma mai costruito.
- Nessun apprendimento mosse: net-new; il pattern idiomatico «impara facendo»
  esisteva già (lib/patois.ts).

## 2. Decisioni di design (le scelte da valutare)

| # | Decisione | Alternativa scartata | Motivo |
|---|---|---|---|
| D1 | **Tono MIX**: tornano le classiche amate come speciali/leggendarie + nuove comico-alpine | Ripristino demenziale integrale; oppure solo nomi nuovi | Onora il «prima facevano ridere» senza buttare la bonifica lessicale: i nomi matti sono «il folklore della piazza», dichiarato in-game («i nomi li inventa la piazza, la tradizione è vera») |
| D2 | **Motore La Spinta mantenuto**; le mosse sono VARIANTI delle 4 famiglie con piccoli modificatori (`MossaMods`), default = numeri storici | Ritorno al motore HP/tipi stile Pokémon | La Spinta è recente, fedele (peso reale, condotta, incruento) e riusata da 4 UI; il layer-mosse è additivo e a rischio zero per i salvataggi |
| D3 | **Equip 4 slot, UNA mossa per famiglia** | Slot liberi (es. 2 per famiglia) | Ogni postura ha sempre una risposta (niente soft-lock senza recupero/reggi); griglia 2×2 stabile; la strategia sta in QUALE variante portare |
| D4 | **Default deterministici senza migrazione**: `cow.mosse` opzionale; se assente → basi (+1 rara per Epiche/Leggendarie, seed = id) | Migrazione dei salvataggi | Zero passi manuali; comportamento identico a prima finché il giocatore non equipaggia |
| D5 | **Usi delle speciali contati PER SPINTA** (reset a ogni `initSpinta`, quindi per avversaria nei gauntlet) | Per giornata/gauntlet | Più semplice e leggibile; documentato nel testo delle mosse («per spinta») |
| D6 | **Tutorial attivato SOLO da Onboarding.finish()** (`vatsamon_tutorial.pending`) | Auto-avvio per chiunque non abbia il flag | Salvataggi esistenti e Playwright verify (che pre-scrive `vatsamon_onboarded`) restano intatti |
| D7 | **Incruento non negoziabile**: ogni «testata» è una spinta a corna limate; commento in testa a `mosse.ts`; il rito della limatura resta obbligatorio ovunque | — | Paletto di GAME_REDESIGN.md:20 |
| D8 | Il tell forzato del tutorial usa `forzaIntento()` esportato dal motore | Duplicare la logica dei TELLS nel componente | I TELLS restano privati e coerenti |

Nota su D1/D7: «Testata Termonucleare» e «Muggito dell'Apocalisse» hanno desc
riscritte per essere iperboli evidenti e non-violente («Nessuna si fa male: è
la piazza che trema», «Il muggito che nel '94 fece scendere la nebbia.
Dicono.»).

## 3. Cosa è cambiato — Fase A (mosse + spiegazioni)

**Motore** — `app/src/lib/spinta.ts` (refactor additivo, zero breaking):
- `MossaMods` (spintaMult, fiatoDelta, calmaDelta, calmaAvv, reggiAssorbi/
  Rimbalzo/EsposizioneGira, recuperoMult, barraCost, scrambleTell) con default
  che riproducono ESATTAMENTE i numeri storici (20/13/10/14 fiato; 0.4/2.5/
  1.35; barra −4).
- `applyAzione(..., opts?: { mossa })`: i mods del Reggi si applicano quando
  l'avversaria attacca la stance (`stanceMossaP/O` in `SpintaState`);
  `confusaP/O` (la finta rende casuale la prossima scelta AI / il prossimo
  tell); `usiMosse` per i limiti; `TurnResult.dettaglio` per la UI.
- `tellAzione` in stato (per rilevare il tell che mente) e `forzaIntento()`.

**Dati** — `app/src/data/mosse.ts` (nuovo): 21 mosse (5 incalza, 5 reggi,
5 gira, 6 incoraggia; 4 basi = comportamento storico), ognuna con `desc`
comica + `comeFunziona` onesto + rarità + eventuali `usiMax`/`requisiti` +
`glossarioKey` (aggancio educativo). Resolver: `mosseEquipaggiate` (default
deterministici, D4), `mosseAvversaria` (basi per i Pastori; boss/leggende/
campioni/finaliste portano 1 rara coerente con l'indole), `bloccoMossa`,
`eseguiMossa` (wrapper unico; l'AI che pesca una mossa bloccata ripiega sulla
base di famiglia).

**Telecronaca** — `app/src/data/telecronaca.ts` (nuovo): ~40 battute registro
sagra di paese (max 1 commento/turno, priorità speciale > counter > barra
estrema > fiato basso; esiti sempre commentati), + `spiegaEsito()` che
sostituisce il log grezzo con la spiegazione numerica del turno («🛡️ Muro di
Stalla ferma ☀️ Incornata del Buongiorno: l'urto si spegne (rimbalzo 3.5)»).

**UI condivisa** — `app/src/components/battle/MossePanel.tsx` +
`MossaInfoSheet.tsx` (nuovi): griglia 2×2 unica per i 4 UI di battaglia
(prima duplicata 4 volte); ⓘ fuori dal `<button>` (resta cliccabile anche su
mossa bloccata; il contenitore mantiene ESATTAMENTE 4 `<button>` per il
selettore Playwright `#…-moves button:not([disabled])`); scheda con famiglia,
rarità, desc, comeFunziona, matrice di counter in due righe, requisiti e voce
di glossario.

**Integrazione** — `BattleScene.tsx`, `DungeonRun.tsx`, `EliminatoireView.tsx`,
`LeggendeView.tsx`: `performTurn(side, mossaId)` via `eseguiMossa`; l'AI resta
invariata (`pickAzioneAvversaria` dà la famiglia → moveset avversario la
traduce in mossa). Id e testi richiesti dal verify conservati («si ritira»,
`#rito-limatura`, `#battle-tell`, `[data-sac]`, 4 bottoni).

**Bilanciamento** — `app/scripts/sim-spinta.ts` (nuovo): 1000 duelli AI-vs-AI
× 4 indoli per ogni variante contro moveset base; entrambi i lati usano la
stessa politica (specchio di `prepareIntent`), quindi conta il Δ dal baseline.
Esito dopo un giro di tuning (calmaAvv ridotto su 3 mosse): **tutte le 17
varianti entro soglia** (comuni/rare ±8, speciali/leggendarie ±15). Il
baseline è ~58% (>50%): è il vantaggio informativo del tell, identico al
gioco reale.

## 4. Cosa è cambiato — Fase B (Scuola della Reina)

`app/src/lib/scuola.ts` (nuovo), sul pattern di `lib/patois.ts`:
1. **Livelli** (hook in `handlePowerUpCow`): liv. 3/5 → la comune non-base
   delle due famiglie preferite (da `stats4`); liv. 8 → Incornata della
   Suocera; liv. 12 → Piroetta del Genepy. Idempotente e con recupero
   arretrati (vale anche per cow già di alto livello).
2. **Imprese** (i 4 UI raccolgono `SpintaStats` e le passano a
   `onResult`/`onFinish`/`onWin` come parametro opzionale in coda → nessun
   call-site esterno rotto): mai sotto barra 50 → Muro di Stalla; rimonta da
   ≤20 → Sciopero dello Zoccolo; vittoria per fiato → Pisolino; ≥3 incoraggia
   → Muggito della Mandria; ≥3 gira → Finta del Casaro; giudizio di condotta
   → Quintale Fermo; tappa → Testata Diplomatica; finale Croix-Noire → +Föhn
   Furioso; Lega → Concerto di Campanacci; Leggende → Apocalisse poi
   Termonucleare; 3 cure all'arp → Ruminazione Zen; Reina di corne →
   Sguardo Regale. Ogni mossa guadagnata finisce anche nel catalogo globale.
3. **Eredità** (`breeding.ts` → `birthCalf`): il moudzon nasce con 1 mossa
   non-base della madre (`mosseApprese`), citata nel lore.
4. **Mémé insegna**: dal catalogo globale (`vatsamon_scuola`, aggiunto a
   `SAVE_KEYS`) a qualunque cow, per Fontina (comune/rara 1 🧀, speciale 2,
   leggendaria 3) — economia esistente.

UI: `app/src/components/MosseEditor.tsx` nel dettaglio Reina del Libretto —
4 righe-famiglia, mosse note equipaggiabili, non note in silhouette con
l'indizio del gesto che le insegna (`MOSSE_TRIGGERS`), bottone «Mémé insegna».

Persistenza: le mosse vivono DENTRO `vatsamon_collection_go` (campi opzionali
`mosse`/`mosseApprese` su `Vatsamon`) → già nel sync cloud, zero migrazioni.

## 5. Cosa è cambiato — Fase C (tutorial Mémé di Nus)

- `app/src/lib/tutorial.ts`: stato `vatsamon_tutorial` {pending, beat, done,
  tips} (in SAVE_KEYS); `pending` scritto SOLO da `Onboarding.finish()` (D6);
  `MEME_TIPS` = consigli contestuali once-only.
- `app/src/components/MemeGuide.tsx`: bubble fissa sopra la nav (z-45), non
  blocca l'input, con «Salta la lezione» sempre disponibile.
- 4 beat GIOCATI in App.tsx: benvenuto (Diario di Bordo, si cammina) →
  «Nutri la tua Reina» (Mémé regala 1 Fieno + denari se mancano; il beat
  avanza DANDO la Razione, non premendo un bottone) → prima bataille guidata
  → congedo.
- `app/src/data/tutorialBattle.ts`: Fripouille (480 kg, indole paziente,
  stats basse ma vere) + `TUTORIAL_SCRIPT`: turno per turno solo la famiglia
  giusta è abilitata (Incalza → Reggi sul tell veritiero forzato → Gira sulla
  postura piantata → Incoraggia col fiato corto scriptato), dal 5° turno
  gioco libero; la vigilia spiega il rito della limatura PRIMA della checkbox
  (che resta obbligatoria). Sconfitta = si resta al beat della bataille
  («si impara più da una spinta persa»), vittoria = +100 XP, 1 Genepy.
- Consigli contestuali in QUALSIASI battaglia normale (once-only): primo
  counter subito, primo fiato < 30, prima speciale pronta, primo tell che
  mente (rilevato con il nuovo `tellAzione`).
- Profilo: «Come si gioca — la lezione di Mémé» rigiocabile da chiunque.

## 6. Verifiche eseguite (tutte verdi)

1. `npm run typecheck` e `npm run build` — puliti a ogni fase.
2. `npm run verify` (Playwright, flusso completo esistente: mappa, GPS,
   scanner, cattura, vigilia/limatura, battaglia fino a «si ritira», 5 tab,
   zero errori console) — verde dopo ogni fase.
3. Sim di bilanciamento (`scripts/sim-spinta.ts`) — 17/17 varianti in soglia.
4. Smoke-test dedicato del tutorial (Playwright, script ad-hoc): onboarding
   fresco simulato → beat 0/1/2 → bataille guidata (1 solo bottone abilitato
   al turno 1 = Incornata del Buongiorno; bubble di Mémé presente) → un bot
   che SEGUE i consigli (rispondi al tell) VINCE → beat finale → `done` in
   localStorage → replay visibile nel Profilo. Anche il ramo sconfitta →
   «riprova» è stato osservato (bot naive che spamma Incalza perde:
   comportamento voluto, la lezione è proprio non spammare).

## 7. Limiti noti / punti da discutere in review

- **Baseline sim ≈58%**: il vantaggio del giocatore è strutturale (vede il
  tell prima di scegliere). I criteri usano il Δ dal baseline, non il 50%.
- **Usi speciali per-spinta nei gauntlet** (D5): in una Lega da 5 spinte una
  leggendaria si può usare 5 volte (1 per spinta). Ritenuto accettabile
  perché fiato e calma si trascinano; alternativa per-giornata annotata.
- **`confusaP` (finta subita dal giocatore)**: rende casuale il PROSSIMO tell
  mostrato (può persino risultare veritiero per caso, 25%). Simmetria non
  perfetta con `confusaO`, ma l'effetto percepito è corretto («non ti fidare
  della lettura»).
- **Tips contestuali solo in BattleScene** (non in Dungeon/Tappe/Leggende):
  scelta di semplicità, il grosso dell'onboarding passa dalle battaglie mappa.
- **MosseEditor nel modal del Libretto**: reso visibile solo per le cow
  effettivamente in collezione (le showcase-card aprono lo stesso modal ma
  senza editor).
- **Fripouille indebolita post-test** (24/24/22/30): un giocatore che segue
  le istruzioni vince; uno che spamma può perdere — voluto, con «riprova»
  morbido e «salta» sempre presente.

## 8. Come ri-verificare in locale

```bash
cd app
npm install
npm run typecheck && npm run build
npm run dev &            # localhost:5173
npm run verify           # flusso Playwright esistente
# bilanciamento mosse:
node_modules/.bin/esbuild scripts/sim-spinta.ts --bundle --format=esm \
  --platform=node --outfile=node_modules/.cache/sim-spinta.mjs && \
node node_modules/.cache/sim-spinta.mjs
```

Prova manuale rapida del tutorial: localStorage pulito → registrazione/test →
onboarding 4 passi → Mémé parte in mappa. Per un salvataggio esistente: nulla
cambia finché non si apre il Libretto (default deterministici) — il tutorial
NON parte; la lezione è rigiocabile dal Profilo.
