# Vatsamon v1.5 — "La Stagione Vera"

> Esito del briefing del 02/07/2026: 28 idee generate da analisi multi-agente,
> 20 promosse dal vaglio avversariale (autenticità sul dossier + fattibilità
> statica + divertimento), convergenti su 6 pilastri. Decisioni confermate:
> combat redesign completo · tutti i pilastri · gravidanza come requisito vero
> (solo tornei ufficiali) · pacchetto zaino+negozio+patois completo.
> Fonte di verità: `materiali/BATAILLES_DOSSIER.md`. SOLO fatti verificati.

## Scoperte chiave dell'analisi (guidano il design)

- **Il layer Pokémon è già morto nel codice**: tipi elementali e mosse
  (DMG/accuracy/Adrenalina) non hanno NESSUNA tabella di efficacia — solo
  grafica su CowCard. Il motore vero è solo La Spinta. Rimuoverli costa ~0.
- **Il peso reale non entra mai in battaglia** (`peso_kg` finisce solo nel
  campo morto maxHp); i boss sono rubber-band su TUA Reina → progressione
  irrilevante; matchmaking per livello allenatore, mai per categoria.
- **Strategie dominanti**: spam Gira con vantaggio presa; tartaruga fino al
  timeout (16 turni). "Ritìrati" = rage-quit gratis senza sconfitta.
- **Item bugiardi**: 5 item collassano in 2 effetti (fiato/calma) con
  descrizioni false; usare un item non consuma il turno del timeout.
- **season.ts è un'infrastruttura ricca già pronta** (CALENDAR 2026 reale,
  bracketSeeds/buildRounds, ALBO_DORO, LEGGENDE) usata solo per i pronostici.

---

## S3.1 — Combat: "Condurre, non forzare" (fondazione di tutto)

**Fatto**: Dossier §1 — incruento, corna limate, "l'allevatore conduce ma non
forza", vince chi fa desistere l'avversaria (istinto gerarchico).

Riscrittura di `lib/spinta.ts` + `BattleScene.tsx`:
1. **Scambi con tell**: ogni round l'avversaria TELEGRAFA l'intenzione con un
   tell testuale/visivo ("scalpita" → Incalza · "punta le zampe" → Reggi ·
   "cerca il fianco" → Gira · "soffia" → riprende fiato). Il giocatore sceglie
   la risposta; si risolve lo scambio. **Vinci leggendo l'animale.**
   Affidabilità del tell 70–90% scalata dal **Rispetto** (chi rispetta gli
   animali li sa leggere: il valore diventa vantaggio meccanico).
2. **Triangolo di counter**: Incalza batte Incoraggia (interrompe il recupero)
   ma è dimezzato da Reggi (che contro-guadagna); Gira aggira Reggi (pieno +
   bonus) ma contro Incalza frontale perde terreno. Niente più mossa dominante.
3. **Peso = massa**: `massa` derivata da `peso_kg` relativo alla categoria
   (non più dalla stat astratta def). La stazza conta, ma dentro la categoria.
4. **Fine rubber-band**: boss/avversarie con stat ASSOLUTE ancorate alle
   REAL_COWS della stessa categoria; allenare la Reina torna a valere.
5. **Tie-break di condotta**: al limite scambi vince chi ha condotto meglio
   (fiato ×0.3 + calma ×0.25): la pazienza paga il doppio di prima.
6. **Ritirata onesta**: "Ritìrati" = sconfitta dichiarata (confirm), niente
   rage-quit gratis. Item usati consumano lo scambio.
7. **Via il layer morto**: rimozione VatsaType/moveset/typeMultiplier residui;
   `CowCard` mostra **categoria+peso per fase, palmares, condotta** invece di
   mosse DMG. (I nomi comici delle mosse spariscono: erano già solo testo.)

Test: unit-sim (1000 scambi: nessuna azione vince >45% da sola), E2E battaglia
con tell visibile, rage-quit conta sconfitta.

## S3.2 — La Stadera (peso strategico per fase)

**Fatto**: Dossier §3 tabella verificata — soglie che SALGONO per fase
(primaverili ≥571/521–570/≤520 · estive ≥591/… · autunnali ≥601, ultimi 3
≥611 · **finale ≥631/581–630/≤580**); §0.3 mai mostrarle senza fase+anno.

- `data/pesa.ts`: `SOGLIE_PER_FASE` complete + `categoriaCorrente(peso, fase)`.
- Il peso della Reina è VIVO: cresce con razioni (Denari) e con l'Arp; la
  categoria si ricalcola alla pesa di ogni iscrizione (rito della stadera).
