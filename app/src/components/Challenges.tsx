/**
 * Sfide del giocatore: obiettivi con progresso e ricompensa (monete/XP).
 * Stato derivato (catture, medaglie, quiz, km, livello). Le ricompense si
 * riscuotono una volta sola (id riscossi persistiti dal genitore).
 */
export interface ChallengeStats {
  capturedReal: number;
  badges: number;
  quizBest: number;
  km: number;
  level: number;
}

interface ChallengeDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  goal: number;
  coins: number;
  xp: number;
  value: (s: ChallengeStats) => number;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: "cattura3", icon: "🐮", title: "Prime Reines", desc: "Cattura 3 Reines reali", goal: 3, coins: 100, xp: 150, value: (s) => s.capturedReal },
  { id: "cattura10", icon: "📸", title: "Collezionista d'Alpeggio", desc: "Cattura 10 Reines reali", goal: 10, coins: 250, xp: 300, value: (s) => s.capturedReal },
  { id: "arena1", icon: "🥇", title: "Sfidante d'Arena", desc: "Conquista 1 medaglia", goal: 1, coins: 150, xp: 200, value: (s) => s.badges },
  { id: "arena3", icon: "👑", title: "Campione Valdostano", desc: "Conquista 3 medaglie d'arena", goal: 3, coins: 400, xp: 500, value: (s) => s.badges },
  { id: "quiz6", icon: "🎓", title: "Esperto di Fontina", desc: "Totalizza 6 risposte giuste al Quiz", goal: 6, coins: 120, xp: 180, value: (s) => s.quizBest },
  { id: "km15", icon: "🥾", title: "Camminatore d'Alta Quota", desc: "Percorri 15 km sui sentieri", goal: 15, coins: 130, xp: 160, value: (s) => Math.floor(s.km) },
  { id: "lv8", icon: "⭐", title: "Allevatore Esperto", desc: "Raggiungi il livello 8", goal: 8, coins: 200, xp: 250, value: (s) => s.level },
];

export function Challenges({
  stats,
  claimed,
  onClaim,
}: {
  stats: ChallengeStats;
  claimed: string[];
  onClaim: (id: string, coins: number, xp: number) => void;
}) {
  const completedCount = CHALLENGES.filter((c) => c.value(stats) >= c.goal).length;

  return (
    <div className="space-y-2" id="challenges-list">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
          🎯 Sfide del Trekker
        </h3>
        <span className="text-[10px] font-mono font-bold text-emerald-400">{completedCount}/{CHALLENGES.length} completate</span>
      </div>

      <div className="grid gap-2">
        {CHALLENGES.map((c) => {
          const v = Math.min(c.value(stats), c.goal);
          const done = v >= c.goal;
          const isClaimed = claimed.includes(c.id);
          const pct = Math.round((v / c.goal) * 100);
          return (
            <div
              key={c.id}
              className={`rounded-2xl border p-3 flex items-center gap-3 transition-all ${done ? "border-emerald-500/50 bg-emerald-950/20" : "border-slate-800 bg-slate-900/60"}`}
            >
              <span className="text-2xl flex-shrink-0">{c.icon}</span>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-mono font-black text-slate-100 truncate">{c.title}</span>
                  {done && <span className="text-[8px]">✅</span>}
                </div>
                <div className="text-[9.5px] text-slate-400 leading-tight">{c.desc}</div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full transition-all ${done ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[8px] font-mono text-slate-500 mt-0.5">{Math.min(c.value(stats), c.goal)}/{c.goal} · ricompensa +{c.coins}🪙 +{c.xp}XP</div>
              </div>
              <button
                disabled={!done || isClaimed}
                onClick={() => onClaim(c.id, c.coins, c.xp)}
                className={`flex-shrink-0 text-[10px] font-mono font-black px-2.5 py-1.5 rounded-lg border-b-2 transition-all ${
                  isClaimed
                    ? "bg-slate-800 text-slate-500 border-slate-900 cursor-default"
                    : done
                    ? "bg-rose-500 text-white border-rose-700 hover:bg-rose-400 active:scale-95"
                    : "bg-slate-800 text-slate-600 border-slate-900 cursor-not-allowed"
                }`}
              >
                {isClaimed ? "Riscossa" : done ? "Riscuoti" : "🔒"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
