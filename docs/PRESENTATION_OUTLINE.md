# Social Security Optimizer — Presentation Outline

*Applies to version 3.1 (3.1.0), November 2026. Drawn from `CALCULATION_REFERENCE.md` for the same version.*

> **For the design agent:** this outline is the content source for a short slide presentation. Keep the language descriptive. Do not add claims, statistics or regulatory statements that aren't in the bullets or speaker notes. Every slide cites a section of `CALCULATION_REFERENCE.md`; check facts there. The limitations slide (slide 11) must be kept. Suggested visuals are optional; screenshots must not show the app's sample inputs or results from them (they are placeholders); use hypothetical or client figures. The deck also carries a second part, Calculation Detail, drawn from §3–14 of the reference.

Audience: financial advisors and their clients reviewing how the tool calculates results.

---

## Slide 1 — What the tool does

- **Key message:** The tool compares Social Security claiming ages for a two-person household under the entered assumptions.
- **Bullets:**
  - Projects benefits for all 81 claim-age pairs (62–70 each)
  - Includes spousal and survivor benefits for married couples
  - Ranks pairs by reinvested lifetime value
  - Adds a one-year federal tax estimate with RMDs
- **Visual suggestion:** Screenshot of the app's main page with default inputs.
- **Speaker notes:** The tool is a calculation model, not an SSA determination or advice. It shows how claiming choices compare for the inputs entered, so results change whenever the inputs change. The following slides walk through each calculation step.
- **Source:** §1

## Slide 2 — Where the numbers come from

- **Key message:** Statutory figures come from published SSA and IRS tables, each with a stated year.
- **Bullets:**
  - SSA bend points through 2027; wage index through 2025
  - SSA wage caps 1951–2027; COLAs 1975–2026
  - 2026 Trustees Report for the optional solvency reduction
  - IRS 2027 tax tables (Rev. Proc. 2026-35)
- **Visual suggestion:** Simple table of data source, latest year, and link.
- **Speaker notes:** SSA data is refreshed with a script that downloads the official tables and checks them before updating the app. Tax and solvency tables are updated by hand, with the source noted next to each one. The reference document lists every source.
- **Source:** §2

## Slide 3 — Primary Insurance Amount (PIA)

- **Key message:** The PIA is the monthly benefit at full retirement age, entered directly or computed from earnings.
- **Bullets:**
  - Enter PIA, AIME, or year-by-year earnings
  - Earnings indexed to age-60 wage level, top 35 years
  - 90% / 32% / 15% formula, eligibility-year bend points
  - COLAs since 62 added for clients past 62
- **Visual suggestion:** Three-tier bar showing the 90/32/15 bend-point formula.
- **Speaker notes:** Example: an AIME of $10,000 with 2027 bend points gives a PIA of $3,650.20. For clients already past 62, the tool adds the published COLAs since their eligibility year, so the PIA is in today's dollars; a PIA from the client's SSA statement already includes them.
- **Source:** §3

## Slide 3b — The PIA formula as a curve

- **Key message:** Drawn as PIA against AIME, the formula is three straight segments that flatten at each bend point.
- **Bullets:**
  - Slopes of 90%, 32% and 15%
  - Bends at the eligibility-year bend points
  - Example: AIME $10,000 → PIA $3,650.20
- **Visual suggestion:** Line chart of monthly PIA (y) against AIME (x), with the bend points and the example marked.
- **Speaker notes:** The same formula as slide 3. Each extra dollar of AIME adds 90 cents of monthly PIA up to the first bend point, 32 cents up to the second, and 15 cents above it. Bend points change each year with the wage index.
- **Source:** §3.2

## Slide 4 — Claiming early or late

- **Key message:** Each month before or after full retirement age changes the benefit by a fixed statutory rate.
- **Bullets:**
  - Full retirement age 66–67, depending on birth year
  - Early: 5/9% per month for 36 months, then 5/12%
  - Late: 2/3% per month (8% per year) to 70
  - FRA 67: 70% of PIA at 62, 124% at 70
- **Visual suggestion:** Claim-age table (62–70) for a $3,000 PIA.
- **Speaker notes:** For someone born in 1960 or later, a $3,000 PIA becomes $2,100 at 62 and $3,720 at 70. For someone born in 1958, full retirement age is 66 and 8 months, so claiming at 67 already earns four months of credits.
- **Source:** §4

## Slide 5 — Spousal benefits

- **Key message:** A spouse can receive up to half of the other spouse's PIA, minus their own PIA, once both have filed.
- **Bullets:**
  - Excess = 50% of other's PIA − own PIA
  - Payable only after both partners file
  - Reduction based on age when it starts
  - Delayed credits don't increase the spousal amount
- **Visual suggestion:** Timeline: lower earner files at 62, higher earner files at 70, spousal excess begins.
- **Speaker notes:** Example: the lower earner (PIA $1,000) files at 62 and receives $700. When the higher earner (PIA $4,000) files at 70, the $1,000 spousal excess starts without reduction, for a total of $1,700.
- **Source:** §5

