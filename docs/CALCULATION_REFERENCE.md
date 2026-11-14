# Social Security Optimizer — Calculation Reference

This document describes how the Social Security Optimizer calculates its results: the formulas, the published data they use, and the simplifications the model makes. It is not an official SSA or IRS determination, and it is not financial, tax or legal advice.

Numbered sections are referenced by the companion slide outline (`PRESENTATION_OUTLINE.md`). Worked examples cite a test case id from `tests/fixtures/ss_golden_vectors.json`. Each of those cases has a hand-derived expected value that the automated tests check against the code.

---

## 1. Purpose and scope

The tool compares Social Security claiming ages for a household of two people (Partner A and Partner B). For every combination of whole-year claim ages from 62 to 70 (81 pairs), it projects annual benefits for both partners and their survivor, reinvests those benefits at an entered rate of return, and ranks the pairs by the resulting value. A separate panel estimates federal income tax for one future year, including required minimum distributions (RMDs).

It is intended for advisors and clients who want to review the calculation basis behind the results.

**Supported birth years:** 1943 through 2010. The rules described below (full retirement age schedule, delayed retirement credits of 8% per year, deemed filing) are implemented for that range.

**Not modeled:** several benefit rules and planning factors are outside the model. Section 11 lists them.

---

## 2. Data sources and vintages

| Data | Values used | Source |
|---|---|---|
| PIA bend points | Every eligibility year 1979–2027; latest is 2027: $1,340 / $8,077 | https://www.ssa.gov/oact/COLA/bendpoints.html |
| National Average Wage Index (AWI) | 1951–2025; latest is 2025: $72,800.33 | https://www.ssa.gov/oact/cola/awiseries.html |
| Cost-of-living adjustments (COLA) | 1975–2026, each effective December of its year; latest is 3.6% (December 2026) | https://www.ssa.gov/oact/cola/colaseries.html |
| Contribution and benefit base (wage cap) | 1951–2027; latest is 2027: $192,300 | https://www.ssa.gov/oact/cola/cbb.html |
| Trust fund solvency default | 2026 Trustees Report: retirement and survivors (OASI) fund depleted in 2032 with 78% of scheduled benefits payable; combined OASDI funds in 2034 with 83% | SSA press release, June 9, 2026: https://www.ssa.gov/news/en/press/releases/2026-06-09.html |
| Federal tax brackets and standard deduction | Tax year 2027 | Rev. Proc. 2026-35; IRS release: https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2027-taxpayers-continue-to-benefit-from-the-working-families-tax-cuts |
| Additional standard deduction (65+) | Tax year 2027: $2,100 unmarried / $1,700 married per person | Rev. Proc. 2026-35, section 3.15(3) |
| QCD limit | Tax year 2027: $114,000 per IRA owner | IRS Notice 2026-66: https://www.irs.gov/pub/irs-drop/n-26-66.pdf |
| Senior deduction | $6,000 per person 65+, tax years 2025–2028, reduced by 6% of MAGI over $75,000 ($150,000 joint) | https://www.irs.gov/newsroom/one-big-beautiful-bill-act-tax-deductions-for-working-americans-and-seniors |
| Uniform Lifetime Table | Ages 72–100 (24.6 at age 75) | IRS Publication 590-B |

The four SSA series were last refreshed on 2026-11-14 with `npm run update-ssa`. That command downloads the SSA tables, checks row counts and known values, and regenerates `constants.ts`. The tax, solvency, retirement-age and RMD tables are maintained by hand in `statutoryTables.ts`, with a source noted next to each table.

---

## 3. Primary Insurance Amount (PIA)

The PIA is the monthly benefit at full retirement age (FRA). Each partner's PIA can be entered in one of three ways:

1. **Manual PIA** — the monthly amount at full retirement age. The best figure to use is the one on the client's SSA statement (my Social Security).
2. **Manual AIME** — average indexed monthly earnings, converted to a PIA with the bend-point formula below.
3. **Earnings** — a year-by-year earnings history (`year, amount` per line), converted to an AIME and then a PIA.

