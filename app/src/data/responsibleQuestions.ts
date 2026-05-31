/**
 * FASE 4 — Educazione integrata "Esplorazione responsabile".
 *
 * Banca di domande BREVI usate negli incontri casuali con guardaparco/pastori
 * mentre cammini (vedi `handleSimulatedWalk` + `RespectEncounter`). Sono distinte
 * dal quiz "Scuola d'Alpeggio" (`data/quiz.ts`): qui il taglio è pratico, sul
 * comportamento corretto in montagna (distanza dalle mucche, cancelli dei
 * recinti, cani al guinzaglio, rifiuti, sentieri tracciati, ecc.).
 *
 * Ogni domanda alimenta il "Punteggio Rispetto": risposta giusta → +Rispetto e
 * ricompensa; risposta sbagliata → -Rispetto e una spiegazione educativa.
 * Tutto statico, nessun fetch.
 */
export interface ResponsibleQuestion {
  id: string;
  /** Chi pone la domanda lungo il sentiero (per il flavor del modale). */
  npc: string;
  /** Emoji dell'NPC. */
  emoji: string;
  /** Tema del comportamento responsabile. */
  topic:
    | "Distanza dalle mucche"
    | "Recinti e cancelli"
    | "Cani al guinzaglio"
    | "Rifiuti"
    | "Sentieri tracciati"
    | "Fauna e flora"
    | "Rumore"
    | "Acqua e pascoli";
  domanda: string;
  opzioni: string[];
  indiceCorretto: number;
  spiegazione: string;
}

