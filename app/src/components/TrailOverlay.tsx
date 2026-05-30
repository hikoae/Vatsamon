import { useEffect, useRef } from "react";
import L from "leaflet";
import { ValdostanTrail } from "../data/trails";

/**
 * Disegna un sentiero reale (polyline + landmark + pascolo) sopra la mappa Leaflet
 * esistente, senza gonfiare App.tsx né toccare i marker già presenti.
 * Gestisce i propri layer in un LayerGroup dedicato e li ripulisce al cambio.
 */
export function TrailOverlay({ map, trail }: { map: L.Map | null; trail: ValdostanTrail | null }) {
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;
    // (ri)crea il gruppo layer del sentiero
    if (groupRef.current) {
      try { groupRef.current.remove(); } catch { /* mappa già distrutta */ }
      groupRef.current = null;
    }
    if (!trail) return;

    const group = L.layerGroup().addTo(map);
    groupRef.current = group;

    // Tracciato del sentiero (arancio, distinto dal verde "esplora libera")
    const line = trail.trailPoints.map((p) => [p.lat, p.lng] as L.LatLngTuple);
    L.polyline(line, { color: "#f59e0b", weight: 5, opacity: 0.95 }).addTo(group);
    // alone tratteggiato per leggibilità
    L.polyline(line, { color: "#fde68a", weight: 1.5, opacity: 0.8, dashArray: "2, 10" }).addTo(group);

    // Landmark del sentiero
    trail.landmarks.forEach((lm) => {
      const icon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div class="flex flex-col items-center">
                 <div class="w-8 h-8 rounded-full border-2 border-amber-400 bg-[#211b3a] flex items-center justify-center shadow-lg" style="transform: translateY(-6px);">
                   <span class="text-base">${lm.iconEmoji}</span>
                 </div>
                 <div class="px-1.5 py-0.5 rounded bg-[#211b3a]/95 border border-amber-700 text-[8px] text-amber-100 font-mono font-bold whitespace-nowrap" style="transform: translateY(-8px);">${lm.name}</div>
               </div>`,
        iconSize: [40, 46],
        iconAnchor: [20, 23],
      });
      L.marker([lm.lat, lm.lng], { icon, interactive: false }).addTo(group);
    });

    // Pascolo di riferimento del sentiero
    const pastureIcon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `<div class="w-9 h-9 rounded-full border-2 border-emerald-300 bg-emerald-700/80 flex items-center justify-center shadow-lg"><span class="text-lg">🐄</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    L.marker([trail.pasture.lat, trail.pasture.lng], { icon: pastureIcon, interactive: false }).addTo(group);

    // Inquadra il sentiero
    try {
      map.fitBounds(L.latLngBounds(line), { padding: [40, 40], maxZoom: trail.zoom });
    } catch { /* noop */ }

    return () => {
      if (groupRef.current) {
        try { groupRef.current.remove(); } catch { /* mappa già distrutta */ }
        groupRef.current = null;
      }
    };
  }, [map, trail]);

  return null;
}
