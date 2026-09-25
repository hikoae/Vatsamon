/**
 * MÉMÉ DI NUS — la bubble-guida del tutorial (beat giocati, mai slide).
 * Fissa sopra la bottom-nav (z-45 > nav z-40), NON blocca l'input: il
 * giocatore GIOCA il beat (cammina, nutre, spinge) mentre Mémé parla.
 *
 * IL RIFLETTORE (2026-08, dal collaudo su iPhone). Prima la bolla parlava di
 * «quel riquadro» e «qui sotto» e toccava al giocatore indovinare quale
 * elemento fosse: ora ogni beat può NOMINARE un bersaglio (`BEAT_MEME` in
 * `lib/tutorial.ts`) e la bolla ci accende sopra un anello, oscurando il
 * resto della schermata.
 *
 * Tre proprietà a cui questo file tiene, in ordine:
 *  1. NON INTRAPPOLA. Velo e anello sono `pointer-events: none` (vedi
 *     `.meme-spot` in index.css): non esiste un modo in cui il riflettore
 *     renda non premibile un bottone — né quello indicato né gli altri. Il
 *     tutorial di Mémé si gioca, non si subisce: chiudere l'input sarebbe
 *     contro il suo stesso impianto.
 *  2. DEGRADA. Se il bersaglio non esiste ancora (o non esiste affatto) la
 *     bolla resta esattamente quella di prima e il beat prosegue.
 *  3. SEGUE. Un ciclo `requestAnimationFrame` rilegge il rettangolo del
 *     bersaglio: se il giocatore scorre o il layout cambia, l'anello resta
 *     incollato all'elemento (e la bolla si sposta in alto se stando in
 *     basso coprirebbe proprio quello che sta indicando). Se l'HUD sticky o
 *     la bottom-nav se ne mangiano un pezzo, l'anello si stringe su quel che
 *     resta scoperto: non disegna mai sopra la cromia fissa.
 */
import { useEffect, useRef, useState } from "react";
import { BEAT_MEME, BEAT_TOTALI, tutorialState } from "../lib/tutorial";

/** Aria attorno al bersaglio (px): l'anello non deve mordere l'elemento. */
const ALONE = 6;

/** Quanto il riflettore dipinge OLTRE il proprio rettangolo: il battito
 *  (`.meme-spot-ping`, `inset: -9px` in index.css) è il suo pixel più esterno.
 *  Si tiene fuori dalla cromia fissa questo, non il solo bordo dell'anello. */
const BORDO = 9;

interface Riquadro { top: number; left: number; width: number; height: number }

function motionRidotto(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Primo bersaglio che esiste ED è renderizzato, in ordine di priorità. */
function trovaBersaglio(selettori: readonly string[]): { el: HTMLElement; sel: string } | null {
  for (const sel of selettori) {
    let el: HTMLElement | null = null;
    // Un selettore malformato non deve poter spegnere il tutorial.
    try { el = document.querySelector<HTMLElement>(sel); } catch { el = null; }
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 1 && r.height > 1) return { el, sel };
  }
  return null;
}

/** Dentro un contenitore fisso non ha senso scorrere: è già sempre in vista. */
function dentroFisso(el: HTMLElement): boolean {
  for (let p: HTMLElement | null = el; p; p = p.parentElement) {
    const pos = getComputedStyle(p).position;
    if (pos === "fixed" || pos === "sticky") return true;
  }
  return false;
}

