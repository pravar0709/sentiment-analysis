import {
  BookOpen,
  Download,
  GraduationCap,
  History,
  Layers,
  MessageSquareText,
  X,
} from 'lucide-react';

export type ActiveTab = 'single' | 'batch' | 'lexicon' | 'history' | 'project';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  historyCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isDownloadingZip: boolean;
  onDownloadZip: () => void;
}

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  description: string;
  icon: typeof MessageSquareText;
}> = [
  {
    id: 'single',
    label: 'Sentence Analyzer',
    description: 'Analyze any custom sentence live',
    icon: MessageSquareText,
  },
  {
    id: 'batch',
    label: 'Batch Feed & Upload',
    description: 'Paste lines or upload .txt / .csv',
    icon: Layers,
  },
  {
    id: 'lexicon',
    label: 'Social Lexicon',
    description: 'Abbreviations, emojis & signs',
    icon: BookOpen,
  },
  {
    id: 'history',
    label: 'Session History',
    description: 'Saved analyses & exports',
    icon: History,
  },
  {
    id: 'project',
    label: 'Project Presentation',
    description: 'Architecture, gap study & report',
    icon: GraduationCap,
  },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  historyCount,
  mobileOpen,
  onCloseMobile,
  isDownloadingZip,
  onDownloadZip,
}: SidebarProps) {
  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 px-4 py-5">
      <div>
        <div className="flex items-center justify-between px-2 pb-6 border-b border-slate-100">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            PulseLex
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="mt-5 space-y-1" aria-label="Primary Workspace Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isActive ? 'text-blue-400' : 'text-slate-400'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium whitespace-nowrap truncate">
                      {item.label}
                    </span>
                    {item.id === 'history' && historyCount > 0 && (
                      <span
                        className={`font-mono text-xs tabular-nums ${
                          isActive ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {historyCount}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-0.5 truncate ${
                      isActive ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-100 space-y-3">
        <button
          type="button"
          onClick={onDownloadZip}
          disabled={isDownloadingZip}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {isDownloadingZip ? 'Packaging ZIP...' : 'Download Project ZIP'}
        </button>
        <p className="px-1 text-xs text-slate-400 leading-relaxed">
          Includes full source code, README.md, and Viva report guide.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[256px] shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[264px] max-w-[85vw] h-full shadow-xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
