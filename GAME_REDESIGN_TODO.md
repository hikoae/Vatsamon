# Vatsamon Redesign — TODO / blocchi rimandati

Stato avanzamento dell'implementazione di [`GAME_REDESIGN.md`](GAME_REDESIGN.md).

## 🔴 Bloccante rimandato (su richiesta) — DATI FOTO/DATASET
Da affrontare prossimamente. Per ora il gioco usa l'illustrazione per razza come
fallback di prima classe e il badge [REALE] vale sul pedigree, non sulla foto.
- [ ] **38/73 bovine senza foto** → reperire/autorizzare le foto mancanti.
- [ ] **Foto "uso da autorizzare"** (Dossier §13) → ottenere liberatoria prima di
      usarle in carte condivisibili / QR. Finché non autorizzate: export e
      condivisione usano SOLO illustrazioni originali, mai le foto del calendario.
- [ ] **Razze**: 71 Castana / 2 Pezzata Rossa / 0 Pezzata Nera / 0 Hérens →
      arricchire con Pezzata Nera e Hérens reali per riattivare le meccaniche
      razza-dipendenti (oggi declassate a flavor).
- [ ] **Copertura comuni**: 8/15 comuni-gara senza bovine; 53/73 in comuni fuori
      calendario → arricchire o mantenere il disaccoppiamento zona/comune-gara.
- [ ] **Campionesse storiche** (Falchetta, Suisse, Bandit, Sirène) come record
      completi nel dataset + alias case-insensitive in `reinaByName`.

## ✅ Fatto (testato + committato)
- [x] Piano di redesign (`GAME_REDESIGN.md`).
- [x] **Stalla genealogica** (sostituisce le uova): monta con tori, gravidanza
      come cura, nascita del moudzon con ereditarietà, crescita a stadi. (10/10 test)
- [x] **Restyling grafico moderno** (vetro, profondità, micro-interazioni).
- [x] **Scanner → "Riconoscimento d'Alpeggio"** (via DNA sci-fi; razze/nomi reali,
      avvistamento onesto).
- [x] **Coerenza overworld + combattimento**: razze/nomi selvatici reali,
      nomi-mossa ripuliti dagli eccessi.

- [x] **Combattimento incruento** (Tenuta/spinta/"cede e si ritira") in
      BattleScene + DungeonRun. *(reskin sicuro; la UI push-meter completa resta sotto)*
- [x] **Retention — "Il Giro di Stalla"**: streak giornaliero + 3 missioni daily
      deterministiche (tab Premi). (6/6 test) — **LIVE su main**

- [x] **"La Spinta" — push-meter (BattleScene)**: barra di spinta + fiato + calma +
      4 azioni allevatore; motore puro `lib/spinta.ts`. Mappa/arene. — **LIVE** (suite verde)

- [x] **"La Spinta" — conversione DungeonRun** (Lega delle Reines): gauntlet a
      push-meter completo (fiato che si trascina, calma simmetrica, risoluzione a
      tempo → nessuno stallo). Bilanciamento curva boss (campione 1.15→1.31).
      Test: simulatore + run E2E Playwright (squadra normale e max conquistano
      Verrès con gioco adattivo; forzare perde). Suite verify verde.

## 🟡 Prossimi (blocchi grandi, da fare dedicati e testati a fondo)
- [ ] **Cattura → Anagrafe** completa (3 gesti di valutazione + affidamento sulla mappa).
- [ ] **Economia 2 valute + Gradi Amis des Reines** + motore di fase `faseCorrente()`
      (invasivo: tocca trainer/HUD/ricompense).
- [ ] **Classifiche read-only** (leaderboard già scritta in cloudSave, mai letta) + condivisione carte.
- [ ] **Mappa/fase + spawn per zona + trail con avatar/milestone**.
- [ ] **Refactor `App.tsx`** (3300+ righe) in moduli (abilitante, non visibile).

## ⏭️ Fase backend (Firebase)
- [ ] Leghe d'Alpeggio · push FCM · validazione timer server-side · vision razza.