- Fix `generate.ts` (soglie estive hardcoded spacciate per fisse).
- UI: pannello stadera nella scheda ("575 kg → 1ª cat. in primavera, 2ª
  d'estate: falla crescere o cambia strategia").

## S3.3 — Lo Sac du Berger (vigilia, zaino, negozio)

**Fatto**: Dossier §1 — corna limate (garanzia d'incruenza); premi reali =
Bosquet (mécro) + sonnaille + collare in cuoio; §10 mécro=bosquet in patois.
Nota naming: il glossario NON ha una voce patois per "zaino" → si usa il
francese **Lo Sac du Berger** (da validare con l'associazione, non si inventa
patois).

- **Vigilia** pre-torneo: schermata di preparazione — pesa → scegli max 3
  oggetti dal Sac → **rito della limatura delle corna** (gesto obbligatorio
  che sblocca l'ingaggio, insegna l'incruenza) → si combatte.
- **Item onesti e distinti** (rework `BATTLE_ITEMS`/`overworld.ts`): ognuno un
  effetto chiaro su fiato/calma/presa/massa temporanea, descrizioni vere.
- **Negozio alla Casera**: i Denari finalmente si spendono (item, razioni);
  **mercato della désarpa**: pezzi di prestigio in Fontina.
- **Trofei collezionabili**: vincere una tappa dà mécro/sonnaille/collare
  della tappa (bacheca nel Profilo), non monete generiche.

## S3.4 — L'Éliminatoire du Dimanche (feature faro)

**Fatto**: Dossier §4 calendario 2026 (15 eliminatorie + finale Croix-Noire
25/10, 69ª ed.), già in `season.ts`; §10 eliminatoria = eliminazione diretta;
§0.4 Reine des Reines = 1 per categoria.

- Ogni tappa del CALENDAR diventa **giocabile**: iscrivi UNA Reina (pesa →
  categoria; gravidanza richiesta, v. S3.6), tabellone a 8 a eliminazione
  diretta (riusa `bracketSeeds`/`buildRounds`), avversarie = REAL_COWS della
  stessa categoria a stat assolute.
- **Grazia anti-FOMO**: la tappa si apre la sua domenica e resta giocabile
  fino alla successiva; le passate restano come "memoriale" rigiocabile senza
  timbro. Il timbro "della domenica" (giocata nel giorno vero) vale il trofeo
  autentico.
- Vincere la finale del 25/10 iscrive la Reina nell'**albo personale** accanto
  all'albo d'oro reale (3 titoli, uno per categoria).
- Entry: card evento nella tab Stagione + banner fase.

## S3.5 — L'Arp: inarpa → désarpa

**Fatto**: Dossier §1 pausa reale giugno–luglio (fase attuale!); §10 glossario
inarpa (metà giugno) / désarpa (29/9) / arp (alpeggio, lega alla Fontina DOP);
Reine des cornes (fiori rossi, la più combattiva) e Reine du lait (fiori
bianchi, la più produttiva) = titoli di désarpa della mandria.

- Durante la fase `inalpa` si mandano capi **all'Arp**: bloccati per monta e
  tornei, 1 gesto di cura al giorno reale → +peso e produzione Fontina
  (dell'alpeggio collettivo). Streak con grazia del maltempo già esistente.
- **Cerimonia della Désarpa (29/9)**: una volta l'anno, sfilata della mandria
  e doppia premiazione DELLA TUA stagione: Reina di corne (più vittorie) e
  Reine du lait (più produzione all'arp) + consolidamento Stelle di Pedigree.

## S3.6 — Crescita in stalla + gravidanza-requisito

**Fatto**: requisito gravidanza ≥3 mesi (estive) / ≥4 mesi (autunnali). NB: il dossier
NON spiega il perché della regola → in gioco si enuncia la regola senza
inventare motivazioni.

- **Crescita per stadi** dei capi nati in stalla: i giovani maturano fino a
  Reina adulta e non possono fare da madri prima dell'età prevista.
- **Gravidanza per-capo** (via singleton): più gravidanze parallele; una Reina
  con gravidanza ≥ soglia della fase è iscrivibile ai tornei ufficiali. I
  Pastori sulla mappa restano allenamento libero. Messaggio del veterinario
  che enuncia la regola reale (senza motivazioni inventate).

## S3.7 — Il patois giocato

**Fatto**: Dossier §10 glossario verificato IT/FR/patois (12 voci).

- Le parole si GUADAGNANO compiendole: prima nascita → "modzon", prima salita
  all'alpe → "inarpa", primo trofeo → "mécro", cerimonia → "dézarpa"…
- Una volta sbloccata, la parola patois sostituisce il termine italiano
  nell'UI (con tooltip IT/FR). Raccolta visibile nel Profilo.

## S3.8 — L'Albo delle Leggende (stretch)

**Fatto**: Dossier §5 — Falchetta (Rosset, Nus) 4 titoli 3ª cat 2022–25;
Sirène (Vierin) 1966–69 record >55 anni; Suisse (Arvier) bicampionessa.
Scenari-sfida contro le campionesse ricostruite (profili IA distinti,
obiettivi di condotta) → cartoline storiche coi soli fatti dell'albo.
I profili IA sono dichiarati come interpretazione di gioco, non come fatto.

---

## STATO (02/07/2026)

S3.1 ✅ combat tell+counter+peso · S3.2 ✅ stadera · S3.3 ✅ sac/vigilia/bottega
· S3.4 ✅ éliminatoire · S3.5 ✅ arp/désarpa · S3.6 ✅ crescita+gravidanza ·
S3.7 ✅ patois giocato · S3.8 ✅ Albo delle Leggende (Falchetta/Sirène/
Suisse + cartoline storiche) · icone PWA col monogramma araldico ✅.
V1.5 COMPLETA. Ogni sprint: suite Playwright verde + E2E dedicato.

## Ordine di esecuzione e criteri

S3.1 → S3.2 → S3.3 → S3.4 → S3.5 → S3.6 → S3.7 → (S3.8).
Ogni sprint: typecheck strict + build + suite `verify.mjs` estesa + test E2E
dedicato + commit. Paletti invariati (GAME_REDESIGN §6): incruento, niente
FOMO/loot-box, mai patois/tradizioni inventate, tutto client-side statico.
