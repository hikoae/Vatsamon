import type { Stats } from "../data/types";
import { STAT_COLORS, STAT_LABELS } from "../data/types";

const MAX = 120; // tetto delle statistiche (vedi DATA.md)

export function StatBars({ stats, potenza }: { stats: Stats; potenza: number }) {
  const keys = Object.keys(stats) as (keyof Stats)[];
  return (
    <div>
      {keys.map((k) => (
        <div className="stat" key={k}>
          <div className="row">
            <span>{STAT_LABELS[k]}</span>
            <span>{stats[k]}</span>
          </div>
          <div className="track">
            <div
              className="fill"
              style={{
                width: `${Math.min(100, (stats[k] / MAX) * 100)}%`,
                background: STAT_COLORS[k],
              }}
            />
          </div>
        </div>
      ))}
      <div
        className="stat"
        style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--bordo)" }}
      >
        <div className="row" style={{ fontSize: 14 }}>
          <span>POTENZA</span>
          <span>{potenza}</span>
        </div>
      </div>
    </div>
  );
}
