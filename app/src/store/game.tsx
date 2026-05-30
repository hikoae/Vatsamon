import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BackpackItem, Egg, Rarita, Trainer, Vazzamon } from "../data/types";
import { generaVazzamon } from "../lib/vazzamon";

const KEY = "vazzamon.save.v2";

interface SaveState {
  collezione: Vazzamon[]; // bovine reali catturate + generati
  trainer: Trainer;
  backpack: BackpackItem[];
  eggs: Egg[];
  sound: boolean;
}

const DEFAULT_BACKPACK: BackpackItem[] = [
  { id: "ball-std", name: "Vazza-ball Ottone", description: "Campanaccio base. Per catture ordinarie.", quantity: 20, type: "ball" },
  { id: "ball-giga", name: "Alpen-Bell d'Acciaio", description: "Campanella massiccia. Per bovine Epiche.", quantity: 8, type: "ball" },
  { id: "ball-master", name: "Bell di Platino", description: "Manufatto d'alta quota. 100% di cattura!", quantity: 2, type: "ball" },
  { id: "food-apple", name: "Mela Alpina d'Oro", description: "Addolcisce i Vazzamon selvatici.", quantity: 6, type: "food" },
  { id: "candy-hay", name: "Fieno delle Vette", description: "Aumenta livello e CP.", quantity: 10, type: "candy" },
];

function defaultState(): SaveState {
  return {
    collezione: [],
    trainer: {
      name: "TrekkerGO",
      level: 1,
      xp: 0,
      xpToNextLevel: 1000,
      capturedCount: 0,
      kmTraveled: 0,
      coins: 120,
    },
    backpack: DEFAULT_BACKPACK,
    eggs: [
      { id: "egg-1", rarita: "Rara", kmWalked: 0, kmRequired: 2, isIncubating: true },
      { id: "egg-2", rarita: "Epica", kmWalked: 0, kmRequired: 5, isIncubating: true },
    ],
    sound: true,
  };
}

function load(): SaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...(JSON.parse(raw) as Partial<SaveState>) };
  } catch {
    return defaultState();
  }
}

interface GameValue extends SaveState {
  captured: Set<string>;
  realiCatturate: number;
  isCaptured: (id: string) => boolean;
  getCow: (id: string) => Vazzamon | undefined;

  cattura: (v: Vazzamon) => boolean; // aggiunge alla collezione (true se nuova)
  rilascia: (id: string) => void; // transfer → +fieno
  potenzia: (id: string) => boolean; // power-up

  camminaMetri: (metri: number) => Egg[]; // ritorna uova schiuse
  addXp: (n: number) => void;
  addCoins: (n: number) => void;
  usaItem: (id: string, n?: number) => boolean;
  aggiungiItem: (id: string, n: number) => void;

  toggleSound: () => void;
  reset: () => void;
}

