# Social Security Optimizer

A client-side Social Security claiming model for financial advisors and individuals. It compares household claiming strategies under the entered assumptions.

## Key Capabilities

- **Household Claiming Comparison**: Evaluates all 81 combinations of claim ages (62 to 70 for both partners) and ranks them by reinvested lifetime value.
- **Statutory Benefit Rules**:
  - AIME from up to 35 years of indexed earnings (1951 onward) and the 90% / 32% / 15% bend-point formula, using the bend points of each worker's eligibility year.
  - Full retirement age by birth year; early reductions and delayed retirement credits (8%/year up to age 70).
  - Spousal benefits under deemed filing, starting when both partners have filed.
  - Survivor benefits with the survivor age reduction and the 82.5% widow(er)'s limit.
- **Dual-View Strategy Chart**:
  - **Break-Even vs. 62**: Plots each strategy's cumulative value minus claiming both at 62; the $0 crossing marks the catch-up age (including investment growth).
  - **Cumulative Portfolio**: Shows reinvested benefits over the full timeline.
- **What-If Controls**:
  - Inflation/COLA, real investment return, and life expectancies.
  - Optional solvency reduction with a payable percentage and start year (defaults from the 2026 Trustees Report).
  - Future-dollar or today's-dollar basis.
  - PIA entry by manual PIA, AIME, or year-by-year earnings.
- **Federal Tax & RMD Snapshot**: One-year estimate in the year the older partner turns 75, using 2027 federal tables, comparing joint filing with two Single returns.

## Tech Stack

- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Recharts**
- **Lucide Icons**

## Documentation

- [`docs/CALCULATION_REFERENCE.md`](./docs/CALCULATION_REFERENCE.md): How the tool calculates its results: formulas, data sources and vintages, worked examples, inputs, model limitations, and statutory references.
- [`docs/PRESENTATION_OUTLINE.md`](./docs/PRESENTATION_OUTLINE.md): Slide-by-slide outline drawn from the calculation reference, for building a short presentation.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Tests

```bash
npm test
```

Runs the golden-vector tests in `tests/engine.test.ts` against `tests/fixtures/ss_golden_vectors.json`.

### Refresh SSA Data

```bash
npm run update-ssa
```

Downloads the SSA bend point, wage index and wage cap tables and regenerates `constants.ts`.

### Production Build

```bash
npm run build
```

The compiled assets will be placed in the `dist/` directory, ready for zero-configuration static deployment (GitHub Pages, Vercel, Netlify, Cloudflare Pages, etc.).
