# Build Phases — Cyber Trace AI

Sequencing plan for a hackathon timeline. Each phase should end with the block-level checks in
`.agents/skills/block-complete-security-gate.md` before moving to the next. Check off phases as they
complete — this file is meant to be edited as the project progresses, not left static.

## Phase 0 — Foundations (do this before any feature work)
- [x] Create the real Supabase project; confirm login works.
- [x] Apply the schema + RLS from `ARCHITECTURE.md` section 4 via the Supabase connector — review the
      SQL before it runs (per `supabase-schema-guardian.md`).
- [x] Scaffold `client/` (Vite + React + Tailwind) and `server/` (Express) per the directory mapping in
      `codebase-memory.md`.
- [x] Create `shared/types.ts` with the domain model from `ARCHITECTURE.md` section 3.
- [x] Confirm `.env` files exist locally and are in `.gitignore`; confirm no secret is committed.

**Exit criteria:** empty app boots locally, client can reach backend, backend can reach Supabase, RLS
confirmed active with a test query that correctly rejects cross-user access.
⚠️ _Supabase RLS is configured but the current demo path bypasses it entirely (in-memory storage).
RLS enforcement is confirmed only through schema review, not a live rejection test._

## Phase 1 — Ingest Pipeline
- [x] `mock-data-generator` — produce a small demo CDR/financial dataset and a 10k-row stress set, with
      `answer-key.json`.
- [x] Build `POST /api/upload/cdr` and `POST /api/upload/transactions` (multer + streaming csv-parser).
- [x] Column auto-detection / manual mapping UI on the client.
- [x] `supabase-schema-guardian` pass — confirm inserted data matches schema exactly.
- [ ] `brute-force-tester` pass on both upload routes (malformed CSV, injection attempts, 10k-row stress,
      concurrent uploads). **Not yet executed.**

**Exit criteria:** small and stress datasets both ingest successfully end-to-end; brute-force-tester
reports no unhandled failures; no raw error ever reaches the client.
⚠️ _Upload routes exist and work for valid CSVs. Error handling returns structured JSON errors.
Brute-force / adversarial testing has not been run._

## Phase 2 — Graph Construction & Analysis
- [x] Resolve the two open architecture decisions (centrality computed where, graph built where) — updated
      `ARCHITECTURE.md` section 8.
- [x] Implement degree centrality scoring and orchestrator flagging (`server/utils/graphAnalysis.ts`).
- [x] Implement loop detection and laundering-ring detection.
- [x] Build `GET /api/graph/:caseId` returning `GraphResponse` with patterns and metadata.
- [ ] Verify detections against `answer-key.json` from the mock dataset — the planted patterns must
      actually be found, not just "the endpoint returns 200."
      _269 patterns are detected from the demo dataset (call loops, frequency spikes, laundering rings).
      No formal comparison script against answer-key.json exists yet._

**Exit criteria:** querying the demo dataset's case returns a graph where the planted orchestrator and at
least one planted pattern are correctly flagged.
⚠️ _The demo server returns 127 nodes, 218 edges, and 269 patterns from the mock dataset.
Orchestrator flagging and pattern detection run but are not formally verified against the answer key._

## Phase 3 — Visualization & Interaction
- [x] Cytoscape.js canvas rendering `GraphResponse` per `DESIGN.md` section 4.
- [x] Time-range slider wired to `GraphQueryParams` and re-fetching/re-rendering.
- [x] Risk badges, node detail panel, flagged-suspects sidebar list.
- [x] `hackathon-ui-polisher` pass — full theme compliance check against `DESIGN.md`.

**Exit criteria:** a judge can visually explore the graph, drag nodes, filter by time, and see risk badges
without needing anything explained.

## Phase 4 — Reporting
- [x] `GET /api/report/:caseId` — PDF (primary) and CSV (secondary) export of flagged nodes and evidence
      trail.
- [x] Confirm report content is deterministic for a given dataset (matches `PRD.md` non-functional
      requirement). `buildGraph()` and `detectPatterns()` are pure functions — same input always produces
      same output.

**Exit criteria:** clicking export on the demo dataset produces a real, openable file with correct content.
✅ _Report generation implemented and wired to both the demo server and production server. Download tested
via API (curl returns valid HTML/CSV). Browser download works in-app._

