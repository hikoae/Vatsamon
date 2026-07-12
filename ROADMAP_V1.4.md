# Vatsamon v1.4 — Studio di redesign + roadmap

> Esito dell'audit di luglio 2026 (`AUDIT_2026-07.md`). Obiettivo v1.4:
> **completare la muta** da clone-Pokémon a prodotto valdostano autentico,
> **comodo da usare col pollice**, e introdurre lo **scanner fotografico
> reale** ("Scatta la Reina"). Dati e vincoli di veridicità:
> `materiali/BATAILLES_DOSSIER.md`. Tutto ciò che segue è fattibile in
> statico (GitHub Pages/Netlify) salvo dove marcato ⏭ backend.

---

## In una frase

**"La Reina in tasca"**: apri l'app per strada o all'arena, la tab bar è
sotto il pollice, ogni icona parla valdostano, e quando incontri una mucca
vera la fotografi e diventa una carta del tuo Libretto — come CatchCat, ma
con le Reines vere e la stagione vera.

---

## A. Design system — "Registro Alpino"

### A1. Il problema da chiudere
Oggi convivono 4 identità (splash scuro, chrome lavanda, rosso VdA, favicon
verde), 391 usi di `font-mono`, ~208 emoji-icona, una scala slate invertita a
mano. La v1.4 adotta **una sola identità**, quella già progettata e verificata
nel dossier §9, ancorata all'araldica VdA (nero/rosso) — massima legittimità
davanti all'associazione.

### A2. Token (sostituiscono l'inversione slate)
```css
--paper:      #F4F0E8;  /* carta alpina — superficie chiara (hub) */
--ink:        #0E0E0E;  /* nero bandiera — testo, bande */
--brand-red:  #C40000;  /* rosso Reine — CTA, attivo, brand */
--red-deep:   #8E0E0E;  /* hover/pressed */
--gold:       #C9A227;  /* SOLO premi / Reine des Reines / leggendarie */
--castano:    #5A3A22;  /* accento manto Castana (carte, stalla) */
--cat-1: #9A1B2F; --cat-2: #1F6F8B; --cat-3: #4A6B3A;  /* categorie peso */
--surface-900: #121316; /* modalità gioco scura (battaglie, cattura) */
```
- **Doppio registro con un solo attributo**: `[data-mode="hub"]` chiaro/sobrio
  (Stagione, Libretto, Profilo) · `[data-mode="game"]` scuro/energico
  (battaglia, cattura notturna, scanner). Stessi dati, due viste.
- `theme_color` manifest e splash = `--paper` (o `--ink` se si parte dal
  registro game): **mai più il flash slate→lavanda** all'avvio.
- Regola 60-30-10: 60% neutro, 30% rosso+nero, 10% oro+categoria.
- Migrazione pratica: si eliminano le override `--color-slate-*` invertite da
  `index.css` e si mappano le classi esistenti sui token con find&replace
  guidato (la palette attuale è già "chiara": il salto visivo è contenuto).

### A3. Tipografia
- **Fraunces** (display serif, già nel piano prodotto): titoli, nomi delle
  Reines, numeri di gara — corsivo per patois. Tono storico-istituzionale.
- **Inter**: UI e dati, `tabular-nums` per kg/CP/classifiche.
- `font-mono` resta SOLO per i codici di salvataggio.
- Minimi: **mai testo sotto 12px** (oggi si scende a 7px); label tab 12px.

### A4. Iconografia — da 208 emoji a un linguaggio unico
1. **lucide-react** per tutte le azioni generiche (già in bundle, tree-shaken).
2. **Set custom SVG "Alpe"** (~12 glifi, stile linea 2px arrotondata, singolo
   colore, disegnati una volta e riusati ovunque): campanaccio (sonnaille),
   forma di Fontina, corna limate, bosquet (fiori rossi), stella alpina,
   fieno, secchio del latte, moudzon, arco dell'arena, zoccolo/impronta,
   grolla, croce della Croix-Noire. Sostituiscono 🪙🧀🌿🔔🍏⚔️ nell'HUD,
   nei marker e nelle card.
3. **La mucca in UN solo stile.** Oggi è rappresentata in 4 modi (favicon
   verde, avatar kawaii, illustrazioni PNG, emoji). Decisione:
   - **Foto reale** dove autorizzata (asset più prezioso: è il prodotto).
   - **Illustrazione per razza** come fallback di prima classe (già deciso
     in GAME_REDESIGN §1) — stile unico "incisione alpina moderna", da
     rifare coerente quando arriveranno le foto/materiali promessi.
   - `VatsamonAvatar` procedurale resta SOLO per i moudzon nati in stalla
     (identità generativa ha senso lì), ricolorato coi token.
