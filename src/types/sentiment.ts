export type SentimentClass = 'Positive' | 'Negative' | 'Neutral' | 'Mixed';

export interface PolarityBreakdown {
  positive: number;
  negative: number;
  neutral: number;
}

export type LanguageCategory =
  | 'World English'
  | 'Original World Language'
  | 'Code-Mixed Hinglish'
  | 'Unsupported Code-Mix';

export interface LanguageProfile {
  detectedLanguage: string;
  detectedVariety: string;
  languageCategory: LanguageCategory;
  isHinglish: boolean;
  withinSupportedScope: boolean;
  scopeNote: string;
  confidence: number;
  regionalOrSlangMarkers: string[];
}

export interface AspectSentiment {
  aspect: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  confidence: number;
  evidence: string;
}

export type TokenRole =
  | 'Positive'
  | 'Negative'
  | 'Neutral'
  | 'Intensifier'
  | 'Hedge'
  | 'Sarcasm Flip';

export interface TokenAttribution {
  token: string;
  role: TokenRole;
  weight: number;
  reason: string;
}

export interface CounterfactualCase {
  modifiedText: string;
  changeDescription: string;
  predictedClassification: SentimentClass;
  predictedConfidence: number;
  confidenceDelta: number;
  impactSummary: string;
}

export interface NuanceCalibration {
  hedgesDetected: Array<{ token: string; effect: string }>;
  intensifiersDetected: Array<{ token: string; effect: string }>;
  isAmbiguous: boolean;
  ambiguityLevel: 'Low' | 'Moderate' | 'High';
  ambiguityReason: string;
  clarifyingContextNeeded: string;
}

export interface SarcasmAnalysis {
  detected: boolean;
  confidence: number;
  sarcasmType: string;
  literalPolarity: 'Positive' | 'Negative' | 'Neutral';
  intendedPolarity: 'Positive' | 'Negative' | 'Neutral';
  explanation: string;
  triggers: string[];
}

export interface EmojiInsight {
  symbol: string;
  name: string;
  literalMeaning: string;
  socialMediaMeaning: string;
  sentimentImpact: 'Positive' | 'Negative' | 'Neutral' | 'Sarcastic';
  confidence: number;
}

export interface SymbolSignInsight {
  token: string;
  category:
    | 'Emoticon'
    | 'Tone Tag'
    | 'Punctuation Signal'
    | 'Formatting / Caps'
    | 'Special Sign';
  meaningInContext: string;
  sentimentImpact: 'Positive' | 'Negative' | 'Neutral' | 'Sarcastic';
}

export interface AbbreviationInsight {
  token: string;
  expansion: string;
  category:
    | 'Classic Acronym'
    | 'Recent / Latent Slang'
    | 'Native Language Slang'
    | 'Hinglish Expression'
    | 'Global English Idiom'
    | 'Platform Shorthand'
    | 'Tone / Context Marker';
  contextualMeaning: string;
  sentimentContribution: 'Positive' | 'Negative' | 'Neutral' | 'Intensifier';
  confidence: number;
}

export interface SentimentAnalysisResult {
  id: string;
  originalText: string;
  parentContext?: string;
  timestamp: string;
  analysisTimeMs: number;
  classification: SentimentClass;
  confidence: number;
  polarityBreakdown: PolarityBreakdown;
  netSentimentScore: number;
  primaryEmotion: string;
  normalizedTranslation: string;
  reasoningSummary: string;
  languageProfile: LanguageProfile;
  aspects: AspectSentiment[];
  tokenAttributions?: TokenAttribution[];
  counterfactuals?: CounterfactualCase[];
  nuanceCalibration?: NuanceCalibration;
  sarcasm: SarcasmAnalysis;
  emojis: EmojiInsight[];
  symbolsAndSigns: SymbolSignInsight[];
  abbreviations: AbbreviationInsight[];
}

export interface BatchAnalysisItem {
  index: number;
  text: string;
  classification: SentimentClass;
  confidence: number;
  detectedVariety: string;
  withinSupportedScope: boolean;
  sarcasmDetected: boolean;
  sarcasmConfidence: number;
  detectedAbbreviations: string[];
  detectedEmojisOrSymbols: string[];
  normalizedMeaning: string;
}

export interface BatchAnalysisResponse {
  analysisTimeMs: number;
  items: BatchAnalysisItem[];
}