const Ctx = createContext<GameValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<SaveState>(load);
  const sound = s.sound;
  void sound;

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(s));
  }, [s]);

  const captured = useMemo(() => new Set(s.collezione.map((c) => c.id)), [s.collezione]);
  const realiCatturate = useMemo(
    () => s.collezione.filter((c) => c.origine === "reale").length,
    [s.collezione],
  );

  const isCaptured = useCallback((id: string) => captured.has(id), [captured]);
  const getCow = useCallback((id: string) => s.collezione.find((c) => c.id === id), [s.collezione]);

  // --- progressione allenatore ---
  const addXp = useCallback((n: number) => {
    setS((p) => {
      let xp = p.trainer.xp + n;
      let level = p.trainer.level;
      let next = p.trainer.xpToNextLevel;
      while (xp >= next) {
        xp -= next;
        level += 1;
        next = Math.floor(next * 1.5);
      }
      return { ...p, trainer: { ...p.trainer, xp, level, xpToNextLevel: next } };
    });
  }, []);

  const addCoins = useCallback((n: number) => {
    setS((p) => ({ ...p, trainer: { ...p.trainer, coins: Math.max(0, p.trainer.coins + n) } }));
  }, []);

  // --- collezione ---
  const cattura = useCallback((v: Vazzamon) => {
    let nuova = false;
    setS((p) => {
      if (p.collezione.some((c) => c.id === v.id)) return p;
      nuova = true;
      const xpGain = v.rarita === "Leggendaria" ? 350 : v.rarita === "Epica" ? 220 : 120;
      let xp = p.trainer.xp + xpGain;
      let level = p.trainer.level;
      let next = p.trainer.xpToNextLevel;
      while (xp >= next) { xp -= next; level += 1; next = Math.floor(next * 1.5); }
      return {
        ...p,
        collezione: [{ ...v, capturedAt: v.capturedAt ?? "catturata" }, ...p.collezione],
        trainer: {
          ...p.trainer,
          xp, level, xpToNextLevel: next,
          capturedCount: p.trainer.capturedCount + 1,
          coins: p.trainer.coins + 25,
        },
      };
    });
    return nuova;
  }, []);

  const rilascia = useCallback((id: string) => {
    setS((p) => {
      if (p.collezione.length <= 1) return p;
      return {
        ...p,
        collezione: p.collezione.filter((c) => c.id !== id),
        backpack: p.backpack.map((it) =>
          it.id === "candy-hay" ? { ...it, quantity: it.quantity + 5 } : it,
        ),
      };
    });
  }, []);

  const potenzia = useCallback((id: string) => {
    let ok = false;
    setS((p) => {
      const hay = p.backpack.find((i) => i.id === "candy-hay");
      if (p.trainer.coins < 15 || !hay || hay.quantity < 1) return p;
      ok = true;
      return {
        ...p,
        trainer: { ...p.trainer, coins: p.trainer.coins - 15 },
        backpack: p.backpack.map((i) => (i.id === "candy-hay" ? { ...i, quantity: i.quantity - 1 } : i)),
        collezione: p.collezione.map((c) => {
          if (c.id !== id) return c;
          const stats = {
            stazza: Math.min(120, c.stats.stazza + 2),
            corna: Math.min(120, c.stats.corna + 2),
            testa: Math.min(120, c.stats.testa + 2),
            grinta: Math.min(120, c.stats.grinta + 1),
          };
          return {
            ...c,
            stats,
            potenza: stats.stazza + stats.corna + stats.testa + stats.grinta,
            cp: c.cp + 75 + Math.floor((c.level * 7) % 30),
            level: c.level + 1,
          };
        }),
      };
    });
    return ok;
  }, []);

  // --- item ---
  const usaItem = useCallback((id: string, n = 1) => {
    let ok = false;
    setS((p) => {
      const it = p.backpack.find((i) => i.id === id);
      if (!it || it.quantity < n) return p;
      ok = true;
      return { ...p, backpack: p.backpack.map((i) => (i.id === id ? { ...i, quantity: i.quantity - n } : i)) };
    });
    return ok;
  }, []);

  const aggiungiItem = useCallback((id: string, n: number) => {
    setS((p) => ({ ...p, backpack: p.backpack.map((i) => (i.id === id ? { ...i, quantity: i.quantity + n } : i)) }));
  }, []);

  // --- camminata: km, xp, monete, incubazione uova ---
  const eggSeed = useRef(1);
  const camminaMetri = useCallback((metri: number): Egg[] => {
    if (metri <= 0 || metri > 3000) return [];
    const km = metri / 1000;
    const schiuse: Egg[] = [];
    setS((p) => {
      // uova
      const nuoveCovate: Egg[] = [];
      const hatchedVazz: Vazzamon[] = [];
      for (const e of p.eggs) {
        if (!e.isIncubating) { nuoveCovate.push(e); continue; }
        const walked = Number((e.kmWalked + km).toFixed(2));
        if (walked >= e.kmRequired) {
          schiuse.push(e);
          hatchedVazz.push(
            generaVazzamon({
              seed: eggSeed.current++ * 7919 + Math.round(walked * 100),
              origine: "schiusa",
              rarita: e.rarita,
              lat: 45.737,
              lng: 7.32,
            }),
          );
          // sostituisci con un nuovo uovo
          const pool: Rarita[] = ["Comune", "Rara", "Epica"];
          const r = pool[(eggSeed.current + nuoveCovate.length) % pool.length];
          nuoveCovate.push({
            id: "egg-" + eggSeed.current + "-" + nuoveCovate.length,
            rarita: r,
            kmWalked: 0,
            kmRequired: r === "Epica" ? 5 : r === "Rara" ? 3 : 2,
            isIncubating: true,
          });
        } else {
          nuoveCovate.push({ ...e, kmWalked: walked });
        }
      }
      // xp/monete da camminata
      let xp = p.trainer.xp + Math.round(km * 240);
      let level = p.trainer.level;
      let next = p.trainer.xpToNextLevel;
      while (xp >= next) { xp -= next; level += 1; next = Math.floor(next * 1.5); }
      return {
        ...p,
        eggs: nuoveCovate,
        collezione: [...hatchedVazz, ...p.collezione],
        trainer: {
          ...p.trainer,
          kmTraveled: Number((p.trainer.kmTraveled + km).toFixed(2)),
          coins: p.trainer.coins + Math.round(km * 4),
          xp, level, xpToNextLevel: next,
          capturedCount: p.trainer.capturedCount + hatchedVazz.length,
        },
      };
    });
    return schiuse;
  }, []);

  const toggleSound = useCallback(() => setS((p) => ({ ...p, sound: !p.sound })), []);
  const reset = useCallback(() => setS(defaultState()), []);

  const value: GameValue = {
    ...s,
    captured,
    realiCatturate,
    isCaptured,
    getCow,
    cattura,
    rilascia,
    potenzia,
    camminaMetri,
    addXp,
    addCoins,
    usaItem,
    aggiungiItem,
    toggleSound,
    reset,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame deve stare dentro <GameProvider>");
  return ctx;
}
