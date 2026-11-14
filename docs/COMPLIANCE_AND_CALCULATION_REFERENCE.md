# Social Security Strategy Optimizer v3.0
## Technical Calculation Specification & Regulatory Compliance Manual
*Prepared for Financial Advisors, Compliance Officers, Actuaries, and Executive Presentation*

---

```
========================================================================================
PRESENTATION SLIDE DECK & COMPLIANCE SPECIFICATION
Social Security Strategy Optimizer — Actuarial Engine & Compliance Guide
========================================================================================
```

---

## Slide 1: Executive Overview & Purpose

### Slide Header
**Institutional-Grade Social Security Optimization Engine**
*High-precision household claiming optimization, actuarial cash flow modeling, and retirement tax integration.*

### Executive Summary & Purpose
The **Social Security Strategy Optimizer (v3.0)** is an actuarially sound, client-facing financial planning software application designed for Registered Investment Advisors (RIAs), broker-dealers, wealth planners, and institutional fiduciary consultation workflows.

### Primary Fiduciary Objectives
1. **Household Wealth Maximization**: Analyzes all 81 combinations of retirement claiming ages (ages 62 through 70 for both partners) to identify the mathematically optimal claiming strategy under customizable longevity, inflation, and investment return assumptions.
2. **Statutory Integrity**: Directly applies Title II of the Social Security Act, incorporating 35-year wage-indexing (AIME), statutory bend points, early retirement reduction factors, delayed retirement credits (DRCs), spousal top-ups under deemed filing rules, and survivor step-up annuities.
3. **Decumulation & Tax Alignment**: Couples actuarial claiming decisions with post-retirement decumulation analysis, specifically modeling Required Minimum Distributions (RMDs) at age 75 and IRS provisional income formulas to anticipate and mitigate the "Tax Torpedo."
4. **Client Education & Visualization**: Replaces abstract actuarial tables with interactive visual tools—including an 81-pair claiming heatmap, break-even crossover trajectories, and side-by-side single vs. married filing tax comparisons.

### Compliance & Governance Baseline
- **Zero Backend / Complete Data Privacy**: 100% client-side TypeScript execution in the browser. Zero personally identifiable information (PII) or earnings data is ever transmitted across the network or stored in external databases.
- **Auditable Math Engine**: Pure deterministic calculations without stochastic black-boxes, enabling line-by-line verification by compliance and audit officers.
- **Dynamic Statutory Updating**: Automated data pipeline sourcing published National Average Wage Index (AWI), contribution bases (Tax Max), and bend points directly from the Social Security Administration Office of the Chief Actuary.

---

## Slide 2: Software Architecture & Fiduciary Safeguards

### Slide Header
**System Architecture & Information Security Architecture**
*Browser-local execution model ensuring strict client data confidentiality.*

### Architectural Architecture Diagram
```
+-----------------------------------------------------------------------------------+
|                            CLIENT BROWSER (ISOLATED)                              |
|                                                                                   |
|  +-------------------------+       +--------------------------------------------+ |
|  |     USER INTERFACE      |       |             ACTUARIAL ENGINE               | |
|  | - React 19 / TypeScript | ----> | - Pure functional TypeScript (engine.ts)   | |
|  | - Tailwind CSS & CDN    | <---- | - Deterministic calculation pipelines      | |
|  | - Recharts & Lucide     |       | - Guardrailed mathematical bounds          | |
|  +-------------------------+       +--------------------------------------------+ |
|               ^                                           ^                       |
|               |                                           |                       |
|  +-------------------------+       +--------------------------------------------+ |
|  |   CLIENT INPUT DATA     |       |            STATUTORY REPOSITORY            | |
|  | - Manual PIA / AIME     |       | - constants.ts (Official SSA.gov Series)   | |
|  | - 35-Year Wage History  |       | - AWI Series (1987-2025)                   | |
|  | - Qualified Balances    |       | - Tax Max Cap Series (1980-2027)           | |
|  | - All in Local Memory   |       | - Statutory Bend Points (2027 Eligibility) | |
|  +-------------------------+       +--------------------------------------------+ |
|                                                                                   |
|  [SECURITY GUARANTEE]: NO EXTERNAL API CALLS | NO PERSISTENT SERVER TELEMETRY     |
+-----------------------------------------------------------------------------------+
```

