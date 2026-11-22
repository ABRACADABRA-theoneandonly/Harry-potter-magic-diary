import React, { useState } from 'react';
import { KeyRound, Lock, PenLine, Trash2, Unlock, Type as TypeIcon, Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  DIARY_FONTS,
  DecryptedDiaryEntry,
  FIELD_LIMITS,
  MOOD_TAGS,
  WizardProfile,
} from '../types/wizard';
import { HandwritingCanvas } from './HandwritingCanvas';
import { playSpellSound } from '../lib/spellEngine';
import {
  BrassFiligreeCorner,
  CrimsonWaxSeal,
  FeatherQuillGraphic,
} from './WizardingArtwork';

interface SecretDiaryProps {
  profile: WizardProfile | null;
  entries: DecryptedDiaryEntry[];
  isSignedIn: boolean;
  isLocked: boolean;
  hasPasswordSet: boolean;
  isMuted: boolean;
  syncLabel: string;
  onToggleMute: () => void;
  onSetSpellPassword: (password: string, hint: string) => Promise<void>;
  onUnlockDiary: (password: string) => Promise<boolean>;
  onLockDiary: () => void;
  onSaveEntry: (payload: {
    title: string;
    content: string;
    fontFamily: string;
    inputMode: 'typed' | 'handwritten' | 'mixed';
    moodTag: string;
  }) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onSignIn: () => void;
}

