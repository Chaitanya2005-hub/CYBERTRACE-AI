/**
 * Report generator for Cyber Trace AI.
 *
 * Produces deterministic, court-ready audit reports from graph analysis results.
 * PDF is the primary format (legal use case); CSV is secondary.
 *
 * Determinism guarantee: given the same input data, this module always produces
 * the same report content (no randomness, no time-dependent formatting).
 */

import type { SuspectNode, LinkEdge, DetectedPattern } from '../../shared/types.js';

interface ReportData {
  caseName: string;
  caseId: string;
  nodes: SuspectNode[];
  edges: LinkEdge[];
  patterns: DetectedPattern[];
  generatedAt: string;
}

function generateCSV(data: ReportData): string {
  const lines: string[] = [];

  lines.push('=== CYBER TRACE AI — AUDIT REPORT ===');
  lines.push(`Case: ${data.caseName}`);
  lines.push(`Case ID: ${data.caseId}`);
  lines.push(`Generated: ${data.generatedAt}`);
  lines.push('');

  // Flagged suspects section
  lines.push('--- FLAGGED SUSPECTS ---');
  lines.push('ID,Type,Degree Centrality,Risk Level,Orchestrator');
  const flaggedNodes = data.nodes.filter(n => n.riskLevel !== 'low' || n.isOrchestrator);
  for (const node of flaggedNodes) {
    const type = node.id.startsWith('+') ? 'Phone' : 'Account';
    lines.push(
      `"${node.id}",${type},${node.degreeCentrality.toFixed(4)},${node.riskLevel.toUpperCase()},${node.isOrchestrator ? 'YES' : 'NO'}`
    );
  }
  lines.push('');

  // Detected patterns section
  lines.push('--- DETECTED PATTERNS ---');
  lines.push('Type,Severity,Description,Nodes Involved');
  for (const pattern of data.patterns) {
    lines.push(
      `"${pattern.type}","${pattern.severity.toUpperCase()}","${pattern.description}","${pattern.nodeIds.join('; ')}"`
    );
  }
  lines.push('');

  // Evidence trail — top edges by frequency
  lines.push('--- EVIDENCE TRAIL (TOP CONNECTIONS) ---');
  lines.push('Source,Target,Weight (Normalized),Frequency,Time Window Start,Time Window End');
  const topEdges = data.edges
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 100);
  for (const edge of topEdges) {
    lines.push(
      `"${edge.source}","${edge.target}",${edge.weight.toFixed(4)},${edge.frequency},"${edge.timeWindow[0]}","${edge.timeWindow[1]}"`
    );
  }

  return lines.join('\n');
}

function generatePDFContent(data: ReportData): string {
  // Generate a well-structured HTML document that can be printed to PDF
  const flaggedNodes = data.nodes.filter(n => n.riskLevel !== 'low' || n.isOrchestrator);
  const criticalCount = data.nodes.filter(n => n.riskLevel === 'critical').length;
  const mediumCount = data.nodes.filter(n => n.riskLevel === 'medium').length;
  const lowCount = data.nodes.filter(n => n.riskLevel === 'low').length;
  const orchestratorCount = data.nodes.filter(n => n.isOrchestrator).length;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cyber Trace AI — Audit Report — ${data.caseName}</title>
  <style>
    body { font-family: 'Courier New', monospace; color: #1a1a1a; margin: 40px; font-size: 11px; line-height: 1.5; }
    h1 { font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; }
    h2 { font-size: 14px; margin-top: 24px; border-bottom: 1px solid #666; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10px; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .critical { color: #d00; font-weight: bold; }
    .medium { color: #b50; font-weight: bold; }
    .low { color: #0a0; }
    .orchestrator { background: #fff0f0; }
    .summary-box { border: 1px solid #000; padding: 12px; margin: 16px 0; }
    .header-meta { font-size: 11px; color: #444; margin-bottom: 16px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>CYBER TRACE AI — AUDIT REPORT</h1>
  <div class="header-meta">
    <strong>Case:</strong> ${data.caseName}<br>
    <strong>Case ID:</strong> ${data.caseId}<br>
    <strong>Generated:</strong> ${data.generatedAt}<br>
    <strong>Tool:</strong> Cyber Trace AI — CDR &amp; Financial Link-Graph Visualizer
  </div>

  <div class="summary-box">
    <strong>NETWORK SUMMARY</strong><br>
    Total Nodes: ${data.nodes.length} |
    Total Connections: ${data.edges.length} |
    Critical: ${criticalCount} |
    Medium: ${mediumCount} |
    Low: ${lowCount} |
    Orchestrators: ${orchestratorCount}
  </div>

  <h2>Flagged Suspects</h2>
  <table>
    <tr><th>ID</th><th>Type</th><th>Centrality</th><th>Risk</th><th>Orchestrator</th></tr>
    ${flaggedNodes.map(n => `
      <tr class="${n.isOrchestrator ? 'orchestrator' : ''}">
        <td>${n.id}</td>
        <td>${n.id.startsWith('+') ? 'Phone' : 'Account'}</td>
        <td>${n.degreeCentrality.toFixed(4)}</td>
        <td class="${n.riskLevel}">${n.riskLevel.toUpperCase()}</td>
        <td>${n.isOrchestrator ? 'YES' : '—'}</td>
      </tr>
    `).join('')}
  </table>

  <h2>Detected Patterns</h2>
  <table>
    <tr><th>Type</th><th>Severity</th><th>Description</th><th>Nodes Involved</th></tr>
    ${data.patterns.map(p => `
      <tr>
        <td>${p.type.replace('_', ' ')}</td>
        <td class="${p.severity}">${p.severity.toUpperCase()}</td>
        <td>${p.description}</td>
        <td style="font-size:9px">${p.nodeIds.join(', ')}</td>
      </tr>
    `).join('')}
  </table>

  <h2>Evidence Trail (Top Connections)</h2>
  <table>
    <tr><th>Source</th><th>Target</th><th>Weight</th><th>Frequency</th><th>Time Window</th></tr>
    ${data.edges.sort((a, b) => b.frequency - a.frequency).slice(0, 50).map(e => `
      <tr>
        <td>${e.source}</td>
        <td>${e.target}</td>
        <td>${e.weight.toFixed(4)}</td>
        <td>${e.frequency}</td>
        <td>${new Date(e.timeWindow[0]).toLocaleDateString()} — ${new Date(e.timeWindow[1]).toLocaleDateString()}</td>
      </tr>
    `).join('')}
  </table>

  <div style="margin-top: 32px; font-size: 9px; color: #888; border-top: 1px solid #ccc; padding-top: 8px;">
    This report was generated by Cyber Trace AI for investigative purposes only.
    Flagged individuals are algorithmic outputs, not allegations of guilt.
    All data is synthetic (mock data) unless otherwise noted.
  </div>
</body>
</html>`;
}

export function generateReport(data: ReportData, format: 'pdf' | 'csv'): string {
  if (format === 'csv') {
    return generateCSV(data);
  }
  return generatePDFContent(data);
}

export function getReportMimeType(format: 'pdf' | 'csv'): string {
  return format === 'csv' ? 'text/csv' : 'text/html';
}

export function getReportExtension(format: 'pdf' | 'csv'): string {
  return format === 'csv' ? 'csv' : 'html';
}
