import { useMemo, useState } from "react";
import { BOVINE } from "../data/db";
import type { Bovina } from "../data/types";
import { useGame } from "../store/game";
import { CowImage } from "../components/CowImage";
import { stelle } from "../lib/rarity";

type Esito = { vincitrice: Bovina; perdente: Bovina } | null;

export function BattleScreen({ onToast }: { onToast: (m: string) => void }) {
  const { captured, customBovine, vinciBattaglia } = useGame();

  const disponibili = useMemo<Bovina[]>(
    () => [...BOVINE, ...customBovine].filter((b) => captured.has(b.id)),
    [captured, customBovine],
  );

  const [a, setA] = useState<Bovina | null>(null);
  const [b, setB] = useState<Bovina | null>(null);
  const [esito, setEsito] = useState<Esito>(null);
  const [fighting, setFighting] = useState(false);

  function scegli(bovina: Bovina) {
    setEsito(null);
    if (a?.id === bovina.id) return setA(null);
    if (b?.id === bovina.id) return setB(null);
    if (!a) return setA(bovina);
    if (!b) return setB(bovina);
    setA(bovina);
    setB(null);
  }

  function combatti() {
    if (!a || !b) return;
    setFighting(true);
    setEsito(null);
    setTimeout(() => {
      const [vincitrice, perdente] = a.potenza >= b.potenza ? [a, b] : [b, a];
      setEsito({ vincitrice, perdente });
      vinciBattaglia();
      setFighting(false);
      onToast(`👑 ${vincitrice.nome} è la Reina! +5 punti`);
    }, 1100);
  }

  if (disponibili.length < 2) {
    return (
      <div className="screen">
        <h2>Bataille de Reines 👑</h2>
        <div className="banner">
          Cattura almeno <b>2 bovine</b> per organizzare una sfida. Vai sulla mappa e
          cerca le Reines nei pascoli!
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>Bataille de Reines 👑</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Niente violenza: vince la <b>potenza</b> più alta. Scegli due Reines.
      </p>

      <div style={{ display: "flex", gap: 10, margin: "8px 0 14px" }}>
        <Slot bovina={a} label="Sfidante 1" />
        <div style={{ alignSelf: "center", fontWeight: 800, fontSize: 22 }}>VS</div>
        <Slot bovina={b} label="Sfidante 2" />
      </div>

      <button
        className="btn"
        disabled={!a || !b || fighting}
        onClick={combatti}
        style={{ marginBottom: 8 }}
      >
        {fighting ? "Combattono…" : "⚔️ Fai combattere"}
      </button>

      {esito && (
        <div className="card" style={{ padding: 16, textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 40 }}>👑</div>
          <h2 style={{ margin: "4px 0" }}>{esito.vincitrice.nome}</h2>
          <div className="muted">Reina del pascolo!</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>
            {esito.vincitrice.potenza} vs {esito.perdente.potenza} potenza
          </div>
        </div>
      )}

      <h3 style={{ margin: "6px 2px" }}>Le tue Reines</h3>
      <div className="grid">
        {disponibili.map((bv) => {
          const scelta = a?.id === bv.id || b?.id === bv.id;
          return (
            <button
              key={bv.id}
              className="cell"
              style={{ borderColor: scelta ? "var(--verde)" : "transparent" }}
              onClick={() => scegli(bv)}
            >
              <CowImage bovina={bv} className="thumb" />
              <div className="nome">{bv.nome}</div>
              <div className="stelle">{stelle(bv.stelle)}</div>
              <div className="tipo">⚡ {bv.potenza}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Slot({ bovina, label }: { bovina: Bovina | null; label: string }) {
  return (
    <div className="card" style={{ flex: 1, padding: 10, textAlign: "center", minHeight: 150 }}>
      {bovina ? (
        <>
          <CowImage
            bovina={bovina}
            className="thumb"
            alt={bovina.nome}
          />
          <div className="nome">{bovina.nome}</div>
          <div className="tipo">⚡ {bovina.potenza}</div>
        </>
      ) : (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--testo-soft)",
            fontSize: 13,
            fontWeight: 600,
            padding: 12,
          }}
        >
          {label}
          <br />
          (tocca una Reina)
        </div>
      )}
    </div>
  );
}
