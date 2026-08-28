# SIH Idea Submission — Cyber Trace AI

Content mapped to the standard SIH idea-presentation template (Proposed Solution → Technical Approach
→ Feasibility & Viability → Impact & Benefits → Research/References). Use this to fill your college's
required PPT for internal shortlisting before the actual build round.

## 1. Problem Statement
**SIH26189 — "AI-Powered Criminal Network Analysis System"**
Ministry of Home Affairs (MHA) — National Crime Records Bureau (NCRB), Women Safety Division
Software track · Deadline 20 September 2026

## 2. Idea Title
**Cyber Trace AI** — CDR & Financial Link-Graph Visualizer

## 3. Proposed Solution (What we're building, in plain language)
Cyber cell investigators today manually cross-reference thousands of rows in raw CDR and bank-transfer
spreadsheets to find who's connected to whom — slow, error-prone, and easy to miss the real
orchestrator hiding behind a normal-looking call volume.

Cyber Trace AI automates this: upload a CDR or transaction CSV, and the system builds an interactive
network graph in real time — every phone number/account becomes a node, every call/transfer becomes
an edge. The system automatically:
- Scores every individual by **degree centrality**, surfacing the most influential/connected people first.
- Flags **suspicious patterns** — closed call loops, sudden frequency spikes, multi-hop laundering chains —
  without the investigator having to spot them manually.
- Lets investigators **filter by time window** to isolate activity around the actual crime event.
- Produces a **one-click, court-ready audit report** documenting the flagged network.

## 4. Technical Approach
- **Frontend:** React (Vite) + Cytoscape.js for the interactive graph canvas, Tailwind CSS for a
  high-contrast "Cyber Forensics Dashboard" theme suited to dense investigative data.
- **Backend:** Node.js + Express, streaming CSV parsing (multer + csv-parser) so even a 10,000-row
  tower-dump file doesn't block or crash the server.
- **Database:** Supabase (PostgreSQL) with Row-Level Security — every investigation ("case") is
  cryptographically scoped to its owning investigator; no cross-case data leakage is possible even if a
  request is tampered with.
- **Core algorithms:** degree centrality scoring for influence ranking; cycle detection for call loops;
  chain-following with amount-decay detection for laundering rings.
- **Process flow:** Upload → Schema-mapped ingest → Graph construction → Centrality/pattern analysis
  → Interactive visualization → Filtered exploration → Audit export.

Full technical detail: see `ARCHITECTURE.md` in the project repo (schema, API contracts, algorithms).

## 5. Feasibility and Viability
- **Feasibility:** every component uses mature, widely-documented open-source technology (React,
  Express, Cytoscape.js, Postgres) — no novel research required, only sound engineering. A working
  prototype covering upload → graph → centrality → export is achievable within a hackathon build
  window; see `PHASES.md` for the phased build plan and exit criteria per phase.
- **Potential challenges:**
  - Real CDR/bank export formats vary by provider — mitigated with a flexible column-mapping step
    rather than assuming one fixed schema.
  - Large files (tower dumps) risk memory/performance issues — mitigated by streaming parse rather
    than full-buffer loading.
  - Security of sensitive investigation data — mitigated with Row-Level Security enforced at the
    database layer, not just application logic (see `ARCHITECTURE.md` section 4 and the non-negotiable
    rules in `codebase-memory.md` section 4).
- **Honest scope boundary:** this build implements the structured-data half of SIH26189 (CDR +
  financial records). FIR text, surveillance reports, and social media intelligence — also named in the
  full PS — are documented as future extensions (`PRD.md` section 2), not claimed as delivered. This
  scoping is deliberate: a smaller, fully-working system is stronger than a broader, shallow one.

## 6. Impact and Benefits
- **For investigators:** cuts manual cross-referencing time from hours/days of spreadsheet work to
  minutes of visual exploration; surfaces the likely orchestrator automatically instead of requiring an
  investigator to already suspect who it is.
- **For agencies (MHA/NCRB/State Cyber Cells):** a standardized, repeatable analysis workflow across
  cases; audit-ready reports reduce the manual effort of preparing court documentation.
- **For the justice system:** faster network identification can shorten investigation timelines in
  organized cybercrime and financial fraud cases, where speed often determines whether funds/evidence
  can still be recovered.
- **Societal relevance:** organized cybercrime and financial fraud disproportionately affect vulnerable
  populations (aligns with the PS's Women Safety Division sponsorship) — faster network takedown has
  direct protective value.

## 7. Research and References
- Official PS: https://sih.gov.in/sih2026PS (search SIH26189)
- Degree centrality and network analysis: standard graph theory (Freeman's centrality measures),
  applied here to communication/transaction networks rather than social networks.
- Cytoscape.js documentation: https://js.cytoscape.org — chosen for its maturity in rendering large,
  interactive network graphs in-browser.
- Supabase Row-Level Security documentation: https://supabase.com/docs/guides/auth/row-level-security
  — the mechanism underpinning this project's Anti-IDOR data-isolation guarantee.

## 8. Prototype / Demo Note
A live interactive demo is available via the in-app **"Pre-load Sample Cyber Network"** button — no
setup or real data required to see the full flow (upload → graph → centrality → pattern detection →
report export). See `codebase-memory.md` and the `demo-mode-builder` skill for how this is built.
