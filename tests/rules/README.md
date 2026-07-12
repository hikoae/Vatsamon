# Test delle Firestore Security Rules

Test automatici per [`../../firestore.rules`](../../firestore.rules) (la source of truth
versionata delle regole di Vatsamon GO — vedi `FIREBASE_SETUP.md` Passo 6).

Girano contro il **Firestore Emulator** (locale, nessun costo, nessun progetto Firebase
reale necessario) via [`@firebase/rules-unit-testing`](https://www.npmjs.com/package/@firebase/rules-unit-testing).

Sono un package **separato** da `app/` (root del repo → `app/`): non toccano le
dipendenze o il build della app runtime, solo l'infrastruttura di test delle rules.

## Cosa testano

- `saves/{uid}` e `users/{uid}`: solo l'owner (`request.auth.uid == uid`) legge/scrive; un
  altro utente autenticato o un utente anonimo vengono rifiutati.
- `leaderboard/{uid}`: lettura per qualunque utente autenticato, scrittura solo owner.
- `battles/*` e qualunque altra collection non mappata: **deny by default** — verificato
  esplicitamente, perché prima di questo scaffold la rule su `battles/*` era lasca
  (qualunque autenticato poteva leggere/scrivere) ed è stata rimossa.

## Requisiti

- **Java** (richiesto dal Firestore Emulator — non da questo repo). Verifica con:
  ```bash
  java -version
  ```
  Se manca: <https://www.java.com> oppure `brew install openjdk` su macOS. Se non vuoi/puoi
  installare Java, questi test non sono eseguibili in locale — non è un blocker per il resto
  del repo (app/ non dipende da questo folder).
- Node.js 18+ (per `node --test`, incluso nel toolchain già usato da `app/`).
- Firebase CLI — installata automaticamente come devDependency (`firebase-tools`), non serve
  installazione globale.

## Come lanciarli

Dalla **root del repo** (o da questa cartella, la Firebase CLI risale le directory finché
trova `firebase.json`):

```bash
cd tests/rules
npm install
npm test
```

`npm test` avvia `firebase emulators:exec`, che:
1. fa partire il Firestore Emulator (porta 8080, come da `../../firebase.json`),
2. carica `../../firestore.rules`,
3. esegue `rules.test.js` (Node.js test runner nativo, nessun framework extra),
4. spegne l'emulatore e riporta l'exit code dei test.

Nessun dato reale, nessun progetto Firebase esistente coinvolto: `projectId` è un fittizio
`vatsamon-rules-test` usato solo dall'emulatore.

## Se Java non è disponibile

Lo scaffold (rules, test, config) resta versionato e revisionabile a occhio anche senza
eseguire l'emulatore. Prima di un deploy reale delle rules, esegui comunque questi test almeno
una volta su una macchina con Java disponibile (CI, o macchina locale con JDK).
