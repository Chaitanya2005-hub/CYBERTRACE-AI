import { useRef, useState } from 'react';
import { UploadSimple, Clock, Phone, Bank } from '@phosphor-icons/react';
import { SkeletonLoader } from './SkeletonLoader';

interface LeftSidebarProps {
  caseId: string | null;
  minTimestamp: string | null;
  maxTimestamp: string | null;
  timeStart: string;
  timeEnd: string;
  onTimeChange: (start: string, end: string) => void;
  onUpload: (file: File, type: 'cdr' | 'transactions') => Promise<void>;
  isUploading: boolean;
  meta: {
    cdrCount: number;
    finCount: number;
    nodeCount: number;
    edgeCount: number;
  } | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function LeftSidebar({
  caseId,
  minTimestamp,
  maxTimestamp,
  timeStart,
  timeEnd,
  onTimeChange,
  onUpload,
  isUploading,
  meta,
  isOpen = false,
  onClose,
}: LeftSidebarProps) {
  const cdrInputRef = useRef<HTMLInputElement>(null);
  const finInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'cdr' | 'transactions'>('cdr');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onUpload(file, uploadType);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const formatTs = (ts: string | null) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-panel border-r border-border-default flex flex-col overflow-y-auto transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header with close button */}
        <div className="md:hidden flex items-center justify-between p-3 border-b border-border-default">
          <span className="text-xs font-display font-bold text-text-primary uppercase tracking-wider">
            Filters & Ingestion
          </span>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Upload section */}
        <div className="p-3 border-b border-border-default">
          <h3 className="text-[11px] font-display font-semibold text-text-muted uppercase tracking-wider mb-2">
          Data Upload
        </h3>

        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setUploadType('cdr')}
            className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-mono py-1 rounded border transition-colors ${
              uploadType === 'cdr'
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'border-border-default text-text-muted hover:text-text-primary'
            }`}
          >
            <Phone className="w-3 h-3" />
            CDR
          </button>
          <button
            onClick={() => setUploadType('transactions')}
            className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-mono py-1 rounded border transition-colors ${
              uploadType === 'transactions'
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'border-border-default text-text-muted hover:text-text-primary'
            }`}
          >
            <Bank className="w-3 h-3" />
            FIN
          </button>
        </div>

        <input
          ref={cdrInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={finInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={() => (uploadType === 'cdr' ? cdrInputRef.current?.click() : finInputRef.current?.click())}
          disabled={!caseId || isUploading}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-accent text-[#05080d] text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-[#05080d] border-t-transparent rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <UploadSimple className="w-3.5 h-3.5" />
              Upload {uploadType === 'cdr' ? 'CDR' : 'Financial'} CSV
            </>
          )}
        </button>
      </div>

      {/* Time-range filter */}
      <div className="p-3 border-b border-border-default">
        <h3 className="text-[11px] font-display font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Time Range
        </h3>

        {minTimestamp && maxTimestamp ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
              <span>{formatTs(timeStart || minTimestamp)}</span>
              <span>{formatTs(timeEnd || maxTimestamp)}</span>
            </div>
            <input
              type="range"
              min={new Date(minTimestamp).getTime()}
              max={new Date(maxTimestamp).getTime()}
              value={timeStart ? new Date(timeStart).getTime() : new Date(minTimestamp).getTime()}
              onChange={(e) => {
                const start = new Date(Number(e.target.value)).toISOString();
                onTimeChange(start, timeEnd || maxTimestamp);
              }}
              className="w-full accent-accent h-1"
            />
            <input
              type="range"
              min={new Date(minTimestamp).getTime()}
              max={new Date(maxTimestamp).getTime()}
              value={timeEnd ? new Date(timeEnd).getTime() : new Date(maxTimestamp).getTime()}
              onChange={(e) => {
                const end = new Date(Number(e.target.value)).toISOString();
                onTimeChange(timeStart || minTimestamp, end);
              }}
              className="w-full accent-accent h-1"
            />
            <button
              onClick={() => onTimeChange(minTimestamp, maxTimestamp)}
              className="w-full text-[10px] font-mono text-accent hover:text-accent/80 py-1"
            >
              Reset filter
            </button>
          </div>
        ) : (
          <p className="text-[10px] text-text-muted">Load data to enable time filtering</p>
        )}
      </div>

      {/* Network stats */}
      <div className="p-3">
        <h3 className="text-[11px] font-display font-semibold text-text-muted uppercase tracking-wider mb-2">
          Network Stats
        </h3>
        {meta ? (
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-text-muted">Nodes</span>
              <span className="text-text-primary">{meta.nodeCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Edges</span>
              <span className="text-text-primary">{meta.edgeCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">CDR Records</span>
              <span className="text-text-primary">{meta.cdrCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Transactions</span>
              <span className="text-text-primary">{meta.finCount}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <SkeletonLoader className="h-4 w-full" />
            <SkeletonLoader className="h-4 w-3/4" />
          </div>
        )}
      </div>
    </aside>
  </>
  );
}