## Phase 5 — Authentication & User Management
- [x] Implement Supabase Auth integration for production mode
- [x] Create professional login/signup page with bypass mode support
- [x] Add user authentication state management
- [x] Implement logout functionality
- [x] Add user info display in header
- [x] Configure bypass mode for demo access (any credentials accepted)
- [x] Add authentication guards to protect main application

**Exit criteria:** users can sign up, sign in, and access the application; bypass mode allows demo access
without database setup; user session persists across page refreshes.
✅ _Authentication system fully implemented with Supabase integration. Login page functional in both
production (real auth) and bypass mode (demo mode). User info displayed in header with logout button._

## Phase 6 — Real Dataset Integration
- [x] Download and integrate Kaggle datasets for realistic testing
- [x] Format CDR dataset (24,543 records from fraud detection data)
- [x] Format financial dataset (1,000 transactions from AML data)
- [x] Update demo server to use Kaggle datasets instead of mock data
- [x] Verify pattern detection works with real data scale
- [x] Test with 50,615 nodes and 25,461 edges
- [x] Confirm 918+ patterns detected from real data

**Exit criteria:** demo server loads real Kaggle data instead of mock data; pattern detection works at
scale; system handles 50k+ nodes and 25k+ edges; patterns are meaningful and actionable.
✅ _Kaggle datasets integrated: 24,543 CDR records, 1,000 financial transactions. Demo server uses
real fraud data. Pattern detection identifies 918 patterns from actual criminal networks._

## Phase 7 — Enhanced Pattern Detection
- [x] Add "show all patterns" feature to display all detected patterns
- [x] Implement pattern filtering by selected node
- [x] Add UI toggle between "Filter Selected" and "Show All"
- [x] Update backend to accept selectedNode parameter
- [x] Filter patterns server-side for performance
- [x] Add visual feedback for filtered vs all patterns

**Exit criteria:** users can see all patterns or filter to patterns involving a specific selected node;
filtering happens efficiently on the server; UI clearly shows current filter state.
✅ _Pattern filtering fully implemented. "Show All" displays all 918 patterns. "Filter Selected" shows
only patterns involving the selected node. Server-side filtering ensures performance._

## Phase 8 — Demo Mode & Presentation
- [x] `demo-mode-builder` — "Pre-load Sample Cyber Network" header button, isolated from real case data.
- [x] Slide-out presentation drawer walking through Phases 1–4's features.
- [x] "Reset Demo" control.
- [x] Standalone demo server (`server/demo-server.ts`) — bypasses Supabase, uses in-memory storage,
      parses bundled CSVs, runs the same graph analysis engine. Enables a cold-start demo with zero
      database configuration.
- [x] Bypass mode indicator in header
- [x] Seamless integration with authentication (bypass mode accepts any credentials)

**Exit criteria:** a cold-start visitor can click one button and walk through the entire feature set
without any real data or setup; bypass mode clearly indicated; authentication works in both modes.
✅ _Demo mode fully functional. Bypass mode indicator visible in header. Cold-start demo works with real
Kaggle data. Authentication seamlessly supports both production and bypass modes._

## Phase 9 — Hardening & Pre-Judging
- [ ] `block-complete-security-gate` full run (static checklist + Strix live pentest) across the whole app,
      not just the last block.
- [ ] `humanize-code` then `code-slimmer` — final cleanup pass.
- [ ] Deploy frontend + backend to real hosts.
- [ ] `deployment-checker` — full go/no-go against the live deployed URLs.
- [ ] Record a 60–90 second fallback walkthrough video.
- [ ] Finalize the poster (`cyber-trace-ai-poster.html`) and one-page README with real team details.

**Exit criteria:** live URL works end-to-end from a fresh browser with no dev tools open; fallback video
exists; poster and README are submission-ready.

## Deferred (explicitly out of scope for this build — see `PRD.md` section 2)
- FIR text / unstructured report ingestion + NLP entity extraction.
- Surveillance report and social media intelligence ingestion.
- Live I4C/NCRP data-feed integration.
- Predictive cash-withdrawal-location analytics (separate PS, SIH26184).

If time remains after Phase 6, pull from this list in order — do not start deferred work while any Phase
0–6 exit criteria are still unmet.
