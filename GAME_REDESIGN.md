# Vatsamon — Piano di Redesign del Gioco

> Da clone-Pokémon *system-rich / content-poor* a **simulatore di reputazione da
> allevatore ancorato al calendario reale delle Batailles de Reines**.
> Esito di un audit multi-agente del codice + design dei sottosistemi + critica
> avversariale + sintesi da game director. Dati di riferimento verificati in
> [`materiali/BATAILLES_DOSSIER.md`](materiali/BATAILLES_DOSSIER.md).
>
> **Questo è un piano, non un'implementazione.** Nulla è stato modificato nel gioco.

---

## 0. In una frase

Il giocatore non "cattura mostri": è un giovane accolto negli **Amis des Reines** che
**conosce → si fa affidare → conduce → onora la stagione**. Un solo core loop tiene
insieme i sottosistemi tramite **il ciclo di vita della Reina** e un **motore di fase**
unico, agganciato al calendario vero 2026 (marzo → finale Croix-Noire 25/10).

Principio **non negoziabile**: combattimenti **incruenti** (corna limate, l'allevatore
*conduce ma non forza*). Zero violenza, zero IAP/loot-box, zero FOMO predatorio.

---

## 1. ⚠️ Il problema-dati (va risolto PRIMA di ogni meccanica)

L'audit ha verificato `vatsadex.json`: il design "ricco" si rompe sul dataset attuale.

| Fatto verificato | Impatto |
|---|---|
| 73 bovine totali, **finite** | il giocatore le esaurisce in poche sessioni → loop a vuoto |
| **71 Castana, 2 Pezzata Rossa, 0 Pezzata Nera, 0 Hérens** | "indovina la razza" ed ereditarietà cross-razza sono **vuoti** |
| **38/73 senza foto** | metà delle carte [REALE] perde l'asset emotivo |
| Foto "ritagliate dal calendario — **uso da autorizzare**" (Dossier §13) | condivisione carte / QR = **rischio legale**, non asset |
| **8/15 comuni-gara hanno 0 bovine**; 53/73 vivono in comuni **senza** eliminatoria (es. Falchetta a Nus, fuori calendario) | "spawn ecologico per comune" + geofence rendono gran parte del Dex **irraggiungibile** |
| 11 Leggendarie + 11 Epiche, **0 Comuni** | la "scarsità" promessa è falsa; inflazione di rarità |

**Decisione (director): "i dati sono un deliverable, non un dettaglio" — approccio ibrido
*arricchisci il minimo + rendi tollerante il resto*:**
1. **Disaccoppiare** "comune di residenza" (34 valori reali) da "comune-tappa" (15): spawn sulle zone reali tutto l'anno; il geofence-gara è un **bonus** nelle finestre. Fallback dichiarato "Reines della zona". Test che fallisce se un comune-gara ha 0 reine raggiungibili.
2. **Arricchimento mirato minimo**: aggiungere i record completi delle **campionesse storiche** (Falchetta, Suisse, Bandit, Sirène) — sono il bottino aspirazionale, devono esistere — + alias case-insensitive (`FARCHETTA → Falchetta`).
3. **Razze**: finché il dataset ha 1 sola razza reale, **declassare a *flavor*** le meccaniche razza-dipendenti (il "quiz razza" diventa "indovina mantello/categoria a occhio"). Le 2 Pezzata Rossa: flaggate ed **escluse dal pool gara**.
4. **Foto**: il badge **[REALE] premia il pedigree, non la foto**. Le 38 senza foto usano **l'illustrazione per razza come fallback di prima classe**. Condivisione/QR: **solo illustrazioni originali** col watermark, **mai** le foto del calendario.

---

## 2. Il core loop e la retention

**Il Giro di Stalla (daily, 3–8 min):** apri → il mentore *Mémé* ti dà il polso della
**fase reale** → **3 missioni daily** (seed-del-giorno, filtrate per fase) → **1 azione di
scoperta o cura** → **streak "Giorni in Alpeggio"** con *grazia del maltempo* (saltare un
giorno congela, non azzera).

**Tre cicli annidati:**

| Ciclo | Durata | Hook | Payoff |
|---|---|---|---|
| Breve | 3–8 min | Giro di Stalla, missioni, streak | completamento + crescita visibile |
| Medio | settimanale | Sfida della Domenica (= eliminatoria reale della settimana) + cura di **una** Reina | la "tua" Reina sale verso la finale |
| Lungo | stagionale mar→ott | Cammino verso la Croix-Noire, pronostici che si chiudono il 25/10 | climax reale + désarpa che consolida l'Albo d'Onore |

