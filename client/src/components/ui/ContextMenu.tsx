import { useEffect, useRef } from 'react';
import { Eye, EyeSlash, DownloadSimple, X } from '@phosphor-icons/react';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string | null;
  onClose: () => void;
  onShowConnections?: (nodeId: string) => void;
  onHideNode?: (nodeId: string) => void;
  onExportNode?: (nodeId: string) => void;
}

export function ContextMenu({
  x,
  y,
  nodeId,
  onClose,
  onShowConnections,
  onHideNode,
  onExportNode,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!nodeId) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-panel border border-border-default rounded-lg shadow-lg py-1 z-50 min-w-48"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <div className="px-3 py-2 border-b border-border-default">
        <p className="text-[10px] font-mono text-text-muted truncate">{nodeId}</p>
      </div>
      
      {onShowConnections && (
        <button
          onClick={() => handleAction(() => onShowConnections(nodeId))}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-panel-alt transition-colors"
        >
          <Eye className="w-4 h-4" />
          Show Connections
        </button>
      )}
      
      {onHideNode && (
        <button
          onClick={() => handleAction(() => onHideNode(nodeId))}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-panel-alt transition-colors"
        >
          <EyeSlash className="w-4 h-4" />
          Hide Node
        </button>
      )}
      
      {onExportNode && (
        <button
          onClick={() => handleAction(() => onExportNode(nodeId))}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-panel-alt transition-colors"
        >
          <DownloadSimple className="w-4 h-4" />
          Export Node Data
        </button>
      )}
      
      <div className="border-t border-border-default mt-1 pt-1">
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:bg-panel-alt transition-colors"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>
    </div>
  );
}
