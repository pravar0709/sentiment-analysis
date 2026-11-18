import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { deflateRawSync } from 'zlib';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
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

const SINGLE_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    classification: {
      type: Type.STRING,
      description: 'Overall intended sentiment classification: Positive, Negative, Neutral, or Mixed.',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Overall confidence score from 0 to 100 (e.g. 94.5) in the classification.',
    },
    polarityBreakdown: {
      type: Type.OBJECT,
      properties: {
        positive: { type: Type.NUMBER, description: 'Positive probability percentage 0-100.' },
        negative: { type: Type.NUMBER, description: 'Negative probability percentage 0-100.' },
        neutral: { type: Type.NUMBER, description: 'Neutral probability percentage 0-100.' },
      },
      required: ['positive', 'negative', 'neutral'],
    },
    netSentimentScore: {
      type: Type.NUMBER,
      description: 'Continuous polarity score from -1.0 (strongly negative) to +1.0 (strongly positive).',
    },
    primaryEmotion: {
      type: Type.STRING,
      description: 'Concise 1-2 word dominant emotional tone (e.g., Affection, Frustration, Dry Irony, Amusement, Enthusiasm).',
    },
    normalizedTranslation: {
      type: Type.STRING,
      description: 'Plain-English translation expanding all social media abbreviations, decoding emojis/symbols, and clarifying ironic intent.',
    },
    reasoningSummary: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence linguistic explanation of how words, regional idioms, Hinglish expressions, slang, emojis, symbols, and sarcasm signals combined to yield this classification.',
    },
    languageProfile: {
      type: Type.OBJECT,
      properties: {
        detectedLanguage: {
          type: Type.STRING,
          description: 'Primary language name, e.g., "Spanish", "Hindi", "French", "Arabic", "Japanese", "Korean", "German", "Portuguese", "Tamil", "English", or "Hinglish".',
        },
        detectedVariety: {
          type: Type.STRING,
          description: 'Specific dialect or original language form, e.g., "Standard Spanish", "Pure Hindi (Devanagari)", "Colloquial French", "Code-Mixed Hinglish", "British English", "Australian English", "Singlish", "Nigerian Pidgin / English", "Global Internet English", or "Unsupported Non-Hinglish Mix".',
        },
        languageCategory: {
          type: Type.STRING,
          description: 'Strictly one of: "World English", "Original World Language", "Code-Mixed Hinglish", "Unsupported Code-Mix".',
        },
        isHinglish: {
          type: Type.BOOLEAN,
          description: 'True ONLY if the text uses code-mixed Hinglish (Hindi + English). False for pure Hindi or pure English or other languages.',
        },
        withinSupportedScope: {
          type: Type.BOOLEAN,
          description: 'True for any pure/original world language, any World English variety, or Hinglish. False ONLY if the text is a non-Hinglish code-mixed hybrid (e.g. Spanglish, Franglais, Tanglish).',
        },
        scopeNote: {
          type: Type.STRING,
          description: 'Empty string if withinSupportedScope is true; otherwise a concise note explaining that mixed-language support is restricted to Hinglish only while pure original languages are supported.',
        },
        confidence: {
          type: Type.NUMBER,
          description: 'Confidence score 0-100 in the detected language/dialect profile.',
        },
        regionalOrSlangMarkers: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Specific native language idioms, dialectal words, or Hinglish markers identified in the text.',
        },
      },
      required: [
        'detectedLanguage',
        'detectedVariety',
        'languageCategory',
        'isHinglish',
        'withinSupportedScope',
        'scopeNote',
        'confidence',
        'regionalOrSlangMarkers',
      ],
    },
    aspects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          aspect: { type: Type.STRING, description: 'Specific topic, product feature, person, or entity evaluated (e.g., "Battery Life", "UI Update", "Customer Support").' },
          sentiment: { type: Type.STRING, description: 'One of: Positive, Negative, Neutral.' },
          confidence: { type: Type.NUMBER, description: 'Confidence 0-100 for this aspect sentiment.' },
          evidence: { type: Type.STRING, description: 'Exact phrase or cue supporting this aspect rating.' },
        },
        required: ['aspect', 'sentiment', 'confidence', 'evidence'],
      },
      description: 'Aspect-based sentiment breakdown when specific entities or attributes are evaluated in the sentence (empty array if purely general).',
    },
    tokenAttributions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          token: {
            type: Type.STRING,
            description: 'Exact substring/word/abbreviation/emoji/symbol from the original input text, in order of appearance.',
          },
          role: {
            type: Type.STRING,
            description: 'Strictly one of: Positive, Negative, Neutral, Intensifier, Hedge, Sarcasm Flip.',
          },
          weight: {
            type: Type.NUMBER,
            description: 'Signed directional impact weight from -1.0 (strong negative) to +1.0 (strong positive); for Sarcasm Flip or Intensifier use its effective directional pull.',
          },
          reason: {
            type: Type.STRING,
            description: 'Concise 1-line explanation of how this token shapes the final sentiment.',
          },
        },
        required: ['token', 'role', 'weight', 'reason'],
      },
      description: 'Key sentiment-driving tokens, emojis, abbreviations, hedges, intensifiers, and irony triggers from the input sentence for inline explainability.',
    },
    counterfactuals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          modifiedText: {
            type: Type.STRING,
            description: 'Minimal perturbation of the original sentence (e.g., removing an emoji, /s tag, or intensifier, or flipping a hedge).',
          },
          changeDescription: {
            type: Type.STRING,
            description: 'Short label of the minimal edit (e.g., "Removed 🙄 emoji and /s tag").',
          },
          predictedClassification: {
            type: Type.STRING,
            description: 'Predicted classification for modifiedText: Positive, Negative, Neutral, or Mixed.',
          },
          predictedConfidence: {
            type: Type.NUMBER,
            description: 'Predicted confidence 0-100 for modifiedText.',
          },
          confidenceDelta: {
            type: Type.NUMBER,
            description: 'Change in confidence relative to original (predictedConfidence - original confidence).',
          },
          impactSummary: {
            type: Type.STRING,
            description: 'Concise explanation of why that minimal change alters polarity or confidence.',
          },
        },
        required: [
          'modifiedText',
          'changeDescription',
          'predictedClassification',
          'predictedConfidence',
          'confidenceDelta',
          'impactSummary',
        ],
      },
      description: '1 to 2 minimal counterfactual edits proving which tokens/cues drive the verdict or sarcasm flip.',
    },
    nuanceCalibration: {
      type: Type.OBJECT,
      properties: {
        hedgesDetected: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              token: { type: Type.STRING },
              effect: { type: Type.STRING, description: 'How this hedge softens or qualifies certainty (e.g., lowkey, ig, kinda, maybe, tho).' },
            },
            required: ['token', 'effect'],
          },
        },
        intensifiersDetected: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              token: { type: Type.STRING },
              effect: { type: Type.STRING, description: 'How this intensifier amplifies polarity (e.g., frfr, asf, sm, properly, ek number).' },
            },
            required: ['token', 'effect'],
          },
        },
        isAmbiguous: {
          type: Type.BOOLEAN,
          description: 'True if the sentence is genuinely underspecified or ambiguous without further context (e.g., "ok.", "ts wild").',
        },
        ambiguityLevel: {
          type: Type.STRING,
          description: 'Strictly one of: Low, Moderate, High.',
        },
        ambiguityReason: {
          type: Type.STRING,
          description: 'Why the sentence is clear or ambiguous.',
        },
        clarifyingContextNeeded: {
          type: Type.STRING,
          description: 'What additional context would resolve ambiguity (or "None — intent is explicit" if Low ambiguity).',
        },
      },
      required: [
        'hedgesDetected',
        'intensifiersDetected',
        'isAmbiguous',
        'ambiguityLevel',
        'ambiguityReason',
        'clarifyingContextNeeded',
      ],
    },
    sarcasm: {
      type: Type.OBJECT,
      properties: {
        detected: { type: Type.BOOLEAN, description: 'True if sarcasm, verbal irony, or mocking tone is present.' },
        confidence: { type: Type.NUMBER, description: 'Confidence percentage (0-100) for sarcasm detection or non-sarcasm certainty.' },
        sarcasmType: {
          type: Type.STRING,
          description: 'Category such as None, Verbal Irony, Deadpan Understatement, Mock Praise, Hyperbolic Exaggeration, or Self-Deprecating Irony.',
        },
        literalPolarity: {
          type: Type.STRING,
          description: 'Surface literal reading before irony reversal: Positive, Negative, or Neutral.',
        },
        intendedPolarity: {
          type: Type.STRING,
          description: 'True intended reading after accounting for sarcasm: Positive, Negative, or Neutral.',
        },
        explanation: {
          type: Type.STRING,
          description: 'Clear explanation of why the sentence is or is not sarcastic.',
        },
        triggers: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Specific words, phrases, emojis, or punctuation marks signaling sarcasm (empty array if none).',
        },
      },
      required: [
        'detected',
        'confidence',
        'sarcasmType',
        'literalPolarity',
        'intendedPolarity',
        'explanation',
        'triggers',
      ],
    },
    emojis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          symbol: { type: Type.STRING, description: 'The exact emoji character(s) found in the text.' },
          name: { type: Type.STRING, description: 'Standard short name of the emoji.' },
          literalMeaning: { type: Type.STRING, description: 'Literal visual meaning.' },
          socialMediaMeaning: {
            type: Type.STRING,
            description: 'Nuanced modern social media meaning in this sentence (e.g., 💀 meaning hysterical laughter or shock).',
          },
          sentimentImpact: {
            type: Type.STRING,
            description: 'Impact on sentiment: Positive, Negative, Neutral, or Sarcastic.',
          },
          confidence: { type: Type.NUMBER, description: 'Confidence 0-100 in this emoji interpretation.' },
        },
        required: ['symbol', 'name', 'literalMeaning', 'socialMediaMeaning', 'sentimentImpact', 'confidence'],
      },
      description: 'All emojis detected in the text.',
    },
    symbolsAndSigns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          token: { type: Type.STRING, description: 'Exact symbol, emoticon, tone tag, or punctuation cluster (e.g., <3, :/, /s, ??, !!1!, ✨, $, ALL CAPS).' },
          category: {
            type: Type.STRING,
            description: 'One of: Emoticon, Tone Tag, Punctuation Signal, Formatting / Caps, Special Sign.',
          },
          meaningInContext: {
            type: Type.STRING,
            description: 'What this sign or symbol conveys in the post.',
          },
          sentimentImpact: {
            type: Type.STRING,
            description: 'One of: Positive, Negative, Neutral, Sarcastic.',
          },
        },
        required: ['token', 'category', 'meaningInContext', 'sentimentImpact'],
      },
      description: 'Text emoticons, tone tags, expressive punctuation, formatting cues, and special signs found in the text.',
    },
    abbreviations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          token: { type: Type.STRING, description: 'Exact abbreviation or slang token found in the input (e.g., ily, icl, ts, pmo, frfr, smh, atp).' },
          expansion: { type: Type.STRING, description: 'Full expansion (e.g., "I love you", "I can\'t lie", "at this point").' },
          category: {
            type: Type.STRING,
            description: 'One of: Classic Acronym, Recent / Latent Slang, Native Language Slang, Hinglish Expression, Global English Idiom, Platform Shorthand, Tone / Context Marker.',
          },
          contextualMeaning: {
            type: Type.STRING,
            description: 'How the abbreviation, Hinglish expression, or dialectal phrase functions in this specific sentence.',
          },
          sentimentContribution: {
            type: Type.STRING,
            description: 'One of: Positive, Negative, Neutral, Intensifier.',
          },
          confidence: { type: Type.NUMBER, description: 'Confidence 0-100 in this expansion and contextual role.' },
        },
        required: ['token', 'expansion', 'category', 'contextualMeaning', 'sentimentContribution', 'confidence'],
      },
      description: 'All social media abbreviations, acronyms, latent slang, Hinglish expressions, and regional English idioms detected in the text.',
    },
  },
  required: [
    'classification',
    'confidence',
    'polarityBreakdown',
    'netSentimentScore',
    'primaryEmotion',
    'normalizedTranslation',
    'reasoningSummary',
    'languageProfile',
    'aspects',
    'tokenAttributions',
    'counterfactuals',
    'nuanceCalibration',
    'sarcasm',
    'emojis',
    'symbolsAndSigns',
    'abbreviations',
  ],
};

