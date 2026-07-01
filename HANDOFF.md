# HANDOFF — Vatsamon GO 🐮⚔️

> **Documento di passaggio per le sessioni AI.** Leggi SOLO questo file (più i
> file citati al bisogno) invece di rileggere tutto il codice. Mantienilo
> aggiornato a fine sessione.
>
> Ultimo aggiornamento: 2026-07-01 · Branch di sviluppo: `claude/vatsamon-audit-redesign-ig2l5t` (v1.4 in corso)

---

## 0. TL;DR — cosa serve sapere in 30 secondi

- **Cos'è**: PWA mobile stile **Pokémon GO** con le **vere Reines** (mucche valdostane)
  della Bataille de Reines 2026. React 19 + Vite 6 + TS, Tailwind v4, Firebase, Leaflet.
- **Repo**: `hikoae/vazzamon` (⚠️ da rinominare in `vatsamon` su GitHub: Settings → Repository name) · **app dir**: `app/` · **live**: `vatsamon.netlify.app`
- **Branch di lavoro**: `claude/vatsamon-audit-redesign-ig2l5t` (v1.4). Si fa merge su `main` per il deploy Netlify.
- **Comandi**: `cd app && npm install && npm run dev` · build: `npm run build`
- **v1.4 in corso** (vedi `ROADMAP_V1.4.md` e `AUDIT_2026-07.md`): fatti
  Sprint 0 (bugfix+refactor), Sprint 1 (nav in basso 5 tab, HUD 1 riga,
  safe-area, lessico bonificato, Fraunces+Inter) e Sprint 2 (**Scatta la
  Reina**: riconoscimento bovina on-device con COCO-SSD vendorizzato in
  `public/models/ssdlite`, foto in IndexedDB via `lib/photoStore.ts`).

---

## 1. Stack & convenzioni tecniche

- **React 19 + Vite 6 + TypeScript**, PWA statica.
- **Tailwind v4 con scala slate INVERTITA** (vedi `app/src/index.css`):
  - `slate-950 = #f5f3fb` (superficie più CHIARA) … `slate-100 = #211b3a` (inchiostro più scuro).
  - Numeri alti = chiaro, numeri bassi = scuro. **Non confondersi**: una card "scura"
    in classe (`bg-slate-900`) è in realtà chiara a schermo.
  - Gli shade -100/-200/-300 dei colori d'accento (emerald/amber/blue/…) sono stati
    SCURITI a mano per fare da testo leggibile su superficie chiara.
  - Accento principale = **rosso valdostano `#c8102e`** (`--color-red-650`), classe `.nav-active`.
- **Firebase** (Auth + Firestore): Google one-tap + email/password, offline persistence,
  sync debounced. Config via env `VITE_FIREBASE_*`. Senza config → "local mode" (solo localStorage).
- **Leaflet** API imperativa (NON react-leaflet), tile OSM, marker HTML custom.
- **motion/react** (Framer Motion) per tutte le animazioni.
- **`App.tsx` è un monolite (~3260 righe)**: tutto lo stato è `useState`, persistenza via
  `localStorage`, `AuthGate` lo avvolge esternamente.

---

## 2. Mappa dei file (`app/src/`)

### Infrastruttura
- `lib/firebase.ts` — init Firebase; esporta `auth`, `db`, `firebaseEnabled`.
- `lib/auth.tsx` — `AuthProvider`, `useAuth`, `signInWithGoogle/Email`, `registerWithEmail`, `signOut`, `authErrorMessage`.
- `lib/cloudSave.ts` — `SAVE_KEYS[]`, `backupLocalSave`, `clearLocalSave`, `hasExistingProgress`,
  `loadCloudSave(uid)`, `saveCloudSave(uid)` → Firestore `saves/{uid}`, `updateLeaderboard(uid)` → `leaderboard/{uid}`.
- `components/AuthGate.tsx` — macchina a stati `resolving → login → onboarding → ready`;
  migra progressi localStorage al primo login; `CloudSyncDaemon` (poll 4s, debounce 1.2s, flush su visibilitychange/beforeunload).
