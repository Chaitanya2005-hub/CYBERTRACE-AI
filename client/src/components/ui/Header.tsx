import { useState } from 'react';
import { Shield, DownloadSimple, PlayCircle, ArrowCounterClockwise, Lightning, SignOut, User, MagnifyingGlass } from '@phosphor-icons/react';

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
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchNode && searchQuery.trim()) {
      onSearchNode(searchQuery.trim());
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-panel border-b border-border-default shrink-0">
      {/* Left — brand */}
      <div className="flex items-center gap-2.5">
        <Shield className="w-5 h-5 text-accent" weight="fill" />
        <span className="text-sm font-display font-bold text-text-primary tracking-wide">
          CYBER TRACE AI
        </span>
        {isBypassMode && (
          <div className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded bg-risk-medium/10 border border-risk-medium/30">
            <Lightning className="w-3 h-3 text-risk-medium" />
            <span className="text-[10px] font-mono text-risk-medium uppercase">Bypass Mode</span>
          </div>
        )}
        {caseName && (
          <div className="flex items-center gap-2 ml-3 pl-3 border-l border-border-default">
            <span className="text-xs text-text-muted">{caseName}</span>
            {caseId && (
              <span className="text-[10px] font-mono text-accent-dim bg-accent/10 px-1.5 py-0.5 rounded">
                {caseId.slice(0, 8)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Center — search */}
      {onSearchNode && (
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phone number or account..."
              className="w-64 pl-8 pr-3 py-1.5 bg-panel-alt border border-border-default rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </form>
      )}

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-panel-alt border border-border-default">
            <User className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-[10px] font-mono text-text-primary truncate max-w-32">
              {user.email}
            </span>
            <button
              onClick={onLogout}
              className="text-text-muted hover:text-risk-critical transition-colors"
              title="Sign out"
            >
              <SignOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isDemoMode && (
          <button
            onClick={onResetDemo}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded border border-risk-critical/30 text-risk-critical hover:bg-risk-critical/10 transition-colors"
          >
            <ArrowCounterClockwise className="w-3.5 h-3.5" />
            Reset Demo
          </button>
        )}

        {!isDemoMode && (
          <button
            onClick={onLoadDemo}
            disabled={isPreloading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded border border-risk-medium/40 text-risk-medium hover:bg-risk-medium/10 transition-colors disabled:opacity-50"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            {isPreloading ? 'Loading…' : 'Pre-load Sample Network'}
          </button>
        )}

        {canExport && (
          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border-default">
            <DownloadSimple className="w-3.5 h-3.5 text-text-muted" />
            <button
              onClick={() => onExportReport('pdf')}
              className="text-[11px] font-mono text-accent hover:text-accent/80 transition-colors"
            >
              PDF
            </button>
            <span className="text-text-muted text-[10px]">/</span>
            <button
              onClick={() => onExportReport('csv')}
              className="text-[11px] font-mono text-accent hover:text-accent/80 transition-colors"
            >
              CSV
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
