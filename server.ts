import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ParsedGeminiError {
  status: number;
  apiStatus?: string;
  userMessage: string;
  isQuotaOrRateLimit: boolean;
  isTransient: boolean;
}

function parseGeminiError(error: unknown, fallbackMessage: string): ParsedGeminiError {
  let rawMessage = error instanceof Error ? error.message : String(error ?? fallbackMessage);
  let status =
    typeof error === 'object' && error !== null && 'status' in error && typeof (error as { status: unknown }).status === 'number'
      ? (error as { status: number }).status
      : 500;
  let apiStatus: string | undefined;

  // @google/genai often serializes the API error JSON payload into error.message
  const trimmed = rawMessage.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (parsed?.error) {
        if (typeof parsed.error.code === 'number') status = parsed.error.code;
        if (typeof parsed.error.status === 'string') apiStatus = parsed.error.status;
        if (typeof parsed.error.message === 'string' && parsed.error.message.trim()) {
          rawMessage = parsed.error.message.trim();
        }
      }
    } catch {
      // Keep rawMessage if JSON parse fails
    }
  }

  const isQuotaOrRateLimit =
    status === 429 ||
    apiStatus === 'RESOURCE_EXHAUSTED' ||
    /quota|rate[- ]limit|RESOURCE_EXHAUSTED/i.test(rawMessage);

  const isAuthError =
    status === 401 ||
    status === 403 ||
    apiStatus === 'PERMISSION_DENIED' ||
    /API_KEY_INVALID|PERMISSION_DENIED|insufficient authentication/i.test(rawMessage);

  const isTransient = status === 503 || status === 500 || status === 429;

  if (isQuotaOrRateLimit) {
    return {
      status: 429,
      apiStatus: apiStatus || 'RESOURCE_EXHAUSTED',
      userMessage:
        'The current Gemini API key has exceeded its rate limit or quota. Wait a moment and try again, or open Settings > Secrets to select a billing-enabled API key for higher quota.',
      isQuotaOrRateLimit: true,
      isTransient: true,
    };
  }

  if (isAuthError) {
    return {
      status: status === 400 || status === 401 || status === 403 ? status : 403,
      apiStatus: apiStatus || 'PERMISSION_DENIED',
      userMessage:
        'The configured Gemini API key was rejected or lacks permission. Please verify your API key in Settings > Secrets.',
      isQuotaOrRateLimit: false,
      isTransient: false,
    };
  }

  return {
    status: status >= 400 && status < 600 ? status : 500,
    apiStatus,
    userMessage: rawMessage || fallbackMessage,
    isQuotaOrRateLimit: false,
    isTransient,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithModelFallback<T>(
  attempts: Array<{ label: string; run: () => Promise<T> }>
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      return await attempt.run();
    } catch (err) {
      lastError = err;
      const parsed = parseGeminiError(err, 'Gemini request failed.');

      // Short backoff retry only on transient 503/500 spikes; 429 quota failures advance immediately to fallback
      if (parsed.status === 503 || parsed.status === 500) {
        await sleep(450);
        try {
          return await attempt.run();
        } catch (retryErr) {
          lastError = retryErr;
        }
      }

      const retryParsed = parseGeminiError(lastError, 'Gemini request failed.');
      // Only fall back to secondary models/configs on quota/rate-limit, model-not-found, or transient 5xx
      const canFallback =
        retryParsed.isQuotaOrRateLimit ||
        retryParsed.status === 404 ||
        retryParsed.status >= 500;

      if (!canFallback) {
        throw lastError;
      }
      console.warn(`Gemini attempt "${attempt.label}" failed (${retryParsed.status}): ${retryParsed.userMessage}`);
    }
  }

  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Transcribe mouse-drawn handwriting on the parchment canvas into text
  app.post('/api/ink-transcribe', async (req, res) => {
    try {
      const { imageDataUrl } = req.body as { imageDataUrl?: string };
      if (!imageDataUrl || typeof imageDataUrl !== 'string') {
        res.status(400).json({ error: 'Missing imageDataUrl payload.' });
        return;
      }

      const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) {
        res.status(400).json({ error: 'Invalid image data URL format.' });
        return;
      }

      const mimeType = match[1];
      const base64Data = match[2];

      const ai = getGeminiClient();
      const contents = {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: 'You are an expert paleographer reading handwriting drawn with a quill/mouse on aged parchment. Transcribe every word, number, or sentence written in ink as accurately as possible. Return ONLY the plain transcribed text with natural spacing and punctuation. If nothing legible is written, respond with exactly: [BLANK]',
          },
        ],
      };

      const response = await runWithModelFallback([
        {
          label: 'gemini-4-hydrogen (ink)',
          run: () => ai.models.generateContent({ model: 'gemini-4-hydrogen', contents }),
        },
        {
          label: 'gemini-3.1-flash-lite (ink)',
          run: () => ai.models.generateContent({ model: 'gemini-3.1-flash-lite', contents }),
        },
      ]);

      const rawText = (response.text ?? '').trim();
      const text = rawText === '[BLANK]' ? '' : rawText;
      res.json({ text });
    } catch (error) {
      console.error('Ink transcription error:', error);
      const parsed = parseGeminiError(error, 'Failed to transcribe handwriting.');
      res.status(parsed.status).json({ error: parsed.userMessage, code: parsed.status });
    }
  });

  // Arcane Scroll Oracle: answers from unlocked diary secrets OR looks up web/general knowledge via Google Search grounding
  app.post('/api/scroll-oracle', async (req, res) => {
    try {
      const {
        question,
        diaryEntries = [],
        diaryLocked = false,
        wizardName = 'Student',
        wizardHouse = 'Hogwarts',
      } = req.body as {
        question?: string;
        diaryEntries?: Array<{ title: string; content: string; createdAtLabel: string; moodTag: string }>;
        diaryLocked?: boolean;
        wizardName?: string;
        wizardHouse?: string;
      };

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        res.status(400).json({ error: 'Please write a question on the scroll.' });
        return;
      }
      if (question.length > 500) {
        res.status(400).json({ error: 'Question must be 500 characters or fewer.' });
        return;
      }

      const safeEntries = Array.isArray(diaryEntries)
        ? diaryEntries.slice(0, 40).map((e) => ({
            title: String(e.title || '').slice(0, 140),
            content: String(e.content || '').slice(0, 2000),
            createdAtLabel: String(e.createdAtLabel || '').slice(0, 60),
            moodTag: String(e.moodTag || '').slice(0, 40),
          }))
        : [];

      const diaryContext =
        safeEntries.length > 0
          ? safeEntries
              .map(
                (entry, idx) =>
                  `[Entry ${idx + 1}] Title: "${entry.title}" | Date: ${entry.createdAtLabel} | Mood: ${entry.moodTag}\n${entry.content}`
              )
              .join('\n\n')
          : 'No unlocked diary entries are currently readable.';

      const systemInstruction = `You are the Keeper of the Arcane Scrolls assisting ${wizardName} of ${wizardHouse}.
You have two sources of truth:
1. The user's personal Secret Diary entries provided below.
2. General knowledge, mathematics, wizarding lore, and live world information via Google Search grounding.

Rules:
- First check if the user's question is asking about something recorded in their personal diary (memories, secrets, dates, notes they wrote).
  - If diaryLocked is true (${diaryLocked}) and the question asks about their diary/journal/secrets, gently tell them their diary is currently sealed with a protective password charm and ask them to unlock the diary first to read private entries.
  - If the answer is in the unlocked diary entries, answer directly and cite the exact entry title and date.
- If the question is NOT in their diary (for example arithmetic like "2 plus 2", factual trivia, current events, science, definitions, or Harry Potter lore), compute or look it up accurately using Google Search grounding and answer clearly and concisely (e.g. for "2 plus 2", answer "4" plainly right away).
- Keep your tone refined, helpful, and scholarly—never evasive.
- Do not fabricate diary contents that are not in the provided entries.`;

      const contents = `Diary Status: ${diaryLocked ? 'SEALED (locked)' : 'UNSEALED (unlocked)'}\n\nUnlocked Diary Entries:\n${diaryContext}\n\nScroll Question: ${question.trim()}`;

      const ai = getGeminiClient();
      const response = await runWithModelFallback([
        {
          label: 'gemini-4-hydrogen + search',
          run: () =>
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents,
              config: {
                systemInstruction,
                tools: [{ googleSearch: {} }],
              },
            }),
        },
        {
          label: 'gemini-4-hydrogen (direct)',
          run: () =>
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents,
              config: { systemInstruction },
            }),
        },
        {
          label: 'gemini-3.1-flash-lite + search',
          run: () =>
            ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents,
              config: {
                systemInstruction,
                tools: [{ googleSearch: {} }],
              },
            }),
        },
        {
          label: 'gemini-3.1-flash-lite (direct)',
          run: () =>
            ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents,
              config: { systemInstruction },
            }),
        },
      ]);

      const answer = (response.text ?? 'The ink faded before an answer formed. Please try again.').trim();
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources: Array<{ title: string; uri: string }> = [];
      const seen = new Set<string>();
      for (const chunk of chunks) {
        const uri = chunk?.web?.uri;
        const title = chunk?.web?.title;
        if (uri && !seen.has(uri)) {
          seen.add(uri);
          sources.push({ title: title || uri, uri });
        }
      }

      const mentionsEntry =
        !diaryLocked &&
        safeEntries.some(
          (entry) =>
            entry.title &&
            answer.toLowerCase().includes(entry.title.toLowerCase())
        );

      let sourceType: 'diary' | 'web' | 'hybrid' = 'web';
      if (mentionsEntry && sources.length > 0) {
        sourceType = 'hybrid';
      } else if (mentionsEntry || (!diaryLocked && safeEntries.length > 0 && sources.length === 0 && /diary|entry|journal|secret|wrote|note/i.test(question))) {
        sourceType = 'diary';
      }

      res.json({
        answer,
        sourceType,
        sources: sources.slice(0, 5),
      });
    } catch (error) {
      console.error('Scroll oracle error:', error);
      const parsed = parseGeminiError(error, 'Failed to consult the Arcane Scroll.');
      res.status(parsed.status).json({ error: parsed.userMessage, code: parsed.status });
    }
  });

  // Live Spell Duel Narrative & Custom Spell Adjudication
  app.post('/api/spell-duel', async (req, res) => {
    try {
      const {
        spellText,
        opponent = 'umbridge',
        playerName = 'Young Wizard',
        playerHouse = 'Gryffindor',
        wandCore = 'Phoenix feather',
        playerHp = 100,
        opponentHp = 100,
        isKnownSpell = true,
        turnEffectSummary = '',
      } = req.body as {
        spellText?: string;
        opponent?: 'dummy' | 'umbridge' | 'voldemort' | 'bellatrix' | 'draco';
        playerName?: string;
        playerHouse?: string;
        wandCore?: string;
        playerHp?: number;
        opponentHp?: number;
        isKnownSpell?: boolean;
        turnEffectSummary?: string;
      };

      if (!spellText || typeof spellText !== 'string') {
        res.status(400).json({ error: 'Spell incantation cannot be empty.' });
        return;
      }

      const safeSpell = spellText.trim().slice(0, 180);
      const ai = getGeminiClient();

      const opponentPrompts: Record<string, string> = {
        umbridge: `You are Professor Dolores Umbridge in a Hogwarts dueling chamber against ${playerName} (${playerHouse}, ${wandCore} wand).
Player HP: ${playerHp}, Umbridge HP: ${opponentHp}.
The player just typed in spell chat: "${safeSpell}".
Combat resolution so far: ${turnEffectSummary || 'Custom incantation or taunt'}.
Respond in character with 1-2 crisp, dramatic sentences (snide, pompous Ministry tone, mentioning tea, cat plates, or Educational Decrees).`,
        voldemort: `You are Lord Voldemort (The Dark Lord) in a climactic Hogwarts duel against ${playerName} (${playerHouse}, ${wandCore} wand).
Player HP: ${playerHp}, Voldemort HP: ${opponentHp}.
The player just typed in spell chat: "${safeSpell}".
Combat resolution so far: ${turnEffectSummary || 'Custom incantation or defiance'}.
Respond in character with 1-2 chilling, imperious sentences (hissing contempt, dark majesty, twin-core magic or the Elder/Yew wand).`,
        bellatrix: `You are Bellatrix Lestrange in a fierce castle duel against ${playerName} (${playerHouse}, ${wandCore} wand).
Player HP: ${playerHp}, Bellatrix HP: ${opponentHp}.
The player just typed in spell chat: "${safeSpell}".
Combat resolution so far: ${turnEffectSummary || 'Custom incantation or taunt'}.
Respond in character with 1-2 wild, mocking, dramatic sentences (theatrical Death Eater glee, cackling taunts).`,
        draco: `You are Draco Malfoy in the Hogwarts Dueling Club against ${playerName} (${playerHouse}, ${wandCore} wand).
Player HP: ${playerHp}, Draco HP: ${opponentHp}.
The player just typed in spell chat: "${safeSpell}".
Combat resolution so far: ${turnEffectSummary || 'Custom incantation or strike'}.
Respond in character with 1-2 sharp, arrogant Slytherin sentences (proud boasting, quick counter-taunts).`,
        dummy: `You are the Enchanted Hogwarts Dueling Dummy responding to ${playerName} (${playerHouse}, ${wandCore} wand).
Player HP: ${playerHp}, Dummy HP: ${opponentHp}.
The player just typed in spell chat: "${safeSpell}".
Combat resolution so far: ${turnEffectSummary || 'Custom incantation or strike'}.
Describe the wooden mannequin's physical reaction in 1-2 crisp sentences (creaking oak, sparks singeing its brass joints, rebounding practice hexes).`,
      };

      const prompt = `${opponentPrompts[opponent] || opponentPrompts.umbridge} Also classify any custom/unrecognized spell's balanced combat impact (0 to 24 damage, 0 to 14 heal, and visual color theme).`;

      const duelConfig = {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reaction: {
              type: Type.STRING,
              description: '1-2 crisp sentences of opponent reaction.',
            },
            customDamage: {
              type: Type.INTEGER,
              description: 'Balanced damage (0-24) if the incantation is a custom offensive spell, else 0.',
            },
            customHeal: {
              type: Type.INTEGER,
              description: 'Balanced heal (0-14) if the incantation is a custom healing spell, else 0.',
            },
            effectColor: {
              type: Type.STRING,
              description: 'One of: gold, crimson, emerald, frost, violet, pink',
            },
          },
          required: ['reaction', 'customDamage', 'customHeal', 'effectColor'],
        },
      };

      const response = await runWithModelFallback([
        {
          label: 'gemini-4-hydrogen (duel)',
          run: () => ai.models.generateContent({ model: 'gemini-4-hydrogen', contents: prompt, config: duelConfig }),
        },
        {
          label: 'gemini-3.1-flash-lite (duel)',
          run: () => ai.models.generateContent({ model: 'gemini-3.1-flash-lite', contents: prompt, config: duelConfig }),
        },
      ]);

      const parsed = JSON.parse((response.text ?? '{}').trim() || '{}') as {
        reaction?: string;
        customDamage?: number;
        customHeal?: number;
        effectColor?: string;
      };

      res.json({
        reaction:
          parsed.reaction ||
          (opponent === 'umbridge'
            ? 'Hem, hem! Such undisciplined wand-work will certainly be noted by the Ministry.'
            : 'The enchanted oak mannequin shudders under the arcane impact and resets its stance.'),
        customDamage: isKnownSpell ? 0 : Math.max(0, Math.min(24, Number(parsed.customDamage) || 12)),
        customHeal: isKnownSpell ? 0 : Math.max(0, Math.min(14, Number(parsed.customHeal) || 0)),
        effectColor: parsed.effectColor || 'gold',
      });
    } catch (error) {
      console.error('Spell duel AI error:', error);
      const parsed = parseGeminiError(error, 'Failed to process duel reaction.');
      res.status(parsed.status).json({ error: parsed.userMessage, code: parsed.status });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Grimoire & Quill server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