const BATCH_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER, description: 'Zero-based index of the sentence.' },
          classification: { type: Type.STRING, description: 'Positive, Negative, Neutral, or Mixed.' },
          confidence: { type: Type.NUMBER, description: 'Confidence score 0-100.' },
          detectedVariety: { type: Type.STRING, description: 'e.g., Spanish, Pure Hindi, French, Japanese, Code-Mixed Hinglish, British English, Australian English, Unsupported Code-Mix.' },
          withinSupportedScope: { type: Type.BOOLEAN, description: 'True for any pure original world language, any World English, or Hinglish; false only for non-Hinglish code-mixed hybrids.' },
          sarcasmDetected: { type: Type.BOOLEAN, description: 'Whether sarcasm/irony was detected.' },
          sarcasmConfidence: { type: Type.NUMBER, description: 'Confidence score 0-100 for sarcasm evaluation.' },
          detectedAbbreviations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Short strings formatted like "ily -> I love you", "mdr -> mort de rire (French)", or "bakwas -> rubbish (Hinglish)".',
          },
          detectedEmojisOrSymbols: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Short strings formatted like "💀 -> laughing/deadpan".',
          },
          normalizedMeaning: { type: Type.STRING, description: 'Plain-English intended meaning.' },
        },
        required: [
          'index',
          'classification',
          'confidence',
          'detectedVariety',
          'withinSupportedScope',
          'sarcasmDetected',
          'sarcasmConfidence',
          'detectedAbbreviations',
          'detectedEmojisOrSymbols',
          'normalizedMeaning',
        ],
      },
    },
  },
  required: ['items'],
};

