export type HouseName = 'Gryffindor' | 'Slytherin' | 'Ravenclaw' | 'Hufflepuff';

export type BloodStatus =
  | 'Pure-blood'
  | 'Half-blood'
  | 'Muggle-born'
  | 'Squib'
  | 'Magical Heritage';

export type AppSection = 'sanctum' | 'diary' | 'scrolls' | 'duel';

export type ChampionId = 'custom' | 'harry' | 'ron' | 'hermione' | 'dumbledore';

export type OpponentId = 'umbridge' | 'voldemort' | 'bellatrix' | 'draco' | 'dummy';

export interface WizardProfile {
  uid: string;
  name: string;
  age: number;
  house: HouseName;
  school: string;
  bloodStatus: BloodStatus;
  wandCore: string;
  wandWood: string;
  spellLockHash: string;
  spellLockSalt: string;
  spellLockHint: string;
  duelWins: number;
  duelLosses: number;
  umbridgeDefeatedCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DiaryEntryDoc {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  isEncrypted: boolean;
  iv: string;
  fontFamily: string;
  inputMode: 'typed' | 'handwritten' | 'mixed';
  moodTag: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdAtLabel: string;
}

export interface DecryptedDiaryEntry extends DiaryEntryDoc {
  decryptedContent: string;
  decryptionError?: boolean;
}

export interface ScrollQueryRecord {
  id: string;
  ownerId: string;
  question: string;
  answer: string;
  sourceType: 'diary' | 'web' | 'hybrid';
  sources?: Array<{ title: string; uri: string }>;
  createdAtLabel: string;
}

export interface DiaryFontOption {
  id: string;
  label: string;
  cssFamily: string;
  sample: string;
}

export const HOUSES: HouseName[] = ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'];

export const BLOOD_STATUSES: BloodStatus[] = [
  'Pure-blood',
  'Half-blood',
  'Muggle-born',
  'Squib',
  'Magical Heritage',
];

export const WIZARDING_SCHOOLS: string[] = [
  'Hogwarts School of Witchcraft and Wizardry',
  'Beauxbatons Academy of Magic',
  'Durmstrang Institute',
  'Ilvermorny School of Witchcraft and Wizardry',
  'Uagadou School of Magic',
  'Mahoutokoro School of Magic',
  'Castelobruxo',
];

export const WAND_CORES: string[] = [
  'Phoenix feather',
  'Dragon heartstring',
  'Unicorn tail hair',
  'Thestral tail hair',
  'Veela hair',
  'Horned Serpent horn',
  'Thunderbird tail feather',
];

export const WAND_WOODS: string[] = [
  'Holly',
  'Vine',
  'Yew',
  'Elder',
  'Hawthorn',
  'Oak',
  'Willow',
  'Ash',
  'Blackthorn',
  'Walnut',
];

export const DIARY_FONTS: DiaryFontOption[] = [
  { id: 'Lora', label: 'Manuscript Serif (Lora)', cssFamily: "'Lora', Georgia, serif", sample: 'Secrets etched in ink' },
  { id: 'Caveat', label: 'Quill Handwriting (Caveat)', cssFamily: "'Caveat', cursive", sample: 'Secrets etched in ink' },
  { id: 'Dancing Script', label: 'Calligraphy Script', cssFamily: "'Dancing Script', cursive", sample: 'Secrets etched in ink' },
  { id: 'Cormorant Garamond', label: 'Old Library (Cormorant)', cssFamily: "'Cormorant Garamond', Georgia, serif", sample: 'Secrets etched in ink' },
  { id: 'Cinzel', label: 'Engraved Stone (Cinzel)', cssFamily: "'Cinzel', Georgia, serif", sample: 'Secrets etched in ink' },
  { id: 'Playfair Display', label: 'Editorial Ink (Playfair)', cssFamily: "'Playfair Display', Georgia, serif", sample: 'Secrets etched in ink' },
  { id: 'UnifrakturMaguntia', label: 'Ancient Blackletter', cssFamily: "'UnifrakturMaguntia', Georgia, serif", sample: 'Secrets etched in ink' },
  { id: 'JetBrains Mono', label: 'Cipher Mono', cssFamily: "'JetBrains Mono', monospace", sample: 'Secrets etched in ink' },
];

export const MOOD_TAGS = ['Secret', 'Potion Note', 'Memory', 'Spell Study', 'Observation', 'Prophecy'];

export const FIELD_LIMITS = {
  NAME_MAX: 80,
  SCHOOL_MAX: 80,
  WAND_CORE_MAX: 80,
  WAND_WOOD_MAX: 60,
  HINT_MAX: 120,
  TITLE_MAX: 140,
  CONTENT_MAX: 20000,
  QUESTION_MAX: 500,
  MOOD_MAX: 40,
} as const;
