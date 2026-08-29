const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Detect if we're running in bypass mode (demo server)
export function isBypassModeEnabled(): boolean {
  // Check if we're using the demo server (port 3001) vs production server
  const isDemoServer = API_BASE.includes('3001');
  return isDemoServer;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    degreeCentrality: number;
    riskLevel: 'low' | 'medium' | 'critical';
    isOrchestrator: boolean;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
    frequency: number;
    timeWindow: [string, string];
  }>;
  patterns: Array<{
    type: 'call_loop' | 'frequency_spike' | 'laundering_ring';
    nodeIds: string[];
    description: string;
    severity: 'low' | 'medium' | 'critical';
  }>;
  meta: {
    cdrCount: number;
    finCount: number;
    nodeCount: number;
    edgeCount: number;
    patternCount: number;
    timeRange: { start: string | null; end: string | null };
  };
}

export interface PreloadResponse {
  message: string;
  caseId: string;
  caseName: string;
  cdrInserted: number;
  finInserted: number;
}

export async function fetchGraph(
  caseId: string,
  start?: string,
  end?: string,
  selectedNode?: string
): Promise<GraphData> {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  if (selectedNode) params.set('selectedNode', selectedNode);
  const qs = params.toString();
  return apiFetch<GraphData>(`/api/graph/${caseId}${qs ? `?${qs}` : ''}`);
}

export async function uploadCSV(
  file: File,
  type: 'cdr' | 'transactions',
  caseId: string
): Promise<{ message: string; inserted: number; errors: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('caseId', caseId);

  const res = await fetch(`${API_BASE}/api/upload/${type}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function preloadDemo(): Promise<PreloadResponse> {
  return apiFetch<PreloadResponse>('/api/demo/preload', { method: 'POST' });
}

export async function downloadReport(
  caseId: string,
  format: 'pdf' | 'csv'
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/report/${caseId}?format=${format}`
  );
  if (!res.ok) throw new Error('Report generation failed');

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] ?? `cyber-trace-report.${format === 'csv' ? 'csv' : 'html'}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function checkHealth(): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>('/api/health');
}

export interface Case {
  id: string;
  case_name: string;
  created_at: string;
}

export async function createCase(caseName: string): Promise<Case> {
  return apiFetch<Case>('/api/cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseName })
  });
}

export async function listCases(): Promise<Case[]> {
  return apiFetch<Case[]>('/api/cases');
}
