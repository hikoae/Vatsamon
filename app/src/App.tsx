import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TrainerBar } from "./components/TrainerBar";
import { BottomNav, type Tab } from "./components/BottomNav";
import { MapScreen } from "./screens/MapScreen";
import { ScannerScreen } from "./screens/ScannerScreen";
import { EggsScreen } from "./screens/EggsScreen";
import { VazzadexScreen } from "./screens/VazzadexScreen";
import { BattleScreen } from "./screens/BattleScreen";
import { CaptureScreen } from "./screens/CaptureScreen";
import { CaseraScreen } from "./screens/CaseraScreen";
import { useGame } from "./store/game";
import { BOVINE } from "./data/db";
import { centro, type LatLng } from "./lib/geo";
import { generaVazzamon } from "./lib/vazzamon";
import type { Casera, Vazzamon } from "./data/types";

export default function App() {
  const { captured, trainer } = useGame();
  const [tab, setTab] = useState<Tab>("mappa");
  const [toast, setToast] = useState<string | null>(null);
  const [capture, setCapture] = useState<Vazzamon | null>(null);
  const [casera, setCasera] = useState<Casera | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  // posizione iniziale: centro delle bovine ancora libere
  const startPos = useMemo<LatLng>(() => {
    const libere = BOVINE.filter((b) => !captured.has(b.id));
    return centro((libere.length ? libere : BOVINE).map((b) => ({ lat: b.lat, lng: b.lng })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [player, setPlayer] = useState<LatLng>(startPos);

  // bovine selvatiche IA sparse vicino alla partenza
  const [wild, setWild] = useState<Vazzamon[]>(() =>
    [0, 1, 2, 3].map((i) =>
      generaVazzamon({
        seed: 1000 + i,
        origine: "generata",
        lat: startPos.lat + (i - 1.5) * 0.01,
        lng: startPos.lng + (i % 2 === 0 ? 0.012 : -0.012),
      }),
    ),
  );

  // rimuovi le selvatiche catturate
  useEffect(() => {
    setWild((w) => w.filter((c) => !captured.has(c.id)));
  }, [captured]);

  // toast effimero
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // popup level-up
  const prevLevel = useRef(trainer.level);
  useEffect(() => {
    if (trainer.level > prevLevel.current) {
      setLevelUp(trainer.level);
      const t = setTimeout(() => setLevelUp(null), 2200);
      return () => clearTimeout(t);
    }
    prevLevel.current = trainer.level;
  }, [trainer.level]);

  return (
    <div className="mx-auto max-w-[520px] h-[100dvh] flex flex-col relative overflow-hidden shadow-2xl bg-alpino-50">
      <TrainerBar />

      <main className="flex-1 min-h-0 relative">
        {tab === "mappa" && (
          <MapScreen
            player={player}
            setPlayer={setPlayer}
            wild={wild}
            onCapture={(c) => setCapture(c)}
            onCasera={(c) => setCasera(c)}
            onToast={setToast}
          />
        )}
        {tab === "scanner" && <ScannerScreen onToast={setToast} />}
        {tab === "uova" && <EggsScreen onToast={setToast} />}
        {tab === "vazzadex" && <VazzadexScreen />}
        {tab === "bataille" && <BattleScreen onToast={setToast} />}
      </main>

      <BottomNav tab={tab} onChange={setTab} />

      <AnimatePresence>
        {capture && <CaptureScreen key="cap" target={capture} onClose={() => setCapture(null)} onToast={setToast} />}
        {casera && <CaseraScreen key="cas" casera={casera} onClose={() => setCasera(null)} />}
      </AnimatePresence>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[78px] z-[4200] bg-alpino-900 text-white font-bold px-4 py-2.5 rounded-full shadow-lg text-sm whitespace-nowrap">
          {toast}
        </div>
      )}

      <AnimatePresence>
        {levelUp && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[4300] grid place-items-center pointer-events-none">
            <div className="bg-oro text-alpino-900 font-black text-2xl px-8 py-5 rounded-3xl shadow-2xl">
              ⭐ Livello {levelUp}!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
