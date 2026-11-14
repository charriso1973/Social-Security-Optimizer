# WORK ORDER — Standalone Social Security Optimizer Enhancements & Guardrails

**Raised:** 2026-11-02 by Chad  
**Status:** COMPLETE (All Lanes Verified)  
**Standard:** AMAS (`D:\Antigravity Projects\Antigravity_Project_Mgmt\STANDARDS.md`)  
**Read first:** `AGENTS.md`, `README.md`, `Work/BACKLOG.md`, `Work/PROJECT_STATUS.md`, and `D:\Antigravity Projects\Finance Tracker\Work\Completed\WORK_ORDER_stress_testing.md`

---

## 1. Why This Exists

The Social Security module in the larger **Finance Tracker** app underwent extensive stress testing and statutory auditing (`WORK_ORDER_stress_testing.md`, `WORK_ORDER_statutory_audit.md`). When decoupling this capability into a standalone application for financial advisory firm use (and subsequent deployment via Google AI Studio), the core calculation engine was preserved, but the standalone UI still lacks several essential enhancements:

1. **Input Bounds & Degenerate Protection (Lane A)**: Unvalidated inputs allow extreme or negative values (e.g., negative COLA, out-of-range returns, negative PIAs) that can crash calculations or invert strategic recommendations.
2. **Interactive 81-Pair Claiming Heatmap (Lane B)**: While the backend engine calculates the 81-pair claiming matrix (`calculateStrategyGrid`), the UI currently lacks the full interactive 9x9 matrix visualization showing the dollar spread relative to worst-case timing and allowing one-click scenario selection.
3. **Advisor Multi-Client Ergonomics & Deployment (Lane C)**: Advisory workflows require customizable client labels, reset/scenario presets, and zero-configuration static packaging for Google AI Studio deployment.

---

## 2. What Is Already Done (Do NOT Redo)

- **Pure TypeScript Engine**: `services/engine.ts` implements complete statutory math (AIME, bend points, early reductions, delayed retirement credits, spousal top-ups, survivor step-ups).
- **2026 Statutory Constants**: `constants.ts` updated with the 2026 Social Security wage cap ($184,500) and SSA wage indexing fallback.
- **Dual-View Strategy Chart**: `App.tsx` features the Break-Even vs. 62 relative difference chart with a horizontal $0 reference line alongside the cumulative portfolio view.
- **AMAS Project Baseline**: Repository initialized on `main`, git tracking active (`e5e7d1a`), and documentation aligned with house standards.

---

## 3. Specification & Execution Lanes

### Lane A: Input Bounds & Degenerate Protection

Port domain validation boundaries from the Finance Tracker audit:

- **Constants to Define (`constants.ts`)**:
  - `SS_MIN_COLA_PCT = 0.0` (SSA statutory rules never apply negative COLA)
  - `SS_MAX_COLA_PCT = 10.0`
  - `SS_MIN_REAL_RETURN_PCT = -10.0`
  - `SS_MAX_REAL_RETURN_PCT = 20.0`
  - `SS_MIN_LIFE_EXP = 40`
  - `SS_MAX_LIFE_EXP = 120`
  - `SS_MAX_MONTHLY_PIA = 20000` (Statutory practical maximum)
  - `SS_MIN_CLAIM_AGE = 62`
  - `SS_MAX_CLAIM_AGE = 70`
- **UI Guardrails (`App.tsx`)**:
  - Enforce bounds on sliders and number inputs with clear visual tooltips or inline indicators when clamped.
  - Safe fallbacks on empty or NaN inputs to prevent degenerate renders.
  - Input protection for manual PIA and AIME fields.

### Lane B: Interactive 81-Pair Strategy Grid Heatmap

Elevate the strategy grid into a client-ready interactive visual tool:

- **9x9 Matrix Display**:
  - X-Axis: Partner A claim ages (62 to 70).
  - Y-Axis: Partner B claim ages (62 to 70).
  - Cell Value: Net lifetime dollar delta relative to worst-case claiming timing (`+$Xk` above baseline).
- **Calibrated Color Ramp (`HEAT_RAMP`)**:
  - Red / Amber / Green gradient representing strategic performance from worst to best.
  - Luminance-aware text contrast: light text on dark cells, dark text on bright/amber cells for effortless legibility.
- **Interactive Badging & Selection**:
  - Star badge (`★`) identifying the global wealth-maximizing strategy pair.
  - Distinct highlighted ring / border indicating the currently selected user strategy.
  - Click-to-select: Clicking any cell in the 9x9 grid immediately updates the selected claim ages for Partner A and Partner B, driving the entire dashboard and comparison charts reactively.

### Lane C: Advisor Presentation & Google AI Studio Deployment

Refine client presentation and cloud deployment ergonomics:

- **Advisor Consultation UI**:
  - Clean client name editing ("Partner A" / "Partner B" or client names like "Jane" / "John").
  - Quick scenario reset button to return all assumptions to standard defaults.
  - High-level Tax & RMD consultation snapshot review with 2026/2025 bracket awareness.
- **Google AI Studio / Static Hosting Packaging**:
  - Standalone build verification (`npm run build`).
  - Zero server-side API dependencies (100% client-side execution).
  - Production asset path hygiene for zero-config hosting (Google Cloud Run / Cloudflare Pages / Vercel / GitHub Pages).

---

## 4. Verification Plan

1. **Type & Build Validation**:
   - Run `npm run build` to confirm zero TypeScript compilation errors and clean Vite bundling.
2. **Boundary Stress Testing**:
   - Test extreme inputs: COLA at 0%, 10%, negative values (should clamp); real returns at -10%, +20%; extreme life expectancies.
   - Verify calculations remain stable and produce non-negative, sensible outputs.
3. **Interactive Grid Testing**:
   - Verify that clicking cells in the 9x9 matrix updates the selected claim ages and reactive curves.
   - Verify that the star marker (`★`) exactly matches `localOptimal` and that the worst cell shows `+$0k` (or "Base").
4. **Git Commit & Clean Handoff**:
   - Run verification checks and consult the user before recording a clean git commit.
