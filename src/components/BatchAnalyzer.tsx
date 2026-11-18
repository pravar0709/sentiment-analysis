import {
  AlertCircle,
  Download,
  GitCompareArrows,
  Layers,
  MinusCircle,
  Search,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { BatchAnalysisItem, BatchAnalysisResponse, SentimentClass } from '../types/sentiment';

const SAMPLE_BATCH_FEED = [
  '¡Qué servicio tan maravilloso, 2 horas esperando 🙄 /s',
  'वाह भाई, क्या शानदार ऐप बनाया है, हर मिनट क्रैश हो रहा है 💀',
  'Franchement ce film était une dinguerie, j’ai trop kiffé mdr 🔥🫶',
  'このゲーム神すぎてずっと笑ってる 草 😭🔥',
  'yaar camera bilkul mast hai par battery dimaag kharab pmo fr 💀',
  'yeah nah mate I was properly chuffed with the audio, price gutted me tho :/',
  'tysm customer support resolved my refund in 4 mins!! :)',
].join('\n');

type BatchFilter = 'All' | 'Positive' | 'Negative' | 'Sarcastic';

function getClassIndicator(classification: SentimentClass) {
  switch (classification) {
    case 'Positive':
      return { color: 'text-emerald-700', icon: TrendingUp };
    case 'Negative':
      return { color: 'text-red-700', icon: TrendingDown };
    case 'Mixed':
      return { color: 'text-amber-700', icon: GitCompareArrows };
    default:
      return { color: 'text-slate-600', icon: MinusCircle };
  }
}

interface BatchAnalyzerProps {
  onInspectSentence: (text: string) => void;
}

export function BatchAnalyzer({ onInspectSentence }: BatchAnalyzerProps) {
  const [rawFeed, setRawFeed] = useState<string>(SAMPLE_BATCH_FEED);
  const [batchResult, setBatchResult] = useState<BatchAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<BatchFilter>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      // If CSV has a header row like "text" or "sentence", strip it cleanly
      const cleaned =
        lines.length > 1 && /^(text|sentence|comment|post|tweet)$/i.test(lines[0].replace(/^"|"$/g, ''))
          ? lines.slice(1)
          : lines;
      const normalized = cleaned.map((line) => {
        if (file.name.toLowerCase().endsWith('.csv') && line.includes(',')) {
          const match = line.match(/^"((?:[^"]|"")*)"(?:,|$)/);
          if (match) return match[1].replace(/""/g, '"').trim();
          return line.split(',')[0].trim();
        }
        return line;
      });
      setRawFeed(normalized.slice(0, 20).join('\n'));
      setErrorMsg(null);
    } catch {
      setErrorMsg('Unable to read the uploaded file. Please upload a valid .txt or .csv file.');
    } finally {
      e.target.value = '';
    }
  };

  const parsedLines = useMemo(
    () =>
      rawFeed
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    [rawFeed],
  );

  async function handleRunBatch() {
    if (parsedLines.length === 0) {
      setErrorMsg('Enter at least one sentence (one per line) to classify.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences: parsedLines.slice(0, 20) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Batch classification failed.');
      }
      setBatchResult(data as BatchAnalysisResponse);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to classify batch.');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    if (!batchResult) return [];
    const q = searchQuery.trim().toLowerCase();
    return batchResult.items.filter((item) => {
      if (filter === 'Positive' && item.classification !== 'Positive') return false;
      if (filter === 'Negative' && item.classification !== 'Negative') return false;
      if (filter === 'Sarcastic' && !item.sarcasmDetected) return false;
      if (!q) return true;
      return (
        item.text.toLowerCase().includes(q) ||
        item.normalizedMeaning.toLowerCase().includes(q) ||
        item.detectedAbbreviations.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [batchResult, filter, searchQuery]);

  const summaryStats = useMemo(() => {
    if (!batchResult || batchResult.items.length === 0) return null;
    const total = batchResult.items.length;
    const pos = batchResult.items.filter((i) => i.classification === 'Positive').length;
    const neg = batchResult.items.filter((i) => i.classification === 'Negative').length;
    const sarc = batchResult.items.filter((i) => i.sarcasmDetected).length;
    const avgConf =
      batchResult.items.reduce((acc, item) => acc + item.confidence, 0) / total;
    return { total, pos, neg, sarc, avgConf };
  }, [batchResult]);

  function handleExportCsv() {
    if (!batchResult || batchResult.items.length === 0) return;
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const headers = [
      'Index',
      'Original Text',
      'Variety / Dialect',
      'Classification',
      'Confidence (%)',
      'Sarcasm Detected',
      'Sarcasm Confidence (%)',
      'Abbreviations',
      'Emojis/Symbols',
      'Normalized Meaning',
    ];
    const rows = batchResult.items.map((item: BatchAnalysisItem) =>
      [
        item.index + 1,
        escapeCsv(item.text),
        escapeCsv(item.detectedVariety || 'Global English'),
        item.classification,
        item.confidence.toFixed(1),
        item.sarcasmDetected ? 'Yes' : 'No',
        item.sarcasmConfidence.toFixed(1),
        escapeCsv(item.detectedAbbreviations.join('; ')),
        escapeCsv(item.detectedEmojisOrSymbols.join('; ')),
        escapeCsv(item.normalizedMeaning),
      ].join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pulselex-batch-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Multi-Sentence Feed Classifier
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Enter one social post, tweet, or comment per line (up to 20 posts per batch).
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            {Math.min(parsedLines.length, 20)} / 20 lines queued
          </span>
        </div>

        <textarea
          value={rawFeed}
          onChange={(e) => setRawFeed(e.target.value)}
          rows={6}
          placeholder="Paste multiple social media sentences, one per line..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-sans text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-colors resize-y"
          aria-label="Batch feed sentences"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload .TXT / .CSV
            </button>
            <button
              type="button"
              onClick={() => setRawFeed(SAMPLE_BATCH_FEED)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors whitespace-nowrap"
            >
              Load Sample Feed
            </button>
            <button
              type="button"
              onClick={() => {
                setRawFeed('');
                setBatchResult(null);
                setErrorMsg(null);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
            >
              Clear
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleRunBatch()}
            disabled={isLoading || parsedLines.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Layers className="w-4 h-4" />
            {isLoading ? 'Classifying Feed...' : `Classify ${Math.min(parsedLines.length, 20)} Sentences`}
          </button>
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

      {isLoading && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse space-y-3">
          <div className="h-5 w-48 bg-slate-200 rounded" />
          <div className="h-10 w-full bg-slate-100 rounded" />
          <div className="h-10 w-full bg-slate-100 rounded" />
          <div className="h-10 w-full bg-slate-100 rounded" />
        </section>
      )}

      {!isLoading && batchResult && summaryStats && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Aggregate Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/50">
            <div className="px-5 py-4">
              <span className="block text-xs text-slate-500">Classified Posts</span>
              <span className="mt-1 block font-mono text-xl font-semibold tabular-nums text-slate-900">
                {summaryStats.total}
              </span>
            </div>
            <div className="px-5 py-4">
              <span className="block text-xs text-slate-500">Positive Share</span>
              <span className="mt-1 block font-mono text-xl font-semibold tabular-nums text-emerald-700">
                {((summaryStats.pos / summaryStats.total) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="px-5 py-4">
              <span className="block text-xs text-slate-500">Negative Share</span>
              <span className="mt-1 block font-mono text-xl font-semibold tabular-nums text-red-700">
                {((summaryStats.neg / summaryStats.total) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="px-5 py-4">
              <span className="block text-xs text-slate-500">Sarcasm Detected</span>
              <span className="mt-1 block font-mono text-xl font-semibold tabular-nums text-amber-700">
                {summaryStats.sarc} / {summaryStats.total}
              </span>
            </div>
            <div className="px-5 py-4 col-span-2 lg:col-span-1">
              <span className="block text-xs text-slate-500">Mean Confidence</span>
              <span className="mt-1 block font-mono text-xl font-semibold tabular-nums text-slate-900">
                {summaryStats.avgConf.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              {(['All', 'Positive', 'Negative', 'Sarcastic'] as BatchFilter[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    filter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter feed..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* High-Density Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2.5 pl-5 pr-3 w-10">#</th>
                  <th className="py-2.5 px-3 min-w-[260px]">Sentence &amp; Decoded Meaning</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Variety</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Sentiment</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Confidence</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Sarcasm</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Abbreviations &amp; Signs</th>
                  <th className="py-2.5 pl-3 pr-5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                      No feed items match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const indicator = getClassIndicator(item.classification);
                    const Icon = indicator.icon;
                    return (
                      <tr key={item.index} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pl-5 pr-3 font-mono text-xs tabular-nums text-slate-400 align-top">
                          {item.index + 1}
                        </td>
                        <td className="py-3 px-3 align-top">
                          <p className="text-slate-900 font-medium leading-snug">{item.text}</p>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {item.normalizedMeaning}
                          </p>
                        </td>
                        <td className="py-3 px-3 align-top whitespace-nowrap text-xs text-slate-600">
                          {item.detectedVariety || 'Global English'}
                        </td>
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${indicator.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {item.classification}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top text-right font-mono text-xs tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          {item.confidence.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 align-top whitespace-nowrap text-xs">
                          {item.sarcasmDetected ? (
                            <span className="text-amber-700 font-medium">
                              Yes ·{' '}
                              <span className="font-mono tabular-nums">
                                {item.sarcasmConfidence.toFixed(0)}%
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-top text-xs text-slate-600">
                          {[...item.detectedAbbreviations, ...item.detectedEmojisOrSymbols].length > 0 ? (
                            <span className="font-mono text-xs leading-relaxed">
                              {[...item.detectedAbbreviations, ...item.detectedEmojisOrSymbols].join(' · ')}
                            </span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-3 pl-3 pr-5 align-top text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onInspectSentence(item.text)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                          >
                            Deep Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
