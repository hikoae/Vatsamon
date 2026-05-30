import raw from "./vazzadex.json";
import { Vazzamon, RarityType } from "../types";
import { resolveIllustration } from "./illustrations";

interface RawBovina {
  id: string; nome: string; razza: string; tipo: string; categoria: string;
  rarita: string; stelle: number; riconoscimento: string; comune: string;
  allevatore: string; matricola: string; peso_kg: number; peso_stimato: boolean;
  stats: { stazza: number; corna: number; testa: number; grinta: number };
  potenza: number; foto: string | null; descrizione: string;
  lat: number; lng: number; zona_tipo: string;
}
interface RawPascolo { id: string; nome: string; lat: number; lng: number; comune: string; }

const data = raw as unknown as { bovine: RawBovina[]; pascoli: RawPascolo[] };
const BASE = import.meta.env.BASE_URL;

const RARITY_BONUS: Record<RarityType, number> = {
  Comune: 0, Rara: 0.2, Epica: 0.5, Leggendaria: 1.0,
};

function mapRarity(r: string): RarityType {
  if (r === "Leggendaria" || r === "Epica" || r === "Rara" || r === "Comune") return r;
  return "Rara"; // "Non comune" e altri → Rara
}

/** Converte una bovina reale nel modello Vazzamon di v2 (con campi reali extra). */
function convert(b: RawBovina): Vazzamon {
  const rarity = mapRarity(b.rarita);
  // mappa le 4 stat reali → 3 stat di gioco
  const strength = clamp(b.stats.corna);
  const defense = clamp(b.stats.testa);
  const agility = clamp(b.stats.grinta);
  const cp = Math.floor((strength * 2 + defense + agility) * (1.1 + RARITY_BONUS[rarity]));
  const level = 8 + b.stelle * 4;

  return {
    id: b.id,
    breed: b.razza,
    name: b.nome,
    stats: { strength, defense, agility },
    rarity,
    eco_tip: "Cammina sui sentieri ufficiali e rispetta le recinzioni degli alpeggi.",
    lore: b.descrizione,
    capturedAt: "",
    cp,
    level,
    // campi reali
    isReal: true,
    realPhoto: b.foto ? `${BASE}${b.foto}` : null,
    comune: b.comune,
    allevatore: b.allevatore,
    matricola: b.matricola,
    riconoscimento: b.riconoscimento,
    peso_kg: b.peso_kg,
    pesoStimato: b.peso_stimato,
    lat: b.lat,
    lng: b.lng,
    stats4: b.stats,
    potenza: b.potenza,
    illustration: resolveIllustration(b.nome, b.razza),
    categoria: b.categoria,
  };
}

function clamp(n: number) { return Math.max(10, Math.min(100, Math.round(n))); }

/** Le 73 bovine reali, nel modello di v2. */
export const REAL_COWS: Vazzamon[] = data.bovine.map(convert);
export const REAL_TOTAL = REAL_COWS.length;

// coordinate per la mappa "radar" SVG (stessi bound di v2)
function svgXY(lat: number, lng: number) {
  const x = 5 + ((lng - 6.9) / (7.85 - 6.9)) * 90;
  const y = 5 + ((45.95 - lat) / (45.95 - 45.55)) * 90;
  return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
}

/** Casere (PokéStop) sui 6 pascoli REALI della Valle d'Aosta. */
export const REAL_CASERE = data.pascoli.map((p) => ({
  id: `casera-${p.id}`,
  name: p.nome,
  valley: p.comune,
  lat: p.lat,
  lng: p.lng,
  ...svgXY(p.lat, p.lng),
  difficulty: "Facile" as const,
  description: `Pascolo reale di ${p.comune}: rifornisciti di campanacci e mele alpine prima di cercare le Reines.`,
}));