### Key Fiduciary & Information Security Safeguards
1. **Gramm-Leach-Bliley Act (GLBA) & Regulation S-P Parity**: Because the engine operates entirely within the client's local browser memory, no non-public personal information (NPI) leaves the advisor's workstation. 
2. **Defensive Mathematical Guardrails**:
   - Monthly PIA capped at $20,000/month (statutory maximum is under $5,500/month in 2026).
   - COLA bounded between 0.0% and 10.0%.
   - Real investment return bounded between -10.0% and +20.0%.
   - Life expectancy bounded between age 40 and 120.
3. **Statutory Refresh Script**: Includes automated python tooling (`scripts/update_ssa_factors.py`) that audits SSA.gov endpoints directly with strict row-count verification and range sanity checks.

---

## Slide 3: Statutory Benefit Calculation Engine (AIME & PIA)

### Slide Header
**Primary Insurance Amount (PIA) Determination**
*Step-by-step statutory calculation of unreduced retirement benefits.*

### Legal & Statutory Authority
- **42 U.S.C. Section 415**: Computation of Primary Insurance Amount.
- **20 C.F.R. Section 404.210 - 404.212**: Average Indexed Monthly Earnings method.

### Calculation Pipeline

#### Step 1: Historical Wage Indexing
For each year of earnings entered by the user:
1. Earnings are capped at the statutory **Contribution and Benefit Base (Tax Max)** for that calendar year (e.g., $25,900 in 1980, $142,800 in 2021, $184,500 in 2026, $192,300 in 2027).
2. The **Indexing Year** is established as the year the worker reaches age 60. For workers under age 60, indexing is fixed to the latest published AWI year per SSA standard practice.
3. For years prior to age 60, earnings are multiplied by the indexing factor:
   $$\text{Indexing Factor}_y = \frac{\text{AWI}_{\text{Indexing Year}}}{\text{AWI}_y}$$
4. Earnings at or after age 60 are credited at their nominal value (capped at the Tax Max) without wage indexing.

#### Step 2: Average Indexed Monthly Earnings (AIME)
1. All indexed earnings are sorted in descending order.
2. The highest **35 years** are selected. If the worker has fewer than 35 years of covered earnings, zero values are used to fill out the 35 years.
3. The sum of the top 35 years is divided by **420 months** (35 years x 12 months):
   $$\text{AIME} = \text{floor}\left( \frac{\sum_{i=1}^{35} \text{Indexed Earnings}_i}{420} \right)$$

#### Step 3: Progressive 3-Tier Bend Point Formula
The Primary Insurance Amount (PIA) is computed using the progressive three-tier bend point formula established for the eligibility year (turning age 62). For eligibility year 2027, the published statutory bend points are **$1,340** and **$8,077**:

```
+--------------------------------------------------------------------------+
| Tier 1: 90% of AIME up to Bend Point 1 ($1,340)                          |
| Tier 2: 32% of AIME between Bend Point 1 ($1,340) and Bend Point 2 ($8,077)|
| Tier 3: 15% of AIME in excess of Bend Point 2 ($8,077)                    |
+--------------------------------------------------------------------------+
```

$$\text{PIA}_{\text{raw}} = 0.90 \times \min(\text{AIME}, B_1) + 0.32 \times \max(0, \min(\text{AIME} - B_1, B_2 - B_1)) + 0.15 \times \max(0, \text{AIME} - B_2)$$

#### Step 4: Statutory Dime Truncation
In accordance with 42 U.S.C. 415(a)(1)(A), the resulting monthly PIA is truncated down to the next lower multiple of $0.10:
$$\text{PIA} = \frac{\text{floor}(\text{PIA}_{\text{raw}} \times 10)}{10}$$

---

## Slide 4: Early Claim Reductions, Delayed Retirement Credits & Adjustments

### Slide Header
**Actuarial Claim Age Adjustments**
*Statutory reduction factors for early claiming and credit accrual for delayed retirement.*

### Statutory Rules & Reference
- **Full Retirement Age (FRA)**: Set to age 67 for all workers born in 1960 or later (42 U.S.C. 416(l)).
- **Early Retirement Reductions** (42 U.S.C. 402(q)):
  - **First 36 Months Prior to FRA**: Reduced by $5/9$ of $1\%$ ($0.5556\%$) per month ($20\%$ total reduction at age 64).
  - **Additional Months (37 to 60 Months Prior to FRA)**: Reduced by $5/12$ of $1\%$ ($0.4167\%$) per month ($10\%$ additional reduction; total $30\%$ reduction at age 62).
