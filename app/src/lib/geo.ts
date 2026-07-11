export interface LatLng { lat: number; lng: number; }

export interface RoutePoint extends LatLng { name: string; }

export interface RouteMatch {
  /** Segmento più vicino: `index` → `index + 1`. */
  segmentIndex: number;
  /** Avanzamento sul segmento più vicino (0..100). */
  progress: number;
  /** Distanza ortogonale dal tracciato, in metri. */
  distanceM: number;
}

const R = 6371000;

/** Distanza in metri (haversine). */
export function distanza(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function rad(d: number) { return (d * Math.PI) / 180; }

export function fmtDist(m: number): string {
  return m < 950 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Direzione cardinale breve verso un punto, per l'interfaccia di navigazione. */
export function direzioneVerso(from: LatLng, to: LatLng): string {
  const lat1 = rad(from.lat), lat2 = rad(to.lat), dLng = rad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(bearing / 45) % 8];
}

/**
 * Proietta la posizione sul segmento più vicino del percorso. È un calcolo
 * locale (nessuna chiamata di rete), pensato per aggiornare il GPS in modo
 * gentile: il chiamante decide quanto distante dal sentiero sia accettabile.
 */
export function abbinaPosizioneAPercorso(position: LatLng, route: RoutePoint[]): RouteMatch | null {
  if (route.length < 2) return null;
  let best: RouteMatch | null = null;

  for (let index = 0; index < route.length - 1; index++) {
    const start = route[index];
    const end = route[index + 1];
    const refLat = rad((start.lat + end.lat) / 2);
    const scaleX = R * Math.cos(refLat);
    const ax = (position.lng - start.lng) * Math.PI / 180 * scaleX;
    const ay = (position.lat - start.lat) * Math.PI / 180 * R;
    const bx = (end.lng - start.lng) * Math.PI / 180 * scaleX;
    const by = (end.lat - start.lat) * Math.PI / 180 * R;
    const lengthSq = bx * bx + by * by;
    const rawT = lengthSq === 0 ? 0 : (ax * bx + ay * by) / lengthSq;
    const t = Math.max(0, Math.min(1, rawT));
    const distanceM = Math.hypot(ax - bx * t, ay - by * t);
    const candidate = { segmentIndex: index, progress: Math.round(t * 100), distanceM };
    if (!best || candidate.distanceM < best.distanceM) best = candidate;
  }
  return best;
}

/** Sposta un punto verso un target di al massimo `passoMetri`. */
export function versoTarget(da: LatLng, target: LatLng, passoMetri: number): LatLng {
  const d = distanza(da, target);
  if (d <= passoMetri || d === 0) return { ...target };
  const t = passoMetri / d;
  return { lat: da.lat + (target.lat - da.lat) * t, lng: da.lng + (target.lng - da.lng) * t };
}

/** Raggio entro cui si può catturare una Reina reale (metri). */
export const RAGGIO_CATTURA = 250;
