# Architecture — Cyber Trace AI

Implements the structured-data slice of SIH26189 (see `PRD.md` for scope boundary).

## 1. System Overview
```
┌─────────────────┐        ┌──────────────────────┐        ┌─────────────────────┐
│   Client (SPA)   │  HTTP  │   Backend (Express)   │  SQL   │  Supabase (Postgres)│
│  React + Vite    │◄──────►│  Node.js + multer +   │◄──────►│  + Row-Level Security│
│  Cytoscape.js     │        │  csv-parser            │        │  + Supabase Auth     │
│  Tailwind CSS     │        │                        │        │                      │
│  Phosphor Icons   │        │                        │        │                      │
└─────────────────┘        └──────────────────────┘        └─────────────────────┘
        │                              │
        │  @supabase/supabase-js       │  @supabase/supabase-js
        │  (anon key, RLS-enforced,    │  (service role key,
        │   auth + read)               │   server-side only)
        └──────────────────────────────┘
```

Two separate Supabase clients exist by design:
- **Client-side** (`client/src/services/auth.ts`): anon key only, every query passes through
  RLS. Used for authentication (`signIn`, `signUp`, `signOut`) and direct reads the frontend is
  allowed to make (e.g. fetching a case the user owns).
- **Server-side** (`server/utils/supabaseAdmin.ts`): service role key, never sent to the browser. Used for
  ingest writes and any operation that needs to bypass RLS deliberately (with explicit ownership checks
  written into the query itself, not skipped).

**Authentication**: Supabase Auth is used for user management. The system supports two modes:
- **Production Mode**: Full Supabase Auth with real user accounts, email verification, and session management
- **Bypass Mode**: Demo mode that accepts any credentials for instant access without database setup

**Demo server** (`server/demo-server.ts`): a standalone Express server that bypasses Supabase entirely,
storing everything in memory. Parses the bundled Kaggle CSVs (real fraud data), runs the same
`graphAnalysis.ts` and `reportGenerator.ts` modules, and serves the same API shape as the production
server. Used for cold-start demos where no database configuration is available. Started with
`PORT=3001 node ./node_modules/tsx/dist/cli.mjs server/demo-server.ts`.

## 2. Data Flow — CSV Upload to Graph
1. User selects/drops a CSV in the client → `POST /api/upload/cdr` (or `/transactions`), `multipart/form-data`
   via `multer`.
2. Backend streams the file through `csv-parser` (not a full in-memory buffer) — required for the
   10,000-row stress case.
3. Each row is validated against the expected schema (see `codebase-memory.md` section 3). Malformed
   rows are rejected with a row-level error, not a whole-file failure, where feasible.
4. Valid rows are inserted into `cdr_records` / `financial_transactions`, scoped to the active `case_id`
   and the authenticated `user_id` (RLS-enforced at write time, not just read time).
5. Client requests `GET /api/graph/:caseId?start=&end=` → backend queries the case's records, builds
   nodes/edges server-side (or returns raw records for client-side graph construction — pick one
   consistently; see Decision Log), and returns a `GraphResponse`.
6. Cytoscape.js renders the response; centrality is computed either server-side (once, cached) or
   client-side on load — see Decision Log.

## 3. Core Domain Model (shared types)
Defined once in `shared/types.ts`, imported by both client and server — this is the contract
`parallel-executor` and `supabase-schema-guardian` both check against.

```ts
interface CallDetailRecord {
  id: string;
  caseId: string;
  callerNumber: string;
  receiverNumber: string;
  timestamp: string;      // ISO 8601
  durationSec: number;
  towerId?: string;
  callType: 'voice' | 'sms' | 'data';
}

interface FinancialTransaction {
  id: string;
  caseId: string;
  senderAccount: string;
  receiverAccount: string;
  amountInr: number;
  timestamp: string;      // ISO 8601
  txnType: string;
  flaggedRiskScore?: number;
}

interface SuspectNode {
  id: string;              // phone number or account number
  degreeCentrality: number;
  riskLevel: 'low' | 'medium' | 'critical';
  isOrchestrator: boolean;
}

interface LinkEdge {
  source: string;
  target: string;
  weight: number;
  frequency: number;
  timeWindow: [string, string]; // ISO start, end
}

interface GraphQueryParams {
  caseId: string;
  startTs: string;
  endTs: string;
  minDegreeCentrality?: number;
}

interface GraphResponse {
  nodes: SuspectNode[];
  edges: LinkEdge[];
}
```

## 4. Database Schema (Supabase / Postgres)
Owned and audited by `supabase-schema-guardian.md` — this section should always match the live
schema; if it drifts, the guardian skill's job is to catch and correct it.

