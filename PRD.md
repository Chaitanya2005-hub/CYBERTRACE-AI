# Product Requirements Document — Cyber Trace AI

## 1. Problem Statement (Official)
**SIH26189 — "AI-Powered Criminal Network Analysis System"**
Sponsoring body: Ministry of Home Affairs (MHA) — National Crime Records Bureau (NCRB), Women Safety Division
Track: Software · Theme: Blockchain & Cybersecurity · Deadline: 20 September 2026
Verify: https://sih.gov.in/sih2026PS (search SIH26189)

> Modern criminal activities are increasingly organized and interconnected. Criminals operate through
> networks involving associates, intermediaries, financial channels, communication links, locations, and
> events. Law enforcement agencies collect large volumes of data (FIRs, CDRs, financial transaction
> records, surveillance reports, social media intel, criminal history databases, intelligence reports) but
> struggle to identify hidden relationships because the data is fragmented, unstructured, and distributed
> across systems. Manual analysis is slow and prone to missing critical connections.

**Expected Solution (per PS):** an AI-powered system that automatically analyzes structured and
unstructured crime-related data to uncover criminal networks, identify key influencers, detect suspicious
patterns, and provide actionable intelligence for investigators.

## 2. Scope of This Build
The full PS spans multiple unstructured data sources (FIR text, surveillance reports, social media intel).
This build delivers the **structured-data slice end-to-end** — CDRs and financial transaction logs — as a
working, demonstrable product, rather than a shallow pass across every source type named in the PS.

**In scope:**
- CSV ingestion of CDR and financial transaction logs, with schema mapping.
- Entity extraction from structured fields (phone numbers, account numbers) — no NLP/unstructured
  text parsing in this build.
- Relationship graph construction (who called/transferred to whom, when, how often).
- Degree centrality scoring to surface key/influential individuals (the PS's "identify key influencers").
- Pattern detection: call loops, frequency spikes, multi-hop laundering rings ("detect suspicious
  patterns and unusual activities").
- Interactive visual graph (Cytoscape.js) with time-range filtering ("visual and analytical insights").
- Exportable audit report (PDF/CSV) for legal/investigative documentation.

**Explicitly out of scope (deferred, see `PHASES.md`):**
- FIR text / unstructured report ingestion and NLP entity extraction.
- Surveillance report and social media intelligence ingestion.
- Cross-agency live data integration (I4C/NCRP feeds) — noted as future scope only.
- Predictive analytics (cash-withdrawal forecasting, SIH26184's ask) — separate PS, not this one.

Naming the boundary explicitly here matters for judging: claiming full PS coverage when only the
structured-data path is built is a credibility risk. Presenting this build as "the CDR/financial-transaction
implementation of SIH26189, with unstructured sources as documented future work" is accurate and still
strong.

## 3. Target Users
- **Primary:** Cybercrime investigation officers at State Police Cyber Cells and NCRB, working a live case
  with raw CDR/bank exports.
- **Secondary:** Case supervisors reviewing flagged networks and approving evidence reports for court use.

## 4. Core User Stories
1. As an investigator, I upload a CDR CSV export and the system maps its columns automatically or lets
   me map them manually, so I don't need the file pre-formatted.
2. As an investigator, I see the resulting network as an interactive graph, so I can visually explore who is
   connected to whom without reading raw rows.
3. As an investigator, I see which individuals are most central/influential in the network, so I know where
   to focus the investigation first.
4. As an investigator, I can narrow the graph to a specific time window, so I can isolate activity around
   the crime event.
5. As an investigator, I can see flagged suspicious patterns (loops, laundering chains) surfaced
   automatically, so I don't have to spot them manually in raw data.
6. As a supervisor, I can export a report of the flagged network for legal documentation.

## 5. Success Criteria (Hackathon Demo)
- A judge can upload the bundled sample dataset (or trigger "Pre-load Sample Cyber Network") and see a
  populated graph in under a few seconds.
- The graph visibly highlights at least one orchestrator/high-centrality node and one detected pattern
  (loop or laundering ring) without manual pointing-out.
- Time-range filtering visibly changes the graph in response to slider movement.
- A report export produces a real downloadable file.
- The system withstands the standard security/pentest gate (`brute-force-tester` +
  `block-complete-security-gate`) with no Critical/High findings outstanding at demo time.

## 6. Non-Functional Requirements
- **Security:** Row-Level Security scoped per investigation/case; no data leakage across cases/users
  (Anti-IDOR — see `codebase-memory.md` section 4).
- **Performance:** 10,000-row CSV ingest completes without blocking the UI or exhausting memory
  (streaming parse, not full-buffer).
- **Usability:** Dark, high-density "Cyber Forensics Dashboard" UI appropriate for investigators scanning
  large data volumes (see `DESIGN.md`).
- **Auditability:** Every exported report is reproducible from the same underlying data — no
  non-deterministic output between report runs on the same dataset.

## 7. Open Questions
- Whether entity extraction should attempt basic NLP on any free-text fields present in real CDR exports
  (e.g. call notes), or stay strictly structured-field-only for this build. Default: structured-only, unless
  time allows a stretch pass.
- Whether report export targets PDF, CSV, or both for v1. Default: both, PDF as primary (legal use case).
