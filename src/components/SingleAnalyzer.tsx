import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CornerDownRight,
  GitBranch,
  GitCompareArrows,
  Globe2,
  Hash,
  MessageSquareQuote,
  MinusCircle,
  RotateCcw,
  Scale,
  Send,
  Smile,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { KeyboardEvent, useEffect, useState } from 'react';
import { SAMPLE_PRESETS } from '../data/socialLexicon';
import {
  SentimentAnalysisResult,
  SentimentClass,
  TokenAttribution,
  TokenRole,
} from '../types/sentiment';
import { evaluateNaiveLexiconBaseline } from '../utils/baselineLexicon';

interface SingleAnalyzerProps {
  externalText?: string;
  externalTriggerId?: number;
  onResultCreated: (result: SentimentAnalysisResult) => void;
  selectedResult: SentimentAnalysisResult | null;
  onSelectResult: (result: SentimentAnalysisResult | null) => void;
}

function getSentimentVisuals(classification: SentimentClass) {
  switch (classification) {
    case 'Positive':
      return {
        textClass: 'text-emerald-700',
        surfaceClass: 'bg-emerald-50 border-emerald-200',
        barClass: 'bg-emerald-600',
        icon: TrendingUp,
      };
    case 'Negative':
      return {
        textClass: 'text-red-700',
        surfaceClass: 'bg-red-50 border-red-200',
        barClass: 'bg-red-600',
        icon: TrendingDown,
      };
    case 'Mixed':
      return {
        textClass: 'text-amber-700',
        surfaceClass: 'bg-amber-50 border-amber-200',
        barClass: 'bg-amber-500',
        icon: GitCompareArrows,
      };
    default:
      return {
        textClass: 'text-slate-700',
        surfaceClass: 'bg-slate-100 border-slate-200',
        barClass: 'bg-slate-500',
        icon: MinusCircle,
      };
  }
}

function getImpactTextClass(impact: string) {
  const normalized = impact.toLowerCase();
  if (normalized === 'positive') return 'text-emerald-700';
  if (normalized === 'negative') return 'text-red-700';
  if (normalized === 'sarcastic' || normalized === 'intensifier' || normalized === 'sarcasm flip') {
    return 'text-amber-700';
  }
  return 'text-slate-600';
}

function getTokenHighlightClass(role: TokenRole, isSelected: boolean) {
  const ring = isSelected ? 'ring-2 ring-slate-900/20' : '';
  switch (role) {
    case 'Positive':
      return `bg-emerald-50 text-emerald-900 border-b-2 border-emerald-500 ${ring}`;
    case 'Negative':
      return `bg-red-50 text-red-900 border-b-2 border-red-500 ${ring}`;
    case 'Sarcasm Flip':
      return `bg-amber-50 text-amber-900 border-b-2 border-amber-500 ${ring}`;
    case 'Intensifier':
      return `bg-blue-50 text-blue-900 border-b-2 border-blue-500 ${ring}`;
    case 'Hedge':
      return `bg-slate-100 text-slate-800 border-b-2 border-slate-400 ${ring}`;
    default:
      return `bg-slate-50 text-slate-800 border-b border-slate-300 ${ring}`;
  }
}

interface TextSegment {
  text: string;
  attribution?: TokenAttribution;
  attributionIndex?: number;
}

function buildAnnotatedSegments(
  originalText: string,
  attributions: TokenAttribution[],
): TextSegment[] {
  if (!attributions || attributions.length === 0) {
    return [{ text: originalText }];
  }

  const lowerText = originalText.toLowerCase();
  const matches: Array<{ start: number; end: number; attr: TokenAttribution; idx: number }> = [];
  let cursor = 0;

  attributions.forEach((attr, idx) => {
    const token = attr.token?.trim();
    if (!token) return;
    const lowerToken = token.toLowerCase();
    let foundAt = lowerText.indexOf(lowerToken, cursor);
    if (foundAt === -1) {
      foundAt = lowerText.indexOf(lowerToken);
    }
    if (foundAt !== -1) {
      const end = foundAt + token.length;
      const overlaps = matches.some((m) => !(end <= m.start || foundAt >= m.end));
      if (!overlaps) {
        matches.push({ start: foundAt, end, attr, idx });
        if (foundAt >= cursor) {
          cursor = end;
        }
      }
    }
  });

  matches.sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  let pos = 0;
  for (const m of matches) {
    if (m.start > pos) {
      segments.push({ text: originalText.slice(pos, m.start) });
    }
    segments.push({
      text: originalText.slice(m.start, m.end),
      attribution: m.attr,
      attributionIndex: m.idx,
    });
    pos = m.end;
  }
  if (pos < originalText.length) {
    segments.push({ text: originalText.slice(pos) });
  }
  return segments;
}

