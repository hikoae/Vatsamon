/**
 * i18n dell'hub Batailles — bilinguismo IT/FR nativo (la Valle d'Aosta è
 * bilingue). Leggero, senza dipendenze: dizionario + hook con persistenza.
 * Copre tutta la navigazione e le etichette dell'hub; i contenuti lunghi
 * (cultura, glossario, leggende, note eventi) portano le proprie traduzioni
 * nei rispettivi dati.
 */
import { useEffect, useState } from "react";

export type Lang = "it" | "fr";

const LS_LANG = "vazzamon_lang";

const DICT = {
  it: {
    // header
    title: "Stagione",
    headerSub: "Batailles de Reines · segui le eliminatorie reali, fai i tuoi pronostici e accompagna la tua Reina fino alla finale di {date}.",
    puntiTifoso: "Punti Tifoso",
    // nav
    nav_notizie: "Notizie",
    nav_calendario: "Calendario",
    nav_albo: "Albo d'Oro",
    nav_tabellone: "Tabellone",
    nav_segui: "Segui",
    nav_scopri: "Scopri",
    // notizie
    news_prossimaTappa: "Prossima tappa",
    news_finale: "Finale regionale",
    news_giorni: "giorni",
    news_btnCalendario: "Calendario",
    news_btnPronostici: "Pronostici",
    news_dalMondo: "Dal mondo Batailles",
    news_agg: "agg.",
    news_loading: "Carico le notizie…",
    news_spazioSponsor: "Spazio sponsor",
    news_disclaimer: "Notizie aggregate dalle testate locali (titolo + estratto + link alla fonte), aggiornate automaticamente. Fonte ufficiale dei dati gara: amisdesreines.it.",
    // calendario — stati
    st_inCorso: "In corso",
    st_inArrivo: "In arrivo",
    st_conclusa: "Conclusa",
    st_disputata: "Disputata",
    st_prossima: "Prossima",
    st_inCalendario: "In calendario",
    cal_pausa: "Pausa d'alpeggio",
    cal_finoAl: "fino al",
    cal_ctaFinale: "Fai i tuoi pronostici per la finale",
    cal_disclaimer: "Risultati e tabellone aggiornabili in tempo reale durante l'evento — senza ripubblicare l'app.",
    // albo
    albo_title: "Albo d'Oro",
    albo_sub: "Le Reines des Reines della Finale regionale, una per categoria.",
    albo_finaleCN: "Finale Croix-Noire",
    albo_note: "Dati storici verificati da cronache locali. 2020 non disputato come finale ufficiale (Combat événement Covid).",
    // tabellone
    br_intro: "Finale regionale · {cat} ({peso}) · tocca la Reina che pensi vincerà ogni scontro.",
    br_champion: "La tua Reina campionessa",
    br_reine: "Reine 2026",
    br_nodata: "Dati tabellone non disponibili per questa categoria.",
    // segui
    fol_scegli: "Scegli la tua Reina del cuore",
    fol_scegliSub: "Seguila per tutta la stagione fino alla finale regionale.",
    fol_seguendo: "Stai seguendo",
    fol_comune: "Comune",
    fol_allevatore: "Allevatore",
    fol_potenza: "Potenza",
    fol_cammino: "Il suo cammino",
    fol_seed: "È tra le teste di serie della finale di {cat}. Apri il tabellone per pronosticare il suo percorso fino al titolo.",
    fol_qual: "Punta a qualificarsi per la finale di {cat} alla Croix-Noire del {date}.",
    fol_vaiTabellone: "Vai al tabellone",
    fol_smetti: "Smetti di seguire",
    // scopri
    scopri_storia: "Storia",
    scopri_cultura: "Cultura",
    scopri_regolamento: "Regolamento",
    scopri_glossario: "Glossario",
    storia_intro: "Da combattimento spontaneo all'alpeggio a campionato amato da tutta la Valle d'Aosta: la storia delle Batailles de Reines in poche tappe.",
    reg_categorie: "Categorie di peso per fase",
    reg_fase: "Fase",
    reg_soglieNota: "Le soglie salgono di fase in fase. Fonte autoritativa: regolamento ufficiale annuale (amisdesreines.it).",
    reg_r1t: "🩺 Bovine gravide",
    reg_r1d: "Per moderare l'aggressività: almeno 3 mesi (eliminatorie estive), 4 mesi (autunnali).",
    reg_r2t: "🐮 Scontro incruento",
    reg_r2d: "Spinta a colpi di corna limate; l'allevatore conduce ma non forza. Vince chi fa sottomettere l'avversaria.",
    reg_r3t: "🏆 A eliminazione diretta",
    reg_r3d: "La vincitrice di ogni scontro avanza; in finale si incoronano 3 Reines des Reines, una per categoria.",
    reg_r4t: "🌿 Premi",
    reg_r4d: "Trofeo «Bosquet» (rami con fiori rossi), campanaccio (sonnaille) e collare in cuoio.",
    gloss_fonti: "Fonti ufficiali",
  },
  fr: {
    title: "Saison",
    headerSub: "Batailles de Reines · suivez les éliminatoires, faites vos pronostics et accompagnez votre Reine jusqu'à la finale du {date}.",
    puntiTifoso: "Points Supporter",
    nav_notizie: "Actualités",
    nav_calendario: "Calendrier",
    nav_albo: "Palmarès",
    nav_tabellone: "Tableau",
    nav_segui: "Suivre",
    nav_scopri: "Découvrir",
    news_prossimaTappa: "Prochaine étape",
    news_finale: "Finale régionale",
    news_giorni: "jours",
    news_btnCalendario: "Calendrier",
    news_btnPronostici: "Pronostics",
    news_dalMondo: "Du monde des Batailles",
    news_agg: "màj",
    news_loading: "Chargement des actualités…",
    news_spazioSponsor: "Espace sponsor",
    news_disclaimer: "Actualités agrégées des médias locaux (titre + extrait + lien vers la source), mises à jour automatiquement. Source officielle des données : amisdesreines.it.",
    st_inCorso: "En cours",
    st_inArrivo: "À venir",
    st_conclusa: "Terminée",
    st_disputata: "Disputée",
    st_prossima: "Prochaine",
    st_inCalendario: "Au calendrier",
    cal_pausa: "Pause d'alpage",
    cal_finoAl: "jusqu'au",
    cal_ctaFinale: "Faites vos pronostics pour la finale",
    cal_disclaimer: "Résultats et tableau actualisables en temps réel pendant l'événement — sans republier l'application.",
    albo_title: "Palmarès",
    albo_sub: "Les Reines des Reines de la Finale régionale, une par catégorie.",
    albo_finaleCN: "Finale Croix-Noire",
    albo_note: "Données historiques vérifiées par la presse locale. 2020 non disputé comme finale officielle (Combat événement Covid).",
    br_intro: "Finale régionale · {cat} ({peso}) · touchez la Reine qui gagnera chaque duel selon vous.",
    br_champion: "Votre Reine championne",
    br_reine: "Reine 2026",
    br_nodata: "Données du tableau indisponibles pour cette catégorie.",
    fol_scegli: "Choisissez votre Reine de cœur",
    fol_scegliSub: "Suivez-la toute la saison jusqu'à la finale régionale.",
    fol_seguendo: "Vous suivez",
    fol_comune: "Commune",
    fol_allevatore: "Éleveur",
    fol_potenza: "Puissance",
    fol_cammino: "Son parcours",
    fol_seed: "Elle fait partie des têtes de série de la finale de {cat}. Ouvrez le tableau pour pronostiquer son parcours jusqu'au titre.",
    fol_qual: "Elle vise la qualification pour la finale de {cat} à la Croix-Noire du {date}.",
    fol_vaiTabellone: "Aller au tableau",
    fol_smetti: "Ne plus suivre",
    scopri_storia: "Histoire",
    scopri_cultura: "Culture",
    scopri_regolamento: "Règlement",
    scopri_glossario: "Glossaire",
    storia_intro: "D'un combat spontané à l'alpage à un championnat aimé de toute la Vallée d'Aoste : l'histoire des Batailles de Reines en quelques étapes.",
    reg_categorie: "Catégories de poids par phase",
    reg_fase: "Phase",
    reg_soglieNota: "Les seuils augmentent de phase en phase. Source officielle : règlement annuel (amisdesreines.it).",
    reg_r1t: "🩺 Vaches gestantes",
    reg_r1d: "Pour modérer l'agressivité : au moins 3 mois (éliminatoires d'été), 4 mois (automne).",
    reg_r2t: "🐮 Combat non sanglant",
    reg_r2d: "Poussée à coups de cornes émoussées ; l'éleveur conduit mais ne force pas. Gagne celle qui fait céder l'adversaire.",
    reg_r3t: "🏆 Élimination directe",
    reg_r3d: "La gagnante de chaque duel avance ; en finale on couronne 3 Reines des Reines, une par catégorie.",
    reg_r4t: "🌿 Prix",
    reg_r4d: "Trophée « Bosquet » (rameaux à fleurs rouges), sonnaille et collier en cuir.",
    gloss_fonti: "Sources officielles",
  },
} as const;

export type DictKey = keyof (typeof DICT)["it"];

export function tr(lang: Lang, key: DictKey, vars?: Record<string, string>): string {
  let s: string = DICT[lang][key] ?? DICT.it[key];
  if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, vars[k]);
  return s;
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LS_LANG) === "fr" ? "fr" : "it"));
  useEffect(() => { localStorage.setItem(LS_LANG, lang); }, [lang]);
  return [lang, setLang];
}
