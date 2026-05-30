import { useMemo, useRef, useState } from "react";
import type { Bovina, Pascolo, Razza } from "../data/types";
import { scegliIncontro } from "../data/db";
import { useGame } from "../store/game";
import { riconosci, riconosciNonMucca, type Riconoscimento } from "../lib/recognition";
import { CowImage } from "../components/CowImage";
import { StatBars } from "../components/StatBars";
import { rarityColor, stelle } from "../lib/rarity";
import { consiglioCasuale } from "../components/EducationPopup";

type Phase = "incontro" | "analisi" | "scheda" | "nonmucca" | "manuale";

const RAZZE: Razza[] = ["Castana", "Pezzata Rossa", "Pezzata Nera", "Sconosciuta"];

export function EncounterScreen({
  pascolo,
  onClose,
  onToast,
}: {
  pascolo: Pascolo;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const { captured, cattura, aggiungiManuale } = useGame();
  const [seed] = useState(() => Math.floor(Math.random() * 100000));
  const target = useMemo<Bovina | undefined>(
    () => scegliIncontro(pascolo.id, captured, seed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pascolo.id, seed],
  );

  const [phase, setPhase] = useState<Phase>("incontro");
  const [ric, setRic] = useState<Riconoscimento | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!target) {
    return (
      <Sheet onClose={onClose}>
        <p>Nessuna bovina in questo pascolo.</p>
      </Sheet>
    );
  }

  async function avviaAnalisi() {
    setPhase("analisi");
    const r = await riconosci(target!);
    setRic(r);
    const nuova = cattura(target!.id);
    setPhase("scheda");
    onToast(nuova ? "Catturata! +10 punti 🎉" : "Già nella tua Vazzadex");
  }

  async function avviaNonMucca() {
    setPhase("analisi");
    const r = await riconosciNonMucca();
    setRic(r);
    setPhase("nonmucca");
  }

  return (
    <Sheet onClose={onClose}>
      {phase === "incontro" && (
        <div style={{ textAlign: "center" }}>
          <div className="banner" style={{ marginBottom: 12 }}>
            📍 {pascolo.nome}
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Una Reina selvatica è apparsa! Scatta o carica una foto per identificarla.
          </p>
          <CowImage bovina={target} className="hero-img" forceSilhouette />
          <h2 style={{ margin: "12px 0 2px" }}>???</h2>
          <div className="muted" style={{ marginBottom: 16 }}>
            Bovina sconosciuta · {pascolo.comune}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={() => avviaAnalisi()}
          />
          <button className="btn" onClick={() => fileRef.current?.click()}>
            📸 Cattura (foto)
          </button>
          <button
            className="btn ghost"
            style={{ marginTop: 10 }}
            onClick={() => avviaAnalisi()}
          >
            🐮 Usa mucca demo
          </button>
          <button
            className="btn secondary"
            style={{ marginTop: 10 }}
            onClick={() => setPhase("manuale")}
          >
            ✍️ Non è in elenco? Inserisci a mano
          </button>
          <button
            className="muted"
            style={{ marginTop: 14, background: "none" }}
            onClick={() => avviaNonMucca()}
          >
            (prova: foto che non è una mucca)
          </button>
        </div>
      )}

      {phase === "analisi" && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div className="spinner" />
          <h2 style={{ marginBottom: 4 }}>Analisi in corso…</h2>
          <p className="muted">Riconoscimento razza della Reina</p>
        </div>
      )}

      {phase === "scheda" && ric && (
        <Reveal bovina={target} ric={ric} pascolo={pascolo} onClose={onClose} />
      )}

      {phase === "nonmucca" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 56 }}>🤔</div>
          <h2>Mmm… questa non sembra una Reina!</h2>
          <p className="muted">Riprova con una bella mucca valdostana 🐮</p>
          <button
            className="btn"
            style={{ marginTop: 12 }}
            onClick={() => setPhase("incontro")}
          >
            Riprova
          </button>
        </div>
      )}

      {phase === "manuale" && (
        <ManualForm
          razze={RAZZE.filter((r) => r !== "Sconosciuta")}
          onCancel={() => setPhase("incontro")}
          onSave={(input) => {
            aggiungiManuale({ ...input, pascolo: pascolo.id });
            onToast("Aggiunta alla Vazzadex! +10 punti");
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

function Reveal({
  bovina,
  ric,
  pascolo,
  onClose,
}: {
  bovina: Bovina;
  ric: Riconoscimento;
  pascolo: Pascolo;
  onClose: () => void;
}) {
  const consiglio = consiglioCasuale(bovina.nome.length + pascolo.id.length);
  return (
    <div>
      <div className="banner" style={{ marginBottom: 12 }}>
        ✅ Razza riconosciuta: <b>{ric.razza}</b> · confidenza{" "}
        {(ric.confidenza * 100).toFixed(0)}%
      </div>
      <div style={{ position: "relative" }}>
        <CowImage bovina={bovina} className="hero-img" />
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
        <h2 style={{ margin: 0 }}>{bovina.nome}</h2>
        <span style={{ color: "#f59e0b" }}>{stelle(bovina.stelle)}</span>
      </div>
      <div className="muted">
        {bovina.tipo} · {bovina.razza} · cat. {bovina.categoria} · {bovina.comune}
      </div>

      <div className="card" style={{ padding: 14, marginTop: 12 }}>
        <StatBars stats={bovina.stats} potenza={bovina.potenza} />
      </div>

      <div className="banner" style={{ marginTop: 14 }}>
        🌿 {consiglio}
      </div>

      <button className="btn" style={{ marginTop: 16 }} onClick={onClose}>
        Aggiungi alla Vazzadex 📒
      </button>
    </div>
  );
}

function ManualForm({
  razze,
  onSave,
  onCancel,
}: {
  razze: Razza[];
  onSave: (v: { nome: string; razza: Razza; note: string }) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState("");
  const [razza, setRazza] = useState<Razza>(razze[0]);
  const [note, setNote] = useState("");

  return (
    <div>
      <h2>Nuova bovina</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Non l'abbiamo riconosciuta nel nostro registro: aggiungila tu.
      </p>
      <label className="field">
        <span>Nome</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Brunette" />
      </label>
      <label className="field">
        <span>Razza</span>
        <select value={razza} onChange={(e) => setRazza(e.target.value as Razza)}>
          {razze.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Note</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
      </label>
      <button className="btn" style={{ marginTop: 8 }} onClick={() => onSave({ nome, razza, note })}>
        Salva nella Vazzadex
      </button>
      <button className="btn secondary" style={{ marginTop: 10 }} onClick={onCancel}>
        Annulla
      </button>
    </div>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        {children}
      </div>
    </div>
  );
}
