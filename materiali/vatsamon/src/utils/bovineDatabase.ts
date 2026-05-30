/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HistoricCow {
  id: string;
  name: string;
  owner: string;
  comune: string;
  recognition: string;
  specialAward?: string;
  weight: number;
  breed: 'Castana Valdostana' | 'Pezzata Nera Valdostana' | 'Pezzata Rossa Valdostana';
  rarity: 'Comune' | 'Rara' | 'Epica' | 'Leggendaria';
  category: '1ª Categoria' | '2ª Categoria' | '3ª Categoria' | 'Manze (Génisses)';
  combatStats: {
    strength: number;      // Forza_Corna
    resistance: number;    // Stamina
    agility: number;       // Agilità
    spirit: number;        // Temperamento / Orgoglio
  };
  attack: number;          // Attacco
  defense: number;         // Difesa
  note?: string;
  imagePath?: string;
}

// Basic template data of the 61 cows extracted from the official database
const RAW_COWS = [
  { id: 'VZ001', name: 'ALLEGRA', owner: 'BUSSO PIERO', comune: 'Donnas', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ002', name: 'ALOUETTE', owner: 'BUSSO PIERO', comune: 'Donnas', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ003', name: 'ALOUETTE', owner: 'ANSERMIN - PORLIOD', comune: 'Nus', recognition: '4º', specialAward: '', weight: 0 },
  { id: 'VZ004', name: 'AQUILA', owner: 'REAN SIMONE', comune: 'Saint-Marcel', recognition: 'Vacca più pesante (bataille)', specialAward: 'Plus lourde', weight: 758 },
  { id: 'VZ005', name: 'ARDIA', owner: 'CRETIER AURELIO', comune: 'Saint-Vincent', recognition: '2º', specialAward: '', weight: 0 },
  { id: 'VZ006', name: 'BATAILLE', owner: 'MARTIGON ANGELO', comune: 'Mont Emilius', recognition: '2º', specialAward: 'Montagnes', weight: 0 },
  { id: 'VZ007', name: 'BAYONNE', owner: 'BIONAZ MICHELE', comune: 'Brissogne', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ008', name: 'BELLONNE', owner: 'BORBEY FULVIO', comune: 'Pollein', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ009', name: 'BELVA', owner: 'PERRIN DIEGO', comune: 'Quart', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ010', name: 'BERLIN', owner: 'CHARBONNIER SIMON E JULIEN', comune: 'Aosta', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ011', name: 'BRIGANDA', owner: 'AZ. AGR. VERNEY', comune: 'Gressan', recognition: 'Vacca più pesante (bataille)', specialAward: 'Plus lourde', weight: 720 },
  { id: 'VZ012', name: 'BRUNIE', owner: 'YEUILLA EZIO', comune: 'Verrayes', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ013', name: 'BUFERA', owner: 'FRÈRES ARVAT', comune: 'Donnas', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ014', name: 'CAMPIGLIA', owner: 'AZ. AGR. VERNEY', comune: 'Gressan', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ015', name: 'CAMPIGLIA', owner: 'MACHET HOLDER', comune: 'Torgnon', recognition: 'Vacca più pesante (bataille)', specialAward: 'Plus lourde', weight: 740 },
  { id: 'VZ016', name: 'CHEROKEE', owner: 'HERESAZ IVAN', comune: 'Evançon', recognition: '4º', specialAward: '', weight: 0 },
  { id: 'VZ017', name: 'FARCHETTA', owner: 'ROSSET LORENZO', comune: 'Nus', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ018', name: 'FARCHETTA II', owner: 'ROSSET LORENZO', comune: 'Nus', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ019', name: 'FAROUK', owner: 'MARQUIS RENZO', comune: 'Verrayes', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ020', name: 'FERONDA', owner: 'GARIN MASSIMILIANO', comune: 'Cogne', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ021', name: 'FUOCO', owner: 'BICH ROBY', comune: 'Pontey', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ022', name: 'FURIE', owner: 'GARIN MASSIMILIANO', comune: 'Cogne', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ023', name: 'GITANE', owner: 'FRÈRES VIERIN', comune: 'Gignod', recognition: 'Vacca più pesante (bataille)', specialAward: 'Plus lourde', weight: 680 },
  { id: 'VZ024', name: 'GLORIEUSE', owner: 'FAVRE REMIGIO', comune: 'Doues', recognition: 'Vacca più pesante (bataille)', specialAward: 'Plus lourde', weight: 801 },
  { id: 'VZ025', name: 'GRIBOUILLE', owner: 'BORBEY FULVIO', comune: 'Pollein', recognition: 'Finalista regionale', specialAward: 'Kg De Lait', weight: 0 },
  { id: 'VZ026', name: 'JACOBY', owner: 'POMMAT FANNY', comune: 'Grand Combin', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ027', name: 'LISETTA', owner: 'DALBARD REMO E GILLES', comune: 'Pollein', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ028', name: 'LIV', owner: 'CONSOL MATTEO', comune: 'Pont-Saint-Martin', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ029', name: 'MAGALY', owner: 'GLAREY DAVIDE', comune: 'Aymavilles', recognition: 'Finalista regionale', specialAward: 'Kg De Lait', weight: 0 },
  { id: 'VZ030', name: 'MALIBÙ', owner: 'DALBARD LORENZO', comune: 'Aosta', recognition: 'Reine Régionale', specialAward: '', weight: 0 },
  { id: 'VZ031', name: 'MALIZIA', owner: 'BIZEL VILMO', comune: 'Morgex', recognition: 'Reine Régionale', specialAward: '', weight: 0 },
  { id: 'VZ032', name: 'MARMOTTA', owner: 'DUJANY GIMMY', comune: 'Châtillon', recognition: 'Finalista regionale', specialAward: '', weight: 745 },
  { id: 'VZ033', name: 'MILORD', owner: 'VIAL RONNY', comune: 'Nus', recognition: 'Vacca più pesante (bataille)', specialAward: 'Plus lourde', weight: 768 },
  { id: 'VZ034', name: 'MIRACLE', owner: 'AZ. AGR. VERNEY', comune: 'Mont Emilius', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ035', name: 'MONELLA', owner: 'RONNY VIAL', comune: 'Nus', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ036', name: 'MOTEILA', owner: 'MILLESI DIDIER', comune: 'Perloz', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ037', name: 'MYSTHÈRE', owner: 'HERESAZ IVAN', comune: 'Verrès', recognition: '4º', specialAward: '', weight: 0 },
  { id: 'VZ038', name: 'PAISON', owner: 'VALLET JADIR', comune: 'Nus', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ039', name: 'PALMYRE', owner: 'GIROD NELLO', comune: 'Fontainemore', recognition: '2º', specialAward: '', weight: 0 },
  { id: 'VZ040', name: 'PINSON', owner: 'LA BOUETTA', comune: 'Aosta', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ041', name: 'PROMESSE', owner: 'BARMASSE - BERGER', comune: 'Valtournenche', recognition: 'Vacca più pesante (bataille)', specialAward: 'Plus lourde', weight: 758 },
  { id: 'VZ042', name: 'RAMBLA', owner: 'BONIN GILDO', comune: 'Gressan', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ043', name: 'REINETTA', owner: 'MARTINOD YANNICK', comune: 'Saint-Nicolas', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ044', name: 'REINETTA', owner: 'BETEMPS DARIO', comune: 'Saint-Christophe', recognition: 'Reine Régionale', specialAward: '', weight: 0 },
  { id: 'VZ045', name: 'REINON', owner: 'FOLLIN ANDRE E DAVIDE', comune: 'Antey-Saint-André', recognition: 'Vacca più pesante (bataille)', specialAward: 'Plus lourde', weight: 786 },
  { id: 'VZ046', name: 'REINUN', owner: 'FRÈRES CUNEAZ', comune: 'Valle d’Aosta', recognition: 'Reine Régionale', specialAward: '', weight: 0 },
  { id: 'VZ047', name: 'SUISSE', owner: 'FRASSY - LETEY', comune: 'Arvier', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ048', name: 'SUISSE II', owner: 'FRASSY - LETEY', comune: 'Arvier', recognition: 'Finalista regionale', specialAward: 'Interregionale', weight: 0 },
  { id: 'VZ049', name: 'TACCON', owner: 'BECHAZ NICOLE', comune: 'Challand-Saint-Victor', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ050', name: 'TICKY', owner: 'ARLIAN ITALO', comune: 'Nus', recognition: '2º', specialAward: 'Deuxièmes Veaux', weight: 0 },
  { id: 'VZ051', name: 'TIKI', owner: 'RONCO SANDRO', comune: 'Issogne', recognition: 'Vacca più pesante (bataille)', specialAward: 'Plus lourde', weight: 763 },
  { id: 'VZ052', name: 'TORMENTA', owner: 'SOC. LO TSANTI', comune: 'Aosta', recognition: 'Finalista regionale', specialAward: 'Aosta Arena', weight: 710, breedOverride: 'Castana Valdostana', imageOverride: '/src/assets/images/tormenta.png' },
  { id: 'VZ053', name: 'TULIPE', owner: 'FRASSY - LETEY', comune: 'Arvier', recognition: 'Vacca più pesante (bataille)', specialAward: 'Plus lourde', weight: 708 },
  { id: 'VZ054', name: 'VEDETTE', owner: 'BIONAZ MICHELE', comune: 'Brissogne', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ055', name: 'VESPA', owner: 'LALE DEMOZ STEFANO', comune: 'Quart', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ056', name: 'VICTOIRE', owner: 'BONIN GILDO', comune: 'Gressan', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ057', name: 'VICTOIRE II', owner: 'SOC. LA BORETTAZ', comune: 'Gressan', recognition: 'Finalista regionale', specialAward: 'Reine de la Borna', weight: 715, breedOverride: 'Castana Valdostana', imageOverride: '/src/assets/images/victoire.png' },
  { id: 'VZ058', name: 'VILAINE', owner: 'GRIMOD DAVIDE', comune: 'Aosta', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ059', name: 'ZARA', owner: 'FRÈRES QUENDOZ', comune: 'Jovencan', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ060', name: 'ZARA II', owner: 'HERESAZ IVAN', comune: 'Verrès', recognition: 'Finalista regionale', specialAward: '', weight: 0 },
  { id: 'VZ061', name: 'ZARA III', owner: 'HERESAZ IVAN', comune: 'Verrès', recognition: 'Reine Nationale (Suisse)', specialAward: '', weight: 0 },
  { id: 'VZ062', name: 'LIBAN', owner: 'CHAMPION GIANNI', comune: 'Saint-Marcel', recognition: 'Reine Régionale', specialAward: 'Champion d\'Arenas', weight: 742, breedOverride: 'Castana Valdostana', imageOverride: '/src/assets/images/liban.png' },
  { id: 'VZ063', name: 'MALICE', owner: 'GONTHIER EDY', comune: 'Aymavilles', recognition: 'Finalista regionale', specialAward: 'Simpatia d\'Alpeggio', weight: 685, breedOverride: 'Castana Valdostana', imageOverride: '/src/assets/images/malice.png' },
  { id: 'VZ064', name: 'BIJOU', owner: 'BIELLER DAVIDE', comune: 'Pre-Saint-Didier', recognition: 'Finalista regionale', specialAward: 'Collar d\'Onore', weight: 712, breedOverride: 'Castana Valdostana', imageOverride: '/src/assets/images/bijou.png' },
  { id: 'VZ065', name: 'AMARA', owner: 'FIELLER LORIS', comune: 'Fenis', recognition: '4º', specialAward: 'Miglior Portamento', weight: 654, breedOverride: 'Castana Valdostana', imageOverride: '/src/assets/images/amara.png' },
  { id: 'VZ066', name: 'CONTESSA', owner: 'MUIN ROBERTO', comune: 'Quart', recognition: 'Finalista regionale', specialAward: 'Regalità d\'Alpe', weight: 698, breedOverride: 'Castana Valdostana', imageOverride: '/src/assets/images/contessa.png' },
  { id: 'VZ067', name: 'GUERRA', owner: 'FRÈRES PINET', comune: 'Issogne', recognition: 'Reine Régionale', specialAward: 'Spirito di Combattimento', weight: 724, breedOverride: 'Castana Valdostana', imageOverride: '/src/assets/images/guerra.png' }
];

export const HISTORIC_BOVINES_DATABASE: HistoricCow[] = RAW_COWS.map((raw) => {
  // Let's determine breed based on rules:
  // Pie Rouge (Pezzata Rossa Valdostana) doesn't fight and is typically known for dairy ("Kg de Lait").
  // So GRIBOUILLE and MAGALY are Pie Rouge. Let's make an extra couple of Pezzate Rosse.
  let breed: 'Castana Valdostana' | 'Pezzata Nera Valdostana' | 'Pezzata Rossa Valdostana' = 'Castana Valdostana';
  if ((raw as any).breedOverride) {
    breed = (raw as any).breedOverride;
  } else if (raw.specialAward === 'Kg De Lait') {
    breed = 'Pezzata Rossa Valdostana';
  } else {
    // Other combatants can be Castana or Pezzata Nera (Pie Noire). Castana is usually heavier/top Tier.
    // Let's split them: finalista and 4º can have Pie Noire (about 30%), the rest are Castana (about 70%).
    const h = raw.id.charCodeAt(4) % 10;
    if (h < 3 && raw.recognition !== 'Reine Régionale' && raw.recognition !== 'Reine Nationale (Suisse)') {
      breed = 'Pezzata Nera Valdostana';
    }
  }

  // Determine rarity from recognition
  let rarity: 'Comune' | 'Rara' | 'Epica' | 'Leggendaria' = 'Comune';
  if (raw.recognition.includes('Reine Régionale') || raw.recognition.includes('Reine Nationale')) {
    rarity = 'Leggendaria';
  } else if (raw.recognition === '2º' || raw.specialAward === 'Plus lourde') {
    rarity = 'Epica';
  } else if (raw.recognition === '4º') {
    rarity = 'Rara';
  } else if (raw.recognition === 'Finalista regionale') {
    rarity = 'Comune'; // Or Non Comune. We can map with standard types. Let's map to our main types.
  }

  // Weight (Peso_kg in raw is sometimes 0, let's generate based on category/riconoscimento weight ranges)
  let weight = raw.weight;
  if (weight === 0) {
    if (raw.specialAward === 'Kg De Lait') {
      weight = Math.floor(580 + (raw.id.charCodeAt(4) % 10) * 12); // Dairy range
    } else if (rarity === 'Leggendaria') {
      weight = Math.floor(710 + (raw.id.charCodeAt(4) % 10) * 8); // Heavy and majestic
    } else if (rarity === 'Epica') {
      weight = Math.floor(670 + (raw.id.charCodeAt(4) % 10) * 10);
    } else if (raw.recognition === '4º') {
      weight = Math.floor(620 + (raw.id.charCodeAt(4) % 10) * 10);
    } else {
      // Finalista can range from intermediate to lightweight
      const seed = raw.id.charCodeAt(4) % 3;
      if (seed === 0) {
        weight = Math.floor(540 + (raw.id.charCodeAt(4) % 8) * 7); // <600kg (3ª cat)
      } else {
        weight = Math.floor(610 + (raw.id.charCodeAt(4) % 8) * 10); // 600-700kg (2ª cat)
      }
    }
  }

  // Categorizzazione rules:
  // 1ère catégorie (1ª): >= ~700 kg
  // 2ème catégorie (2ª): ~600-700 kg
  // 3ème catégorie (3ª): < ~600 kg
  // Manze / Génisses: giovani (let's say we have some with younger levels)
  let category: '1ª Categoria' | '2ª Categoria' | '3ª Categoria' | 'Manze (Génisses)' = '2ª Categoria';
  if (weight >= 700) {
    category = '1ª Categoria';
  } else if (weight >= 600) {
    category = '2ª Categoria';
  } else if (weight > 0) {
    category = '3ª Categoria';
  }

  // Stats design matching database constraints:
  // Proposta: Attacco = media Forza_Corna + Temperamento, Difesa = F(Peso, Stamina)
  // Let's compute combatStats based on Category:
  let baseStrength = 50;
  let baseResistance = 50;
  let baseAgility = 50;
  let baseSpirit = 50;

  if (category === '1ª Categoria') {
    // Heavy weight, massive strength, high resistance, slightly lower agility
    baseStrength = Math.floor(80 + (weight % 15));
    baseResistance = Math.floor(75 + (weight % 12));
    baseAgility = Math.floor(40 + (weight % 10));
    baseSpirit = Math.floor(82 + (weight % 14));
  } else if (category === '2ª Categoria') {
    baseStrength = Math.floor(68 + (weight % 12));
    baseResistance = Math.floor(65 + (weight % 10));
    baseAgility = Math.floor(55 + (weight % 12));
    baseSpirit = Math.floor(70 + (weight % 12));
  } else {
    // 3ª categoria lightweight: High agility, intermediate strength
    baseStrength = Math.floor(55 + (weight % 10));
    baseResistance = Math.floor(58 + (weight % 12));
    baseAgility = Math.floor(78 + (weight % 15));
    baseSpirit = Math.floor(60 + (weight % 15));
  }

  // Breed modifiers:
  // Valdostana Castana gets aggressively high strength & spirit modifier
  if (breed === 'Castana Valdostana') {
    baseStrength = Math.min(99, baseStrength + 8);
    baseSpirit = Math.min(99, baseSpirit + 5);
  } else if (breed === 'Pezzata Nera Valdostana') {
    // Pea Noire: high stamina/resistance modifier
    baseResistance = Math.min(99, baseResistance + 10);
    baseAgility = Math.min(99, baseAgility + 4);
  } else {
    // Pie Rouge: calm, non-fighting modifier
    baseStrength = Math.max(20, baseStrength - 15);
    baseSpirit = Math.max(20, baseSpirit - 20);
    baseResistance = Math.min(95, baseResistance + 5);
  }

  const combatStats = {
    strength: baseStrength,
    resistance: baseResistance,
    agility: baseAgility,
    spirit: baseSpirit
  };

  // Attacco formula: media pesata Forza_Corna (strength) and Temperamento (spirit)
  const attack = Math.floor((combatStats.strength * 0.6) + (combatStats.spirit * 0.4));
  
  // Difesa formula: f(Peso, Stamina/resistance)
  const defense = Math.floor((weight / 15) + (combatStats.resistance * 0.5));

  // Dynamic details note
  let note = raw.specialAward ? `Vincitrice del premio speciale ${raw.specialAward}. ` : '';
  note += `Nativa di ${raw.comune}, di proprietà dell'allevatore ${raw.owner}.`;

  return {
    id: raw.id,
    name: raw.name,
    owner: raw.owner,
    comune: raw.comune,
    recognition: raw.recognition,
    specialAward: raw.specialAward || undefined,
    weight,
    breed,
    rarity,
    category,
    combatStats,
    attack,
    defense,
    note,
    imagePath: (raw as any).imageOverride || undefined
  };
});