### 3.1 From earnings to AIME

```
For each year of earnings (1951 or later):
  capped   = min(earnings, wage cap for that year)
  if year < indexing year:  indexed = capped x AWI(indexing year) / AWI(year)
  else:                     indexed = capped            (nominal, no indexing)

AIME = floor( sum of the highest 35 indexed years / 420 )
```

- The **indexing year** is the year the worker turns 60. If that year's AWI hasn't been published yet, the latest published AWI year is used. This follows the convention SSA uses on benefit statements, and it keeps the result at today's wage level.
- Fewer than 35 years of earnings are filled with zeros.
- Earnings before 1951 are not used. Years with no published wage cap use the latest cap. Both cases produce a warning under the PIA field.

### 3.2 From AIME to PIA

The bend points are those of the worker's **eligibility year** (the year they turn 62). If the eligibility year is after the latest published year (2027), the 2027 bend points are used, paired with indexing at the 2025 AWI.

```
PIA = 0.90 x min(AIME, BP1)
    + 0.32 x (min(AIME, BP2) - BP1)     if AIME > BP1
    + 0.15 x (AIME - BP2)               if AIME > BP2
truncated down to the next lower multiple of $0.10
```

**Worked examples**

| Case id | Inputs | Result |
|---|---|---|
| `pia-tiers-truncation` | Born 1973, AIME $10,000 (2027 bend points) | 1,206.00 + 2,155.84 + 288.45 = 3,650.29, so PIA = **$3,650.20** |
| `bp-eligibility-2026` | Born 1964 (eligible 2026: $1,286 / $7,749), AIME $8,000 | PIA = **$3,263.20** |
| `bp-eligibility-2027` | Born 1965 (eligible 2027), AIME $8,000 | PIA = **$3,337.20** |
| `earnings-pre1987-indexing` | Born 1960; earnings 1950 $5,000, 1980 $30,000, 2021 $100,000 | 1950 excluded; 1980 capped at $25,900 and indexed to 2020 = $115,138.48; 2021 nominal $100,000; AIME = 512; PIA = **$460.80** at eligibility (2022 bend points), $544.50 in 2026 dollars (section 3.3) |

### 3.3 COLAs for clients already past 62

The bend-point formula gives the PIA in eligibility-year dollars. A PIA receives every COLA effective from December of the eligibility year onward, so for a client already past 62, the Manual AIME and Earnings modes apply the published COLAs from the eligibility year through December of last year. Each step is rounded down to the dime, which puts the PIA in current-year dollars. A Manual PIA from the client's SSA statement already includes these COLAs and is used as entered.

Case `cola-since-eligibility-1958`: born 1958 (eligible 2020), PIA $3,000 at eligibility. With the COLAs of December 2020–2025 (1.3%, 5.9%, 8.7%, 3.2%, 2.5%, 2.8%) it becomes $3,039.00, $3,218.30, $3,498.20, $3,610.10, $3,700.30 and **$3,803.90** in 2026 dollars. Case `earnings-pre1987-indexing` above is $460.80 at eligibility (2022) and **$544.50** in 2026 dollars.

---

## 4. Claim-age adjustments

### 4.1 Full retirement age by birth year

| Birth year | FRA |
|---|---|
| 1943–1954 | 66 |
| 1955 | 66 and 2 months |
| 1956 | 66 and 4 months |
| 1957 | 66 and 6 months |
| 1958 | 66 and 8 months |
| 1959 | 66 and 10 months |
| 1960 and later | 67 |

### 4.2 Reduction and delayed credits

Months are counted between the claim age and the FRA:

- **Claiming early:** 5/9 of 1% per month for the first 36 months, plus 5/12 of 1% for each additional month.
- **Claiming late:** delayed retirement credits of 2/3 of 1% per month (8% per year), up to age 70. No credits accrue after 70.
- Monthly benefits are rounded down to the whole dollar.

