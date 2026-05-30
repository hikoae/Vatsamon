import { Vazzamon, Hotspot } from '../types';

export const INITIAL_VAZZADEX: Vazzamon[] = [
  {
    id: "vazza-init-1",
    breed: "Castana Valdostana",
    name: "Regina delle Alpi",
    stats: {
      strength: 82,
      defense: 75,
      agility: 50
    },
    rarity: "Epica",
    eco_tip: "Lascia intatti i fiori d'alta quota, servono alla biodiversità e per il nutrimento della fauna alpina primaverile.",
    lore: "Una mucca possente dallo sguardo fiero. Custodisce le tradizioni secolari e dicono che ami canticchiare al ritmo del suo campanaccio.",
    capturedAt: new Date(2026, 4, 15).toISOString(),
    cp: 1420,
    level: 20
  },
  {
    id: "vazza-init-2",
    breed: "Pezzata Rossa",
    name: "Frisona del Monte Bianco",
    stats: {
      strength: 55,
      defense: 62,
      agility: 60
    },
    rarity: "Comune",
    eco_tip: "I piccoli sentieri si logorano facilmente. Cammina sempre in fila indiana per proteggere i bordi erbosi.",
    lore: "Curiosa e affettuosa, adora fare capolino per farsi accarezzare dai camminatori e posare per spettacolari foto ricordo.",
    capturedAt: new Date(2026, 4, 18).toISOString(),
    cp: 640,
    level: 10
  }
];

export const DEMO_PREMIUM_COWS: Vazzamon[] = [
  {
    id: "demo-gold-reina",
    breed: "Regina d'Oro",
    name: "Reina del Gran Paradiso",
    stats: {
      strength: 98,
      defense: 92,
      agility: 88
    },
    rarity: "Leggendaria",
    eco_tip: "Mantieni pulitissimi i corsi d'acqua montani. L'acqua limpida dona purezza straordinaria alla preziosa Fontina.",
    lore: "Una creatura gloriosa emersa dai riflessi cristallini dei ghiacciai del Gran Paradiso. Le sue corna risplendono di vera luce dorata.",
    capturedAt: new Date().toISOString(),
    cp: 2850,
    level: 35
  },
  {
    id: "demo-black-fury",
    breed: "Pezzata Nera",
    name: "Tempesta dei Ghiacciai",
    stats: {
      strength: 88,
      defense: 80,
      agility: 72
    },
    rarity: "Epica",
    eco_tip: "I rumori molesti inducono stress negli animali al pascolo, incidendo anche sulla munta. Rispetta la pace d'alta quota.",
    lore: "Temprata dalle bufere furiose del massiccio del Rosa. Schiva gli intrusi agilmente, ma accetta volentieri un pizzico di sale grosso.",
    capturedAt: new Date().toISOString(),
    cp: 1890,
    level: 25
  },
  {
    id: "demo-val-runner",
    breed: "Evolène",
    name: "Fulmine di Valgrisenche",
    stats: {
      strength: 65,
      defense: 60,
      agility: 95
    },
    rarity: "Rara",
    eco_tip: "Se incontri cani da guardiania (pastori maremmani), allontanati lentamente e non urlare.",
    lore: "Leggera come un camoscio valicatore. Si dice che le piaccia ingaggiare corse di velocità con le marmotte locali sui pendii erbosi.",
    capturedAt: new Date().toISOString(),
    cp: 1120,
    level: 15
  }
];

export const HP_LOCATIONS: Hotspot[] = [
  {
    id: "hp-val-ferret",
    name: "Alpeggi Val Ferret",
    valley: "Courmayeur",
    x: 18,
    y: 22,
    lat: 45.815,
    lng: 6.992,
    difficulty: "Facile",
    description: "Ai piedi del maestoso massiccio del Monte Bianco. Un paradiso verde per i pascoli di saporito trifoglio alpino d'alta quota."
  },
  {
    id: "hp-cogne",
    name: "Prati di Sant'Orso",
    valley: "Cogne - Gran Paradiso",
    x: 42,
    y: 65,
    lat: 45.608,
    lng: 7.355,
    difficulty: "Medio",
    description: "La culla del parco nazionale più antico dell'alpe. Qui le mucche pascolano libere tra camosci, marmotte ed aquile reali."
  },
  {
    id: "hp-st-barthelemy",
    name: "Osservatorio Lignan",
    valley: "Saint-Barthélemy",
    x: 74,
    y: 38,
    lat: 45.782,
    lng: 7.478,
    difficulty: "Difficile",
    description: "Cieli tra i più limpidi d'Europa e una vallata baciata dal sole. Adatta per incontrare i misteriosi Vazzamon celestiali e notturni."
  },
  {
    id: "hp-fenis",
    name: "Castello d'Alpage Fénis",
    valley: "Fénis",
    x: 65,
    y: 48,
    lat: 45.736,
    lng: 7.491,
    difficulty: "Facile",
    description: "Monumento medievale circondato da rigogliosi prati di fieno fresco, ideali per la ricarica energetica delle Pezzate Rosse."
  },
  {
    id: "hp-fort-bard",
    name: "Antico Forte di Bard",
    valley: "Valle del Monte Rosa",
    x: 88,
    y: 82,
    lat: 45.609,
    lng: 7.744,
    difficulty: "Difficile",
    description: "Forte storico che controlla i transiti di vetta. Spesso vi si radunano i guerrieri Vazzamon leggendari per sfidarsi all'ombra delle mura."
  }
];
