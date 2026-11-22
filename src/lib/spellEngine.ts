export type SpellEffectStyle =
  | 'disarm'
  | 'stun'
  | 'fire'
  | 'patronus'
  | 'shield'
  | 'heal'
  | 'light'
  | 'blast'
  | 'bind'
  | 'tickle'
  | 'custom';

export interface SpellDefinition {
  id: string;
  incantation: string;
  aliases: string[];
  category: 'Attack' | 'Counter' | 'Defense' | 'Healing' | 'Utility';
  description: string;
  manaCost: number;
  cooldownTurns: number;
  damage: number;
  heal: number;
  shieldTurns: number;
  stunOpponent: boolean;
  disarmOpponent: boolean;
  purifyDebuff: boolean;
  empowerNext: boolean;
  manaRestore: number;
  colorHex: string;
  secondaryHex: string;
  effectStyle: SpellEffectStyle;
}

export const SPELL_BOOK: SpellDefinition[] = [
  {
    id: 'expelliarmus',
    incantation: 'Expelliarmus',
    aliases: ['expelliarmus', 'disarm'],
    category: 'Counter',
    description: 'Scarlet disarming bolt that deals 18 damage and weakens the foe’s next strike by 50%.',
    manaCost: 18,
    cooldownTurns: 2,
    damage: 18,
    heal: 0,
    shieldTurns: 0,
    stunOpponent: false,
    disarmOpponent: true,
    purifyDebuff: false,
    empowerNext: false,
    manaRestore: 0,
    colorHex: '#ef4444',
    secondaryHex: '#fbbf24',
    effectStyle: 'disarm',
  },
  {
    id: 'stupefy',
    incantation: 'Stupefy',
    aliases: ['stupefy', 'stunning spell'],
    category: 'Attack',
    description: 'Crisp crimson stunning jet for 22 balanced damage.',
    manaCost: 14,
    cooldownTurns: 0,
    damage: 22,
    heal: 0,
    shieldTurns: 0,
    stunOpponent: false,
    disarmOpponent: false,
    purifyDebuff: false,
    empowerNext: false,
    manaRestore: 0,
    colorHex: '#dc2626',
    secondaryHex: '#f97316',
    effectStyle: 'stun',
  },
  {
    id: 'incendio',
    incantation: 'Incendio',
    aliases: ['incendio', 'fire', 'confringo'],
    category: 'Attack',
    description: 'Conjures a swirling plume of flame for 27 damage.',
    manaCost: 22,
    cooldownTurns: 2,
    damage: 27,
    heal: 0,
    shieldTurns: 0,
    stunOpponent: false,
    disarmOpponent: false,
    purifyDebuff: false,
    empowerNext: false,
    manaRestore: 0,
    colorHex: '#f97316',
    secondaryHex: '#fde047',
    effectStyle: 'fire',
  },
  {
    id: 'expecto-patronum',
    incantation: 'Expecto Patronum',
    aliases: ['expecto patronum', 'patronus', 'expecto'],
    category: 'Counter',
    description: 'Radiant silver guardian that deals 26 damage and banishes Umbridge’s Blood Quill curse.',
    manaCost: 28,
    cooldownTurns: 3,
    damage: 26,
    heal: 8,
    shieldTurns: 0,
    stunOpponent: false,
    disarmOpponent: false,
    purifyDebuff: true,
    empowerNext: false,
    manaRestore: 0,
    colorHex: '#bae6fd',
    secondaryHex: '#f8fafc',
    effectStyle: 'patronus',
  },
  {
    id: 'protego',
    incantation: 'Protego',
    aliases: ['protego', 'shield', 'protego maxima'],
    category: 'Defense',
    description: 'Raises an arcane barrier blocking 80% of the next incoming attack and reflecting sparks.',
    manaCost: 15,
    cooldownTurns: 2,
    damage: 6,
    heal: 0,
    shieldTurns: 1,
    stunOpponent: false,
    disarmOpponent: false,
    purifyDebuff: false,
    empowerNext: false,
    manaRestore: 8,
    colorHex: '#eab308',
    secondaryHex: '#fef08a',
    effectStyle: 'shield',
  },
  {
    id: 'episkey',
    incantation: 'Episkey',
    aliases: ['episkey', 'vulnera sanentur', 'heal'],
    category: 'Healing',
    description: 'Mends wounds and restores 24 HP.',
    manaCost: 18,
    cooldownTurns: 2,
    damage: 0,
    heal: 24,
    shieldTurns: 0,
    stunOpponent: false,
    disarmOpponent: false,
    purifyDebuff: false,
    empowerNext: false,
    manaRestore: 0,
    colorHex: '#22c55e',
    secondaryHex: '#bbf7d0',
    effectStyle: 'heal',
  },
  {
    id: 'lumos',
    incantation: 'Lumos',
    aliases: ['lumos', 'lumos maxima', 'nox'],
    category: 'Utility',
    description: 'Illuminates the duel, restoring 26 Focus and empowering your next spell by +35%.',
    manaCost: 0,
    cooldownTurns: 2,
    damage: 5,
    heal: 0,
    shieldTurns: 0,
    stunOpponent: false,
    disarmOpponent: false,
    purifyDebuff: false,
    empowerNext: true,
    manaRestore: 26,
    colorHex: '#fef08a',
    secondaryHex: '#ffffff',
    effectStyle: 'light',
  },
  {
    id: 'bombarda',
    incantation: 'Bombarda',
    aliases: ['bombarda', 'bombarda maxima', 'reducto'],
    category: 'Attack',
    description: 'Concussive arcane blast dealing 34 heavy damage.',
    manaCost: 30,
    cooldownTurns: 3,
    damage: 34,
    heal: 0,
    shieldTurns: 0,
    stunOpponent: false,
    disarmOpponent: false,
    purifyDebuff: false,
    empowerNext: false,
    manaRestore: 0,
    colorHex: '#38bdf8',
    secondaryHex: '#f59e0b',
    effectStyle: 'blast',
  },
  {
    id: 'petrificus-totalus',
    incantation: 'Petrificus Totalus',
    aliases: ['petrificus totalus', 'petrificus', 'immobulus'],
    category: 'Counter',
    description: 'Full Body-Bind Curse dealing 14 damage and stunning the foe for 1 turn.',
    manaCost: 26,
    cooldownTurns: 3,
    damage: 14,
    heal: 0,
    shieldTurns: 0,
    stunOpponent: true,
    disarmOpponent: false,
    purifyDebuff: false,
    empowerNext: false,
    manaRestore: 0,
    colorHex: '#a78bfa',
    secondaryHex: '#e0e7ff',
    effectStyle: 'bind',
  },
  {
    id: 'rictusempra',
    incantation: 'Rictusempra',
    aliases: ['rictusempra', 'wingardium leviosa', 'flipendo', 'accio', 'alohomora'],
    category: 'Attack',
    description: 'Silver-violet charm that knocks the opponent off balance for 16 damage.',
    manaCost: 10,
    cooldownTurns: 0,
    damage: 16,
    heal: 0,
    shieldTurns: 0,
    stunOpponent: false,
    disarmOpponent: false,
    purifyDebuff: false,
    empowerNext: false,
    manaRestore: 4,
    colorHex: '#c084fc',
    secondaryHex: '#f472b6',
    effectStyle: 'tickle',
  },
];

