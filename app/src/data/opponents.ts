/**
 * Pastori avversari (NPC) per la battaglia a turni stile Bataille de Reines.
 * Portati da vatsamon (`src/App.tsx` NPC_OPPONENTS): dialoghi narrativi + campionessa.
 * Personaggi di fantasia (non allevatori reali) → nomi mantenuti per la narrazione.
 */
export interface Pastore {
  id: string;
  name: string;
  title: string;
  avatar: string;
  dialogueIntro: string;
  dialogueWin: string; // il pastore commenta la SUA sconfitta (il giocatore vince)
  dialogueLoss: string; // il pastore commenta la SUA vittoria (il giocatore perde)
  cowName: string;
  cowBreed: string;
  cowLevel: number;
  cowStats: { strength: number; resistance: number; agility: number; spirit: number };
  rewardXp: number;
}

export const NPC_OPPONENTS: Pastore[] = [
  {
    id: "pastore-1",
    name: "Marco Alpino",
    title: "Alpeggiatore di Cogne",
    avatar: "👨‍🌾",
    dialogueIntro:
      "La mia mucca Bimba è la regina del vallone di Valnontey. Unisciti a noi per una spinta amichevole e mostra il valore del tuo legame bovino!",
    dialogueWin: "Un bellissimo incontro! La tua Reina ha mostrato un grande spirito e una spinta d'acciaio.",
    dialogueLoss: "Bimba ha mantenuto il baricentro ben ancorato. Torna quando avrai accumulato più cammini alpini!",
    cowName: "Bimba",
    cowBreed: "Castana",
    cowLevel: 4,
    cowStats: { strength: 55, resistance: 45, agility: 50, spirit: 65 },
    rewardXp: 150,
  },
  {
    id: "pastore-2",
    name: "Giulia Monti",
    title: "Pastora della Val Ferret",
    avatar: "👩‍🌾",
    dialogueIntro:
      "Le mie bovine vivono all'aria fresca sotto le Grandes Jorasses. Sei pronto a testare la regalità e la determinazione della tua mucca contro Flora?",
    dialogueWin: "Accidenti, che manovra inaspettata! Flora si è complimentata con un bel muggito.",
    dialogueLoss: "Flora ha la flemma dei ghiacciai del Monte Bianco. Devi allenare la tua Reina!",
    cowName: "Flora",
    cowBreed: "Pezzata Rossa",
    cowLevel: 6,
    cowStats: { strength: 65, resistance: 70, agility: 40, spirit: 60 },
    rewardXp: 250,
  },
  {
    id: "pastore-3",
    name: 'Beppe "Courba"',
    title: "Anziano Casaro di Challand",
    avatar: "👴",
    dialogueIntro:
      "In ottant'anni ne ho viste di Reines salire sull'arena di Aosta. Dimmi, giovane esploratore, possiedi la regalità necessaria per sfidare Mora?",
    dialogueWin: "Incredibile... Mi hai ricordato i leggendari tornei degli anni Settanta. Una splendida Reina!",
    dialogueLoss: "Mora ha l'agilità tipica delle regine nate sulle rocce. Fai camminare ancora la tua mucca!",
    cowName: "Mora",
    cowBreed: "Pezzata Nera",
    cowLevel: 10,
    cowStats: { strength: 75, resistance: 75, agility: 65, spirit: 80 },
    rewardXp: 500,
  },
];
