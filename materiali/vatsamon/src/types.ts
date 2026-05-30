/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Cow {
  id: string;
  name: string; // Nickname given by the user, e.g. "Bella", "Brunetta", "Monella"
  breed: string; // Pezzata Rossa, Pezzata Nera, Castana, Bruna Alpina, Frisona, etc.
  rarity: "Comune" | "Rara" | "Leggendaria";
  level: number;
  xp: number;
  weight: number; // in kg (e.g. 500 - 750)
  milkProduction: number; // liters per day on pasture (e.g. 15-30)
  capturedAt: string; // Date string
  capturedLocation: string; // Trail name
  combatStats: {
    strength: number; // For pushing
    resistance: number; // For taking pressure
    agility: number; // For unexpected maneuvers
    spirit: number; // Determination / Regalità
  };
  customPhoto?: string; // Base64 of photographed cow
  description: string;
  funFact: string;
}

export interface ValdostanTrail {
  id: string;
  name: string;
  location: string; // Valley / Area
  difficulty: "Facile" | "Moderato" | "Difficile";
  lengthKm: number;
  durationHours: number;
  altitudeGain: number; // in meters
  description: string;
  responsibleTips: string[];
  cowsToEncounter: string[]; // Breeds likely to be found
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: "Facile" | "Medio" | "Esperto";
}

export interface OpponentPastore {
  id: string;
  name: string;
  title: string; // e.g. "Alpeggiatore di Cogne", "Pastora della Val Ferret"
  avatar: string;
  dialogueIntro: string;
  dialogueWin: string;
  dialogueLoss: string;
  cowName: string;
  cowBreed: string;
  cowLevel: number;
  cowStats: {
    strength: number;
    resistance: number;
    agility: number;
    spirit: number;
  };
  rewardXp: number;
}
