import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape from 'cytoscape';
import { ContextMenu } from '../ui/ContextMenu';

interface GraphNode {
  id: string;
  degreeCentrality: number;
  riskLevel: 'low' | 'medium' | 'critical';
  isOrchestrator: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  frequency: number;
}

interface PatternData {
  type: 'call_loop' | 'frequency_spike' | 'laundering_ring';
  nodeIds: string[];
  severity: 'low' | 'medium' | 'critical';
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  patterns: PatternData[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpload?: (file: File, type: 'cdr' | 'transactions') => void;
}

const RISK_COLORS: Record<string, string> = {
  critical: '#ff5673',
  medium: '#ffb238',
  low: '#35d399',
};

const RISK_BG: Record<string, string> = {
  critical: 'rgba(255,86,115,0.12)',
  medium: 'rgba(255,178,56,0.12)',
  low: 'rgba(53,211,153,0.12)',
};

const ACCENT = '#2dd4e0';
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;

function buildElements(nodes: GraphNode[], edges: GraphEdge[]) {
  const maxCentrality = Math.max(...nodes.map((n) => n.degreeCentrality), 0.001);
  const maxFreq = Math.max(...edges.map((e) => e.frequency), 1);

  const cyNodes = nodes.map((n) => ({
    data: {
      id: n.id,
      label: n.id.length > 14 ? n.id.slice(0, 12) + '…' : n.id,
      degreeCentrality: n.degreeCentrality,
      riskLevel: n.riskLevel,
      isOrchestrator: n.isOrchestrator,
      nodeSize: 30 + (n.degreeCentrality / maxCentrality) * 30,
    },
  }));

  const cyEdges = edges.map((e, i) => ({
    data: {
      id: `e${i}`,
      source: e.source,
      target: e.target,
      frequency: e.frequency,
      weight: e.weight,
      edgeWidth: 1 + (e.frequency / maxFreq) * 3,
    },
  }));

  return { cyNodes, cyEdges };
}

// ─── Node Detail Panel ────────────────────────────────────────────────────────
interface NodeDetailPanelProps {
  node: GraphNode | null;
  connectedCount: number;
  patterns: PatternData[];
  onClose: () => void;
}

function NodeDetailPanel({ node, connectedCount, patterns, onClose }: NodeDetailPanelProps) {
  if (!node) return null;

  const riskLabel = node.riskLevel.charAt(0).toUpperCase() + node.riskLevel.slice(1);
  const centralityPct = (node.degreeCentrality * 100).toFixed(1);

  // Find all patterns involving this node
  const matchingPatterns = patterns.filter((p) => p.nodeIds.includes(node.id));

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 30,
        width: 260,
        maxHeight: 'calc(100% - 32px)',
        background: 'rgba(10,18,30,0.95)',
        border: `1px solid ${RISK_COLORS[node.riskLevel]}55`,
        borderRadius: 10,
        backdropFilter: 'blur(10px)',
        boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px ${RISK_COLORS[node.riskLevel]}22`,
        fontFamily: 'JetBrains Mono, monospace',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: RISK_BG[node.riskLevel],
          borderBottom: `1px solid ${RISK_COLORS[node.riskLevel]}33`,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          shrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: RISK_COLORS[node.riskLevel],
              boxShadow: `0 0 6px ${RISK_COLORS[node.riskLevel]}`,
            }}
          />
          <span style={{ color: '#dce6f2', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em' }}>
            Node Details &amp; Analysis
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#4a6480',
            cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0,
          }}
          title="Close"
        >
          ✕
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* ID */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
          <div style={{ color: '#4a6480', fontSize: 9, letterSpacing: '0.08em', marginBottom: 4 }}>IDENTIFIER</div>
          <div
            style={{
              color: ACCENT, fontSize: 12, fontWeight: 700,
              wordBreak: 'break-all', lineHeight: 1.4,
            }}
          >
            {node.id}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.04)' }}>
          {/* Risk Level */}
          <div style={{ background: 'rgba(10,18,30,0.9)', padding: '8px 12px' }}>
            <div style={{ color: '#4a6480', fontSize: 9, letterSpacing: '0.06em', marginBottom: 4 }}>RISK LEVEL</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: RISK_COLORS[node.riskLevel] }} />
              <span style={{ color: RISK_COLORS[node.riskLevel], fontSize: 11, fontWeight: 700 }}>{riskLabel}</span>
            </div>
          </div>

          {/* Centrality */}
          <div style={{ background: 'rgba(10,18,30,0.9)', padding: '8px 12px' }}>
            <div style={{ color: '#4a6480', fontSize: 9, letterSpacing: '0.06em', marginBottom: 4 }}>CENTRALITY</div>
            <span style={{ color: '#dce6f2', fontSize: 11, fontWeight: 600 }}>{centralityPct}%</span>
          </div>

          {/* Connections */}
          <div style={{ background: 'rgba(10,18,30,0.9)', padding: '8px 12px' }}>
            <div style={{ color: '#4a6480', fontSize: 9, letterSpacing: '0.06em', marginBottom: 4 }}>CONNECTIONS</div>
            <span style={{ color: '#dce6f2', fontSize: 11, fontWeight: 600 }}>{connectedCount}</span>
          </div>

          {/* Orchestrator */}
          <div style={{ background: 'rgba(10,18,30,0.9)', padding: '8px 12px' }}>
            <div style={{ color: '#4a6480', fontSize: 9, letterSpacing: '0.06em', marginBottom: 4 }}>ORCHESTRATOR</div>
            <span style={{
              color: node.isOrchestrator ? RISK_COLORS.critical : '#4a6480',
              fontSize: 11, fontWeight: 600,
            }}>
              {node.isOrchestrator ? '⚠ YES' : 'No'}
            </span>
          </div>
        </div>

        {/* Flagged Reasons / Issues section */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(5,10,18,0.6)' }}>
          <div style={{ color: '#4a6480', fontSize: 9, letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>
            WHY FLAGGED / DETECTED ISSUES
          </div>

          {matchingPatterns.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {matchingPatterns.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255,86,115,0.08)',
                    border: `1px solid ${RISK_COLORS[p.severity]}44`,
                    borderRadius: 6,
                    padding: '6px 8px',
                    fontSize: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ color: RISK_COLORS[p.severity], fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>
                      {p.type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ color: RISK_COLORS[p.severity], fontSize: 9, fontWeight: 700 }}>
                      {p.severity.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ color: '#b0c4de', fontSize: 9.5, lineHeight: 1.35 }}>
                    {p.description}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: node.isOrchestrator ? RISK_COLORS.critical : '#7a9bbd', fontSize: 10, lineHeight: 1.4 }}>
              {node.isOrchestrator
                ? '⚡ High-volume orchestrator hub connecting multiple suspect networks.'
                : node.riskLevel === 'critical'
                ? '🔴 Top 10% highest activity suspect node with elevated centrality score.'
                : node.riskLevel === 'medium'
                ? '🟡 Elevated connectivity suspect node under observation.'
                : '🟢 Low-risk node with standard traffic patterns.'}
            </div>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div style={{ padding: '8px 12px', color: '#2e4560', fontSize: 9, letterSpacing: '0.05em', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        Right-click node for context menu
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function GraphCanvas({
  nodes,
  edges,
  patterns,
  selectedNodeId,
  onSelectNode,
  onUpload,
}: GraphCanvasProps) {
  // Use explicit styles to avoid any layout issues
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cyContainerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragFileType, setDragFileType] = useState<'cdr' | 'transactions' | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNodeData, setSelectedNodeData] = useState<GraphNode | null>(null);
  const [connectedCount, setConnectedCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const onSelectNodeRef = useRef(onSelectNode);
  useEffect(() => { onSelectNodeRef.current = onSelectNode; }, [onSelectNode]);

  // ─── Zoom controls (+0.25 / -0.25 fixed steps) ───────────────────────────
  const handleZoomIn = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const next = Math.min(parseFloat((cy.zoom() + ZOOM_STEP).toFixed(2)), MAX_ZOOM);
    cy.zoom({
      level: next,
      renderedPosition: {
        x: (cyContainerRef.current?.offsetWidth ?? 800) / 2,
        y: (cyContainerRef.current?.offsetHeight ?? 600) / 2,
      },
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const next = Math.max(parseFloat((cy.zoom() - ZOOM_STEP).toFixed(2)), MIN_ZOOM);
    cy.zoom({
      level: next,
      renderedPosition: {
        x: (cyContainerRef.current?.offsetWidth ?? 800) / 2,
        y: (cyContainerRef.current?.offsetHeight ?? 600) / 2,
      },
    });
  }, []);

  const handleFit = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.fit(cy.elements(), 30);
  }, []);

  const handleResetZoom = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom(1);
    cy.center(cy.elements());
  }, []);

  // ─── Search Functionality ──────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    const cy = cyRef.current;
    if (!cy) return;
    const targetId = searchQuery.trim();
    
    // Check exact match
    let targetNode = cy.$id(targetId);
    
    // If not found, try partial match in nodes array
    if (!targetNode || targetNode.length === 0) {
      const found = nodes.find(n => n.id.toLowerCase().includes(targetId.toLowerCase()));
      if (found) {
        targetNode = cy.$id(found.id);
      }
    }

    if (targetNode && targetNode.length > 0) {
      const actualId = targetNode.id();
      onSelectNodeRef.current(actualId);
      cy.animate({
        center: { eles: targetNode },
        zoom: 1.8
      }, { duration: 350 });
    } else {
      alert(`Node "${targetId}" not found in current graph.`);
    }
  }, [searchQuery, nodes]);

  // ─── Graph init ───────────────────────────────────────────────────────────
  const initGraph = useCallback(() => {
    if (!cyContainerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    if (nodes.length === 0) return;

    const { cyNodes, cyEdges } = buildElements(nodes, edges);

    const cy = cytoscape({
      container: cyContainerRef.current,
      elements: { nodes: cyNodes, edges: cyEdges },
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#101a29',
            'border-width': 2,
            'border-color': 'data(riskLevel)',
            width: 'data(nodeSize)',
            height: 'data(nodeSize)',
            'font-size': '10px',
            'font-family': 'JetBrains Mono, monospace',
            color: '#dce6f2',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-max-width': '80px',
            'text-wrap': 'ellipsis',
            'overlay-opacity': 0,
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 300,
          } as any,
        },
        { selector: 'node[riskLevel = "critical"]', style: { 'border-color': RISK_COLORS.critical } },
        { selector: 'node[riskLevel = "medium"]',   style: { 'border-color': RISK_COLORS.medium } },
        { selector: 'node[riskLevel = "low"]',      style: { 'border-color': RISK_COLORS.low } },
        {
          selector: 'node[?isOrchestrator]',
          style: {
            'border-width': 3,
            'border-color': RISK_COLORS.critical,
            'background-color': '#1a0a10',
            'overlay-padding': 6,
            'overlay-opacity': 0.15,
            'overlay-color': RISK_COLORS.critical,
          },
        },
        {
          selector: 'node:selected',
          style: { 'border-width': 4, 'border-color': ACCENT, 'background-color': '#0c2030' },
        },
        {
          selector: 'edge',
          style: {
            width: 'data(edgeWidth)',
            'line-color': '#1c2a3d',
            'curve-style': 'bezier',
            opacity: 0.5,
            'transition-property': 'line-color, opacity, width',
            'transition-duration': 300,
          } as any,
        },
        { selector: 'edge.loop-highlight', style: { 'line-color': RISK_COLORS.critical, 'line-style': 'dashed', opacity: 0.8 } },
        { selector: 'edge:selected', style: { 'line-color': ACCENT, opacity: 1, width: 3 } },
        { selector: '.faded', style: { opacity: 0.15 } },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 400,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 120,
        gravity: 0.3,
        numIter: 300,
        padding: 30,
      } as any,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      wheelSensitivity: 0.3,
    });

    // Highlight loop edges
    for (const pattern of patterns) {
      if (pattern.type === 'call_loop' && pattern.nodeIds.length >= 2) {
        for (let i = 0; i < pattern.nodeIds.length; i++) {
          const src = pattern.nodeIds[i]!;
          const tgt = pattern.nodeIds[(i + 1) % pattern.nodeIds.length]!;
          cy.edges().forEach((edge) => {
            if (
              (edge.source().id() === src && edge.target().id() === tgt) ||
              (edge.source().id() === tgt && edge.target().id() === src)
            ) {
              edge.addClass('loop-highlight');
            }
          });
        }
      }
    }

    // Tap node → select + show detail panel
    cy.on('tap', 'node', (evt: any) => {
      const id = evt.target.id();
      const isSame = id === selectedNodeId;
      onSelectNodeRef.current(isSame ? null : id);

      if (!isSame) {
        const nd = nodes.find((n) => n.id === id) ?? null;
        setSelectedNodeData(nd);
        const nbCount = evt.target.neighborhood('node').length;
        setConnectedCount(nbCount);
      } else {
        setSelectedNodeData(null);
      }
    });

    // Right-click context menu
    cy.on('cxttap', 'node', (evt: any) => {
      const id = evt.target.id();
      const pos = evt.renderedPosition;
      setContextMenu({ x: pos.x, y: pos.y, nodeId: id });
    });

    // Click background → deselect + close panel
    cy.on('tap', (evt: any) => {
      if (evt.target === cy) {
        onSelectNodeRef.current(null);
        setSelectedNodeData(null);
      }
    });

    // Hover fade
    cy.on('mouseover', 'node', (evt: any) => {
      const neighborhood = evt.target.closedNeighborhood();
      cy.elements().addClass('faded');
      neighborhood.removeClass('faded');
    });
    cy.on('mouseout', 'node', () => cy.elements().removeClass('faded'));

    // Track zoom for button state
    cy.on('zoom', () => setZoomLevel(Math.round(cy.zoom() * 100) / 100));
    setZoomLevel(1);

    cyRef.current = cy;
    
    // Explicitly resize and fit cytoscape after rendering to avoid zero-size bugs
    setTimeout(() => {
      cy.resize();
      cy.fit();
    }, 100);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  useEffect(() => {
    initGraph();
    return () => {
      if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }
    };
  }, [initGraph]);

  // Sync external selection → Cytoscape
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (selectedNodeId) {
      const node = cy.$id(selectedNodeId);
      if (node && node.length > 0) {
        node.select();
        cy.animate({ center: { eles: node }, zoom: 1.8 }, { duration: 300 });
        const nd = nodes.find((n) => n.id === selectedNodeId) ?? null;
        setSelectedNodeData(nd);
        setConnectedCount(node.neighborhood('node').length);
      }
    } else {
      setSelectedNodeData(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  // ─── Drag-and-drop ────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const name = files[0].name.toLowerCase();
      if (name.includes('cdr') || name.includes('call')) setDragFileType('cdr');
      else if (name.includes('transaction') || name.includes('financial') || name.includes('money')) setDragFileType('transactions');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false); setDragFileType(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && onUpload && dragFileType) onUpload(files[0], dragFileType);
    setDragFileType(null);
  }, [onUpload, dragFileType]);

  // ─── Zoom button helpers ──────────────────────────────────────────────────
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 36, height: 36,
    background: 'rgba(16,26,41,0.95)',
    border: `1px solid ${disabled ? 'rgba(45,212,224,0.08)' : 'rgba(45,212,224,0.3)'}`,
    color: disabled ? '#2e4560' : '#2dd4e0',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
  });

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (nodes.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center bg-base relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ width: '100%', height: '100%', minHeight: 400 }}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-accent/10 border-2 border-dashed border-accent flex items-center justify-center z-10">
            <div className="text-center">
              <p className="text-sm font-semibold text-accent mb-2">Drop {dragFileType || 'file'} here</p>
              <p className="text-xs text-text-muted">
                {dragFileType === 'cdr' ? 'Call Detail Records' : dragFileType === 'transactions' ? 'Financial Transactions' : 'Data file'}
              </p>
            </div>
          </div>
        )}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-panel border border-border-default flex items-center justify-center">
            <svg className="w-8 h-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><circle cx="18" cy="6" r="3" />
              <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" /><line x1="15.5" y1="7.5" x2="8.5" y2="16.5" />
            </svg>
          </div>
          <p className="text-sm text-text-muted font-display">No network data loaded</p>
          <p className="text-xs text-text-muted mt-1">Upload a CSV or click "Pre-load Sample Network" to start</p>
          {onUpload && <p className="text-xs text-accent mt-3">Or drag &amp; drop a CDR or transaction file here</p>}
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapperRef}
      className="flex-1 bg-base relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}
    >
      {/* Cytoscape renders INTO this separate inner div with explicit absolute dimensions */}
      <div 
        ref={cyContainerRef} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} 
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-accent/10 border-2 border-dashed border-accent flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <p className="text-sm font-semibold text-accent mb-2">Drop {dragFileType || 'file'} here</p>
            <p className="text-xs text-text-muted">
              {dragFileType === 'cdr' ? 'Call Detail Records' : dragFileType === 'transactions' ? 'Financial Transactions' : 'Data file'}
            </p>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
          onShowConnections={(nodeId) => onSelectNode(nodeId)}
          onHideNode={() => onSelectNode(null)}
        />
      )}

      {/* Node Detail Panel — top-left, shown on tap */}
      <NodeDetailPanel
        node={selectedNodeData}
        connectedCount={connectedCount}
        patterns={patterns}
        onClose={() => { setSelectedNodeData(null); onSelectNode(null); }}
      />

      {/* ── Search Bar — top-right ── */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 20,
          display: 'flex',
          gap: 6,
          filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.6))',
        }}
      >
        <input
          type="text"
          placeholder="Search node ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          style={{
            background: 'rgba(10,18,30,0.95)',
            border: '1px solid rgba(45,212,224,0.3)',
            borderRadius: 8,
            color: '#dce6f2',
            padding: '6px 12px',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            outline: 'none',
            width: 180,
            transition: 'border-color 0.15s',
            backdropFilter: 'blur(8px)',
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            background: 'rgba(16,26,41,0.95)',
            border: '1px solid rgba(45,212,224,0.4)',
            borderRadius: 8,
            color: '#2dd4e0',
            cursor: 'pointer',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,224,0.2)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,26,41,0.95)'}
          title="Search graph node"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
            Search
          </span>
        </button>
      </div>

      {/* ── Zoom Controls — bottom-right ── */}
      <div
        style={{
          position: 'absolute', bottom: 16, right: 16,
          zIndex: 20, display: 'flex', flexDirection: 'column',
          gap: 0, filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.6))',
        }}
      >
        {/* Zoom In */}
        <button
          id="graph-zoom-in"
          onClick={handleZoomIn}
          disabled={zoomLevel >= MAX_ZOOM}
          title={`Zoom in (+${ZOOM_STEP})`}
          style={{ ...btnStyle(zoomLevel >= MAX_ZOOM), borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
          onMouseEnter={e => { if (zoomLevel < MAX_ZOOM) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,224,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,26,41,0.95)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Zoom % — click to reset */}
        <div
          title="Current zoom — click to reset to 1×"
          onClick={handleResetZoom}
          style={{
            width: 36, height: 28,
            background: 'rgba(16,26,41,0.95)',
            border: '1px solid rgba(45,212,224,0.15)',
            borderTop: 'none', borderBottom: 'none',
            color: '#5a7a9d',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
            cursor: 'pointer', userSelect: 'none', letterSpacing: '0.02em',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(45,212,224,0.08)'; (e.currentTarget as HTMLDivElement).style.color = '#2dd4e0'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(16,26,41,0.95)'; (e.currentTarget as HTMLDivElement).style.color = '#5a7a9d'; }}
        >
          {Math.round(zoomLevel * 100)}%
        </div>

        {/* Zoom Out */}
        <button
          id="graph-zoom-out"
          onClick={handleZoomOut}
          disabled={zoomLevel <= MIN_ZOOM}
          title={`Zoom out (-${ZOOM_STEP})`}
          style={{ ...btnStyle(zoomLevel <= MIN_ZOOM), borderTop: 'none', borderBottom: 'none' }}
          onMouseEnter={e => { if (zoomLevel > MIN_ZOOM) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,224,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,26,41,0.95)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Fit to screen */}
        <button
          id="graph-zoom-fit"
          onClick={handleFit}
          title="Fit graph to screen"
          style={{ ...btnStyle(false), borderRadius: '0 0 8px 8px', borderTop: 'none' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,224,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,26,41,0.95)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
