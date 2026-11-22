import React, { useEffect, useState } from 'react';
import { BookLock, ScrollText, Sparkles, Wand2 } from 'lucide-react';
import { motion } from 'motion/react';
import {
  AppSection,
  BLOOD_STATUSES,
  BloodStatus,
  FIELD_LIMITS,
  HOUSES,
  HouseName,
  WAND_CORES,
  WAND_WOODS,
  WIZARDING_SCHOOLS,
  WizardProfile,
} from '../types/wizard';
import {
  BrassFiligreeCorner,
  CrimsonWaxSeal,
  HouseCrestGraphic,
} from './WizardingArtwork';

interface CharacterSanctumProps {
  profile: WizardProfile | null;
  isSignedIn: boolean;
  isSaving: boolean;
  syncLabel: string;
  onSaveProfile: (draft: {
    name: string;
    age: number;
    house: HouseName;
    school: string;
    bloodStatus: BloodStatus;
    wandCore: string;
    wandWood: string;
  }) => Promise<void>;
  onNavigate: (section: AppSection) => void;
  onSignIn: () => void;
}

const HOUSE_STYLES: Record<HouseName, { primary: string; border: string; motto: string }> = {
  Gryffindor: {
    primary: 'text-[#9e1b24]',
    border: 'border-[#9e1b24]/45',
    motto: 'Courage, daring, and chivalry',
  },
  Slytherin: {
    primary: 'text-[#1b5e3a]',
    border: 'border-[#1b5e3a]/45',
    motto: 'Ambition, cunning, and resourcefulness',
  },
  Ravenclaw: {
    primary: 'text-[#1e3f73]',
    border: 'border-[#1e3f73]/45',
    motto: 'Wit, learning, and arcane curiosity',
  },
  Hufflepuff: {
    primary: 'text-[#8c6712]',
    border: 'border-[#8c6712]/45',
    motto: 'Loyalty, patience, and steadfastness',
  },
};

