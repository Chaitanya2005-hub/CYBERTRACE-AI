import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import csvParser from 'csv-parser';
import { buildGraph, detectPatterns } from './graphAnalysis.js';
import { generateReport, getReportMimeType, getReportExtension } from './reportGenerator.js';
import type { CallDetailRecord, FinancialTransaction } from '../../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_DATA_DIR = path.join(__dirname, '../mock-data');
export const DEMO_CASE_ID = 'demo-kaggle-001';

const CDR_PATH = path.join(MOCK_DATA_DIR, 'cdr_kaggle_formatted.csv');
const FIN_PATH = path.join(MOCK_DATA_DIR, 'fin_kaggle_formatted.csv');

let cdrRecords: CallDetailRecord[] = [];
let finTransactions: FinancialTransaction[] = [];
let demoLoaded = false;

export function isDemoCase(caseId: string): boolean {
  return caseId === DEMO_CASE_ID || caseId === 'demo-case-0001';
}

export async function loadDemoData(): Promise<{ cdrInserted: number; finInserted: number }> {
  console.log('🔄 Loading Kaggle datasets into memory...');
  cdrRecords = [];
  finTransactions = [];
  demoLoaded = false;

  if (!fs.existsSync(CDR_PATH) || !fs.existsSync(FIN_PATH)) {
    throw new Error('Demo CSVs not found in server/mock-data');
  }

  // Parse CDR records
  await new Promise<void>((resolve, reject) => {
    const rows: CallDetailRecord[] = [];
    fs.createReadStream(CDR_PATH)
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
    fs.createReadStream(FIN_PATH)
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

  return {
    cdrInserted: cdrRecords.length,
    finInserted: finTransactions.length,
  };
}

export function getDemoGraphData(start?: string, end?: string, selectedNode?: string) {
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

  return {
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
  };
}

export function getDemoReport(format: 'pdf' | 'csv') {
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

  const content = generateReport(
    {
      caseName: 'Demo Case — Kaggle Real Data',
      caseId: DEMO_CASE_ID,
      nodes: graphResponse.nodes,
      edges: graphResponse.edges,
      patterns,
      generatedAt: new Date().toISOString(),
    },
    format
  );

  return {
    content,
    mimeType: getReportMimeType(format),
    extension: getReportExtension(format),
  };
}
