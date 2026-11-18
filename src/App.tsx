import { Download, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BatchAnalyzer } from './components/BatchAnalyzer';
import { HistoryView } from './components/HistoryView';
import { LexiconExplorer } from './components/LexiconExplorer';
import { ProjectOverview } from './components/ProjectOverview';
import { ActiveTab, Sidebar } from './components/Sidebar';
import { SingleAnalyzer } from './components/SingleAnalyzer';
import { SentimentAnalysisResult } from './types/sentiment';

const STORAGE_KEY = 'pulselex_history_v1';

const TAB_TITLES: Record<ActiveTab, { section: string; description: string }> = {
  single: {
    section: 'Sentence Analyzer',
    description: 'Analyze any original world language, all Global Englishes, or Hinglish for polarity, confidence, ABSA, sarcasm, emojis & slang',
  },
  batch: {
    section: 'Batch Feed & Upload',
    description: 'Classify multiple posts or upload a .txt / .csv dataset with CSV export',
  },
  lexicon: {
    section: 'Social Lexicon',
    description: 'Reference for recent abbreviations, emoji shifts, and tone tags',
  },
  history: {
    section: 'Session History',
    description: 'Previously analyzed sentences and saved confidence breakdowns',
  },
  project: {
    section: 'Project Presentation',
    description: 'Academic problem statement, architecture pipeline, gap analysis, and submission archive',
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('single');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [selectedResult, setSelectedResult] = useState<SentimentAnalysisResult | null>(null);
  const [externalText, setExternalText] = useState<string | undefined>(undefined);
  const [externalTriggerId, setExternalTriggerId] = useState<number>(0);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [zipError, setZipError] = useState<string | null>(null);

  const [history, setHistory] = useState<SentimentAnalysisResult[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SentimentAnalysisResult[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  const handleResultCreated = (result: SentimentAnalysisResult) => {
    setHistory((prev) => [result, ...prev.filter((item) => item.id !== result.id)].slice(0, 50));
  };

  const handleInspectSentence = (sentence: string) => {
    setExternalText(sentence);
    setExternalTriggerId((n) => n + 1);
    setActiveTab('single');
  };

  const handleOpenHistoryResult = (result: SentimentAnalysisResult) => {
    setSelectedResult(result);
    setActiveTab('single');
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (selectedResult?.id === id) {
      setSelectedResult(null);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    setSelectedResult(null);
  };

  const handleExportActiveJson = () => {
    if (!selectedResult) return;
    const blob = new Blob([JSON.stringify(selectedResult, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pulselex-analysis-${selectedResult.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadProjectZip = async () => {
    setZipError(null);
    setIsDownloadingZip(true);
    try {
      const response = await fetch('/api/download-project-zip');
      if (!response.ok) {
        throw new Error('Failed to generate project ZIP archive.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'PulseLex-Major-Project.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setZipError(err instanceof Error ? err.message : 'Unable to download ZIP archive.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const currentMeta = TAB_TITLES[activeTab];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        historyCount={history.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        isDownloadingZip={isDownloadingZip}
        onDownloadZip={() => void handleDownloadProjectZip()}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">Workspace</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
              <h1 className="font-display font-semibold text-slate-900 truncate">
                {currentMeta.section}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {activeTab === 'single' && selectedResult && (
              <button
                type="button"
                onClick={handleExportActiveJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleDownloadProjectZip()}
              disabled={isDownloadingZip}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isDownloadingZip ? 'Packaging...' : 'Download ZIP'}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl w-full mx-auto">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">{currentMeta.description}</p>
            {zipError && (
              <p role="alert" className="text-xs text-red-600 font-medium">
                {zipError}
              </p>
            )}
          </div>

          {activeTab === 'single' && (
            <SingleAnalyzer
              externalText={externalText}
              externalTriggerId={externalTriggerId}
              onResultCreated={handleResultCreated}
              selectedResult={selectedResult}
              onSelectResult={setSelectedResult}
            />
          )}

          {activeTab === 'batch' && (
            <BatchAnalyzer onInspectSentence={handleInspectSentence} />
          )}

          {activeTab === 'lexicon' && (
            <LexiconExplorer onTestSentence={handleInspectSentence} />
          )}

          {activeTab === 'history' && (
            <HistoryView
              history={history}
              onOpenResult={handleOpenHistoryResult}
              onDeleteItem={handleDeleteHistoryItem}
              onClearAll={handleClearHistory}
            />
          )}

          {activeTab === 'project' && (
            <ProjectOverview
              history={history}
              isDownloadingZip={isDownloadingZip}
              onDownloadZip={() => void handleDownloadProjectZip()}
              onOpenAnalyzer={() => setActiveTab('single')}
              onOpenBatch={() => setActiveTab('batch')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