export const SecretDiary: React.FC<SecretDiaryProps> = ({
  profile,
  entries,
  isSignedIn,
  isLocked,
  hasPasswordSet,
  isMuted,
  syncLabel,
  onToggleMute,
  onSetSpellPassword,
  onUnlockDiary,
  onLockDiary,
  onSaveEntry,
  onDeleteEntry,
  onSignIn,
}) => {
  // Password setup / unlock states
  const [newPassword, setNewPassword] = useState('');
  const [newHint, setNewHint] = useState('');
  const [unlockAttempt, setUnlockAttempt] = useState('');
  const [lockError, setLockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [coverImgFailed, setCoverImgFailed] = useState(false);

  // Composer states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFont, setSelectedFont] = useState(DIARY_FONTS[0].cssFamily);
  const [customFontInput, setCustomFontInput] = useState('');
  const [moodTag, setMoodTag] = useState(MOOD_TAGS[0]);
  const [writeMode, setWriteMode] = useState<'type' | 'mouse'>('type');
  const [usedHandwriting, setUsedHandwriting] = useState(false);
  const [usedTyping, setUsedTyping] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [entryNotice, setEntryNotice] = useState<string | null>(null);

  const activeFont = customFontInput.trim() ? customFontInput.trim() : selectedFont;

  const handleBindSpellPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockError(null);
    if (newPassword.trim().length < 3) {
      setLockError('Choose a magical spell password of at least 3 characters.');
      return;
    }
    setIsUnlocking(true);
    try {
      await onSetSpellPassword(newPassword.trim(), newHint.trim().slice(0, FIELD_LIMITS.HINT_MAX));
      playSpellSound('seal', isMuted);
      setNewPassword('');
      setNewHint('');
      setShowChangePassword(false);
    } catch (err) {
      setLockError(err instanceof Error ? err.message : 'Unable to bind spell lock.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleCastUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockError(null);
    if (!unlockAttempt.trim()) {
      setLockError('Speak or type your custom lock spell to unseal the diary.');
      return;
    }
    setIsUnlocking(true);
    try {
      const ok = await onUnlockDiary(unlockAttempt.trim());
      if (ok) {
        playSpellSound('unlock', isMuted);
        setUnlockAttempt('');
      } else {
        playSpellSound('enemyHit', isMuted);
        setLockError('The brass keyhole sparks in refusal — incorrect lock spell.');
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleTranscribedText = (detected: string) => {
    setUsedHandwriting(true);
    setContent((prev) => (prev.trim() ? `${prev.trimEnd()}\n${detected}` : detected));
    playSpellSound('light', isMuted);
  };

  const handleSaveDiaryEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntryNotice(null);
    const trimmedTitle = title.trim().slice(0, FIELD_LIMITS.TITLE_MAX);
    const trimmedContent = content.trim().slice(0, FIELD_LIMITS.CONTENT_MAX);

    if (!trimmedTitle || !trimmedContent) {
      setEntryNotice('Provide both an entry heading and secret text before saving.');
      return;
    }

    const inputMode: 'typed' | 'handwritten' | 'mixed' =
      usedHandwriting && usedTyping
        ? 'mixed'
        : usedHandwriting
          ? 'handwritten'
          : 'typed';

    setIsSavingEntry(true);
    try {
      await onSaveEntry({
        title: trimmedTitle,
        content: trimmedContent,
        fontFamily: activeFont.slice(0, 60),
        inputMode,
        moodTag,
      });
      playSpellSound('heal', isMuted);
      setTitle('');
      setContent('');
      setUsedHandwriting(false);
      setUsedTyping(false);
      setEntryNotice('Secret sealed and synced to cloud archive.');
    } catch (err) {
      setEntryNotice(err instanceof Error ? err.message : 'Could not save entry.');
    } finally {
      setIsSavingEntry(false);
    }
  };

  // Locked or First-time Spell Lock Setup Screen
  if (!hasPasswordSet || isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
      >
        <div className="lg:col-span-5 relative rounded-xl overflow-hidden border border-[#3b2b20] bg-[#1c1410] flex flex-col">
          {!coverImgFailed ? (
            <img
              src="/src/assets/images/enchanted_diary_cover_1795313545622.jpg"
              alt="Leather-bound enchanted wizarding diary with glowing brass keyhole"
              referrerPolicy="no-referrer"
              onError={() => setCoverImgFailed(true)}
              className="w-full h-full min-h-[380px] object-cover"
            />
          ) : (
            <div className="w-full h-full min-h-[380px] bg-gradient-to-b from-[#2b1514] to-[#120d0a] flex flex-col items-center justify-center p-8 text-center">
              <Lock className="w-12 h-12 text-[#e6bd62] mb-3" />
              <p className="font-display text-xl text-[#f6eedc]">Enchanted Grimoire</p>
            </div>
          )}

          {/* Animated Arcane Ward Overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <svg
              viewBox="0 0 240 240"
              className="w-56 h-56 animate-rune-spin opacity-45"
              fill="none"
            >
              <circle
                cx="120"
                cy="120"
                r="102"
                stroke="#e6bd62"
                strokeWidth="1.2"
                strokeDasharray="6 6"
              />
              <circle
                cx="120"
                cy="120"
                r="82"
                stroke="#c99a3b"
                strokeWidth="0.9"
                strokeDasharray="2 8"
              />
              <polygon
                points="120,24 203,168 37,168"
                stroke="#e6bd62"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
            </svg>
          </div>
        </div>

        <div className="lg:col-span-7 parchment-sheet rounded-xl p-7 sm:p-10 border border-[#cbb792] flex flex-col justify-center">
          <BrassFiligreeCorner className="absolute top-2 left-2" />
          <BrassFiligreeCorner className="absolute top-2 right-2 rotate-90" />
          <BrassFiligreeCorner className="absolute bottom-2 left-2 -rotate-90" />
          <BrassFiligreeCorner className="absolute bottom-2 right-2 rotate-180" />

          {!isSignedIn ? (
            <div className="space-y-4">
              <p className="text-xs text-[#5e4736]">Protective Ward Active</p>
              <h2 className="font-display text-3xl font-bold text-[#23170f]">
                Sign In to Bind Your Secret Diary
              </h2>
              <p className="text-sm text-[#473324] leading-relaxed">
                Your diary entries are encrypted with your custom spell password and backed up securely in Firestore. Connect your Google account first to create your private vault.
              </p>
              <button
                type="button"
                onClick={onSignIn}
                className="px-6 py-3 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-sm font-semibold hover:bg-[#70141a] transition-colors"
              >
                Sign In with Google
              </button>
            </div>
          ) : !hasPasswordSet ? (
            <form onSubmit={handleBindSpellPassword} className="space-y-5">
              <div>
                <p className="text-xs text-[#8c1d24] font-semibold">First-Time Enchantment</p>
                <h2 className="font-display text-3xl font-bold text-[#23170f] mt-1">
                  Bind a Custom Spell Lock Password
                </h2>
                <p className="text-sm text-[#473324] mt-2 leading-relaxed">
                  Choose any custom password or secret incantation. All diary secrets are encrypted in your browser before syncing to Firestore—no one without your spell can read them.
                </p>
              </div>

              <div>
                <label htmlFor="bind-spell-pw" className="block text-xs font-semibold text-[#473324] mb-1.5">
                  Custom Lock Spell Password
                </label>
                <input
                  id="bind-spell-pw"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g. MischiefManaged99"
                  className="w-full px-4 py-3 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
                />
              </div>

              <div>
                <label htmlFor="bind-spell-hint" className="block text-xs font-semibold text-[#473324] mb-1.5">
                  Optional Memory Hint
                </label>
                <input
                  id="bind-spell-hint"
                  type="text"
                  maxLength={FIELD_LIMITS.HINT_MAX}
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                  placeholder="e.g. My favorite Marauder phrase"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
                />
              </div>

              {lockError && <p className="text-xs font-semibold text-[#8c1d24]">{lockError}</p>}

              <button
                type="submit"
                disabled={isUnlocking}
                className="px-6 py-3 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-sm font-semibold hover:bg-[#70141a] disabled:opacity-60 transition-transform active:scale-95 flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {isUnlocking ? 'Binding Charm...' : 'Set Lock Spell & Open Diary'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCastUnlock} className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[#8c1d24] font-semibold">
                    Sealed Vault · {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'} Protected
                  </p>
                  <h2 className="font-display text-3xl font-bold text-[#23170f] mt-1">
                    The Diary Is Sealed by Magic
                  </h2>
                </div>
                <CrimsonWaxSeal label="L" className="shrink-0" />
              </div>

              <p className="text-sm text-[#473324] leading-relaxed">
                Enter your custom lock spell password to unseal the brass clasp and decrypt your pages.
              </p>
              {profile?.spellLockHint && (
                <p className="text-xs italic text-[#5e4736]">
                  Hint: {profile.spellLockHint}
                </p>
              )}

              <div>
                <label htmlFor="unlock-spell-pw" className="block text-xs font-semibold text-[#473324] mb-1.5">
                  Custom Unlock Password
                </label>
                <input
                  id="unlock-spell-pw"
                  type="password"
                  required
                  value={unlockAttempt}
                  onChange={(e) => setUnlockAttempt(e.target.value)}
                  placeholder="Enter your custom lock spell..."
                  className="w-full px-4 py-3 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
                />
              </div>

              {lockError && (
                <motion.p
                  initial={{ x: -6 }}
                  animate={{ x: [0, -6, 6, -4, 4, 0] }}
                  transition={{ duration: 0.3 }}
                  className="text-xs font-semibold text-[#8c1d24]"
                >
                  {lockError}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isUnlocking}
                className="px-6 py-3 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-sm font-semibold hover:bg-[#70141a] disabled:opacity-60 transition-transform active:scale-95 flex items-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                {isUnlocking ? 'Unsealing...' : 'Unlock Diary'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      {/* Diary Workspace Toolbar */}
      <div className="rounded-xl bg-[#1c1410] border border-[#3b2b20] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <FeatherQuillGraphic className="w-10 h-10 shrink-0 hidden sm:block" />
          <div>
            <h2 className="font-display text-xl font-bold text-[#f6eedc]">
              {profile?.name ? `${profile.name}’s Secret Diary` : 'Enchanted Secret Diary'}
            </h2>
            <p className="text-xs text-[#c9b99c] mt-0.5">
              Unsealed · {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'} · {syncLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleMute}
            className="px-3.5 py-2 rounded-lg border border-[#4a3628] text-xs font-medium text-[#e6d8be] hover:border-[#c99a3b] transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            {isMuted ? 'Unmute FX' : 'Sound On'}
          </button>

          <button
            type="button"
            onClick={() => setShowChangePassword((v) => !v)}
            className="px-3.5 py-2 rounded-lg border border-[#4a3628] text-xs font-medium text-[#e6d8be] hover:border-[#c99a3b] transition-colors whitespace-nowrap"
          >
            Change Lock Spell
          </button>

          <button
            type="button"
            onClick={() => {
              playSpellSound('seal', isMuted);
              onLockDiary();
            }}
            className="px-4 py-2 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-xs font-semibold hover:bg-[#70141a] transition-transform active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5" />
            Seal Diary
          </button>
        </div>
      </div>

      {/* Optional Change Spell Password Drawer */}
      <AnimatePresence>
        {showChangePassword && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleBindSpellPassword}
            className="parchment-sheet rounded-xl p-6 border border-[#cbb792] grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
          >
            <div>
              <label htmlFor="update-spell-pw" className="block text-xs font-semibold text-[#473324] mb-1">
                New Lock Spell Password
              </label>
              <input
                id="update-spell-pw"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New secret spell..."
                className="w-full px-3.5 py-2 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-sm text-[#23170f]"
              />
            </div>
            <div>
              <label htmlFor="update-spell-hint" className="block text-xs font-semibold text-[#473324] mb-1">
                New Memory Hint
              </label>
              <input
                id="update-spell-hint"
                type="text"
                maxLength={FIELD_LIMITS.HINT_MAX}
                value={newHint}
                onChange={(e) => setNewHint(e.target.value)}
                placeholder="Optional hint..."
                className="w-full px-3.5 py-2 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-sm text-[#23170f]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isUnlocking}
                className="px-4 py-2 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-xs font-semibold hover:bg-[#70141a] whitespace-nowrap"
              >
                Re-encrypt &amp; Save
              </button>
              <button
                type="button"
                onClick={() => setShowChangePassword(false)}
                className="px-3 py-2 rounded-lg border border-[#bfa882] text-xs text-[#3d2b1f]"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Main Two-Column Manuscript Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Entry Composer with Font Picker + Mouse Handwriting Pad */}
        <form
          onSubmit={handleSaveDiaryEntry}
          className="lg:col-span-7 parchment-sheet rounded-xl p-6 sm:p-8 border border-[#cbb792] space-y-5"
        >
          <BrassFiligreeCorner className="absolute top-2 left-2" />
          <BrassFiligreeCorner className="absolute top-2 right-2 rotate-90" />

          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#cbb792] pl-4 pr-4">
            <h3 className="font-display text-xl font-bold text-[#23170f]">
              Inscribe New Secret
            </h3>
            <div className="flex items-center gap-1 p-1 bg-[#e7d8ba] rounded-lg">
              <button
                type="button"
                onClick={() => setWriteMode('type')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  writeMode === 'type'
                    ? 'bg-[#23170f] text-[#f6eedc]'
                    : 'text-[#473324] hover:text-[#23170f]'
                }`}
              >
                <TypeIcon className="w-3.5 h-3.5" />
                Type with Font
              </button>
              <button
                type="button"
                onClick={() => setWriteMode('mouse')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  writeMode === 'mouse'
                    ? 'bg-[#23170f] text-[#f6eedc]'
                    : 'text-[#473324] hover:text-[#23170f]'
                }`}
              >
                <PenLine className="w-3.5 h-3.5" />
                Write with Quill
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="entry-title" className="block text-xs font-semibold text-[#473324] mb-1">
                Entry Heading
              </label>
              <input
                id="entry-title"
                type="text"
                required
                maxLength={FIELD_LIMITS.TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midnight Discovery in the Library"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
              />
            </div>

            <div>
              <label htmlFor="entry-mood" className="block text-xs font-semibold text-[#473324] mb-1">
                Entry Tag
              </label>
              <select
                id="entry-mood"
                value={moodTag}
                onChange={(e) => setMoodTag(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
              >
                {MOOD_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Font Selector (Any Font) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="diary-font-select" className="block text-xs font-semibold text-[#473324] mb-1">
                Ink Typeface
              </label>
              <select
                id="diary-font-select"
                value={selectedFont}
                onChange={(e) => {
                  setSelectedFont(e.target.value);
                  setCustomFontInput('');
                }}
                className="w-full px-3.5 py-2 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
              >
                {DIARY_FONTS.map((font) => (
                  <option key={font.id} value={font.cssFamily}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="custom-font-name" className="block text-xs font-semibold text-[#473324] mb-1">
                Or Enter Any Font Name
              </label>
              <input
                id="custom-font-name"
                type="text"
                maxLength={50}
                value={customFontInput}
                onChange={(e) => setCustomFontInput(e.target.value)}
                placeholder="e.g. Georgia, Papyrus, cursive"
                className="w-full px-3.5 py-2 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {writeMode === 'mouse' && (
              <motion.div
                key="handwriting-pad"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <HandwritingCanvas onTranscribed={handleTranscribedText} />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label htmlFor="entry-content" className="block text-xs font-semibold text-[#473324] mb-1.5">
              Manuscript Text {usedHandwriting ? '(Includes Detected Handwriting)' : ''}
            </label>
            <textarea
              id="entry-content"
              rows={8}
              required
              maxLength={FIELD_LIMITS.CONTENT_MAX}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setUsedTyping(true);
              }}
              placeholder="Write your secret in ink, or switch to 'Write with Quill' above to draw words and detect them automatically..."
              style={{ fontFamily: activeFont }}
              className="w-full px-4 py-3.5 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-lg leading-relaxed focus:outline-none focus:border-[#8c1d24]"
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-[#5e4736]">
              {entryNotice || 'Entries are encrypted with your lock spell and synced to Firestore.'}
            </span>
            <button
              type="submit"
              disabled={isSavingEntry}
              className="px-6 py-2.5 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-sm font-semibold hover:bg-[#70141a] disabled:opacity-60 transition-transform active:scale-95 whitespace-nowrap"
            >
              {isSavingEntry ? 'Sealing Entry...' : 'Save Entry'}
            </button>
          </div>
        </form>

        {/* Right: Cloud-Synced Diary Pages */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-[#f6eedc]">
              Inscribed Pages
            </h3>
            <span className="text-xs text-[#c9b99c] font-mono tabular-nums">
              {entries.length} Saved
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="parchment-sheet rounded-xl p-7 border border-[#cbb792] text-center">
              <p className="font-display text-base font-semibold text-[#23170f]">
                Blank Parchment
              </p>
              <p className="text-sm text-[#5e4736] mt-1.5">
                Write your first secret on the left using any font or your feather quill.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[760px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {entries.map((entry, idx) => (
                  <motion.article
                    key={entry.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.2) }}
                    className="parchment-sheet rounded-xl p-5 sm:p-6 border border-[#cbb792]"
                  >
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#cbb792]/70">
                      <div className="flex items-center gap-3">
                        <CrimsonWaxSeal label={entry.moodTag.slice(0, 1)} className="w-9 h-9 shrink-0" />
                        <div>
                          <h4 className="font-display text-base font-bold text-[#23170f]">
                            {entry.title}
                          </h4>
                          <p className="text-xs text-[#5e4736] mt-0.5">
                            {entry.moodTag} · {entry.inputMode} · {entry.createdAtLabel}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        aria-label={`Delete ${entry.title}`}
                        className="p-2 rounded-md text-[#70533c] hover:text-[#8c1d24] hover:bg-[#e7d8ba] transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p
                      className="mt-3 text-base text-[#23170f] leading-relaxed whitespace-pre-wrap"
                      style={{ fontFamily: entry.fontFamily || "'Lora', Georgia, serif" }}
                    >
                      {entry.decryptedContent}
                    </p>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
