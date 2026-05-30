const CONSIGLI = [
  "Hai incontrato una mucca sul sentiero? Non urlare e non fare movimenti bruschi.",
  "Rispetta sempre le recinzioni e i cancelli degli alpeggi: richiudili dietro di te.",
  "Tieni il cane al guinzaglio vicino alle mandrie: protegge te e gli animali.",
  "Non avvicinarti ai vitelli: una madre può diventare protettiva.",
  "Cammina solo sui sentieri ufficiali per non rovinare i pascoli.",
  "Porta a valle i tuoi rifiuti: la montagna resta pulita solo se la rispetti.",
];

/** Restituisce un consiglio educativo deterministico in base a un seed. */
export function consiglioCasuale(seed: number): string {
  return CONSIGLI[Math.abs(seed) % CONSIGLI.length];
}

export function EducationPopup({
  testo,
  onClose,
}: {
  testo: string;
  onClose: () => void;
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        <div style={{ textAlign: "center", padding: "8px 6px 4px" }}>
          <div style={{ fontSize: 44 }}>🌿</div>
          <h2 style={{ marginTop: 6 }}>Rispetta la natura</h2>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: "var(--testo-soft)" }}>
            {testo}
          </p>
          <button className="btn" style={{ marginTop: 12 }} onClick={onClose}>
            Ho capito 👍
          </button>
        </div>
      </div>
    </div>
  );
}

export { CONSIGLI };
