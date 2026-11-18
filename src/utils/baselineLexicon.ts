import { SentimentClass } from '../types/sentiment';

const POSITIVE_LEXICON = new Set([
  'love',
  'loved',
  'loving',
  'awesome',
  'great',
  'good',
  'amazing',
  'excellent',
  'fantastic',
  'wonderful',
  'happy',
  'best',
  'brilliant',
  'nice',
  'cool',
  'enjoy',
  'enjoyed',
  'perfect',
  'blessed',
  'super',
  'fun',
  'helpful',
  'resolved',
  'thanks',
  'thank',
  'fire',
  'cute',
  'win',
]);

const NEGATIVE_LEXICON = new Set([
  'hate',
  'hated',
  'bad',
  'terrible',
  'awful',
  'worst',
  'horrible',
  'delay',
  'delayed',
  'crash',
  'crashed',
  'broken',
  'broke',
  'slow',
  'lag',
  'lagging',
  'angry',
  'sad',
  'annoying',
  'boring',
  'fail',
  'failed',
  'error',
  'issue',
  'problem',
  'disappointed',
  'trash',
  'useless',
  'poor',
  'cheap',
  'waiting',
]);

export interface NaiveLexiconResult {
  classification: SentimentClass;
  matchedPositive: string[];
  matchedNegative: string[];
  oovTokenCount: number;
  blindSpots: string[];
}

export function evaluateNaiveLexiconBaseline(text: string): NaiveLexiconResult {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const matchedPositive: string[] = [];
  const matchedNegative: string[] = [];

  for (const w of words) {
    if (POSITIVE_LEXICON.has(w)) {
      matchedPositive.push(w);
    } else if (NEGATIVE_LEXICON.has(w)) {
      matchedNegative.push(w);
    }
  }

  const posCount = matchedPositive.length;
  const negCount = matchedNegative.length;

  let classification: SentimentClass = 'Neutral';
  if (posCount > 0 && negCount > 0) {
    classification = posCount === negCount ? 'Mixed' : posCount > negCount ? 'Positive' : 'Negative';
  } else if (posCount > 0) {
    classification = 'Positive';
  } else if (negCount > 0) {
    classification = 'Negative';
  }

  const blindSpots: string[] = [];
  if (/🙄|💀|😭|🫠|🫶|✨|🔥/.test(text)) {
    blindSpots.push('Ignores emoji semantic shifts');
  }
  if (/\/s\b|\/j\b|\/srs\b|<3|<\/3|:\)|:\//.test(text)) {
    blindSpots.push('Strips ASCII signs & tone tags');
  }
  if (/\b(ily|ilysm|icl|ts|pmo|atp|fr|frfr|ngl|smh|iykyk|innit|gutted|chuffed|shiok|wahala|yaar|mast|bakwas|bekaar|jhakaas|bawal|kaand|faltu|sahi)\b/i.test(text)) {
    blindSpots.push('Treats Hinglish / regional idioms / slang as OOV');
  }

  const oovTokenCount = Math.max(0, words.length - posCount - negCount);

  return {
    classification,
    matchedPositive,
    matchedNegative,
    oovTokenCount,
    blindSpots,
  };
}
