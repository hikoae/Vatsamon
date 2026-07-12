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
import { normalizeSaveKey } from "./migrateSaveKeys";

/** Tutte le chiavi localStorage che compongono un salvataggio giocatore. */
export const SAVE_KEYS = [
  "vatsamon_collection_go",
  "vatsamon_bag_go",
  "vatsamon_trainer_go",
  "vatsamon_waypoint_idx",
  "vatsamon_waypoint_progress",
  "vatsamon_active_route_id",
  "vatsamon_quiz_go",
  "vatsamon_badges",
  "vatsamon_challenges_go",
  "vatsamon_completed_routes",
  "vatsamon_discovered_cows",
  "vatsamon_onboarded",
  "vatsamon_respect",
  "vatsamon_dungeons",
  // Sistemi v1.3 che vivevano fuori dal sync (persi al cambio dispositivo):
  "vatsamon_stalla_preg",          // gravidanza in corso (StallaScreen)
  "vatsamon_daily",                // streak + missioni del giorno (DailyPanel)
  "vatsamon_pronostici",           // pronostici sul tabellone (SeasonView)
  "vatsamon_follow_reine",         // reine seguite (SeasonView)
  "vatsamon_pronostici_rewarded",  // pronostici già premiati (SeasonView)
  "vatsamon_lang",                 // lingua IT/FR dell'hub
  "vatsamon_trofei",               // bacheca trofei (mécro/sonnaille/collari)
  "vatsamon_eliminatoire",         // tappe del calendario giocate/vinte/timbri
  "vatsamon_arp",                  // alpeggio: capi all'arp, produzione, désarpa
  "vatsamon_patois",               // parole del glossario sbloccate giocando
  "vatsamon_leggende",             // cartoline storiche dell'Albo delle Leggende
  "vatsamon_scuola",               // Scuola della Reina: catalogo mosse sbloccate
  "vatsamon_tutorial",             // tutorial di Mémé: beat, consigli mostrati
  "vatsamon_gps_checkpoints",      // checkpoint GPS raggiunti (App.tsx)
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

/**
 * Chiavi del salvataggio che NON sono JSON (stringhe/numeri grezzi salvati
 * con `String(...)` o direttamente, non `JSON.stringify(...)`). Per queste
 * il controllo di parsabilità JSON in `writeLocalSave` andrebbe in falso
 * positivo (es. "cogne" o "it" non sono JSON validi pur essendo valori
 * legittimi) e va saltato.
 */
const RAW_STRING_KEYS = new Set<string>([
  "vatsamon_active_route_id",
  "vatsamon_lang",
  "vatsamon_follow_reine",
]);

/** Scrive nello localStorage le chiavi del salvataggio (idratazione da cloud). */
export function writeLocalSave(keys: Record<string, string>) {
  // normalizza i salvataggi cloud scritti prima della rinomina (vazzamon_*)
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(keys)) normalized[normalizeSaveKey(k)] = v;
  for (const k of SAVE_KEYS) {
    if (!(k in normalized)) continue;
    const v = normalized[k];
    // Valida che il valore sia JSON parsabile prima di scriverlo: un
    // salvataggio cloud corrotto/troncato non deve mai far crashare l'app
    // al successivo JSON.parse in lettura (App.tsx e vari lib/*.ts).
    if (!RAW_STRING_KEYS.has(k)) {
      try {
        JSON.parse(v);
      } catch {
        console.warn(`[cloudSave] valore non parsabile per "${k}", salto idratazione di questa chiave`);
        continue;
      }
    }
    localStorage.setItem(k, v);
  }
}

/** Chiave del backup locale (sempre l'ultimo salvataggio prima di un'operazione distruttiva). */
export const BACKUP_KEY = "vatsamon_backup_latest";

/** Indica se nello storage esistono progressi di gioco (collezione o allenatore). */
export function hasExistingProgress(): boolean {
  try {
    const coll = JSON.parse(localStorage.getItem("vatsamon_collection_go") || "[]");
    if (Array.isArray(coll) && coll.length > 0) return true;
  } catch { /* ignora json corrotto */ }
  return Boolean(localStorage.getItem("vatsamon_trainer_go"));
}

/**
 * Copia di sicurezza dei progressi correnti in un'unica chiave locale, PRIMA di
 * qualsiasi operazione che potrebbe sovrascriverli (cambio utente, idratazione
 * da cloud, ecc.). Non sovrascrive un backup non vuoto con uno vuoto.
 */
export function backupLocalSave(reason: string) {
  const keys = readLocalSave();
  if (Object.keys(keys).length === 0) return;
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ at: Date.now(), reason, keys }));
  } catch { /* quota piena: il backup è best-effort */ }
}

/** Ripristina l'ultimo backup locale nelle chiavi di gioco. true se riuscito. */
export function restoreLocalBackup(): boolean {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { keys?: Record<string, string> };
    if (!parsed.keys) return false;
    writeLocalSave(parsed.keys);
    return true;
  } catch {
    return false;
  }
}

/** Cancella le chiavi del salvataggio (es. al cambio utente / logout). Fa un backup prima. */
export function clearLocalSave() {
  backupLocalSave("clear");
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
    const trainer = JSON.parse(localStorage.getItem("vatsamon_trainer_go") || "{}");
    const collection = JSON.parse(localStorage.getItem("vatsamon_collection_go") || "[]");
    const badges = JSON.parse(localStorage.getItem("vatsamon_badges") || "[]");
    // Il Rispetto vive nella sua chiave dedicata, non dentro al trainer.
    const respect = Number(localStorage.getItem("vatsamon_respect")) || trainer.respectScore || 0;
    const dexCount = Array.isArray(collection)
      ? collection.filter((c: { isReal?: boolean }) => c?.isReal).length
      : 0;
    await setDoc(
      doc(db, "leaderboard", uid),
      {
        name: trainer.name || "Allenatore",
        level: trainer.level || 1,
        respect,
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