4. **Icone PWA nuove**: monogramma araldico (scudo nero + corna che
   disegnano la "V" + campo rosso) in 192/512 + **maskable dedicata con
   safe-zone** + apple-touch + favicon coerente. Via il verde orfano.

### A5. Bonifica lessicale (stesso sforzo, doppio valore)
| Oggi (Pokémon/sci-fi) | v1.4 (registro allevatore) |
|---|---|
| CP / PUNTI COMBAT | **Potenza** (già nel dataset reale) |
| AR Scan / DNA scanner | **Scatta la Reina** (§C) |
| Vatsa-ball Base/…/Master | **Approccio col campanaccio** (§D nota) |
| Radar Sonar | **Sguardo del Pastore** |
| Buddy / COMPAGNO | **Reina di punta** |
| NOCCIOLO CP (+75) | **Razione d'Alpeggio** |
| VATSAMON GO (header) | `BRAND.gameName` da `config/brand.ts` (esiste già, mai importato!) |

---

## B. UX mobile — "sotto il pollice"

### B1. Navigazione: da 7 tab in alto a 5 in basso
```
┌─────────────────────────────┐
│  HUD compatto (1 riga)      │   ← safe-area-top
│                             │
│         CONTENUTO           │
│                             │
│ [Alpeggio][Stagione][📷][Stalla][Libretto] │  ← safe-area-bottom
└─────────────────────────────┘
```
- **Alpeggio** (mappa, icona montagna) · **Stagione** (trofeo) ·
  **Scatta** (bottone centrale rialzato, fotocamera → §C) ·
  **Stalla** (fienile) · **Libretto** (libro = Vatsadex/anagrafe).
- **Scuola (quiz)** → dentro Stagione/Scopri (dove già vive il contenuto
  culturale). **Premi/daily** → foglio "Giro di Stalla" richiamato dal chip
  streak nell'HUD (il daily è un rito d'apertura, non una destinazione).
  **Profilo** → avatar nell'HUD con etichetta esplicita "Profilo".
- Tab bar: `position:fixed; bottom:0` + `padding-bottom:env(safe-area-inset-bottom)`,
  target ≥ 48px, icone 24px, label 12px, niente icone duplicate.
- Badge/pallini solo se c'è davvero qualcosa di nuovo (oggi il pallino su
  Stagione è sempre acceso → assuefazione).

### B2. HUD: da 6 righe a 1
Oggi l'header sticky impila avatar+titolo+badge+grado+XP+5 stat prima ancora
della nav. v1.4: **una riga** (avatar-grado · Denari · Fontina · Rispetto ·
streak); tap su ciascun chip apre il dettaglio. Il resto scende nel Profilo.

### B3. Mappa: da 7 pannelli in scroll a mappa + fogli
La mappa diventa **full-bleed** (finalmente da gioco location-based); tutto
il resto (percorsi, sfide vicine, Lega, diario) diventa **bottom sheet**
trascinabili o chip flottanti. Ordine DOM = ordine visivo (oggi `order-first`
inverte, danneggiando screen reader e tab-order).

### B4. Ergonomia & accessibilità (criteri d'accettazione v1.4)
- Tutti i touch target ≥ 44px (oggi: audio 30px, X 28px, chip 32px).
- `aria-label` su ogni bottone-icona (oggi: **zero** in tutto src).
- `focus-visible` ripristinato (oggi `outline-none` secco).
- `prefers-reduced-motion`: spegne aurora/holo/ping (oggi sempre attivi —
  batteria e fotosensibilità).
- Contrasto AA sui testi muti; niente più micro-testo sotto 12px.
- Modali: gerarchia z-index a scala unica documentata; tastiera virtuale che
  non copre i campi (scroll-into-view su focus).
- Onboarding: dopo i 4 passi attuali, **3 beat giocati** sulla mappa
  ("cammina qui → tocca la Reina → offrile il fieno") invece del salto brusco
  nel monolite. Mémé di Nus come voce guida (già nel design).

---

## C. "Scatta la Reina" — scanner fotografico reale (feature faro v1.4)

Il pezzo mai affrontato della roadmap originale. Modello di riferimento:
**CatchCat** (foto a gatti reali → verifica IA on-device → carta con razza,
rarità, personalità nel tuo album). Adattato alle Batailles **con onestà sui
dati** e senza backend obbligatorio.

