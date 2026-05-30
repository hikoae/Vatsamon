export interface LatLng {
  lat: number;
  lng: number;
}

const R = 6371000; // raggio terrestre in metri

/** Distanza in metri tra due coordinate (formula haversine). */
export function distanza(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function rad(d: number): number {
  return (d * Math.PI) / 180;
}

/** Sposta un punto verso un target di al massimo `passoMetri`. */
export function versoTarget(da: LatLng, target: LatLng, passoMetri: number): LatLng {
  const d = distanza(da, target);
  if (d <= passoMetri || d === 0) return { ...target };
  const t = passoMetri / d;
  return {
    lat: da.lat + (target.lat - da.lat) * t,
    lng: da.lng + (target.lng - da.lng) * t,
  };
}

/** Formatta una distanza in m / km. */
export function fmtDist(m: number): string {
  return m < 950 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Centro geografico (media) di una lista di punti. */
export function centro(punti: LatLng[]): LatLng {
  if (punti.length === 0) return { lat: 45.737, lng: 7.32 };
  const s = punti.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: s.lat / punti.length, lng: s.lng / punti.length };
}

/** Raggio entro cui si può catturare una Reina (metri). */
export const RAGGIO_CATTURA = 150;
