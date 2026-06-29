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

## ✅ Fatto
- [x] Piano di redesign (`GAME_REDESIGN.md`).

## 🟡 In corso / prossimi (ordine del piano)
- [ ] **Stalla genealogica** (sostituisce le uova): monta con tori, gravidanza
      come cura, nascita del moudzon con ereditarietà, crescita a stadi.
- [ ] **Battaglia "La Spinta"** (incruenta, barra di spinta + fiato + calma).
- [ ] **Cattura → Anagrafe** (affidamento; veloce per i comuni, piena per le rare).
- [ ] **Economia 2 valute + Gradi Amis des Reines** + motore di fase `faseCorrente()`.
- [ ] **Mappa/fase + spawn per zona + trail con avatar/milestone**.
- [ ] **Retention statico** (daily seed, streak, classifiche read-only, condivisione).
- [ ] **Refactor `App.tsx`** (3284 righe) in moduli.

## ⏭️ Fase backend (Firebase)
- [ ] Leghe d'Alpeggio · push FCM · validazione timer server-side · vision razza.
