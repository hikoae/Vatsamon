/**
 * L'ARP — l'alpeggio che fa la Reina (dossier §1 e §10).
 *
 * Durante la pausa reale dell'inalpa (giugno–luglio) le batailles si fermano
 * PERCHÉ le mandrie salgono all'alpe: nel gioco, mandi i capi "en arp" e li
 * curi UN gesto al giorno reale → crescono di peso (prepararsi alle soglie
 * estive più alte) e l'alpe produce Fontina. Chi è all'arp NON gareggia:
 * scendere o restare è una scelta strategica (ad agosto le gare riprendono).
 *
 * LA DÉSARPA (29/9): la cerimonia annuale della discesa incorona due regine
 * DELLA TUA mandria — la "Reina di corne" (fiori rossi, la più combattiva:
 * più vittorie stagionali) e la "Reine du lait" (fiori bianchi, la più
 * produttiva all'alpe). Titoli di mandria, come nella tradizione (dossier
 * §10) — NON titoli regionali.
 */

export interface CapoAllArp {
  salitaIl: string;          // ISO del giorno dell'inarpa
  ultimaCura: string | null; // ISO dell'ultimo gesto di cura (1 al giorno)
  giorniCura: number;        // giorni di cura accumulati (produzione)
}

export interface DesarpaRecord {
  celebrata: boolean;
  corne?: string;  // nome della Reina di corne dell'anno
  lait?: string;   // nome della Reine du lait dell'anno
}

export interface ArpState {
  capi: Record<string, CapoAllArp>;
  desarpa: Record<string, DesarpaRecord>; // per anno ("2026")
  /** Giorni di cura CUMULATIVI per anno e per capo (per la Reine du lait):
   *  si consolidano quando un capo scende a valle o alla désarpa. */
  produzione: Record<string, Record<string, number>>;
}

export const LS_ARP = "vatsamon_arp";
export const ARP_VUOTO: ArpState = { capi: {}, desarpa: {}, produzione: {} };

/** Data della désarpa (dossier §10: fine settembre, 29/9). */
export const DESARPA_GIORNO = "-09-29";

/** +kg per giorno di cura all'arp (l'erba d'alta quota fa la stazza). */
export const ARP_KG_PER_CURA = 2;
/** Ogni quanti giorni di cura l'alpe rende una Forma di Fontina. */
export const ARP_GIORNI_PER_FONTINA = 3;

export function desarpaDisponibile(oggiISO: string, stato: ArpState): boolean {
  const anno = oggiISO.slice(0, 4);
  return oggiISO >= `${anno}${DESARPA_GIORNO}` && !stato.desarpa[anno]?.celebrata;
}
