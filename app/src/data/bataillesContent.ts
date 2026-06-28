/**
 * CONTENUTI HUB — cultura, glossario e fonti del mondo Batailles de Reines.
 * Testi divulgativi verificati (vedi materiali/BATAILLES_DOSSIER.md). Statici,
 * pronti per i18n (per ora IT; il FR si aggiunge nello stesso schema).
 */

export interface SchedaCultura {
  id: string;
  titolo: string;
  testo: string;
  emoji: string;
}

export const CULTURA: SchedaCultura[] = [
  {
    id: "cult-01",
    emoji: "👑",
    titolo: "Le Batailles de Reines, le regine delle Alpi",
    testo:
      "Sono i combattimenti rituali e incruenti tra mucche di razza Valdostana che, ogni stagione, stabiliscono in modo naturale la «regina» della mandria. Non c'è violenza imposta dall'uomo: è l'istinto di dominio delle bovine più combattive, le pezzate nere e castane. Una tradizione che da secoli accompagna la vita pastorale della Valle d'Aosta.",
  },
  {
    id: "cult-02",
    emoji: "⛰️",
    titolo: "Tutto nasce all'alpe",
    testo:
      "La bataille nasce con la transumanza. Nel giorno dell'inalpa (la salita all'alpeggio, tra maggio e giugno) mandrie diverse si fondono e devono ricostruire la propria gerarchia: le mucche si sfidano a colpi di corna finché una non prevale. È la «regina dell'alpeggio», che guiderà la mandria per tutta l'estate, fino alla désarpa, la discesa di fine settembre.",
  },
  {
    id: "cult-03",
    emoji: "📜",
    titolo: "Da rito spontaneo a tradizione condivisa",
    testo:
      "Le sfide tra mucche sono documentate almeno dalla metà dell'Ottocento: il poeta in patois Jean-Baptiste Cerlogne descrisse le battaglie a Vertosan, e il torneo è noto fin dal 1858. La svolta arriva nel 1958, con la nascita dell'Association Régionale des Amis des Batailles de Reines, che ha trasformato gli scontri spontanei in un vero campionato.",
  },
  {
    id: "cult-04",
    emoji: "🤝",
    titolo: "Più di una sfida: un'identità",
    testo:
      "Per la comunità valdostana la regina è motivo d'orgoglio: il suo valore ricade sull'allevatore, ne esalta le capacità e ne accresce il prestigio. L'antropologa Christiane Dunoyer descrive la bataille come uno «stabilizzatore sociale»: nell'arena l'uomo resta in secondo piano, a decidere è la mucca. È l'etica del lavoro che si fa festa.",
  },
  {
    id: "cult-05",
    emoji: "🏟️",
    titolo: "Il campionato delle regine",
    testo:
      "Da fine marzo a ottobre si svolgono una quindicina di eliminatorie in tutta la regione, con una pausa estiva durante l'alpeggio. Le bovine, pesate la mattina, gareggiano in tre categorie di peso. Vince chi spinge l'avversaria fino a farla cedere; le corna sono spuntate per evitare ferite. La stagione culmina nella grande finale di ottobre all'Arena Croix-Noire di Aosta.",
  },
  {
    id: "cult-06",
    emoji: "🐄",
    titolo: "Valdostana o Hérens?",
    testo:
      "In Valle d'Aosta le protagoniste sono soprattutto le mucche di razza Valdostana Pezzata Nera e Castana (la Pezzata Rossa è invece la grande produttrice di latte per la Fontina DOP). In VdA è ammessa e usata anche la Hérens, razza del Vallese svizzero — dove i Combats de Reines sono una tradizione gemella ma distinta. Due mondi vicini, da non confondere nei dati.",
  },
];

/** Voce di glossario IT/FR/patois (pronta per i18n). */
export interface GlossarioVoce {
  chiave: string;
  it: string;
  fr: string;
  patois?: string;
  def: string;
}