Claim ages in the tool are whole years (62, 63, … 70).

**FRA 67 (born 1960 or later), case `adj-fra67` and table values**

| Claim age | Months from FRA | % of PIA | On a $3,000 PIA |
|---|---|---|---|
| 62 | −60 | 70.00% | $2,100 |
| 63 | −48 | 75.00% | $2,250 |
| 64 | −36 | 80.00% | $2,400 |
| 65 | −24 | 86.67% | $2,600 |
| 66 | −12 | 93.33% | $2,800 |
| 67 | 0 | 100.00% | $3,000 |
| 68 | +12 | 108.00% | $3,240 |
| 69 | +24 | 116.00% | $3,480 |
| 70 | +36 | 124.00% | $3,720 |

**FRA 66 and 8 months (born 1958), case `adj-fra66y8m`**

| Claim age | Months from FRA | % of PIA | On a $3,000 PIA |
|---|---|---|---|
| 62 | −56 | 71.67% | $2,150 |
| 67 | +4 | 102.67% | $3,080 |
| 70 | +40 | 126.67% | $3,800 |

---

## 5. Spousal benefits (married households)

A married partner may receive a spousal benefit in addition to their own retirement benefit.

```
spousal excess = max(0, 50% x other partner's PIA - own PIA)
```

- The excess is based on the other partner's **PIA**, not on their actual benefit, so delayed credits don't raise it.
- **Deemed filing:** filing for one's own benefit is treated as filing for the spousal benefit too (rules for people born January 2, 1954 or later). The excess is payable only once **both** partners have filed. The tool starts it in the later of the partner's own claim year and the year the other partner files.
- **Reduction** depends on the partner's age when the spousal benefit **starts**: 25/36 of 1% per month for the first 36 months before FRA, plus 5/12 of 1% for each additional month. Starting at 62 with FRA 67 is a 35% reduction (32.5% of the other partner's PIA when one's own PIA is zero).

**Worked example, case `spousal-starts-at-later-filing`**

Both partners were born in 1973. Partner A has a PIA of $4,000 and claims at 70. Partner B has a PIA of $1,000 and claims at 62.

- Ages 62–69: Partner B receives their own reduced benefit of $1,000 x 70% = **$700**.
- From age 70, when Partner A files: the spousal excess is $2,000 − $1,000 = $1,000. It starts after Partner B's FRA, so it isn't reduced. Partner B receives **$1,700**.

---

## 6. Survivor benefits (married households)

When one partner dies, the survivor receives the larger of their own benefit or a survivor benefit based on the deceased partner's record. Any spousal excess stops.

### 6.1 Base amount

| Deceased partner's situation | Base for the survivor benefit |
|---|---|
| Claimed after FRA | Their actual benefit, including delayed retirement credits |
| Claimed at or before FRA | Their PIA (subject to the limit in 6.3) |
| Died before claiming, before FRA | Their PIA |
| Died before claiming, after FRA | Their PIA plus delayed credits accrued to the age at death (at most age 70) |

### 6.2 Reduction for the survivor's age

If survivor benefits start before the survivor's **survivor FRA**, they are reduced. The reduction is 28.5% at age 60, prorated by month to zero at survivor FRA. Survivor FRA is 65 and 8 months for 1943 births, 65 and 10 months for 1944, 66 for 1945–1956, rises by 2 months per birth year for 1957–1961, and is 67 for births 1962 and later.

### 6.3 Limit when the deceased claimed early

If the deceased partner claimed before FRA, the survivor benefit can't exceed the larger of (a) the reduced benefit the deceased was receiving, or (b) 82.5% of the deceased's PIA. SSA calls this the widow(er)'s limit (RIB-LIM).

### 6.4 When survivor benefits start

