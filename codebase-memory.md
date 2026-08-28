# Codebase Context & Token-Minimizer Memory (`codebase-memory.md`)

> Purpose: give any AI agent working on this repo the full architectural context in one read,
> so it doesn't need to re-derive schema/structure from scratch each session.

## 1. Project Metadata
* **Project Name:** Cyber Crime CDR & Financial Link-Graph Visualizer (`Cyber Trace AI`)
* **Domain:** Cybersecurity / Law Enforcement Tech / Smart Governance
* **Official Problem Statement:** SIH26189 — "AI-Powered Criminal Network Analysis System"
* **Sponsoring Ministry / Department:** Ministry of Home Affairs (MHA) — National Crime Records Bureau (NCRB), Women Safety Division
* **Track / Theme:** Software · Blockchain & Cybersecurity
* **Submission Deadline:** 20 September 2026
* **Verify at:** https://sih.gov.in/sih2026PS (search SIH26189)
* **PS ask, verbatim scope:** collect/process data from FIRs, CDRs, financial transaction records, surveillance reports, social media intel, criminal history DBs; extract entities (people, locations, phone numbers, organizations); build relationship maps; identify key influential individuals; detect suspicious patterns; give investigators visual + analytical insight.
* **What this build covers vs. full PS scope:** this project implements the CDR + financial-transaction slice of SIH26189 end-to-end (upload → entity extraction → relationship graph → centrality/orchestrator detection → pattern flags → visual insight). FIR text, surveillance reports, and social media intel are unstructured-data sources named in the PS but out of scope for this build — see `PHASES.md` for what's deferred vs. delivered.

## 1a. Related MHA Statements (context only, not in scope)
* SIH26184 — Predictive analytics for cybercrime complaints, forecasting cash-withdrawal locations.
* SIH26182 / SIH26183 — Crypto wallet attribution and fraud-linked exchange identification via blockchain analytics.
These are separate PS codes under the same ministry; do not conflate with SIH26189 in submission paperwork.

## 2. Core Architecture & Tech Stack
* **Frontend:** React.js (Vite) + Cytoscape.js + Tailwind CSS + Phosphor Icons
* **Backend:** Node.js (Express.js) + `multer` (CSV ingest) + `csv-parser`
* **Database / BaaS:** Supabase (PostgreSQL) using `@supabase/supabase-js`
* **Authentication:** Supabase Auth (production) + Bypass mode (demo)
* **Data Sources:** Kaggle datasets (real fraud data: 24,543 CDR records, 1,000 financial transactions)
* **Graph Scale:** 50,615 nodes, 25,461 edges, 918+ detected patterns

## 3. Data Schema & Entities
* **CDR Log Schema:** `caller_number, receiver_number, timestamp, duration_sec, tower_id, call_type`
* **Financial Log Schema:** `sender_account, receiver_account, amount_inr, timestamp, txn_type, flagged_risk_score`
* **Graph Structure:**
  * **Nodes:** Suspect Phones / Accounts — attributes: `id`, `degreeCentrality`, `riskLevel`, `isOrchestrator`
  * **Edges:** Call / Transfer Links — attributes: `weight`, `frequency`, `timeWindow`