function areaSovrapposta(a: Riquadro, b: Riquadro): number {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

export function MemeGuide({ testo, labelAvanti, onAvanti, onSalta, playClick, beat }: {
  /** Battuta di ripiego. La versione buona vive in `BEAT_MEME` (vedi sotto). */
  testo: string;
  /** Se presente, il beat avanza col bottone; se assente, avanza giocando. */
  labelAvanti?: string;
  onAvanti?: () => void;
  onSalta?: () => void;
  playClick: () => void;
  /** Beat esplicito. Se non arriva, si legge dallo stato del tutorial. */
  beat?: number;
}) {
  // Quale beat sta parlando. `tutorialState()` legge la stessa chiave che
  // App.tsx scrive con `saveTutorial` PRIMA di ri-renderizzare, quindi qui è
  // già aggiornata quando arriva la battuta nuova. Lettura, non scrittura:
  // nessun effetto collaterale.
  const beatCorrente = beat ?? tutorialState().beat;
  const battuta = BEAT_MEME[beatCorrente];

  // Testo: la fonte buona è `BEAT_MEME` — lì la battuta sta ACCANTO al
  // bersaglio che nomina («il bottone che ti segno»), e le due cose devono
  // cambiare insieme. La prop `testo` resta come ripiego per un beat non
  // ancora censito lì, così non si resta mai muti.
  const testoMostrato = battuta?.testo ?? testo;
  const selettori = battuta?.bersagli ?? [];
  // Stringa stabile: le dipendenze di un effetto non possono essere un array
  // nuovo a ogni render.
  const chiaveBersagli = selettori.join("\n");

  const bollaRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<{ r: Riquadro; sel: string } | null>(null);
  /** `null` = bolla in basso (default); numero = px dall'alto. */
  const [inAlto, setInAlto] = useState<number | null>(null);

  const giaScrollati = useRef<Set<string>>(new Set());
  /** Distanza fra il fondo della bolla e il fondo del viewport, letta mentre la
   *  bolla è nel suo posto in basso (= `6rem` + safe-area). Serve a valutare le
   *  collocazioni confrontando SEMPRE la stessa geometria di partenza, mai
   *  quella corrente: è ciò che impedisce alla bolla di rimbalzare. */
  const distanzaDalFondo = useRef<number | null>(null);
  const inAltoRef = useRef<number | null>(null);

  useEffect(() => {
    const lista = chiaveBersagli ? chiaveBersagli.split("\n") : [];
    let raf = 0;
    // `null` = «in questo beat non ho ancora scritto niente», che è diverso da
    // "" = «nessun bersaglio». Serve perché il PRIMO giro di un beat aggiorni
    // comunque: partendo da "" un beat senza bersagli (il terzo) si teneva
    // addosso l'anello del beat precedente.
    let ultimaChiave: string | null = null;

    const passo = () => {
      const bolla = bollaRef.current;
      const rb = bolla?.getBoundingClientRect() ?? null;
      // Finché la bolla è in basso, la sua distanza dal fondo si rimisura da
      // sola: così una rotazione o un cambio di safe-area non lasciano in giro
      // un numero vecchio.
      if (rb && inAltoRef.current === null) distanzaDalFondo.current = window.innerHeight - rb.bottom;
      const fondo = distanzaDalFondo.current;
      if (!rb || fondo === null) { raf = requestAnimationFrame(passo); return; }
      const hud = document.getElementById("trainer-hud")?.getBoundingClientRect().bottom ?? 0;
      /** Prima riga utile sotto l'HUD (che è `sticky`: non scorre via). */
      const limiteAlto = Math.max(12, Math.round(hud) + 8);
      /** Ultima riga utile sopra la bottom-nav = bordo inferiore della bolla in basso. */
      const limiteBasso = window.innerHeight - fondo;
      /** Fascia in cui l'ANELLO può dipingere senza finire sulla cromia fissa.
       *  HUD (`sticky`) e bottom-nav (`fixed`) stanno a z-40, il riflettore a
       *  z-44: dove si sovrappongono è il riflettore a coprire loro. */
      const navAlto = document.getElementById("bottom-nav")?.getBoundingClientRect().top ?? window.innerHeight;
      const fasciaAlta = Math.round(hud) + BORDO;
      const fasciaBassa = Math.round(navAlto) - BORDO;

      let rettangolo: Riquadro | null = null;

      if (lista.length) {
        const trovato = trovaBersaglio(lista);
        if (!trovato) {
          if (ultimaChiave !== "") { ultimaChiave = ""; setSpot(null); }
        } else {
          const b = trovato.el.getBoundingClientRect();
          rettangolo = {
            top: Math.round(b.top) - ALONE,
            left: Math.round(b.left) - ALONE,
            width: Math.round(b.width) + ALONE * 2,
            height: Math.round(b.height) + ALONE * 2,
          };
          // OCCLUSIONE. L'HUD in alto e la bottom-nav in basso non scorrono via:
          // quando il bersaglio ci finisce sotto, il rettangolo continuava a
          // seguirlo e l'anello, stando più in alto nello stack, si disegnava
          // SOPRA l'header — tagliando a metà il nome del giocatore e i chip
          // delle risorse. Qui il rettangolo viene RITAGLIATO alla fascia
          // libera: l'anello si stringe su quel che del bersaglio resta
          // scoperto e non esce mai da lì. Ritagliare invece di spegnere al
          // primo contatto serve ai bersagli più alti della fascia (la griglia
          // della mandria): quelli sconfinano sempre, spegnerli vorrebbe dire
          // non illuminarli mai. Un bersaglio DENTRO la cromia (le voci di
          // `#bottom-nav`) non è occluso — è la cromia — e resta intero.
          if (!dentroFisso(trovato.el)) {
            const su = Math.max(rettangolo.top, fasciaAlta);
            const giu = Math.min(rettangolo.top + rettangolo.height, fasciaBassa);
            // Sotto l'aria che l'anello si tiene attorno al bersaglio non resta
            // un bersaglio da cerchiare: solo una barra rossa sotto l'header.
            rettangolo = giu - su > ALONE * 2 ? { ...rettangolo, top: su, height: giu - su } : null;
          }
          // Bersaglio fuori schermo o inghiottito dalla cromia: via il velo.
          // Oscurare tutto senza niente di illuminato darebbe una schermata buia.
          if (!rettangolo || rettangolo.top + rettangolo.height <= 0 || rettangolo.top >= window.innerHeight) {
            rettangolo = null;
            if (ultimaChiave !== "") { ultimaChiave = ""; setSpot(null); }
          } else {
            const k = `${trovato.sel}@${rettangolo.top},${rettangolo.left},${rettangolo.width},${rettangolo.height}`;
            if (k !== ultimaChiave) { ultimaChiave = k; setSpot({ r: rettangolo, sel: trovato.sel }); }
          }

          // Portalo nella fascia libera — sotto l'HUD e sopra la bolla — una
          // volta sola per bersaglio. `scrollIntoView({block:"center"})` lo
          // metterebbe a metà schermo, cioè proprio dove sta la bolla su un
          // telefono corto: il riflettore finirebbe dietro a Mémé. Riscorrere a
          // ogni frame, invece, strapperebbe la pagina di mano al giocatore.
          if (!giaScrollati.current.has(trovato.sel)) {
            giaScrollati.current.add(trovato.sel);
            const altoFascia = limiteAlto + 12;
            const bassoFascia = limiteBasso - rb.height - 12;
            if ((b.top < altoFascia || b.bottom > bassoFascia) && !dentroFisso(trovato.el)) {
              window.scrollBy({ top: Math.round(b.top - altoFascia), behavior: motionRidotto() ? "auto" : "smooth" });
            }
          }
        }
      } else if (ultimaChiave !== "") { ultimaChiave = ""; setSpot(null); }

      // RICOLLOCAZIONE. Il caso peggiore è indicare qualcosa e poi sedercisi
      // sopra: la bolla è opaca e prende i tap, quindi coprire il bersaglio
      // vuol dire renderlo impremibile. Si prova, in ordine di preferenza:
      // il posto di sempre (in basso) → subito sotto il bersaglio → subito
      // sopra → in cima sotto l'HUD; vince il primo che non lo copre affatto,
      // altrimenti quello che lo copre meno.
      // La scelta dipende SOLO dal rettangolo del bersaglio e dall'altezza
      // della bolla, mai da dove la bolla si trova adesso: nessun rimbalzo.
      if (rb.height > 0) {
        const candidati: (number | null)[] = [null];
        if (rettangolo) {
          const sotto = rettangolo.top + rettangolo.height + 12;
          if (sotto + rb.height <= limiteBasso) candidati.push(sotto);
          const sopra = rettangolo.top - 12 - rb.height;
          if (sopra >= limiteAlto) candidati.push(sopra);
        }
        candidati.push(limiteAlto);

        let scelta: number | null = null;
        let minimo = Infinity;
        for (const c of candidati) {
          const top = c === null ? limiteBasso - rb.height : c;
          const area = rettangolo
            ? areaSovrapposta({ top, left: rb.left, width: rb.width, height: rb.height }, rettangolo)
            : 0;
          if (area < minimo) { minimo = area; scelta = c; if (area === 0) break; }
        }
        if (scelta !== inAltoRef.current) { inAltoRef.current = scelta; setInAlto(scelta); }
      }

      raf = requestAnimationFrame(passo);
    };

    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [chiaveBersagli]);

  return (
    <>
      {/* IL RIFLETTORE. Un solo elemento: l'ombra a raggio enorme fa da velo
          su tutto il resto e il buco resta il rettangolo del bersaglio, con gli
          angoli arrotondati. `key` sul selettore: cambiando bersaglio l'anello
          rientra invece di scivolare da un elemento all'altro. */}
      {spot && (
        <div
          key={spot.sel}
          className="meme-spot"
          style={{ top: spot.r.top, left: spot.r.left, width: spot.r.width, height: spot.r.height }}
          aria-hidden="true"
        >
          <span className="meme-spot-ping" />
        </div>
      )}

      {/* La bottom-nav sotto cresce di `env(safe-area-inset-bottom)` (App.tsx): senza
          sommarlo qui, su iPhone col notch la bubble scende sulla nav e il bottone
          "Scatta" rialzato copre "Salta la lezione". Stesso pattern di UpdateReadyToast. */}
      <div
        ref={bollaRef}
        className="fixed inset-x-3 z-[45] max-w-md mx-auto" id="meme-guide"
        style={inAlto !== null
          ? { top: `${inAlto}px`, bottom: "auto" }
          : { bottom: "calc(6rem + env(safe-area-inset-bottom))" }}
      >
        <div
          className="meme-bubble flex items-start gap-2.5 p-3.5 overscroll-contain touch-none"
          onTouchMove={(e) => e.stopPropagation()}
        >
          <span className="text-3xl drop-shadow leading-none" aria-hidden="true">👵</span>
          <div className="flex-grow min-w-0">
            <div className="t-meta text-primary-strong">
              Mémé di Nus
              {battuta && <span className="text-slate-400"> · {beatCorrente + 1} di {BEAT_TOTALI}</span>}
            </div>
            <p className="meme-testo text-slate-200 mt-1" aria-live="polite">{testoMostrato}</p>
            <div className="flex items-center gap-2 mt-2.5">
              {onAvanti && labelAvanti && (
                <button
                  onClick={() => { playClick(); onAvanti(); }}
                  className="btn-primary border font-black text-[13px] min-h-11 px-5 rounded-xl"
                >
                  {labelAvanti}
                </button>
              )}
              {onSalta && (
                <button
                  onClick={() => { playClick(); onSalta(); }}
                  className="meme-salta text-[11px] text-slate-400 underline underline-offset-2"
                >
                  Salta la lezione
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
