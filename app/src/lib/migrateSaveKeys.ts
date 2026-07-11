/**
 * Migrazione one-shot delle chiavi di salvataggio dal vecchio prefisso
 * "vazzamon_" al nuovo "vatsamon_" (rinomina del progetto).
 *
 * Va importato PRIMA di qualsiasi modulo che legga localStorage: copia ogni
 * chiave legacy sulla nuova SOLO se la nuova non esiste già (i progressi più
 * recenti vincono sempre). Le chiavi vecchie restano al loro posto come rete
 * di sicurezza per un eventuale rollback a una versione precedente dell'app.
 */

export const LEGACY_PREFIX = "vazzamon_";
export const SAVE_PREFIX = "vatsamon_";

/** Converte un nome di chiave legacy nel nome nuovo (identità se già nuovo). */
export function normalizeSaveKey(key: string): string {
  return key.startsWith(LEGACY_PREFIX)
    ? SAVE_PREFIX + key.slice(LEGACY_PREFIX.length)
    : key;
}

export function migrateLegacySaveKeys(storage: Storage = localStorage): void {
  try {
    const legacy: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(LEGACY_PREFIX)) legacy.push(k);
    }
    for (const k of legacy) {
      const target = normalizeSaveKey(k);
      if (storage.getItem(target) === null) {
        const v = storage.getItem(k);
        if (v !== null) storage.setItem(target, v);
      }
    }
  } catch {
    /* storage pieno o non disponibile: il gioco parte comunque da zero */
  }
}

migrateLegacySaveKeys();
