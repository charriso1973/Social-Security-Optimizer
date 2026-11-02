# Social Security Optimizer

A high-precision, client-side Social Security strategy optimizer designed for financial advisors and individuals to simulate, compare, and optimize household claiming strategies.

## Key Capabilities

- **Household Claiming Optimization**: Evaluates all 81 combinations of claim ages (ages 62 to 70 for both partners) to identify the lifetime wealth-maximizing claiming pair.
- **Accurate Actuarial Math**:
  - Full AIME (Average Indexed Monthly Earnings) and 35-year top-earnings calculation.
  - SSA bend-point formulas (90% / 32% / 15% truncated to the dime).
  - Early claiming reduction factors and delayed retirement credits (8%/year up to age 70).
  - Spousal top-up (up to 50% of spouse's PIA) and survivor step-up logic.
- **Dual-View Strategy Chart**:
  - **Break-Even Analysis ("When Delay Pays Off")**: Plots net lifetime difference against claiming both at age 62. The exact age where the curve crosses above $0 identifies the break-even age.
  - **Cumulative Growth**: Models total reinvested benefits over the full retirement timeline.
- **Full What-If Controls**:
  - Dynamic adjustments for COLA / Inflation, Real Investment Return, and Life Expectancies.
  - Solvency haircut toggle (models potential trust-fund reduction scenarios).
  - Nominal ("Future Dollars") vs. Real ("Today's Dollars") purchasing power basis.
  - Flexible PIA entry: exact manual PIA override, AIME entry, or full 35-year career CSV earnings paste.
- **Federal Tax & RMD Snapshot**:
  - Explores provisional income thresholds and Social Security taxation tiers alongside age 75 RMDs.

## Tech Stack

- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Recharts**
- **Lucide Icons**

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

### Production Build

```bash
npm run build
```

The compiled assets will be placed in the `dist/` directory, ready for zero-configuration static deployment (GitHub Pages, Vercel, Netlify, Cloudflare Pages, etc.).
