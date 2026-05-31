# 🔥 Guida Firebase per Vatsamon GO (passo-passo, per principianti)

Questa guida ti porta da zero ad avere **login (Google + email)** e **salvataggio cloud
multi-utente** funzionanti. È tutto **gratuito** (piano *Spark*), **senza carta di credito**.

Tempo stimato: ~15 minuti. Non serve scrivere codice: il codice l'ho già scritto io.
A te servono solo **6 valori di configurazione** che copierai dalla console.

---

## Passo 1 — Crea il progetto Firebase

1. Vai su **https://console.firebase.google.com** e accedi col tuo account Google.
2. Clicca **"Crea un progetto"** (o *"Add project"*).
3. Nome del progetto: scrivi `vatsamon-go` (o quello che vuoi). Clicca **Continua**.
4. Alla schermata **Google Analytics**: puoi **disattivarlo** (non ci serve). Clicca **Crea progetto**.
5. Aspetta ~30 secondi → **Continua**.

---

## Passo 2 — Registra l'app Web

1. Nella dashboard del progetto, clicca l'icona **`</>`** (Web) sotto "Inizia aggiungendo Firebase alla tua app".
2. Nickname app: `vatsamon-web`. **NON** spuntare "Firebase Hosting" (usiamo GitHub Pages/Netlify). Clicca **Registra app**.
3. Comparirà un blocco di codice con un oggetto `firebaseConfig`. **Questi sono i 6 valori che mi servono.** Sono simili a:

```js
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "vatsamon-go.firebaseapp.com",
  projectId: "vatsamon-go",
  storageBucket: "vatsamon-go.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

> 🔐 **Sono chiavi pubbliche lato client**: è normale e sicuro che finiscano nel codice del
> browser. La sicurezza vera la danno le *Security Rules* (Passo 6), non la segretezza di queste chiavi.

4. **Copia quei valori** e incollali nel file `app/.env.local` come spiegato al **Passo 5**.

---

## Passo 3 — Attiva l'Autenticazione (Google + Email)

1. Menu di sinistra → **Build → Authentication** → **Inizia** (*Get started*).
2. Scheda **Sign-in method** → **Add new provider**.
3. Attiva **Google**:
   - Clicca **Google** → interruttore su **Attiva** (*Enable*).
   - "Email di assistenza del progetto": scegli la tua email.
   - **Salva**.
4. Attiva **Email/Password**:
   - Clicca **Email/Password** → primo interruttore su **Attiva** → **Salva**.
   - (Il secondo, "Email link", lascialo spento.)

---

## Passo 4 — Crea il database Firestore

1. Menu di sinistra → **Build → Firestore Database** → **Crea database**.
2. Scegli la **località** (es. `eur3 (europe-west)` per l'Europa). Clicca **Avanti**.
3. Modalità: scegli **"Avvia in modalità produzione"** (*production mode*). Clicca **Crea**.
   - Non preoccuparti se "blocca tutto": al Passo 6 incolliamo le regole giuste.

---

## Passo 5 — Incolla la config nel progetto

1. Nella cartella `app/` crea un file chiamato **`.env.local`** (è già ignorato da git, non finisce su GitHub).
2. Incolla questo schema e **sostituisci** i valori con i tuoi del Passo 2:

```bash
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=vatsamon-go.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vatsamon-go
VITE_FIREBASE_STORAGE_BUCKET=vatsamon-go.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

3. Salva. **Riavvia** `npm run dev` se era acceso (Vite legge le env all'avvio).

> ℹ️ Se questo file **non** esiste o è incompleto, l'app funziona lo stesso in
> **"modalità locale"** (solo questo dispositivo, senza login). Appena metti la config,
> compaiono login e salvataggio cloud. Niente crash in nessun caso.

---

## Passo 6 — Incolla le Security Rules (importante!)

1. **Firestore Database → scheda "Regole" (*Rules*)**.
2. Cancella tutto e incolla questo, poi **Pubblica**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Ogni utente legge/scrive SOLO il proprio salvataggio
    match /saves/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Classifica: tutti possono leggere; ognuno scrive solo la propria riga
    match /leaderboard/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // Sfide PvP (fase futura): leggibili dai due sfidanti
    match /battles/{battleId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Passo 7 — Autorizza i domini (per il deploy)

Il login Google funziona solo su domini autorizzati. `localhost` è già incluso.
Quando pubblichi (GitHub Pages / Netlify):

1. **Authentication → Settings → Authorized domains → Add domain**.
2. Aggiungi il tuo dominio, es. `hikoae.github.io` e/o il tuo dominio Netlify.

---

## ✅ Fatto!

Quando avrai messo i 6 valori in `app/.env.local` e pubblicato le regole, al prossimo avvio
vedrai la **schermata di login** e, al primo accesso, la **creazione del personaggio**.
I progressi si salveranno **da soli nel cloud** e li ritroverai su qualsiasi dispositivo
facendo login con lo stesso account.

Se qualcosa non torna, mandami uno screenshot della console Firebase e ti guido.