```sql
-- Ownership boundary for every investigation
create table cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  case_name text not null,
  created_at timestamptz default now()
);

create table cdr_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  caller_number text not null,
  receiver_number text not null,
  timestamp timestamptz not null,
  duration_sec integer not null,
  tower_id text,
  call_type text not null
);

create table financial_transactions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  sender_account text not null,
  receiver_account text not null,
  amount_inr numeric not null,
  timestamp timestamptz not null,
  txn_type text not null,
  flagged_risk_score numeric
);

-- RLS: every table scoped to the owning user via the parent case
alter table cases enable row level security;
alter table cdr_records enable row level security;
alter table financial_transactions enable row level security;

create policy "Users manage their own cases"
  on cases for all
  using (auth.uid() = user_id);

create policy "Users access CDRs for their own cases"
  on cdr_records for all
  using (exists (select 1 from cases where cases.id = cdr_records.case_id and cases.user_id = auth.uid()));

create policy "Users access transactions for their own cases"
  on financial_transactions for all
  using (exists (select 1 from cases where cases.id = financial_transactions.case_id and cases.user_id = auth.uid()));
```

Indexes to add once query patterns stabilize: `(case_id, timestamp)` on both `cdr_records` and
`financial_transactions` — the time-range filter is the most frequent query shape.

## 5. API Surface
| Method | Route | Purpose | Auth |
|---|---|---|---|
| POST | `/api/upload/cdr` | Stream-parse and insert a CDR CSV | Required, case-scoped |
| POST | `/api/upload/transactions` | Stream-parse and insert a financial CSV | Required, case-scoped |
| GET | `/api/graph/:caseId` | Return nodes/edges for a case, optional `start`/`end` query params | Required, case-scoped |
| GET | `/api/report/:caseId` | Generate and return the audit PDF/CSV | Required, case-scoped |
| POST | `/api/demo/preload` | Load bundled sample dataset into a demo-namespaced case | None (demo-only, isolated) |

Every route except `/api/demo/preload` must resolve `case_id` ownership against `auth.uid()` server-side
before touching the DB — this is the Anti-IDOR rule in practice, not just policy.

## 6. Key Algorithms (owned by `server/utils/`)
- **Degree centrality:** count of unique connections per node within the queried time window;
  normalize by network size for the `riskLevel` bucket thresholds.
- **Orchestrator flag:** top-N by centrality AND bridging ≥2 otherwise-disconnected clusters (a pure
  high-degree node that's only locally popular isn't necessarily an orchestrator — bridging matters).
- **Loop detection:** cycle detection on the directed call/transfer graph, bounded to small cycles
  (3–6 nodes) to keep it tractable on large datasets.
- **Laundering ring detection:** chain-following on `financial_transactions` looking for multi-hop
  transfers with amount decay within a short time window.

## 7. Deployment Targets
- **Frontend:** Vite dev server for local development (`cd client && vite --port 5173`).
- **Backend (production):** Render or Railway (Node/Express + Supabase).
- **Backend (demo):** Standalone `demo-server.ts` with in-memory storage — no database required.
- **Database:** Supabase-hosted Postgres (production path only).
- Client API layer (`client/src/services/api.ts`) defaults to `http://localhost:3001` and can be
  overridden via `VITE_API_BASE_URL` environment variable.
- Validated end-to-end by `deployment-checker.md` before judging.

## 8. Decision Log
| Decision | Choice | Rationale |
|---|---|---|
| Centrality computed where? | **Server-side** (`server/utils/graphAnalysis.ts`) | Server-side = cacheable, consistent across clients, and keeps `buildGraph()` a pure function. Central scoring happens once per query; client only renders the pre-computed `SuspectNode[]`. |
| Graph built server- or client-side? | **Server-side** (`buildGraph()` in `graphAnalysis.ts`) | Keeps `GraphResponse` a clean, pre-shaped contract per `shared/types.ts`. Server merges CDR and financial edges, normalizes weights, and returns a ready-to-render graph. Client receives 127 nodes / 218 edges from the demo dataset with zero client-side computation. |
| Report format | PDF primary, CSV secondary (per `PRD.md` open question) | PDF matches the "court documentation" use case in the PS. Implemented as HTML-to-download in `reportGenerator.ts` (deterministic, no external PDF library). |
| Demo data source | Bundled CSVs parsed in-memory by `demo-server.ts` | Supabase credentials are unavailable in local dev without a live project. Demo server bypasses the database entirely, uses the same `graphAnalysis.ts` engine, and serves the identical API shape. Idempotent — re-clicking returns already-loaded data. |
| Icon library | Phosphor Icons (`@phosphor-icons/react`) replacing Lucide | Lucide is the default AI-generated icon set. Phosphor has a different visual weight and slightly thicker strokes — less "template dashboard". Mapped: `AlertTriangle`→`Warning`, `Upload`→`UploadSimple`, `Banknote`→`Bank`, `RotateCcw`→`ArrowCounterClockwise`, `Network`→`Graph`. |
| Body font | Satoshi (Fontshare) replacing Inter | Inter is the most common AI-generated body font. Satoshi has geometric warmth with technical precision, distinctive character at 10–11px sizes. `Space Grotesk` (display) and `JetBrains Mono` (data) retained. |
| Server module system | ESM (`"type": "module"` in `server/package.json`) | Required for `nodenext` + `verbatimModuleSyntax` in `tsconfig.json`. All server `.ts` files use `import`/`export` syntax with `.js` extensions in imports. |
| CORS origin | `origin: true` (reflect request origin) | Demo server runs on port 3001, Vite client on 5173/5176 — dynamic port assignment in dev means a hardcoded origin would break. Production deployment will need a specific origin whitelist. |

Update this table as decisions are actually made — don't leave it as permanently "open."
