import { Compass, Camera, Egg, BookOpen, Swords } from "lucide-react";

export type Tab = "mappa" | "scanner" | "uova" | "vazzadex" | "bataille";

const TABS: { id: Tab; label: string; Icon: typeof Compass }[] = [
  { id: "mappa", label: "Mappa", Icon: Compass },
  { id: "scanner", label: "Scanner", Icon: Camera },
  { id: "uova", label: "Uova", Icon: Egg },
  { id: "vazzadex", label: "Vazzadex", Icon: BookOpen },
  { id: "bataille", label: "Bataille", Icon: Swords },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="shrink-0 grid grid-cols-5 bg-white border-t border-alpino-100">
      {TABS.map(({ id, label, Icon }) => {
        const active = id === tab;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${
              active ? "text-alpino-700" : "text-pietra"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.6 : 2} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
