import React from 'react';
import { HouseName } from '../types/wizard';

export const BrassFiligreeCorner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    className={`w-10 h-10 pointer-events-none ${className}`}
  >
    <path
      d="M4 58V14C4 8.477 8.477 4 14 4H58"
      stroke="#9a7228"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M10 48V18C10 13.582 13.582 10 18 10H48"
      stroke="#c99a3b"
      strokeWidth="1.2"
      strokeOpacity="0.7"
    />
    <path
      d="M4 24C11 24 16 19 16 12C16 17 20 20 25 20C19 20 14 25 14 31C14 26 9 24 4 24Z"
      fill="#c99a3b"
      fillOpacity="0.55"
    />
    <circle cx="11" cy="11" r="2.6" fill="#8c1d24" />
  </svg>
);

export const CrimsonWaxSeal: React.FC<{
  label?: string;
  className?: string;
}> = ({ label = 'GQ', className = '' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    className={`w-11 h-11 drop-shadow-md ${className}`}
  >
    <defs>
      <radialGradient id="waxGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#c93b42" />
        <stop offset="55%" stopColor="#8c1d24" />
        <stop offset="100%" stopColor="#4f0c11" />
      </radialGradient>
    </defs>
    <path
      d="M32 4C37 4 40 7 44 6C49 5 53 9 54 14C55 18 59 21 59 26C59 31 57 35 58 39C59 44 55 49 51 51C47 53 45 58 40 58C35 58 32 61 27 59C22 57 17 58 14 54C11 50 6 48 6 43C6 38 4 34 5 29C6 24 4 19 8 15C12 11 14 7 19 7C24 7 27 4 32 4Z"
      fill="url(#waxGrad)"
    />
    <circle cx="32" cy="32" r="20" stroke="#590f14" strokeWidth="2" fill="none" />
    <circle cx="32" cy="32" r="17" stroke="#df7a7f" strokeOpacity="0.35" strokeWidth="1" fill="none" />
    <text
      x="32"
      y="37"
      textAnchor="middle"
      fill="#f5d5a7"
      fontSize="13"
      fontWeight="700"
      fontFamily="Cinzel, Georgia, serif"
    >
      {label}
    </text>
  </svg>
);

export const FeatherQuillGraphic: React.FC<{
  inkHex?: string;
  isWriting?: boolean;
  className?: string;
}> = ({ inkHex = '#2a180d', isWriting = false, className = '' }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <defs>
      <linearGradient id="featherPlume" x1="18" y1="102" x2="108" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#d8c39b" />
        <stop offset="45%" stopColor="#f5ebd6" />
        <stop offset="80%" stopColor="#c99a3b" />
        <stop offset="100%" stopColor="#7c4f21" />
      </linearGradient>
      <linearGradient id="nibGold" x1="6" y1="114" x2="26" y2="94" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f6d887" />
        <stop offset="60%" stopColor="#c99a3b" />
        <stop offset="100%" stopColor="#6e4b19" />
      </linearGradient>
    </defs>

    {/* Feather barbs */}
    <path
      d="M24 96C30 62 52 34 106 12C102 36 88 58 64 76C54 84 42 90 24 96Z"
      fill="url(#featherPlume)"
      stroke="#855b2a"
      strokeWidth="1.2"
    />
    {/* Feather notches for authentic plume texture */}
    <path
      d="M36 78L48 64M50 66L66 50M66 54L82 36M56 76L72 64M42 86L56 78"
      stroke="#8c6334"
      strokeOpacity="0.45"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    {/* Central rachis shaft */}
    <path
      d="M19 101C42 78 68 48 106 12"
      stroke="#f9f3e6"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    {/* Brass nib collar & tip */}
    <path
      d="M10 110L17 94L26 103L10 110Z"
      fill="url(#nibGold)"
      stroke="#4f3310"
      strokeWidth="1.1"
    />
    <line x1="10" y1="110" x2="19" y2="101" stroke="#362209" strokeWidth="1" />
    {/* Ink droplet at nib tip */}
    <circle
      cx="9"
      cy="111"
      r={isWriting ? 3.2 : 2}
      fill={inkHex}
    />
  </svg>
);

export const HouseCrestGraphic: React.FC<{
  house: HouseName;
  className?: string;
}> = ({ house, className = '' }) => {
  const palette: Record<
    HouseName,
    { bg1: string; bg2: string; accent: string; trim: string; symbol: string }
  > = {
    Gryffindor: {
      bg1: '#7f141b',
      bg2: '#47090d',
      accent: '#eab308',
      trim: '#f8d477',
      symbol: 'G',
    },
    Slytherin: {
      bg1: '#144d30',
      bg2: '#092818',
      accent: '#cbd5e1',
      trim: '#e2e8f0',
      symbol: 'S',
    },
    Ravenclaw: {
      bg1: '#17376b',
      bg2: '#0c1f40',
      accent: '#d49b54',
      trim: '#f0c487',
      symbol: 'R',
    },
    Hufflepuff: {
      bg1: '#b88616',
      bg2: '#6b4c08',
      accent: '#1f1916',
      trim: '#362d27',
      symbol: 'H',
    },
  };

  const c = palette[house];

  return (
    <svg viewBox="0 0 96 108" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`shield-${house}`} x1="16" y1="8" x2="80" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c.bg1} />
          <stop offset="100%" stopColor={c.bg2} />
        </linearGradient>
      </defs>
      {/* Outer heraldic shield */}
      <path
        d="M48 6L84 18V52C84 74 66 91 48 101C30 91 12 74 12 52V18L48 6Z"
        fill={`url(#shield-${house})`}
        stroke={c.trim}
        strokeWidth="3"
      />
      {/* Inner quartering lines & ornamental frame */}
      <path
        d="M48 13L77 23V51C77 69 62 84 48 93C34 84 19 69 19 51V23L48 13Z"
        stroke={c.accent}
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      <line x1="48" y1="14" x2="48" y2="92" stroke={c.accent} strokeOpacity="0.22" strokeWidth="1" />
      <line x1="20" y1="48" x2="76" y2="48" stroke={c.accent} strokeOpacity="0.22" strokeWidth="1" />

      {/* House-specific emblem silhouette */}
      {house === 'Gryffindor' && (
        <path
          d="M48 24L54 34L66 32L58 43L65 55L52 53L48 66L44 53L31 55L38 43L30 32L42 34L48 24Z"
          fill={c.accent}
          fillOpacity="0.25"
          stroke={c.trim}
          strokeWidth="1.5"
        />
      )}
      {house === 'Slytherin' && (
        <path
          d="M36 66C36 55 58 55 58 44C58 35 40 35 40 27C40 22 48 20 55 24"
          stroke={c.trim}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeOpacity="0.45"
        />
      )}
      {house === 'Ravenclaw' && (
        <path
          d="M26 42C34 34 42 34 48 40C54 34 62 34 70 42C63 45 55 47 48 56C41 47 33 45 26 42Z"
          fill={c.accent}
          fillOpacity="0.3"
          stroke={c.trim}
          strokeWidth="1.5"
        />
      )}
      {house === 'Hufflepuff' && (
        <circle
          cx="48"
          cy="48"
          r="18"
          fill={c.accent}
          fillOpacity="0.22"
          stroke={c.trim}
          strokeWidth="1.6"
        />
      )}

      <text
        x="48"
        y="60"
        textAnchor="middle"
        fill={c.trim}
        fontSize="28"
        fontWeight="700"
        fontFamily="Cinzel, Georgia, serif"
      >
        {c.symbol}
      </text>
    </svg>
  );
};
