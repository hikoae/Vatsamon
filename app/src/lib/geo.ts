export interface LatLng { lat: number; lng: number; }

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

/** Sposta un punto verso un target di al massimo `passoMetri`. */
export function versoTarget(da: LatLng, target: LatLng, passoMetri: number): LatLng {
  const d = distanza(da, target);
  if (d <= passoMetri || d === 0) return { ...target };
  const t = passoMetri / d;
  return { lat: da.lat + (target.lat - da.lat) * t, lng: da.lng + (target.lng - da.lng) * t };
}

/** Raggio entro cui si può catturare una Reina reale (metri). */
export const RAGGIO_CATTURA = 250;
