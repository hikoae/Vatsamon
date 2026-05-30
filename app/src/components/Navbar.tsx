export type Tab = "mappa" | "vazzadex" | "bataille" | "profilo";

const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: "mappa", label: "Mappa", ico: "🗺️" },
  { id: "vazzadex", label: "Vazzadex", ico: "📒" },
  { id: "bataille", label: "Bataille", ico: "👑" },
  { id: "profilo", label: "Profilo", ico: "🥾" },
];

export function Navbar({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav className="navbar">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={t.id === tab ? "active" : ""}
          onClick={() => onChange(t.id)}
        >
          <span className="ico">{t.ico}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