export const RESPONSIBLE_QUESTIONS: ResponsibleQuestion[] = [
  {
    id: "rq1",
    npc: "Guardaparco Bruno",
    emoji: "🧑‍🌾",
    topic: "Distanza dalle mucche",
    domanda:
      "Incontri una mandria di Reines che pascola proprio sul sentiero. Cosa fai?",
    opzioni: [
      "Mi avvicino per accarezzarle e fare un selfie ravvicinato.",
      "Mantengo le distanze (almeno 50 m), aggiro con calma e senza gesti bruschi.",
      "Corro in mezzo alla mandria per passare il prima possibile.",
    ],
    indiceCorretto: 1,
    spiegazione:
      "Le bovine al pascolo, specie con i vitelli, vanno rispettate da lontano: tieni almeno 50 metri, muoviti con calma e aggira la mandria. Avvicinarsi o correre le stressa e può provocare reazioni difensive.",
  },
  {
    id: "rq2",
    npc: "Pastore Marco",
    emoji: "👨‍🌾",
    topic: "Recinti e cancelli",
    domanda:
      "Attraversi un pascolo recintato passando da un cancelletto. Come ti comporti?",
    opzioni: [
      "Lo lascio aperto: tanto passerà presto qualcun altro.",
      "Lo richiudo sempre dietro di me, come l'ho trovato.",
      "Scavalco il recinto per non perdere tempo col cancello.",
    ],
    indiceCorretto: 1,
    spiegazione:
      "Regola d'oro dell'alpeggio: richiudi sempre i cancelli dietro di te. Un cancello lasciato aperto può far disperdere la mandria nei canaloni o sulla strada, con rischi per gli animali e per gli automobilisti.",
  },
  {
    id: "rq3",
    npc: "Guardaparco Elsa",
    emoji: "👩‍🌾",
    topic: "Cani al guinzaglio",
    domanda:
      "Cammini con il tuo cane vicino a un pascolo di mucche. Cosa è corretto fare?",
    opzioni: [
      "Lo lascio libero: si diverte a rincorrere le mucche.",
      "Lo tengo al guinzaglio corto e sotto controllo.",
      "Lo libero solo per fargli abbaiare e tenere lontane le mucche.",
    ],
    indiceCorretto: 1,
    spiegazione:
      "Vicino al bestiame il cane va tenuto al guinzaglio corto. Un cane libero può spaventare la mandria, provocare fughe e ferimenti, e mettere in pericolo sé stesso se gli animali reagiscono.",
  },
  {
    id: "rq4",
    npc: "Pastora Lucia",
    emoji: "👩‍🌾",
    topic: "Rifiuti",
    domanda:
      "Hai finito la merenda e ti restano una buccia di banana e un involucro. Cosa fai?",
    opzioni: [
      "La buccia è organica, la lascio: si decompone in fretta.",
      "Riporto tutto a valle, compresa la buccia.",
      "Nascondo i rifiuti sotto un sasso così non si vedono.",
    ],
    indiceCorretto: 1,
    spiegazione:
      "Si riporta a valle TUTTO, anche gli scarti organici: in alta quota una buccia impiega anni a decomporsi, attira fauna nociva e altera l'equilibrio dei pascoli. Non lasciare traccia del tuo passaggio.",
  },
  {
    id: "rq5",
    npc: "Guardaparco Bruno",
    emoji: "🧑‍🌾",
    topic: "Sentieri tracciati",
    domanda:
      "Il sentiero fa un lungo tornante. Vedi una scorciatoia ripida nel prato. Che fai?",
    opzioni: [
      "Taglio dritto per il prato: risparmio tempo.",
      "Resto sul sentiero tracciato anche se è più lungo.",
      "Taglio solo se il prato sembra robusto.",
    ],
    indiceCorretto: 1,
    spiegazione:
      "Resta sempre sul sentiero segnato. Tagliare i tornanti calpesta i fragili fiori d'alpeggio, innesca erosione del terreno e rovina i pascoli di cui vivono api e mandrie.",
  },
  {
    id: "rq6",
    npc: "Pastore Marco",
    emoji: "👨‍🌾",
    topic: "Rumore",
    domanda:
      "Sei in un alpeggio silenzioso e vorresti ascoltare musica. Come ti regoli?",
    opzioni: [
      "Metto la cassa a tutto volume: la montagna è di tutti.",
      "Uso le cuffie o tengo il volume basso, rispettando il silenzio.",
      "Grido e fischio per sentire l'eco tra le valli.",
    ],
    indiceCorretto: 1,
    spiegazione:
      "Il silenzio dell'alpeggio è prezioso: i rumori forti stressano le bovine al pascolo (riducendo anche la qualità del latte) e disturbano la fauna selvatica. Usa le cuffie o tieni basso il volume.",
  },
  {
    id: "rq7",
    npc: "Guardaparco Elsa",
    emoji: "👩‍🌾",
    topic: "Fauna e flora",
    domanda:
      "Trovi una splendida fioritura di stelle alpine lungo il sentiero. Cosa fai?",
    opzioni: [
      "Ne raccolgo un mazzetto come ricordo.",
      "Le fotografo e le lascio dove sono.",
      "Ne raccolgo solo una, tanto non si nota.",
    ],
    indiceCorretto: 1,
    spiegazione:
      "I fiori d'alta quota, come la stella alpina, sono protetti: si guardano e si fotografano, non si raccolgono. Ogni fiore strappato è un seme in meno per la montagna di domani.",
  },
  {
    id: "rq8",
    npc: "Pastora Lucia",
    emoji: "👩‍🌾",
    topic: "Acqua e pascoli",
    domanda:
      "Vuoi rinfrescarti in un abbeveratoio dove bevono le mucche. È corretto?",
    opzioni: [
      "Sì, ci faccio il bagno e ci lavo le scarpe.",
      "No, lascio l'abbeveratoio pulito per gli animali e prendo acqua dalle fonti dedicate.",
      "Ci verso il sapone per lavarmi le mani.",
    ],
    indiceCorretto: 1,
    spiegazione:
      "Gli abbeveratoi servono al bestiame: non vanno sporcati con sapone, scarpe o bagni. L'acqua contaminata può far ammalare la mandria. Usa le fontane e i punti acqua destinati alle persone.",
  },
  {
    id: "rq9",
    npc: "Guardaparco Bruno",
    emoji: "🧑‍🌾",
    topic: "Distanza dalle mucche",
    domanda:
      "Una mucca con il suo vitellino ti fissa e abbassa la testa. Qual è il comportamento giusto?",
    opzioni: [
      "Mi avvicino al vitellino: è troppo tenero.",
      "Mi allontano con calma dando spazio a mamma e vitello.",
      "Resto immobile e la fisso negli occhi per dominarla.",
    ],
    indiceCorretto: 1,
    spiegazione:
      "Una madre con il vitello è molto protettiva: testa bassa e sguardo fisso sono segnali d'allerta. Allontanati con calma, senza dare le spalle di corsa né avvicinarti al piccolo. Mai mettersi tra mamma e vitello.",
  },
  {
    id: "rq10",
    npc: "Pastore Marco",
    emoji: "👨‍🌾",
    topic: "Sentieri tracciati",
    domanda:
      "Il sentiero è fangoso per la pioggia. Come lo percorri?",
    opzioni: [
      "Cammino di lato sull'erba pulita per non sporcarmi.",
      "Attraverso il fango restando al centro del sentiero.",
      "Salto da una zolla all'altra ai bordi del prato.",
    ],
    indiceCorretto: 1,
    spiegazione:
      "Anche col fango si resta al centro del sentiero: allargarsi sui bordi per evitare le pozze allarga il tracciato, calpesta la vegetazione e accelera l'erosione. Buoni scarponi impermeabili e via dritto.",
  },
];