### C1. Flusso (fase statica, tutta client-side)
1. **Tab centrale 📷** → fotocamera (`getUserMedia`, già funzionante oggi).
2. **Verifica on-device**: modello COCO-SSD via TensorFlow.js (~6MB, lazy
   load solo alla prima apertura) — la classe `cow` esiste nel modello
   standard. Niente server, niente chiavi, funziona offline dopo il primo
   load. Se non è una bovina → messaggio simpatico ("È un bel cane, ma la
   Bataille è un'altra cosa").
3. **Se è una bovina** → si apre la **Carta d'Avvistamento**:
   - la TUA foto diventa l'artwork della carta (risolve il problema
     38/73-senza-foto per la collezione personale, senza toccare i diritti);
   - valutazione a occhio del mantello (castana / pezzata nera / pezzata
     rossa) fatta DAL GIOCATORE — coerente col ruolo "giudice di Bataille"
     e col vincolo "no meccaniche razza finché il dataset ha 1 sola razza";
   - luogo e data (GPS **opt-in**), stagione di fase reale.
4. **Collocazione onesta** (il punto che ci distingue da un fake):
   - dentro un **geofence-gara nella finestra del calendario** → la carta si
     collega alla tappa reale + badge **[VISTA DAL VIVO]**;
   - vicino a un comune con Reines nel dataset → proposta "potrebbe essere
     una Reina della zona" (mai claim automatico di identità);
   - altrove → **[AVVISTAMENTO]** dichiarato, che vale comunque: XP, missioni
     daily ("fotografa 1 bovina"), fieno.
5. **In Stalla**: un avvistamento può essere "accolto" come capo della tua
   azienda (entra nel ciclo cura/crescita con la TUA foto come identità).

### C2. Regole e paletti
- **Privacy**: le foto restano SUL dispositivo (IndexedDB); condivisione solo
  esplicita e solo della carta con illustrazione, MAI foto altrui rihostate.
  Niente volti: crop guidato sul soggetto animale.
- **Anti-abuso "ragionevole"** (statico): verifica COCO-SSD + 1 avvistamento
  per luogo/ora + cooldown giornaliero. Dichiararlo deterrente, non anti-cheat
  (paletto del redesign).
- **⏭ Fase backend (v1.5+)**: vision reale per la razza (Gemini), match
  assistito con l'anagrafe (matricola/mantello), moderazione per le carte
  condivise, foto ufficiali dell'associazione con liberatorie.
- **Perché è vendibile**: all'associazione dà un motivo per portare la gente
  ALLE gare (badge Vista dal vivo + QR in arena), ai fan dà il collezionismo
  emotivo della "mia foto della mia Reina".

---

## D. Gioco più profondo, sempre più valdostano

In ordine di rapporto valore/costo. Fonte di verità: dossier (tutto già
verificato, niente invenzioni).

1. **La Désarpa (29/9) come evento annuale** — la discesa dagli alpeggi
   diventa cerimonia in-game: la tua mandria sfila, si assegnano **Reine des
   cornes** (fiori rossi, la più combattiva) e **Reine du lait** (fiori
   bianchi, la più produttiva) della TUA mandria, si consolidano le Stelle di
   Pedigree. Riusa il motore di fase esistente. *(Fix incluso: "Reine des
   cornes" oggi è usata male come premio di finale.)*
2. **Combats du samedi** — sfida settimanale amichevole a seed deterministico
   (statico), col nome vero del sabato pre-finale. Ricompensa: Denari + un
   fiore per il bosquet.
3. **Il Bosquet** — colleziona i fiori alpini sui sentieri (già mappati) per
   comporre l'addobbo della tua Reina campionessa: craft leggero, zero
   valute nuove, lega trekking → tradizione.
5. **Pronostici risolti coi risultati veri** — il commit JSON dei risultati
   per tappa chiude i pronostici (vincitore ufficiale vs stimato). Già
   scritto in GAME_REDESIGN Fase 2; con `news.yml` esiste già il precedente
   di workflow-che-committa-dati.
6. **Classifiche read-only** — `leaderboard/{uid}` è GIÀ scritta da tutti i
   client e mai letta: una vista classifica (headline = Rispetto) è il win
   social più economico dell'intera roadmap. Prerequisito: fix bug respect=0.
7. **Le Leggende nell'Albo** — carte-Leggenda di **Falchetta** (4 titoli
   2022-25, Nus), **Suisse**, **Bandit**, **Sirène** (record 1966-69):
   record completi nel dataset + quiz di storia dedicato. Gancio emotivo
   della demo di vendita.
8. **Patois vivo** — i termini del glossario IT/FR/patois già in i18n
   diventano tooltip tap-to-learn nell'UI (reina, moudzon, inarpa, désarpa,
   bosquet, mécro…): ogni sessione insegna una parola.
9. **Cattura → Affidamento completo** — l'allevatore reale appare e ti
   affida la Reina (chiude il residuo "selvatica nella nebbia", TODO aperto).
10. **⏭ Leghe d'Alpeggio + push FCM** (v1.5, backend leggero già previsto).

