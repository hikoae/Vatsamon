import { useEffect, useState } from "react";
import { Navbar, type Tab } from "./components/Navbar";
import { MapScreen } from "./screens/MapScreen";
import { VazzadexScreen } from "./screens/VazzadexScreen";
import { BattleScreen } from "./screens/BattleScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { EncounterScreen } from "./screens/EncounterScreen";
import { useGame } from "./store/game";
import type { Pascolo } from "./data/types";

export default function App() {
  const { punti } = useGame();
  const [tab, setTab] = useState<Tab>("mappa");
  const [encounter, setEncounter] = useState<Pascolo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
        <div className="screen" style={{ padding: 0 }}>
          <MapScreen onEncounter={(p) => setEncounter(p)} />
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
          pascolo={encounter}
          onClose={() => setEncounter(null)}
          onToast={setToast}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
