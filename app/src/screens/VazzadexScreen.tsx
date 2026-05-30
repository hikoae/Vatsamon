import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BOVINE, TOTALE } from "../data/db";
import type { Vazzamon } from "../data/types";
import { useGame } from "../store/game";
import { Portrait } from "../components/Portrait";
import { CowDetail } from "../components/CowDetail";
import { stelle, rarityColor } from "../lib/rarity";

export function VazzadexScreen() {
  const { captured, collezione, realiCatturate } = useGame();
  const [sel, setSel] = useState<Vazzamon | null>(null);
  const [q, setQ] = useState("");

  const generati = useMemo(() => collezione.filter((c) => c.origine !== "reale"), [collezione]);
  const lista = useMemo<Vazzamon[]>(() => {
    const all = [...BOVINE, ...generati];
    if (!q.trim()) return all;
    const s = q.toLowerCase();
    return all.filter((c) => c.nome.toLowerCase().includes(s) || c.comune.toLowerCase().includes(s) || c.razza.toLowerCase().includes(s));
  }, [generati, q]);

  return (
    <div className="h-full overflow-y-auto p-4 pb-6">
      <div className="glass rounded-card p-4 mb-3 flex items-center gap-3">
        <div className="text-3xl">📒</div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-lg">Vazzadex: {realiCatturate} / {TOTALE}</div>
          <div className="text-xs text-pietra">
            {generati.length > 0 && `+${generati.length} bonus IA · `}Reines reali delle Bataille 2026
          </div>
          <div className="h-2 mt-2 rounded-full bg-alpino-100 overflow-hidden">
            <div className="h-full bg-alpino-600" style={{ width: `${(realiCatturate / TOTALE) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 mb-3 shadow-sm">
        <Search size={16} className="text-pietra" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nome, comune, razza…"
          className="flex-1 outline-none text-sm bg-transparent" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {lista.map((c) => {
          const preso = captured.has(c.id);
          return (
            <button key={c.id} onClick={() => setSel(c)}
              className="bg-white rounded-2xl shadow-sm overflow-hidden text-center pb-2 border-2"
              style={{ borderColor: preso ? rarityColor(c.rarita) + "55" : "transparent" }}>
              <div className={`aspect-square ${preso ? "" : "grayscale brightness-75 opacity-60"}`}>
                <Portrait cow={c} className="w-full h-full" rounded="rounded-none" forceSilhouette={!preso} />
              </div>
              <div className="font-bold text-xs mt-1.5 truncate px-1">{preso ? c.nome : "???"}</div>
              {preso ? (
                <>
                  <div className="text-[11px] text-oro">{stelle(c.stelle)}</div>
                  <div className="text-[10px] text-pietra">{c.origine === "reale" ? c.tipo : "bonus IA"}</div>
                </>
              ) : (
                <div className="text-[10px] text-pietra">Da catturare</div>
              )}
            </button>
          );
        })}
      </div>

      {sel && <CowDetail cow={sel} catturata={captured.has(sel.id)} onClose={() => setSel(null)} />}
    </div>
  );
}
