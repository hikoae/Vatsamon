/**
 * RETENTION — "Il Giro di Stalla": missioni giornaliere deterministiche (seed =
 * data) + streak "Giorni in Alpeggio" con grazia del maltempo. 100% statico
 * (localStorage), niente backend. Non predatorio: tetto 3 missioni/giorno, lo
 * streak si congela (non azzera) saltando un giorno.
 */

export type MissionKind = "visita" | "cattura" | "cammina";

export interface MissionTemplate {
  kind: MissionKind;
  n: number;
  label: string;
  coins: number;
  xp: number;
}

/** Pool di missioni "tracciabili" da contatori esistenti del giocatore. */
const POOL: MissionTemplate[] = [
  { kind: "cattura", n: 2, label: "Fatti affidare 2 Reines", coins: 20, xp: 120 },
  { kind: "cattura", n: 1, label: "Fatti affidare 1 Reina", coins: 12, xp: 80 },
  { kind: "cammina", n: 2, label: "Cammina 2 km tra gli alpeggi", coins: 15, xp: 100 },
  { kind: "cammina", n: 1, label: "Cammina 1 km tra gli alpeggi", coins: 10, xp: 60 },
];

/** La prima missione è sempre il "Giro di Stalla" (si completa aprendo l'app). */
const VISITA: MissionTemplate = { kind: "visita", n: 1, label: "Fai il Giro di Stalla", coins: 8, xp: 40 };

export interface DailyMission extends MissionTemplate { id: string }

/** Data odierna come stringa stabile YYYY-MM-DD. */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** 3 missioni del giorno, deterministiche dal seed-data (uguali per tutti). */
export function missionsForDay(dayKey: string): DailyMission[] {
  const seed = hash(dayKey);
  // due missioni distinte dal pool, derivate dal seed
  const i1 = seed % POOL.length;
  let i2 = (Math.floor(seed / POOL.length) + 1) % POOL.length;
  if (i2 === i1) i2 = (i2 + 1) % POOL.length;
  const picks = [VISITA, POOL[i1], POOL[i2]];
  return picks.map((m, idx) => ({ ...m, id: `${dayKey}-${idx}` }));
}

/** Giorno precedente (YYYY-MM-DD). */
export function yesterdayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return todayKey(dt);
}
