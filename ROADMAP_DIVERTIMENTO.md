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
- «Zen d'Alpeggio» — 10 Ruminazioni Zen
- «Sindacalista» — 3 rimonte con lo Sciopero dello Zoccolo
I requisiti insegnano le meccaniche vere (categorie, condotta, calma).

## 6. Indole visibile e raccontata

`PERSONALITA_LABEL` già mostra l'indole in vigilia: arricchire le battute
(es. focosa: «spinge a testa bassa — come lo zio quando parla di politica»)
mantenendo il consiglio tattico onesto.

## 7. FR opzionale

Le stringhe di Mémé e delle mosse passano da `tr()` di `i18n/hub.ts` dove il
costo è marginale (il resto dell'app è IT hardcoded — non è un requisito).

## 8. Bilanciamento continuo

`app/scripts/sim-spinta.ts` è l'harness: ogni nuova mossa o ritocco numerico
si valida con 4000 duelli AI-vs-AI (comuni/rare entro ±8 punti dal baseline,
speciali/leggendarie entro ±15). Eseguire con:

```bash
cd app
node_modules/.bin/esbuild scripts/sim-spinta.ts --bundle --format=esm \
  --platform=node --outfile=node_modules/.cache/sim-spinta.mjs && \
node node_modules/.cache/sim-spinta.mjs
```
