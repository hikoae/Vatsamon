/**
 * Quiz educativo "Scuola d'Alpeggio" — banca domande statica e variegata
 * (storia, biologia, ecologia, Fontina/casaro, Batailles, conservazione,
 * comportamento responsabile). QuizScreen ne pesca un sottoinsieme casuale
 * a ogni partita per non essere ripetitivo. Nessun fetch/server.
 */
export interface QuizQuestion {
  id: string;
  category: "Tradizione" | "Biologia" | "Ecologia" | "Casaro" | "Rispetto" | "Storia";
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: "Facile" | "Medio" | "Difficile";
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    category: "Tradizione",
    question: 'Che cosa s\'intende per "Bataille de Reines"?',
    options: [
      "Un combattimento cruento tra tori per la supremazia.",
      "Una sfilata di bellezza per la mucca con la campana più grande.",
      'Un confronto incruento di spinta tra bovine per eleggere la "Regina del pascolo".',
      "Un ballo tradizionale dei pastori di Cogne.",
    ],
    correctAnswerIndex: 2,
    explanation:
      "È una manifestazione antichissima e totalmente incruenta: le mucche (soprattutto Castane) si spingono fronte contro fronte finché una desiste, stabilendo la gerarchia naturale della mandria.",
    difficulty: "Facile",
  },
  {
    id: "q2",
    category: "Biologia",
    question: "Perché la Valdostana Castana è la razza regina delle Batailles?",
    options: [
      "Perché è la più grande e pesante in assoluto.",
      "Per il suo temperamento combattivo e la naturale propensione a stabilire gerarchie spingendosi.",
      "Perché ha le corna più affilate per ferire le rivali.",
      "Perché è l'unica che produce latte in inverno.",
    ],
    correctAnswerIndex: 1,
    explanation:
      "La Castana ha un carattere vivace e dominante: tende per istinto a misurarsi con le altre per la leadership del pascolo. Non è la più grande, ma la più 'reine' di carattere.",
    difficulty: "Medio",
  },
  {
    id: "q3",
    category: "Casaro",
    question: "Quanti litri di latte servono in media per UNA forma di Fontina DOP?",
    options: ["Circa 10 litri", "Circa 50 litri", "Circa 100 litri", "Circa 500 litri"],
    correctAnswerIndex: 2,
    explanation:
      "Per una forma (8–12 kg) servono ~100 litri di latte crudo intero. Per questo il lavoro delle bovine al pascolo è prezioso: rispettiamole mentre mangiano.",
    difficulty: "Medio",
  },
  {
    id: "q4",
    category: "Casaro",
    question: "Da quale latte si produce la vera Fontina DOP?",
    options: [
      "Latte pastorizzato di qualsiasi razza italiana.",
      "Latte in polvere reidratato d'alpeggio.",
      "Latte crudo intero di una singola mungitura di bovine valdostane.",
      "Latte di capra di Gressoney.",
    ],
    correctAnswerIndex: 2,
    explanation:
      "La Fontina DOP nasce solo da latte crudo e intero di Pezzata Rossa, Pezzata Nera o Castana valdostane, lavorato subito dopo la mungitura. È tutelata a livello europeo dal 1996.",
    difficulty: "Medio",
  },
  {
    id: "q5",
    category: "Rispetto",
    question: "A quale distanza minima è corretto avvicinarsi a una mucca al pascolo?",
    options: [
      "Almeno 50 metri con un teleobiettivo.",
      "Accanto a lei, accarezzandole il muso.",
      "Almeno 5 metri, con calma, mai posizionandosi dietro di lei.",
      "1 metro, offrendole cibo salato.",
    ],
    correctAnswerIndex: 2,
    explanation:
      "Tieni almeno 5 metri e muoviti con calma. Mai metterti alle sue spalle (rischio calci) e mai tra una madre e il suo vitello.",
    difficulty: "Facile",
  },
  {
    id: "q6",
    category: "Rispetto",
    question: "Una mandria occupa il sentiero che devi percorrere. Cosa fai?",
    options: [
      "Corro in mezzo agitando le braccia per farle spostare.",
      "Aspetto o aggiro il gruppo a distanza, senza separare i vitelli dalle madri.",
      "Lancio il bastone da trekking per aprirmi un varco.",
      "Suono il fischietto fino a disperderle.",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Mai spaventare la mandria né separare i vitelli dalle madri. Si aggira con calma a distanza di sicurezza: la pazienza è la regola d'oro dell'alpeggio.",
    difficulty: "Facile",
  },
  {
    id: "q7",
    category: "Tradizione",
    question: "Cos'è la 'Désarpa' (o Désarpe) nella tradizione valdostana?",
    options: [
      "La discesa festosa delle mandrie dagli alpeggi a fine estate, con le mucche addobbate.",
      "Una gara di sci tra pastori.",
      "Il nome del torello vincitore della Bataille.",
      "Un formaggio stagionato in grotta.",
    ],
    correctAnswerIndex: 0,
    explanation:
      "La Désarpa è il ritorno a valle delle mandrie dopo l'estate in alpeggio: le bovine sfilano addobbate di fiori e campanacci. È una grande festa che celebra il legame uomo–animale–montagna.",
    difficulty: "Medio",
  },
  {
    id: "q8",
    category: "Tradizione",
    question: "A cosa serve principalmente il campanaccio (la 'sonaille') al collo delle Reines?",
    options: [
      "Solo a fare rumore per le feste di paese.",
      "A permettere al pastore di localizzare gli animali tra pascoli e nebbia.",
      "A spaventare i lupi con la musica.",
      "A indicare il prezzo di vendita della mucca.",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Il campanaccio aiuta a ritrovare le bovine nei vasti alpeggi e nella nebbia. Le campane più belle e sonore sono un orgoglio durante la Désarpa.",
    difficulty: "Facile",
  },
  {
    id: "q9",
    category: "Biologia",
    question: 'Perché le razze valdostane sono dette "a duplice attitudine"?',
    options: [
      "Producono sia latte d'alta qualità che carne, e si muovono agili sui terreni più ripidi.",
      "Fanno il bagno nei laghi alpini e corrono sulla neve.",
      "Sanno cantare col campanaccio e guidare il pastore a casa.",
      "Sono amate sia dai turisti italiani che stranieri.",
    ],
    correctAnswerIndex: 0,
    explanation:
      "Sono perfette per l'arco alpino: agili arrampicatrici che danno latte straordinario per la Fontina e hanno ottima muscolatura, preservando al contempo il territorio montano.",
    difficulty: "Medio",
  },
  {
    id: "q10",
    category: "Ecologia",
    question: "Qual è il ruolo ecologico del pascolo delle mucche in alpeggio?",
    options: [
      "Danneggia la montagna consumando l'erba.",
      "È ininfluente per l'ambiente alpino.",
      "Mantiene aperti i prati, favorisce la biodiversità floreale e previene il dissesto del suolo.",
      "Serve solo a produrre latame inquinante.",
    ],
    correctAnswerIndex: 2,
    explanation:
      "Il pascolo gestito tiene aperti i prati d'alta quota, favorisce fiori e insetti impollinatori e, con la cotica erbosa, contrasta frane ed erosione. Senza alpeggio la montagna si degrada.",
    difficulty: "Difficile",
  },
  {
    id: "q11",
    category: "Rispetto",
    question: "Incontri un cancello di legno chiuso lungo un sentiero che attraversa un pascolo. Come ti comporti?",
    options: [
      "Lo lascio aperto per far passare anche gli altri.",
      "Lo scavalco senza aprirlo per non rovinare i cardini.",
      "Lo apro con cautela, passo e lo richiudo accuratamente.",
      "Cambio sentiero: l'accesso è vietato agli umani.",
    ],
    correctAnswerIndex: 2,
    explanation:
      "I recinti contengono il bestiame ed evitano che si disperda in zone pericolose. Apri, passa e richiudi sempre con cura.",
    difficulty: "Facile",
  },
  {
    id: "q12",
    category: "Ecologia",
    question: "Perché NON bisogna calpestare l'erba alta dei prati a fine primavera/estate?",
    options: [
      "Perché è velenosa per gli umani.",
      "Perché è l'erba da sfalcio: diventerà il fieno che nutrirà le mucche d'inverno.",
      "Perché nasconde serpenti pericolosi.",
      "Perché è proprietà privata recintata.",
    ],
    correctAnswerIndex: 1,
    explanation:
      "L'erba alta è destinata allo sfalcio: calpestarla rovina il raccolto di fieno del pastore. Cammina sempre sui sentieri tracciati.",
    difficulty: "Medio",
  },
  {
    id: "q13",
    category: "Storia",
    question: "Da quando si hanno testimonianze storiche delle Batailles de Reines in Valle d'Aosta?",
    options: [
      "Da pochi decenni, è un'invenzione turistica moderna.",
      "Da secoli: sono legate alla transumanza e alla gerarchia naturale delle mandrie.",
      "Dall'epoca romana, come spettacolo nei circhi.",
      "Dal Duemila, dopo la nascita della DOP Fontina.",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Le 'spinte' tra mucche per la leadership esistono da sempre nelle mandrie; i pastori le osservano e valorizzano da secoli. Il torneo regionale moderno organizza una tradizione antichissima.",
    difficulty: "Difficile",
  },
  {
    id: "q14",
    category: "Biologia",
    question: "Fino a che quota possono spingersi al pascolo le robuste bovine valdostane?",
    options: ["Massimo 800 m", "Circa 1500 m", "Oltre i 2500 m di altitudine", "Solo in pianura"],
    correctAnswerIndex: 2,
    explanation:
      "Sono arrampicatrici eccezionali: pascolano l'erba fiorita più nutriente anche oltre i 2500 m, dove altre razze non reggerebbero la pendenza e il clima.",
    difficulty: "Medio",
  },
  {
    id: "q15",
    category: "Rispetto",
    question: "Stai facendo trekking con il cane in un alpeggio con mucche. Qual è il comportamento corretto?",
    options: [
      "Lo lascio libero: socializzerà con le mucche.",
      "Lo tengo al guinzaglio corto e mi tengo a distanza dalla mandria.",
      "Lo incito ad abbaiare per tenere lontane le mucche.",
      "Lo faccio correre tra i vitelli per giocare.",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Il cane va tenuto al guinzaglio corto: per le mucche è un potenziale predatore e una madre può caricare per difendere il vitello. Distanza e prudenza sempre.",
    difficulty: "Facile",
  },
  {
    id: "q16",
    category: "Ecologia",
    question: "Cosa fai delle bucce di frutta e dei rifiuti organici in alta quota?",
    options: [
      "Le lascio: sono biodegradabili e concimano.",
      "Le seppellisco sotto un sasso.",
      "Le riporto a valle: ad alta quota si decompongono lentissimamente e attirano fauna nociva.",
      "Le do da mangiare alle mucche.",
    ],
    correctAnswerIndex: 2,
    explanation:
      "In montagna anche l'organico impiega molto tempo a decomporsi e altera la fauna locale. Tutto ciò che porti su, riportalo giù.",
    difficulty: "Medio",
  },
  {
    id: "q17",
    category: "Casaro",
    question: "Dove stagiona tradizionalmente la Fontina DOP per sviluppare il suo aroma?",
    options: [
      "In frigoriferi industriali a –4 °C.",
      "In magazzini di stagionatura freschi e umidi, spesso ex gallerie o grotte di montagna.",
      "Al sole sui tetti delle baite.",
      "Immersa nel latte per 3 mesi.",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Stagiona almeno 3 mesi in ambienti freschi e umidi (anche antiche gallerie), dove le forme vengono rivoltate, salate e spazzolate a mano per sviluppare crosta e aroma.",
    difficulty: "Difficile",
  },
  {
    id: "q18",
    category: "Tradizione",
    question: "Come si chiama la vincitrice assoluta del torneo regionale delle Batailles de Reines?",
    options: ["La Duchessa", "La Reina di tutte le Reines (Reina del torneo)", "La Capomandria d'Oro", "La Fontina Vivente"],
    correctAnswerIndex: 1,
    explanation:
      "La campionessa che vince la finale di categoria diventa la 'Reina' del torneo: un titolo prestigiosissimo per l'allevatore, celebrato in tutta la Valle.",
    difficulty: "Medio",
  },
];
