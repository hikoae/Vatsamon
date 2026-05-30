import { Footprints } from "lucide-react";
import { useGame } from "../store/game";
import { rarityColor } from "../lib/rarity";

export function EggsScreen({ onToast }: { onToast: (m: string) => void }) {
  const { eggs, camminaMetri, trainer } = useGame();

  function passeggia() {
    // demo: 500 m a colpo
    const schiuse = camminaMetri(500);
    onToast(schiuse.length ? "🥚 Un uovo si è schiuso!" : "🥾 +500 m camminati");
  }

  return (
    <div className="h-full overflow-y-auto p-4 pb-6">
      <h2 className="text-xl font-extrabold mb-1">Incubatrice Alpina 🥚</h2>
      <p className="text-sm text-pietra mb-4">
        Cammina per far schiudere le uova: dentro si nasconde un Vazzamon raro. Distanza percorsa: <b>{trainer.kmTraveled.toFixed(1)} km</b>.
      </p>

      <div className="space-y-3">
        {eggs.map((e) => {
          const pct = Math.min(100, (e.kmWalked / e.kmRequired) * 100);
          return (
            <div key={e.id} className="glass rounded-card p-4 flex items-center gap-4">
              <div className="text-4xl animate-float">🥚</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: rarityColor(e.rarita) }}>
                    {e.rarita}
                  </span>
                  <span className="text-xs font-bold text-pietra">{e.kmWalked.toFixed(1)} / {e.kmRequired} km</span>
                </div>
                <div className="h-2.5 mt-2 rounded-full bg-alpino-100 overflow-hidden">
                  <div className="h-full bg-alpino-600 transition-[width]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn-alpino w-full mt-5" onClick={passeggia}>
        <Footprints size={18} /> Cammina +500 m (demo)
      </button>
      <p className="text-xs text-pietra text-center mt-2">
        All'aperto le uova avanzano col GPS reale mentre cammini sui sentieri.
      </p>
    </div>
  );
}
