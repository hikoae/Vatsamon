import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Registro LIFO dei "closer" per il tasto INDIETRO degli overlay che vivono
 * DENTRO i componenti figli (scheda del Vatsadex, Valutazione del Giudice,
 * scheda della mossa). Il loro stato non sta in App, quindi App non poteva
 * includerli nella lista dei layer chiudibili (H3) e un solo Indietro ne
 * collassava due: chiudeva l'overlay figlio E il livello sottostante (tab,
 * CaptureScreen, battaglia).
 *
 * Il figlio chiama `useBackCloser(aperto, chiudi)`: si registra quando apre e
 * si de-registra nel cleanup dell'effect, quindi anche se viene smontato di
 * colpo (es. la CaptureScreen sparisce mentre la Valutazione è aperta).
 * App legge lo stack con `useBackClosers()` e lo impila fra i propri layer,
 * così la profondità delle voci-guardia nella history resta allineata.
 */

type Closer = () => void;

/** Registrazioni in ordine di apertura (la più recente è l'ultima). */
let stack: Array<{ close: Closer }> = [];
/** Snapshot pubblicato: identità stabile finché lo stack non cambia davvero. */
let snapshot: Closer[] = [];
const listeners = new Set<() => void>();

function publish() {
  // Dal più recente al più vecchio: l'ultimo overlay aperto è il primo a chiudersi.
  snapshot = stack.map((e) => e.close).reverse();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): Closer[] {
  return snapshot;
}

/** Lato App: lo stack corrente dei closer registrati dai figli (LIFO). */
export function useBackClosers(): Closer[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Lato figlio: registra `onClose` come layer chiudibile finché `active` è true. */
export function useBackCloser(active: boolean, onClose: () => void): void {
  // Il closer viene letto solo al momento del "back": teniamo l'ultima closure
  // in un ref, così cambiarla non ri-registra il layer (niente push/pop spuri).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!active) return;
    const entry = { close: () => onCloseRef.current() };
    stack = [...stack, entry];
    publish();
    return () => {
      stack = stack.filter((e) => e !== entry);
      publish();
    };
  }, [active]);
}