> Nota lessicale sulla cattura: le "ball" diventano livelli di **approccio
> col campanaccio** (suona con calma → la Reina si fida). Stessa meccanica,
> zero codice nuovo, coerenza totale.

---

## E. Vendibilità (associazione + fan)

- **Demo per gli Amis des Reines** = home brandizzata (nero/rosso/oro) +
  calendario 2026 reale + albo d'oro con Falchetta + scanner dal vivo in
  arena + 3 slot sponsor mockup (title/categoria/tappa). Già delineata in
  `PIANO_PRODOTTO.md` §8 — la v1.4 la rende *presentabile* (design system)
  e *dimostrabile dal telefono* (nav mobile + scanner).
- **QR alle gare**: cartello all'arena → deep-link che sblocca il badge
  presenza. Costo minimo, valore percepito alto per l'associazione.
- **Kit di presentazione**: aggiornare `presentazione-vatsamon.html` con gli
  screenshot v1.4 e il prima/dopo del redesign.
- Naming: "Vatsamon" resta il nome del GIOCO; per l'ente vale la proposta
  brand-ombrello del piano prodotto (decisione del cliente, §2.1).

---

## F. Piano di release v1.4

> **STATO (01/07/2026)**: Sprint 0 ✅ · Sprint 1 ✅ (design token completi e
> icone custom rimandati: fatto nav/HUD/safe-area/lessico/tipografia/a11y) ·
> Sprint 2 ✅ (Scatta la Reina live) · Sprint 3-4 da fare.

Ordine pensato per rischio/valore; ogni sprint termina con typecheck + build
+ Playwright verde + screenshot.

### Sprint 0 — Fondazioni & bugfix (prerequisito, ~breve)
- Fix ALTA dall'audit: chiavi sommerse in `SAVE_KEYS` (A1), leaderboard
  respect (A2), reset nucleare (A7), allineare deploy Pages/Netlify o
  dismettere Pages (A3).
- Rimozione dead code (HatchScene, motore HP morto, `vatsamon_eggs_go`).
- **Refactor viste**: estrarre `MapView`, `VatsadexView`, `ScannerView` da
  App.tsx (le altre 4 sono già componenti). Router = si resta su `activeTab`,
  ma con le viste in file propri. `tsconfig strict` + `noUnusedLocals`.
- Versione unica: package.json = 1.4.0-dev, footer da costante condivisa.
- Archiviare i doc obsoleti (STATO_ATTUALE, AUDIT_PROGETTO) in `materiali/`.

### Sprint 1 — Design system "Registro Alpino"
- Token CSS + rimozione inversione slate; theme-color/splash coerenti.
- Tab bar in basso 5 voci + safe-area + HUD a 1 riga.
- Fraunces/Inter; bonifica lessicale (tabella A5) usando `config/brand.ts`.
- Set icone "Alpe" (12 SVG) al posto delle emoji nell'HUD/marker/card.
- Icone PWA nuove (monogramma + maskable dedicata).
- Accessibilità: aria-label, focus-visible, reduced-motion, target 44px.
- Estendere `verify.mjs` a Stagione/Premi/Stalla + un run mobile 390×844.

### Sprint 2 — "Scatta la Reina"
- TF.js + COCO-SSD lazy (~6MB, solo al primo uso), flusso C1 completo.
- Carta d'Avvistamento con foto locale (IndexedDB), badge onesti
  ([AVVISTAMENTO]/[VISTA DAL VIVO]), aggancio a geofence-gara e daily.
- Sostituisce in toto lo scanner simulato e il lessico "DNA".

> **[12/07/2026]** Sprint 3-4 assorbiti/superati da v1.5 — vedi `ROADMAP_V1.5.md`
> (Désarpa/Arp in S3.5, gravidanza in S3.6, Albo delle Leggende in S3.8).

### Sprint 3 — Stagione viva
- Désarpa (evento annuale) + Reine des cornes/du lait di mandria.
- Combats du samedi (settimanale deterministico) + fiori/bosquet.
- Classifiche read-only + carte-Leggenda nell'albo (dataset campionesse).

### Sprint 4 — Rifinitura vendibile
- Ottimizzazioni: foto→WebP, precache selettiva (via i 4.8MB), lazy Firebase.
- Onboarding a beat giocati; tooltip patois; QR arena.
- Kit demo per l'associazione (presentazione aggiornata + percorso demo).

**Fuori scope v1.4 (→ v1.5):** backend (Leghe, FCM, vision razza, timer
server-side), CMS git-based, scambio carte. **Paletti invariati** da
GAME_REDESIGN §6: incruento sempre, no valute nuove senza sink, no meccaniche
razza-dipendenti finché il dataset ha una sola razza reale, foto del
calendario mai in condivisione.
