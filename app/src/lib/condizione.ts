import { ArpState, ARP_VUOTO, LS_ARP } from "../data/arp";
import { oggiISO } from "./oggi";

/**
 * CONDIZIONE STAGIONALE (S18) — "in forma dopo la cura all'Arp".
 *
 * Legge lo stato ESISTENTE dell'Arp (data/arp.ts, chiave `vatsamon_arp`, già
 * in SAVE_KEYS): nessun nuovo dato salvato, nessuna migrazione. La cura
 * all'alpe (App.tsx `curaArp`) resta il gesto reale che conta; qui si limita
 * a tradursi in un PICCOLO bonus CAPPATO a fiato/volontà — un nudge di forma,
 * MAI un secondo canale di progressione: la bovina non si allena come un
 * atleta.
 *
 * "Curata di recente" = giorni di cura dell'ANNO in corso, sia per un capo
 * ancora all'alpe (`capi[id].giorniCura`, cresce un gesto al giorno) sia per
 * chi è già scesa a valle o alla désarpa (la cura si consolida per anno in
 * `produzione[anno][id]` — vedi App.tsx `consolidaProduzione`). Il massimo
 * dei due copre entrambi i momenti in cui la Reina può tornare a spingere.
 */

/** Giorni di cura stagionale che bastano per il bonus pieno. */
const GIORNI_PER_BONUS_PIENO = 6;

/** Bonus massimo applicabile a fiato/volontà — piccolo apposta. */
export const CONDIZIONE_BONUS_MAX = 4;

function leggiArpState(): ArpState {
  try {
    const raw = localStorage.getItem(LS_ARP);
    if (!raw) return ARP_VUOTO;
    return { ...ARP_VUOTO, ...JSON.parse(raw) };
  } catch {
    return ARP_VUOTO;
  }
}

function giorniCuraStagione(cowId: string, oggi: string, stato: ArpState): number {
  const anno = oggi.slice(0, 4);
  const inCorso = stato.capi[cowId]?.giorniCura ?? 0;
  const consolidati = stato.produzione[anno]?.[cowId] ?? 0;
  return Math.max(inCorso, consolidati);
}

/** Bonus 0..CONDIZIONE_BONUS_MAX da sommare a fiato/volontà (buildPlayerFighter). */
export function condizioneDaArp(cowId: string, oggi: string = oggiISO()): number {
  const giorni = giorniCuraStagione(cowId, oggi, leggiArpState());
  if (giorni <= 0) return 0;
  return Math.round(Math.min(1, giorni / GIORNI_PER_BONUS_PIENO) * CONDIZIONE_BONUS_MAX);
}

/** true se il nudge di forma è attivo (per la riga UI nell'intro battaglia). */
export function condizioneAttiva(cowId: string, oggi: string = oggiISO()): boolean {
  return condizioneDaArp(cowId, oggi) > 0;
}