export function SingleAnalyzer({
  externalText,
  externalTriggerId,
  onResultCreated,
  selectedResult,
  onSelectResult,
}: SingleAnalyzerProps) {
  const [inputText, setInputText] = useState<string>('');
  const [parentContext, setParentContext] = useState<string>('');
  const [showParentContext, setShowParentContext] = useState<boolean>(false);
  const [activeTokenIdx, setActiveTokenIdx] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  async function runAnalysis(textToAnalyze: string, parentOverride?: string) {
    const trimmed = textToAnalyze.trim();
    const effectiveParent = (parentOverride !== undefined ? parentOverride : parentContext).trim();
    if (!trimmed) {
      setErrorMsg('Enter a sentence, post, or comment before running analysis.');
      return;
    }

    setErrorMsg(null);
    setActiveTokenIdx(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          ...(effectiveParent ? { parentContext: effectiveParent } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to analyze sentence.');
      }

      onSelectResult(data as SentimentAnalysisResult);
      onResultCreated(data as SentimentAnalysisResult);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach analysis service.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (externalText && externalTriggerId) {
      setInputText(externalText);
      void runAnalysis(externalText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTriggerId]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void runAnalysis(inputText);
    }
  };

  const handlePresetClick = (presetText: string) => {
    setInputText(presetText);
    setParentContext('');
    setShowParentContext(false);
    void runAnalysis(presetText, '');
  };

  const handleThreadDemoClick = () => {
    const demoParent = 'Just deployed straight to production on Friday at 5:30 PM without running tests!';
    const demoReply = 'sure buddy, that will definitely go smoothly 💀';
    setParentContext(demoParent);
    setShowParentContext(true);
    setInputText(demoReply);
    void runAnalysis(demoReply, demoParent);
  };

  const handleClear = () => {
    setInputText('');
    setParentContext('');
    setShowParentContext(false);
    setActiveTokenIdx(null);
    setErrorMsg(null);
    onSelectResult(null);
  };

  const sentimentVisual = selectedResult
    ? getSentimentVisuals(selectedResult.classification)
    : null;
  const SentimentIcon = sentimentVisual?.icon ?? CheckCircle2;

  const polarityMarkerPercent = selectedResult
    ? Math.max(2, Math.min(98, ((selectedResult.netSentimentScore + 1) / 2) * 100))
    : 50;

  return (
    <div className="space-y-6">
      {/* Input Composer Panel */}
      <section
        aria-label="Sentence Input"
        className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Analyze Any Custom Sentence
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Enter any sentence in any original world language (Spanish, Hindi, French, Arabic, Japanese, etc.), any English variety, or code-mixed Hinglish.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-400">
            {inputText.length} / 2000 chars · Ctrl/Cmd+Enter
          </span>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          maxLength={2000}
          placeholder="Type any sentence in Spanish, Hindi, French, Japanese, World English, or Hinglish (e.g. '¡Qué servicio tan maravilloso 🙄!' or 'Franchement j’ai trop kiffé mdr 🔥')"
          className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-colors resize-y"
          aria-label="Sentence to analyze"
        />

        {/* Optional Parent-Reply Thread Context */}
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowParentContext((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
              {showParentContext
                ? 'Hide Parent Post Context'
                : 'Add Parent Post / Thread Context (Optional)'}
            </button>

            <button
              type="button"
              onClick={handleThreadDemoClick}
              disabled={isLoading}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
            >
              Try Thread Reply Demo
            </button>
          </div>

          {showParentContext && (
            <div className="mt-2.5">
              <textarea
                value={parentContext}
                onChange={(e) => setParentContext(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Optional: paste the parent post or message this sentence is replying to..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-colors resize-y"
                aria-label="Optional parent post context"
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 mr-1">Quick examples:</span>
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset.text)}
                disabled={isLoading}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {(inputText.length > 0 || selectedResult) && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => void runAnalysis(inputText)}
              disabled={isLoading || !inputText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <Send className="w-3.5 h-3.5" />
              {isLoading ? 'Analyzing...' : 'Analyze Sentence'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="space-y-6" aria-busy="true" aria-label="Analyzing sentence">
          <div className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-8 w-48 bg-slate-200 rounded" />
              </div>
              <div className="h-10 w-36 bg-slate-200 rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
              <div className="h-16 bg-slate-100 rounded" />
              <div className="h-16 bg-slate-100 rounded" />
              <div className="h-16 bg-slate-100 rounded" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 h-56 animate-pulse">
              <div className="h-5 w-44 bg-slate-200 rounded mb-4" />
              <div className="h-4 w-full bg-slate-100 rounded mb-2" />
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 h-56 animate-pulse">
              <div className="h-5 w-48 bg-slate-200 rounded mb-4" />
              <div className="h-4 w-full bg-slate-100 rounded mb-2" />
              <div className="h-4 w-2/3 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !selectedResult && (
        <section className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="mx-auto max-w-xl">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Ready to decode social sentiment
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Enter any sentence in <span className="font-medium text-slate-800">any original world language</span> (Spanish, Hindi, French, Japanese, Korean, Arabic, German, etc.), <span className="font-medium text-slate-800">all Global Englishes</span>, or <span className="font-medium text-slate-800">Hinglish</span> (the sole mixed-language mode) to inspect calibrated confidence scores, aspect sentiments, sarcasm reversal, emojis, signs, and abbreviations.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => handlePresetClick(SAMPLE_PRESETS[0].text)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Run Sarcasm &amp; Emoji Example
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Result State */}
      {!isLoading && selectedResult && sentimentVisual && (
        <div className="space-y-6">
          {selectedResult.languageProfile &&
            selectedResult.languageProfile.withinSupportedScope === false && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Non-Hinglish Code-Mix Detected:</span>{' '}
                  {selectedResult.languageProfile.scopeNote ||
                    'Mixed-language analysis is restricted to Hinglish only. Pure original world languages and all World Englishes are fully supported.'}
                </div>
              </div>
            )}

          {/* Primary Verdict & Probability Calibration */}
          <section
            aria-label="Sentiment Verdict"
            className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Overall Classification</span>
                  <span aria-hidden="true">·</span>
                  <span>Primary Tone: {selectedResult.primaryEmotion}</span>
                  {selectedResult.languageProfile && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <Globe2 className="w-3 h-3 text-slate-400" />
                        {selectedResult.languageProfile.detectedVariety} (
                        <span className="font-mono tabular-nums">
                          {selectedResult.languageProfile.confidence.toFixed(0)}%
                        </span>
                        )
                      </span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {selectedResult.analysisTimeMs} ms
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${sentimentVisual.surfaceClass} ${sentimentVisual.textClass}`}
                  >
                    <SentimentIcon className="w-5 h-5 shrink-0" />
                    <span className="font-display text-xl font-bold tracking-tight">
                      {selectedResult.classification}
                    </span>
                  </div>

                  {selectedResult.sarcasm.detected && (
                    <span className="text-sm font-medium text-amber-700">
                      Sarcasm Adjusted ({selectedResult.sarcasm.literalPolarity} literal →{' '}
                      {selectedResult.sarcasm.intendedPolarity} intended)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-baseline gap-6 lg:text-right">
                <div>
                  <span className="block text-xs text-slate-500">Confidence Score</span>
                  <span className="font-mono text-3xl font-semibold tabular-nums text-slate-900">
                    {selectedResult.confidence.toFixed(1)}%
                  </span>
                </div>
                <div className="pl-6 border-l border-slate-200">
                  <span className="block text-xs text-slate-500">Net Polarity</span>
                  <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
                    {selectedResult.netSentimentScore >= 0 ? '+' : ''}
                    {selectedResult.netSentimentScore.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Polarity Probability Bars + Net Scale */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-5 border-b border-slate-100">
              <div className="lg:col-span-7 space-y-3">
                <h3 className="text-xs font-medium text-slate-500">
                  Class Confidence Distribution
                </h3>
                {[
                  {
                    label: 'Positive',
                    value: selectedResult.polarityBreakdown.positive,
                    color: 'bg-emerald-600',
                    text: 'text-emerald-700',
                  },
                  {
                    label: 'Negative',
                    value: selectedResult.polarityBreakdown.negative,
                    color: 'bg-red-600',
                    text: 'text-red-700',
                  },
                  {
                    label: 'Neutral',
                    value: selectedResult.polarityBreakdown.neutral,
                    color: 'bg-slate-500',
                    text: 'text-slate-700',
                  },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-12 items-center gap-3">
                    <span className={`col-span-3 sm:col-span-2 text-xs font-medium ${row.text}`}>
                      {row.label}
                    </span>
                    <div className="col-span-7 sm:col-span-8 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-300`}
                        style={{ width: `${Math.max(0, Math.min(100, row.value))}%` }}
                      />
                    </div>
                    <span className="col-span-2 text-right font-mono text-xs tabular-nums font-medium text-slate-700">
                      {row.value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-5 flex flex-col justify-between lg:pl-6 lg:border-l lg:border-slate-100">
                <div>
                  <h3 className="text-xs font-medium text-slate-500">
                    Polarity Spectrum (-1.00 to +1.00)
                  </h3>
                  <div className="mt-4 relative h-2.5 rounded-full bg-gradient-to-r from-red-500 via-slate-300 to-emerald-500">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow-sm"
                      style={{ left: `${polarityMarkerPercent}%` }}
                      title={`Net Polarity: ${selectedResult.netSentimentScore.toFixed(2)}`}
                    />
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-slate-400">
                    <span>-1.00 Negative</span>
                    <span>0.00</span>
                    <span>+1.00 Positive</span>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                  {selectedResult.reasoningSummary}
                </p>
              </div>
            </div>

            {/* Normalized Plain-English Translation */}
            <div className="pt-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                {selectedResult.parentContext && (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Replying to:</span> “
                    {selectedResult.parentContext}”
                  </p>
                )}
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                    <MessageSquareQuote className="w-3.5 h-3.5 text-slate-400" />
                    <span>Decoded Plain-English Meaning</span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-900 font-medium leading-relaxed">
                    “{selectedResult.normalizedTranslation}”
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const summary = [
                    ...(selectedResult.parentContext
                      ? [`Parent Post: ${selectedResult.parentContext}`]
                      : []),
                    `Input: ${selectedResult.originalText}`,
                    `Classification: ${selectedResult.classification} (${selectedResult.confidence.toFixed(1)}% confidence)`,
                    `Breakdown: Pos ${selectedResult.polarityBreakdown.positive.toFixed(1)}% / Neg ${selectedResult.polarityBreakdown.negative.toFixed(1)}% / Neu ${selectedResult.polarityBreakdown.neutral.toFixed(1)}%`,
                    `Sarcasm: ${selectedResult.sarcasm.detected ? `Detected (${selectedResult.sarcasm.confidence.toFixed(1)}%) — ${selectedResult.sarcasm.explanation}` : `Not detected (${selectedResult.sarcasm.confidence.toFixed(1)}% conf.)`}`,
                    `Decoded Meaning: ${selectedResult.normalizedTranslation}`,
                  ].join('\n');
                  try {
                    await navigator.clipboard.writeText(summary);
                    setCopiedSummary(true);
                    setTimeout(() => setCopiedSummary(false), 1800);
                  } catch {
                    // Ignore clipboard permission errors
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied Summary
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Summary
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Explainable Token Attribution Heatmap (XAI) */}
          {selectedResult.tokenAttributions && selectedResult.tokenAttributions.length > 0 && (() => {
            const attributions = selectedResult.tokenAttributions!;
            const segments = buildAnnotatedSegments(selectedResult.originalText, attributions);
            const activeAttr =
              activeTokenIdx !== null ? attributions[activeTokenIdx] : attributions[0];

            return (
              <section
                aria-label="Explainable Token Attribution Heatmap"
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      Inline Token Attribution Heatmap (XAI)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click any highlighted word, emoji, or abbreviation to inspect its directional weight
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="border-b-2 border-emerald-500 pb-0.5 text-slate-700">Positive</span>
                    <span className="border-b-2 border-red-500 pb-0.5 text-slate-700">Negative</span>
                    <span className="border-b-2 border-amber-500 pb-0.5 text-slate-700">Sarcasm Flip</span>
                    <span className="border-b-2 border-blue-500 pb-0.5 text-slate-700">Intensifier</span>
                    <span className="border-b-2 border-slate-400 pb-0.5 text-slate-700">Hedge</span>
                  </div>
                </div>

                <div className="py-5 border-b border-slate-100">
                  <p className="text-base sm:text-lg leading-loose text-slate-900 break-words">
                    {segments.map((seg, i) =>
                      seg.attribution && seg.attributionIndex !== undefined ? (
                        <button
                          key={`${seg.text}-${i}`}
                          type="button"
                          onClick={() => setActiveTokenIdx(seg.attributionIndex!)}
                          className={`inline px-1 py-0.5 mx-0.5 rounded-xs font-medium transition-colors cursor-pointer ${getTokenHighlightClass(
                            seg.attribution.role,
                            activeTokenIdx === seg.attributionIndex,
                          )}`}
                        >
                          {seg.text}
                        </button>
                      ) : (
                        <span key={`plain-${i}`}>{seg.text}</span>
                      ),
                    )}
                  </p>

                  {activeAttr && (
                    <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                      <div>
                        <span className="font-mono font-semibold text-slate-900">
                          {activeAttr.token}
                        </span>
                        <span className="mx-2 text-slate-300">·</span>
                        <span className={`font-semibold ${getImpactTextClass(activeAttr.role)}`}>
                          {activeAttr.role}
                        </span>
                        <span className="mx-2 text-slate-300">—</span>
                        <span>{activeAttr.reason}</span>
                      </div>
                      <span className="font-mono tabular-nums font-semibold text-slate-800 shrink-0">
                        weight {activeAttr.weight >= 0 ? '+' : ''}
                        {activeAttr.weight.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5 text-xs">
                  {attributions.map((attr, idx) => (
                    <button
                      key={`${attr.token}-${idx}`}
                      type="button"
                      onClick={() => setActiveTokenIdx(idx)}
                      className="flex items-baseline justify-between gap-2 py-1 text-left hover:bg-slate-50 rounded px-1.5 -mx-1.5 transition-colors"
                    >
                      <span className="font-mono font-medium text-slate-900 truncate">
                        {attr.token}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className={getImpactTextClass(attr.role)}>{attr.role}</span>
                        <span className="font-mono tabular-nums text-slate-500">
                          {attr.weight >= 0 ? '+' : ''}
                          {attr.weight.toFixed(2)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Counterfactual Flip-Test & Hedge/Ambiguity Calibration */}
          {(selectedResult.counterfactuals?.length || selectedResult.nuanceCalibration) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
              {/* Counterfactual Flip-Test Sensitivity */}
              <section
                aria-label="Counterfactual Flip-Test Sensitivity"
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col"
              >
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      Counterfactual “Flip-Test” Sensitivity
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Shows how minimal token edits shift classification or confidence
                    </p>
                  </div>
                  <GitBranch className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                </div>

                {!selectedResult.counterfactuals || selectedResult.counterfactuals.length === 0 ? (
                  <p className="py-6 text-xs text-slate-400">
                    No counterfactual perturbations generated for this analysis.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 mt-2">
                    {selectedResult.counterfactuals.map((cf, idx) => (
                      <div key={`cf-${idx}`} className="py-3.5 first:pt-2 last:pb-0 space-y-1.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-800">
                            {cf.changeDescription}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-slate-600">
                            → <span className="font-semibold text-slate-900">{cf.predictedClassification}</span> (
                            {cf.predictedConfidence.toFixed(0)}%,{' '}
                            {cf.confidenceDelta >= 0 ? '+' : ''}
                            {cf.confidenceDelta.toFixed(1)}%)
                          </span>
                        </div>
                        <p className="font-mono text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                          {cf.modifiedText}
                        </p>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs text-slate-500 leading-relaxed flex-1">
                            {cf.impactSummary}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setInputText(cf.modifiedText);
                              void runAnalysis(cf.modifiedText);
                            }}
                            disabled={isLoading}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap shrink-0"
                          >
                            Test Live
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Hedge, Intensifier & Ambiguity Calibration */}
              <section
                aria-label="Hedge, Intensifier and Ambiguity Calibration"
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-display text-base font-semibold text-slate-900">
                        Hedges, Intensifiers &amp; Ambiguity Calibration
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Measures certainty qualifiers and flags underspecified inputs
                      </p>
                    </div>
                    <Scale className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  </div>

                  {selectedResult.nuanceCalibration ? (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                        <div>
                          <span className="block text-xs text-slate-400">Ambiguity Level</span>
                          <span
                            className={`mt-1 block text-sm font-semibold ${
                              selectedResult.nuanceCalibration.ambiguityLevel === 'High'
                                ? 'text-red-700'
                                : selectedResult.nuanceCalibration.ambiguityLevel === 'Moderate'
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {selectedResult.nuanceCalibration.ambiguityLevel}
                            {selectedResult.nuanceCalibration.isAmbiguous ? ' (Underspecified)' : ' (Explicit)'}
                          </span>
                        </div>
                        <div className="pl-4 border-l border-slate-100">
                          <span className="block text-xs text-slate-400">Modifiers Found</span>
                          <span className="mt-1 block font-mono text-sm tabular-nums font-semibold text-slate-900">
                            {selectedResult.nuanceCalibration.hedgesDetected.length} hedges ·{' '}
                            {selectedResult.nuanceCalibration.intensifiersDetected.length} intensifiers
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        {selectedResult.nuanceCalibration.hedgesDetected.length > 0 && (
                          <div>
                            <span className="font-semibold text-slate-800">Hedges: </span>
                            <span className="text-slate-600">
                              {selectedResult.nuanceCalibration.hedgesDetected
                                .map((h) => `${h.token} (${h.effect})`)
                                .join(' · ')}
                            </span>
                          </div>
                        )}
                        {selectedResult.nuanceCalibration.intensifiersDetected.length > 0 && (
                          <div>
                            <span className="font-semibold text-slate-800">Intensifiers: </span>
                            <span className="text-slate-600">
                              {selectedResult.nuanceCalibration.intensifiersDetected
                                .map((it) => `${it.token} (${it.effect})`)
                                .join(' · ')}
                            </span>
                          </div>
                        )}
                        <p className="text-slate-600 leading-relaxed">
                          <span className="font-semibold text-slate-800">Calibration note: </span>
                          {selectedResult.nuanceCalibration.ambiguityReason}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="py-6 text-xs text-slate-400">
                      Nuance calibration metadata is not available on this older saved record.
                    </p>
                  )}
                </div>

                {selectedResult.nuanceCalibration && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Clarifying context needed: </span>
                    {selectedResult.nuanceCalibration.clarifyingContextNeeded}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Aspect-Based Sentiment + Baseline Lexicon Comparison */}
          {(() => {
            const baseline = evaluateNaiveLexiconBaseline(selectedResult.originalText);
            const aspects = selectedResult.aspects ?? [];
            const markers = selectedResult.languageProfile?.regionalOrSlangMarkers ?? [];
            return (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                {/* Aspect-Based Sentiment & Dialect Markers */}
                <section
                  aria-label="Aspect-Based Sentiment and Dialect Profile"
                  className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="font-display text-base font-semibold text-slate-900">
                          Aspect-Based Breakdown &amp; Dialect Scope
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Evaluates individual targets separately across Global Englishes &amp; Hinglish
                        </p>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-slate-500 shrink-0">
                        {aspects.length} aspects
                      </span>
                    </div>

                    {aspects.length === 0 ? (
                      <p className="py-5 text-xs text-slate-400">
                        Sentence expresses a unified overall sentiment without separate product/topic aspects.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 mt-2">
                        {aspects.map((asp, idx) => (
                          <div key={`${asp.aspect}-${idx}`} className="py-3 first:pt-2 last:pb-0">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-sm font-semibold text-slate-900">
                                {asp.aspect}
                              </span>
                              <div className="flex items-center gap-2 text-xs shrink-0">
                                <span className={`font-semibold ${getImpactTextClass(asp.sentiment)}`}>
                                  {asp.sentiment}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="font-mono tabular-nums text-slate-600">
                                  {asp.confidence.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              Evidence: “{asp.evidence}”
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedResult.languageProfile && (
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <span className="block text-xs font-medium text-slate-500 mb-1">
                        Language:{' '}
                        {selectedResult.languageProfile.detectedLanguage ||
                          selectedResult.languageProfile.detectedVariety}{' '}
                        · {selectedResult.languageProfile.detectedVariety}
                        {selectedResult.languageProfile.languageCategory
                          ? ` (${selectedResult.languageProfile.languageCategory})`
                          : ''}
                      </span>
                      {markers.length > 0 ? (
                        <p className="font-mono text-xs text-slate-700">
                          Markers: {markers.join('  ·  ')}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">
                          Standard phrasing without regional or slang markers.
                        </p>
                      )}
                    </div>
                  )}
                </section>

                {/* Live Naive Lexicon Baseline vs. PulseLex Comparison */}
                <section
                  aria-label="Baseline Lexicon Comparison"
                  className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="font-display text-base font-semibold text-slate-900">
                          Baseline Lexicon vs. PulseLex
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Live comparison against a standard English word-matching baseline
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold shrink-0 ${
                          baseline.classification !== selectedResult.classification
                            ? 'text-blue-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {baseline.classification !== selectedResult.classification
                          ? 'Baseline Outperformed'
                          : 'Verdicts Aligned'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100">
                      <div>
                        <span className="block text-xs text-slate-400">Classic Word Lexicon</span>
                        <span className="mt-1 block font-display text-lg font-bold text-slate-700">
                          {baseline.classification}
                        </span>
                        <span className="mt-0.5 block font-mono text-xs tabular-nums text-slate-500">
                          +{baseline.matchedPositive.length} pos / -{baseline.matchedNegative.length} neg · {baseline.oovTokenCount} OOV
                        </span>
                      </div>
                      <div className="pl-4 border-l border-slate-100">
                        <span className="block text-xs text-slate-400">PulseLex Contextual</span>
                        <span className={`mt-1 block font-display text-lg font-bold ${sentimentVisual.textClass}`}>
                          {selectedResult.classification}
                        </span>
                        <span className="mt-0.5 block font-mono text-xs tabular-nums text-slate-600">
                          {selectedResult.confidence.toFixed(1)}% calibrated conf.
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                      <p>
                        <span className="font-medium text-slate-800">Lexicon word hits:</span>{' '}
                        {[...baseline.matchedPositive.map((w) => `+${w}`), ...baseline.matchedNegative.map((w) => `-${w}`)].join(', ') ||
                          'None (0 standard English polarity hits)'}
                      </p>
                      {baseline.blindSpots.length > 0 && (
                        <p>
                          <span className="font-medium text-amber-700">Baseline blind spots:</span>{' '}
                          {baseline.blindSpots.join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            );
          })()}

          {/* Two-Column Deep Linguistics: Sarcasm Inspector + Abbreviations Decoder */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
            {/* Sarcasm & Irony Inspector */}
            <section
              aria-label="Sarcasm Analysis"
              className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      Sarcasm &amp; Irony Detection
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Evaluates incongruity, mock praise, deadpan tone, and irony markers
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`block text-xs font-semibold ${
                        selectedResult.sarcasm.detected ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {selectedResult.sarcasm.detected ? 'Sarcasm Detected' : 'Sincere / Literal'}
                    </span>
                    <span className="font-mono text-sm tabular-nums font-semibold text-slate-900">
                      {selectedResult.sarcasm.confidence.toFixed(1)}% conf.
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 py-3 border-b border-slate-100 text-xs">
                  <div>
                    <span className="block text-slate-400">Pattern</span>
                    <span className="font-medium text-slate-900 mt-0.5 block">
                      {selectedResult.sarcasm.sarcasmType}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Literal Reading</span>
                    <span className="font-medium text-slate-900 mt-0.5 block">
                      {selectedResult.sarcasm.literalPolarity}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Intended Polarity</span>
                    <span className="font-medium text-slate-900 mt-0.5 block">
                      {selectedResult.sarcasm.intendedPolarity}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-700 leading-relaxed">
                  {selectedResult.sarcasm.explanation}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <span className="block text-xs font-medium text-slate-500 mb-1.5">
                  Detected Irony Signals
                </span>
                {selectedResult.sarcasm.triggers.length > 0 ? (
                  <p className="font-mono text-xs text-slate-800 leading-relaxed">
                    {selectedResult.sarcasm.triggers.join('  ·  ')}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    No ironic contrast or sarcasm markers observed in this sentence.
                  </p>
                )}
              </div>
            </section>

            {/* Recent & Latent Abbreviations Decoder */}
            <section
              aria-label="Abbreviation and Slang Analysis"
              className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col"
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Latent Abbreviations &amp; Slang
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Expands classic acronyms and emerging social shorthand in context
                  </p>
                </div>
                <span className="font-mono text-xs tabular-nums text-slate-500 shrink-0">
                  {selectedResult.abbreviations.length} detected
                </span>
              </div>

              {selectedResult.abbreviations.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-8 text-center">
                  <p className="text-sm text-slate-400 max-w-xs">
                    No social abbreviations or shorthand tokens detected in this sentence.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 mt-2">
                  {selectedResult.abbreviations.map((abbr, idx) => (
                    <div key={`${abbr.token}-${idx}`} className="py-3 first:pt-2 last:pb-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            {abbr.token}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            →
                          </span>
                          <span className="text-sm font-medium text-blue-700 truncate">
                            {abbr.expansion}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          <span className={`font-medium ${getImpactTextClass(abbr.sentimentContribution)}`}>
                            {abbr.sentimentContribution}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="font-mono tabular-nums text-slate-500">
                            {abbr.confidence.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        {abbr.category} — {abbr.contextualMeaning}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Emoji & Symbol/Sign Decoder */}
          <section
            aria-label="Emoji and Symbol Insights"
            className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Emojis, Emoticons &amp; Symbol Signs
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Separates literal glyphs from modern social media subtext and punctuation signals
                </p>
              </div>
              <span className="font-mono text-xs tabular-nums text-slate-500">
                {selectedResult.emojis.length} emojis · {selectedResult.symbolsAndSigns.length} symbols/signs
              </span>
            </div>

            {selectedResult.emojis.length === 0 && selectedResult.symbolsAndSigns.length === 0 ? (
              <p className="py-6 text-sm text-slate-400 text-center">
                No emojis, ASCII emoticons, tone tags, or expressive symbols found in this text.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5">
                {/* Emojis Column */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-3">
                    <Smile className="w-3.5 h-3.5 text-slate-400" />
                    <span>Unicode Emojis</span>
                  </div>
                  {selectedResult.emojis.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No Unicode emojis detected.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {selectedResult.emojis.map((em, idx) => (
                        <div key={`${em.symbol}-${idx}`} className="py-3 flex items-start gap-3">
                          <span className="text-2xl leading-none shrink-0 mt-0.5" role="img" aria-label={em.name}>
                            {em.symbol}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900 truncate">
                                {em.name}
                              </span>
                              <span className="text-xs shrink-0">
                                <span className={`font-medium ${getImpactTextClass(em.sentimentImpact)}`}>
                                  {em.sentimentImpact}
                                </span>
                                <span className="text-slate-300 mx-1.5">·</span>
                                <span className="font-mono tabular-nums text-slate-500">
                                  {em.confidence.toFixed(0)}%
                                </span>
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                              {em.socialMediaMeaning}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              Literal: {em.literalMeaning}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Symbols, Emoticons & Tone Signs Column */}
                <div className="lg:pl-6 lg:border-l lg:border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-3">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>Symbols, Emoticons &amp; Signs</span>
                  </div>
                  {selectedResult.symbolsAndSigns.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">
                      No expressive symbols, emoticons, or tone tags detected.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {selectedResult.symbolsAndSigns.map((sym, idx) => (
                        <div key={`${sym.token}-${idx}`} className="py-3">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="font-mono text-sm font-semibold text-slate-900">
                                {sym.token}
                              </span>
                              <span className="text-xs text-slate-400 truncate">
                                {sym.category}
                              </span>
                            </div>
                            <span className={`text-xs font-medium shrink-0 ${getImpactTextClass(sym.sentimentImpact)}`}>
                              {sym.sentimentImpact}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                            {sym.meaningInContext}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
