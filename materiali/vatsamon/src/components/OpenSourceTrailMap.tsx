import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { type ValdostanTrail } from '../utils/trails';

// Helper to get point on path
function getPointAlongPath(points: { lat: number; lng: number }[], fraction: number) {
  if (!points || points.length === 0) return { lat: 45.6025, lng: 7.3150 };
  if (fraction <= 0) return points[0];
  if (fraction >= 1) return points[points.length - 1];

  const totalPoints = points.length;
  const exactIndex = fraction * (totalPoints - 1);
  const index = Math.floor(exactIndex);
  const nextIndex = Math.min(totalPoints - 1, index + 1);
  const segmentFraction = exactIndex - index;

  const start = points[index];
  const end = points[nextIndex];

  return {
    lat: start.lat + (end.lat - start.lat) * segmentFraction,
    lng: start.lng + (end.lng - start.lng) * segmentFraction
  };
}

interface OpenSourceTrailMapProps {
  selectedTrail: ValdostanTrail;
  distanceWalked: number;
  randomEncounterSpotted: { breed: string; distance: number; demoId: string } | null;
  onCaptureEncounter: (demoId: string) => void;
}

export function OpenSourceTrailMap({
  selectedTrail,
  distanceWalked,
  randomEncounterSpotted,
  onCaptureEncounter
}: OpenSourceTrailMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const hikerMarkerRef = useRef<L.Marker | null>(null);
  const encounterMarkerRef = useRef<L.Marker | null>(null);
  const landmarkMarkersRef = useRef<L.Marker[]>([]);
  const [mapType, setMapType] = useState<'topo' | 'osm'>('topo');

  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet Map instance
    const map = L.map(mapContainerRef.current, {
      center: [selectedTrail.center.lat, selectedTrail.center.lng],
      zoom: selectedTrail.zoom,
      zoomControl: false, // Customized buttons in layout
      attributionControl: true
    });

    mapRef.current = map;

    // Set Default Tile Layer (OpenTopoMap has beautiful topographic map styling, or OSM)
    const tileUrl = mapType === 'topo' 
      ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      
    const attribution = mapType === 'topo'
      ? 'Map data: &copy; OSM contributors, SRTM | Style: &copy; OpenTopoMap'
      : '&copy; OpenStreetMap contributors';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 17,
      attribution: attribution
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Add scale
    L.control.scale({ position: 'bottomleft' }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map layer source when mapType changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const tileUrl = mapType === 'topo' 
      ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      
    const attribution = mapType === 'topo'
      ? 'Map data: &copy; OSM contributors, SRTM | Style: &copy; OpenTopoMap'
      : '&copy; OpenStreetMap contributors';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 17,
      attribution: attribution
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [mapType]);

  // Handle selected trail center/zoom change & draw path
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedTrail) return;

    // Update center and zoom
    map.setView([selectedTrail.center.lat, selectedTrail.center.lng], selectedTrail.zoom);

    // Remove existing polyline if any
    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    // Draw Trail Polyline (Alpine Style Dotted/Dashed Line)
    const latLngs = selectedTrail.trailPoints.map(p => L.latLng(p.lat, p.lng));
    const polyline = L.polyline(latLngs, {
      color: '#5A5A40',
      weight: 5,
      opacity: 0.85,
      dashArray: '10, 8'
    }).addTo(map);

    polylineRef.current = polyline;

    // Clear existing landmark markers
    landmarkMarkersRef.current.forEach(m => m.remove());
    landmarkMarkersRef.current = [];

    // Draw Landmark markers
    selectedTrail.landmarks.forEach(l => {
      const customIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div class="flex flex-col items-center select-none" style="transform: translate(-51%, -101%);">
            <div class="bg-white/95 border border-[#c2c2b0] text-[10px] font-bold text-stone-800 px-2.5 py-1.5 rounded-xl shadow-lg whitespace-nowrap mb-1 flex items-center gap-1">
              <span>${l.iconEmoji}</span>
              <span>${l.name}</span>
            </div>
            <div class="w-2.5 h-2.5 bg-white border-r border-b border-[#c2c2b0] rotate-45 -mt-2"></div>
          </div>
        `,
        iconSize: [120, 40],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([l.lat, l.lng], { icon: customIcon }).addTo(map);
      landmarkMarkersRef.current.push(marker);
    });

  }, [selectedTrail]);

  // Update Hiker Position smoothly
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedTrail) return;

    const fraction = Math.min(1, distanceWalked / selectedTrail.lengthKm);
    const coord = getPointAlongPath(selectedTrail.trailPoints, fraction);

    if (hikerMarkerRef.current) {
      hikerMarkerRef.current.setLatLng([coord.lat, coord.lng]);
    } else {
      const hikerIcon = L.divIcon({
        className: 'custom-hiker-icon',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="width: 40px; height: 40px;">
            <div class="absolute w-8 h-8 bg-[#5A5A40]/30 rounded-full animate-ping"></div>
            <div class="w-8 h-8 bg-[#5A5A40] rounded-full border-2 border-white flex items-center justify-center shadow-lg text-lg">
              🥾
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([coord.lat, coord.lng], { icon: hikerIcon }).addTo(map);
      hikerMarkerRef.current = marker;
    }

    // Pan map to player as they simulated-walk
    if (distanceWalked > 0) {
      map.panTo([coord.lat, coord.lng]);
    }
  }, [distanceWalked, selectedTrail]);

  // Render Cow Encounter point
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedTrail) return;

    if (encounterMarkerRef.current) {
      encounterMarkerRef.current.remove();
      encounterMarkerRef.current = null;
    }

    if (randomEncounterSpotted) {
      const cowIcon = L.divIcon({
        className: 'custom-cow-encounter-icon',
        html: `
          <div class="relative flex flex-col items-center justify-center animate-bounce -translate-x-1/2 -translate-y-[80%]" style="width: 100px; height: 80px;">
            <div class="bg-[#faedcd] text-[#8a5a00] text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-md border border-[#d4a373] mb-1 whitespace-nowrap">
              🔔 MUGGITO!
            </div>
            <div class="w-10 h-10 bg-[#d4a373] rounded-full flex items-center justify-center border-2 border-white shadow-xl text-xl">
              🐄
            </div>
          </div>
        `,
        iconSize: [100, 80],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([selectedTrail.pasture.lat, selectedTrail.pasture.lng], { icon: cowIcon })
        .addTo(map)
        .on('click', () => {
          onCaptureEncounter(randomEncounterSpotted.demoId);
        });

      encounterMarkerRef.current = marker;
    }
  }, [randomEncounterSpotted, selectedTrail]);

  // Resize listener
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="h-[430px] w-full rounded-2xl relative overflow-hidden border border-[#d6d6cc] bg-[#e1e1d8] shadow-sm flex flex-col">
      {/* Map body */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full z-0" />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[999] flex flex-col gap-2">
        {/* Toggle between Scenic/OpenTopoMap and OSM */}
        <div className="bg-white/95 backdrop-blur-sm p-1 rounded-xl shadow-md border border-stone-200 flex flex-col gap-1 text-[11px] font-serif font-bold">
          <button
            onClick={() => setMapType('topo')}
            className={`py-1.5 px-3 rounded-lg text-left transition-colors flex items-center gap-1.5 ${
              mapType === 'topo' ? 'bg-[#5A5A40] text-white' : 'text-[#5A5A40] hover:bg-[#f5f5f0]'
            }`}
          >
            🏔️ RILIEVO TOPO
          </button>
          <button
            onClick={() => setMapType('osm')}
            className={`py-1.5 px-3 rounded-lg text-left transition-colors flex items-center gap-1.5 ${
              mapType === 'osm' ? 'bg-[#5A5A40] text-white' : 'text-[#5A5A40] hover:bg-[#f5f5f0]'
            }`}
          >
            🗺️ STRADARIO OSM
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex flex-col bg-white/95 backdrop-blur-sm rounded-xl shadow-md overflow-hidden border border-[#d6d6cc] self-end">
          <button
            onClick={() => {
              mapRef.current?.zoomIn();
            }}
            title="Aumenta zoom"
            className="w-10 h-10 hover:bg-[#f5f5f0] flex items-center justify-center text-stone-600 font-bold text-sm border-b border-stone-200"
          >
            ➕
          </button>
          <button
            onClick={() => {
              mapRef.current?.zoomOut();
            }}
            title="Diminuisci zoom"
            className="w-10 h-10 hover:bg-[#f5f5f0] flex items-center justify-center text-stone-600 font-bold text-sm"
          >
            ➖
          </button>
        </div>
      </div>

      {/* Spoken encounter & Progress tags */}
      {randomEncounterSpotted ? (
        <div className="absolute inset-x-4 top-4 bg-[#faedcd]/95 border-2 border-[#d4a373] p-3 rounded-xl shadow-lg flex items-center justify-between z-[999] animate-pulse backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔🐄</span>
            <div>
              <div className="text-sm font-bold text-[#8a5a00] font-serif">Muggito udito a {randomEncounterSpotted.distance} metri!</div>
              <div className="text-xs text-stone-700">Trovata una splendida <span className="font-bold">{randomEncounterSpotted.breed}</span> al pascolo.</div>
            </div>
          </div>
          <button
            onClick={() => onCaptureEncounter(randomEncounterSpotted.demoId)}
            className="bg-[#d4a373] hover:bg-[#c29262] text-white font-serif italic text-xs py-2 px-3 rounded-xl font-bold tracking-tight shadow flex items-center gap-1.5 transition-colors"
          >
            📷 INQUADRA mucca
          </button>
        </div>
      ) : (
        <div className="absolute top-4 left-4 z-[999] text-xs font-mono text-stone-800 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-stone-200">
          Progresso Escursione: <span className="font-bold text-[#5A5A40]">{distanceWalked.toFixed(2)} / {selectedTrail.lengthKm} Km</span>
        </div>
      )}

      {/* Ambient message overlay */}
      <div className="absolute bottom-4 left-4 right-16 flex justify-between items-end gap-4 pointer-events-none z-[999]">
        <div className="bg-[#fefae0]/95 backdrop-blur-sm p-3 rounded-xl text-[11px] max-w-[280px] border border-[#faedcd] shadow-md select-none pointer-events-auto">
          <span className="font-bold font-serif block text-[#8a5a00]">🌾 Flora d'Alpeggio:</span>
          Le bovine mangiano trifoglio alpino fiorito che dona alla Fontina DOP il caratteristico aroma floreale e fruttato.
        </div>
      </div>
    </div>
  );
}
