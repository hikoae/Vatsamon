import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "vazzamon.save.v1";

import type { Bovina } from "../data/types";

export interface GameState {
  capturedIds: string[];
  /** Bovine inserite manualmente (non presenti nel DB ufficiale). */
  customBovine: Bovina[];
  punti: number;
  passi: number;
  battaglieVinte: number;
}

const INITIAL: GameState = {
  capturedIds: [],
  customBovine: [],
  punti: 0,
  passi: 0,
  battaglieVinte: 0,
};

function load(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return { ...INITIAL, ...parsed };
  } catch {
    return INITIAL;
  }
}

export interface ManualeInput {
  nome: string;
  razza: Bovina["razza"];
  note: string;
  pascolo: string;
}

interface GameContextValue extends GameState {
  captured: Set<string>;
  isCaptured: (id: string) => boolean;
  cattura: (id: string) => boolean; // true se nuova cattura
  aggiungiManuale: (input: ManualeInput) => Bovina;
  cammina: () => void;
  vinciBattaglia: () => void;
  reset: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const captured = useMemo(() => new Set(state.capturedIds), [state.capturedIds]);

  const isCaptured = useCallback((id: string) => captured.has(id), [captured]);

  const cattura = useCallback((id: string) => {
    let nuova = false;
    setState((s) => {
      if (s.capturedIds.includes(id)) return s;
      nuova = true;
      return {
        ...s,
        capturedIds: [...s.capturedIds, id],
        punti: s.punti + 10, // +10 per cattura
      };
    });
    return nuova;
  }, []);

  const aggiungiManuale = useCallback((input: ManualeInput) => {
    const id = `CUSTOM-${input.nome.toUpperCase().replace(/\s+/g, "-")}-${input.pascolo}`;
    const nuova: Bovina = {
      id,
      nome: input.nome.trim() || "Senza nome",
      razza: input.razza,
      tipo: input.razza === "Pezzata Rossa" ? "Latte" : "Forza",
      categoria: "—",
      rarita: "Non comune",
      stelle: 2,
      riconoscimento: "Inserita manualmente",
      comune: "—",
      allevatore: "—",
      matricola: "",
      peso_kg: 600,
      peso_stimato: true,
      stats: { stazza: 80, corna: 70, testa: 70, grinta: 70 },
      potenza: 290,
      foto: null,
      descrizione: input.note.trim() || "Bovina aggiunta manualmente alla Vazzadex.",
      pascolo: input.pascolo,
    };
    setState((s) => {
      if (s.capturedIds.includes(id)) return s;
      return {
        ...s,
        customBovine: [...s.customBovine, nuova],
        capturedIds: [...s.capturedIds, id],
        punti: s.punti + 10,
      };
    });
    return nuova;
  }, []);

  const cammina = useCallback(() => {
    setState((s) => ({ ...s, passi: s.passi + 100, punti: s.punti + 1 }));
  }, []);

  const vinciBattaglia = useCallback(() => {
    setState((s) => ({
      ...s,
      punti: s.punti + 5,
      battaglieVinte: s.battaglieVinte + 1,
    }));
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  const value: GameContextValue = {
    ...state,
    captured,
    isCaptured,
    cattura,
    aggiungiManuale,
    cammina,
    vinciBattaglia,
    reset,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame deve stare dentro <GameProvider>");
  return ctx;
}