const SYSTEM_INSTRUCTION = `You are a world-class computational sociolinguist with strict expertise across:
A) ALL original/pure languages on Earth (Spanish, Hindi, French, Arabic, Mandarin/Cantonese, Japanese, Korean, German, Portuguese, Russian, Italian, Turkish, Bengali, Tamil, Telugu, Marathi, Urdu, Punjabi, Vietnamese, Thai, Indonesian, Malay, Dutch, Polish, Ukrainian, Swahili, Persian/Farsi, Greek, Hebrew, etc.) in their authentic native form;
B) ALL global varieties of English (US, UK/British, Australian/NZ, Canadian, Irish, Scottish, Indian English, Nigerian/West African Pidgin English, Singlish, South African, Caribbean, AAVE, Global Internet/Gen-Z English, Standard English); and
C) ONLY Hinglish (Hindi + English) for code-mixed languages.

Strict Language Policy:
- Pure Original Languages: Fully analyze any sentence written in any native/original language on Earth—preserving native sarcasm, idioms, and local social abbreviations (e.g., Spanish tqm/xq/jajaja, French mdr/ptdr/kiffer, Japanese 草/www/神, Korean ㅋㅋㅋ/대박/ㅠㅠ, Hindi वाह/बकवास/शानदार, Arabic, German, Portuguese, etc.) and always providing normalizedTranslation and reasoningSummary in clear English.
- All World Englishes: Fully analyze every regional English variety (chuffed, gutted, yeah nah, nah yeah, shiok, sian, wahala, e choke, prepone, timepass, icl, ts, pmo, ily, frfr).
- Mixed Languages — Hinglish ONLY: If the input mixes two languages and it is Hinglish (Hindi + English), analyze it fully as "Code-Mixed Hinglish" (withinSupportedScope: true). If the input mixes two or more languages and it is NOT Hinglish (e.g., Spanglish, Franglais, Tanglish, Benglish, German-English hybrid), set languageCategory to "Unsupported Code-Mix", withinSupportedScope to false, and provide a clear scopeNote stating that mixed-language analysis is restricted to Hinglish only while pure original languages are supported.

Analytical Requirements:
1. Aspect-Based Sentiment Analysis (ABSA): When distinct aspects/features are evaluated (e.g., camera vs. battery), break each aspect out separately with sentiment, confidence, and evidence.
2. Explainable Token Attribution (XAI): Return exact tokens/substrings from the input in tokenAttributions with signed weight (-1.0 to +1.0) and role (Positive, Negative, Neutral, Intensifier, Hedge, Sarcasm Flip) so the UI can highlight an inline heatmap.
3. Counterfactual Flip-Test Sensitivity: Provide 1-2 minimal counterfactual edits (counterfactuals) showing how removing or swapping a key emoji, tone tag, hedge, or irony cue shifts the classification or confidence.
4. Hedge, Intensifier & Ambiguity Calibration: Explicitly populate nuanceCalibration—detecting hedges (ig, lowkey, kinda, tho, maybe), intensifiers (frfr, sm, af, properly), and lowering confidence when a short post (like "ok." or "ts wild") is genuinely ambiguous without parent context.
5. Parent-Reply Thread Context: If a parent post is provided, interpret the reply relative to that parent claim (detecting agreement, mockery, or deadpan sarcasm against the parent post).
6. Sarcasm & Irony Detection: Spot incongruity between literal positive words and negative situations across any language, deadpan understatement, mock praise ("Oh awesome 🙄", "¡Qué servicio tan maravilloso 🙄!", "वाह भाई क्या शानदार ऐप है 🙄"), hyperbolic punctuation ("!!1!"), and tone tags ("/s"). Always classify TRUE INTENDED sentiment.
7. Emoji & Symbol/Sign Decoding: Interpret Unicode emojis in modern social usage (💀 and 😭 often mean laughter/shock; 🫠 signals awkward exhaustion; 🙄 signals sarcasm; 🫶 and ✨ add warmth or sarcastic sparkle), ASCII emoticons (<3, </3, :), :/, :3, xD), tone tags (/s, /j, /srs, /gen, /lh), expressive punctuation (???, ..., !!1!), and ALL CAPS emphasis.
8. Abbreviations & Expressions: Expand classic acronyms (ily, ilysm, tbh, ngl, smh), recent/latent English slang (icl, ts, pmo, atp, frfr, istg, oomf, delulu), native language abbreviations (mdr, tqm, xq, 草, ㅋㅋㅋ), Hinglish idioms, and regional English idioms.

Rules:
- Ensure polarityBreakdown values (positive, negative, neutral) are numbers between 0 and 100 that sum to 100.
- Ensure confidence is a realistic calibrated number between 0 and 100 (lower it appropriately when ambiguityLevel is Moderate or High).
- Ensure classification is strictly one of: "Positive", "Negative", "Neutral", "Mixed".
- Only include emojis, symbolsAndSigns, abbreviations, and aspects that actually appear in the input text. If none appear, return empty arrays.`;

