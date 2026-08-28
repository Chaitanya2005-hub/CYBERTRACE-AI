import { useEffect, useRef, useCallback } from 'react';
import cytoscape from 'cytoscape';

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
}

const RISK_COLORS: Record<string, string> = {
  critical: '#ff5673',
  medium: '#ffb238',
  low: '#35d399',
};

const ACCENT = '#2dd4e0';

function buildElements(
  nodes: GraphNode[],
  edges: GraphEdge[]
) {
  const maxCentrality = Math.max(...nodes.map((n) => n.degreeCentrality), 0.001);
  const maxFreq = Math.max(...edges.map((e) => e.frequency), 1);

  const cyNodes = nodes.map((n) => ({
    data: {
      id: n.id,
      label: n.id.length > 14 ? n.id.slice(0, 12) + '…' : n.id,
      degreeCentrality: n.degreeCentrality,
      riskLevel: n.riskLevel,
      isOrchestrator: n.isOrchestrator,
      // Scale node size by centrality (30–60px range)
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
      // Scale edge width by frequency (1–4px)
      edgeWidth: 1 + (e.frequency / maxFreq) * 3,
    },
  }));

  return { cyNodes, cyEdges };
}

export function GraphCanvas({
  nodes,
  edges,
  patterns,
  selectedNodeId,
  onSelectNode,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  // Stable ref so event handlers never become stale without triggering graph reinit
  const onSelectNodeRef = useRef(onSelectNode);
  useEffect(() => { onSelectNodeRef.current = onSelectNode; }, [onSelectNode]);

  const initGraph = useCallback(() => {
    if (!containerRef.current) return;

    // Destroy existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    if (nodes.length === 0) return;

  const { cyNodes, cyEdges } = buildElements(nodes, edges);

    const cy = cytoscape({
      container: containerRef.current,
      elements: { nodes: cyNodes, edges: cyEdges },
      style: [
        // Base node style
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#101a29',
            'border-width': 2,
            'border-color': 'data(riskLevel)',
            width: 'data(nodeSize)',
            height: 'data(nodeSize)',
            'font-size': '9px',
            'font-family': 'JetBrains Mono, monospace',
            color: '#dce6f2',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-max-width': '80px',
            'text-wrap': 'ellipsis',
            'overlay-opacity': 0,
            'transition-property':
              'background-color, border-color, width, height',
            'transition-duration': 300,
          } as any,
        },
        // Risk-colored borders
        {
          selector: 'node[riskLevel = "critical"]',
          style: { 'border-color': RISK_COLORS.critical },
        },
        {
          selector: 'node[riskLevel = "medium"]',
          style: { 'border-color': RISK_COLORS.medium },
        },
        {
          selector: 'node[riskLevel = "low"]',
          style: { 'border-color': RISK_COLORS.low },
        },
        // Orchestrator pulsing ring
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
        // Selected node highlight
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': ACCENT,
            'background-color': '#0c2030',
          },
        },
        // Base edge style
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
        // Loop overlay edges (dashed, critical color)
        {
          selector: 'edge.loop-highlight',
          style: {
            'line-color': RISK_COLORS.critical,
            'line-style': 'dashed',
            opacity: 0.8,
          },
        },
        // Selected edge highlight
        {
          selector: 'edge:selected',
          style: {
            'line-color': ACCENT,
            opacity: 1,
            width: 3,
          },
        },
        // Connected component on hover
        {
          selector: '.faded',
          style: { opacity: 0.15 },
        },
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
      minZoom: 0.2,
      maxZoom: 5,
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

    // Click to select node
    cy.on('tap', 'node', (evt: any) => {
      const id = evt.target.id();
      // Use ref so this handler never causes graph reinit
      onSelectNodeRef.current(id === selectedNodeId ? null : id);
    });

    // Click background to deselect
    cy.on('tap', (evt: any) => {
      if (evt.target === cy) {
        onSelectNodeRef.current(null);
      }
    });

    // Hover — highlight connected neighborhood
    cy.on('mouseover', 'node', (evt: any) => {
      const node = evt.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass('faded');
      neighborhood.removeClass('faded');
    });

    cy.on('mouseout', 'node', () => {
      cy.elements().removeClass('faded');
    });

    cyRef.current = cy;
  // Only rebuild when actual data changes, NOT when selection changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  useEffect(() => {
    initGraph();
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [initGraph]);

  // Sync external selection to Cytoscape
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().unselect();
    if (selectedNodeId) {
      const node = cy.$id(selectedNodeId);
      if (node && node.length > 0) {
        node.select();
        cy.animate({
          center: { eles: node },
          zoom: 2,
        }, { duration: 300 });
      }
    }
  }, [selectedNodeId]);

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-base">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-panel border border-border-default flex items-center justify-center">
            <svg className="w-8 h-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="18" r="3" />
              <circle cx="18" cy="6" r="3" />
              <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
              <line x1="15.5" y1="7.5" x2="8.5" y2="16.5" />
            </svg>
          </div>
          <p className="text-sm text-text-muted font-display">
            No network data loaded
          </p>
          <p className="text-xs text-text-muted mt-1">
            Upload a CSV or click "Pre-load Sample Network" to start
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 bg-base" />
  );
}
