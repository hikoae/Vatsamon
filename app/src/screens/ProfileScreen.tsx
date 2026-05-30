import { useState } from "react";
import { TOTALE, BOVINE } from "../data/db";
import { useGame } from "../store/game";
import { CONSIGLI } from "../components/EducationPopup";

export function ProfileScreen({ onToast }: { onToast: (m: string) => void }) {
  const { punti, passi, battaglieVinte, captured, cammina, reset } = useGame();
  const presi = BOVINE.filter((b) => captured.has(b.id)).length;
  const [tip, setTip] = useState(0);

  const livello = 1 + Math.floor(punti / 50);

  return (
    <div className="screen">
      <h2>Profilo Escursionista</h2>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "var(--verde)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            🥾
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Livello {livello}</div>
            <div className="muted">Esploratrice/Esploratore della Valle d'Aosta</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <Stat n={punti} label="Punti" />
          <Stat n={`${presi}/${TOTALE}`} label="Vazzadex" />
          <Stat n={passi} label="Passi" />
          <Stat n={battaglieVinte} label="Battaglie" />
        </div>
      </div>

      <button
        className="btn"
        onClick={() => {
          cammina();
          onToast("🥾 +100 passi · +1 punto");
        }}
      >
        🥾 Cammina +100 passi
      </button>

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>🌿 Rispetta la natura</h3>
        <p style={{ fontSize: 15, lineHeight: 1.5 }}>{CONSIGLI[tip % CONSIGLI.length]}</p>
        <button className="btn ghost" onClick={() => setTip((t) => t + 1)}>
          Prossimo consiglio →
        </button>
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>ℹ️ Il differenziale</h3>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--testo-soft)" }}>
          Vazzamon non usa mostri inventati: ogni Reina viene dai dati{" "}
          <b>reali</b> delle Bataille de Reines 2026 (nomi proprietari anonimizzati,
          privacy rispettata).
        </p>
      </div>

      <button
        className="btn secondary"
        style={{ marginTop: 16 }}
        onClick={() => {
          if (confirm("Azzerare progressi e Vazzadex?")) {
            reset();
            onToast("Progressi azzerati");
          }
        }}
      >
        ↺ Azzera progressi
      </button>
    </div>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--verde-chiaro)",
        borderRadius: 12,
        padding: "10px 6px",
        textAlign: "center",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 18 }}>{n}</div>
      <div className="muted" style={{ fontSize: 11 }}>
        {label}
      </div>
    </div>
  );
}
