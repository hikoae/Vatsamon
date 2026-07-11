import React from 'react';
import { RarityType } from '../types';

interface VatsamonAvatarProps {
  breed: string;
  rarity: RarityType;
  className?: string;
  isAttacking?: boolean;
}

export const VatsamonAvatar: React.FC<VatsamonAvatarProps> = ({
  breed,
  rarity,
  className = "w-32 h-32",
  isAttacking = false
}) => {
  // Determine base colors and spot configurations based on breed name
  const breedLower = breed.toLowerCase();
  
  let hideColor = "#8D5B4C"; // Warm chestnut
  let isSpotted = false;
  let spotColor = "#FFFFFF";
  let snoutColor = "#FAD3CF";
  
  if (breedLower.includes("nera") || breedLower.includes("black")) {
    hideColor = "#27272A"; // Charcoal black
    isSpotted = true;
    spotColor = "#FCFCFC";
  } else if (breedLower.includes("rossa") || breedLower.includes("red") || breedLower.includes("evolène")) {
    hideColor = "#B91C1C"; // Crimson red hide
    isSpotted = true;
    spotColor = "#FFFFFF";
  } else if (breedLower.includes("oro") || breedLower.includes("gold") || rarity === 'Leggendaria') {
    hideColor = "#D97706"; // Premium Amber Gold
    isSpotted = true;
    spotColor = "#FEF3C7";
  } else if (breedLower.includes("castana") || breedLower.includes("reina")) {
    hideColor = "#5D4037"; // Dark brown
    isSpotted = false;
  }

  // Rarity styling effects (card border aura or background sparkle)
  let hornColor = "#E4E4E7"; // Off-white
  let eyeSparkle = true;

  if (rarity === 'Leggendaria') {
    hornColor = "#FBBF24";  // Radiant gold horns
  } else if (rarity === 'Epica') {
    hornColor = "#A855F7";  // Violet power horns
  } else if (rarity === 'Rara') {
    hornColor = "#3B82F6";  // Ice blue horns
  }

  // Generate a distinct hash-like layout based on breed to give variations in spots
  const hash = breed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const spotX1 = 20 + (hash % 15);
  const spotX2 = 65 - (hash % 12);

  return (
    <div className={`relative flex items-center justify-center select-none ${className} ${isAttacking ? 'animate-bounce' : ''}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full transition-transform duration-300"
        id="cow-avatar"
      >
        <defs>
          {/* Gradients */}
          <radialGradient id="auroraRarity" cx="50%" cy="50%" r="50%">
            {rarity === 'Leggendaria' && (
              <>
                <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </>
            )}
            {rarity === 'Epica' && (
              <>
                <stop offset="0%" stopColor="#E9D5FF" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
              </>
            )}
            {rarity === 'Rara' && (
              <>
                <stop offset="0%" stopColor="#BFDBFE" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </>
            )}
            {rarity === 'Comune' && (
              <>
                <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
              </>
            )}
          </radialGradient>
          
          <linearGradient id="bellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#854D0E" />
          </linearGradient>

          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000000" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Soft aura background reflecting rarity */}
        <circle cx="50%" cy="50%" r="48" fill="url(#auroraRarity)" />

        {/* Ears */}
        {/* Left Ear */}
        <path
          d="M 22 45 C 10 45, 12 55, 27 52"
          fill={hideColor}
          stroke="#3E2723"
          strokeWidth="1.5"
        />
        <path
          d="M 20 47 C 12 47, 14 53, 24 51"
          fill="#FCA5A5"
          opacity="0.7"
        />

        {/* Right Ear */}
        <path
          d="M 78 45 C 90 45, 88 55, 73 52"
          fill={hideColor}
          stroke="#3E2723"
          strokeWidth="1.5"
        />
        <path
          d="M 80 47 C 88 47, 86 53, 76 51"
          fill="#FCA5A5"
          opacity="0.7"
        />

        {/* Horns */}
        {/* Left Horn */}
        <path
          d="M 32 36 C 22 34, 18 22, 22 16 C 25 14, 28 24, 34 32 Z"
          fill={hornColor}
          stroke="#3F3F46"
          strokeWidth="1.5"
          filter="url(#shadow)"
        />
        {/* Right Horn */}
        <path
          d="M 68 36 C 78 34, 82 22, 78 16 C 75 14, 72 24, 66 32 Z"
          fill={hornColor}
          stroke="#3F3F46"
          strokeWidth="1.5"
          filter="url(#shadow)"
        />

        {/* Festive flower crown ornaments for high rarity cows */}
        {(rarity === 'Leggendaria' || rarity === 'Epica') && (
          <g transform="translate(50, 25)">
            {/* Direct flower design */}
            <circle cx="-13" cy="2" r="3" fill="#EF4444" />
            <circle cx="-13" cy="2" r="1" fill="#FBBF24" />
            
            <circle cx="13" cy="2" r="3" fill="#EC4899" />
            <circle cx="13" cy="2" r="1" fill="#FBBF24" />

            <circle cx="0" cy="0" r="4.5" fill="#3B82F6" />
            <circle cx="0" cy="0" r="1.5" fill="#FBBF24" />
            <circle cx="-5" cy="-2" r="3" fill="#10B981" opacity="0.8" />
            <circle cx="5" cy="-2" r="3" fill="#10B981" opacity="0.8" />
          </g>
        )}

        {/* Main Cow head block */}
        <rect
          x="26"
          y="30"
          width="48"
          height="45"
          rx="18"
          fill={hideColor}
          stroke="#3E2723"
          strokeWidth="2"
          filter="url(#shadow)"
        />

        {/* Decorative spots on the face if spotted breed */}
        {isSpotted && (
          <g>
            <path
              d={`M ${spotX1} 34 Q ${spotX1 + 10} 38, ${spotX1 + 5} 50 L ${spotX1 - 3} 42 Z`}
              fill={spotColor}
              opacity="0.9"
            />
            <path
              d={`M ${spotX2} 32 Q ${spotX2 - 8} 42, ${spotX2 - 4} 48 L ${spotX2 + 4} 44 Z`}
              fill={spotColor}
              opacity="0.9"
            />
          </g>
        )}

        {/* Steer Crest / Forehead tuft */}
        <path
          d="M 40 31 C 45 27, 55 27, 60 31 C 55 34, 45 34, 40 31 Z"
          fill={isSpotted ? spotColor : "#4E342E"}
          opacity="0.85"
        />

        {/* Eyes */}
        <g>
          {/* Left Eye */}
          <circle cx="40" cy="48" r="4.5" fill="#1e1b4b" />
          {eyeSparkle && <circle cx="38.5" cy="46.5" r="1.5" fill="#FFFFFF" />}
          {eyeSparkle && <circle cx="41.5" cy="49.5" r="0.6" fill="#FFFFFF" />}
          
          {/* Right Eye */}
          <circle cx="60" cy="48" r="4.5" fill="#1e1b4b" />
          {eyeSparkle && <circle cx="58.5" cy="46.5" r="1.5" fill="#FFFFFF" />}
          {eyeSparkle && <circle cx="61.5" cy="49.5" r="0.6" fill="#FFFFFF" />}

          {/* Cheeks */}
          <circle cx="36" cy="53" r="3" fill="#FCA5A5" opacity="0.4" />
          <circle cx="64" cy="53" r="3" fill="#FCA5A5" opacity="0.4" />

          {/* Focused battle eyebrows indicating action */}
          {rarity === 'Leggendaria' || rarity === 'Epica' ? (
            <g>
              <path d="M 35 42 L 44 45" stroke="#1E1B4B" strokeWidth="2" strokeLinecap="round" />
              <path d="M 65 42 L 56 45" stroke="#1E1B4B" strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <path d="M 36 43 Q 40 41, 44 43" fill="none" stroke="#5D4037" strokeWidth="1.2" />
              <path d="M 64 43 Q 60 41, 56 43" fill="none" stroke="#5D4037" strokeWidth="1.2" />
            </g>
          )}
        </g>

        {/* Massive Snout */}
        <rect
          x="30"
          y="56"
          width="40"
          height="22"
          rx="10"
          fill={snoutColor}
          stroke="#4E342E"
          strokeWidth="1.5"
        />

        {/* Nostrils */}
        <circle cx="42" cy="64" r="2.5" fill="#C084FC" opacity="0.5" />
        <circle cx="42" cy="64" r="1.5" fill="#4E342E" />
        
        <circle cx="58" cy="64" r="2.5" fill="#C084FC" opacity="0.5" />
        <circle cx="58" cy="64" r="1.5" fill="#4E342E" />

        {/* Wide happy cow smile */}
        <path
          d="M 44 70 Q 50 74, 56 70"
          fill="none"
          stroke="#4E342E"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Dynamic wooden collar and cowbell ("campanaccio") */}
        <g id="campanaccio">
          {/* Heavy wooden collar */}
          <rect
            x="34"
            y="76"
            width="32"
            height="5"
            rx="1.5"
            fill="#78350F"
            stroke="#451A03"
            strokeWidth="1"
          />
          {/* Traditional patterns on collar */}
          <line x1="39" y1="76" x2="39" y2="81" stroke="#FBBF24" strokeWidth="1" />
          <line x1="61" y1="76" x2="61" y2="81" stroke="#FBBF24" strokeWidth="1" />

          {/* Bell support loop */}
          <rect
            x="47"
            y="81"
            width="6"
            height="4"
            fill="#27272A"
          />

          {/* Massive Alpine Bell */}
          <path
            d="M 44 84 L 42 94 C 42 96, 58 96, 58 94 L 56 84 Z"
            fill="url(#bellGrad)"
            stroke="#451A03"
            strokeWidth="1.2"
          />
          {/* Bell clapper */}
          <circle cx="50" cy="96" r="1.8" fill="#18181B" />
        </g>
      </svg>
    </div>
  );
};
