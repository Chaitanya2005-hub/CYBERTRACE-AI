import { useState } from 'react';
import { CaretDown, CaretRight, Users, Warning, Eye } from '@phosphor-icons/react';
import { RiskBadge } from './RiskBadge';


interface NodeData {
  id: string;
  degreeCentrality: number;
  riskLevel: 'low' | 'medium' | 'critical';
  isOrchestrator: boolean;
}

interface PatternData {
  type: 'call_loop' | 'frequency_spike' | 'laundering_ring';
  nodeIds: string[];
  description: string;
  severity: 'low' | 'medium' | 'critical';
}

interface RightSidebarProps {
  nodes: NodeData[];
  patterns: PatternData[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onFilterPatterns?: (selectedNode: string | null) => void;
  showAllPatterns?: boolean;
}

export function RightSidebar({
  nodes,
  patterns,
  selectedNodeId,
  onSelectNode,
  onFilterPatterns,
  showAllPatterns = true,
}: RightSidebarProps) {
  const [suspectsExpanded, setSuspectsExpanded] = useState(true);
  const [patternsExpanded, setPatternsExpanded] = useState(true);

  const flaggedNodes = nodes.filter(
    (n) => n.riskLevel !== 'low' || n.isOrchestrator
  );
  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  const criticalCount = nodes.filter((n) => n.riskLevel === 'critical').length;
  const mediumCount = nodes.filter((n) => n.riskLevel === 'medium').length;
  const orchestratorCount = nodes.filter((n) => n.isOrchestrator).length;

  if (nodes.length === 0) {
    return (
      <aside className="w-72 shrink-0 bg-panel border-l border-border-default flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-panel-alt border border-border-default flex items-center justify-center">
          <Users className="w-5 h-5 text-text-muted" />
        </div>
        <div>
          <p className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
            No Suspects
          </p>
          <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
            Load demo data or upload a CSV to begin analysis
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 shrink-0 bg-panel border-l border-border-default flex flex-col overflow-y-auto">
      {/* Risk summary */}
      <div className="p-3 border-b border-border-default">
        <h3 className="text-[11px] font-display font-semibold text-text-muted uppercase tracking-wider mb-2">
          Risk Summary
        </h3>
        <div className="flex gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-risk-critical" />
            <span className="text-risk-critical">{criticalCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-risk-medium" />
            <span className="text-risk-medium">{mediumCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Warning className="w-3 h-3 text-risk-critical" weight="fill" />
            <span className="text-text-muted">{orchestratorCount} orchestrator{orchestratorCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Selected node detail */}
      {selectedNode && (
        <div className="p-3 border-b border-border-default bg-panel-alt">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-display font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Selected Node
            </h3>
            <button
              onClick={() => onSelectNode(null)}
              className="text-[10px] text-text-muted hover:text-text-primary"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="text-text-primary break-all font-semibold">{selectedNode.id}</div>
            <div className="flex justify-between">
              <span className="text-text-muted">Type</span>
              <span>{selectedNode.id.startsWith('+') ? 'Phone' : 'Account'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Centrality</span>
              <span>{selectedNode.degreeCentrality.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Risk</span>
              <RiskBadge level={selectedNode.riskLevel} />
            </div>
            {selectedNode.isOrchestrator && (
              <div className="flex items-center gap-1 text-risk-critical text-[10px] font-semibold">
                <Warning className="w-3 h-3" weight="fill" />
                FLAGGED AS ORCHESTRATOR
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detected patterns */}
      <div className="border-b border-border-default">
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setPatternsExpanded(!patternsExpanded)}
            className="flex items-center gap-1.5 text-[11px] font-display font-semibold text-text-muted uppercase tracking-wider hover:bg-panel-alt transition-colors"
          >
            {patternsExpanded ? <CaretDown className="w-3 h-3" /> : <CaretRight className="w-3 h-3" />}
            Detected Patterns ({patterns.length})
          </button>
          {onFilterPatterns && (
            <button
              onClick={() => onFilterPatterns(showAllPatterns ? selectedNodeId : null)}
              className="text-[10px] font-mono text-accent hover:text-accent/80"
            >
              {showAllPatterns ? 'Filter Selected' : 'Show All'}
            </button>
          )}
        </div>
        {patternsExpanded && (
          <div className="px-3 pb-2 space-y-1.5 max-h-48 overflow-y-auto">
            {patterns.length === 0 ? (
              <p className="text-[10px] text-text-muted">
                {selectedNodeId ? 'No patterns for selected node' : 'No patterns detected'}
              </p>
            ) : (
              patterns.map((p, i) => (
                <div
                  key={i}
                  className="p-2 rounded bg-panel-alt border border-border-default text-[10px] font-mono"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-primary font-semibold">
                      {p.type.replace(/_/g, ' ')}
                    </span>
                    <RiskBadge level={p.severity} />
                  </div>
                  <p className="text-text-muted leading-relaxed">{p.description}</p>
                  <div className="mt-1 text-text-muted">
                    {p.nodeIds.length} node{p.nodeIds.length !== 1 ? 's' : ''} involved
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Flagged suspects list */}
      <div className="flex-1">
        <button
          onClick={() => setSuspectsExpanded(!suspectsExpanded)}
          className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-display font-semibold text-text-muted uppercase tracking-wider hover:bg-panel-alt transition-colors"
        >
          {suspectsExpanded ? <CaretDown className="w-3 h-3" /> : <CaretRight className="w-3 h-3" />}
          <Users className="w-3.5 h-3.5" />
          Flagged Suspects ({flaggedNodes.length})
        </button>
        {suspectsExpanded && (
          <div className="px-3 pb-3 space-y-1 max-h-80 overflow-y-auto">
            {flaggedNodes.map((node) => (
              <button
                key={node.id}
                onClick={() =>
                  onSelectNode(selectedNodeId === node.id ? null : node.id)
                }
                className={`w-full flex items-center justify-between p-2 rounded text-left text-[10px] font-mono transition-colors ${
                  selectedNodeId === node.id
                    ? 'bg-accent/10 border border-accent/30'
                    : 'hover:bg-panel-alt border border-transparent'
                }`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-text-primary truncate">{node.id}</span>
                  <span className="text-text-muted">
                    C: {node.degreeCentrality.toFixed(3)}
                    {node.isOrchestrator && (
                      <span className="text-risk-critical ml-1">⚡ ORCH</span>
                    )}
                  </span>
                </div>
                <RiskBadge level={node.riskLevel} />
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
