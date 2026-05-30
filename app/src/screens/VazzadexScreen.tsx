import { useMemo, useState } from "react";
import { BOVINE, TOTALE } from "../data/db";
import type { Bovina } from "../data/types";
import { useGame } from "../store/game";
import { CowImage } from "../components/CowImage";
import { CowDetail } from "../components/CowDetail";
import { stelle } from "../lib/rarity";

export function VazzadexScreen() {
  const { captured, customBovine } = useGame();
  const [sel, setSel] = useState<Bovina | null>(null);

  const presi = BOVINE.filter((b) => captured.has(b.id)).length;
  const lista = useMemo<Bovina[]>(() => [...BOVINE, ...customBovine], [customBovine]);

  return (
    <div className="screen">
      <div
        className="card"
        style={{
          padding: "14px 16px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 30 }}>📒</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            Vazzadex: {presi} / {TOTALE}
          </div>
          <div className="muted">
            {customBovine.length > 0 && `+${customBovine.length} personalizzate · `}
            Reines reali delle Bataille de Reines 2026
          </div>
          <div className="track" style={{ marginTop: 8 }}>
            <div
              className="fill"
              style={{
                width: `${(presi / TOTALE) * 100}%`,
                background: "var(--verde)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid">
        {lista.map((b) => {
          const isPreso = captured.has(b.id);
          return (
            <button
              key={b.id}
              className={`cell ${isPreso ? "" : "locked"}`}
              onClick={() => setSel(b)}
            >
              <CowImage bovina={b} className="thumb" forceSilhouette={!isPreso} />
              <div className="nome">{isPreso ? b.nome : "???"}</div>
              {isPreso ? (
                <>
                  <div className="stelle">{stelle(b.stelle)}</div>
                  <div className="tipo">{b.tipo}</div>
                </>
              ) : (
                <div className="tipo">Da catturare</div>
              )}
            </button>
          );
        })}
      </div>

      {sel && (
        <CowDetail bovina={sel} catturata={captured.has(sel.id)} onClose={() => setSel(null)} />
      )}
    </div>
  );
}