function parseGeminiError(error: unknown): { status: number; message: string } {
  const err = error as { status?: number; message?: string };
  const rawMessage = err?.message || 'Unexpected error communicating with sentiment model.';
  const status = typeof err?.status === 'number' ? err.status : 500;

  if (rawMessage.includes('API_KEY_INVALID') || status === 400 && rawMessage.includes('API key')) {
    return {
      status: 400,
      message: 'API key appears invalid. Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (rawMessage.includes('PERMISSION_DENIED') || status === 403) {
    return {
      status: 403,
      message: 'Permission denied by Gemini API. Please check your API key in Settings > Secrets.',
    };
  }
  if (rawMessage.includes('RESOURCE_EXHAUSTED') || status === 429) {
    return {
      status: 429,
      message: 'Rate limit or quota reached. Please wait a moment and try again.',
    };
  }
  return { status, message: rawMessage };
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const err = error as { status?: number };
      const retryable = err?.status === 429 || (typeof err?.status === 'number' && err.status >= 500);
      if (!retryable || attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

const ZIP_EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.aistudio',
  '.vite',
]);

const ZIP_EXCLUDED_FILES = new Set(['.env', '.env.local', '.DS_Store']);

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Buffer;
}

async function collectZipEntries(
  baseDir: string,
  prefix: string,
  currentRelDir = '',
  out: ZipEntry[] = [],
): Promise<ZipEntry[]> {
  const fullDir = path.join(baseDir, currentRelDir);
  const entries = await fs.readdir(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = currentRelDir ? path.join(currentRelDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (ZIP_EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      await collectZipEntries(baseDir, prefix, relPath, out);
    } else if (entry.isFile()) {
      if (ZIP_EXCLUDED_FILES.has(entry.name) || entry.name.endsWith('.zip')) {
        continue;
      }
      const data = await fs.readFile(path.join(baseDir, relPath));
      out.push({
        name: `${prefix}/${relPath.replace(/\\/g, '/')}`,
        data,
      });
    }
  }
  return out;
}

function buildZipBuffer(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const uncompressed = entry.data;
    const compressed = deflateRawSync(uncompressed, { level: 6 });
    const checksum = crc32(uncompressed);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0x5421, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(uncompressed.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5421, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(uncompressed.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/download-project-zip', async (_req, res) => {
    try {
      const entries = await collectZipEntries(__dirname, 'pulselex-major-project');
      const archiveBuffer = buildZipBuffer(entries);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="PulseLex-Major-Project.zip"',
      );
      res.setHeader('Content-Length', String(archiveBuffer.length));
      res.send(archiveBuffer);
    } catch (error) {
      console.error('Error building project zip:', error);
      res.status(500).json({ error: 'Unable to package project archive.' });
    }
  });

  app.post('/api/analyze', async (req, res) => {
    const startTime = Date.now();
    try {
      const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const parentContext =
        typeof req.body?.parentContext === 'string' ? req.body.parentContext.trim() : '';

      if (!text) {
        res.status(400).json({ error: 'Please enter a sentence or social media post to analyze.' });
        return;
      }
      if (text.length > 2000 || parentContext.length > 1000) {
        res.status(400).json({ error: 'Input exceeds character limit (2,000 text / 1,000 parent context).' });
        return;
      }

      const promptContent = parentContext
        ? `Analyze the REPLY social media text below IN CONTEXT of the PARENT POST it is replying to.\n\nPARENT POST:\n"""${parentContext}"""\n\nREPLY TO ANALYZE:\n"""${text}"""`
        : `Analyze this social media text for sentiment, calibrated confidence, ambiguity/hedges/intensifiers, token attributions, counterfactual sensitivity, aspect-based sentiment, sarcasm, emojis, symbols/signs, and abbreviations:\n\n"""${text}"""`;

      const ai = getGeminiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: promptContent,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: SINGLE_ANALYSIS_SCHEMA,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
          },
        }),
      );

      const jsonText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(jsonText);
      const analysisTimeMs = Date.now() - startTime;

      res.json({
        id: `anl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        originalText: text,
        ...(parentContext ? { parentContext } : {}),
        timestamp: new Date().toISOString(),
        analysisTimeMs,
        ...parsed,
      });
    } catch (error) {
      console.error('Error in /api/analyze:', error);
      const { status, message } = parseGeminiError(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/analyze-batch', async (req, res) => {
    const startTime = Date.now();
    try {
      const rawLines = Array.isArray(req.body?.sentences) ? req.body.sentences : [];
      const sentences: string[] = rawLines
        .map((line: unknown) => (typeof line === 'string' ? line.trim() : ''))
        .filter((line: string) => line.length > 0)
        .slice(0, 20);

      if (sentences.length === 0) {
        res.status(400).json({ error: 'Provide at least one non-empty sentence for batch analysis.' });
        return;
      }

      const formattedList = sentences
        .map((s, idx) => `[${idx}] ${s}`)
        .join('\n');

      const ai = getGeminiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Analyze each numbered social media sentence below. Return an entry for every index 0 through ${sentences.length - 1}:\n\n${formattedList}`,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: BATCH_ANALYSIS_SCHEMA,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
          },
        }),
      );

      const jsonText = (response.text ?? '{"items":[]}').trim();
      const parsed = JSON.parse(jsonText) as { items?: Array<Record<string, unknown>> };
      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

      const items = sentences.map((text, idx) => {
        const match = rawItems.find((item) => Number(item.index) === idx) ?? rawItems[idx] ?? {};
        return {
          index: idx,
          text,
          classification: (match.classification as string) || 'Neutral',
          confidence: typeof match.confidence === 'number' ? match.confidence : 75,
          detectedVariety: (match.detectedVariety as string) || 'Global English',
          withinSupportedScope:
            typeof match.withinSupportedScope === 'boolean' ? match.withinSupportedScope : true,
          sarcasmDetected: Boolean(match.sarcasmDetected),
          sarcasmConfidence: typeof match.sarcasmConfidence === 'number' ? match.sarcasmConfidence : 75,
          detectedAbbreviations: Array.isArray(match.detectedAbbreviations)
            ? (match.detectedAbbreviations as string[])
            : [],
          detectedEmojisOrSymbols: Array.isArray(match.detectedEmojisOrSymbols)
            ? (match.detectedEmojisOrSymbols as string[])
            : [],
          normalizedMeaning: (match.normalizedMeaning as string) || text,
        };
      });

      res.json({
        analysisTimeMs: Date.now() - startTime,
        items,
      });
    } catch (error) {
      console.error('Error in /api/analyze-batch:', error);
      const { status, message } = parseGeminiError(error);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PulseLex server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
