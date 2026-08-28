# Testing & Verification Plan — Cyber Trace AI

Consolidated reference for how this project is verified. Individual skills own the actual execution;
this file is the map of what gets tested, where, and by which skill — so nothing is assumed covered
that isn't.

## 1. Testing Layers

| Layer | What it checks | Owned by | When it runs |
|---|---|---|---|
| Schema/type consistency | Live Supabase schema matches shared TypeScript types and query usage | `supabase-schema-guardian.md` | After any DB change; before building on top of a table |
| Input/edge-case fuzzing | Malformed CSVs, injection attempts, 10k-row stress, concurrent uploads | `brute-force-tester.md` | After any new/changed upload or query endpoint |
| Live exploit validation | Real proof-of-concept exploitation attempts (IDOR, injection, XSS, SSRF, auth bypass) via Strix | `block-complete-security-gate.md` | End of every completed feature block |
| Detection correctness | Planted patterns (orchestrator, loops, laundering rings) in mock data are actually found | Manual, cross-checked against `mock-data-generator.md`'s `answer-key.json` | End of Phase 2 (`PHASES.md`) |
| UI/theme compliance | Components match `DESIGN.md` tokens; skeleton loaders present; animations correct | `hackathon-ui-polisher.md` | After any new UI component |
| Deployment health | Live hosted app actually works end-to-end, not just localhost | `deployment-checker.md` | After every deploy; mandatory before judging |

## 2. What "Correct" Means for the Core Algorithm
Passing input validation is not the same as the algorithm being *right*. The specific bar:
- Given the demo dataset from `mock-data-generator.md`, the flagged orchestrator node in the output
  must match the orchestrator planted in `answer-key.json` — not just "some node got flagged."
- At least one planted call loop and one planted laundering ring must appear in the detected-patterns
  output, traceable back to the specific rows that formed them.
- Re-running the same query against the same dataset must produce the same centrality scores and
  the same flagged nodes every time (no non-determinism in the scoring).

If detection only catches obvious/large patterns but misses subtler planted ones, that's a fail, not a
partial pass — the PS's core ask ("identify key influential individuals," "detect suspicious patterns") is
what's being validated here, not just "the graph renders."

## 3. Security Testing — Non-Negotiable Checks
Restated from `codebase-memory.md` section 4 and `.agents/rules/antigravity-rules.md` section 2,
because these are specifically what `brute-force-tester` and `block-complete-security-gate` must
confirm, not just aim for:
- [ ] Cross-case/cross-user data access attempts are rejected (403/404), never silently succeed.
- [ ] No injected string (SQLi-style, script/HTML) reaches a raw query or unescaped render.
- [ ] No error response leaks a stack trace, DB error text, or internal file path.
- [ ] No `SELECT *` remains in any route or service file.
- [ ] No secret key is present in the built client bundle (check the actual built JS, not just source).
- [ ] Every RLS policy actually checks `auth.uid()` against real ownership — verified by attempting
      access as a different authenticated user, not just checking the policy exists.

## 4. Manual / Human-in-the-Loop Testing
Automated checks don't cover:
- **Visual clarity** — can a judge unfamiliar with the tool understand the graph and risk badges without
  explanation? Budget a real click-through pass near the end of `PHASES.md` Phase 6, not just automated
  checks.
- **Demo pacing** — does the slide-out presentation drawer (`demo-mode-builder.md`) actually walk
  through the features at a reasonable pace for a live Q&A setting?
- **Report content review** — open the actual exported PDF/CSV and confirm it reads as a credible piece
  of investigative documentation, not just "a file was produced."

## 5. Test Data
All test/demo datasets come from `mock-data-generator.md`:
- **Small demo set** (~50–100 rows) — for fast, judge-facing demos.
- **Stress set** (~10,000 rows) — for `brute-force-tester`'s volume tests.
- **`answer-key.json`** — ground truth for verifying detection correctness (section 2 above).

Never test against real personal data. This project handles categories of data (phone records, financial
transactions) that would be genuinely sensitive if real — mock data only, always.

## 6. Sign-Off Before Judging
A block, phase, or the whole project is not "done" until:
1. Its owning skill(s) from the table in section 1 report pass.
2. Section 3's non-negotiable checklist is clean.
3. `deployment-checker.md` reports **go** on the live deployed URL.
4. A human has done the manual pass in section 4 at least once.

This mirrors the verdict language in `block-complete-security-gate.md` — no partial credit, no
"probably fine."