- **Delayed Retirement Credits (DRCs)** (42 U.S.C. 402(w)):
  - Benefits delayed past age 67 earn credits at the rate of $2/3$ of $1\%$ ($0.6667\%$) per month ($8.0\%$ simple per year).
  - Maximum accrual at age 70 (36 months of credits) = $+24.0\%$ increase. No additional credits accrue after age 70.

### Benefit Adjustment Table (Cohorts Born 1960+, FRA = 67)
| Claim Age | Months Relative to FRA | Monthly Adjustment Factor | Percentage of PIA | Monthly Benefit on $3,000 PIA |
| :---: | :---: | :---: | :---: | :---: |
| **62** | -60 months | -30.00% | **70.00%** | $2,100 |
| **63** | -48 months | -25.00% | **75.00%** | $2,250 |
| **64** | -36 months | -20.00% | **80.00%** | $2,400 |
| **65** | -24 months | -13.33% | **86.67%** | $2,600 |
| **66** | -12 months | -6.67% | **93.33%** | $2,800 |
| **67 (FRA)** | 0 months | 0.00% | **100.00%** | $3,000 |
| **68** | +12 months | +8.00% | **108.00%** | $3,240 |
| **69** | +24 months | +16.00% | **116.00%** | $3,480 |
| **70** | +36 months | +24.00% | **124.00%** | $3,720 |

---

## Slide 5: Household Spousal, Survivor, and Deemed Filing Mechanics

### Slide Header
**Complex Household Dynamics: Spousal & Survivor Benefits**
*Simulating statutory interplay between primary earners, spouses, and surviving beneficiaries.*

### 1. Spousal Benefit Calculation & Top-Up Rule
Under 42 U.S.C. Section 402(b) and (c), a married individual is eligible for a spousal benefit up to 50% of their spouse's Full Retirement Age PIA (not their delayed benefit), reduced by their own earned PIA:
$$\text{Raw Spousal Top-Up} = \max(0, [0.50 \times \text{PIA}_{\text{Spouse}}] - \text{PIA}_{\text{Own}})$$

- **Early Spousal Reductions**: If the spouse claims prior to their own FRA (age 67):
  - First 36 months early: reduced by $25/36$ of $1\%$ ($0.6944\%$) per month ($25\%$ reduction at age 64).
  - Additional months (up to 24): reduced by $5/12$ of $1\%$ ($0.4167\%$) per month ($10\%$ additional reduction; total $35\%$ reduction at age 62).
  - At age 62, a spouse receives $32.5\%$ of the primary earner's PIA if their own PIA is zero.
- **Deemed Filing (Bipartisan Budget Act of 2015)**: Under current statutory rules, filing for either retirement or spousal benefits is deemed to be a concurrent filing for both. A spousal top-up is payable only once both spouses have officially claimed benefits.

### 2. Survivor Annuity Step-Up Rule
Under 42 U.S.C. Section 402(e) and (f), when one spouse passes away, the surviving spouse steps up to the higher of their own ongoing benefit or the deceased spouse's actual benefit:
$$\text{Survivor Benefit} = \max(\text{Benefit}_{\text{Surviving}}, \text{Benefit}_{\text{Deceased}})$$

#### Critical Actuarial Insight for Financial Advisors
- Delayed Retirement Credits earned by the higher-earning spouse transfer in full to the surviving spouse upon death.
- Therefore, delaying the higher earner's claim to age 70 does not merely insure a single life—it provides an inflation-protected longevity annuity that persists for the lifetime of **whichever spouse lives longer**.
- This explains why asymmetric claiming strategies (e.g., lower earner claiming at 62 while higher earner delays to 70) frequently emerge as mathematically optimal in longevity scenarios.

---

## Slide 6: Multi-Year Simulation & Portfolio Compounding

### Slide Header
**Annual Household Cash Flow & Reinvestment Modeling**
*Compounding annual benefits across changing household survival states.*

### Multi-Year Timeline Structure
The engine iterates each calendar year from the older partner's age 62 through the death of the last surviving spouse (or age 100).

```
Calendar Year Timeline:
Age 62 ----------------> Claim Ages ----------------> First Death ----------------> Second Death
[Zero SS Inflow]         [Both Alive: Benefit A + B] [Survivor: Max(A, B)]         [Simulation End]
```

### Mathematical Compounding Steps for Year $t$
1. **Survival Verification**:
   - Partner A alive: $\text{Age}_{A, t} \le \text{LifeExp}_A$
   - Partner B alive: $\text{Age}_{B, t} \le \text{LifeExp}_B$
2. **COLA Inflation Factor**:
   $$\text{Inflation Factor}_t = (1 + \text{COLA})^{t - t_0}$$
   *(Note: When "Today's Dollars" mode is enabled, effective COLA is set to 0.0%, displaying all values in constant purchasing power.)*
3. **Monthly Benefit Assembly**:
   - **Both Alive**: Each partner receives their adjusted benefit once their claim age is reached, plus applicable spousal top-ups if both have filed.
   - **One Surviving**: The surviving partner receives the maximum of their own benefit or the deceased partner's inflation-adjusted benefit.
4. **Solvency Haircut (Trust Fund Depletion Option)**:
   - If toggled, benefit payments are multiplied by the user-defined payable factor (e.g., 83% based on the SSA Trustees Report projected reserves exhaustion date):
     $$\text{Annual Benefit}_t = (\text{Monthly Check}_{A, t} + \text{Monthly Check}_{B, t}) \times 12 \times \text{Solvency Factor}$$
5. **Portfolio Reinvestment Compounding**:
   - To reflect the time value of money and opportunity cost of early claiming, cumulative wealth is compounded annually using the nominal return rate:
     $$\text{Nominal Return Rate} = (1 + \text{Real Return}) \times (1 + \text{COLA}) - 1$$
     $$\text{Cumulative Wealth}_t = \left( \text{Cumulative Wealth}_{t-1} \times (1 + \text{Nominal Return Rate}) \right) + \text{Annual Benefit}_t$$

---

## Slide 7: 81-Pair Claiming Strategy Grid & Optimization Matrix

### Slide Header
**The 81-Pair Strategy Grid Heatmap**
*Exhaustive search space identifying optimal household claiming combinations.*

### Matrix Mechanics
- Evaluates every integer combination of claim ages between 62 and 70:
  $$\{62, 63, 64, 65, 66, 67, 68, 69, 70\}_A \times \{62, 63, 64, 65, 66, 67, 68, 69, 70\}_B = 81 \text{ discrete strategies}$$
- Each cell executes a complete multi-year lifetime simulation to determine total cumulative household wealth.
- Identifies:
  - $\text{Max Lifetime Wealth}$: The optimal strategy $(\text{Age}_A^*, \text{Age}_B^*)$.
  - $\text{Min Lifetime Wealth}$: The worst-case baseline strategy.
  - $\text{Lifetime Spread}$: $\text{Max Lifetime Wealth} - \text{Min Lifetime Wealth}$ (typically ranging between $200,000 and $600,000+ per household).

### Display Modes in the Heatmap
1. **Spread Mode (+vs Worst)**: Displays the incremental dollars gained over the worst-case claiming combination (e.g., `+$384k`). Highlights the cost of sub-optimal claiming.
2. **Total Mode ($M)**: Displays the absolute cumulative terminal wealth in millions (e.g., `$2.84M`).
3. **Color Ramp Normalization**: Calculates normalized cell heat $H \in [0, 1]$:
   $$H = \frac{\text{Total Cash}_{\text{cell}} - \text{Min Cash}}{\text{Max Cash} - \text{Min Cash}}$$
   Mapped dynamically to an advisor-styled 9-tier visual spectrum from baseline to optimal emerald.

### Marital Opportunity Analysis
- The engine simulates the full 81-pair grid twice: once under Married rules and once under Unmarried (Single) rules.
- Computes the **Marriage / Unmarried Opportunity Spread**:
  $$\text{Global Gap} = \text{Global Optimal Wealth} - \text{Current Status Optimal Wealth}$$
- Alerts the advisor if legal marital status creates an opportunity or drag in excess of $1,000.

---

## Slide 8: Age 75 Tax Bomb & RMD Simulator (IRC §§ 72, 86, 401)

### Slide Header
**Federal Tax Implications with RMDs at Age 75**
*Uncovering the "Tax Torpedo" where RMDs force 85% of Social Security into taxable income.*