A widow(er) can start a reduced survivor benefit as early as age 60, or wait for a larger one, independently of when they claim their own retirement benefit. The tool tries every survivor start age from the later of (a) the first year after the death and (b) age 60, up to the survivor's survivor FRA (waiting longer adds nothing). For each start age it values the survivor's payments for the rest of their life, max(own benefit from their selected claim age, survivor benefit from that start age), using the same COLA, rate of return and solvency setting as the rest of the projection. It keeps the start age with the highest value, the earliest on a tie.

In practice, a survivor expected to live a short time after the death starts early (reduced), and one expected to live a long time waits for the unreduced amount. Meanwhile they collect their own benefit if they've claimed it.

### 6.5 Worked examples

**Case `survivor-riblim-and-reduction`:** both born 1973. Partner A has a PIA of $4,000, claims at 62 ($2,800/month) and is alive through age 63. Partner B has a PIA of $1,000 and claims at 62.

- Age 63 (both alive): Partner B receives their own $700 plus a spousal excess of $1,000 reduced 35%, which is $650, for a total of **$1,350**.
- Age 64 (survivor): $4,000 x (1 − 0.285 x 36/84) = $3,511.43. The limit is the larger of $2,800 and $3,300 (82.5% of $4,000), which is $3,300, so Partner B receives **$3,300**.

**Case `survivor-deceased-with-drcs`:** Partner A has a PIA of $3,000, claims at 70 ($3,720) and is alive through 75. Partner B (PIA $1,000) claims at 67. From age 76, Partner B receives **$3,720**, which includes Partner A's delayed credits.

**Cases `survivor-reduced-different-ages` and `survivor-waits-when-longer-lived`:** Partner A (born 1965, PIA $3,000) claims at 67 and is alive through 68. Partner B (born 1970, PIA $800) claimed at 62 and receives $560 plus a $455 spousal excess. After A's death, B (age 64) can start a survivor benefit of $2,633 now, $2,755 at 65, $2,877 at 66, or $3,000 at 67. At a 0% return: if B lives to 70, starting at 64 is worth the most (**$2,633** from 64). If B lives to 90, waiting to 67 is worth the most, so B keeps the own $560 until then and receives **$3,000** from 67.

**Case `survivor-deceased-died-before-claiming`:** Partner A has a PIA of $3,000, planned to claim at 70, and dies after age 64. Partner B (PIA $500) claims at 67 and receives **$3,000**, based on Partner A's PIA.

**Why the higher earner's claim age affects the survivor:** after the first death, the household keeps the larger of the two benefits. When the higher earner delays, the delayed credits raise that larger benefit, and it continues for as long as the survivor lives. Whether this outweighs the benefits not received while waiting depends on the entered life expectancies and rate of return. The grid in section 8 shows that tradeoff for the entered assumptions.

---

## 7. Household simulation

### 7.1 Timeline

- The simulation runs in calendar-year steps, from the year the older partner turns 62 until both partners have died.
- A partner is treated as alive in every year in which their age is less than or equal to the entered life expectancy. Benefits are paid for that full final year.
- A benefit starts in the calendar year the partner reaches the claim age and is paid for the full year.

### 7.2 Dollar basis

The **Dollar Value** toggle controls how amounts are expressed:

- **Today's:** COLA is set to 0% and benefits stay in current-year dollars. Benefits received are reinvested at the real return.
- **Future:** benefits grow each year by the entered inflation rate (used as the Social Security COLA), starting from the current year. The PIA is treated as today's dollars, consistent with SSA statement estimates. Benefits received are reinvested at the nominal return:

```
nominal return = (1 + real return) x (1 + inflation) - 1
```

### 7.3 Solvency reduction (optional)

When **Apply Solvency Haircut?** is on, benefits from the **Reduction starts in** year onward are reduced by the **Benefit Cut** percentage (benefit x (1 − cut)). Years before the start year are unchanged.

