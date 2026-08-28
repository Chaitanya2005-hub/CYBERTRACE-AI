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

// ─── Degree centrality ───────────────────────────────────────────────────────

function computeCentrality(nodes: Map<string, NodeRecord>): Map<string, number> {
  const totalNodes = nodes.size;
  if (totalNodes === 0) return new Map();

  const centralityMap = new Map<string, number>();
  for (const [id, record] of nodes) {
    centralityMap.set(id, record.connections.size / (totalNodes - 1 || 1));
  }
  return centralityMap;
}

function riskFromCentrality(centrality: number, totalNodes: number): RiskLevel {
  if (totalNodes === 0) return 'low';
  if (centrality > 0.15) return 'critical';
  if (centrality > 0.07) return 'medium';
  return 'low';
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
  centralityMap: Map<string, number>,
  undirected: Map<string, Set<string>>
): Set<string> {
  const clusters = findClusters(undirected);
  const nodeClusterMap = new Map<string, Set<number>>();

  clusters.forEach((cluster, idx) => {
    for (const node of cluster) {
      if (!nodeClusterMap.has(node)) nodeClusterMap.set(node, new Set());
      nodeClusterMap.get(node)!.add(idx);
    }
  });

  const orchestrators = new Set<string>();
  const sortedByCentrality = [...centralityMap.entries()]
    .sort((a, b) => b[1] - a[1]);
  const topN = Math.max(3, Math.floor(sortedByCentrality.length * 0.05));

  for (let i = 0; i < Math.min(topN, sortedByCentrality.length); i++) {
    const [nodeId] = sortedByCentrality[i]!;
    const clusterCount = nodeClusterMap.get(nodeId)?.size ?? 0;
    if (clusterCount >= 2) {
      orchestrators.add(nodeId);
    }
  }

  // Also flag any node with centrality above a high absolute threshold
  for (const [nodeId, centrality] of centralityMap) {
    if (centrality > 0.25) {
      orchestrators.add(nodeId);
    }
  }

  return orchestrators;
}

// ─── Call loop detection (DFS, bounded 3–6 node cycles) ──────────────────────

function detectCallLoops(
  edges: Map<string, Map<string, EdgeAccumulator>>
): string[][] {
  const loops: string[][] = [];
  const visited = new Set<string>();
  const maxLen = 6;
  const minLen = 3;

  const dfs = (start: string, current: string, path: string[]) => {
    if (path.length > maxLen) return;
    if (path.length >= minLen && edges.get(current)?.has(start)) {
      loops.push([...path]);
    }
    if (path.length >= maxLen) return;

    visited.add(current);
    const neighbors = edges.get(current);
    if (neighbors) {
    for (const neighbor of neighbors.keys()) {
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

  for (const node of edges.keys()) {
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

  const allNodes = new Set<string>();
  for (const [src, targets] of edges) {
    allNodes.add(src);
    for (const target of targets.keys()) allNodes.add(target);
  }

  for (const node of allNodes) {
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

  // Compute centrality
  const centralityMap = computeCentrality(nodes);

  // Identify orchestrators
  const undirected = buildUndirectedEdges(cdrEdges, finEdges);
  const orchestrators = identifyOrchestrators(centralityMap, undirected);

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

  // Build suspect nodes
  const suspectNodes: SuspectNode[] = [];
  for (const [id, record] of nodes) {
    const centrality = centralityMap.get(id) ?? 0;
    suspectNodes.push({
      id,
      degreeCentrality: centrality,
      riskLevel: riskFromCentrality(centrality, nodes.size),
      isOrchestrator: orchestrators.has(id),
    });
  }

  return {
    nodes: suspectNodes.sort((a, b) => b.degreeCentrality - a.degreeCentrality),
    edges: linkEdges.sort((a, b) => b.frequency - a.frequency),
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