export const CharacterSanctum: React.FC<CharacterSanctumProps> = ({
  profile,
  isSignedIn,
  isSaving,
  syncLabel,
  onSaveProfile,
  onNavigate,
  onSignIn,
}) => {
  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '17');
  const [house, setHouse] = useState<HouseName>(profile?.house ?? 'Gryffindor');
  const [school, setSchool] = useState(profile?.school ?? WIZARDING_SCHOOLS[0]);
  const [bloodStatus, setBloodStatus] = useState<BloodStatus>(profile?.bloodStatus ?? 'Half-blood');
  const [wandCore, setWandCore] = useState(profile?.wandCore ?? WAND_CORES[0]);
  const [wandWood, setWandWood] = useState(profile?.wandWood ?? WAND_WOODS[0]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setAge(String(profile.age));
      setHouse(profile.house);
      setSchool(profile.school);
      setBloodStatus(profile.bloodStatus);
      setWandCore(profile.wandCore);
      setWandWood(profile.wandWood);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedName = name.trim().slice(0, FIELD_LIMITS.NAME_MAX);
    const trimmedSchool = school.trim().slice(0, FIELD_LIMITS.SCHOOL_MAX);
    const trimmedCore = wandCore.trim().slice(0, FIELD_LIMITS.WAND_CORE_MAX);
    const trimmedWood = wandWood.trim().slice(0, FIELD_LIMITS.WAND_WOOD_MAX);
    const parsedAge = Math.max(5, Math.min(150, Math.round(Number(age) || 17)));

    if (!trimmedName || !trimmedSchool || !trimmedCore || !trimmedWood) {
      setFeedback('Please complete your name, school, and wand details before inscribing.');
      return;
    }

    await onSaveProfile({
      name: trimmedName,
      age: parsedAge,
      house,
      school: trimmedSchool,
      bloodStatus,
      wandCore: trimmedCore,
      wandWood: trimmedWood,
    });
    setFeedback('Wizard dossier inscribed and backed up.');
  };

  const houseStyle = HOUSE_STYLES[house];

  return (
    <div className="space-y-10">
      {/* Hero Banner with Candlelight Glow */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-xl overflow-hidden border border-[#3b2b20] bg-[#1c1410]"
      >
        {!heroImgFailed ? (
          <img
            src="/src/assets/images/wizarding_desk_backdrop_1795313543187.jpg"
            alt="Candlelit wizarding study desk with leather grimoire, quill, and rolled scrolls"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="w-full h-72 sm:h-88 object-cover object-center"
          />
        ) : (
          <div className="w-full h-72 sm:h-88 bg-gradient-to-br from-[#23170f] via-[#1c1410] to-[#0f0a07] flex items-center justify-center">
            <Wand2 className="w-14 h-14 text-[#c99a3b]/40" />
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#120d0a] via-[#120d0a]/65 to-transparent"
        />
        {/* Warm candlelight radial shimmer */}
        <div
          aria-hidden="true"
          className="animate-candle-glow absolute -top-12 right-12 w-72 h-72 rounded-full bg-[#e6bd62]/15 blur-3xl pointer-events-none"
        />

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs tracking-wider text-[#e6bd62] mb-2">
              Wizarding Manuscript · {syncLabel}
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-[#f6eedc] leading-tight">
              {profile?.name ? `${profile.name}’s Enchanted Sanctum` : 'Forge Your Wizarding Identity'}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#ddd0b8] leading-relaxed">
              Inscribe private memories behind a custom spell-locked diary, consult the Arcane Scrolls for diary secrets or world knowledge, and test your wand in real-time duels.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('diary')}
              className="px-5 py-2.5 rounded-lg bg-[#c99a3b] text-[#1a110b] text-sm font-semibold hover:bg-[#e6bd62] transition-transform active:scale-95 whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <BookLock className="w-4 h-4" />
              Open Secret Diary
            </button>
            <button
              type="button"
              onClick={() => onNavigate('duel')}
              className="px-5 py-2.5 rounded-lg border border-[#c99a3b]/60 bg-[#1c1410]/85 text-[#f6eedc] text-sm font-medium hover:border-[#e6bd62] transition-transform active:scale-95 whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#e6bd62]" />
              Enter Duel Chamber
            </button>
          </div>
        </div>
      </motion.section>

      {/* Sign-in Prompt Banner if not yet signed into Google Cloud Archive */}
      {!isSignedIn && (
        <div className="rounded-xl border border-[#c99a3b]/45 bg-[#1c1410] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#e6bd62]">
              Connect Cloud Archive
            </h2>
            <p className="text-sm text-[#d3c4aa] mt-1">
              Sign in with Google to store your wizarding profile, spell-locked diary entries, and scroll history securely in Firestore across every session.
            </p>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="px-5 py-2.5 rounded-lg bg-[#c99a3b] text-[#1a110b] text-sm font-semibold hover:bg-[#e6bd62] transition-colors whitespace-nowrap shrink-0"
          >
            Sign In with Google
          </button>
        </div>
      )}

      {/* Main 2-column Character Builder + Live Parchment Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Character Creator Form on Illuminated Parchment */}
        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={handleSubmit}
          className="lg:col-span-7 parchment-sheet rounded-xl p-6 sm:p-8 border border-[#cbb792] flex flex-col justify-between"
        >
          <BrassFiligreeCorner className="absolute top-2 left-2" />
          <BrassFiligreeCorner className="absolute top-2 right-2 rotate-90" />

          <div>
            <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#cbb792] pl-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#23170f]">
                  Wizarding Registry
                </h2>
                <p className="text-sm text-[#5e4736] mt-1">
                  Define your house, school, blood heritage, age, and wand core.
                </p>
              </div>
              <span className="text-xs text-[#5e4736] whitespace-nowrap pr-4">
                Ministry Form IV
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="wizard-name" className="block text-xs font-semibold text-[#473324] mb-1.5">
                  Wizard or Witch Name
                </label>
                <input
                  id="wizard-name"
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.NAME_MAX}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Seraphina Vance"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
                />
              </div>

              <div>
                <label htmlFor="wizard-age" className="block text-xs font-semibold text-[#473324] mb-1.5">
                  Age (Years)
                </label>
                <input
                  id="wizard-age"
                  type="number"
                  required
                  min={5}
                  max={150}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm font-mono tabular-nums focus:outline-none focus:border-[#8c1d24]"
                />
              </div>

              <div className="sm:col-span-2">
                <span className="block text-xs font-semibold text-[#473324] mb-2">
                  Hogwarts House
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {HOUSES.map((h) => {
                    const selected = house === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHouse(h)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                          selected
                            ? 'bg-[#23170f] text-[#f6eedc] border-[#23170f] shadow-md'
                            : 'bg-[#fbf6ea] text-[#3d2b1f] border-[#bfa882] hover:border-[#6e523a]'
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="wizard-school" className="block text-xs font-semibold text-[#473324] mb-1.5">
                  Wizarding School
                </label>
                <select
                  id="wizard-school"
                  value={WIZARDING_SCHOOLS.includes(school) ? school : '__custom'}
                  onChange={(e) => {
                    if (e.target.value !== '__custom') {
                      setSchool(e.target.value);
                    } else {
                      setSchool('');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
                >
                  {WIZARDING_SCHOOLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__custom">Custom Academy...</option>
                </select>
                {!WIZARDING_SCHOOLS.includes(school) && (
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.SCHOOL_MAX}
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Enter custom school name"
                    className="mt-2 w-full px-3.5 py-2 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
                  />
                )}
              </div>

              <div>
                <label htmlFor="wizard-blood" className="block text-xs font-semibold text-[#473324] mb-1.5">
                  Blood Heritage
                </label>
                <select
                  id="wizard-blood"
                  value={bloodStatus}
                  onChange={(e) => setBloodStatus(e.target.value as BloodStatus)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
                >
                  {BLOOD_STATUSES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="wizard-core" className="block text-xs font-semibold text-[#473324] mb-1.5">
                  Wand Core
                </label>
                <select
                  id="wizard-core"
                  value={WAND_CORES.includes(wandCore) ? wandCore : '__custom_core'}
                  onChange={(e) => {
                    if (e.target.value !== '__custom_core') {
                      setWandCore(e.target.value);
                    } else {
                      setWandCore('');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
                >
                  {WAND_CORES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__custom_core">Custom Core...</option>
                </select>
                {!WAND_CORES.includes(wandCore) && (
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.WAND_CORE_MAX}
                    value={wandCore}
                    onChange={(e) => setWandCore(e.target.value)}
                    placeholder="Enter custom wand core"
                    className="mt-2 w-full px-3.5 py-2 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
                  />
                )}
              </div>

              <div>
                <label htmlFor="wizard-wood" className="block text-xs font-semibold text-[#473324] mb-1.5">
                  Wand Wood
                </label>
                <select
                  id="wizard-wood"
                  value={wandWood}
                  onChange={(e) => setWandWood(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
                >
                  {WAND_WOODS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-7 pt-5 border-t border-[#cbb792] flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-[#5e4736]">
              {feedback ? <span className="font-semibold text-[#1b5e3a]">{feedback}</span> : 'Changes sync automatically once inscribed.'}
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-sm font-semibold hover:bg-[#70141a] disabled:opacity-60 transition-transform active:scale-95 whitespace-nowrap shrink-0"
            >
              {isSaving ? 'Inscribing...' : 'Save Character'}
            </button>
          </div>
        </motion.form>

        {/* Right: Live Character Dossier with Heraldic Crest & Wax Seal */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 flex flex-col gap-6"
        >
          <div className={`parchment-sheet rounded-xl p-6 sm:p-7 border ${houseStyle.border} flex-1 flex flex-col justify-between`}>
            <div>
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#cbb792]">
                <div>
                  <p className="text-xs text-[#5e4736]">Official Character Dossier</p>
                  <h3 className={`font-display text-2xl font-bold mt-1 ${houseStyle.primary}`}>
                    {name.trim() || 'Unnamed Apprentice'}
                  </h3>
                  <p className="mt-1 text-xs italic text-[#5e4736]">{houseStyle.motto}</p>
                </div>
                <motion.div
                  key={house}
                  initial={{ scale: 0.88, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="shrink-0"
                >
                  <HouseCrestGraphic house={house} className="w-16 h-18" />
                </motion.div>
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4 py-1.5 border-b border-[#cbb792]/50">
                  <dt className="text-[#5e4736]">House</dt>
                  <dd className="font-semibold text-[#23170f]">{house}</dd>
                </div>
                <div className="flex justify-between gap-4 py-1.5 border-b border-[#cbb792]/50">
                  <dt className="text-[#5e4736]">School</dt>
                  <dd className="font-semibold text-[#23170f] text-right">{school || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 py-1.5 border-b border-[#cbb792]/50">
                  <dt className="text-[#5e4736]">Blood Heritage</dt>
                  <dd className="font-semibold text-[#23170f]">{bloodStatus}</dd>
                </div>
                <div className="flex justify-between gap-4 py-1.5 border-b border-[#cbb792]/50">
                  <dt className="text-[#5e4736]">Age</dt>
                  <dd className="font-mono tabular-nums font-semibold text-[#23170f]">{age || '17'} yrs</dd>
                </div>
                <div className="flex justify-between gap-4 py-1.5 border-b border-[#cbb792]/50">
                  <dt className="text-[#5e4736]">Wand</dt>
                  <dd className="font-semibold text-[#23170f] text-right">
                    {wandWood} · {wandCore || '—'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 pt-4 border-t border-[#cbb792] flex items-center justify-between gap-3">
              <div className="grid grid-cols-3 gap-4 flex-1 text-center">
                <div>
                  <p className="font-mono tabular-nums text-xl font-bold text-[#23170f]">
                    {profile?.duelWins ?? 0}
                  </p>
                  <p className="text-xs text-[#5e4736]">Duels Won</p>
                </div>
                <div>
                  <p className="font-mono tabular-nums text-xl font-bold text-[#8c1d24]">
                    {profile?.umbridgeDefeatedCount ?? 0}
                  </p>
                  <p className="text-xs text-[#5e4736]">Umbridge Defeats</p>
                </div>
                <div>
                  <p className="font-mono tabular-nums text-xl font-bold text-[#23170f]">
                    {profile?.duelLosses ?? 0}
                  </p>
                  <p className="text-xs text-[#5e4736]">Retreats</p>
                </div>
              </div>
              <CrimsonWaxSeal label={house.slice(0, 1)} className="shrink-0" />
            </div>
          </div>

          {/* Feature Portal Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onNavigate('scrolls')}
              className="text-left rounded-xl bg-[#1c1410] border border-[#3b2b20] hover:border-[#c99a3b] p-5 transition-all hover:-translate-y-0.5"
            >
              <ScrollText className="w-5 h-5 text-[#e6bd62] mb-2" />
              <h4 className="font-display text-base font-semibold text-[#f6eedc]">
                Arcane Scrolls
              </h4>
              <p className="text-xs text-[#c9b99c] mt-1 leading-relaxed">
                Ask questions across your secret diary or search world knowledge.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('duel')}
              className="text-left rounded-xl bg-[#1c1410] border border-[#3b2b20] hover:border-[#c99a3b] p-5 transition-all hover:-translate-y-0.5"
            >
              <Wand2 className="w-5 h-5 text-[#e6bd62] mb-2" />
              <h4 className="font-display text-base font-semibold text-[#f6eedc]">
                Umbridge Duel
              </h4>
              <p className="text-xs text-[#c9b99c] mt-1 leading-relaxed">
                Cast spells in live chat with animations and sound effects.
              </p>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
