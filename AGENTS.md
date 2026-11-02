# Agent Notes — Social Security Optimizer

## Project Overview
A standalone, high-precision client-side Social Security strategy optimizer. Simulates household claiming strategies across the 62–70 age grid (81 combinations) under actuarial and statutory rules (AIME, bend points, early reductions, delayed retirement credits, spousal top-ups, and survivor step-ups).

This codebase is generic (Partner A / Partner B) and intended for financial advisor and client consultation workflows.

## Architecture
- **Framework**: React 19 + TypeScript + Vite + Tailwind CSS (via CDN) + Lucide Icons + Recharts.
- **Pure Math Engine**: `services/engine.ts` performs all calculations client-side (no backend or external API required).
- **Statutory Rules**: `constants.ts` defines SSA bend points, wage caps (through 2026: $184,500), and National Average Wage Index (AWI) series.
- **Visualizations**:
  - Strategy Grid Heatmap (81-pair claiming matrix with optimal vs. worst-case spread).
  - Strategy Comparison Chart with dual views:
    - **Break-Even vs. 62**: Plots net lifetime difference against claiming at 62; crossover above $0 reveals the break-even age.
    - **Cumulative Portfolio**: Plots total portfolio growth under reinvestment.
  - Tax Snapshot / RMD Planning Widget (Age 75 snapshot exploring standard deductions, provisional income, and taxable SS benefits).

## Multi-Agent & Engineering Standards
This project adheres to the Antigravity Multi-Agent Standard:
- `D:\Antigravity Projects\Antigravity_Project_Mgmt\STANDARDS.md`
- `D:\Antigravity Projects\Antigravity_Project_Mgmt\CODING_STANDARDS.md`

### Guidelines:
- **No LaTeX Math in Text**: Never use LaTeX math syntax (e.g., `$\rightarrow$`, `$\le$`) in chat responses, markdown explanations, or transitions. Use standard plain text or Unicode characters (`->`, `<=`, `>=`, `~`, `x`, `+/-`).
- **PowerShell Syntax**: Avoid chaining `cd <path> && <command>`. Use tool path flags instead (e.g., `npm --prefix "<path>" run build`, `git -C "<path>" <subcommand>`).
- **Deployment**: Standalone Vite application ready for deployment to Vercel, Netlify, Cloudflare Pages, or GitHub Pages directly from the repo root.

