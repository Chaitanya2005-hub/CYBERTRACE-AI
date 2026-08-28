# Risks & Known Limitations — Cyber Trace AI

Explicit register of what could go wrong and what this build deliberately does not cover. Kept honest
and current on purpose — a judge or reviewer finding an undisclosed gap is worse than the project
disclosing it upfront.

## 1. Scope Limitations (by design — see `PRD.md` section 2)
| Limitation | Why | Mitigation / Future Work |
|---|---|---|
| No FIR text / unstructured report ingestion | Full PS (SIH26189) names this, but NLP entity extraction over free text is a separate, substantial engineering effort | Documented as Phase 7+ future work in `PHASES.md`; not claimed as delivered in `SIH_IDEA_SUBMISSION.md` |
| No social media intelligence ingestion | Requires external data access this build has no path to | Same — future work, not in scope |
| No live I4C/NCRP data-feed integration | Requires inter-agency access not available to a hackathon team | Noted as future scope in `codebase-memory.md` and the poster |
| No vehicle/organization entity extraction | Structured CDR/financial fields don't contain this; would need NLP over unstructured sources above | Tied to the same future NLP phase |

## 2. Technical Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Real-world CDR/bank export formats vary by provider | Ingest could fail or misparse on an unfamiliar format | Flexible column-mapping UI (not a rigid fixed schema); `brute-force-tester.md` fuzzes malformed input |
| Large tower-dump files (100k+ rows) | Could exceed the tested 10k-row stress target | Streaming parse (csv-parser) is deliberate for this; re-test at higher row counts if real data samples become available |
| RLS policy misconfiguration | Silent data leakage across investigations — the single most damaging failure mode for this project | Every RLS change requires explicit human review before applying, per `.agents/rules/antigravity-rules.md` section 2; `supabase-schema-guardian.md` audits policies, never auto-fixes them |
| Free-tier hosting cold starts | Demo could look broken (slow first response) during live judging | `deployment-checker.md` measures this explicitly and recommends a warm-up ping before judging |
| Centrality/pattern-detection algorithm correctness | A working UI with a wrong algorithm is a worse failure than it looks (see `TESTING.md` section 2) | Validated against planted patterns in `mock-data-generator.md`'s `answer-key.json`, not just "does it run" |
| Strix (external pentest tool) requires its own LLM API key/budget | Running it after every block could be costly or rate-limited | Run at key milestones (end of major phases) rather than after every trivial change, per team's actual budget |

## 3. Data & Ethics Considerations
- **No real personal data at any point** — all demo/test data is synthetic (`mock-data-generator.md`).
  This is both a security precaution and an ethical one: CDR/financial data is genuinely sensitive, and a
  hackathon prototype has no business touching real citizens' records.
- **Dual-use awareness** — a tool that maps communication/financial networks and flags "key
  influencers" has legitimate law-enforcement use but the same technique could be misused for
  surveillance outside proper legal authorization. This project assumes deployment within an
  authorized law-enforcement context (per the PS's sponsoring agency), with RLS-enforced per-case
  access as the technical control against internal misuse — not a substitute for institutional oversight,
  which is outside this project's scope to provide.
- **False positives matter.** Flagging someone as an "orchestrator" or "high-risk" carries real
  consequences if acted on. This build should always be framed as an investigator decision-support
  tool, not an automated accusation system — the UI and report language should reflect that framing
  (see `DESIGN.md`).

## 4. Presentation Risks
| Risk | Mitigation |
|---|---|
| Judges scrutinize the SIH26189 PS text closely and notice the structured-only scope | `SIH_IDEA_SUBMISSION.md` and `PRD.md` state the scope boundary upfront, framed as deliberate prioritization, not an oversight |
| Live demo fails (network, hosting, Wi-Fi) | Fallback recorded walkthrough video (`PHASES.md` Phase 6); demo mode works fully client-side against bundled sample data |
| A judge asks about RLS/security specifics | `ARCHITECTURE.md` section 4 has the real schema/SQL; `TESTING.md` section 3 has the concrete verification list — know these, don't improvise |

## 5. Review Cadence
Update this file whenever:
- A new limitation is discovered during build (don't wait until the end to document it).
- A risk in section 2 is actually mitigated — move it to a "Resolved" note rather than deleting the row
  outright, so the project's history of what was fixed stays visible.
