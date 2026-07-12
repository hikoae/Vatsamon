# Vatsamon — v1.6 · Le novità in breve

> Testo pronto per annunciare la nuova versione (sintesi a grandi linee),
> con in coda il dettaglio tecnico e le azioni manuali post-deploy.

**Vatsamon esce dal single-player: sfide online tra allevatori e il ponte col mondo reale delle Batailles.**
Questa versione porta il PvP in Piazza, i risultati ufficiali di gara, la schedina pronostici su ogni tappa e un motore di combattimento più tattico.

## ✨ Le novità principali

- **Sfide online tra allevatori (la Piazza)** — Crea una sfida con un codice e falla accettare a un altro allevatore: partite **live** o **per corrispondenza** (una mossa quando vuoi, entro la scadenza del turno), **rivincita** a fine incontro, badge sul tab Stalla quando tocca a te, telecronaca delle mosse. Ricompense solo cosmetiche: la Piazza è per l'onore.
- **Risultati veri delle tappe** — I vincitori del Calendario non sono più un calcolo interno spacciato per dato reale: ogni vincitore porta il badge **UFFICIALE** (risultato di gara pubblicato) o **SIMULATO** (proiezione del gioco). Gli UFFICIALI si pubblicano da un tab Admin riservato.
- **Schedina pronostici a ogni tappa** — Prima di ogni eliminatoria puoi pronosticare la vincitrice di ogni categoria (finestra chiusa il giorno di gara). Lo scoring avviene **solo contro il risultato ufficiale**, mai contro il simulato.
- **La tua Reina del cuore** — Segui una Reina reale: **storico stagione** (apparizioni e vittorie), **banner** quando gareggia oggi o domenica, e **bonus one-shot in gioco** se vince davvero la sua categoria in un risultato ufficiale.
- **Combattimento più tattico** — **Terreni per arena** (simmetrici, per entrambi i lati), **approccio d'ingaggio** pre-match solo in Arena (Naturale / Riscaldata / Condotta a Voce), **forma stagionale** dall'Arp (piccolo bonus cappato ad agilità/volontà dopo la cura all'alpe), Désarpa in calendario e **indole delle avversarie sfumata per fase** di stagione.
- **App più veloce e leggera** — Code-splitting delle scene pesanti, chunk vendor separati, precache PWA -78%, first-load JS -50%. Modale **Novità di versione** al primo avvio dopo un aggiornamento (+ storico nel Profilo), bottone **Esci dall'account** con flush del salvataggio cloud, crash-safety (ErrorBoundary, backup pre-ripristino, modali custom).

## 🔧 Dettaglio tecnico (per chi mantiene il progetto)

### PvP online (S8–S9 + rifiniture)
- `firestore.rules`: collection `pvpChallenges/{code}` (capability-code, mai list) e `pvpMatches/{matchId}` + subcollection `moves` append-only. Regole hardened: binding match↔challenge, fighter congelati alla challenge, turno obbligato con toggle, floor/ceiling su `turnDeadline`, fiato avversario immutabile, esito legato alla sua condizione terminale (giudizio di condotta replicato da `lib/spinta.ts`). GC lazy dei match `finished/abandoned` >30gg.
- `app/src/lib/pvp.ts`: layer transazionale client (create/accept/submitMove/claimTimeout/abandon/listMyMatches/subscribeMatch); `buildPvpView` inverte la vista per p2. Zero modifiche a `lib/spinta.ts`.
- `firestore.indexes.json`: indice composito `playerUids array-contains + updatedAt desc`.
- Test rules: `tests/rules/rules.test.js`, 72/72 PASS su Firestore Emulator (richiede JDK).

### Risultati ufficiali + pronostici + ponte realtà (S11–S13)
- `firestore.rules`: collection `risultati/{eventId}` — lettura pubblica, scrittura solo allowlist admin (placeholder `__ADMIN_UID__`, vedi azioni post-deploy), delete sempre negato.
- `app/src/lib/risultati.ts`: cache bulk in memoria + `setRisultato`; `ADMIN_UIDS` lato client (solo gating UI del tab Admin).
- `data/season.ts` `winnersFor()`: prima il risultato reale, fallback simulato sempre marcato `{simulato: true}`.
- Pronostici per tappa: `poolPronosticoTappa`/`tappaPronosticabile`/`esitoPronosticoTappa` (`data/eliminatoire.ts`), chiavi `vatsamon_pronostici_tappa` + `vatsamon_pronostici_scored` in `SAVE_KEYS`.
- Reina del cuore: `buildStorico`/`computeFollowBanner`/`computeRealtaBridgeRewards` (funzioni pure, DI su `winnersLookup`), idempotenza via `vatsamon_risultati_seen`.

### Motore combattimento (S16–S18)
- Terreni: `TerrainEffect` + `TERRAIN_MODS` in `lib/spinta.ts`, applicati simmetricamente; `undefined` = comportamento storico bit-identico.
- Approccio d'ingaggio: `opts.approccio` in `initSpinta`, solo `battle.kind === "arena"`; bonus ritarati via gate `scripts/sim-spinta.ts` (nessun approccio dominante).
- Forma stagionale: `lib/condizione.ts` (`condizioneDaArp`), bonus cappato max 4 solo agi/volontà, solo giocatore.
- RNG seedabile `mulberry32` in `lib/spinta.ts` + `scripts/test-determinismo.ts` (50 seed).

### Piattaforma
- Performance: `React.lazy` sulle scene pesanti, `manualChunks` vendor, PWA precache 8594→1925 KiB, first-load 420→~211 KiB gzip.
- Novità di versione: `data/changelog.ts` (la entry deve combaciare con `package.json` version — check in CI), `__APP_VERSION__` da `vite.config.ts`, `WhatsNewModal` + link nel footer del Profilo.
- Affidabilità: ErrorBoundary root, backup pre-reset/import, SW `registerType: prompt` con applicazione in idle, `ConfirmDialog` al posto di alert/confirm nativi.
- CI: typecheck + build + lint + check changelog su version bump (`.github/workflows/ci.yml`); GitHub Pages dismesso, deploy solo Netlify.
- Refactor: `OverworldMapView`, `CaptureScreen`, `ProfileModal` estratti da `App.tsx` (-729 righe), zero cambi di comportamento.

## ⚠️ Azioni manuali post-deploy (operatore)

Il deploy Netlify pubblica **solo il client**. Le Firestore rules NON si deployano da sole:

1. **Pubblicare `firestore.rules` aggiornate** sul progetto Firebase (console → Firestore → Regole, incollando il file versionato in root, oppure `firebase deploy --only firestore:rules,firestore:indexes` con firebase-tools autenticato). Senza questo passo il PvP online e i risultati ufficiali NON funzionano in produzione (le collection `pvpChallenges`/`pvpMatches`/`risultati` cadono sul deny-by-default).
2. **Sostituire il placeholder admin con l'uid reale** (TODO G7), in DUE punti che devono restare allineati:
   - `firestore.rules` → funzione admin: `request.auth.uid in ["__ADMIN_UID__"]` → mettere l'uid Firebase dell'operatore (e ri-pubblicare le rules);
   - `app/src/lib/risultati.ts` → `export const ADMIN_UIDS: string[] = []` → stesso uid (gating UI del tab Admin; richiede un commit + deploy client).
   Finché restano i placeholder, nessuno può pubblicare risultati ufficiali: il Calendario mostra solo badge SIMULATO (comportamento sicuro, non un bug).
3. *(Consigliato)* Rieseguire `tests/rules` (`npm test` in `tests/rules/`, richiede JDK per l'emulator) dopo la sostituzione dell'uid, prima di pubblicare le rules.

*Grazie per giocare e diffondere la tradizione delle Batailles de Reines!*
