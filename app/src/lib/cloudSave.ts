/**
 * Salvataggio cloud + sincronizzazione automatica.
 *
 * Strategia non invasiva: il monolite `App.tsx` continua a usare le sue chiavi
 * localStorage come "sessione attiva" sul dispositivo. Questo modulo:
 *  - al login, idrata localStorage dal documento `saves/{uid}` su Firestore;
 *  - mentre giochi, fa il mirror di quelle chiavi sul cloud (con debounce);
 *  - aggiorna una riga pubblica in `leaderboard/{uid}` per le classifiche.
 *
 * Così il vero multi-utente (login su qualsiasi dispositivo → ritrovi i
 * progressi) funziona senza riscrivere lo stato interno dell'app.
 */
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase";

/** Tutte le chiavi localStorage che compongono un salvataggio giocatore. */
export const SAVE_KEYS = [
  "vazzamon_collection_go",
  "vazzamon_bag_go",
  "vazzamon_eggs_go",
  "vazzamon_trainer_go",
  "vazzamon_waypoint_idx",
  "vazzamon_waypoint_progress",
  "vazzamon_active_route_id",
  "vazzamon_quiz_go",
  "vazzamon_badges",
  "vazzamon_challenges_go",
  "vazzamon_onboarded",
] as const;

export interface CloudSave {
  keys: Record<string, string>;
  version: number;
  updatedAt?: unknown;
}

/** Legge dallo localStorage le chiavi presenti del salvataggio. */
export function readLocalSave(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of SAVE_KEYS) {
    const v = localStorage.getItem(k);
    if (v !== null) out[k] = v;
  }
  return out;
}

/** Scrive nello localStorage le chiavi del salvataggio (idratazione da cloud). */
export function writeLocalSave(keys: Record<string, string>) {
  for (const k of SAVE_KEYS) {
    if (k in keys) localStorage.setItem(k, keys[k]);
  }
}

/** Cancella le chiavi del salvataggio (es. al cambio utente / logout). */
export function clearLocalSave() {
  for (const k of SAVE_KEYS) localStorage.removeItem(k);
}

/** Carica il salvataggio cloud dell'utente, o null se non esiste ancora. */
export async function loadCloudSave(uid: string): Promise<CloudSave | null> {
  if (!firebaseEnabled || !db) return null;
  const snap = await getDoc(doc(db, "saves", uid));
  if (!snap.exists()) return null;
  return snap.data() as CloudSave;
}

/** Salva il salvataggio cloud dell'utente (merge). */
export async function saveCloudSave(uid: string): Promise<void> {
  if (!firebaseEnabled || !db) return;
  const payload: CloudSave = {
    keys: readLocalSave(),
    version: 1,
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "saves", uid), payload, { merge: true });
  await updateLeaderboard(uid);
}

/** Estrae le statistiche pubbliche dal salvataggio e aggiorna la classifica. */
async function updateLeaderboard(uid: string) {
  if (!firebaseEnabled || !db) return;
  try {
    const trainer = JSON.parse(localStorage.getItem("vazzamon_trainer_go") || "{}");
    const collection = JSON.parse(localStorage.getItem("vazzamon_collection_go") || "[]");
    const badges = JSON.parse(localStorage.getItem("vazzamon_badges") || "[]");
    const dexCount = Array.isArray(collection)
      ? collection.filter((c: { isReal?: boolean }) => c?.isReal).length
      : 0;
    await setDoc(
      doc(db, "leaderboard", uid),
      {
        name: trainer.name || "Allenatore",
        level: trainer.level || 1,
        respect: trainer.respectScore || 0,
        dexCount,
        badges: Array.isArray(badges) ? badges.length : 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    /* la classifica è best-effort: un errore qui non deve bloccare il gioco */
  }
}
