import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BOVINE, CASERE } from "../data/db";
import type { Casera, Vazzamon } from "../data/types";
import { useGame } from "../store/game";
import { distanza, fmtDist, versoTarget, RAGGIO_CATTURA, type LatLng } from "../lib/geo";
import { SENTIERO } from "../lib/trail";
import { soundEngine } from "../lib/audio";

function cowPin(emoji: string, far: boolean, cp?: number) {
  return L.divIcon({
    className: "",
    html: `<div class="pin ${far ? "far" : ""}"><span>${emoji}</span>${
      cp ? `<b class="cp">${cp}</b>` : ""
    }</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}
const caseraIcon = L.divIcon({
  className: "",
  html: `<div class="casera">🍼</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});
const PLAYER = L.divIcon({ className: "", html: `<div class="player-dot"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] });

function MapEvents({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}
function Recenter({ point }: { point: LatLng }) {
  const map = useMap();
  useEffect(() => { map.panTo([point.lat, point.lng], { animate: true }); }, [point.lat, point.lng, map]);
  return null;
}

export function MapScreen({
  player, setPlayer, wild, onCapture, onCasera, onToast,
}: {
  player: LatLng;
  setPlayer: (p: LatLng) => void;
  wild: Vazzamon[];
  onCapture: (c: Vazzamon, isWild: boolean) => void;
  onCasera: (c: Casera) => void;
  onToast: (m: string) => void;
}) {
  const { captured, camminaMetri, sound } = useGame();
  const [gps, setGps] = useState(false);
  const watchId = useRef<number | null>(null);

  const reali = useMemo(() => BOVINE.filter((b) => !captured.has(b.id)), [captured]);
  const tutte = useMemo(() => [...reali, ...wild], [reali, wild]);

  const vicina = useMemo(() => {
    let best: { c: Vazzamon; d: number; wild: boolean } | null = null;
    for (const c of reali) { const d = distanza(player, c); if (!best || d < best.d) best = { c, d, wild: false }; }
    for (const c of wild) { const d = distanza(player, c); if (!best || d < best.d) best = { c, d, wild: true }; }
    return best;
  }, [reali, wild, player]);

  function muovi(to: LatLng) {
    const d = distanza(player, to);
    if (d <= 3000) {
      const hatched = camminaMetri(d);
      if (hatched.length) onToast(`🥚 Un uovo si è schiuso camminando!`);
    }
    setPlayer(to);
  }
  function tapMappa(p: LatLng) { if (!gps) muovi(p); }
  function avvicinati() {
    if (!vicina) return;
    muovi(versoTarget(player, vicina.c, 140));
    if (sound) soundEngine.playClick();
  }
  function tapCow(c: Vazzamon, isWild: boolean) {
    const d = distanza(player, c);
    if (d <= RAGGIO_CATTURA) { if (sound) soundEngine.playMoo(); onCapture(c, isWild); }
    else onToast(`${c.nome} è a ${fmtDist(d)} — avvicinati lungo il sentiero!`);
  }

  function toggleGps() {
    if (gps) {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null; setGps(false); return;
    }
    if (!navigator.geolocation) { onToast("GPS non disponibile"); return; }
    onToast("Attivo il GPS reale…");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => { setGps(true); muovi({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => onToast("Permesso GPS negato: usa la demo (tocca la mappa)"),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }
  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); }, []);

  const inRange = vicina && vicina.d <= RAGGIO_CATTURA;

  return (
    <div className="relative h-full">
      <MapContainer center={[player.lat, player.lng]} zoom={13} scrollWheelZoom zoomControl={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents onClick={tapMappa} />
        <Recenter point={player} />
        <Polyline positions={SENTIERO.map((w) => [w.lat, w.lng])} pathOptions={{ color: "#2e5d34", weight: 4, opacity: 0.6, dashArray: "8 10" }} />
        <Circle center={[player.lat, player.lng]} radius={RAGGIO_CATTURA}
          pathOptions={{ color: "#2e5d34", fillColor: "#2e5d34", fillOpacity: 0.12, weight: 1.5 }} />
        <Marker position={[player.lat, player.lng]} icon={PLAYER} />

        {CASERE.map((c) => (
          <Marker key={c.id} position={[c.lat, c.lng]} icon={caseraIcon} eventHandlers={{ click: () => onCasera(c) }} />
        ))}

        {tutte.map((c) => {
          const far = distanza(player, c) > RAGGIO_CATTURA;
          const isWild = c.origine !== "reale";
          return (
            <Marker key={c.id} position={[c.lat, c.lng]}
              icon={cowPin(isWild ? "🐄" : "🐮", far, isWild ? c.cp : undefined)}
              eventHandlers={{ click: () => tapCow(c, isWild) }} />
          );
        })}
      </MapContainer>

      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-[1200] max-w-[92%]">
        <span className={`inline-block px-3.5 py-2 rounded-full text-[13px] font-bold shadow-md truncate ${inRange ? "bg-alpino-700 text-white" : "bg-white text-alpino-900"}`}>
          {inRange ? `🐮 ${vicina!.c.nome} a portata · tocca per catturare`
            : vicina ? `🧭 Più vicina: ${vicina.c.nome} a ${fmtDist(vicina.d)}`
            : "🎉 Tutte catturate qui intorno!"}
        </span>
      </div>

      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-[1200] flex gap-2">
        <button onClick={toggleGps} className={`px-4 py-2.5 rounded-full font-bold text-sm shadow-md ${gps ? "bg-cielo text-white" : "bg-white text-alpino-900"}`}>
          📍 {gps ? "GPS attivo" : "GPS reale"}
        </button>
        {!gps && vicina && <button onClick={avvicinati} className="px-4 py-2.5 rounded-full font-bold text-sm shadow-md bg-alpino-700 text-white">🥾 Avvicinati</button>}
      </div>

      {!gps && (
        <div className="absolute bottom-[68px] left-1/2 -translate-x-1/2 z-[1200] bg-alpino-900/85 text-white text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap shadow">
          🥾 Demo: <b>tocca la mappa</b> per camminare lungo il sentiero
        </div>
      )}
    </div>
  );
}