export function matchSpellFromChat(rawInput: string): SpellDefinition | null {
  const normalized = rawInput.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  for (const spell of SPELL_BOOK) {
    if (normalized === spell.incantation.toLowerCase()) {
      return spell;
    }
    for (const alias of spell.aliases) {
      if (normalized.includes(alias)) {
        return spell;
      }
    }
  }
  return null;
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export function playSpellSound(style: SpellEffectStyle | 'unlock' | 'seal' | 'enemyHit' | 'victory', muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playTone = (
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
    delay = 0
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now + delay);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + delay + duration);

    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.linearRampToValueAtTime(gainPeak, now + delay + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + duration + 0.02);
  };

  const playNoiseBurst = (duration: number, filterFreq: number, gainPeak: number, delay = 0) => {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now + delay);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now + delay);
  };

  switch (style) {
    case 'disarm':
      playTone(680, 220, 0.35, 'sawtooth', 0.12);
      playTone(1040, 1480, 0.28, 'sine', 0.1, 0.05);
      playNoiseBurst(0.25, 1600, 0.12);
      break;
    case 'stun':
      playTone(420, 120, 0.32, 'square', 0.1);
      playNoiseBurst(0.22, 900, 0.16);
      break;
    case 'fire':
      playNoiseBurst(0.55, 520, 0.22);
      playTone(210, 95, 0.45, 'sawtooth', 0.11);
      break;
    case 'patronus':
      playTone(523.25, 1046.5, 0.65, 'sine', 0.14);
      playTone(659.25, 1318.5, 0.65, 'triangle', 0.1, 0.08);
      playTone(783.99, 1567.98, 0.7, 'sine', 0.09, 0.16);
      break;
    case 'shield':
      playTone(320, 480, 0.48, 'sine', 0.14);
      playTone(480, 720, 0.48, 'triangle', 0.08, 0.04);
      break;
    case 'heal':
      playTone(440, 660, 0.35, 'sine', 0.12);
      playTone(554.37, 880, 0.4, 'sine', 0.1, 0.12);
      break;
    case 'light':
      playTone(880, 1760, 0.45, 'sine', 0.11);
      playTone(1108, 2217, 0.4, 'triangle', 0.07, 0.06);
      break;
    case 'blast':
      playNoiseBurst(0.45, 320, 0.26);
      playTone(160, 48, 0.48, 'sawtooth', 0.18);
      break;
    case 'bind':
      playTone(740, 260, 0.4, 'triangle', 0.12);
      playTone(370, 185, 0.45, 'sine', 0.12, 0.1);
      break;
    case 'tickle':
      playTone(620, 930, 0.16, 'sine', 0.1);
      playTone(780, 1180, 0.18, 'sine', 0.1, 0.12);
      break;
    case 'unlock':
      playTone(523.25, 659.25, 0.2, 'sine', 0.12);
      playTone(659.25, 783.99, 0.25, 'sine', 0.12, 0.12);
      playTone(783.99, 1046.5, 0.35, 'triangle', 0.12, 0.24);
      break;
    case 'seal':
      playTone(440, 220, 0.32, 'triangle', 0.12);
      playNoiseBurst(0.2, 700, 0.09);
      break;
    case 'enemyHit':
      playTone(260, 110, 0.26, 'sawtooth', 0.12);
      playNoiseBurst(0.18, 600, 0.14);
      break;
    case 'victory':
      playTone(523.25, 523.25, 0.2, 'triangle', 0.12, 0);
      playTone(659.25, 659.25, 0.2, 'triangle', 0.12, 0.15);
      playTone(783.99, 783.99, 0.22, 'triangle', 0.12, 0.3);
      playTone(1046.5, 1046.5, 0.55, 'sine', 0.15, 0.45);
      break;
    default:
      playTone(540, 810, 0.3, 'sine', 0.11);
      playNoiseBurst(0.18, 1200, 0.1);
      break;
  }
}
