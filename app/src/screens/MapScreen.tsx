import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BOVINE } from "../data/db";
import type { Bovina } from "../data/types";
import { useGame } from "../store/game";
import {
  distanza,
  fmtDist,
  versoTarget,
  RAGGIO_CATTURA,
  type LatLng,
} from "../lib/geo";

function pin(emoji: string, far: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="pin ${far ? "far" : ""}"><span>${emoji}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}
const PLAYER = L.divIcon({
  className: "",
  html: `<div class="player-dot"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapEvents({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Recenter({ point }: { point: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([point.lat, point.lng], { animate: true });
  }, [point.lat, point.lng, map]);
  return null;
}

export function MapScreen({
  player,
  setPlayer,
  onEncounter,
  onToast,
}: {
  player: LatLng;
  setPlayer: (p: LatLng) => void;
  onEncounter: (b: Bovina) => void;
  onToast: (m: string) => void;
}) {
  const { captured, camminaMetri } = useGame();
  const [gps, setGps] = useState(false);
  const watchId = useRef<number | null>(null);

  const selvatiche = useMemo(
    () => BOVINE.filter((b) => !captured.has(b.id)),
    [captured],
  );

  const vicina = useMemo(() => {
    let best: { b: Bovina; d: number } | null = null;
    for (const b of selvatiche) {
      const d = distanza(player, b);
      if (!best || d < best.d) best = { b, d };
    }
    return best;
  }, [selvatiche, player]);

  // sposta il giocatore; conta i metri come "camminati" solo se è uno spostamento
  // plausibile a piedi (i salti del GPS o tap lontani non gonfiano i passi)
  function muovi(to: LatLng) {
    const d = distanza(player, to);
    if (d <= 3000) camminaMetri(d);
    setPlayer(to);
  }

  function tapMappa(p: LatLng) {
    if (gps) return; // in modalità GPS non si cammina col tap
    muovi(p);
  }

  function avvicinati() {
    if (!vicina) return;
    const next = versoTarget(player, vicina.b, 140); // ~1 passo lungo il sentiero
    muovi(next);
    const d = distanza(next, vicina.b);
    if (d <= RAGGIO_CATTURA)
      onToast(`Sei vicino a ${vicina.b.nome}! Tocca la 🐮 per catturarla`);
  }

  function tapBovina(b: Bovina) {
    const d = distanza(player, b);
    if (d <= RAGGIO_CATTURA) onEncounter(b);
    else onToast(`${b.nome} è a ${fmtDist(d)} — avvicinati lungo il sentiero!`);
  }

  function toggleGps() {
    if (gps) {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setGps(false);
      return;
    }
    if (!navigator.geolocation) {
      onToast("GPS non disponibile su questo dispositivo");
      return;
    }
    onToast("Attivo il GPS reale…");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGps(true);
        muovi({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => onToast("Permesso GPS negato: usa la modalità demo (tocca la mappa)"),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  const inRange = vicina && vicina.d <= RAGGIO_CATTURA;

  return (
    <div className="map-wrap">
      <MapContainer
        center={[player.lat, player.lng]}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onClick={tapMappa} />
        <Recenter point={player} />

        {/* raggio di cattura */}
        <Circle
          center={[player.lat, player.lng]}
          radius={RAGGIO_CATTURA}
          pathOptions={{ color: "#2E5D34", fillColor: "#2E5D34", fillOpacity: 0.12, weight: 1.5 }}
        />
        <Marker position={[player.lat, player.lng]} icon={PLAYER} />

        {selvatiche.map((b) => {
          const far = distanza(player, b) > RAGGIO_CATTURA;
          return (
            <Marker
              key={b.id}
              position={[b.lat, b.lng]}
              icon={pin("🐮", far)}
              eventHandlers={{ click: () => tapBovina(b) }}
            />
          );
        })}
      </MapContainer>

      {/* HUD: stato + controlli, sopra la mappa */}
      <div className="map-hud-top">
        {inRange ? (
          <span className="hud-pill ok">
            🐮 {vicina!.b.nome} a portata · tocca per catturare
          </span>
        ) : vicina ? (
          <span className="hud-pill">
            🧭 Reina più vicina: {vicina.b.nome} a {fmtDist(vicina.d)}
          </span>
        ) : (
          <span className="hud-pill ok">🎉 Hai catturato tutte le Reines vicine!</span>
        )}
      </div>

      <div className="map-hud-bottom">
        <button className={`hud-btn ${gps ? "active" : ""}`} onClick={toggleGps}>
          📍 {gps ? "GPS attivo" : "GPS reale"}
        </button>
        {!gps && vicina && (
          <button className="hud-btn primary" onClick={avvicinati}>
            🥾 Avvicinati
          </button>
        )}
      </div>

      {!gps && (
        <div className="map-hint">
          🥾 Demo: <b>tocca la mappa</b> per camminare lungo i sentieri verso le 🐮
        </div>
      )}
    </div>
  );
}
