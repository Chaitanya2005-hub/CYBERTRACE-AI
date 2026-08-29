import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabaseAdmin.js';
import { mockAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildGraph, detectPatterns } from '../utils/graphAnalysis.js';
import { generateReport, getReportMimeType, getReportExtension } from '../utils/reportGenerator.js';
import { isDemoCase, getDemoReport } from '../utils/demoStore.js';
import type { DetectedPattern, FinancialTransaction } from '../../shared/types.js';

export const reportRouter = Router();
reportRouter.use(mockAuth);

reportRouter.get(
  '/:caseId',
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const userId = (req as any).user.id;
    const fmtParam = typeof req.query.format === 'string' ? req.query.format : '';
    const format = fmtParam === 'csv' ? 'csv' : 'pdf';

    if (isDemoCase(caseId)) {
      const demoRep = getDemoReport(format);
      res.setHeader('Content-Type', demoRep.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="cyber-trace-report-demo.${demoRep.extension}"`);
      res.send(demoRep.content);
      return;
    }

    // Anti-IDOR: verify case ownership
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, case_name')
      .eq('id', caseId)
      .eq('user_id', userId)
      .single();

    if (caseError || !caseData) {
      res.status(403).json({ error: 'Forbidden: Case not found or unowned' });
      return;
    }

    // Fetch all records (no time filter for full report)
    const { data: cdrRows, error: cdrError } = await supabaseAdmin
      .from('cdr_records')
      .select('id, case_id, caller_number, receiver_number, timestamp, duration_sec, tower_id, call_type')
      .eq('case_id', caseId);

    if (cdrError) {
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const { data: finRows, error: finError } = await supabaseAdmin
      .from('financial_transactions')
      .select('id, case_id, sender_account, receiver_account, amount_inr, timestamp, txn_type, flagged_risk_score')
      .eq('case_id', caseId);

    if (finError) {
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Map DB rows to shared types
    const cdrRecords = (cdrRows ?? []).map(row => ({
      id: row.id,
      caseId: row.case_id,
      callerNumber: row.caller_number,
      receiverNumber: row.receiver_number,
      timestamp: row.timestamp,
      durationSec: row.duration_sec,
      towerId: row.tower_id ?? undefined,
      callType: row.call_type as 'voice' | 'sms' | 'data',
    }));

    const finTransactions = (finRows ?? []).map(row => {
      const tx: FinancialTransaction = {
        id: row.id,
        caseId: row.case_id,
        senderAccount: row.sender_account,
        receiverAccount: row.receiver_account,
        amountInr: row.amount_inr,
        timestamp: row.timestamp,
        txnType: row.txn_type,
      };
      
      if (row.flagged_risk_score !== null && row.flagged_risk_score !== undefined) {
        tx.flaggedRiskScore = row.flagged_risk_score;
      }
      
      return tx;
    });

    // Build graph and detect patterns (deterministic — same input = same output)
    const graphResponse = buildGraph(cdrRecords, finTransactions);
    const rawPatterns = detectPatterns(cdrRecords, finTransactions);

    const patterns: DetectedPattern[] = [
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

    // Generate the report
    const reportContent = generateReport(
      {
        caseName: String(caseData.case_name ?? 'Untitled Case'),
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
    const safeName = String(caseData.case_name ?? 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="cyber-trace-report-${safeName}.${extension}"`);
    res.send(reportContent);
  })
);
