/**
 * i18n dell'hub Batailles — bilinguismo IT/FR nativo (la Valle d'Aosta è
 * bilingue). Leggero, senza dipendenze: dizionario + hook con persistenza.
 * Copre la navigazione e le etichette dell'hub; i contenuti lunghi (cultura,
 * glossario) portano le proprie traduzioni nei rispettivi dati.
 */
import { useEffect, useState } from "react";

export type Lang = "it" | "fr";

const LS_LANG = "vazzamon_lang";

type Dict = {
  headerSub: string; // {date} = data finale
  puntiTifoso: string;
  nav_notizie: string;
  nav_calendario: string;
  nav_albo: string;
  nav_tabellone: string;
  nav_segui: string;
  nav_scopri: string;
  scopri_cultura: string;
  scopri_regolamento: string;
  scopri_glossario: string;
};

const DICT: Record<Lang, Dict> = {
  it: {
    headerSub: "Batailles de Reines · segui le eliminatorie reali, fai i tuoi pronostici e accompagna la tua Reina fino alla finale di {date}.",
    puntiTifoso: "Punti Tifoso",
    nav_notizie: "Notizie",
    nav_calendario: "Calendario",
    nav_albo: "Albo d'Oro",
    nav_tabellone: "Tabellone",
    nav_segui: "Segui",
    nav_scopri: "Scopri",
    scopri_cultura: "Cultura",
    scopri_regolamento: "Regolamento",
    scopri_glossario: "Glossario",
  },
  fr: {
    headerSub: "Batailles de Reines · suivez les éliminatoires, faites vos pronostics et accompagnez votre Reine jusqu'à la finale du {date}.",
    puntiTifoso: "Points Supporter",
    nav_notizie: "Actualités",
    nav_calendario: "Calendrier",
    nav_albo: "Palmarès",
    nav_tabellone: "Tableau",
    nav_segui: "Suivre",
    nav_scopri: "Découvrir",
    scopri_cultura: "Culture",
    scopri_regolamento: "Règlement",
    scopri_glossario: "Glossaire",
  },
};

export function tr(lang: Lang, key: keyof Dict, vars?: Record<string, string>): string {
  let s: string = DICT[lang][key] ?? DICT.it[key];
  if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, vars[k]);
  return s;
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LS_LANG) === "fr" ? "fr" : "it"));
  useEffect(() => { localStorage.setItem(LS_LANG, lang); }, [lang]);
  return [lang, setLang];
}
