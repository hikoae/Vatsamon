export type Razza = "Castana" | "Pezzata Rossa" | "Pezzata Nera" | "Sconosciuta";
export type Rarita = "Comune" | "Non comune" | "Rara" | "Epica" | "Leggendaria";

export interface Stats {
  stazza: number;
  corna: number;
  testa: number;
  grinta: number;
}

export interface Bovina {
  id: string;
  nome: string;
  razza: Razza;
  tipo: string;
  categoria: string;
  rarita: Rarita;
  stelle: number;
  riconoscimento: string;
  comune: string;
  allevatore: string;
  matricola: string;
  peso_kg: number;
  peso_stimato: boolean;
  stats: Stats;
  potenza: number;
  /** path relativo es. "photos/ALLEGRA.jpg", oppure null se senza foto reale */
  foto: string | null;
  descrizione: string;
  pascolo: string;
}

export interface Pascolo {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  comune: string;
}

export interface Vazzadex {
  meta: Record<string, unknown>;
  bovine: Bovina[];
  pascoli: Pascolo[];
}

export const STAT_LABELS: Record<keyof Stats, string> = {
  stazza: "STAZZA",
  corna: "CORNA",
  testa: "TESTA",
  grinta: "GRINTA",
};

export const STAT_COLORS: Record<keyof Stats, string> = {
  stazza: "#3b82f6", // blu
  corna: "#ef4444", // rosso
  testa: "#22c55e", // verde
  grinta: "#eab308", // giallo
};