## Slide 6 — Survivor benefits

- **Key message:** After the first death, the survivor keeps the larger of the two benefits, subject to statutory adjustments.
- **Bullets:**
  - Based on the deceased's benefit, including delayed credits
  - Floor of 82.5% of PIA if deceased claimed early
  - Delaying the higher earner raises the survivor amount
  - Starts 60 to survivor FRA (reduced if early), chosen by value
- **Visual suggestion:** Two-bar comparison: survivor benefit when the higher earner claimed at 62 vs. at 70.
- **Speaker notes:** If the higher earner claimed at 70 with a $3,000 PIA, the survivor can receive $3,720. If the higher earner claimed early and died young, the survivor's amount is limited but can't fall below 82.5% of the deceased's PIA. A survivor can start a reduced survivor benefit as early as 60 or wait for a larger one; the tool picks the start age worth the most for the entered life expectancy and return.
- **Source:** §6

## Slide 7 — How the projection works

- **Key message:** Benefits are projected year by year and reinvested at the entered return until both partners have died.
- **Bullets:**
  - Annual steps; each partner lives to the entered age
  - Today's dollars or future dollars with COLA
  - Optional solvency reduction from a start year
  - Value = benefits received plus investment growth
- **Visual suggestion:** Simple timeline: age 62 → claims → first death → second death.
- **Speaker notes:** The optional solvency setting defaults to the 2026 Trustees Report projection for the retirement fund: a 22% benefit cut (78% payable) from 2033. The panel shows that projection at all times and applies the cut only from the start year onward.
- **Source:** §7

## Slide 8 — Reading the 81-pair grid

- **Key message:** The grid shows the projected lifetime value of every claim-age pair, so tradeoffs are visible at a glance.
- **Bullets:**
  - Columns: Partner A ages; rows: Partner B ages
  - ★ marks the highest-value pair for these inputs
  - "Spread" shows value above the lowest pair
  - Click any cell to update the whole page
- **Visual suggestion:** Heatmap layout with ★ and Base explained (no sample-input results).
- **Speaker notes:** The ★ cell is the highest-value pair and the "Base" cell the lowest for the inputs entered; the spread is the gap between them. Life expectancies, returns and marital status can all change which pair is best and how large the spread is. Do not show results from the app's sample inputs; use a hypothetical or the client's own figures.
- **Source:** §8.1

## Slide 9 — Reading the break-even chart

- **Key message:** The break-even chart shows when a strategy's cumulative value catches up with claiming at 62.
- **Bullets:**
  - Lines show value minus "both claim at 62"
  - Crossing $0 marks the catch-up age
  - Includes investment growth on benefits received
  - Moves with the entered return and life expectancies
- **Visual suggestion:** Break-even chart screenshot highlighting the $0 line crossing.
- **Speaker notes:** Because returns on early benefits are counted, this catch-up age comes later than a simple break-even that ignores investment growth when the assumed return is positive. A higher assumed return pushes it later.
- **Source:** §8.2

## Slide 10 — Tax snapshot with RMDs

- **Key message:** A one-year estimate shows how RMDs, other income and Social Security combine for federal tax.
- **Bullets:**
  - Snapshot in the year the older partner turns 75
  - Up to 85% of Social Security can be taxable
  - Compares joint filing with two Single returns
  - Uses 2027 IRS tables as a stand-in
- **Visual suggestion:** Screenshot of the tax panel showing each calculation row.
- **Speaker notes:** RMDs and other income raise provisional income, which determines how much Social Security is taxable. QCDs reduce the taxable RMD. The Social Security amount taxed comes from the currently selected claim-age pair. Future tax law is unknown, so the estimate applies current tables in today's dollars.
- **Source:** §9

## Slide 11 — Limitations

- **Key message:** The model simplifies some rules; results are estimates for the entered assumptions.
- **Bullets:**
  - Annual steps, whole-year claim ages, fixed lifespans
  - Projection stops at the older partner's age 120
  - No earnings test or divorced-spouse benefits
  - Grid ranking ignores income taxes
  - Single-year tax estimate; no state tax
- **Visual suggestion:** Plain text list; no graphics needed.
- **Speaker notes:** The reference document lists every simplification. The most important for planning is the fixed life expectancy: it drives both the claim-age ranking and when a survivor benefit is started, so it's worth testing several life expectancy assumptions before drawing conclusions.
- **Source:** §11

## Slide 12 — Data handling and disclosure

- **Key message:** Calculations run in the browser, and results should be checked against the client's SSA record.
- **Bullets:**
  - Inputs stay in the browser; not sent to a server
  - Not an SSA or IRS determination
  - Results depend on entered assumptions
  - Verify PIA on the client's SSA statement
- **Visual suggestion:** None.
- **Speaker notes:** The page loads one styling script from a public CDN; client inputs aren't transmitted. Actual benefits are set by SSA from the full earnings record and the law at the time of claiming.
- **Source:** §12, §14
