# Work Order: Replace the Two Divergent Docs with One Calculation Reference and a Presentation Outline

**Status:** Completed
**Handoff type:** Clean agent session (no memory of prior conversation). This document is self-contained — read fully before editing.
**Created:** 2026-11-14
**Completed:** 2026-11-14
**Owner context:** Chad is giving these docs to his financial advisor, who is starting to use the tool with clients. The docs exist to **show the calculation basis**: what the tool computes, from which published sources, and with which simplifications. They are not marketing, not a compliance attestation, and not advice. Chad will later ask Claude (possibly Claude Design) to build a short slide presentation, so this work order produces two coordinated files: a complete text reference, and a slide-by-slide outline drawn only from the reference. The two current files in `docs/` were meant to be exactly that pair, but they drifted into two overlapping, inconsistent long documents.

---

## What Already Exists — Read Before Re-deriving

**Current docs (to be replaced):**
- `docs/COMPLIANCE_AND_CALCULATION_REFERENCE.md` (396 lines) and `docs/social_security_compliance_and_calculation_guide.md` (307 lines). About 80% overlap. Both use LaTeX, "slide" headings and promotional language.

**Audit of the current docs (2026-11-14). Every item must be resolved in the new docs:**
- *Overclaims:* "guarantees full compliance with Regulation S-P and GLBA"; "NO EXTERNAL API CALLS" (false: `index.html` loads Tailwind from cdn.tailwindcss.com and React/Recharts/Lucide from esm.sh at runtime; client inputs are not sent anywhere); "without approximation shortcuts"; "actuarially sound"; "institutional-grade"; "delaying definitively pays off"; "100% client-side … zero PII ever transmitted".
- *Fabricated example:* doc 2's heatmap shows a monotone grid with 70/70 optimal. With default inputs the real optimum is 69/62 (married) or 62/69 (single). The "typically $200,000 to $600,000+" spread is unsupported.
- *Factual errors:* 2025 standard deduction $15,000/$30,000 (pre-OBBBA); 83% "matches current Trustees estimates" (2024 report); deemed filing cited as 20 C.F.R. § 404.409 (that's the FRA section; deemed filing is § 404.623) and POMS GN 00204.030 (likely GN 00204.035); "Treas. Reg. § 1.86-1" couldn't be confirmed; the tax widget is said to show Gross RMD / Total SS / Standard Deduction (it doesn't, until the engine work order adds them); simulation "to age 100" (it runs until both die, life expectancy up to 120); heatmap "9-tier … emerald" (it's a continuous 5-stop red-to-green ramp); Partner A other income default "$36k" (it's $41k); birth year "1900" min; Advisor Presets and the Reset button are undocumented.
- *Described as implemented but simplified:* FRA, bend point vintage, pre-1987 indexing, spousal timing, survivor rules, haircut timing, dollar basis. The engine work order fixes most of these. Whatever remains simplified after it goes in the Limitations section.

**Correct content worth keeping** (re-verify against the post-fix code, don't copy blindly): reduction/DRC factors and the claim-age table; spousal 25/36% and 32.5%-at-62; the taxable SS formula and thresholds; ULT 24.6 at 75; balance projection formula; PIA tiers and dime truncation.

**Sources of truth, in priority order:** (1) the code after the engine work order (`services/engine.ts`, `constants.ts`, `App.tsx`); (2) `tests/fixtures/ss_golden_vectors.json` for worked examples; (3) primary sources (ssa.gov/OACT, POMS at secure.ssa.gov, eCFR, IRS Rev. Procs and Publications 915 / 590-B).

---

## The Actual Task

**Goal:** Produce `docs/CALCULATION_REFERENCE.md` (complete, plain-language, verifiable) and `docs/PRESENTATION_OUTLINE.md` (slide content for a later design pass), delete the two old files, and make sure every number and citation traces to code, a test vector, or a primary source.

### Lane 1 — Language and format rules (apply to both files)
- [ ] **Purpose statement up front, verbatim in spirit:** "This document describes how the Social Security Optimizer calculates its results: the formulas, the published data they use, and the simplifications the model makes. It is not an official SSA or IRS determination, and it is not financial, tax or legal advice."
- [ ] **Banned terms** (in claims about the tool or its results). Rephrase descriptively: guarantee/guaranteed/guarantees, ensure(s) compliance, compliant / full compliance, certified, exact/exactly, precise/high-precision, definitive/definitively, actuarially sound, institutional-grade, fiduciary-grade, without approximation, complete/comprehensive (about coverage), always/never (about tool behavior), 100%, zero (as in "zero risk/zero PII"), optimal (in prose use "highest-value strategy under the entered assumptions"; the UI label "Optimal" may be quoted as a label). Statements of law may say "must"/"never" where the statute does ("No delayed retirement credits accrue after age 70" is fine).
- [ ] **Regulatory framing:** no conclusions about GLBA, Regulation S-P, FINRA, the SEC Marketing Rule, ERISA or fiduciary status. Describe facts only (what runs where, what is loaded from where).
- [ ] **No LaTeX** (AGENTS.md rule; also not rendered by most viewers). Formulas in plain text or code blocks using `x`, `/`, `min()`, `max()`, `<=`, `>=`.
- [ ] Call things by their UI labels. Use "Partner A / Partner B".
- [ ] Every example number must either come from a golden-vector case (cite its id) or from an actual engine run with all inputs listed. No invented numbers.

### Lane 2 — `docs/CALCULATION_REFERENCE.md` (the complete text)
Required sections, in this order. Numbered so the outline can point at them:
- [ ] **1. Purpose and scope.** The purpose statement; who it's for (advisors and clients reviewing the calculation basis); supported birth years (per engine Lane E1); what the tool does not model (pointer to section 11).
- [ ] **2. Data sources and vintages.** Table built from `constants.ts`: bend point years available and latest; AWI series range; tax max range; Trustees Report year, depletion year and payable % used for the haircut default; tax table year; QCD limit year. Each row gets a URL and the "auto-refreshed on" date from the constants header. Explain how `npm run update-ssa` refreshes SSA data and that tax tables are updated by hand.
- [ ] **3. Primary Insurance Amount.** Three input modes (Manual PIA, Manual AIME, Earnings). Earnings indexing (cap → index to age-60 year → nominal at/after 60 → top 35 / 420 → floor), the bend point vintage rule (eligibility year; latest vintage for future eligibility, the SSA-statement convention), the three tiers, dime truncation. Worked example from a golden vector. Note that Manual PIA should be the figure from the client's SSA statement (my Social Security).
- [ ] **4. Claim-age adjustments.** FRA by birth year table; reduction and DRC rates; claim-age table for FRA 67 and one for FRA 66y8m (from vectors 1–2); note integer claim ages.
- [ ] **5. Spousal benefits.** Excess formula; deemed filing; start in the year both have filed; reduction based on age at spousal start (worked example = vector 8).
- [ ] **6. Survivor benefits.** Base benefit rules (claimed / died before claiming), survivor FRA and early reduction, RIB-LIM 82.5% floor, start-year simplification (worked example = vector 9). Explain in plain words why delaying the higher earner's claim raises the survivor benefit (describe it; don't sell it).
- [ ] **7. Household simulation.** Annual steps; survival test (`age <= life expectancy` = paid for the full year of the entered age); end when both have died; Today's vs Future dollars (Future = COLA from the current year; Today's = 0% COLA with real return); solvency haircut from start year; reinvestment formula.
- [ ] **8. Strategy grid and charts.** 81 pairs; ranking = cumulative value at the end of the simulation, which (since every pair ends in the same year) ranks the same as present value at the entered return; Spread vs Total views; the color ramp; presets (heatmap: Optimal / FRA 67/67 / Early 62/62; sidebar: Balanced / Asymmetric / Longevity; Reset). Break-even chart: say plainly that the crossover includes investment returns on benefits received, so it differs from a simple undiscounted break-even, and that it depends on the entered return and life expectancies. Scorecard tiles, including the Married/Unmarried comparison. Describe that comparison neutrally, as how the rules differ by marital status, not as a recommendation about marriage.
- [ ] **9. Age-75 tax snapshot.** Snapshot year rule; balance projection formula; RMD age and ULT divisors; QCD and its cap; provisional income (including tax-exempt interest); taxable SS tiers (vectors 12–14); standard deduction including the 65+ addition (and senior deduction if within 2025–2028); brackets by `TAX_TABLE_YEAR`; effective and marginal rate. State that the marginal bracket shown is the statutory bracket, not the higher effective marginal rate created when added income also makes more SS taxable. State that the Single comparison means two unmarried individuals; Married Filing Separately isn't modeled. Note that future-year tax law is unknown and the snapshot applies the current table year.
- [ ] **10. Inputs reference.** One table: label, unit, range, default, what it affects. **Generate it by reading `App.tsx` and `constants.ts`. Do not copy from the old docs.**
- [ ] **11. Model limitations and simplifications.** A complete, plain list, at minimum: annual (not monthly) steps and integer claim ages; deterministic life expectancy (no mortality probabilities); survivor benefit starts at the later of the first death and the survivor's selected claim age (no separate survivor-first / own-later search); earnings test not modeled; marriage duration requirements (9 months survivor / 1 year spousal) not modeled; divorced-spouse, child and disability benefits not modeled; no income taxes inside the optimizer (the tax snapshot is separate and single-year); the haircut is a flat cut from a single start year; tax snapshot uses current tax tables for a future year; state income tax not modeled; Medicare IRMAA not modeled; anything else that is still simplified after the engine work order (read its Resolution section).
- [ ] **12. Where the calculations run.** Factual only: calculations run in the browser; the app doesn't send entered data to any server; on load the page fetches libraries from cdn.tailwindcss.com and esm.sh (list from `index.html`); the hosting provider sees ordinary page requests. No regulatory conclusions.
- [ ] **13. Statutory and regulatory references.** Table: topic → Social Security Act / IRC section → CFR → POMS / IRS publication. **Open each citation at its primary source and confirm it covers the topic** (eCFR, secure.ssa.gov/poms, ssa.gov/OP_Home/ssact, law.cornell.edu, irs.gov). Remove any citation you can't confirm rather than guessing. Known to check: deemed filing (20 CFR 404.623; POMS GN 00204.035), the POMS RS numbers for AIME/bend points/reduction, survivor reduction and RIB-LIM (POMS RS 00615.320-series), survivor FRA.
- [ ] **14. Disclosure.** Short, descriptive: illustrative model; results depend on the entered assumptions; actual benefits are determined by SSA; verify earnings records with the client's SSA statement (my Social Security) before acting.

### Lane 3 — `docs/PRESENTATION_OUTLINE.md` (input for a later design pass)
- [ ] 10–12 slides. Each slide has: **Title** (≤ 8 words), **Key message** (one sentence), **Bullets** (≤ 4, ≤ 12 words each), **Visual suggestion** (e.g. "claim-age table", "heatmap screenshot with default inputs", "simple timeline diagram"), **Speaker notes** (2–4 sentences), **Source** (section number(s) in `CALCULATION_REFERENCE.md`).
- [ ] No fact, number or claim may appear in the outline unless it is in the reference. The outline is a summary, not a second source.
- [ ] Suggested arc: what the tool does → data sources → PIA → claim-age adjustments → spousal → survivor → how the 81-pair grid ranks strategies → reading the break-even chart → age-75 tax snapshot → limitations (its own slide, not tucked away) → disclosure.
- [ ] Top-of-file note for the design agent: "Keep the language descriptive. Do not add claims, statistics or regulatory statements that aren't in the bullets. The limitations slide must be kept."

### Lane 4 — Cleanup and cross-links
- [ ] `git rm` the two old docs (history keeps them).
- [ ] Update `README.md` doc links and `AGENTS.md` (the Architecture section mentions the docs indirectly; make sure tax max / bend point figures are current or reference `constants.ts` instead of restating numbers).
- [ ] Add a short "Keeping the docs current" note at the end of the reference: which sections must change when `constants.ts` is regenerated or tax tables are updated.

---

## Verification Plan

### Automated checks
- Banned-term scan (the expected result is zero matches in claims about the tool; review any hits by hand):
  `rg -n -i "guarantee|ensures? compliance|compliant|full compliance|certified|\bexact(ly)?\b|high-precision|definitive|actuarially sound|institutional|fiduciary-grade|without approximation|100%|zero pii" "D:\Antigravity Projects\Social Security Optimizer\docs"`
- No LaTeX: `rg -n -F "$$" docs/` and `rg -n "\\\\(text|frac|times|le|ge|rightarrow)\b" docs/` → no matches.
- `npm --prefix "D:\Antigravity Projects\Social Security Optimizer" test` still passes (docs-only change, but confirms the vectors cited are current).

### Manual verification
- Build a **claims table** in the Resolution section: every number in the reference (constants, defaults, ranges, worked-example values) → where it was verified (file:line, vector id, or URL). Spot-check at least the inputs table against `App.tsx` line by line.
- Read the outline against the reference: every bullet maps to a cited section.
- Optional: render both files in VS Code preview to confirm tables and code blocks display correctly.

---

## What NOT to Do

- Do not describe engine behavior that the engine work order didn't actually deliver. Read its Resolution section and the code. If something is still simplified, it goes in section 11.
- Do not keep two long documents. One reference plus one outline.
- Do not build the slide deck itself (no .pptx, no HTML deck). Chad will request that separately.
- Do not add marketing copy, competitive comparisons or claims about client outcomes.
- Do not include Chad's or Stephanie's personal data or the Finance Tracker's figures.
- Per AGENTS.md: commit and push to `origin main` when done; no LaTeX in chat or docs; use `git -C`, never `cd && …`.

---

## Resolution & Commit Log (Fill when complete)

- **Completed Date:** 2026-11-14
- **Verification Summary:**
  - Banned-term scan on both new docs: the only remaining hits are quoted UI labels ("Optimal Strategy", "Gap to Optimal", the Optimal button) and a slider range ("50%–100%"). Two prose hits were rephrased: "never start before age 60" and "lives exactly". LaTeX scan: none in the new docs (all LaTeX was in the two deleted files).
  - `npm test`: 22/22 pass. Every worked example in the reference cites a golden-vector case id.
  - Claims table:

    | Claim in reference | Verified against |
    |---|---|
    | Bend points 1979–2027, latest $1,340 / $8,077; AWI 1951–2025 ($72,800.33); wage caps 1951–2027 ($192,300); refresh date | `constants.ts` header and series (regenerated 2026-11-14) |
    | FRA and survivor FRA tables; 28.5% survivor reduction; 82.5% RIB-LIM; DRC 2/3% | `statutoryTables.ts`; POMS RS 00615.003, RS 00615.301, RS 00615.320 |
    | Trustees: OASI 2032 / 78%, OASDI 2034 / 83%; default start 2033 | `statutoryTables.ts`; 2026 Trustees Report coverage (SSA release URL returns 403 to automated fetch; figures from search results citing it) |
    | 2027 brackets, standard deduction $16,600 / $33,200 | IRS newsroom release for Rev. Proc. 2026-35 (fetched) |
    | 65+ additional $2,100 / $1,700; QCD limit $114,000 | Published summaries of Rev. Proc. 2026-35 (not the Rev. Proc. text); flagged in reference section 13 |
    | Senior deduction $6,000, 2025–2028, 6% over $75k / $150k | irs.gov OBBBA release (search result) |
    | ULT 24.6 at 75; RMD age 73; QCDs count toward RMD | IRS Pub 590-B (fetched) |
    | IRC 86 thresholds; tax-exempt interest in provisional income | IRS Pub 915 (fetched); `services/engine.ts` |
    | Inputs table (ranges, defaults, presets, reset scope) | `App.tsx` lines for state defaults, sliders, setters, `handleApplyPreset`, `handleResetDefaults` |
    | Default grid result 62/69, spread about $791k | Engine run with default inputs (WO engine_statutory_accuracy before/after table) |
    | Heatmap: "Base" label, 5-stop red→green ramp, preset buttons | `StrategyHeatmap.tsx`, `theme.ts` |
    | Scorecard thresholds ($1,000) and alert logic | `App.tsx` (`betterStrategyAvailable`, gap display) |
    | Section 12: only Tailwind fetched from CDN; esm.sh import map unused in build; no storage | `dist/index.html`, built JS (no esm.sh references), grep for localStorage/sessionStorage/indexedDB/fetch (none) |

  - Citations confirmed: 20 CFR 404.210–212, 404.313, 404.330, 404.335, 404.409 (FRA, which the old docs mislabeled as deemed filing), 404.410, 404.623 (deemed filing) via Cornell LII. POMS GN 00204.035 (deemed filing), RS 00605.015, RS 00615.003, RS 00615.301, RS 00615.320 via secure.ssa.gov. SSA Act §215(a)(1)(A) (dime truncation text), §215(b) (AIME heading), and §202 (82.5% limit text, delayed credit 2/3 of 1% text, and the "after application of subsection (q)" reduction reference) via ssa.gov.
  - Citations removed or reduced to section level: "Treas. Reg. § 1.86-1" (couldn't confirm); POMS RS 00605.021, RS 00615.010, RS 00615.690, RS 00202.001, RS 00207.001 (not confirmed; replaced by confirmed CFR/POMS); "BBA 2015 § 831" became "Bipartisan Budget Act of 2015" (section number not confirmed); SSA Act §202(b)/(c)/(e)/(f)/(w) and §216(l) reduced to "§202" / CFR citations, because confirming subsection letters needed a fetch method that wasn't permitted in this session. "P.L. 119-21" became the law's name.
- **Commit Hash:** `15a97c3` — `docs: replace divergent docs with calculation reference and presentation outline`
- **Notes for Next Agent:**
  - Presentation author: use `docs/PRESENTATION_OUTLINE.md`. Each slide cites reference sections. Slide 11 (limitations) must stay. Screenshots should use default inputs (slide 8 quotes the default-input result).
  - Follow-ups: (1) confirm the QCD limit and 65+ additional deduction against the Rev. Proc. 2026-35 text; (2) optionally confirm SSA Act subsection letters by hand and restore paragraph-level Act citations; (3) the chart label "Both at FRA (67)" is FRA only for births 1960+; consider relabeling it "Both at 67" in `App.tsx`; (4) the header badge tooltip still says "Official published SSA constants", which is fine as a data-source label but could read "Published SSA data".