### Purpose & Statutory Framework
Social Security planning cannot occur in a vacuum. Under Internal Revenue Code (IRC) Section 401(a)(9) and the SECURE 2.0 Act, Required Minimum Distributions (RMDs) mandate withdrawals from traditional 401(k) and IRA accounts starting at age 73 or 75. These distributions inflate provisional income, forcing Social Security benefits into taxable income.

### Calculation Sequence at Age 75

#### 1. Qualified Balance Projection
Existing tax-deferred balances are projected forward to age 75 using the user-defined real investment return rate, adding annual contributions until the designated contribution retirement age:
$$\text{FV} = \text{Balance}_0 \times (1 + r)^t + \text{Annual Contribution} \times \left[ \frac{(1 + r)^{t_{\text{contrib}}} - 1}{r} \right] \times (1 + r)^{t - t_{\text{contrib}}}$$

#### 2. RMD Divisor
Using the IRS Uniform Lifetime Table (IRS Publication 590-B), the distribution period factor for age 75 is **24.6**:
$$\text{Gross RMD} = \frac{\text{Projected Balance at 75}}{24.6}$$

#### 3. Qualified Charitable Distribution (QCD) Offset
Under IRC Section 408(d)(8), QCDs directly reduce the taxable RMD amount dollar-for-dollar without requiring itemization:
$$\text{Taxable RMD} = \max(0, \text{Gross RMD} - \text{QCD})$$

#### 4. IRS Provisional Income Formula (IRC Section 86)
Provisional income determines what fraction of Social Security is subject to federal income taxation:
$$\text{Provisional Income} = \text{Non-SS Income} + (0.50 \times \text{Social Security Benefit})$$
Where $\text{Non-SS Income} = \text{Taxable RMD} + \text{Fixed Other Income (Pensions, Interest, Rental)}$.

#### 5. Three-Tier Social Security Taxability Schedules
Statutory thresholds established by Congress (unindexed for inflation since 1984/1993):

| Filing Status | Tier 1 Threshold (50% Subject to Tax) | Tier 2 Threshold (85% Subject to Tax) |
| :--- | :---: | :---: |
| **Single** | $25,000 | $34,000 |
| **Married Filing Jointly** | $32,000 | $44,000 |

- If $\text{Provisional Income} \le T_1$: $\text{Taxable SS} = 0$.
- If $T_1 < \text{Provisional Income} \le T_2$:
  $$\text{Taxable SS} = \min\left(0.50 \times \text{SS}, 0.50 \times [\text{Provisional Income} - T_1]\right)$$
- If $\text{Provisional Income} > T_2$:
  $$\text{Taxable SS} = \min\left(0.85 \times \text{SS}, 0.85 \times [\text{Provisional Income} - T_2] + \min(0.50 \times \text{SS}, 0.50 \times [T_2 - T_1])\right)$$

#### 6. Federal Income Tax Brackets (2025 Standard Schedules)
1. $\text{Adjusted Gross Income (AGI)} = \text{Non-SS Income} + \text{Taxable SS}$
2. $\text{Taxable Income} = \max(0, \text{AGI} - \text{Standard Deduction})$
   - Standard Deductions (2025): Single = $15,000; Married Filing Jointly = $30,000.
3. Progressive marginal brackets applied (10%, 12%, 22%, 24%, 32%, 35%).
4. Metrics generated:
   - **Total Federal Tax Liability** ($)
   - **Effective Tax Rate** ($\text{Tax} / \text{AGI}$)
   - **Marginal Tax Bracket** (%)
   - **Marriage Penalty / Bonus Differential**: Compares filing as Married Joint vs. two Single individuals.

---

## Slide 9: User Inputs Guide

### Global Assumptions
| Input Control | Data Type / Unit | Default | Statutory / Practical Purpose |
| :--- | :--- | :---: | :--- |
| **Dollar Value Toggle** | Toggle (`Today's` vs `Future`) | Future | Controls inflation indexing. "Today's Dollars" sets COLA to 0% to evaluate purchasing power in constant dollars. |
| **Inflation Rate (=SS COLA)** | Percentage Slider (0.0% to 10.0%) | 2.5% | Annual Cost-of-Living Adjustment applied to Social Security benefits and nominal investment compounding. |
| **Real Investment Return** | Percentage Slider (-10.0% to +20.0%) | 5.0% | Return earned on accumulated/reinvested cash flows over and above inflation. |
| **Apply Solvency Haircut?** | Checkbox Toggle | Off | Enables stress-testing against projected Social Security Trust Fund depletion scenarios. |
| **Benefits Payable Percentage** | Percentage Slider (50% to 100%) | 83% | The fraction of statutory benefits payable under trust fund insolvency (83% matches current SSA Trustees estimates). |