**Perché tiene attaccati senza essere predatorio:** il ritmo **non è inventato per
fidelizzare, è il calendario vero**. Tetto giornaliero implicito (3 missioni): finito il
giro, il gioco ti lascia andare. La **classifica headline è il RISPETTO**, non il grind.

---

## 3. La spina dorsale: il ciclo di vita della Reina + il motore di fase

Difetto attuale: i sottosistemi sono **silos giocati una volta**. Si legano con **un'unica
fonte di verità** sui dati e **una sola fase stagionale condivisa**.

```
AVVISTAMENTO ──(riconosci + valuta + AFFIDAMENTO dall'allevatore)──▶ REGISTRATA (Anagrafe)
      │                                            │
 [moudzon / procedurale = riempitivo]    ┌─────────┴─────────┐
                                         ▼                   ▼
                              SCHIERABILE (gara)        MADRE (Stalla, con TORO)
                               gate: gravida ≥3-4 mesi    │ gravidanza
                                         ▼                ▼
                                    VINCENTE ──▶ titolo   NASCITA moudzon ─▶ cresce ─▶ REINA
```

- **Un solo set di dati** governa tutto: `stats4` (valutazione cattura = genetica ereditaria
  = leve di battaglia), `peso_kg`/`categoria` (matchmaking + accrescimento), `isPregnant`
  (gate iscrizione gare). Niente più stat parallele tra sottosistemi.
- **Motore di fase unico** `faseCorrente(oggi, CALENDAR)` alimenta TUTTI i sistemi.
  **Finestre canoniche (fine ai 3 valori contraddittori):**
  - **Pausa GARE eliminatorie**: 01/05 → 01/08 (da `season.ts`).
  - **Alpeggio fisico** (casere aperte): inalpa metà giugno → **désarpa 29/9**.
  - Sono **due cose diverse**: la désarpa fa *scendere* gli animali → **riapre** le gare di
    fondovalle (Châtillon 4/10, Gressan 11/10, finale 25/10).

---

## 4. I sottosistemi ridisegnati

### 4.1 Cattura & Scanner → "Riconoscimento e Affidamento della Reina"
**Concept:** si abbandona "lancia la ball + DNA scanner sci-fi". Si **riconosce**, si
**valuta** come un giurato, ci si **avvicina con calma** (campanaccio/sonnaille) e
**l'allevatore reale te la affida** registrandola nell'**Anagrafe** (il Vatsadex diventa il
*Libretto di Mandria*). Spunto da CatchCat (foto → carta) ma **originale**: il giocatore fa
il **giudice di Bataille**.

**Meccaniche chiave:**
- **Riconoscimento** (sostituisce il DNA random): classifichi la foto. *Fix dati:* con 1 sola
  razza reale, si valuta **mantello/categoria a occhio**, non la razza.
- **Valutazione a gesti** (cuore interattivo, sostituisce il throw-gauge): traccia la
  **stazza** (drag sul dorso), conta le **corna a corna limate** (rhythm-tap), sostieni lo
  **sguardo** (press-and-hold). Ogni gesto dà un'**accuratezza 0–100** che *genera le stat
  reali* (no inflazione: restano legate al peso/categoria).
- **Avvicinamento col campanaccio** (sostituisce ball+wobble): tilt/tap a ritmo per
  tranquillizzare; il **Fieno delle Vette** si offre una volta (nutri, non costringi). Se
  ti avvicini male, la Reina **si allontana** (riprovi), non "game-over".
- **Stat-sheet trasparente** + **Carta Anagrafe** (foto reale o illustrazione, nome patois
  reale, comune, allevatore, categoria di peso per fase, badge **[REALE]/[AVVISTAMENTO]/
  [VISTA DAL VIVO]**).
- **QR alle gare reali** = via "pura" per le campionesse (non droppano random).
- **Fix critica (alta):** l'estetica "Reina selvatica nella nebbia" è un residuo wild. Va
  allineata all'**affidamento**: la Reina appartiene a una mandria, **l'allevatore appare e
  decide** se affidarti la scheda.
- **Fix critica (media):** **cattura differenziata** — moudzon comuni = **tap singolo ~5s**;
  Reine reali rare = i 3 minigiochi come **evento speciale**. Non 40s a ogni incontro.
  DeviceMotion sempre con **fallback tap di pari dignità**.

