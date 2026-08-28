import { useState } from 'react';
import { Shield, DownloadSimple, PlayCircle, ArrowCounterClockwise, Lightning, SignOut, User, MagnifyingGlass, List, Users } from '@phosphor-icons/react';

interface HeaderProps {
  caseName: string | null;
  caseId: string | null;
  isDemoMode: boolean;
  isPreloading: boolean;
  onLoadDemo: () => void;
  onResetDemo: () => void;
  onExportReport: (format: 'pdf' | 'csv') => void;
  canExport: boolean;
  isBypassMode: boolean;
  user: { id: string; email: string } | null;
  onLogout: () => void;
  onSearchNode?: (query: string) => void;
  onToggleLeftSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  leftSidebarOpen?: boolean;
  rightSidebarOpen?: boolean;
}

export function Header({
  caseName,
  caseId,
  isDemoMode,
  isPreloading,
  onLoadDemo,
  onResetDemo,
  onExportReport,
  canExport,
  isBypassMode,
  user,
  onLogout,
  onSearchNode,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  leftSidebarOpen,
  rightSidebarOpen,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchNode && searchQuery.trim()) {
      onSearchNode(searchQuery.trim());
    }
  };

  return (
    <header className="flex items-center justify-between px-3 py-2 bg-panel border-b border-border-default shrink-0 gap-2">
      {/* Left — brand & toggle */}
      <div className="flex items-center gap-2">
        {onToggleLeftSidebar && (
          <button
            onClick={onToggleLeftSidebar}
            className={`md:hidden p-1 rounded border transition-colors ${
              leftSidebarOpen
                ? 'bg-accent/20 border-accent/40 text-accent'
                : 'bg-panel-alt border-border-default text-text-muted hover:text-accent'
            }`}
            title="Toggle filters"
          >
            <List className="w-4 h-4" />
          </button>
        )}
        <Shield className="w-4 h-4 text-accent shrink-0" weight="fill" />
        <span className="text-xs font-display font-bold text-text-primary tracking-wide hidden xs:block shrink-0">
          CYBER TRACE AI
        </span>
        {isBypassMode && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-risk-medium/10 border border-risk-medium/30 shrink-0">
            <Lightning className="w-2.5 h-2.5 text-risk-medium" />
            <span className="text-[9px] font-mono text-risk-medium uppercase hidden sm:inline">Bypass</span>
          </div>
        )}
        {caseName && (
          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-border-default shrink-0">
            <span className="text-[10px] text-text-muted truncate max-w-20 sm:max-w-32">{caseName}</span>
            {caseId && (
              <span className="text-[9px] font-mono text-accent-dim bg-accent/10 px-1 py-0.5 rounded hidden sm:inline">
                {caseId.slice(0, 8)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Center — search bar with dedicated button */}
      {onSearchNode && (
        <form onSubmit={handleSearch} className="flex items-center gap-1 shrink">
          <div className="relative">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phone/account..."
              className="w-32 sm:w-52 pl-8 pr-2 py-1 bg-panel-alt border border-border-default rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="px-2 py-1 rounded bg-accent/10 border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors flex items-center gap-1 shrink-0"
            title="Search network"
          >
            Search
          </button>
        </form>
      )}

      {/* Right — actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-panel-alt border border-border-default">
            <User className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-[9px] font-mono text-text-primary truncate max-w-16 sm:max-w-24 hidden xs:block">
              {user.email}
            </span>
            <button
              onClick={onLogout}
              className="text-text-muted hover:text-risk-critical transition-colors"
              title="Sign out"
            >
              <SignOut className="w-3 h-3" />
            </button>
          </div>
        )}

        {isDemoMode && (
          <button
            onClick={onResetDemo}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border border-risk-critical/30 text-risk-critical hover:bg-risk-critical/10 transition-colors"
          >
            <ArrowCounterClockwise className="w-3 h-3" />
            <span className="hidden xs:inline">Reset</span>
          </button>
        )}

        {!isDemoMode && (
          <button
            onClick={onLoadDemo}
            disabled={isPreloading}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border border-risk-medium/40 text-risk-medium hover:bg-risk-medium/10 transition-colors disabled:opacity-50"
          >
            <PlayCircle className="w-3 h-3" />
            <span>{isPreloading ? 'Loading…' : 'Demo'}</span>
          </button>
        )}

        {canExport && (
          <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-border-default">
            <DownloadSimple className="w-3 h-3 text-text-muted" />
            <button
              onClick={() => onExportReport('pdf')}
              className="text-[10px] font-mono text-accent hover:text-accent/80 transition-colors"
            >
              PDF
            </button>
            <span className="text-text-muted text-[9px]">/</span>
            <button
              onClick={() => onExportReport('csv')}
              className="text-[10px] font-mono text-accent hover:text-accent/80 transition-colors"
            >
              CSV
            </button>
          </div>
        )}

        {onToggleRightSidebar && (
          <button
            onClick={onToggleRightSidebar}
            className={`md:hidden p-1 rounded border transition-colors ml-1 ${
              rightSidebarOpen
                ? 'bg-accent/20 border-accent/40 text-accent'
                : 'bg-panel-alt border-border-default text-text-muted hover:text-accent'
            }`}
            title="Toggle suspects"
          >
            <Users className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
