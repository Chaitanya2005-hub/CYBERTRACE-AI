/**
 * Standalone demo server for Cyber Trace AI.
 *
 * Bypasses Supabase entirely — stores everything in memory.
 * Parses the bundled mock CSVs, runs graph analysis, and serves
 * the same API shape as the real server. No database required.
 *
 * Usage: npx tsx server/demo-server.ts
 */

import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import csvParser from 'csv-parser';
import { buildGraph, detectPatterns } from './utils/graphAnalysis.js';
import { generateReport, getReportMimeType, getReportExtension } from './utils/reportGenerator.js';
import type { CallDetailRecord, FinancialTransaction } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_DATA_DIR = path.join(__dirname, 'mock-data');
const DEMO_CASE_ID = 'demo-kaggle-001'; // New case ID for Kaggle data
const DEMO_USER_ID = 'demo-user-0001';

// Use Kaggle formatted data for demo
const CDR_PATH = path.join(MOCK_DATA_DIR, 'cdr_kaggle_formatted.csv');
const FIN_PATH = path.join(MOCK_DATA_DIR, 'fin_kaggle_formatted.csv');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ─── Static Frontend Serving (for Render / Production) ───
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`📁 Serving frontend build from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
}

// ─── In-memory store ───
let cdrRecords: CallDetailRecord[] = [];
let finTransactions: FinancialTransaction[] = [];
let demoLoaded = false;

// Reset demo data on server start
demoLoaded = false;

// ─── Health check ───
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Demo server running (no Supabase required)', demoLoaded });
});

// ─── Demo preload ───
app.post('/api/demo/preload', async (_req, res) => {
  // Force reload demo data with Kaggle datasets
  console.log('🔄 Loading Kaggle datasets...');
  cdrRecords = [];
  finTransactions = [];
  demoLoaded = false;

  const cdrPath = CDR_PATH;
  const finPath = FIN_PATH;

  if (!fs.existsSync(cdrPath) || !fs.existsSync(finPath)) {
    res.status(500).json({ error: 'Demo CSVs not found. Run generate_mock_data first.' });
    return;
  }

  // Parse CDR records
  await new Promise<void>((resolve, reject) => {
    const rows: CallDetailRecord[] = [];
    fs.createReadStream(cdrPath)
      .pipe(csvParser())
      .on('data', (row: any) => {
        if (row.caller_number && row.receiver_number && row.timestamp && row.duration_sec && row.call_type) {
          const towerId = row.tower_id && row.tower_id.trim() !== '' ? row.tower_id : undefined;
          
          rows.push({
            id: `cdr-${rows.length}`,
            caseId: DEMO_CASE_ID,
            callerNumber: row.caller_number,
            receiverNumber: row.receiver_number,
            timestamp: new Date(row.timestamp).toISOString(),
            durationSec: parseInt(row.duration_sec, 10),
            towerId: towerId,
            callType: row.call_type,
          });
        }
      })
      .on('end', () => { cdrRecords = rows; resolve(); })
      .on('error', reject);
  });

  // Parse financial transactions
  await new Promise<void>((resolve, reject) => {
    const rows: FinancialTransaction[] = [];
    fs.createReadStream(finPath)
      .pipe(csvParser())
      .on('data', (row: any) => {
        if (row.sender_account && row.receiver_account && row.amount_inr && row.timestamp && row.txn_type) {
          const riskScore = row.flagged_risk_score && row.flagged_risk_score.trim() !== '' 
            ? parseFloat(row.flagged_risk_score) 
            : undefined;
          
          const tx: FinancialTransaction = {
            id: `fin-${rows.length}`,
            caseId: DEMO_CASE_ID,
            senderAccount: row.sender_account,
            receiverAccount: row.receiver_account,
            amountInr: parseFloat(row.amount_inr),
            timestamp: new Date(row.timestamp).toISOString(),
            txnType: row.txn_type,
          };
          
          if (riskScore !== undefined) {
            tx.flaggedRiskScore = riskScore;
          }
          
          rows.push(tx);
        }
      })
      .on('end', () => { finTransactions = rows; resolve(); })
      .on('error', reject);
  });

  demoLoaded = true;

  res.json({
    message: 'Demo data loaded successfully',
    caseId: DEMO_CASE_ID,
    caseName: 'Demo Case — Kaggle Real Data',
    cdrInserted: cdrRecords.length,
    finInserted: finTransactions.length,
  });
});

// ─── Graph endpoint ───
app.get('/api/graph/:caseId', (req, res) => {
  const { caseId } = req.params;
  // Allow both the original demo case ID and the new Kaggle case ID
  if (caseId !== DEMO_CASE_ID && caseId !== 'demo-case-0001') {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const { start, end, selectedNode } = req.query as { start?: string; end?: string; selectedNode?: string };

  const graphResponse = buildGraph(cdrRecords, finTransactions, start, end);
  const rawPatterns = detectPatterns(cdrRecords, finTransactions, start, end, selectedNode);

  const patterns = [
    ...rawPatterns.loops.map(loop => ({
      type: 'call_loop' as const,
      nodeIds: loop,
      description: `Call loop detected: ${loop.length} numbers calling each other in a closed cycle`,
      severity: 'critical' as const,
    })),
    ...rawPatterns.frequencySpikes.map(spike => ({
      type: 'frequency_spike' as const,
      nodeIds: [spike.node, ...spike.targetNodes],
      description: `Frequency spike: ${spike.node} has abnormally high call volume (${spike.targetNodes.length} unique contacts)`,
      severity: (spike.targetNodes.length > 10 ? 'critical' : 'medium') as 'critical' | 'medium',
    })),
    ...rawPatterns.launderingRings.map(ring => ({
      type: 'laundering_ring' as const,
      nodeIds: ring,
      description: `Possible laundering ring: ${ring.length} accounts linked by decaying transfers within a short time window`,
      severity: 'critical' as const,
    })),
  ];

  res.json({
    ...graphResponse,
    patterns,
    meta: {
      cdrCount: cdrRecords.length,
      finCount: finTransactions.length,
      nodeCount: graphResponse.nodes.length,
      edgeCount: graphResponse.edges.length,
      patternCount: patterns.length,
      timeRange: { start: start ?? null, end: end ?? null },
    },
  });
});

// ─── Report endpoint ───
app.get('/api/report/:caseId', (req, res) => {
  const { caseId } = req.params;
  // Allow both the original demo case ID and the new Kaggle case ID
  if (caseId !== DEMO_CASE_ID && caseId !== 'demo-case-0001') {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const fmtParam = typeof req.query.format === 'string' ? req.query.format : '';
  const format = fmtParam === 'csv' ? 'csv' : 'pdf';

  const graphResponse = buildGraph(cdrRecords, finTransactions);
  const rawPatterns = detectPatterns(cdrRecords, finTransactions, undefined, undefined, undefined);

  const patterns = [
    ...rawPatterns.loops.map(loop => ({
      type: 'call_loop' as const,
      nodeIds: loop,
      description: `Call loop: ${loop.length} numbers in a closed cycle`,
      severity: 'critical' as const,
    })),
    ...rawPatterns.frequencySpikes.map(spike => ({
      type: 'frequency_spike' as const,
      nodeIds: [spike.node, ...spike.targetNodes],
      description: `Frequency spike: ${spike.node} with ${spike.targetNodes.length} unique contacts`,
      severity: (spike.targetNodes.length > 10 ? 'critical' : 'medium') as 'critical' | 'medium',
    })),
    ...rawPatterns.launderingRings.map(ring => ({
      type: 'laundering_ring' as const,
      nodeIds: ring,
      description: `Laundering ring: ${ring.length} linked accounts with decaying transfers`,
      severity: 'critical' as const,
    })),
  ];

  const reportContent = generateReport(
    {
      caseName: 'Demo Case — Kaggle Real Data',
      caseId,
      nodes: graphResponse.nodes,
      edges: graphResponse.edges,
      patterns,
      generatedAt: new Date().toISOString(),
    },
    format as 'pdf' | 'csv'
  );

  const mimeType = getReportMimeType(format as 'pdf' | 'csv');
  const extension = getReportExtension(format as 'pdf' | 'csv');

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="cyber-trace-report-demo.${extension}"`);
  res.send(reportContent);
});

// ─── Start ───
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  Cyber Trace AI — Demo Server`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  No Supabase required — in-memory storage\n`);
  console.log(`  Endpoints:`);
  console.log(`    GET  /api/health`);
  console.log(`    POST /api/demo/preload`);
  console.log(`    GET  /api/graph/:caseId`);
  console.log(`    GET  /api/report/:caseId?format=pdf|csv\n`);
});