- `components/LoginScreen.tsx` — UI login (Google + email).
- `components/Onboarding.tsx` — creazione personaggio 4 step (nome/avatar/valle/Reina starter).
- `data/starters.ts` — 12 valli con bonus monete.

### Combattimento
- `data/combat.ts` — tipi `VatsaType = "corna"|"prato"|"tempesta"|"latte"|"roccia"`.
  - Ciclo super-efficace: corna→prato→tempesta→latte→roccia→(corna). Moltiplicatori: super=**1.5**, poco efficace=**0.7**.
  - **Assegnazione tipo PERCENTILE** (non valore grezzo): il tipo dipende da quale delle 4 stat
    (stazza/corna/testa/grinta) è più alta *relativamente alla distribuzione del dataset*. Dà distribuzione bilanciata.
  - Mosse con nomi comici ("Incornata della Suocera", "Ruttino Erbivoro Tattico", "Föhn Furioso",
    "Spruzzo di Fontina", "Sassata del Cugino", special "Testata Termonucleare", leggendaria "Muggito dell'Apocalisse").
  - `BATTLE_ITEMS`: potion-milk(+60), potion-fontina(+130), buff-genepy(+40 atk), buff-bell(+40 def), energy-grappa(+60).
- `lib/battle.ts` — HP = `round(150 + stazza*0.8 + peso/12 + level*5)`.
  - **Danno a RAPPORTO**: `atk * power * mult * stab * variance * (55/(55+def))` (DEF_K=55). Niente problema "danno azzerato".
  - variance `0.72 + rand*0.56`, crit 12% × 1.6.
  - `buildScaledBoss(reference, visual, type, powerFactor, rarity)` — **rubber-band**: il boss è sempre
    bilanciato rispetto alla Reina del giocatore. **Usa SEMPRE questo per i boss**, mai le stat grezze.
- `data/arenas.ts` — 6 palestre-alpeggio: `herbetet|money|gabiet|predebar|nivolet|tsatsan`,
  ognuna con `powerFactor` (0.88→1.14) e `bossType`. `arenaBoss()` ritorna Reina reale scalata.
- `data/dungeons.ts` — 5 dungeon-castello "Lega delle Reines": Verrès(Lv8), Sarre(Lv10), Fénis(Lv12),
  Issogne(Lv14), Forte di Bard(Lv18). 5 battaglie ciascuno (4 sfidanti + Campione 👑), powerFactor 0.92→1.3.
- `data/mapBattles.ts` — coordinate dei 12 Pastori + 6 palestre sulla mappa.
- `data/opponents.ts` — 12 NPC Pastori con dialoghi (Marco Alpino, Giulia Monti, Beppe "Courba", Yvette la Casara, ecc.).

