import React, { useState } from 'react';
import { ExternalLink, ScrollText, Search, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  DecryptedDiaryEntry,
  FIELD_LIMITS,
  ScrollQueryRecord,
  WizardProfile,
} from '../types/wizard';
import { playSpellSound } from '../lib/spellEngine';
import { BrassFiligreeCorner, CrimsonWaxSeal } from './WizardingArtwork';

interface ArcaneScrollsProps {
  profile: WizardProfile | null;
  entries: DecryptedDiaryEntry[];
  isDiaryLocked: boolean;
  scrollHistory: ScrollQueryRecord[];
  isMuted: boolean;
  onSaveScrollQuery: (record: {
    question: string;
    answer: string;
    sourceType: 'diary' | 'web' | 'hybrid';
  }) => Promise<void>;
  onDeleteScrollQuery: (queryId: string) => Promise<void>;
  onUnlockPrompt: () => void;
}

const EXAMPLE_QUESTIONS = [
  'What secrets did I record in my diary recently?',
  'What is 2 plus 2?',
  'What are the four founders of Hogwarts?',
  'What is the current distance from Earth to the Moon?',
];

export const ArcaneScrolls: React.FC<ArcaneScrollsProps> = ({
  profile,
  entries,
  isDiaryLocked,
  scrollHistory,
  isMuted,
  onSaveScrollQuery,
  onDeleteScrollQuery,
  onUnlockPrompt,
}) => {
  const [question, setQuestion] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [latestResult, setLatestResult] = useState<{
    question: string;
    answer: string;
    sourceType: 'diary' | 'web' | 'hybrid';
    sources: Array<{ title: string; uri: string }>;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scrollImgFailed, setScrollImgFailed] = useState(false);

  const askScroll = async (promptText: string) => {
    const trimmed = promptText.trim().slice(0, FIELD_LIMITS.QUESTION_MAX);
    if (!trimmed) return;

    setErrorMsg(null);
    setIsSearching(true);
    playSpellSound('light', isMuted);

    try {
      const diaryPayload = isDiaryLocked
        ? []
        : entries.map((e) => ({
            title: e.title,
            content: e.decryptedContent,
            createdAtLabel: e.createdAtLabel,
            moodTag: e.moodTag,
          }));

      const response = await fetch('/api/scroll-oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          diaryEntries: diaryPayload,
          diaryLocked: isDiaryLocked,
          wizardName: profile?.name || 'Wizard',
          wizardHouse: profile?.house || 'Hogwarts',
        }),
      });

      let data: {
        answer?: string;
        sourceType?: 'diary' | 'web' | 'hybrid';
        sources?: Array<{ title: string; uri: string }>;
        error?: string;
      } = {};

      try {
        data = (await response.json()) as typeof data;
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || 'The scroll failed to reveal an answer.');
      }

      const answer = data.answer || 'No response appeared on the parchment.';
      const sourceType = data.sourceType || 'web';
      const sources = data.sources || [];

      setLatestResult({
        question: trimmed,
        answer,
        sourceType,
        sources,
      });
      setQuestion('');

      await onSaveScrollQuery({
        question: trimmed,
        answer: answer.slice(0, 8000),
        sourceType,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to consult the Arcane Scroll.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void askScroll(question);
  };

  const sourceLabel = (type: 'diary' | 'web' | 'hybrid') => {
    if (type === 'diary') return 'Source: Secret Diary Archive';
    if (type === 'hybrid') return 'Source: Secret Diary & World Lookup';
    return 'Source: World Knowledge & Search Grounding';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      {/* Top Scroll Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-5 rounded-xl overflow-hidden border border-[#3b2b20] bg-[#1c1410] relative">
          {!scrollImgFailed ? (
            <img
              src="/src/assets/images/arcane_scroll_seal_1795313545319.jpg"
              alt="Unrolled antique vellum scroll with crimson wax seal on walnut wood"
              referrerPolicy="no-referrer"
              onError={() => setScrollImgFailed(true)}
              className="w-full h-full min-h-[260px] object-cover"
            />
          ) : (
            <div className="w-full h-full min-h-[260px] bg-gradient-to-br from-[#2b1d12] to-[#120d0a] flex items-center justify-center">
              <ScrollText className="w-12 h-12 text-[#e6bd62]" />
            </div>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col">
          <div className="scroll-rod -mx-1 z-10" aria-hidden="true" />
          <div className="parchment-scroll rounded-b-xl px-6 sm:px-8 py-6 border-x border-[#cbb792] flex-1 flex flex-col justify-between">
            <BrassFiligreeCorner className="absolute top-2 left-2" />
            <BrassFiligreeCorner className="absolute top-2 right-2 rotate-90" />

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#cbb792] pl-4 pr-4">
                <h2 className="font-display text-2xl font-bold text-[#23170f]">
                  Scrolls of Inquiry
                </h2>
                <span className="text-xs text-[#5e4736]">
                  {isDiaryLocked
                    ? 'Diary Sealed · World Search Active'
                    : `Diary Unsealed (${entries.length} ${entries.length === 1 ? 'Entry' : 'Entries'}) · World Search Active`}
                </span>
              </div>

              <p className="text-sm text-[#473324] mt-3 leading-relaxed">
                Ask any question to locate information hidden inside your Secret Diary, or ask general math and real-world questions to look up answers automatically.
              </p>

              {isDiaryLocked && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#e7d8ba] px-4 py-2.5 text-xs text-[#3d2b1f]">
                  <span>Your diary is currently locked. Unlock it to search private entries on this scroll.</span>
                  <button
                    type="button"
                    onClick={onUnlockPrompt}
                    className="font-semibold text-[#8c1d24] underline underline-offset-2 whitespace-nowrap"
                  >
                    Unlock Diary
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.QUESTION_MAX}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about a diary secret or anything else (e.g. 2 plus 2)..."
                  className="flex-1 px-4 py-3 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
                />
                <button
                  type="submit"
                  disabled={isSearching || !question.trim()}
                  className="px-6 py-3 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-sm font-semibold hover:bg-[#70141a] disabled:opacity-55 transition-transform active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Search className="w-4 h-4" />
                  {isSearching ? 'Inscribing...' : 'Ask Scroll'}
                </button>
              </form>

              {errorMsg && (
                <div
                  role="alert"
                  className="mt-3 rounded-lg bg-[#8c1d24]/10 border border-[#8c1d24]/40 px-4 py-2.5 text-xs font-medium text-[#70141a] leading-relaxed"
                >
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-[#cbb792]">
              <p className="text-xs font-semibold text-[#5e4736] mb-2">Sample Inquiries:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    disabled={isSearching}
                    onClick={() => void askScroll(sample)}
                    className="px-3 py-1.5 rounded-md bg-[#fbf6ea] border border-[#bfa882] text-xs text-[#3d2b1f] hover:border-[#8c1d24] transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="scroll-rod -mx-1 z-10" aria-hidden="true" />
        </div>
      </div>

      {/* Latest Unrolled Answer with Animated Scroll Unfurl */}
      <AnimatePresence mode="wait">
        {latestResult && (
          <motion.section
            key={latestResult.question + latestResult.answer.slice(0, 20)}
            initial={{ opacity: 0, scaleY: 0.86, y: -8 }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ originY: 0 }}
          >
            <div className="scroll-rod -mx-1 relative z-10" aria-hidden="true" />
            <div className="parchment-scroll px-6 sm:px-8 py-6 border-x border-[#c99a3b]">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#cbb792]">
                <div className="flex items-center gap-3">
                  <CrimsonWaxSeal label="S" className="w-10 h-10 shrink-0" />
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#23170f]">
                      {latestResult.question}
                    </h3>
                    <span className="text-xs font-medium text-[#8c1d24]">
                      {sourceLabel(latestResult.sourceType)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-base text-[#23170f] leading-relaxed whitespace-pre-wrap">
                {latestResult.answer}
              </p>

              {latestResult.sources.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[#cbb792]">
                  <p className="text-xs font-semibold text-[#5e4736] mb-2">Verified References:</p>
                  <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                    {latestResult.sources.map((src) => (
                      <li key={src.uri}>
                        <a
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#8c1d24] hover:underline"
                        >
                          {src.title}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="scroll-rod -mx-1 relative z-10" aria-hidden="true" />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Past Scrolls Archive */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-[#f6eedc]">
            Archived Scrolls
          </h3>
          <span className="text-xs text-[#c9b99c] font-mono tabular-nums">
            {scrollHistory.length} Recorded
          </span>
        </div>

        {scrollHistory.length === 0 ? (
          <div className="rounded-xl bg-[#1c1410] border border-[#3b2b20] p-6 text-sm text-[#c9b99c]">
            Questions you ask on the Scrolls of Inquiry will be archived here and synced to Firestore.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scrollHistory.map((item, idx) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.2) }}
                className="parchment-scroll rounded-xl p-5 border border-[#cbb792] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-[#cbb792]/70">
                    <div>
                      <h4 className="font-display text-sm font-bold text-[#23170f]">
                        {item.question}
                      </h4>
                      <p className="text-xs text-[#5e4736] mt-0.5">
                        {sourceLabel(item.sourceType)} · {item.createdAtLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteScrollQuery(item.id)}
                      aria-label={`Delete scroll ${item.question}`}
                      className="p-1.5 rounded-md text-[#70533c] hover:text-[#8c1d24] hover:bg-[#e7d8ba] shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-[#23170f] leading-relaxed whitespace-pre-wrap">
                    {item.answer}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
};
