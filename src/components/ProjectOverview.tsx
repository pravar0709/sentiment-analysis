import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Download,
  FileText,
  Layers,
  MessageSquareText,
} from 'lucide-react';
import { SentimentAnalysisResult } from '../types/sentiment';

interface ProjectOverviewProps {
  history: SentimentAnalysisResult[];
  isDownloadingZip: boolean;
  onDownloadZip: () => void;
  onOpenAnalyzer: () => void;
  onOpenBatch: () => void;
}

const PIPELINE_STAGES = [
  {
    step: '01',
    title: 'Multilingual & Thread Input',
    detail: 'Accepts any original world language, all World Englishes, or Hinglish, with optional parent-post thread context.',
  },
  {
    step: '02',
    title: 'Scope Gate & Token XAI',
    detail: 'Enforces Hinglish-only mixing policy, extracts slang/emojis, and scores inline token attribution weights (-1 to +1).',
  },
  {
    step: '03',
    title: 'Irony, ABSA & Hedges',
    detail: 'Splits multi-topic aspects (ABSA), resolves sarcasm flips, and calibrates hedges, intensifiers, and ambiguity.',
  },
  {
    step: '04',
    title: 'Counterfactuals & Baseline',
    detail: 'Runs flip-test sensitivity perturbations alongside a live deterministic word-lexicon baseline contrast.',
  },
];

const GAP_COMPARISON = [
  {
    challenge: 'Original World Languages',
    sample: '"¡Qué servicio tan maravilloso 🙄!" / "वाह शानदार ऐप है 💀"',
    baseline: 'Neutral / 0 OOV hits (English-only lexicon)',
    pulselex: 'Negative — native sarcasm & inline token flip XAI',
  },
  {
    challenge: 'Global English Dialects',
    sample: '"yeah nah mate properly chuffed, battery gutted :/"',
    baseline: 'Neutral / Wrong (misses UK & AU idioms)',
    pulselex: 'Mixed — Audio: Positive, Battery: Negative (ABSA)',
  },
  {
    challenge: 'Hinglish-Only Code-Mixing',
    sample: '"yaar camera mast hai par battery bakwas pmo fr 💀"',
    baseline: 'Neutral / OOV (skips Hinglish & slang)',
    pulselex: 'Mixed/Negative — splits aspects, expands pmo/fr & tests counterfactuals',
  },
  {
    challenge: 'Hedged & Thread Replies',
    sample: 'Reply: "yeah sure ok ig 🙄" (to parent deployment post)',
    baseline: 'Positive / Neutral (misses parent thread & hedge)',
    pulselex: 'Negative — resolves parent context, hedge (ig) & sarcasm flip',
  },
];

export function ProjectOverview({
  history,
  isDownloadingZip,
  onDownloadZip,
  onOpenAnalyzer,
  onOpenBatch,
}: ProjectOverviewProps) {
  const totalAnalyzed = history.length;
  const sarcasticCount = history.filter((item) => item.sarcasm.detected).length;
  const abbrCount = history.reduce((acc, item) => acc + item.abbreviations.length, 0);
  const emojiSymbolCount = history.reduce(
    (acc, item) => acc + item.emojis.length + item.symbolsAndSigns.length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Project Hero & Faculty Submission Summary */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Major Project Presentation</span>
              <span aria-hidden="true">·</span>
              <span>Natural Language Processing &amp; Social Computing</span>
              <span aria-hidden="true">·</span>
              <span>Full-Stack Web System</span>
            </div>

            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              PulseLex: Original World Languages, Global Englishes &amp; Hinglish Engine
            </h2>

            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Built for academic evaluation and real-world NLP, PulseLex analyzes any sentence across every original world language (Spanish, Hindi, French, Arabic, Japanese, Korean, German, etc.), all Global English varieties, and Hinglish (the sole supported mixed-language mode)—delivering aspect-level sentiments, calibrated confidence, sarcasm reversal, and a live baseline comparison.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onDownloadZip}
              disabled={isDownloadingZip}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isDownloadingZip ? 'Packaging ZIP...' : 'Download Full Project (.ZIP)'}
            </button>
            <button
              type="button"
              onClick={onOpenAnalyzer}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <MessageSquareText className="w-4 h-4" />
              Live Custom Sentence Demo
            </button>
          </div>
        </div>

        {/* Live Session Telemetry (Strictly computed from actual session analyses) */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <span className="block text-xs text-slate-500">Live Sentences Analyzed</span>
            <span className="mt-1 block font-mono text-2xl font-semibold tabular-nums text-slate-900">
              {totalAnalyzed}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500">Sarcasm Cases Caught</span>
            <span className="mt-1 block font-mono text-2xl font-semibold tabular-nums text-amber-700">
              {sarcasticCount}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500">Abbreviations Decoded</span>
            <span className="mt-1 block font-mono text-2xl font-semibold tabular-nums text-blue-700">
              {abbrCount}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500">Emojis &amp; Signs Parsed</span>
            <span className="mt-1 block font-mono text-2xl font-semibold tabular-nums text-emerald-700">
              {emojiSymbolCount}
            </span>
          </div>
        </div>
      </section>

      {/* 4-Stage Pipeline Architecture */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              System Processing Pipeline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              End-to-end architecture from raw user input to structured linguistic attribution
            </p>
          </div>
          <Cpu className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {PIPELINE_STAGES.map((stage) => (
            <div
              key={stage.step}
              className="border border-slate-200 rounded-lg p-4 bg-slate-50/50"
            >
              <span className="font-mono text-xs font-semibold text-blue-600 tabular-nums">
                Stage {stage.step}
              </span>
              <h4 className="mt-1.5 font-display text-sm font-semibold text-slate-900">
                {stage.title}
              </h4>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {stage.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparative Evaluation Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Comparative Gap Analysis: Baseline Lexicons vs. PulseLex
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Key linguistic phenomena motivating context-aware sentiment classification
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenBatch}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap shrink-0"
          >
            <Layers className="w-3.5 h-3.5" />
            Test Dataset Upload
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 pl-6 pr-3 whitespace-nowrap">Linguistic Challenge</th>
                <th className="py-3 px-3 min-w-[220px]">Illustrative Input</th>
                <th className="py-3 px-3 min-w-[200px]">Static Lexicon Limitation</th>
                <th className="py-3 pl-3 pr-6 min-w-[240px]">PulseLex Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {GAP_COMPARISON.map((row) => (
                <tr key={row.challenge} className="hover:bg-slate-50/60">
                  <td className="py-3.5 pl-6 pr-3 font-medium text-slate-900 whitespace-nowrap align-top">
                    {row.challenge}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs text-slate-700 align-top">
                    {row.sample}
                  </td>
                  <td className="py-3.5 px-3 text-xs text-red-700 align-top">
                    {row.baseline}
                  </td>
                  <td className="py-3.5 pl-3 pr-6 text-xs text-emerald-700 font-medium align-top">
                    {row.pulselex}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Submission Package Contents */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Included in Faculty Submission ZIP Archive
            </h3>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              Downloading the project archive packages the complete full-stack source code along with academic documentation ready for faculty review and local execution:
            </p>
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Complete React + TypeScript + Express source code</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>README.md with architecture diagram &amp; setup steps</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>PROJECT_REPORT_OUTLINE.md with Viva Q&amp;A chapters</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Clean .env.example template (secrets excluded)</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