**Prima → Dopo:** DNA random `generateVatsamonClient()` → Riconoscitore che matcha una Reina
reale o genera un **[AVVISTAMENTO] dichiarato**; "mela per calmare" + ball lanciata → Fieno
offerto + campanaccio (autentici, incruenti).
**Fattibilità:** statico (gesti = touch/Framer Motion; campanaccio = DeviceMotion+fallback;
QR = deep-link HMAC con chiave nel bundle = anti-cheat "ragionevole", non forte). Vision
reale per la razza = backend opzionale (fuori MVP).

### 4.2 Stalla & Allevamento → addio uova, sì genealogia
**Concept:** si **eliminano le uova** (irrealistico). La Stalla diventa l'allevamento:
**monta (con un TORO) → gravidanza (cura quotidiana) → nascita del moudzon → crescita
(manza→giovenca→reina)**. La genetica è il cuore: il vitello **eredita le 4 stat reali** come
media pesata dei genitori ± varianza, modulata da cura, alpeggio e Rispetto.

**Meccaniche chiave:**
- **Monta**: selezioni una **madre** (Reina della collezione) e un **TORO** di razza.
- **Fix critica (alta):** il padre è **SEMPRE un toro** (registro Libro Genealogico
  ANABoRaVa / IA), **mai una Reina**. Serve una nuova entità "tori" — *correzione biologica
  fondamentale del design originale*.
- **Ereditarietà**: `stat_vitello = 0.45·madre + 0.35·toro + 0.20·ambiente ± 8%`; pedigree
  (motherId, fatherId, generazione); linee pure su 3 gen → badge "Linea di Sangue Nobile".
- **Gravidanza** = barra che avanza con **azioni di cura quotidiane** (non km), su tempo
  reale. **Fix critica (media):** primo ciclo **compresso (2–3 giorni)** per dare il payoff
  prima dell'abbandono, poi si allunga.
- **Gravidanza = gate gare** (Fix critica media): per **competere** una reina dev'essere
  gravida (≥3 mesi estive / ≥4 autunnali) → diventa tatticismo (gestazione vs calendario).
- **Alpeggio** (inalpa→désarpa): potenzia stazza/grinta, accelera la crescita, nobilita il
  latte.
- **Fix critica (media):** **mungitura ≠ combattimento**. Il latte/Fontina viene dalla
  mandria **da-latte** (Pezzata Rossa) o dall'alpeggio collettivo, **non** dalle reine da
  bataille gravide. Due percorsi separati della stessa azienda.
- **Nascita**: riusa l'animazione `HatchScene` ri-tematizzata (niente uovo: la stalla, la
  madre, il vitello che si alza).

**Fattibilità:** quasi tutto statico (estende `types.ts`, rimuove `Egg`/Hatchery, nuova UI
Stalla, logica ereditarietà pura, timer su `Date.now()`). Cloud robusto del pedigree = fase
backend opzionale.

### 4.3 Battaglie & Arena → "La Spinta"
**Concept:** duello a 1 round, **niente HP, niente tipi**. Si **spinge** a fronti opposti
finché una **gira la testa e si ritira** (resa naturale, incruenta). Una **barra di spinta**
contesa governata da 3 leve reali: **massa/peso**, **corna (a corna limate)**, **grinta
(fiato)**. L'allevatore non colpisce: sceglie **Incalza / Reggi / Gira di leno / Incoraggia**.

**Meccaniche chiave:**
- **Fiato** (stamina, sostituisce HP): spingere consuma, reggere recupera, incoraggiare
  ricarica. Crea il dilemma "spingo ora o logoro?".
- **CALMA** (vincolo etico *in meccanica*): forzare (Incalza ripetuto) **innervosisce** e
  **peggiora** le prestazioni; Incoraggia/Reggi calmano. "Conduce ma non forza" diventa
  regola, non lore.
- **Matchmaking per categoria di peso reale** (SOGLIE_PER_FASE), non per rarità. Avversarie =
  **REAL_COWS** reali (foto/allevatore/comune), non NPC fantasy.
- **Eliminazione diretta** nei comuni del CALENDAR (riusa `bracketSeeds`/`buildRounds`);
  comuni aperti **per data reale**; finale Croix-Noire → titolo **Reine des Reines (1 per
  categoria)**.
