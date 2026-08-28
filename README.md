# Cyber Trace AI

**CDR & Financial Link-Graph Visualizer** — an AI-assisted investigation tool that turns raw call
records and bank transaction logs into a traceable, visual criminal network.

Built for **SIH26189 — "AI-Powered Criminal Network Analysis System"** (Smart India Hackathon 2026,
Ministry of Home Affairs / NCRB, Women Safety Division). Verify at https://sih.gov.in/sih2026PS.

## What it does
Investigators upload CDR or bank transaction CSVs. The system builds an interactive link-graph of
callers/accounts, scores each node by degree centrality to surface key influencers ("orchestrators"),
detects suspicious patterns (call loops, laundering rings), and exports a court-ready audit report.

**Key Features:**
- **Authentication System**: Professional login/signup with Supabase integration
- **Bypass Mode**: Demo mode for instant access without database setup
- **Real Kaggle Datasets**: 24,543 CDR records + 1,000 financial transactions from actual fraud data
- **Advanced Pattern Detection**: 918+ detected patterns with filtering by selected nodes
- **Interactive Network Graph**: 50,615 nodes, 25,461 edges with Cytoscape.js visualization
- **Risk Scoring**: Degree centrality analysis to identify orchestrators
- **Report Export**: PDF and CSV export of investigation findings

See `PRD.md` for full scope — this build covers the **structured-data slice** of SIH26189 (CDR +
financial transactions); FIR text, surveillance reports, and social media intelligence are documented
as future work, not built.

## Tech Stack
- **Frontend:** React (Vite) + Cytoscape.js + Tailwind CSS + Phosphor Icons
- **Backend:** Node.js + Express + multer + csv-parser
- **Database:** Supabase (PostgreSQL) with Row-Level Security + Supabase Auth
- **Authentication:** Supabase Auth (production) + Bypass mode (demo)
- **Data:** Kaggle datasets (real fraud detection data)

## Repo Guide — Read In This Order
1. `codebase-memory.md` — condensed project context (schema, security rules, skill order). Read this first,
   every session.
2. `PRD.md` — what's in scope and why.
3. `ARCHITECTURE.md` — system design, schema, API contracts.
4. `PHASES.md` — current build phase and exit criteria.
5. `DESIGN.md` — visual/UX system, only needed when touching UI.
6. `.agents/rules/antigravity-rules.md` — always-on constraints for any AI agent working in this repo.
7. `.agents/skills/*.md` — task-specific playbooks (invoke by name).
8. `TESTING.md` — how this project is verified.
9. `RISKS.md` — known limitations and what's explicitly out of scope.
10. `SIH_IDEA_SUBMISSION.md` — the idea-stage submission writeup.

## Getting Started

### Quick Start (Bypass Mode - No Database Required)
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install  # in both client/ and server/
   ```
3. Start the demo server:
   ```bash
   cd server
   npm run dev  # or: node node_modules/tsx/dist/cli.mjs demo-server.ts
   ```
4. Start the React client:
   ```bash
   cd client
   npm run dev
   ```
5. Open `http://localhost:5173` — you'll see the login page
6. Enter any email/password to sign in (bypass mode accepts any credentials)
7. Click **"Pre-load Sample Network"** to load real Kaggle fraud data

### Production Setup (With Supabase)
1. Create a Supabase project at https://supabase.com
2. Apply the schema from `ARCHITECTURE.md` section 4 to your Supabase database
3. Enable Supabase Auth in your project settings
4. Copy `.env.example` to `.env` in both `client/` and `server/`
5. Fill in real values:
   ```bash
   # client/.env
   VITE_API_BASE_URL=http://localhost:3000
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # server/.env
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
6. `npm install` in both `client/` and `server/`
7. `npm run dev` in `server/`, then `npm run dev` in `client/`
8. Sign up with a real email and password

### Kaggle Dataset Integration
The demo server uses pre-formatted Kaggle datasets:
- **CDR Data**: 24,543 call records from fraud detection dataset
- **Financial Data**: 1,000 transactions from AML dataset

To update or regenerate these datasets:
1. Install Kaggle CLI and configure API credentials
2. Run the download script:
   ```bash
   pwsh -File download_kaggle_datasets.ps1
   ```
3. Format the data:
   ```bash
   node server/scripts/format_cdr_kaggle.ts
   node server/scripts/format_financial_kaggle.ts
   ```

## Project Status
Current phase: see `PHASES.md`. Update that file's checkboxes as work progresses — don't let it go stale.

### Completed Features
- ✅ Authentication system with Supabase integration
- ✅ Bypass mode for demo access
- ✅ Kaggle dataset integration (real fraud data)
- ✅ Enhanced pattern detection with filtering
- ✅ Interactive network graph visualization
- ✅ Risk scoring and orchestrator detection
- ✅ Report export (PDF/CSV)
- ✅ Responsive dark theme UI

## Team
_Fill in before submission — see the poster (`cyber-trace-ai-poster.html`) footer for the same fields._
- Team Lead:
- Members:
- Guided by:
