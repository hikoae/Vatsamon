import { useEffect, useState } from "react";
import { SW_UPDATE_PENDING_EVENT } from "../lib/swUpdate";

/**
 * Toast non bloccante: una nuova versione del Service Worker è pronta ma è
 * stata rimandata perché è in corso un'attività critica (foto o battaglia,
 * vedi lib/swUpdate.ts). Si applica da sola (main.tsx) al ritorno in idle —
 * questo componente si limita a informare, non ha un bottone d'azione.
 *
 * Proprio perché è solo informativo e compare durante attività critiche, il
 * contenitore è `pointer-events-none`: montato fuori da <App/> (main.tsx) con
 * z-[999], altrimenti intercetta i tap sulla barra azioni della battaglia e
 * sulla nav in basso che stanno sotto di lui. Stesso pattern del banner
 * offline (App.tsx). Se un giorno si aggiunge un bottone d'azione, quel
 * bottone DEVE avere `pointer-events-auto`.
 */
export function UpdateReadyToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onPending = () => setVisible(true);
    window.addEventListener(SW_UPDATE_PENDING_EVENT, onPending);
    return () => window.removeEventListener(SW_UPDATE_PENDING_EVENT, onPending);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[999] max-w-[90vw] pointer-events-none bg-slate-900 border border-emerald-500/40 text-slate-100 text-xs font-mono px-4 py-2.5 rounded-xl shadow-2xl text-center"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      🔄 Nuova versione pronta — si aggiorna appena finisci
    </div>
  );
}
