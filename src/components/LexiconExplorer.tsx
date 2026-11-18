import { ArrowUpRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LexiconEntry, SOCIAL_LEXICON } from '../data/socialLexicon';

type KindFilter = 'All' | LexiconEntry['kind'];

interface LexiconExplorerProps {
  onTestSentence: (sentence: string) => void;
}

export function LexiconExplorer({ onTestSentence }: LexiconExplorerProps) {
  const [kindFilter, setKindFilter] = useState<KindFilter>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SOCIAL_LEXICON.filter((entry) => {
      if (kindFilter !== 'All' && entry.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        entry.token.toLowerCase().includes(q) ||
        entry.expansion.toLowerCase().includes(q) ||
        entry.socialMeaning.toLowerCase().includes(q)
      );
    });
  }, [kindFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              World Languages, Global Englishes &amp; Hinglish Lexicon
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Reference guide for native language slang (Spanish, Hindi, French, Japanese, Korean), all World Englishes, Hinglish, abbreviations, emojis, and signs.
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Spanish, Hindi, French, slang, emoji..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {(['All', 'World Language', 'Abbreviation', 'Hinglish', 'Global English', 'Emoji', 'Symbol / Sign'] as KindFilter[]).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setKindFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  kindFilter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ),
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 pl-5 pr-3 whitespace-nowrap">Token</th>
                <th className="py-3 px-3 whitespace-nowrap">Expansion / Name</th>
                <th className="py-3 px-3 whitespace-nowrap">Type</th>
                <th className="py-3 px-3 min-w-[260px]">Social Media Insight</th>
                <th className="py-3 px-3 whitespace-nowrap">Typical Polarity</th>
                <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap">Live Test</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                    No lexicon entries match “{searchQuery}”.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.token} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-5 pr-3 font-mono font-semibold text-slate-900 whitespace-nowrap align-top">
                      {entry.token}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-800 align-top">
                      {entry.expansion}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-500 whitespace-nowrap align-top">
                      {entry.kind}
                    </td>
                    <td className="py-3.5 px-3 align-top">
                      <p className="text-xs text-slate-600 leading-relaxed">{entry.socialMeaning}</p>
                      <p className="mt-1 text-xs text-slate-400 italic">“{entry.exampleSentence}”</p>
                    </td>
                    <td className="py-3.5 px-3 text-xs font-medium whitespace-nowrap align-top">
                      <span
                        className={
                          entry.typicalSentiment === 'Positive'
                            ? 'text-emerald-700'
                            : entry.typicalSentiment === 'Negative'
                              ? 'text-red-700'
                              : 'text-slate-600'
                        }
                      >
                        {entry.typicalSentiment}
                      </span>
                    </td>
                    <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap align-top">
                      <button
                        type="button"
                        onClick={() => onTestSentence(entry.exampleSentence)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                      >
                        Analyze Example
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
