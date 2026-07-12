/**
 * Battaglie piazzate sulla MAPPA: Pastori (sfide narrative) e Boss-Arena
 * (vere Reines Epiche/Leggendarie con medaglia). Ognuna ha coordinate reali,
 * livello richiesto e i dati per costruire l'avversario.
 */
import { NPC_OPPONENTS, Pastore } from "./opponents";
import { ARENAS, Arena } from "./arenas";

export interface MapBattle {
  id: string;
  kind: "pastore" | "arena";
  name: string;
  subtitle: string;
  emoji: string;
  lat: number;
  lng: number;
  reqLevel: number;
  accent: string; // hex
  pastore?: Pastore;
  arena?: Arena;
  /** Bataille-lezione di Mémé (data/tutorialBattle.ts): fuori mappa, scena guidata. */
  tutorial?: boolean;
}

// Luoghi reali dei Pastori (vicino ai loro alpeggi narrativi).
const PASTORE_COORDS: Record<string, { lat: number; lng: number; sub: string }> = {
  "pastore-1": { lat: 45.5971, lng: 7.3185, sub: "Valnontey · Cogne" },
  "pastore-2": { lat: 45.8453, lng: 7.0707, sub: "Alpe Pré de Bar · Val Ferret" },
  "pastore-3": { lat: 45.6985, lng: 7.7105, sub: "Challand-Saint-Anselme" },
  "pastore-4": { lat: 45.862, lng: 7.323, sub: "Valpelline" },
  "pastore-5": { lat: 45.631, lng: 7.062, sub: "Valgrisenche" },
  "pastore-6": { lat: 45.623, lng: 7.618, sub: "Champorcher" },
  "pastore-7": { lat: 45.59, lng: 7.213, sub: "Valsavarenche" },
  "pastore-8": { lat: 45.871, lng: 7.171, sub: "Gran San Bernardo" },
  "pastore-9": { lat: 45.936, lng: 7.631, sub: "Breuil-Cervinia" },
  "pastore-10": { lat: 45.758, lng: 7.038, sub: "Vigneti di Morgex" },
  "pastore-11": { lat: 45.776, lng: 7.824, sub: "Gressoney-Saint-Jean" },
  "pastore-12": { lat: 45.879, lng: 7.625, sub: "Valtournenche" },
};

// Luoghi reali delle Arene (paesi/valli omonimi).
// Palestre sugli ALPEGGI reali.
const ARENA_COORDS: Record<string, { lat: number; lng: number }> = {
  herbetet: { lat: 45.5971, lng: 7.3185 },
  money: { lat: 45.575, lng: 7.301 },
  gabiet: { lat: 45.8351, lng: 7.8491 },
  predebar: { lat: 45.8453, lng: 7.0707 },
  nivolet: { lat: 45.472, lng: 7.133 },
  tsatsan: { lat: 45.93, lng: 7.49 },
};

function pastoreReq(p: Pastore): number {
  return p.cowLevel <= 4 ? 1 : p.cowLevel <= 6 ? 3 : 6;
}

export const MAP_BATTLES: MapBattle[] = [
  ...NPC_OPPONENTS.map((p): MapBattle => {
    const c = PASTORE_COORDS[p.id] ?? { lat: 45.7, lng: 7.3, sub: "Valle d'Aosta" };
    return {
      id: `mb-${p.id}`,
      kind: "pastore",
      name: p.name,
      subtitle: c.sub,
      emoji: p.avatar,
      lat: c.lat,
      lng: c.lng,
      reqLevel: pastoreReq(p),
      accent: "#e08a0a",
      pastore: p,
    };
  }),
  ...ARENAS.map((a): MapBattle => {
    const c = ARENA_COORDS[a.id] ?? { lat: 45.7, lng: 7.3 };
    return {
      id: `mb-${a.id}`,
      kind: "arena",
      name: a.name,
      subtitle: `${a.difficulty} · Boss CP ~${a.cp} · 🏅 ${a.badgeName}`,
      emoji: a.badgeEmoji,
      lat: c.lat,
      lng: c.lng,
      reqLevel: a.requiredLevel,
      accent: a.accent,
      arena: a,
    };
  }),
];