export const GLOSSARIO: GlossarioVoce[] = [
  { chiave: "reine", it: "Regina", fr: "Reine", patois: "reina", def: "La mucca dominante che guida la mandria. Plurale: Reines." },
  { chiave: "reine_des_reines", it: "Regina delle Regine", fr: "Reine des Reines", patois: "reina di reine", def: "Titolo supremo: una per ciascuna delle 3 categorie, incoronata in finale." },
  { chiave: "bataille", it: "Combattimento", fr: "Bataille", patois: "bataille", def: "Lo scontro incruento tra due bovine, a colpi di corna." },
  { chiave: "moudzon", it: "Manza / giovenca", fr: "Moudzon", patois: "modzon", def: "Giovane bovina femmina; la Bataille de moudzons è la categoria junior." },
  { chiave: "inarpa", it: "Salita all'alpeggio", fr: "Inalpe", patois: "inarpa", def: "La monticazione: trasferimento delle mandrie ai pascoli estivi, a metà giugno." },
  { chiave: "desarpa", it: "Discesa dagli alpeggi", fr: "Désalpe", patois: "désarpa", def: "La smonticazione: ritorno dei bovini a valle, fine settembre (29/9, San Michele)." },
  { chiave: "alpeggio", it: "Alpeggio / pascolo estivo", fr: "Alpage", patois: "arp", def: "Pascolo d'alta quota (1500–2000+ m) occupato da giugno a fine settembre, legato alla Fontina DOP." },
  { chiave: "bosquet", it: "Addobbo della regina", fr: "Bosquet", patois: "mécro", def: "Rami decorati con fiori rossi di cartapesta, premio della Reine des Reines." },
  { chiave: "reina_corne", it: "Regina delle corna", fr: "Reine des cornes", patois: "reina di corne", def: "La più combattiva alla désarpa (bosquet con fiori rossi)." },
  { chiave: "reina_latte", it: "Regina del latte", fr: "Reine du lait", patois: "reina di lasi", def: "La più produttiva alla désarpa (bosquet con fiori bianchi)." },
  { chiave: "razza_valdostana", it: "Razza Valdostana", fr: "Race Valdôtaine", patois: "vatse valdotèna", def: "La razza bovina protagonista: Pezzata Nera e Castana le combattive, Pezzata Rossa da latte." },
  { chiave: "herens", it: "Razza Hérens", fr: "Race d'Hérens", def: "Razza del Vallese svizzero, monocromatica; ammessa e usata anche in Valle d'Aosta." },
];

/** Fonti ufficiali e canali (per Notizie e sezione Ente). */
export interface FonteLink {
  nome: string;
  url: string;
  tipo: "ufficiale" | "news" | "social" | "video" | "regione";
}

export const FONTI: FonteLink[] = [
  { nome: "Amis des Batailles de Reines (sito ufficiale)", url: "https://www.amisdesreines.it", tipo: "ufficiale" },
  { nome: "Calendario gare ufficiale", url: "https://www.amisdesreines.it/calendario-gare/", tipo: "ufficiale" },
  { nome: "Regione VdA — lovevda.it", url: "https://www.lovevda.it/it/cultura/tradizione/eventi-tradizione/batailles-de-reines", tipo: "regione" },
  { nome: "AostaSera — Società", url: "https://aostasera.it/notizie/societa/", tipo: "news" },
  { nome: "Gazzetta Matin", url: "https://www.gazzettamatin.com", tipo: "news" },
  { nome: "AostaOggi — Sport", url: "https://www.aostaoggi.it/sport", tipo: "news" },
  { nome: "Facebook ufficiale", url: "https://www.facebook.com/battaillesdereines", tipo: "social" },
  { nome: "Instagram @amisdesreines", url: "https://www.instagram.com/amisdesreines/", tipo: "social" },
  { nome: "YouTube — dirette gare", url: "https://www.youtube.com/@bataillesreineslive2019", tipo: "video" },
];