### Partner Profiles (Partner A & Partner B)
| Input Control | Data Type / Unit | Default | Purpose & Calculation Role |
| :--- | :--- | :---: | :--- |
| **Partner Name** | Text String | Partner A / B | Personalizes client reports, chart labels, and table headers. |
| **Birth Year** | Integer (1900 to 2010) | 1973 | Establishes the cohort timeline, indexing year (age 60), and Full Retirement Age (age 67 for 1960+ cohorts). |
| **Life Expectancy** | Integer Slider (50 to 105) | 85 / 95 | Sets the mortality age for benefit cash flows and triggers survivor step-up calculations upon the first death. |
| **Claim Age** | Integer Slider (62 to 70) | 67 / 67 | Selected claiming age for the primary scenario comparison. |
| **Marital Status** | Linked Toggle (Single / Married) | Single | Governs whether spousal top-ups, deemed filing, and survivor step-ups are active in the engine. |
| **PIA Input Method** | Radio (`Manual PIA`, `Manual AIME`, `Earnings CSV`) | Manual PIA | Selects the fidelity level of the Social Security benefit input: direct benefit amount, AIME, or full 35-year wage history. |
| **Manual Monthly PIA** | Currency ($0 to $20,000) | $3,451 / $3,401 | Monthly benefit at Full Retirement Age (age 67). |
| **Manual Monthly AIME** | Currency ($0 to $50,000) | $10,000 | Average Indexed Monthly Earnings; automatically transformed to PIA via statutory bend points. |
| **Lifetime Earnings Record** | CSV String (`Year, Amount`) | 20-Year Sample | Multi-decade wage history parsed and indexed using historical AWI tables and Tax Max limits. |

### Tax Bomb Simulator (Age 75 Snapshot)
| Input Control | Data Type / Unit | Default | Purpose & Calculation Role |
| :--- | :--- | :---: | :--- |
| **Qualified Savings (401k/IRA)** | Currency ($) | $1.30M / $1.14M | Current balance of tax-deferred retirement accounts subject to future RMDs. |
| **Annual Contributions & Stop Age** | Currency ($) & Age | $0 @ 65 / $31k @ 65 | Ongoing pre-retirement savings added to qualified accounts until retirement. |
| **Other Income Sources (1, 2, 3)** | Currency ($) | $36k / $100k | Non-SS fixed retirement income (pensions, annuities, taxable interest) at age 75. |
| **Charitable Giving (QCDs)** | Currency ($) | $0 / $30,000 | Qualified Charitable Distributions executed directly from IRA at age 75 to reduce taxable RMDs. |

---

## Slide 10: Output Analytics, Charts & Visualizations Guide

### 1. Sticky Scorecard & KPI Banner
- **Optimal Strategy Card**: Highlights the maximum lifetime household wealth, displaying the specific claim ages for Partner A and Partner B that achieve this maximum.
- **Selected Strategy Card**: Displays the lifetime cumulative cash flow generated by the user's currently selected claiming ages.
- **Gap to Optimal**: Displays the exact dollar shortfall between the selected strategy and the mathematical optimum (highlighted in amber if shortfall exceeds $1,000).
- **Marriage / Unmarried Opportunity Spread**: Shows whether switching marital status yields a positive or negative wealth differential.
- **Min-Opt Spread**: Highlights the total dollar variance between the optimal strategy and the worst-case strategy across all 81 pairs.
- **Opportunity Alert Banner**: Appears dynamically when an unselected marital status provides a significant lifetime wealth advantage.

### 2. Interactive 81-Pair Claiming Strategy Grid Heatmap
- **Visual Matrix**: 9x9 matrix representing Partner A claim ages (columns 62–70) and Partner B claim ages (rows 62–70).
- **Instant Simulation**: Clicking any cell instantly switches the global simulation and charts to that strategy.
- **Visual Color Ramp**: Uses an advisor-grade heat scale to highlight high-performing clusters and warn against low-performing claiming decisions.
- **Quick Preset Buttons**: One-click switching to `Optimal`, `Both at FRA (67/67)`, or `Both Early (62/62)`.