### UI battaglia
- `components/BattleScene.tsx` — scena Pokémon completa. Giocatore in basso-sx, avversario in alto-dx.
  Direzione affondo: `lungeX = top ? -40 : 40; lungeY = top ? 40 : -40;` (ognuno colpisce verso l'altro).
- `components/DungeonRun.tsx` — gauntlet Lega delle Reines: selezione squadra di 4, HP che si trascina
  tra le 5 battaglie, switch auto su KO + manuale, zaino.

### Visual
- `components/CowVisual.tsx` — priorità: foto reale → illustrazione → avatar procedurale.
  - **Foto reali**: `object-contain` su sfondo neutro gradiente (NON `object-cover`, che tagliava teste/code).
- `components/VatsamonAvatar.tsx` — avatar procedurale SVG.
- `data/illustrations.ts` — risolve illustrazioni per nome/razza.
- Marker mappa in `App.tsx`: `background-size:contain; background-repeat:no-repeat; background-position:center; background-color:#eef1f6;` (anche qui niente crop).

### Fase 4 — Educazione
- `components/RespectEncounter.tsx` — modale educativa NPC (quiz a schermo intero).
- `data/responsibleQuestions.ts` — 10 domande su escursionismo responsabile.
- `respectScore` (0-100, default 50) nel Trainer; chip 🌿 nell'header; se >70 → 25% chance di
  upgrade rarità su spawn selvatici.

### Altro
- `components/QuizScreen.tsx` + `data/quiz.ts` — "Scuola d'Alpeggio".
- `components/Challenges.tsx` — sfide (spostate nel tab "Premi").
- `data/realCows.ts` — dataset bovine reali (`REAL_COWS`, `REAL_TOTAL`, `REAL_CASERE`, `SHOWCASE_BY_RARITY`).
- `data/trails.ts`, `data/routes.ts` — percorsi/sentieri. `lib/geo.ts` — distanze GPS, `RAGGIO_CATTURA`.
- `utils/audio.ts` — `soundEngine` (click/moo/victory/ecc.).

---

## 3. Navigazione / tab

`activeTab: 'map' | 'stagione' | 'scanner' | 'stalla' | 'vatsadex' | 'quiz' | 'premi'`
**NAV IN BASSO (5 tab)**: Alpeggio(map) · Stagione · **Scatta**(scanner, bottone centrale) · Stalla · Libretto(vatsadex). Quiz = card `#quiz-entry` dentro Stagione; Premi = chip `#premi-chip` nell'HUD.
- **Mappa** (`map`): mappa GRANDE in cima (h-460/540), poi selettore percorsi, "Sfide nei dintorni", "Lega delle Reines · Dungeon".
- **Scanner** (`scanner`): genera Vatsamon da foto (Gemini client).
- **Vitelli** (`eggs`): ⚠️ tab da riprogettare (gravidanza, non uova). `id="hatchery-tab-view"` in App.tsx ~riga 2725.
- **Vatsadex** (`vatsadex`): collezione.
- **Quiz** (`quiz`): Scuola d'Alpeggio.
- **Premi** (`premi`): Challenges.
- **Niente tab Palestra** — le battaglie avvengono sulla mappa.

---

## 4. Stato & persistenza

Tutto in `App.tsx` come `useState`, persistito in localStorage con chiavi in `cloudSave.ts → SAVE_KEYS`:
```
vatsamon_collection_go, vatsamon_bag_go, vatsamon_eggs_go, vatsamon_trainer_go,
vatsamon_waypoint_idx, vatsamon_waypoint_progress, vatsamon_active_route_id,
vatsamon_quiz_go, vatsamon_badges, vatsamon_challenges_go, vatsamon_completed_routes,
vatsamon_discovered_cows, vatsamon_onboarded, vatsamon_respect, vatsamon_dungeons
```
- localStorage = cache di sessione; **Firestore = verità**. Migrazione al primo login se ci sono progressi locali.
- Le chiavi legacy `vazzamon_*` vengono migrate una tantum all'avvio da
  `lib/migrateSaveKeys.ts` (copiate, mai sovrascritte); cloud e codici export
  legacy sono normalizzati in lettura.
- ⚠️ Se rinomini `Egg`→`Pregnancy`, valuta se cambiare anche la chiave `vatsamon_eggs_go`
  (consiglio: tieni la chiave o aggiungi migrazione, per non perdere salvataggi esistenti).

---

## 5. Firebase / deploy

- Config in `app/.env.local` (gitignored, NON nel repo). Netlify ha tutte e 6 le `VITE_FIREBASE_*`.
- Dominio autorizzato in Firebase console. Setup documentato in `FIREBASE_SETUP.md`.
- Deploy: merge su `main` → Netlify build automatico. Sito: **vatsamon.netlify.app**.

---

## 6. Decisioni di bilanciamento già prese (NON rifare)

1. Boss d'arena: erano impossibili (stat grezze a 100). Risolto con `buildScaledBoss` rubber-band + difesa a rapporto.
2. Distribuzione tipi: 65/73 mucche erano Roccia/Tempesta. Risolto con metodo percentile.
3. Moltiplicatori tipo: da 2×/0.5× → **1.5×/0.7×**; `effectivenessLabel` usa `>1` / `<1`.
4. Affondo battaglia: entrambi colpivano a sinistra. Risolto `lungeX = top ? -40 : 40`.
5. Foto tagliate: `object-cover` → `object-contain` + sfondo neutro (sia CowVisual sia marker mappa).
6. Tarato con **30.000+ battaglie simulate** in Node per le costanti di combattimento.

---

## 7. ⚠️ TASK APERTO PRIORITARIO — Sistema gravidanza (non uova)

**Richiesta utente (testuale):**
> "le reines sono mucche quindi non fanno uova e devi trovare altra soluzione piu verosimile"
>
> "Concentrati sul migliorare la stalla in cui i vitelli nascono e crescono. Servirebbe un
> sistema studiato che ci metta piu tempo per schiudere. Sarebbe carina un'animazione per la
> nascita quando avviene, insomma ragiona a renderla interattiva e bella come fosse un vero gioco stile pokemon"

**Cosa fare:**
1. **`types.ts`**: rinomina `Egg` → `Gestazione`/`Pregnancy`. Aggiungi campo `stage`
   (`'incinta' | 'vicina' | 'parto'`). Aumenta i km richiesti (gestazione = più lunga):
   suggerito Comune=10, Rara=20, Epica=35, Leggendaria=50 km. (Oggi: Comune=2, Epica=5 → troppo corti.)
2. **`HatchScene.tsx`**: riscrivi TUTTO il copy "uovo/schiusa" → "gravidanza/parto/vitellino".
   Animazione: mucca nella stalla → tremore → flash → vitellino rivelato con scheda stat.
   (Il file esiste già ma usa 🥚 e "L'uovo si sta schiudendo!" — da sostituire.) NB: oggi NON è
   importato in App.tsx; l'overlay nascita inline è ~riga 3232 (`hatchingEgg`).
3. **`App.tsx`**:
   - stato `eggs`/`setEggs` (~riga 197) e default (`egg-1`, `egg-2`).
   - `hatchingEgg`/`setHatchingEgg` (~riga 861).
   - `triggerEggHatching` (~riga 1199) → rinomina `triggerBirth`, copy aggiornato (oggi dice "Schiusa da un raro uovo montano").
   - `handleSimulatedWalk` (~riga 1110): incremento km gestazione (`distanceStep` 0.5) + check parto (~riga 1122-1139).
   - Tab `eggs` UI (~riga 2725-2802): "Culla dei Vitellini" con provette di vetro 🍼 → ridisegnare come
     **Stalla** con mucche incinte a stadi diversi, barra gestazione, azione interattiva "coccola"/visita con cooldown.
   - Overlay nascita inline (~riga 3232): emoji 🍼🐮🍼 e "LIETO EVENTO" — sostituire con scena parto (idealmente usando `HatchScene`).
4. Build (`npm run build`) + verifica + commit + merge su main.

**Approccio consigliato stadi:** `incinta` → `vicina al parto` → `parto`. Azione "coccola/visita"
con cooldown che dà un piccolo boost. Animazione parto: mucca trema → flash → vitellino con stat.

---

## 8. Altri task in sospeso / minori

- **Polish per-schermata**: un sub-agent parallelo si era bloccato su un permesso (0 commit). Il
  riordino mappa è stato fatto a mano; il polish dettagliato schermo-per-schermo non è completo al 100%.
- Quando avvii sub-agent: **non lasciarli bloccati su prompt di permesso** — vanno monitorati.

---

## 9. Workflow git (regole imposte)

- Sviluppa su `claude/pokemon-go-mobile-game-8IkzM`. Commit chiari. Push con `git push -u origin <branch>`
  (retry x4 con backoff 2/4/8/16s solo su errori di rete).
- **NON** creare PR se non esplicitamente richiesto.
- Per il deploy: merge su `main` (Netlify build automatico) — fatto in passato su richiesta utente.
- I commit messaggi sono in italiano, formato `tipo(scope): descrizione` (vedi `git log`).

---

## 10. Riferimenti

- Transcript pre-compattazione (se servono dettagli esatti): `/root/.claude/projects/-home-user-vatsamon/`
- Altri doc storici nel repo: `STATO_ATTUALE.md`, `MERGE_PLAN.md`, `FIREBASE_SETUP.md`, `AUDIT_PROGETTO.md`.
</content>
</invoke>
