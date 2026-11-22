import { useEffect, useState } from 'react';
import {
  User,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from './lib/firebase';
import {
  decryptSecretText,
  encryptSecretText,
  generateSaltHex,
  hashSpellPassword,
} from './lib/cryptoSpell';
import {
  AppSection,
  BloodStatus,
  DecryptedDiaryEntry,
  DiaryEntryDoc,
  FIELD_LIMITS,
  HouseName,
  OpponentId,
  ScrollQueryRecord,
  WizardProfile,
} from './types/wizard';
import { AnimatePresence, motion } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopBar } from './components/TopBar';
import { CharacterSanctum } from './components/CharacterSanctum';
import { SecretDiary } from './components/SecretDiary';
import { ArcaneScrolls } from './components/ArcaneScrolls';
import { SpellDuelArena } from './components/SpellDuelArena';
import { AmbientMagicLayer } from './components/AmbientMagicLayer';

function formatTimestamp(ts: unknown): string {
  if (
    ts &&
    typeof ts === 'object' &&
    'toDate' in ts &&
    typeof (ts as { toDate: () => Date }).toDate === 'function'
  ) {
    return (ts as { toDate: () => Date }).toDate().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return 'Just now';
}

function MainApp() {
  const [activeSection, setActiveSection] = useState<AppSection>('sanctum');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [profile, setProfile] = useState<WizardProfile | null>(null);
  const [rawEntries, setRawEntries] = useState<DiaryEntryDoc[]>([]);
  const [decryptedEntries, setDecryptedEntries] = useState<DecryptedDiaryEntry[]>([]);
  const [scrollHistory, setScrollHistory] = useState<ScrollQueryRecord[]>([]);

  const [unlockedPassword, setUnlockedPassword] = useState<string | null>(null);
  const [isDiaryLocked, setIsDiaryLocked] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [syncLabel, setSyncLabel] = useState('Local Session');
  const [authError, setAuthError] = useState<string | null>(null);

  // Complete pending redirect sign-in if returning from Google OAuth (top-level hosts)
  useEffect(() => {
    let active = true;
    void getRedirectResult(auth).catch((err) => {
      if (!active) return;
      const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
      if (code && code !== 'auth/no-auth-event') {
        setAuthError(formatAuthErrorMessage(err));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Listen for Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsAuthReady(true);
      if (!nextUser) {
        setProfile(null);
        setRawEntries([]);
        setDecryptedEntries([]);
        setScrollHistory([]);
        setUnlockedPassword(null);
        setIsDiaryLocked(true);
        setSyncLabel('Local Session');
      } else {
        setAuthError(null);
        setSyncLabel('Cloud Archive · Synced');
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to Firestore WizardProfile, DiaryEntries, and ScrollQueries when authenticated
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const uid = user.uid;
    const wizardDocRef = doc(db, 'wizards', uid);

    const unsubProfile = onSnapshot(
      wizardDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as WizardProfile;
          setProfile(data);
        } else {
          setProfile(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `wizards/${uid}`);
      }
    );

    const entriesQuery = query(
      collection(db, 'wizards', uid, 'entries'),
      where('ownerId', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsubEntries = onSnapshot(
      entriesQuery,
      (snapshot) => {
        const docs: DiaryEntryDoc[] = snapshot.docs.map((d) => {
          const data = d.data() as Omit<DiaryEntryDoc, 'id' | 'createdAtLabel'>;
          return {
            ...data,
            id: d.id,
            createdAtLabel: formatTimestamp(data.createdAt),
          };
        });
        setRawEntries(docs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `wizards/${uid}/entries`);
      }
    );

    const scrollsQuery = query(
      collection(db, 'wizards', uid, 'scrollQueries'),
      where('ownerId', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsubScrolls = onSnapshot(
      scrollsQuery,
      (snapshot) => {
        const docs: ScrollQueryRecord[] = snapshot.docs.map((d) => {
          const data = d.data() as Omit<ScrollQueryRecord, 'id' | 'createdAtLabel'> & {
            createdAt?: unknown;
          };
          return {
            id: d.id,
            ownerId: data.ownerId,
            question: data.question,
            answer: data.answer,
            sourceType: data.sourceType,
            createdAtLabel: formatTimestamp(data.createdAt),
          };
        });
        setScrollHistory(docs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `wizards/${uid}/scrollQueries`);
      }
    );

    return () => {
      unsubProfile();
      unsubEntries();
      unsubScrolls();
    };
  }, [isAuthReady, user]);

  // Decrypt entries whenever unlockedPassword, profile salt, or rawEntries changes
  useEffect(() => {
    let cancelled = false;

    const runDecrypt = async () => {
      if (isDiaryLocked || !unlockedPassword || !profile?.spellLockSalt) {
        if (!cancelled) {
          setDecryptedEntries(
            rawEntries.map((entry) => ({
              ...entry,
              decryptedContent: '[Sealed with Spell Lock]',
            }))
          );
        }
        return;
      }

      const resolved = await Promise.all(
        rawEntries.map(async (entry) => {
          if (!entry.isEncrypted || !entry.iv) {
            return { ...entry, decryptedContent: entry.content };
          }
          try {
            const plain = await decryptSecretText(
              entry.content,
              entry.iv,
              unlockedPassword,
              profile.spellLockSalt
            );
            return { ...entry, decryptedContent: plain };
          } catch {
            return {
              ...entry,
              decryptedContent: '[Unable to decrypt with current spell]',
              decryptionError: true,
            };
          }
        })
      );

      if (!cancelled) {
        setDecryptedEntries(resolved);
      }
    };

    void runDecrypt();
    return () => {
      cancelled = true;
    };
  }, [isDiaryLocked, unlockedPassword, profile?.spellLockSalt, rawEntries]);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const formatAuthErrorMessage = (err: unknown): string => {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code: unknown }).code)
        : '';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'this domain';

    if (code === 'auth/unauthorized-domain') {
      return `Domain "${hostname}" is not authorized for Google Sign-In in Firebase project "arcane-spells". Add "${hostname}" in Firebase Console -> Authentication -> Settings -> Authorized domains.`;
    }
    if (code === 'auth/popup-blocked') {
      return isInIframe
        ? 'The Google Sign-In popup was blocked by your browser. Allow popups for this site or open the app directly in a new tab.'
        : 'The Google Sign-In popup was blocked. Allow popups or use Redirect Sign-In below.';
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return 'Google Sign-In popup was closed before completing. Please try again.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Google Sign-In is disabled in Firebase Console. Enable Google under Authentication -> Sign-in method.';
    }
    return err instanceof Error ? err.message : 'Unable to sign in with Google.';
  };

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      if (code === 'auth/popup-blocked' && !isInIframe) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          setAuthError(formatAuthErrorMessage(redirectErr));
          return;
        }
      }
      setAuthError(formatAuthErrorMessage(err));
    }
  };

  const handleRedirectSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      setAuthError(formatAuthErrorMessage(err));
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const ensureWizardDocExists = async (): Promise<WizardProfile | null> => {
    if (!user) return null;
    if (profile) return profile;

    const defaultWizard: WizardProfile = {
      uid: user.uid,
      name: (user.displayName || 'Hogwarts Apprentice').slice(0, FIELD_LIMITS.NAME_MAX),
      age: 17,
      house: 'Gryffindor',
      school: 'Hogwarts School of Witchcraft and Wizardry',
      bloodStatus: 'Half-blood',
      wandCore: 'Phoenix feather',
      wandWood: 'Holly',
      spellLockHash: '',
      spellLockSalt: '',
      spellLockHint: '',
      duelWins: 0,
      duelLosses: 0,
      umbridgeDefeatedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = doc(db, 'wizards', user.uid);
    try {
      await setDoc(ref, defaultWizard);
      setProfile(defaultWizard);
      return defaultWizard;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `wizards/${user.uid}`);
    }
  };

  const handleSaveProfile = async (draft: {
    name: string;
    age: number;
    house: HouseName;
    school: string;
    bloodStatus: BloodStatus;
    wandCore: string;
    wandWood: string;
  }) => {
    if (!user) {
      // Allow local preview character crafting before sign-in
      setProfile((prev) => ({
        uid: 'local',
        ...draft,
        spellLockHash: prev?.spellLockHash ?? '',
        spellLockSalt: prev?.spellLockSalt ?? '',
        spellLockHint: prev?.spellLockHint ?? '',
        duelWins: prev?.duelWins ?? 0,
        duelLosses: prev?.duelLosses ?? 0,
        umbridgeDefeatedCount: prev?.umbridgeDefeatedCount ?? 0,
      }));
      return;
    }

    setIsSavingProfile(true);
    setSyncLabel('Cloud Archive · Saving...');
    const path = `wizards/${user.uid}`;
    try {
      if (!profile) {
        await setDoc(doc(db, 'wizards', user.uid), {
          uid: user.uid,
          name: draft.name,
          age: Math.round(draft.age),
          house: draft.house,
          school: draft.school,
          bloodStatus: draft.bloodStatus,
          wandCore: draft.wandCore,
          wandWood: draft.wandWood,
          spellLockHash: '',
          spellLockSalt: '',
          spellLockHint: '',
          duelWins: 0,
          duelLosses: 0,
          umbridgeDefeatedCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'wizards', user.uid), {
          name: draft.name,
          age: Math.round(draft.age),
          house: draft.house,
          school: draft.school,
          bloodStatus: draft.bloodStatus,
          wandCore: draft.wandCore,
          wandWood: draft.wandWood,
          updatedAt: serverTimestamp(),
        });
      }
      setSyncLabel('Cloud Archive · Synced');
    } catch (error) {
      setSyncLabel('Cloud Archive · Sync Error');
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSetSpellPassword = async (password: string, hint: string) => {
    if (!user) return;
    const ensured = await ensureWizardDocExists();
    if (!ensured) return;

    const newSalt = generateSaltHex();
    const newHash = await hashSpellPassword(password, newSalt);
    setSyncLabel('Cloud Archive · Encrypting...');

    try {
      // Re-encrypt existing decrypted entries under the new custom spell password
      if (unlockedPassword && ensured.spellLockSalt && rawEntries.length > 0) {
        for (const entry of decryptedEntries) {
          if (entry.decryptionError) continue;
          const { ciphertextBase64, ivBase64 } = await encryptSecretText(
            entry.decryptedContent,
            password,
            newSalt
          );
          await updateDoc(doc(db, 'wizards', user.uid, 'entries', entry.id), {
            content: ciphertextBase64.slice(0, FIELD_LIMITS.CONTENT_MAX),
            isEncrypted: true,
            iv: ivBase64,
            updatedAt: serverTimestamp(),
          });
        }
      }

      await updateDoc(doc(db, 'wizards', user.uid), {
        spellLockHash: newHash,
        spellLockSalt: newSalt,
        spellLockHint: hint.slice(0, FIELD_LIMITS.HINT_MAX),
        updatedAt: serverTimestamp(),
      });

      setUnlockedPassword(password);
      setIsDiaryLocked(false);
      setSyncLabel('Cloud Archive · Synced');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `wizards/${user.uid}`);
    }
  };

  const handleUnlockDiary = async (passwordAttempt: string): Promise<boolean> => {
    if (!profile?.spellLockHash || !profile?.spellLockSalt) return false;
    const candidateHash = await hashSpellPassword(passwordAttempt, profile.spellLockSalt);
    if (candidateHash !== profile.spellLockHash) {
      return false;
    }
    setUnlockedPassword(passwordAttempt);
    setIsDiaryLocked(false);
    return true;
  };

  const handleLockDiary = () => {
    setUnlockedPassword(null);
    setIsDiaryLocked(true);
  };

  const handleSaveEntry = async (payload: {
    title: string;
    content: string;
    fontFamily: string;
    inputMode: 'typed' | 'handwritten' | 'mixed';
    moodTag: string;
  }) => {
    if (!user || !unlockedPassword || !profile?.spellLockSalt) return;
    setSyncLabel('Cloud Archive · Backing up...');

    const { ciphertextBase64, ivBase64 } = await encryptSecretText(
      payload.content,
      unlockedPassword,
      profile.spellLockSalt
    );

    const path = `wizards/${user.uid}/entries`;
    try {
      await addDoc(collection(db, 'wizards', user.uid, 'entries'), {
        ownerId: user.uid,
        title: payload.title.slice(0, FIELD_LIMITS.TITLE_MAX),
        content: ciphertextBase64.slice(0, FIELD_LIMITS.CONTENT_MAX),
        isEncrypted: true,
        iv: ivBase64,
        fontFamily: payload.fontFamily.slice(0, 60),
        inputMode: payload.inputMode,
        moodTag: payload.moodTag.slice(0, FIELD_LIMITS.MOOD_MAX),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSyncLabel('Cloud Archive · Synced');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    const path = `wizards/${user.uid}/entries/${entryId}`;
    try {
      await deleteDoc(doc(db, 'wizards', user.uid, 'entries', entryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleSaveScrollQuery = async (record: {
    question: string;
    answer: string;
    sourceType: 'diary' | 'web' | 'hybrid';
  }) => {
    if (!user) return;
    const ensured = await ensureWizardDocExists();
    if (!ensured) return;

    const path = `wizards/${user.uid}/scrollQueries`;
    try {
      await addDoc(collection(db, 'wizards', user.uid, 'scrollQueries'), {
        ownerId: user.uid,
        question: record.question.slice(0, FIELD_LIMITS.QUESTION_MAX),
        answer: record.answer.slice(0, 8000),
        sourceType: record.sourceType,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDeleteScrollQuery = async (queryId: string) => {
    if (!user) return;
    const path = `wizards/${user.uid}/scrollQueries/${queryId}`;
    try {
      await deleteDoc(doc(db, 'wizards', user.uid, 'scrollQueries', queryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleRecordDuelOutcome = async (result: 'win' | 'loss', opponent: OpponentId) => {
    if (!user) return;
    const ensured = await ensureWizardDocExists();
    if (!ensured) return;

    const nextWins = result === 'win' ? ensured.duelWins + 1 : ensured.duelWins;
    const nextLosses = result === 'loss' ? ensured.duelLosses + 1 : ensured.duelLosses;
    const nextUmbridge =
      result === 'win' && opponent === 'umbridge'
        ? ensured.umbridgeDefeatedCount + 1
        : ensured.umbridgeDefeatedCount;

    try {
      await updateDoc(doc(db, 'wizards', user.uid), {
        duelWins: nextWins,
        duelLosses: nextLosses,
        umbridgeDefeatedCount: nextUmbridge,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `wizards/${user.uid}`);
    }
  };

  const hasPasswordSet = Boolean(profile?.spellLockHash && profile?.spellLockSalt);

  return (
    <div className="relative min-h-screen bg-[#120d0a] text-[#f3ead8] flex flex-col overflow-x-hidden">
      <AmbientMagicLayer />

      <div className="relative z-10">
        <TopBar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          isSignedIn={Boolean(user)}
          isAuthReady={isAuthReady}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />
      </div>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {authError && (
          <div className="mb-6 rounded-lg bg-[#8c1d24] border border-[#c99a3b]/50 text-[#f9f3e6] px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3">
            <span className="flex-1 min-w-[220px] leading-relaxed">{authError}</span>
            <div className="flex items-center gap-2 shrink-0">
              {!isInIframe && (
                <button
                  type="button"
                  onClick={() => void handleRedirectSignIn()}
                  className="px-3 py-1.5 rounded-md bg-[#c99a3b] text-[#1a110b] text-xs font-semibold hover:bg-[#e6bd62] transition-colors whitespace-nowrap"
                >
                  Try Redirect Sign-In
                </button>
              )}
              <button
                type="button"
                onClick={() => setAuthError(null)}
                className="px-2.5 py-1.5 rounded-md border border-[#f9f3e6]/30 text-xs font-medium hover:bg-black/20 whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeSection === 'sanctum' && (
            <motion.div
              key="sanctum"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <CharacterSanctum
                profile={profile}
                isSignedIn={Boolean(user)}
                isSaving={isSavingProfile}
                syncLabel={syncLabel}
                onSaveProfile={handleSaveProfile}
                onNavigate={setActiveSection}
                onSignIn={handleSignIn}
              />
            </motion.div>
          )}

          {activeSection === 'diary' && (
            <motion.div
              key="diary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <SecretDiary
                profile={profile}
                entries={decryptedEntries}
                isSignedIn={Boolean(user)}
                isLocked={isDiaryLocked}
                hasPasswordSet={hasPasswordSet}
                isMuted={isMuted}
                syncLabel={syncLabel}
                onToggleMute={() => setIsMuted((m) => !m)}
                onSetSpellPassword={handleSetSpellPassword}
                onUnlockDiary={handleUnlockDiary}
                onLockDiary={handleLockDiary}
                onSaveEntry={handleSaveEntry}
                onDeleteEntry={handleDeleteEntry}
                onSignIn={handleSignIn}
              />
            </motion.div>
          )}

          {activeSection === 'scrolls' && (
            <motion.div
              key="scrolls"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <ArcaneScrolls
                profile={profile}
                entries={decryptedEntries}
                isDiaryLocked={isDiaryLocked}
                scrollHistory={scrollHistory}
                isMuted={isMuted}
                onSaveScrollQuery={handleSaveScrollQuery}
                onDeleteScrollQuery={handleDeleteScrollQuery}
                onUnlockPrompt={() => setActiveSection('diary')}
              />
            </motion.div>
          )}

          {activeSection === 'duel' && (
            <motion.div
              key="duel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <SpellDuelArena
                profile={profile}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted((m) => !m)}
                onRecordDuelOutcome={handleRecordDuelOutcome}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 border-t border-[#2b1f17] py-5 px-4 sm:px-8 text-xs text-[#a9987c]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>Grimoire &amp; Quill · Enchanted Wizarding Manuscript</span>
          <span>
            {profile?.name
              ? `${profile.name} · ${profile.house} · ${syncLabel}`
              : syncLabel}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
