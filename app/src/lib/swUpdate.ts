/**
 * Guardia per l'aggiornamento del Service Worker (`registerType: "prompt"`,
 * vedi vite.config.ts + main.tsx).
 *
 * Espone due cose, deliberatamente come modulo con stato mutabile e non come
 * context React:
 *  - un flag "attività critica in corso" (cattura/verifica foto in
 *    ScattaView, battaglia in corso in BattleScene) — main.tsx lo legge
 *    FUORI dall'albero React, al momento della registrazione del SW, quindi
 *    non ha un Provider a disposizione;
 *  - un CustomEvent su `window` per notificare un piccolo componente toast
 *    che l'aggiornamento è pronto ma rimandato.
 */

let criticalCount = 0;

/** Segnala l'inizio di un'attività critica (foto/battaglia in corso). */
export function beginCriticalActivity() {
  criticalCount++;
}

/** Segnala la fine di un'attività critica. Mai va sotto zero. */
export function endCriticalActivity() {
  criticalCount = Math.max(0, criticalCount - 1);
}

export function isCriticalActivityActive(): boolean {
  return criticalCount > 0;
}

/** Evento DOM: una nuova versione del SW è pronta ma è stata rimandata. */
export const SW_UPDATE_PENDING_EVENT = "vatsamon:sw-update-pending";

export function notifyUpdatePending() {
  window.dispatchEvent(new Event(SW_UPDATE_PENDING_EVENT));
}
