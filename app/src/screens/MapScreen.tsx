import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PASCOLI, bovinePerPascolo } from "../data/db";
import type { Pascolo } from "../data/types";
import { useGame } from "../store/game";

function pinIcon(emoji: string) {
  return L.divIcon({
    className: "",
    html: `<div class="pin"><span>${emoji}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}

const COW = pinIcon("🐮");

export function MapScreen({ onEncounter }: { onEncounter: (p: Pascolo) => void }) {
  const { captured } = useGame();

  return (
    <div className="map-wrap">
      <MapContainer
        center={[45.74, 7.42]}
        zoom={10}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {PASCOLI.map((p) => {
          const tot = bovinePerPascolo(p.id);
          const presi = tot.filter((b) => captured.has(b.id)).length;
          return (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={COW}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <b>{p.nome}</b>
                  <div style={{ fontSize: 12, color: "#5b6b5d", margin: "4px 0 8px" }}>
                    {presi}/{tot.length} catturate qui
                  </div>
                  <button
                    style={{
                      background: "#2e5d34",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontWeight: 700,
                      width: "100%",
                    }}
                    onClick={() => onEncounter(p)}
                  >
                    🐮 Cerca una Reina
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
