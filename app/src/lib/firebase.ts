/**
 * Inizializzazione Firebase (Auth + Firestore) per Vatsamon GO.
 *
 * La config arriva dalle variabili VITE_FIREBASE_* (vedi app/.env.local e
 * FIREBASE_SETUP.md). Se mancano, l'app gira in "modalità locale" (solo questo
 * dispositivo, senza login né cloud): `firebaseEnabled` resta `false` e l'app
 * non chiama mai Firebase, quindi non può crashare per config assente.
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from "firebase/firestore";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** true solo se la config minima è presente: abilita login + salvataggio cloud. */
export const firebaseEnabled = Boolean(cfg.apiKey && cfg.projectId);

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

if (firebaseEnabled) {
  app = initializeApp(cfg);
  _auth = getAuth(app);
  // Firestore con cache persistente su IndexedDB: la PWA gioca offline e
  // sincronizza da sola al ritorno della connessione (cruciale sui sentieri).
  try {
    _db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager(undefined),
      }),
    });
  } catch {
    _db = getFirestore(app);
  }
}

export const auth = _auth;
export const db = _db;