The defaults are the 2026 Trustees Report's projection for the retirement and survivors (OASI) fund: a **22% benefit cut** (78% of scheduled benefits payable) **from 2033**. The fund is projected to be depleted in 2032, and 2033 is the first full calendar year after that. The panel shows this projection under the toggle at all times. It says "Matches the 2026 Trustees Report projection" when the inputs equal it, and offers a one-click reset when they don't. For reference, it also shows the combined OASDI projection (2034, 83% payable, a 17% cut). The chart banner states the haircut in effect, or that none is applied.

Case `solvency-start-year`: a $1,000 PIA claimed at 62 pays $700/month in 2027–2033 and $560/month from 2034 when the start year is 2034 and the cut is 20% (80% payable).

### 7.4 Reinvestment

```
each year:  value = value x (1 + return) + benefits received that year
```

The value at the end of the simulation (the year the second partner dies) is the "lifetime" figure shown for each strategy.

---

## 8. Strategy grid, charts and scorecard

### 8.1 The 81-pair grid

For each pair of claim ages (Partner A 62–70 x Partner B 62–70), the tool runs the simulation in section 7 and records the end value. Every pair ends in the same year, so ranking pairs by end value gives the same order as ranking them by present value at the entered return.

- The cell marked ★ and the **Optimal** labels show the highest-value pair under the entered assumptions and the selected marital status.
- **Spread (+vs Worst)** view: each cell shows how much more it produces than the lowest-value pair, which is labeled "Base".
- **Total ($M)** view: each cell shows its end value in millions.
- Cell color blends smoothly from red (lowest value) through amber to green (highest value).
- Clicking a cell selects that pair for the rest of the page.
- Buttons above the grid set the pair to the highest-value pair, to 67/67 ("Both 67 (67/67)") or to 62/62 ("Early (62/62)").

With the default inputs (Single; PIAs $3,451 and $3,401; life expectancies 85 and 95; both born 1973; 2.5% inflation; 5% real return; Future dollars; no solvency reduction), the grid's highest-value pair is 62/69 and its lowest is 70/62, a spread of about $791,000. Results change with every input.

### 8.2 Break-even chart ("Break-Even vs. 62")

