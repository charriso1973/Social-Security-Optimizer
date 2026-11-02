# Backlog — Social Security Optimizer Standalone

Living list of candidate features, enhancements, and statutory maintenance items for the standalone Social Security Optimizer, modeled after the Antigravity Multi-Agent Standard (AMAS).

---

## B-1 · Relative Break-Even vs. Age 62 Strategy Visualization
**Status:** ✅ **COMPLETED** (2026-11-02 `e5e7d1a`)

**Context:** The original standalone tool plotted only absolute cumulative portfolio lines. Compounding investment growth dominated total dollars in later retirement years, bunching the curves together and obscuring the break-even age.
**Resolution:** Implemented dual-view toggle on the strategy comparison chart:
1. **Break-Even vs. 62**: Plots the net dollar delta (`Strategy Cumulative - Age 62 Baseline Cumulative`) against an explicit horizontal `$0` baseline. Crossover directly shows when delaying pays off.
2. **Cumulative Portfolio**: Retains the full balance projection with investment returns.

---

## B-2 · Statutory Schedules & 2026 Wage Base Updates
**Status:** ✅ **COMPLETED** (2026-11-02 `e5e7d1a`)

**Context:** The standalone engine relied on 2025 constants (wage cap $176,100). Clients retiring in 2026 need current statutory limits and proper wage-indexing treatment.
**Resolution:** 
- Updated `constants.ts` with the 2026 OASDI maximum taxable earnings limit ($184,500).
- Pinned wage indexing for under-60 workers to the latest published AWI year in `services/engine.ts`, conforming to SSA statement convention.

---

## B-3 · Input Bounds & Degenerate Value Guardrails
**Status:** ✅ **COMPLETED** (2026-11-02 `Work/WORK_ORDER_pending_enhancements_and_guardrails.md` · Lane A)

**Context:** Stress testing in the main Finance Tracker app identified that unconstrained user inputs (e.g. negative COLA, out-of-bounds investment returns, negative PIA, or invalid life expectancies) could cause divide-by-zero errors or inverted optimization results.
**Resolution:** Defined domain bounds in `constants.ts` and defensive safety clamping in `services/engine.ts` and `App.tsx`:
- COLA: 0.0% to 10.0%
- Real Return: -10.0% to 20.0%
- Solvency Factor: 0.0 to 1.0 (50% to 100% on slider)
- Life Expectancy: 50 to 105
- Monthly PIA: Capped at $20,000/mo; AIME capped at $50,000/mo.

---

## B-4 · 81-Pair Strategy Grid Heatmap Interactive Component
**Status:** ✅ **COMPLETED** (2026-11-02 `Work/WORK_ORDER_pending_enhancements_and_guardrails.md` · Lane B)

**Context:** The standalone app computed the 81-pair claiming matrix (`services/engine.ts:calculateStrategyGrid`) but did not render the full 9x9 matrix in the UI. Advisors need an interactive heatmap comparing all combinations (ages 62 to 70 for both partners) to explain trade-offs to clients.
**Resolution:** Built `StrategyHeatmap.tsx` with:
- Calibrated Red-Amber-Green color gradient (`HEAT_RAMP`).
- Luminance-aware text contrast (`heatLabelColor` from `theme.ts`) for high readability.
- Gold star badge (`★`) identifying the global wealth-maximizing strategy pair.
- Deep indigo ring and check badge (`✓`) identifying current user selection.
- One-click strategy selection updating the entire application reactively.
- Dual display toggle: Spread above worst-case (`+$Xk`) vs. Total Lifetime (`$X.XXM`).

---

## B-5 · Advisor Workflow & Multi-Client Decoupling
**Status:** ✅ **COMPLETED** (2026-11-02 `Work/WORK_ORDER_pending_enhancements_and_guardrails.md` · Lane C)

**Context:** Transition the tool from a personal scenario modeler to a client-agnostic advisory workstation.
**Resolution:**
- Added Advisor Presets bar in Global Assumptions: Balanced (67/67), Asymmetric (70/62), Longevity Gap (78/96).
- One-click scenario reset button (`RefreshCcw`) to quickly return to baseline.
- Generic Partner A / Partner B labels with full editable naming.

---

## B-6 · Direct SSA Statutory Factor Auto-Update Workflow
**Status:** ✅ **COMPLETED** (2026-11-02 `scripts/update_ssa_factors.py`)

**Context:** Financial advisors need official statutory precision without manual annual maintenance. The tool must be able to pull updated factors directly from SSA.gov (AWI series, bend points, wage base) while maintaining zero-delay static hosting.
**Resolution:**
- Implemented `scripts/update_ssa_factors.py` with Akamai-compliant browser navigation headers.
- Added short-parse refusal contracts (`MIN_EXPECTED_ROWS >= 30`).
- Directly updates `constants.ts` and exports `public/statutory_factors.json` for client auditing.
- Added `npm run update-ssa` script to `package.json`.
- Successfully fetched official SSA figures: 2027 Bend Points ($1,340 / $8,077), 2027 Wage Cap ($192,300), and 2025 AWI ($72,800.33).
- Added live SSA provenance badge in the application header.

---

## B-7 · Google AI Studio / Cloud Hosting Deployment Packaging
**Status:** 📋 **CANDIDATE**

**Context:** Packaging the application for zero-backend deployment, containerization, or web embed via Google AI Studio and modern cloud hosting.
**Plan:**
- Audit environment configurations and ensure zero API dependencies for client-side evaluation.
- Document deployment steps, build triggers, and embed instructions.
