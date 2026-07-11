/**
 * Archivio foto degli avvistamenti — IndexedDB, SOLO sul dispositivo.
 * Le foto scattate dal giocatore non passano MAI dal cloud (privacy by
 * design): nel salvataggio viaggia solo l'id; su un altro dispositivo la
 * carta usa il fallback illustrazione.
 */
import { useEffect, useState } from "react";

const DB_NAME = "vatsamon-foto";
const STORE = "foto";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadPhoto(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

// cache degli object URL già risolti (evita di ricreare URL a ogni render)
const urlCache = new Map<string, string>();

export async function photoUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  try {
    const blob = await loadPhoto(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  } catch {
    return null;
  }
}

/** Hook: risolve l'URL locale della foto di un avvistamento (o null). */
export function usePhotoUrl(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(id ? urlCache.get(id) ?? null : null);
  useEffect(() => {
    let alive = true;
    if (!id) { setUrl(null); return; }
    photoUrl(id).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [id]);
  return url;
}