- **Fix critica (alta):** rimuovere l'estetica "corna come arma/cornatura possente";
  riformulare come **presa a corna limate / spinta a fronti opposte**. Spostare **"Reine des
  cornes"** al suo significato reale (titolo *désarpa* della più combattiva della mandria,
  fiori rossi), non premio di finale; aggiungere il gemello **"Reine du lait"**.
- **Fix critica (media):** il combattimento (core fantasy) **non** è gateato dietro il quiz
  etico; la Fiducia gatea solo **prestigio**.
- I "castelli/dungeon" → **Combats du samedi** (sfide amichevoli),
  non boss fantasy inventati.

**Fattibilità:** tutto statico (riscrive `lib/battle.ts`/`combat.ts`, adatta `BattleScene`;
le API tabellone esistono già in `season.ts`). PvP reale = backend opzionale.

### 4.4 Mappa, Esplorazione & Eventi stagionali
**Concept:** "la Valle vive con la stagione". Spawn **ecologico per zona reale** (con il
disaccoppiamento del §1), **moudzon** al posto delle "selvatiche fantasy", **casere come
rifornimento pastorale** (pacchetto **fisso e leggibile**, cooldown **24h reali**, non
roulette da 30s), **geofence-gara** come eventi a tempo legati al calendario, animazioni
**inalpa/désarpa**, **trail con avatar e milestone** sul polyline (già in `TrailOverlay`).
- **Fix dati:** spawn sulle **34 zone reali** (non solo i 15 comuni-gara); fonte di **Fieno
  alternativa** fuori stagione d'alpeggio per non strozzare il care-loop; o si reperiscono le
  coordinate delle casere mancanti o si resta alle 6 reali.
- **Fix copy:** dopo la **désarpa** le gare **continuano a fondovalle** (non "finita la
  stagione"): renderlo esplicito.

### 4.5 Progressione, Economia & Meta
- **Identità:** 5–7 **gradi Amis des Reines** (da xp + catture + Rispetto), non "livello
  allenatore". Curva **sub-esponenziale** (`600·n^1.35`), non il `×1.5` che esplode.
- **Economia — Fix critica (media): MVP a 2 valute** (Denari d'Alpeggio soft + Forme di
  Fontina prestigio). Campanacci d'Oro/Punti Tifoso/Punti Stagione **mappati su queste o
  rinviati**. Ogni valuta deve avere **2–3 sink raggiungibili nella prima settimana**
  (il primo upgrade in **1 settimana, non 5–6**).
- **Sink principale = CURA/ACCRESCIMENTO** (non "+CP"): nutri/cura → la Reina cresce di peso
  → **sale di categoria reale** (il vero progredire Batailles). Benessere basso = "rifiuta"
  (incruento).
- **Season Pass = tracciato della stagione** agganciato al CALENDAR. **Fix critica (media):
  capitoli recuperabili** (chi entra a metà stagione non trova un guscio vuoto) e contenuto
  **agonistico evergreen durante la pausa** (allenamento), perché oggi
  (28/6) un neofita capita nella fase più morta.
- **Endgame = Désarpa + Albo d'Onore**: a fine stagione consolidi i risultati, ottieni
  **Stelle di Pedigree** (+2% permanente cad., cap +30%), riparti col ciclo annuale.
- **Rispetto** = volano economico + gate **solo di prestigio** (non blocca le gare) + **deve
  essere recuperabile**.

### 4.6 Retention & Social
- **Daily** "Giro di Stalla" (seed deterministico → statico), **streak** con grazia del
  maltempo, **missioni settimanali** = eliminatoria reale, **Cammino verso la Croix-Noire**.
- **Notifiche**: livello **statico** (Notification API + SW, opt-in, **max 1–2/giorno**,
  disattivabili) → push FCM = backend opzionale.
- **Classifiche**: `leaderboard/{uid}` **è già scritta** in `cloudSave.ts` ma **mai letta** →
  primo win a costo quasi-zero (read-only). Headline = **Rispetto**.
- **Leghe d'Alpeggio** (amici via codice) = backend (Firestore CRUD + regole).
- **Condivisione carte** = immagine-trofeo client-side (**solo illustrazioni originali**, mai
  foto del calendario).
- **Fix critica (media):** nessuna **metrica timer-based** entra nelle classifiche/leghe
  finché non c'è **validazione server** (altrimenti chi sposta l'orologio domina).

### 4.7 Narrativa, Identità & Onboarding
- Il giocatore entra negli **Amis des Reines**: da *Forestiero* a *Grand Éleveur*. La cattura
  è **"ti viene affidata"**; il Vatsadex è il **Libretto di Mandria**.
