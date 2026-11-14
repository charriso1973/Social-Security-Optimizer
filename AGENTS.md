# Agent Notes — Social Security Optimizer

## Project Overview
A standalone, client-side Social Security claiming strategy model. Simulates household claiming strategies across the 62–70 age grid (81 combinations) under actuarial and statutory rules (AIME, bend points, early reductions, delayed retirement credits, spousal top-ups, and survivor step-ups).

This codebase is generic (Partner A / Partner B) and intended for financial advisor and client consultation workflows.

## Architecture
- **Framework**: React 19 + TypeScript + Vite + Tailwind CSS (via CDN) + Lucide Icons + Recharts.
- **Pure Math Engine**: `services/engine.ts` performs all calculations client-side (no backend or external API required).
- **Statutory Rules**:
  - `constants.ts` is **generated** by `npm run update-ssa` (`scripts/update_ssa_factors.py`): bend points by eligibility year, wage caps and AWI from 1951, plus app defaults and input bounds. Do not hand-edit its series; change the script's template and regenerate.
  - `statutoryTables.ts` is **hand-maintained**: FRA and survivor FRA by birth year, survivor reduction and RIB-LIM factors, Trustees Report solvency figures, RMD ages and Uniform Lifetime Table, and federal tax tables (`TAX_TABLE_YEAR`). Each table cites its source; update year and values together.
- **Tests**: `npm test` (vitest) runs `tests/engine.test.ts` against `tests/fixtures/ss_golden_vectors.json`. Expected values are hand-derived from statute, never copied from engine output. The Finance Tracker (`D:\Antigravity Projects\Finance Tracker\backend\test_ss_parity.py`) consumes the same fixture, so schema changes must be coordinated with it.
- **Visualizations**:
  - Strategy Grid Heatmap (81-pair claiming matrix with optimal vs. worst-case spread).
  - Strategy Comparison Chart with dual views:
    - **Break-Even vs. 62**: Plots net lifetime difference against claiming at 62; crossover above $0 reveals the break-even age.
    - **Cumulative Portfolio**: Plots total portfolio growth under reinvestment.
  - Tax Snapshot / RMD Planning Widget (snapshot in the year the older partner turns 75: RMDs, QCDs, provisional income, taxable SS, deductions, 2027 tax tables).
- **Documentation**: `docs/CALCULATION_REFERENCE.md` (complete calculation basis) and `docs/PRESENTATION_OUTLINE.md` (slide content drawn only from the reference). Use descriptive language only (no "guarantee", "exact", "compliant", etc.); the reference's last section lists which sections to update when constants or tax tables change.

## Multi-Agent & Engineering Standards
This project adheres to the Antigravity Multi-Agent Standard:
- `D:\Antigravity Projects\Antigravity_Project_Mgmt\STANDARDS.md`
- `D:\Antigravity Projects\Antigravity_Project_Mgmt\CODING_STANDARDS.md`

### Guidelines:
- **Git Commits & Push**: Always proactively offer to commit changes at relevant milestones. Whenever committing changes, always push to the remote repository (`origin main`) as well.
- **No LaTeX Math in Text**: Never use LaTeX math syntax (e.g., `$\rightarrow$`, `$\le$`) in chat responses, markdown explanations, or transitions. Use standard plain text or Unicode characters (`->`, `<=`, `>=`, `~`, `x`, `+/-`).
- **PowerShell Syntax**: Avoid chaining `cd <path> && <command>`. Use tool path flags instead (e.g., `npm --prefix "<path>" run build`, `git -C "<path>" <subcommand>`).
- **Deployment**: Standalone Vite application ready for deployment to Vercel, Netlify, Cloudflare Pages, or GitHub Pages directly from the repo root.