### 3. Main Strategy Chart
- **Dual Visual Modes**:
  1. **Break-Even vs. 62 (Crossover Analysis)**:
     - Subtracts the early claiming baseline (both claiming at age 62) from each strategy.
     - The curve begins in negative territory (reflecting months of delayed claiming where no checks are received).
     - The exact age at which the curve crosses the horizontal **$0 break-even line** reveals the break-even age where delaying definitively pays off.
  2. **Cumulative Portfolio Growth**:
     - Plots total accumulated wealth over time under portfolio reinvestment.
     - Displays vertical reference markers for Partner A claim age, Partner B claim age, Partner A death, and Partner B death.
- **Benchmark Overlay Lines**:
  - `Your Strategy` (Solid Blue)
  - `Optimal Strategy` (Solid Green)
  - `Both at FRA 67` (Dashed Amber)
  - `Both at Age 70` (Dashed Purple)
  - `Baseline (Both at 62)` (Flat Zero Reference)

### 4. Age 75 Federal Tax Implications & Marriage Penalty Widget
- **Side-by-Side Comparison**: Contrasts Unmarried (Combined Individual Returns) vs. Married Filing Jointly.
- **Itemized Components**: Displays Gross RMD, Taxable RMD (post-QCD), Total Social Security, Taxable Social Security (post-provisional income test), Other Income, Projected AGI, Standard Deduction, and Federal Tax.
- **Tax Efficiency Metrics**: Compares Effective Federal Tax Rate and Top Marginal Tax Bracket.
- **Marriage Penalty / Bonus Detection Callout**: Alerts the advisor if filing jointly triggers an increase ("Marriage Penalty") or decrease ("Marriage Bonus") in annual tax liabilities at age 75 due to compressed provisional income thresholds or bracket stacking.

---

## Slide 11: Compliance Auditing, Disclosures & Regulatory Disclaimers

### Slide Header
**Institutional Compliance & Regulatory Reference Guide**
*Audit citations, fiduciary standards, and mandatory client disclosures.*

### Statutory Authority Index
| Topic | Statutory Citation | CFR Reference | SSA Operations Manual (POMS) |
| :--- | :--- | :--- | :--- |
| **AIME Calculation** | Social Security Act § 215(b) | 20 C.F.R. § 404.211 | POMS RS 00605.015 |
| **Bend Point Indexing** | Social Security Act § 215(a)(1)(B) | 20 C.F.R. § 404.212 | POMS RS 00605.021 |
| **Early Retirement Reduction** | Social Security Act § 202(q) | 20 C.F.R. § 404.410 | POMS RS 00615.010 |
| **Delayed Retirement Credits** | Social Security Act § 202(w) | 20 C.F.R. § 404.313 | POMS RS 00615.690 |
| **Spousal Entitlement** | Social Security Act § 202(b), (c) | 20 C.F.R. § 404.330 | POMS RS 00202.001 |
| **Deemed Filing Rule** | Bipartisan Budget Act of 2015 § 831 | 20 C.F.R. § 404.409 | POMS GN 00204.030 |
| **Widow(er) Survivor Benefit** | Social Security Act § 202(e), (f) | 20 C.F.R. § 404.335 | POMS RS 00207.001 |
| **Social Security Taxability** | Internal Revenue Code § 86 | Treas. Reg. § 1.86-1 | IRS Publication 915 |
| **RMD Divisors** | Internal Revenue Code § 401(a)(9) | Treas. Reg. § 1.401(a)(9) | IRS Publication 590-B |

### Standard Institutional Advisor Disclosure
> **Compliance & Legal Notice**: The Social Security Strategy Optimizer is an analytical and educational modeling tool provided for professional financial planning and illustrative consultation purposes only. It is not an official determination of benefits by the Social Security Administration (SSA) or the Internal Revenue Service (IRS). Projections are based on mathematical simulations of current statutory formulas, published SSA actuarial tables, and user-selected assumptions regarding inflation, investment returns, and longevity. Actual benefits will be determined by the SSA at the time of claim based on complete covered wage records and statutory rules in effect at that time. Fiduciary advisors must independently verify client earnings histories via official SSA Form SSA-7004 (Social Security Statement) prior to executing claiming recommendations.
