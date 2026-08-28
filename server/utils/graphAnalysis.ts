/**
 * Graph analysis engine for Cyber Trace AI.
 *
 * Computes degree centrality, flags orchestrator nodes (high-centrality bridges
 * between otherwise-disconnected clusters), detects small call loops, and
 * traces multi-hop laundering rings in financial transactions.
 *
 * All algorithms are deterministic — re-running against the same input always
 * produces the same output (required by TESTING.md section 2).
 */

import type { CallDetailRecord, FinancialTransaction, SuspectNode, LinkEdge, GraphResponse, RiskLevel } from '../../shared/types.js';

interface NodeRecord {
  type: 'phone' | 'account';
  connections: Set<string>;
  edgeCount: number;
  totalDuration: number;
}

interface EdgeAccumulator {
  weight: number;
  frequency: number;
  timestamps: string[];
}

// ─── Relative degree centrality & Risk assignment ──────────────────────────────

function computeRelativeCentrality(nodes: Map<string, NodeRecord>): {
  centralityMap: Map<string, number>;
  maxConnections: number;
} {
  const centralityMap = new Map<string, number>();
  if (nodes.size === 0) return { centralityMap, maxConnections: 1 };

  let maxConn = 1;
  for (const record of nodes.values()) {
    if (record.connections.size > maxConn) {
      maxConn = record.connections.size;
    }
  }

  for (const [id, record] of nodes) {
    // Relative centrality normalized against max connections in the dataset (0.0 to 1.0)
    centralityMap.set(id, record.connections.size / maxConn);
  }

  return { centralityMap, maxConnections: maxConn };
}

/**
 * Assign risk levels to the top displayed nodes by PERCENTILE rank
 * so the UI displays a clear, dynamic breakdown:
 * Top 10%  → critical (e.g. 50 nodes)
 * Next 30% → medium   (e.g. 150 nodes)
 * Rest     → low      (e.g. 300 nodes)
 */
function assignRiskLevels(displayedNodes: SuspectNode[]): void {
  if (displayedNodes.length === 0) return;

  const criticalCut = Math.max(1, Math.ceil(displayedNodes.length * 0.10)); // Top 10%
  const mediumCut   = Math.max(2, Math.ceil(displayedNodes.length * 0.40)); // Next 30%

  for (let i = 0; i < displayedNodes.length; i++) {
    const node = displayedNodes[i]!;
    if (i < criticalCut) {
      node.riskLevel = 'critical';
    } else if (i < mediumCut) {
      node.riskLevel = 'medium';
    } else {
      node.riskLevel = 'low';
    }
  }
}

// ─── Orchestrator detection ──────────────────────────────────────────────────

function buildUndirectedEdges(
  callEdges: Map<string, Map<string, EdgeAccumulator>>,
  finEdges: Map<string, Map<string, EdgeAccumulator>>
): Map<string, Set<string>> {
  const undirected = new Map<string, Set<string>>();

  const addEdge = (a: string, b: string) => {
    if (!undirected.has(a)) undirected.set(a, new Set());
    if (!undirected.has(b)) undirected.set(b, new Set());
    undirected.get(a)!.add(b);
    undirected.get(b)!.add(a);
  };

  for (const [src, targets] of callEdges) {
    for (const tgt of targets.keys()) addEdge(src, tgt);
  }
  for (const [src, targets] of finEdges) {
    for (const tgt of targets.keys()) addEdge(src, tgt);
  }

  return undirected;
}

