import type { Bovina } from "../data/types";
import { getPascolo } from "../data/db";
import { rarityColor, stelle } from "../lib/rarity";
import { CowImage } from "./CowImage";
import { StatBars } from "./StatBars";

export function CowDetail({
  bovina,
  onClose,
  catturata,
}: {
  bovina: Bovina;
  onClose: () => void;
  catturata: boolean;
}) {
  const pascolo = getPascolo(bovina.pascolo);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />

        <div style={{ position: "relative" }}>
          <CowImage bovina={bovina} className="hero-img" forceSilhouette={!catturata} />
          <span
            className="rarity-badge"
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: rarityColor(bovina.rarita),
            }}
          >
            {bovina.rarita}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
          <h2 style={{ margin: 0 }}>{catturata ? bovina.nome : "???"}</h2>
          <span style={{ color: "#f59e0b", fontSize: 16 }}>{stelle(bovina.stelle)}</span>
        </div>
        <div className="muted" style={{ marginBottom: 10 }}>
          {bovina.tipo} · {bovina.razza} · cat. {bovina.categoria}
        </div>

        <p style={{ fontSize: 14, lineHeight: 1.5 }}>{bovina.descrizione}</p>

        <div className="card" style={{ padding: 14, marginTop: 6 }}>
          <StatBars stats={bovina.stats} potenza={bovina.potenza} />
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="kv">
            <b>Riconoscimento</b>
            <span>{bovina.riconoscimento}</span>
          </div>
          <div className="kv">
            <b>Comune</b>
            <span>{bovina.comune}</span>
          </div>
          <div className="kv">
            <b>Pascolo</b>
            <span>{pascolo?.nome ?? bovina.pascolo}</span>
          </div>
          <div className="kv">
            <b>Allevatore</b>
            <span>{bovina.allevatore || "—"}</span>
          </div>
          <div className="kv">
            <b>Matricola</b>
            <span>{bovina.matricola || "—"}</span>
          </div>
          <div className="kv">
            <b>Peso</b>
            <span>
              {bovina.peso_kg} kg{bovina.peso_stimato ? " (stima)" : ""}
            </span>
          </div>
        </div>

        <button className="btn secondary" style={{ marginTop: 16 }} onClick={onClose}>
          Chiudi
        </button>
      </div>
    </div>
  );
}
