/**
 * Quiz educativo "Scuola d'Alpeggio" — dati statici (estratti da vatsamon
 * `server.ts` PASTORAL_QUIZ_QUESTIONS + domande aggiuntive su rispetto animali,
 * sentieri, Fontina e Batailles de Reines). Nessun fetch/server.
 */
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: "Facile" | "Medio" | "Difficile";
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    question: 'Che cosa s\'intende storicamente per "Bataille de Reines"?',
    options: [
      "Un combattimento cruento tra tori da monta per la supremazia.",
      "Una sfilata di bellezza in cui vince la mucca con la campana più grande.",
      'Un confronto amichevole e incruento basato sulla spinta delle bovine per eleggere la "Regina del pascolo".',
      "Un ballo tradizionale dei pastori di Cogne.",
    ],
    correctAnswerIndex: 2,
    explanation:
      "La Bataille de Reines è una manifestazione antichissima e totalmente incruenta. Le mucche (soprattutto della razza Castana) si sfidano spingendosi fronte contro fronte finché una delle due desiste spontaneamente, determinando la gerarchia naturale della mandria.",
    difficulty: "Facile",
  },
  {
    id: "q2",
    question:
      "Qual è il formaggio DOP più celebre della Valle d'Aosta, prodotto con latte intero di bovine valdostane alimentate a pascolo?",
    options: ["Il Fromadzo", "La Fontina DOP", "Il Toma di Gressoney", "Il Lardo di Arnad"],
    correctAnswerIndex: 1,
    explanation:
      "La Fontina DOP viene prodotta fin dal 1200 ed è tutelata a livello europeo. Si realizza solo con latte crudo e intero proveniente da una singola mungitura di bovine di razza Pezzata Rossa, Pezzata Nera o Castana.",
    difficulty: "Facile",
  },
  {
    id: "q3",
    question:
      "Qual è il comportamento corretto se incontri un cancello di legno chiuso lungo un sentiero che attraversa un pascolo?",
    options: [
      "Lasciarlo aperto per facilitare il passaggio di altri escursionisti.",
      "Scavalcarlo senza aprirlo per non danneggiare i cardini.",
      "Aprirlo con cautela per passare, e poi richiuderlo accuratamente alle proprie spalle.",
      "Cambiare sentiero perché l'accesso è severamente vietato agli umani.",
    ],
    correctAnswerIndex: 2,
    explanation:
      "I recinti sono fondamentali per contenere il bestiame ed evitare che si disperda o finisca in zone impervie o strade. Aprili, passa e richiudili sempre con cura!",
    difficulty: "Medio",
  },
  {
    id: "q4",
    question:
      'Perché le razze autoctone valdostane (Pezzata Rossa, Nera e Castana) sono definite "a duplice attitudine"?',
    options: [
      "Perché producono sia latte d'alta qualità che carne, e si muovono agilmente sui terreni più ripidi con rusticità estrema.",
      "Perché fanno il bagno nei laghi alpini e corrono sulla neve.",
      "Perché sanno cantare con il campanaccio e guidare il pastore a casa.",
      "Perché sono amate sia dai turisti italiani che da quelli stranieri.",
    ],
    correctAnswerIndex: 0,
    explanation:
      "Le bovine valdostane sono perfette per l'arco alpino: agili arrampicatrici che producono latte straordinario per la Fontina e hanno un'ottima muscolatura, preservando al contempo il territorio montano.",
    difficulty: "Medio",
  },
  {
    id: "q5",
    question:
      "A quale distanza minima dovresti posizionarti per scattare una foto ravvicinata a una mucca al pascolo?",
    options: [
      "Almeno 50 metri con un teleobiettivo professionale.",
      "Accanto a lei, accarezzandole il muso per metterla a suo agio.",
      "Almeno 5 metri, muovendosi con calma senza posizionarsi direttamente dietro di lei.",
      "1 metro, purché le si offra del cibo salato.",
    ],
    correctAnswerIndex: 2,
    explanation:
      "Mantieni sempre almeno 5 metri di distanza. La mucca è un animale grande che può spaventarsi o muoversi rapidamente, soprattutto con un vitellino. Non metterti mai alle sue spalle per evitare calci accidentali.",
    difficulty: "Medio",
  },
  {
    id: "q6",
    question: "Cosa fai se una mandria di mucche occupa il sentiero che devi percorrere?",
    options: [
      "Corro in mezzo alla mandria agitando le braccia per farle spostare.",
      "Aspetto con calma o aggiro il gruppo lateralmente a distanza, senza separare i vitelli dalle madri.",
      "Lancio il mio bastone da trekking per aprirmi un varco.",
      "Suono ripetutamente il clacson o il fischietto fino a disperderle.",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Mai separare i vitelli dalle madri né spaventare la mandria. Si aggira con calma a distanza di sicurezza: la pazienza è la regola d'oro dell'alpeggio.",
    difficulty: "Medio",
  },
  {
    id: "q7",
    question: "Quanti litri di latte servono in media per produrre una sola forma di Fontina DOP?",
    options: ["Circa 10 litri", "Circa 50 litri", "Circa 100 litri", "Circa 500 litri"],
    correctAnswerIndex: 2,
    explanation:
      "Per una forma di Fontina (8-12 kg) servono circa 100 litri di latte. Ecco perché il lavoro delle bovine al pascolo è prezioso: rispettiamole mentre mangiano!",
    difficulty: "Difficile",
  },
  {
    id: "q8",
    question: "Il campanaccio (la 'sonaille') al collo delle Reines serve principalmente a:",
    options: [
      "Fare rumore per le feste di paese.",
      "Permettere al pastore di localizzare gli animali tra i pascoli e la nebbia.",
      "Spaventare i lupi con la musica.",
      "Indicare il prezzo di vendita della mucca.",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Il campanaccio aiuta il pastore a ritrovare le bovine nei vasti alpeggi e nella nebbia. Le campane più belle e sonore sono un orgoglio per gli allevatori durante la Désarpa (la discesa dagli alpeggi).",
    difficulty: "Medio",
  },
  {
    id: "q9",
    question: "Durante un'escursione, cosa è meglio NON fare per rispettare i pascoli alpini?",
    options: [
      "Restare sui sentieri tracciati.",
      "Calpestare e attraversare l'erba alta destinata allo sfalcio del fieno.",
      "Riportare a valle i propri rifiuti.",
      "Tenere il cane al guinzaglio.",
    ],
    correctAnswerIndex: 1,
    explanation:
      "L'erba da sfalcio è il fieno che nutrirà le mucche d'inverno: calpestarla rovina il raccolto del pastore. Cammina sempre sui sentieri segnati.",
    difficulty: "Facile",
  },
  {
    id: "q10",
    question: "La 'Désarpa' (o Désarpe) nella tradizione valdostana è:",
    options: [
      "La discesa festosa delle mandrie dagli alpeggi a fine estate, con le mucche addobbate.",
      "Una gara di sci tra pastori.",
      "Il nome del torello vincitore della Bataille.",
      "Un tipo di formaggio stagionato.",
    ],
    correctAnswerIndex: 0,
    explanation:
      "La Désarpa è il ritorno a valle delle mandrie dopo l'estate in alpeggio: le bovine sfilano addobbate con fiori e campanacci. È una grande festa che celebra il legame tra uomo, animale e montagna.",
    difficulty: "Difficile",
  },
];