For each strategy, the chart plots its cumulative value minus the cumulative value of both partners claiming at 62, by age (the older partner's age when birth years differ). Where a line crosses $0, the strategy has caught up with claiming at 62.

Because cumulative values include investment returns on benefits already received, this crossover comes later than a simple break-even that ignores returns when the entered return is positive, and it moves as the return changes. Lines shown: Your Strategy, Optimal Strategy (optional), Both at 67 and Both at 70. Age 67 is the full retirement age for births 1960 and later.

### 8.3 Cumulative chart ("Cumulative Portfolio")

Plots cumulative value over time for the selected strategy, the highest-value strategy (optional) and the lowest-value strategy ("Worst Case"). It also marks each partner's claim and death year, and draws a line at the final value.

### 8.4 Scorecard

- **Optimal Strategy:** end value and claim ages of the highest-value pair.
- **Selected Strategy:** end value of the currently selected pair.
- **Gap to Optimal:** the difference between the two, shown when it's over $1,000.
- **Marriage Gain / Unmarried Gain:** the tool runs the full grid under both married and unmarried rules. When the other status's highest-value pair exceeds the current status's by more than $1,000, the difference appears here, along with an "Opportunity Alert" banner. This shows how much the spousal and survivor rules change the result for these inputs. It is a calculation result, not a recommendation about marital status.
- **Min-Opt Spread:** the difference between the highest- and lowest-value pairs.

### 8.5 Advisor presets and reset

The sidebar buttons change only the inputs listed:

| Preset | Married | Claim ages | PIAs | Life expectancies |
|---|---|---|---|---|
| Balanced | Yes | 67 / 67 | $3,400 / $3,400 | 85 / 85 |
| Asymmetric | Yes | 70 / 62 | $4,000 / $1,600 | 85 / 92 |
| Longevity | Yes | 65 / 70 | unchanged | 78 / 96 |

The reset button (↻) returns the global assumptions and both partner profiles to their defaults. Tax panel inputs are not reset.

---

## 9. Federal tax snapshot

The tax panel estimates federal income tax for one calendar year, called the snapshot year. It compares two unmarried individuals filing as Single with the same couple filing jointly.

### 9.1 Snapshot year

The snapshot year is the year the **older** partner turns 75. Both partners are evaluated in that same year, at their respective ages.

### 9.2 Tax-deferred balance

Each partner's current 401(k)/IRA balance is projected to the snapshot year at the real return, adding the entered annual contribution through the entered "until age":

```
FV = balance x (1 + r)^c + contribution x ((1 + r)^c - 1) / r      (c = contribution years)
FV = FV x (1 + r)^g                                                 (g = remaining years)
```

### 9.3 RMD and QCD

- A partner has an RMD only after reaching their RMD age: 73 for births 1951–1959, 75 for births 1960 and later (72 for 1950 and earlier).
- RMD = projected balance / Uniform Lifetime Table divisor for the partner's age (24.6 at 75).
- Qualified charitable distributions (QCDs) reduce the taxable RMD dollar for dollar: taxable RMD = max(0, RMD − QCD). QCDs are capped at $114,000 per partner. They apply only to a partner who is at least 71 in the snapshot year (QCDs require age 70½; the annual model uses 71).

### 9.4 Taxable Social Security

```
provisional income = taxable RMD + other income + tax-exempt interest + 50% x Social Security

Thresholds (not indexed for inflation):   Single $25,000 / $34,000    Joint $32,000 / $44,000
  PI <= T1:        taxable SS = 0
  T1 < PI <= T2:   taxable SS = min(50% x SS, 50% x (PI - T1))
  PI > T2:         taxable SS = min(85% x SS, 85% x (PI - T2) + min(50% x SS, 50% x (T2 - T1)))
```

| Case id | Inputs | Taxable SS |
|---|---|---|
| `taxable-ss-mfj-85` | Joint; SS $40,000; other income $50,000 | $28,100 |
| `taxable-ss-single-85` | Single; SS $30,000; other income $20,000 | $5,350 |
| `taxable-ss-below-t1` | Joint; SS $30,000; other income $10,000 | $0 |
| `taxable-ss-tax-exempt-interest` | Single; SS $30,000; other income $20,000; tax-exempt interest $10,000 | $13,850 |

### 9.5 Deductions, tax and rates

```
AGI            = taxable RMD + other income + taxable SS
deductions     = standard deduction (incl. 65+ additional amount) + senior deduction (if applicable)
taxable income = max(0, AGI - deductions)
tax            = 2027 brackets (10% to 37%) applied to taxable income
```

- 2027 standard deduction: $16,600 Single, $33,200 joint, plus $2,100 (Single) or $1,700 (joint, per spouse) for each person 65 or older. Cases `std-deduction-single-65` ($18,700) and `std-deduction-mfj-two-65` ($36,600).
- The senior deduction applies only if the snapshot year falls in 2025–2028.
- Federal tax cases: `fed-tax-single-2027` (Single, $60,000 taxable income: $7,741.50) and `fed-tax-mfj-2027-top-bracket` (joint, $1,000,000: $289,640.00).
- **Effective rate** = tax / AGI. **Top Marginal Bracket** is the statutory bracket that the last dollar of taxable income falls in. It is not the higher effective marginal rate that results when extra income also makes more Social Security taxable.

### 9.6 Dollar basis and limits of the snapshot

- The panel computes tax in today's dollars using the 2027 tables. Other income, tax-exempt interest and QCD inputs are treated as today's dollars. In Future mode, the displayed amounts are then grown by the entered inflation rate to the snapshot year.
- Tax law in the snapshot year is unknown. The current tables are a stand-in.
- "Unmarried (Combined)" means two individuals each filing as Single. Married Filing Separately is not modeled.
- The panel shows Gross RMD, Taxable RMD (after QCD), Total SS, Taxable SS, Other Income, Deductions, Projected AGI, estimated tax, effective rate and top marginal bracket for each filing comparison. It also notes whether filing jointly produces a higher or lower tax than two Single returns.

---

## 10. Inputs reference

### Global assumptions

| Input | Range | Default | Affects |
|---|---|---|---|
| Dollar Value (Today's / Future) | toggle | Future | Dollar basis (section 7.2) |
| General Inflation Rate (=SS COLA) | 0%–10% (0.1% steps) | 2.5% | Benefit growth and nominal return; disabled in Today's mode |
| Real Investment Return | −10% to +20% (0.5% steps) | 5.0% | Reinvestment of benefits; balance projection in the tax panel |
| Apply Solvency Haircut? | on / off | off | Section 7.3 |
| Benefit Cut | 0%–50% (shows the payable share alongside) | 22% (78% payable) | Benefit reduction from the start year |
| Reduction starts in | current year–2100 | 2033 | First year the reduction applies |

### Partner profiles (each partner)

| Input | Range | Default | Affects |
|---|---|---|---|
| Name | text | Partner A / Partner B | Labels |
| Birth Year | 1943–2010 | 1973 / 1973 | FRA, bend points, indexing year, timeline |
| Life Expectancy | 45–105 | 85 / 95 | Last year benefits are paid; triggers survivor benefit |
| Claim Age | 62–70 | 67 / 67 | Selected strategy (the grid evaluates all ages) |
| Marital Status (linked for both) | Single / Married | Single | Spousal and survivor rules |
| PIA method | Manual PIA / Manual AIME / Earnings | Manual PIA | Section 3 |
| Manual PIA | $0–$20,000 per month | $3,451 / $3,401 | PIA |
| Manual AIME | $0–$50,000 per month | $10,000 | PIA via bend points |
| Earnings | `year, amount` lines | 20-year samples (2005–2024) | AIME and PIA |

A note appears under Claim Age when a partner is already older than the selected age. Grid results for ages already passed are hypothetical.

### Tax panel (each partner)

| Input | Default (A / B) | Affects |
|---|---|---|
| Qualified Savings (401k/IRA) | $1,300,000 / $1,140,000 | Projected balance and RMD |
| Annual Contributions / Until Age | $0 until 65 / $31,000 until 65 | Projected balance |
| Other Income (3 sources) | $36,000 + $5,000 + $0 / $100,000 + $0 + $0 | AGI and provisional income |
| Tax-Exempt Interest | $0 / $0 | Provisional income only |
| Charitable Giving (QCDs) | $0 / $30,000 | Taxable RMD |

---

## 11. Model limitations and simplifications

- **Annual steps.** Benefits are modeled by calendar year, not month. Claim ages are whole years. Benefits are paid for the full year in which the claim age and the life expectancy age are reached.
- **Fixed life expectancies.** Each partner is assumed to live to the entered age. Survival probabilities are not modeled.
- **Survivor timing.** The survivor start age is chosen by value for the entered life expectancy and return (section 6.4). The survivor's own claim age is still the one selected in the grid; the two are not optimized jointly after the death.
- **Death before claiming.** Delayed credits for a partner who dies before claiming accrue through the year after their entered life expectancy, capped at age 70.
- **Benefits not modeled:** earnings test (benefits withheld while working before FRA), marriage-duration requirements (generally 9 months for survivor benefits, 1 year for spousal benefits), divorced-spouse, child and disability benefits, and the family maximum.
- **Taxes in the grid.** The 81-pair ranking uses benefits before income tax. The tax panel is a separate single-year estimate.
- **Solvency reduction.** A single percentage applied from a single start year. Possible legislative changes are not modeled.
- **Tax snapshot.** One year only. 2027 federal tables applied in today's dollars to a future year. No state income tax, no Medicare IRMAA surcharges, no Married Filing Separately, no itemized deductions.
- **Investment return.** A constant real return every year, with no volatility or sequence-of-returns effects.
- **Inflation.** One rate is used for both the Social Security COLA and general inflation. Wage growth before age 60 is not projected (SSA statement convention).

---

## 12. Where the calculations run

- All calculations run in the browser on the user's device. The app doesn't send entered names, earnings, balances or other inputs to a server.
- When the page loads, it fetches the Tailwind CSS script from `cdn.tailwindcss.com`. The page's HTML also declares an import map pointing to `esm.sh` for React, Recharts and Lucide. In the production build (`npm run build`), those libraries are bundled into the app's own JavaScript file, so the import map isn't expected to be used.
- The hosting provider and the CDN receive ordinary web requests (for example IP address and browser type), as with any website.
- The tool doesn't save inputs between sessions.

---

## 13. Statutory and regulatory references

Citations were checked on 2026-11-14 against SSA's Social Security Act pages, Cornell LII (CFR text), SSA POMS and irs.gov, including the text of Rev. Proc. 2026-35 and IRS Notice 2026-66.

| Topic | Law | Regulation | SSA / IRS guidance |
|---|---|---|---|
| AIME and PIA computation, dime truncation | Social Security Act §215(a)(1)(A), §215(b) | 20 CFR 404.210–404.212 | POMS RS 00605.015 |
| COLA increases to the PIA | Social Security Act §215(i) | — | SSA COLA series (section 2) |
| Full retirement age | — | 20 CFR 404.409 | POMS RS 00615.003 |
| Reduction for early entitlement | Social Security Act §202(q) | 20 CFR 404.410 | — |
| Delayed retirement credits (2/3 of 1% per month for eligibility after 2004) | Social Security Act §202 | 20 CFR 404.313 | — |
| Spousal benefits | Social Security Act §202 | 20 CFR 404.330 | — |
| Deemed filing | Bipartisan Budget Act of 2015 | 20 CFR 404.623 | POMS GN 00204.035 |
| Widow(er) benefits and age reduction | Social Security Act §202 | 20 CFR 404.335 | POMS RS 00615.301 |
| Widow(er)'s limit (82.5% of PIA) | Social Security Act §202 | — | POMS RS 00615.320 |
| Taxation of Social Security benefits | Internal Revenue Code §86 | — | IRS Publication 915 |
| Required minimum distributions, Uniform Lifetime Table, QCDs | Internal Revenue Code §401(a)(9); SECURE 2.0 Act of 2022 | — | IRS Publication 590-B |
| 2027 brackets, standard deduction, 65+ additional deduction | — | Rev. Proc. 2026-35 | IRS release (section 2) |
| 2027 QCD limit | Internal Revenue Code §408(d)(8) | IRS Notice 2026-66 | — |
| Senior deduction (2025–2028) | One Big Beautiful Bill Act (2025) | — | IRS release (section 2) |


---

## 14. Disclosure

The Social Security Optimizer is an illustrative planning model. Its results depend on the assumptions entered (earnings or PIA, life expectancy, inflation, investment return and the optional solvency reduction) and on the simplifications listed in section 11. Actual benefits are determined by the Social Security Administration based on the worker's full earnings record and the law in effect at the time. Tax estimates use current federal tables and are not a tax filing or tax advice. Verify each client's earnings record and PIA on their SSA statement (my Social Security) before acting on any result.

---

## Keeping this document current

| When this changes | Update these sections |
|---|---|
| `npm run update-ssa` brings in a new bend point, AWI, wage cap or COLA year | 2 (vintages), 3.2 (latest bend point year), 3.3 (COLA example if needed), and the bend point note in section 8 if it changes |
| A new Trustees Report is published (`statutoryTables.ts`) | 2, 7.3, 10 (defaults) |
| New IRS inflation adjustments (`statutoryTables.ts`, `TAX_TABLE_YEAR`) | 2, 9.3 (QCD cap), 9.5, and the tax cases in `ss_golden_vectors.json` |
| Inputs, defaults or presets change in `App.tsx` / `constants.ts` | 8.5, 10 |
| Engine rules change in `services/engine.ts` | 3–7, 11, and the corresponding golden vectors |