function findClusters(undirected: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const node of undirected.keys()) {
    if (visited.has(node)) continue;
    const cluster: string[] = [];
    const queue = [node];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(current);
      for (const neighbor of undirected.get(current) ?? []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

function identifyOrchestrators(
  nodes: Map<string, NodeRecord>,
  maxConnections: number
): Set<string> {
  const orchestrators = new Set<string>();
  if (nodes.size === 0) return orchestrators;

  // Threshold: nodes with connection count >= 40% of dataset max (minimum 5 connections)
  const threshold = Math.max(5, Math.floor(maxConnections * 0.40));

  for (const [id, record] of nodes) {
    if (record.connections.size >= threshold) {
      orchestrators.add(id);
    }
  }

  return orchestrators;
}


// ─── Call loop detection (DFS, bounded 3–6 node cycles) ──────────────────────
// NOTE: Only runs on top-N high-degree nodes to keep O(n) manageable at scale.
const LOOP_MAX_NODES = 200;  // only inspect top-200 high-degree nodes
const LOOP_MAX_RESULTS = 500; // hard cap on returned loops

function detectCallLoops(
  edges: Map<string, Map<string, EdgeAccumulator>>
): string[][] {
  const loops: string[][] = [];
  const visited = new Set<string>();
  const maxLen = 6;
  const minLen = 3;

  // Rank nodes by degree; only DFS from top-N to keep runtime bounded
  const ranked = [...edges.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, LOOP_MAX_NODES)
    .map(([id]) => id);
  const candidateSet = new Set(ranked);

  const dfs = (start: string, current: string, path: string[]) => {
    if (loops.length >= LOOP_MAX_RESULTS) return;
    if (path.length > maxLen) return;
    if (path.length >= minLen && edges.get(current)?.has(start)) {
      loops.push([...path]);
    }
    if (path.length >= maxLen) return;

    visited.add(current);
    const neighbors = edges.get(current);
    if (neighbors) {
      for (const neighbor of neighbors.keys()) {
        if (loops.length >= LOOP_MAX_RESULTS) break;
        if (!visited.has(neighbor) || (neighbor === start && path.length >= minLen)) {
          if (neighbor === start && path.length >= minLen) {
            loops.push([...path]);
          } else if (!visited.has(neighbor)) {
            dfs(start, neighbor, [...path, neighbor]);
          }
        }
      }
    }
    visited.delete(current);
  };

  for (const node of ranked) {
    if (loops.length >= LOOP_MAX_RESULTS) break;
    if (!candidateSet.has(node)) continue;
    visited.clear();
    dfs(node, node, [node]);
  }

  // Deduplicate loops by sorted node set
  const seen = new Set<string>();
  return loops.filter(loop => {
    const key = [...loop].sort().join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Laundering ring detection (multi-hop, amount decay, short window) ───────

function detectLaunderingRings(
  edges: Map<string, Map<string, EdgeAccumulator>>
): string[][] {
  const rings: string[][] = [];
  const maxHops = 5;

  const dfs = (
    start: string,
    current: string,
    path: string[],
    lastAmount: number,
    timestamps: string[],
    visited: Set<string>
  ) => {
    if (path.length > 1 && path.length <= maxHops) {
      rings.push([...path]);
    }
    if (path.length >= maxHops) return;

    for (const [neighbor, acc] of edges.get(current) ?? []) {
      if (neighbor === start && path.length >= 2) {
        rings.push([...path]);
        continue;
      }
      if (visited.has(neighbor)) continue;
      if (acc.timestamps.length === 0) continue;

      const amounts = acc.timestamps.map((_, i) => acc.weight / (i + 1));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      // Amount should decay — each hop receives less than previous
      if (lastAmount > 0 && avgAmount >= lastAmount * 0.95) continue;

      // All transfers should occur within 24 hours
      const sortedTs = acc.timestamps.map(t => new Date(t).getTime()).sort((a, b) => a - b);
      if (sortedTs.length > 0) {
        const timeSpan = (sortedTs[sortedTs.length - 1]! - sortedTs[0]!) / (1000 * 60 * 60);
        if (timeSpan > 24) continue;
      }

      visited.add(neighbor);
      dfs(start, neighbor, [...path, neighbor], avgAmount, [...timestamps, acc.timestamps[0]!], visited);
      visited.delete(neighbor);
    }
  };

  // Only run from top-degree nodes to keep runtime bounded
  const rankedFin = [...edges.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 150)
    .map(([id]) => id);

  for (const node of rankedFin) {
    if (rings.length >= 300) break;
    const visited = new Set<string>([node]);
    dfs(node, node, [node], Infinity, [], visited);
  }

  // Deduplicate
  const seen = new Set<string>();
  return rings.filter(ring => {
    const key = [...ring].sort().join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Main build function ─────────────────────────────────────────────────────

export function buildGraph(
  cdrRecords: CallDetailRecord[],
  finTransactions: FinancialTransaction[],
  startTs?: string,
  endTs?: string
): GraphResponse {
  // Filter by time window
  let filteredCdr = cdrRecords;
  let filteredFin = finTransactions;

  if (startTs) {
    const start = new Date(startTs).getTime();
    filteredCdr = filteredCdr.filter(r => new Date(r.timestamp).getTime() >= start);
    filteredFin = filteredFin.filter(r => new Date(r.timestamp).getTime() >= start);
  }
  if (endTs) {
    const end = new Date(endTs).getTime();
    filteredCdr = filteredCdr.filter(r => new Date(r.timestamp).getTime() <= end);
    filteredFin = filteredFin.filter(r => new Date(r.timestamp).getTime() <= end);
  }

  // Build node records
  const nodes = new Map<string, NodeRecord>();

  const ensureNode = (id: string, type: 'phone' | 'account') => {
    if (!nodes.has(id)) {
      nodes.set(id, { type, connections: new Set(), edgeCount: 0, totalDuration: 0 });
    }
    return nodes.get(id)!;
  };

  // Accumulate CDR edges
  const cdrEdges = new Map<string, Map<string, EdgeAccumulator>>();
  for (const record of filteredCdr) {
    const caller = record.callerNumber;
    const receiver = record.receiverNumber;

    ensureNode(caller, 'phone');
    ensureNode(receiver, 'phone');
    nodes.get(caller)!.connections.add(receiver);
    nodes.get(receiver)!.connections.add(caller);
    nodes.get(caller)!.edgeCount++;
    nodes.get(caller)!.totalDuration += record.durationSec;

    if (!cdrEdges.has(caller)) cdrEdges.set(caller, new Map());
    const callerTargets = cdrEdges.get(caller)!;
    if (!callerTargets.has(receiver)) {
      callerTargets.set(receiver, { weight: 0, frequency: 0, timestamps: [] });
    }
    const edge = callerTargets.get(receiver)!;
    edge.weight += record.durationSec;
    edge.frequency++;
    edge.timestamps.push(record.timestamp);
  }

  // Accumulate financial edges
  const finEdges = new Map<string, Map<string, EdgeAccumulator>>();
  for (const tx of filteredFin) {
    const sender = tx.senderAccount;
    const receiver = tx.receiverAccount;

    ensureNode(sender, 'account');
    ensureNode(receiver, 'account');
    nodes.get(sender)!.connections.add(receiver);
    nodes.get(receiver)!.connections.add(sender);
    nodes.get(sender)!.edgeCount++;

    if (!finEdges.has(sender)) finEdges.set(sender, new Map());
    const senderTargets = finEdges.get(sender)!;
    if (!senderTargets.has(receiver)) {
      senderTargets.set(receiver, { weight: 0, frequency: 0, timestamps: [] });
    }
    const edge = senderTargets.get(receiver)!;
    edge.weight += tx.amountInr;
    edge.frequency++;
    edge.timestamps.push(tx.timestamp);
  }

  // Compute relative degree centrality (0.0 to 1.0) normalized to max connections
  const { centralityMap, maxConnections } = computeRelativeCentrality(nodes);

  // Identify orchestrator nodes
  const orchestrators = identifyOrchestrators(nodes, maxConnections);

  // Build suspect nodes
  const suspectNodes: SuspectNode[] = [];
  for (const [id] of nodes) {
    const centrality = centralityMap.get(id) ?? 0;
    suspectNodes.push({
      id,
      degreeCentrality: centrality,
      riskLevel: 'low', // placeholder, computed after slicing top 500
      isOrchestrator: orchestrators.has(id),
    });
  }

  // Sort descending by centrality and slice top 500 nodes
  const MAX_GRAPH_NODES = 500;
  const sortedNodes = suspectNodes.sort((a, b) => b.degreeCentrality - a.degreeCentrality);
  const topNodes = sortedNodes.slice(0, MAX_GRAPH_NODES);

  // Assign risk levels (Critical / Medium / Low) directly on the 500 displayed nodes
  assignRiskLevels(topNodes);

  // Upgrade Orchestrator nodes to at least 'medium' if they were 'low'
  for (const node of topNodes) {
    if (node.isOrchestrator && node.riskLevel === 'low') {
      node.riskLevel = 'medium';
    }
  }

  // Build merged edge map
  const mergedEdges = new Map<string, Map<string, { weight: number; frequency: number; timestamps: string[] }>>();

  const mergeEdge = (src: string, tgt: string, edge: EdgeAccumulator) => {
    if (!mergedEdges.has(src)) mergedEdges.set(src, new Map());
    const srcMap = mergedEdges.get(src)!;
    if (!srcMap.has(tgt)) {
      srcMap.set(tgt, { weight: 0, frequency: 0, timestamps: [] });
    }
    const merged = srcMap.get(tgt)!;
    merged.weight += edge.weight;
    merged.frequency += edge.frequency;
    merged.timestamps.push(...edge.timestamps);
  };

  for (const [src, targets] of cdrEdges) {
    for (const [tgt, edge] of targets) mergeEdge(src, tgt, edge);
  }
  for (const [src, targets] of finEdges) {
    for (const [tgt, edge] of targets) mergeEdge(src, tgt, edge);
  }

  // Find global max for normalization
  let maxWeight = 0;
  let maxFrequency = 0;
  for (const targets of mergedEdges.values()) {
    for (const edge of targets.values()) {
      if (edge.weight > maxWeight) maxWeight = edge.weight;
      if (edge.frequency > maxFrequency) maxFrequency = edge.frequency;
    }
  }

  // Build final edge list
  const linkEdges: LinkEdge[] = [];
  for (const [src, targets] of mergedEdges) {
    for (const [tgt, edge] of targets) {
      const sortedTs = edge.timestamps.sort();
      linkEdges.push({
        source: src,
        target: tgt,
        weight: maxWeight > 0 ? edge.weight / maxWeight : 0,
        frequency: edge.frequency,
        timeWindow: [
          sortedTs[0] ?? new Date().toISOString(),
          sortedTs[sortedTs.length - 1] ?? new Date().toISOString(),
        ],
      });
    }
  }

  const topNodeIds = new Set(topNodes.map(n => n.id));
  const filteredEdges = linkEdges
    .sort((a, b) => b.frequency - a.frequency)
    .filter(e => topNodeIds.has(e.source) && topNodeIds.has(e.target));

  return {
    nodes: topNodes,
    edges: filteredEdges,
  };
}

export function detectPatterns(
  cdrRecords: CallDetailRecord[],
  finTransactions: FinancialTransaction[],
  startTs?: string,
  endTs?: string,
  selectedNodeId?: string
) {
  let filteredCdr = cdrRecords;
  let filteredFin = finTransactions;

  if (startTs) {
    const start = new Date(startTs).getTime();
    filteredCdr = filteredCdr.filter(r => new Date(r.timestamp).getTime() >= start);
    filteredFin = filteredFin.filter(r => new Date(r.timestamp).getTime() >= start);
  }
  if (endTs) {
    const end = new Date(endTs).getTime();
    filteredCdr = filteredCdr.filter(r => new Date(r.timestamp).getTime() <= end);
    filteredFin = filteredFin.filter(r => new Date(r.timestamp).getTime() <= end);
  }

  // Build call edge map for loop detection
  const callEdges = new Map<string, Map<string, EdgeAccumulator>>();
  for (const record of filteredCdr) {
    if (!callEdges.has(record.callerNumber)) callEdges.set(record.callerNumber, new Map());
    const targets = callEdges.get(record.callerNumber)!;
    if (!targets.has(record.receiverNumber)) {
      targets.set(record.receiverNumber, { weight: 0, frequency: 0, timestamps: [] });
    }
    const edge = targets.get(record.receiverNumber)!;
    edge.weight += record.durationSec;
    edge.frequency++;
    edge.timestamps.push(record.timestamp);
  }

  // Build financial edge map for laundering detection
  const finEdgeMap = new Map<string, Map<string, EdgeAccumulator>>();
  for (const tx of filteredFin) {
    if (!finEdgeMap.has(tx.senderAccount)) finEdgeMap.set(tx.senderAccount, new Map());
    const targets = finEdgeMap.get(tx.senderAccount)!;
    if (!targets.has(tx.receiverAccount)) {
      targets.set(tx.receiverAccount, { weight: 0, frequency: 0, timestamps: [] });
    }
    const edge = targets.get(tx.receiverAccount)!;
    edge.weight += tx.amountInr;
    edge.frequency++;
    edge.timestamps.push(tx.timestamp);
  }

  // Detect loops
  const loops = detectCallLoops(callEdges);

  // Detect laundering rings
  const launderingRings = detectLaunderingRings(finEdgeMap);

  // Detect frequency spikes — nodes with abnormally high connection count
  const nodeFreq = new Map<string, number>();
  for (const [src, targets] of callEdges) {
    nodeFreq.set(src, (nodeFreq.get(src) ?? 0) + targets.size);
    for (const [tgt] of targets) {
      nodeFreq.set(tgt, (nodeFreq.get(tgt) ?? 0) + 1);
    }
  }

  const freqValues = [...nodeFreq.values()];
  const meanFreq = freqValues.reduce((a, b) => a + b, 0) / (freqValues.length || 1);
  const stdFreq = Math.sqrt(freqValues.reduce((a, b) => a + (b - meanFreq) ** 2, 0) / (freqValues.length || 1));
  const spikeThreshold = meanFreq + 2 * stdFreq;

  const frequencySpikes: { node: string; targetNodes: string[] }[] = [];
  for (const [node, freq] of nodeFreq) {
    if (freq > spikeThreshold && freq >= 5) {
      const targets = new Set<string>();
      for (const [src, tgtMap] of callEdges) {
        if (src === node) for (const tgt of tgtMap.keys()) targets.add(tgt);
        for (const [tgt] of tgtMap) {
          if (tgt === node) targets.add(src);
        }
      }
      frequencySpikes.push({ node, targetNodes: [...targets] });
    }
  }

  // Filter patterns for selected node if provided
  let filteredLoops = loops;
  let filteredLaunderingRings = launderingRings;
  let filteredFrequencySpikes = frequencySpikes;

  if (selectedNodeId) {
    filteredLoops = loops.filter(loop => loop.includes(selectedNodeId));
    filteredLaunderingRings = launderingRings.filter(ring => ring.includes(selectedNodeId));
    filteredFrequencySpikes = frequencySpikes.filter(spike => spike.node === selectedNodeId);
  }

  return { 
    loops: filteredLoops, 
    launderingRings: filteredLaunderingRings, 
    frequencySpikes: filteredFrequencySpikes 
  };
}
