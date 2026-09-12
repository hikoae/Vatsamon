import { useEffect } from "react";

/**
 * Blocca lo scroll del <body> mentre `active` è true, così un overlay/modale
 * aperto non lascia scorrere la pagina dietro (bug diffuso su mobile/iOS).
 *
 * Usa la tecnica position:fixed + top negativo: previene anche il rubber-band
 * di iOS Safari e ripristina esattamente la posizione di scroll alla chiusura.
 * Un contatore globale gestisce i modali impilati (l'ultimo che si chiude
 * ripristina lo stato originale).
 */
let lockCount = 0;
let savedScrollY = 0;
let saved: {
  overflow: string;
  position: string;
  top: string;
  width: string;
  paddingRight: string;
  overscroll: string;
} | null = null;

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const body = document.body;

    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      saved = {
        overflow: body.style.overflow,
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
        paddingRight: body.style.paddingRight,
        overscroll: body.style.overscrollBehavior,
      };
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${savedScrollY}px`;
      body.style.width = "100%";
      body.style.overscrollBehavior = "contain";
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0 && saved) {
        body.style.overflow = saved.overflow;
        body.style.position = saved.position;
        body.style.top = saved.top;
        body.style.width = saved.width;
        body.style.paddingRight = saved.paddingRight;
        body.style.overscrollBehavior = saved.overscroll;
        saved = null;
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [active]);
}
