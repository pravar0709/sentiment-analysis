import { ArrowUpRight, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SentimentAnalysisResult } from '../types/sentiment';

type HistoryFilter = 'All' | 'Positive' | 'Negative' | 'Sarcastic';

interface HistoryViewProps {
  history: SentimentAnalysisResult[];
  onOpenResult: (result: SentimentAnalysisResult) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryView({
  history,
  onOpenResult,
  onDeleteItem,
  onClearAll,
}: HistoryViewProps) {
  const [filter, setFilter] = useState<HistoryFilter>('All');
  const [query, setQuery] = useState<string>('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((item) => {
      if (filter === 'Positive' && item.classification !== 'Positive') return false;
      if (filter === 'Negative' && item.classification !== 'Negative') return false;
      if (filter === 'Sarcastic' && !item.sarcasm.detected) return false;
      if (!q) return true;
      return (
        item.originalText.toLowerCase().includes(q) ||
        item.normalizedTranslation.toLowerCase().includes(q)
      );
    });
  }, [history, filter, query]);

  if (history.length === 0) {
    return (
      <section className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <h2 className="font-display text-base font-semibold text-slate-900">
          No saved analyses yet
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
          Every sentence you classify in the Sentence Analyzer is automatically logged here so you can compare confidence scores, sarcasm flips, and decoded abbreviations.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(['All', 'Positive', 'Negative', 'Sarcastic'] as HistoryFilter[]).map((tab) => (
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
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search session history..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-slate-200 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No history records match your filter.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span
                    className={`font-semibold ${
                      item.classification === 'Positive'
                        ? 'text-emerald-700'
                        : item.classification === 'Negative'
                          ? 'text-red-700'
                          : item.classification === 'Mixed'
                            ? 'text-amber-700'
                            : 'text-slate-700'
                    }`}
                  >
                    {item.classification}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    {item.confidence.toFixed(1)}% confidence
                  </span>
                  {item.sarcasm.detected && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-700 font-medium">
                        Sarcastic ({item.sarcasm.confidence.toFixed(0)}%)
                      </span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-900 break-words">
                  {item.originalText}
                </p>
                <p className="mt-1 text-xs text-slate-500 truncate">
                  Decoded: {item.normalizedTranslation}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenResult(item)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                >
                  Open Report
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
