import { useEffect, useMemo, useState } from "react";
import { Navbar, type Tab } from "./components/Navbar";
import { MapScreen } from "./screens/MapScreen";
import { VazzadexScreen } from "./screens/VazzadexScreen";
import { BattleScreen } from "./screens/BattleScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { EncounterScreen } from "./screens/EncounterScreen";
import { useGame } from "./store/game";
import { BOVINE } from "./data/db";
import { centro, type LatLng } from "./lib/geo";
import type { Bovina } from "./data/types";

export default function App() {
  const { punti, captured } = useGame();
  const [tab, setTab] = useState<Tab>("mappa");
  const [encounter, setEncounter] = useState<Bovina | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // posizione iniziale del giocatore: vicino al gruppo di bovine ancora libere
  const startPos = useMemo<LatLng>(() => {
    const libere = BOVINE.filter((b) => !captured.has(b.id));
    return centro((libere.length ? libere : BOVINE).map((b) => ({ lat: b.lat, lng: b.lng })));
    // solo all'avvio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [player, setPlayer] = useState<LatLng>(startPos);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">🐮 Vazzamon</span>
        <span className="spacer" />
        <span className="chip">⭐ {punti}</span>
      </header>

      {/* La mappa va tenuta montata a tutta altezza; le altre schermate scrollano */}
      {tab === "mappa" ? (
        <div className="screen" style={{ padding: 0, overflow: "hidden" }}>
          <MapScreen
            player={player}
            setPlayer={setPlayer}
            onEncounter={(b) => setEncounter(b)}
            onToast={setToast}
          />
        </div>
      ) : tab === "vazzadex" ? (
        <VazzadexScreen />
      ) : tab === "bataille" ? (
        <BattleScreen onToast={setToast} />
      ) : (
        <ProfileScreen onToast={setToast} />
      )}

      <Navbar tab={tab} onChange={setTab} />

      {encounter && (
        <EncounterScreen
          target={encounter}
          onClose={() => setEncounter(null)}
          onToast={setToast}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