- **Mentore Mémé** (vecchio allevatore di Nus, terra di Falchetta): onboarding in **6 beat
  giocati** (non slide), riappare nei momenti chiave.
- **Tutorial progressivo**: ogni meccanica si sblocca al grado giusto con 1–2 frasi del
  mentore (no info-dump).
- **Arco stagionale in 3 atti** (Primaverili → Interludio Inalpa → Estive/Autunnali →
  Croix-Noire), ciclico e rigiocabile.
- **Fix:** starter/affidamento **deterministico** (Reina con foto del comune della valle
  scelta; fallback verificato a build-time).

---

## 5. Roadmap

### FASE 0 — Fondamenta (sblocca tutto, pre-MVP)
`data/economy.ts` (2 valute, source/sink completo) · `faseCorrente()` + finestre canoniche ·
disaccoppiamento comune-residenza/comune-tappa + mapping zona→reine (con test) ·
arricchimento minimo dataset (campionesse storiche + alias `reinaByName`) · **migrazione
salvataggi versionata** (preserva scorte/uova in volo) · **refactor di `App.tsx` (3284
righe) in moduli**.

### FASE 1 — MVP giocabile (statico, GitHub Pages) — **2 sottosistemi**
*Fix critica scope:* non spedire tutto il design insieme. MVP =
**Battaglia "La Spinta" + Progressione/Economia (2 valute, gradi)**, perché **riusano i dati
esistenti** (zero nuovo dataset). In più: **Cattura→Anagrafe** (veloce/piena differenziata),
**Mappa con fase + spawn per zona + trail con avatar/milestone**, **retention statico** (daily
seed, streak, notifiche locali, **classifiche read-only**, condivisione con illustrazioni).

### FASE 2 — Gioco completo (statico)
Stalla/allevamento (monta con **tori**, gravidanza compressa, crescita a stadi, alpeggio,
latte→Fontina dalla mandria da-latte) · Season Pass **recuperabile** · pronostici live
risolti via commit JSON (vincitore **ufficiale** vs **stimato**).

### FASE 3 — Backend (Firebase leggero, già presente)
Leghe d'Alpeggio · push FCM · **validazione timer server-side** per tutto ciò che alimenta
classifiche/leghe · vision reale per la razza.

---

## 6. Rischi e cosa NON fare

**Rischi:** (1) spedire il design "come scritto" = rewrite di mesi + salvataggi rotti +
meccaniche a vuoto sul dataset → *MVP a 2 sottosistemi, Fase 0 obbligatoria*. (2) timer client
+ classifiche social = equità distrutta → *niente metriche timer-based in leaderboard senza
server*. (3) foto del calendario condivise = rischio legale → *solo illustrazioni originali*.
(4) primo impatto nella pausa d'alpeggio (oggi 28/6) = fase più morta → *contenuto evergreen +
capitoli recuperabili*.

**Paletti (da director):**
- **NO** violenza / estetica-arma: corna **limate**, sconfitta = "la Reina gira la testa".
- **NO** stesso animale che combatte *e* viene munto come fosse reine-da-bataille e vacca-da-latte.
- **NO** una Reina come "padre" nella monta (serve un **toro**).
- **NO** gateare il combattimento dietro un quiz educativo.
- **NO** chiamare "anti-cheat" l'HMAC con chiave nel bundle (è un deterrente).
- **NO** meccaniche razza-dipendenti finché il dataset ha 1 sola razza reale.
- **NO** moltiplicare valute senza sink raggiungibili nella prima settimana.
- **NO** inondare la mappa di moudzon anonimi catturabili a 40s.
- **NO** "73/73" senza definire **a cosa serve** completare il Dex (set bonus a 25/50/73).

---

## 7. Da dove partire (proposta operativa)
1. **Fase 0** — fondamenta dati + `faseCorrente()` + refactor `App.tsx`. *Niente è solido
   senza questo.*
2. **MVP "La Spinta" + Economia/Gradi** — il cuore agonistico coerente, su dati esistenti.
3. **Cattura→Anagrafe** (affidamento, veloce/piena) + **Mappa/fase** + **retention statico**.
4. Poi Fase 2 (Stalla/genealogia) e Fase 3 (backend).

> Allegati di lavoro (audit per sottosistema, design completi, critiche per lente) disponibili
> nel run della workflow; questo documento ne è la sintesi azionabile.
