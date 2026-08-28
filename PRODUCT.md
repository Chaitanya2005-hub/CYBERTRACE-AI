# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** Cybercrime investigation officers at State Police Cyber Cells and NCRB, working a live case with raw CDR (Call Detail Record) and bank transaction CSV exports. They scan thousands of rows under time pressure, cross-referencing phone numbers and account IDs to identify criminal networks.

**Secondary:** Case supervisors reviewing flagged networks and approving evidence reports for court use.

**Context of use:** High-stakes investigation workstations. Dark rooms. Multi-monitor setups. Analysts need to scan dense data fast, identify key suspects, and produce court-admissible documentation. The tool is an instrument panel, not a consumer app.

## Product Purpose

Cyber Trace AI turns raw CDR and bank transaction CSVs into an interactive, visual criminal network. Investigators upload structured data; the system builds a link-graph, scores each node by degree centrality to surface orchestrators, detects suspicious patterns (call loops, laundering rings, frequency spikes), and exports court-ready audit reports.

Success means: an investigator uploads a CSV and identifies the network's orchestrator in under 30 seconds, versus hours of manual spreadsheet cross-referencing.

## Positioning

The meaningfully different mechanism is the **centrality-scored link graph with pattern detection** — not just visualizing connections, but algorithmically surfacing who matters most and why. A spreadsheet can show rows; Cyber Trace AI shows the network's structure and flags what's suspicious.

This is the structured-data implementation of SIH26189 ("AI-Powered Criminal Network Analysis System") for the Ministry of Home Affairs / NCRB. FIR text, surveillance reports, and social media intelligence are documented future work, not delivered features.

## Operating Context

- **Data inputs:** CDR CSVs (caller_number, receiver_number, timestamp, duration_sec, tower_id, call_type) and financial transaction CSVs (sender_account, receiver_account, amount_inr, timestamp, txn_type, flagged_risk_score)
- **Workflow:** Upload CSV → column auto-detection/mapping → ingest to Supabase → graph construction → centrality scoring → pattern detection → interactive visualization → time-range filtering → report export
- **Output artifacts:** PDF and CSV audit reports documenting flagged nodes, detected patterns, and evidence trail — reproducible from the same underlying data
- **Demo path:** "Pre-load Sample Cyber Network" button loads bundled synthetic data for instant demo with no setup
- **Case isolation:** Every investigation ("case") is scoped to its owning investigator via Supabase Row-Level Security — no cross-case data leakage

## Capabilities and Constraints

**Confirmed functionality:**
- CSV ingestion of CDR and financial transaction logs with streaming parse (csv-parser, not full-buffer)
- Column auto-detection and manual mapping UI
- Degree centrality scoring with orchestrator flagging (high-centrality bridges between clusters)
- Call loop detection (3–6 node cycles via DFS)
- Laundering ring detection (multi-hop chain-following with amount decay within short time window)
- Frequency spike detection (statistical outlier analysis)
- Interactive Cytoscape.js graph with risk-colored nodes, animated layout, neighborhood hover highlight
- Time-range filtering with dual slider
- Exportable audit report (PDF primary, CSV secondary)
- Row-Level Security on all tables (cases, cdr_records, financial_transactions)
- Demo mode with isolated case namespace

**Technical constraints:**
- Supabase-hosted Postgres with RLS — requires live Supabase project for full functionality
- 10,000-row stress target for CSV ingest
- Deterministic algorithms — same input always produces same output (required for court documentation)
- No real personal data at any point — all demo/test data is synthetic

**Undecided / deferred:**
- FIR text / unstructured report ingestion (Phase 7+)
- Surveillance report and social media intelligence ingestion
- Live I4C/NCRP data-feed integration
- Predictive analytics (separate PS, SIH26184)

## Brand Commitments

- **Name:** Cyber Trace AI
- **Identity:** "CDR & Financial Link-Graph Visualizer"
- **Voice:** Factual, direct, investigator-to-investigator. No marketing fluff, no AI hype.
- **Color commitment:** Single accent (Cyan Pulse #2dd4e0), three risk colors (red/amber/green), near-black base. Amber reserved for medium-risk and demo-only UI.
- **Typography commitment:** Space Grotesk (display), Satoshi (body), JetBrains Mono (data). Monospace for all identifiers.
- **SIH reference:** Built for SIH26189 — "AI-Powered Criminal Network Analysis System" under MHA / NCRB Women Safety Division

## Evidence on Hand

- Working prototype with full upload → graph → pattern detection → export pipeline
- Synthetic demo dataset (small: ~100 rows, stress: 10,000 rows) with answer-key.json for detection verification
- Submission poster (cyber-trace-ai-poster.html)
- Complete design system (DESIGN.md) with Tailwind v4 tokens
- Mobile companion concept (4-screen prototype)
- Landing page concept (6-section prototype)

**Absences that future work must not fabricate:**
- No real investigation data has been tested — all data is synthetic
- No deployed production instance exists yet
- No real user testimonials — the testimonial section in the landing page concept uses realistic but fictional accounts
- No legal review of the tool's dual-use implications has been conducted

## Product Principles

1. **Density over decoration.** Every pixel earns its place. Investigators scan fast; the interface never gets in the way.
2. **Risk is always legible.** A red border means the same thing on the canvas, in the sidebar, and in the exported report. No ambiguity.
3. **Deterministic output.** Same data, same report. Every time. Court documentation requires reproducibility.
4. **Security is structural, not cosmetic.** Row-Level Security at the database layer, not just application logic. Anti-IDOR enforced server-side on every route.
5. **Honest scope.** This build covers structured data (CDR + financial). Unstructured sources are documented future work, not claimed features.

## Accessibility & Inclusion

- WCAG AA contrast ratios on the dark palette (verified for text-muted against bg-panel)
- Visible focus states on all interactive elements (keyboard navigation for evidence review)
- Icons always paired with text labels (risk badges never rely on color alone)
- No specific assistive technology testing has been conducted — this is a known gap
