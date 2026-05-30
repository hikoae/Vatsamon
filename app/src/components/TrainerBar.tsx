import { Coins, Volume2, VolumeX } from "lucide-react";
import { useGame } from "../store/game";

export function TrainerBar() {
  const { trainer, sound, toggleSound, realiCatturate } = useGame();
  const pct = Math.min(100, (trainer.xp / trainer.xpToNextLevel) * 100);

  return (
    <header className="flex items-center gap-3 px-3.5 py-2.5 bg-alpino-700 text-white shadow-md shrink-0">
      <div className="grid place-items-center w-9 h-9 rounded-full bg-white/15 text-lg shrink-0">
        🥾
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-extrabold text-sm">Liv. {trainer.level}</span>
          <span className="text-[11px] text-white/70 truncate">
            {realiCatturate}/73 Reines · {trainer.kmTraveled.toFixed(1)} km
          </span>
        </div>
        <div className="h-1.5 mt-1 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-oro rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1 text-sm font-bold shrink-0">
        <Coins size={15} className="text-oro" />
        {trainer.coins}
      </div>
      <button
        onClick={toggleSound}
        className="grid place-items-center w-8 h-8 rounded-full bg-white/15 shrink-0"
        aria-label="Audio"
      >
        {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
    </header>
  );
}
