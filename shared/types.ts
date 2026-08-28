/**
 * Shared domain types — Cyber Trace AI
 *
 * Imported by both client and server. This is the load-bearing contract referenced throughout
 * ARCHITECTURE.md and audited by .agents/skills/supabase-schema-guardian.md and
 * .agents/skills/parallel-executor.md.
 *
 * Rule: any change here must be reflected on both the client and server side in the same pass
 * (see .agents/rules/antigravity-rules.md section 3, "Shared types are load-bearing").
 */

export interface CallDetailRecord {
  id: string;
  caseId: string;
  callerNumber: string;
  receiverNumber: string;
  timestamp: string; // ISO 8601
  durationSec: number;
  towerId?: string;
  callType: 'voice' | 'sms' | 'data';
}

export interface FinancialTransaction {
  id: string;
  caseId: string;
  senderAccount: string;
  receiverAccount: string;
  amountInr: number;
  timestamp: string; // ISO 8601
  txnType: string;
  flaggedRiskScore?: number;
}

export type RiskLevel = 'low' | 'medium' | 'critical';

export interface SuspectNode {
  id: string; // phone number or account number
  degreeCentrality: number;
  riskLevel: RiskLevel;
  isOrchestrator: boolean;
}

export interface LinkEdge {
  source: string;
  target: string;
  weight: number;
  frequency: number;
  timeWindow: [string, string]; // [ISO start, ISO end]
}

export interface GraphQueryParams {
  caseId: string;
  startTs: string; // ISO 8601
  endTs: string; // ISO 8601
  minDegreeCentrality?: number;
}

export interface GraphResponse {
  nodes: SuspectNode[];
  edges: LinkEdge[];
}

export interface DetectedPattern {
  type: 'call_loop' | 'frequency_spike' | 'laundering_ring';
  nodeIds: string[];
  description: string;
  severity: RiskLevel;
}

export interface Case {
  id: string;
  userId: string;
  caseName: string;
  createdAt: string; // ISO 8601
}
