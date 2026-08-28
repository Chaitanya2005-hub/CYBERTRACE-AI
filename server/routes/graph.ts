import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabaseAdmin.js';
import { mockAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildGraph, detectPatterns } from '../utils/graphAnalysis.js';
import type { DetectedPattern, FinancialTransaction } from '../../shared/types.js';

export const graphRouter = Router();
graphRouter.use(mockAuth);

graphRouter.get(
  '/:caseId',
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const userId = (req as any).user.id;
    const { start, end, selectedNode } = req.query as { start?: string; end?: string; selectedNode?: string };

    // Anti-IDOR: verify case ownership
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .eq('user_id', userId)
      .single();

    if (caseError || !caseData) {
      res.status(403).json({ error: 'Forbidden: Case not found or unowned' });
      return;
    }

    // Fetch CDR records for this case
    let cdrQuery = supabaseAdmin
      .from('cdr_records')
      .select('id, case_id, caller_number, receiver_number, timestamp, duration_sec, tower_id, call_type')
      .eq('case_id', caseId);

    if (start) cdrQuery = cdrQuery.gte('timestamp', start);
    if (end) cdrQuery = cdrQuery.lte('timestamp', end);

    const { data: cdrRows, error: cdrError } = await cdrQuery;

    if (cdrError) {
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Fetch financial transactions for this case
    let finQuery = supabaseAdmin
      .from('financial_transactions')
      .select('id, case_id, sender_account, receiver_account, amount_inr, timestamp, txn_type, flagged_risk_score')
      .eq('case_id', caseId);

    if (start) finQuery = finQuery.gte('timestamp', start);
    if (end) finQuery = finQuery.lte('timestamp', end);

    const { data: finRows, error: finError } = await finQuery;

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

    // Build graph with centrality and orchestrator detection
    const graphResponse = buildGraph(cdrRecords, finTransactions, start, end);

    // Detect patterns
    const rawPatterns = detectPatterns(cdrRecords, finTransactions, start, end, selectedNode);

    // Convert to DetectedPattern format
    const patterns: DetectedPattern[] = [
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
  })
);