## 4. Security Rules (Non-Negotiable)
1. **Anti-IDOR:** All database reads/writes must validate `auth.uid()` against record ownership or the active investigation session ID.
2. **Environment Variables:** Credentials via `process.env` (server) or `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (public client only — never the service role key).
3. **Response Sanitization:** Never return raw `SELECT *` payloads; apply explicit field masks on API endpoints.
4. **Input Validation:** Enforce schema validation on CSV parsing; reject unescaped string injections and malformed payloads.
5. **CORS/Session:** No wildcard CORS with credentials; sessions via HTTP-only cookies or verified JWT, never raw user IDs trusted from request bodies.
6. **Error Responses:** Generic client-facing errors (500/4xx with no stack trace, no DB error text); detailed logs stay server-side only.

## 5. Directory Mapping
```text
├── .agents/skills/              # Antigravity skill definitions
│   ├── code-slimmer.md
│   ├── brute-force-tester.md
│   ├── parallel-executor.md
│   ├── humanize-code.md
│   ├── mock-data-generator.md
│   ├── hackathon-ui-polisher.md
│   ├── self-healing-debugger.md
│   ├── demo-mode-builder.md
│   ├── supabase-schema-guardian.md
│   ├── deployment-checker.md
│   └── block-complete-security-gate.md
├── .agents/rules/
│   └── antigravity-rules.md     # Global always-on rules for every agent action in this repo
├── shared/
│   └── types.ts                 # Shared TypeScript contract — client and server both import this
├── client/                      # Vite + React Frontend
│   ├── .env.example              # Template — copy to client/.env, fill real values
│   ├── src/components/auth/     # Authentication components (LoginPage)
│   ├── src/components/graph/    # Cytoscape.js visualizer canvas
│   ├── src/components/ui/       # Dark-mode Tailwind components
│   ├── src/services/            # Supabase Auth, API services
│   └── src/services/auth.ts     # Authentication service (Supabase + bypass mode)
├── server/                      # Node.js + Express Backend
│   ├── .env.example              # Template — copy to server/.env, fill real values
│   ├── demo-server.ts            # Standalone demo server (bypass mode)
│   ├── routes/                  # CSV upload & analysis APIs
│   ├── middleware/              # Security & upload handlers
│   ├── scripts/                 # Kaggle dataset formatting scripts
│   ├── utils/                   # Link centrality algorithms
│   └── mock-data/               # Kaggle formatted datasets (CDR + financial)
├── README.md                    # Repo entry point — start here
├── PRD.md                       # Product requirements — what to build and why
├── ARCHITECTURE.md              # System design — how it's built
├── DESIGN.md                    # Visual/UX design system
├── PHASES.md                    # Build sequencing and milestones
├── TESTING.md                   # Verification plan — what's tested, where, by which skill
├── RISKS.md                     # Known limitations and risk register
├── SIH_IDEA_SUBMISSION.md       # Idea-stage submission writeup (PS-template mapped)
├── .env.example                 # Combined reference template (see also client/server copies)
├── .gitignore
└── codebase-memory.md           # This file — token-minimizing context
```

Read order for a new agent session on this repo: `README.md` → `codebase-memory.md` (this file) →
`PRD.md` → `ARCHITECTURE.md` → `PHASES.md` (find current phase) → `DESIGN.md` (only when touching
UI) → `TESTING.md` / `RISKS.md` (when validating or before judging) → relevant `.agents/skills/*.md`.

## 6. Skill Usage Order (Recommended)
1. `parallel-executor` — break down the feature.
2. `mock-data-generator` — produce sample data if the feature needs it.
3. Implement frontend/backend/DB sub-tasks (DB changes go through the live Supabase connector).
4. `supabase-schema-guardian` — confirm the live schema, RLS policies, and shared types actually agree before building on top of them.
5. `hackathon-ui-polisher` — apply dashboard theme to new UI.
6. `brute-force-tester` + `self-healing-debugger` — stress-test and auto-patch the new endpoint(s).
7. `humanize-code` then `code-slimmer` — cleanup pass before commit/demo.
8. `block-complete-security-gate` — run at the end of every block: re-checks the rules above, then runs Strix (external AI pentest tool, run from the terminal — not an Antigravity plugin) against the live app for real exploit-validated findings. Block only counts as done on a BLOCK CLEARED verdict.
9. `demo-mode-builder` — once core features are stable, wire up the judge-facing demo.
10. `deployment-checker` — after deploying, before judging: confirm the live hosted app actually works end-to-end, not just localhost.

Note: Strix (usestrix/strix) is separate software, not an Antigravity plugin. Install once via `pipx install strix-agent`, then `block-complete-security-gate` invokes it from Antigravity's terminal against a live running target.

## 7. Open Items / Not Yet Decided
* Exact accent color for the dark theme (electric cyan vs amber) — pick one and record it here once chosen.
* Whether "Pre-load Sample Cyber Network" bypasses the real upload pipeline or exercises it with a bundled file.
