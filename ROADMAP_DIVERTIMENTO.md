# Roadmap divertimento + educazione (post mosse/scuola/tutorial)

Quick-wins per rendere il gioco più divertente restando fedele al mondo vero
delle Batailles de Reines. Presuppone le tre fasi già consegnate su questo
branch: mosse comiche sopra La Spinta, Scuola della Reina, tutorial di Mémé.

**Paletto invariato** (GAME_REDESIGN.md): la bataille è INCRUENTA — l'umorismo
sta nei nomi, nelle descrizioni e nella telecronaca, mai nella violenza. I
fatti reali vengono dal dossier (`materiali/BATAILLES_DOSSIER.md`) e non si
inventano: l'umorismo è dichiaratamente colore da gioco.

## 1. ⓘ → GLOSSARIO ovunque

`Mossa.glossarioKey` esiste già e la `MossaInfoSheet` mostra la voce vera
(«Dal mondo vero delle batailles»). Estendere la copertura: ogni mossa a tema
reale aggancia la sua voce; stesso pattern per gli oggetti dello Sac e per le
indoli. L'umorismo diventa il veicolo del lessico vero, come il patois giocato.

## 2. Cartoline post-bataille condivisibili

Schermata di vittoria da salvare/condividere (canvas locale, niente server):
la Reina, la mossa decisiva, una battuta della telecronaca — e in calce una
riga vera: «Le batailles sono incruente: le corna si limano prima di ogni
incontro». Riusa il pattern della cartolina storica delle Leggende.

## 3. Telecronaca nelle tappe reali

`data/telecronaca.ts` è già usato dall'Éliminatoire; aggiungere battute
specifiche del contesto ufficiale (pesa, categorie, giuria, timbro della
domenica) — comiche nella forma, esatte nei fatti.

## 4. Battute di Mémé sugli eventi mappa

Aggancio leggero a `trekkingFeed` (il canale toast de-facto): désarpa, prima
nebbia diradata, nuova arena scoperta. I «Consigli di Mémé» once-only esistono
già in battaglia (`lib/tutorial.ts` MEME_TIPS): estendere il pattern fuori.

## 5. Trofei comici, requisiti veri

Estensione di `data/trofei.ts`:
- «La Nuora Perfetta» — vinci con l'Incornata della Suocera in una tappa ufficiale
- «Diplomata in Diplomazia» — 5 vittorie con la Testata Diplomatica
- «Flemma d'Alpeggio» — 10 Flemme del Ghiacciaio
- «Napoleone Respinto» — 3 rimonte con la Fortezza di Bard
I requisiti insegnano le meccaniche vere (categorie, condotta, calma).

## 6. Indole visibile e raccontata

`PERSONALITA_LABEL` già mostra l'indole in vigilia: arricchire le battute
(es. focosa: «spinge a testa bassa — come lo zio quando parla di politica»)
mantenendo il consiglio tattico onesto.

## 7. FR opzionale

Le stringhe di Mémé e delle mosse passano da `tr()` di `i18n/hub.ts` dove il
costo è marginale (il resto dell'app è IT hardcoded — non è un requisito).

## 8. Hardening pre-release (dal brief della re-review)

Richieste della review adversarial, dichiarate come rischi residui nel REPORT e
programmate qui (fuori proporzione per la PR delle mosse/tutorial):

- **RNG seedato + transcript versionato** del combat: riproducibilità dei duelli
  (prerequisito per bug-report e per qualsiasi PvP).
- **Matrice E2E completa**: onboarding→Reina→combattimento→premio→reload (già
  coperta dallo smoke-test), più doppio click sui bottoni, back/reload a metà
  battaglia, save vecchio/corrotto, due tab simultanee, offline, viewport 375px.
- **Prerequisiti PvP** (prima di qualunque modalità live): snapshot immutabile di
  squadra/mosse, backend autorevole, idempotenza delle mosse, timeout,
  riconnessione, resa esplicita, anti-farming. Nessun risultato competitivo
  autorevole finché vive solo in localStorage.
- **Economia**: modellare i loop da 2/10/30 minuti, sorgenti/pozzi di Denari e
  Fontina, progressione early/mid/late; cercare strategie dominanti con la sim.
- **npm audit** (1 high + 1 moderate su Vite/protobufjs) nel giro di hardening.
- **Etica dell'esplorazione**: mai posizioni precise di stalle/pascoli privati né
  inviti ad avvicinare animali o allevatori; eventuali partner locali dichiarati
  come sponsorizzati, separati dalla progressione, mai pay-to-win.
- **Portabilità verify**: eliminare il path Chromium hardcoded (fallback oltre a
  `PW_EXEC`), in coordinamento col polish locale del maintainer.

## 9. Bilanciamento continuo

`app/scripts/sim-spinta.ts` è l'harness: ogni nuova mossa o ritocco numerico
si valida con 4000 duelli AI-vs-AI (comuni/rare entro ±8 punti dal baseline,
speciali/leggendarie entro ±15). Eseguire con:

```bash
cd app
node_modules/.bin/esbuild scripts/sim-spinta.ts --bundle --format=esm \
  --platform=node --outfile=node_modules/.cache/sim-spinta.mjs && \
node node_modules/.cache/sim-spinta.mjs
```
