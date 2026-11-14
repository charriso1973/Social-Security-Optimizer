import { BEND_POINTS_SERIES, DATA_AWI_SERIES, STATUTORY_BEND_POINT_YEAR, TAX_MAX_SERIES } from '../constants';
import {
  fraMonths, survivorFraMonths, SURVIVOR_MAX_REDUCTION, SURVIVOR_MIN_AGE, RIB_LIM_FLOOR,
  DRC_MONTHLY_RATE, DRC_MAX_AGE, BRACKETS_SINGLE, BRACKETS_MARRIED, STD_DED_SINGLE, STD_DED_MARRIED,
  ADDL_STD_DED_65_SINGLE, ADDL_STD_DED_65_MARRIED, SENIOR_DEDUCTION, SS_TAX_THRESHOLDS,
} from '../statutoryTables';
import { EarningsRecord, PersonProfile, SimulationYear, StrategySummary, GridResult, TaxResult } from '../types';

// The calendar year treated as "today". Manual PIAs (from an SSA statement) and
// statement-convention computed PIAs are in this year's dollars, so Future-dollar
// mode applies COLA from here. Tests pass an explicit year instead.
export const CURRENT_YEAR = new Date().getFullYear();

// --- PIA Calculation ---

export const parseEarningsCSV = (csv: string): EarningsRecord[] => {
  return csv.split('\n')
    .map(line => {
      const parts = line.split(',');
      if (parts.length < 2) return null;
      const year = parseInt(parts[0].trim());
      const amount = parseFloat(parts[1].trim());
      if (isNaN(year) || isNaN(amount)) return null;
      return { year, amount };
    })
    .filter((r): r is EarningsRecord => r !== null)
    .sort((a, b) => b.year - a.year);
};

// Bend points for a worker: those of the eligibility year (the year they turn
// 62). If that year is after the latest published year, use the latest
// published bend points, paired with indexing at the latest AWI year (the SSA
// statement convention, which keeps the result in today's wage level).
export const getBendPoints = (birthYear: number): { bp1: number, bp2: number, year: number } => {
  const years = Object.keys(BEND_POINTS_SERIES).map(Number);
  const year = Math.max(Math.min(...years), Math.min(birthYear + 62, STATUTORY_BEND_POINT_YEAR));
  const [bp1, bp2] = BEND_POINTS_SERIES[year];
  return { bp1, bp2, year };
};

export const calculatePIAFromAIME = (aime: number, bendPoints: [number, number] = BEND_POINTS_SERIES[STATUTORY_BEND_POINT_YEAR]): number => {
  if (aime <= 0 || isNaN(aime)) return 0;
  const [bp1, bp2] = bendPoints;
  let pia = 0;
  // First Segment
  pia += 0.90 * Math.min(aime, bp1);

  // Second Segment
  if (aime > bp1) {
    pia += 0.32 * Math.min(aime - bp1, bp2 - bp1);
  }

  // Third Segment
  if (aime > bp2) {
    pia += 0.15 * (aime - bp2);
  }

  // Truncate to dime (round first to absorb floating-point noise like 3337.1999)
  return Math.floor(Math.round(pia * 1000) / 100) / 10;
};

export const piaFromAimeForBirthYear = (aime: number, birthYear: number): number => {
  const { bp1, bp2 } = getBendPoints(birthYear);
  return calculatePIAFromAIME(aime, [bp1, bp2]);
};

// Inverts the bend-point formula so a manually entered PIA can show an AIME.
export const estimateAIMEFromPIA = (pia: number, birthYear: number): number => {
  if (pia <= 0 || isNaN(pia)) return 0;
  const { bp1, bp2 } = getBendPoints(birthYear);
  const seg1Limit = 0.9 * bp1;
  const seg2Limit = seg1Limit + 0.32 * (bp2 - bp1);

  if (pia <= seg1Limit) {
      return Math.round(pia / 0.9);
  } else if (pia <= seg2Limit) {
      return Math.round(bp1 + (pia - seg1Limit) / 0.32);
  } else {
      return Math.round(bp2 + (pia - seg2Limit) / 0.15);
  }
};

export interface PIAResult {
  pia: number;
  aime: number;
  bendPointYear: number;
  indexingYear: number;
  warnings: string[];
}

export const calculatePIA = (birthYear: number, earnings: EarningsRecord[], currentYear: number = CURRENT_YEAR): PIAResult => {
  const warnings: string[] = [];

  // 1. Bend points and indexing year. The indexing year (age 60) is always two
  // years before the bend point year, so for future eligibility both freeze at
  // the latest published vintage.
  const { bp1, bp2, year: bendPointYear } = getBendPoints(birthYear);
  const indexingYear = bendPointYear - 2;
  const awiByYear = new Map(DATA_AWI_SERIES.map(d => [d.year, d.amount]));
  const latestAWIObj = DATA_AWI_SERIES[DATA_AWI_SERIES.length - 1];
  let indexYearAWI = awiByYear.get(indexingYear);
  if (indexYearAWI === undefined) {
    indexYearAWI = latestAWIObj.amount;
    warnings.push(`No AWI published for indexing year ${indexingYear}; used ${latestAWIObj.year}.`);
  }

  // 2. Index Earnings
  const capYears = Object.keys(TAX_MAX_SERIES).map(Number);
  const latestCapYear = Math.max(...capYears);
  const firstCapYear = Math.min(...capYears);
  const preCoverage: number[] = [];
  const pastCap: number[] = [];
  const noAWI: number[] = [];

  const indexedEarnings = earnings.flatMap(rec => {
    // Earnings before 1951 are outside the AIME computation period.
    if (rec.year < firstCapYear) { preCoverage.push(rec.year); return []; }
    if (rec.year > latestCapYear + 10) { pastCap.push(rec.year); return []; }

    let cap = TAX_MAX_SERIES[rec.year];
    if (cap === undefined) { cap = TAX_MAX_SERIES[latestCapYear]; pastCap.push(rec.year); }
    const cappedAmount = Math.min(rec.amount, cap);

    if (rec.year >= indexingYear) return [cappedAmount]; // At/after 60: nominal

    const recordYearAWI = awiByYear.get(rec.year);
    if (recordYearAWI === undefined) { noAWI.push(rec.year); return [cappedAmount]; }
    return [cappedAmount * (indexYearAWI! / recordYearAWI)];
  });

  if (preCoverage.length) warnings.push(`Earnings before ${firstCapYear} are not used (${preCoverage.join(', ')}).`);
  if (pastCap.length) warnings.push(`No published wage cap for ${pastCap.join(', ')}; used the ${latestCapYear} cap or excluded far-future years.`);
  if (noAWI.length) warnings.push(`No AWI for ${noAWI.join(', ')}; those years were not indexed.`);
  if (birthYear + 62 < currentYear) {
    warnings.push(`Computed PIA is in ${birthYear + 62} dollars; COLAs since age 62 are not applied. For clients already past 62, enter the PIA from their SSA statement.`);
  }

  // 3. Top 35 Years
  indexedEarnings.sort((a, b) => b - a);
  const top35 = indexedEarnings.slice(0, 35);
  while (top35.length < 35) top35.push(0);

  const totalLifetimeIndexedEarnings = top35.reduce((sum, val) => sum + val, 0);

  // 4. Calculate AIME
  const aime = Math.floor(totalLifetimeIndexedEarnings / 420); // 35 years * 12 months

  // 5. Calculate PIA using shared logic
  const pia = calculatePIAFromAIME(aime, [bp1, bp2]);

  return { pia, aime, bendPointYear, indexingYear, warnings };
};

// --- Benefit Adjustment ---

// Own-benefit multiplier for an integer claim age. Months are measured against
// the birth-year FRA: 5/9 of 1% per month for the first 36 early months, 5/12 of
// 1% beyond; 2/3 of 1% per month of delay up to age 70.
export const benefitAdjustmentFactor = (claimAge: number, birthYear: number): number => {
  const monthsFromFRA = claimAge * 12 - fraMonths(birthYear);
  if (monthsFromFRA < 0) {
    const monthsEarly = -monthsFromFRA;
    const first36 = Math.min(monthsEarly, 36);
    const remaining = Math.max(0, monthsEarly - 36);
    return 1 - (first36 * (5 / 900)) - (remaining * (5 / 1200));
  }
  const creditMonths = Math.min(monthsFromFRA, DRC_MAX_AGE * 12 - fraMonths(birthYear));
  return 1 + Math.max(0, creditMonths) * DRC_MONTHLY_RATE;
};

// Spousal excess multiplier, based on the recipient's age when the spousal
// benefit starts: 25/36 of 1% per month for the first 36 early months, 5/12 of
// 1% beyond. Spousal benefits earn no delayed credits.
export const spousalReductionFactor = (startAge: number, birthYear: number): number => {
  const monthsEarly = Math.max(0, fraMonths(birthYear) - startAge * 12);
  const first36 = Math.min(monthsEarly, 36);
  const rem = Math.max(0, monthsEarly - 36);
  return Math.max(0, 1 - (first36 * (25 / 3600)) - (rem * (5 / 1200)));
};

// Widow(er) multiplier for the age survivor benefits start: 28.5% at age 60,
// prorated to zero at the survivor FRA.
export const survivorReductionFactor = (startAge: number, birthYear: number): number => {
  const fra = survivorFraMonths(birthYear);
  const monthsEarly = Math.max(0, fra - Math.max(startAge, SURVIVOR_MIN_AGE) * 12);
  return 1 - SURVIVOR_MAX_REDUCTION * monthsEarly / (fra - SURVIVOR_MIN_AGE * 12);
};

// --- Simulation Loop ---

export interface SimulationOptions {
  // First calendar year the solvency factor applies. Omit to apply it to every year.
  solvencyStartYear?: number;
  // Year whose dollars PIAs are expressed in; COLA compounds from here.
  currentYear?: number;
}

interface Claimant {
  birthYear: number;
  pia: number;
  lifeExpectancy: number;
  claimAge: number;
  fra: number;          // months
  ownBenefit: number;   // monthly, floored, before COLA
}

const makeClaimant = (p: PersonProfile, claimAge: number, safePia: number): Claimant => ({
  birthYear: p.birthYear,
  pia: safePia,
  lifeExpectancy: p.lifeExpectancy,
  claimAge,
  fra: fraMonths(p.birthYear),
  ownBenefit: Math.floor(safePia * benefitAdjustmentFactor(claimAge, p.birthYear)),
});

// Spousal excess for x while both are alive. Under deemed filing it starts in
// the first year both have filed: x's own claim age, or x's age in the year y
// files, whichever is later.
const spousalFor = (x: Claimant, y: Claimant) => {
  const excess = Math.max(0, 0.5 * y.pia - x.pia);
  const startAge = Math.max(x.claimAge, y.birthYear + y.claimAge - x.birthYear);
  return { startAge, amount: Math.floor(excess * spousalReductionFactor(startAge, x.birthYear)) };
};

// Survivor benefit for x after y dies (y is alive through age y.lifeExpectancy).
const survivorFor = (x: Claimant, y: Claimant) => {
  const yClaimed = y.claimAge <= y.lifeExpectancy;
  let base: number;
  let ribLimCap = Infinity;
  if (yClaimed) {
    if (y.claimAge * 12 > y.fra) {
      base = y.ownBenefit; // includes delayed retirement credits
    } else {
      base = y.pia;
      if (y.claimAge * 12 < y.fra) {
        // RIB-LIM: deceased claimed early
        ribLimCap = Math.max(y.ownBenefit, Math.floor(RIB_LIM_FLOOR * y.pia * 10) / 10);
      }
    }
  } else {
    // Died before claiming: PIA, plus any delayed credits accrued by the death age.
    const deathAge = Math.min(y.lifeExpectancy + 1, DRC_MAX_AGE);
    base = deathAge * 12 > y.fra ? Math.floor(y.pia * benefitAdjustmentFactor(deathAge, y.birthYear)) : y.pia;
  }
  // Model simplification: survivor benefits start at the later of the first year
  // after the death and x's selected claim age (always >= 62, so >= age 60).
  const firstYearAfterDeath = y.birthYear + y.lifeExpectancy + 1;
  const startAge = Math.max(firstYearAfterDeath - x.birthYear, x.claimAge);
  const amount = Math.floor(Math.min(base * survivorReductionFactor(startAge, x.birthYear), ribLimCap));
  return { startAge, amount };
};

export const simulateHousehold = (
  personA: PersonProfile,
  personB: PersonProfile,
  claimAgeA: number,
  claimAgeB: number,
  isMarried: boolean,
  cola: number,
  realReturn: number,
  solvencyFactor: number, // 0.0 to 1.0 (1.0 = 100% benefits)
  options: SimulationOptions = {}
): SimulationYear[] => {
  // Defensive bounds checks (protects against degenerate/extreme values)
  const safeCola = Math.max(0, Math.min(0.20, isNaN(cola) ? 0 : cola));
  const safeRealReturn = Math.max(-0.50, Math.min(0.50, isNaN(realReturn) ? 0 : realReturn));
  const safeSolvency = Math.max(0, Math.min(1.0, isNaN(solvencyFactor) ? 1.0 : solvencyFactor));
  const safePiaA = Math.max(0, Math.min(25000, isNaN(personA.pia) ? 0 : personA.pia));
  const safePiaB = Math.max(0, Math.min(25000, isNaN(personB.pia) ? 0 : personB.pia));
  const safeClaimAgeA = Math.max(62, Math.min(70, isNaN(claimAgeA) ? 67 : claimAgeA));
  const safeClaimAgeB = Math.max(62, Math.min(70, isNaN(claimAgeB) ? 67 : claimAgeB));
  const basisYear = options.currentYear ?? CURRENT_YEAR;

  const results: SimulationYear[] = [];
  const startYear = Math.min(personA.birthYear, personB.birthYear) + 62;
  const maxAge = 100; // Cap simulation
  const endYear = startYear + (maxAge - 62) + 20; // Safe buffer

  // Calculate Nominal Return Rate for investment growth
  // Formula: (1 + Real) * (1 + Inflation/COLA) - 1
  const nominalReturnRate = (1 + safeRealReturn) * (1 + safeCola) - 1;

  const a = makeClaimant(personA, safeClaimAgeA, safePiaA);
  const b = makeClaimant(personB, safeClaimAgeB, safePiaB);

  const spousalA = spousalFor(a, b);
  const spousalB = spousalFor(b, a);
  const survivorA = survivorFor(a, b);
  const survivorB = survivorFor(b, a);

  let cumulative = 0;

  for (let year = startYear; year <= endYear; year++) {
    const ageA = year - personA.birthYear;
    const ageB = year - personB.birthYear;

    // Check if alive
    const aliveA = ageA <= personA.lifeExpectancy;
    const aliveB = ageB <= personB.lifeExpectancy;

    if (!aliveA && !aliveB) break;

    // Benefits are in today's dollars (basisYear); COLA compounds from there.
    const inflationFactor = Math.pow(1 + safeCola, year - basisYear);

    const ownA = ageA >= a.claimAge ? a.ownBenefit : 0;
    const ownB = ageB >= b.claimAge ? b.ownBenefit : 0;
    let monthlyA = 0;
    let monthlyB = 0;

    if (aliveA && aliveB) {
      monthlyA = ownA;
      monthlyB = ownB;
      if (isMarried) {
        if (ageA >= spousalA.startAge) monthlyA += spousalA.amount;
        if (ageB >= spousalB.startAge) monthlyB += spousalB.amount;
      }
    } else if (aliveA) {
      const surv = isMarried && ageA >= survivorA.startAge ? survivorA.amount : 0;
      monthlyA = Math.max(ownA, surv);
    } else {
      const surv = isMarried && ageB >= survivorB.startAge ? survivorB.amount : 0;
      monthlyB = Math.max(ownB, surv);
    }

    // Apply Solvency Haircut from its start year
    const solvency = options.solvencyStartYear === undefined || year >= options.solvencyStartYear ? safeSolvency : 1;
    const monthlyCheckA = monthlyA * inflationFactor * solvency;
    const monthlyCheckB = monthlyB * inflationFactor * solvency;

    const annualTotal = (monthlyCheckA + monthlyCheckB) * 12;

    // Apply Investment Return to previous balance
    cumulative = (cumulative * (1 + nominalReturnRate)) + annualTotal;

    results.push({
      ageA,
      ageB,
      year,
      benefitA: monthlyCheckA * 12,
      benefitB: monthlyCheckB * 12,
      totalAnnual: annualTotal,
      cumulative: Math.round(cumulative)
    });
  }

  return results;
};


// --- Strategy Grid & Optimizer ---

export const calculateStrategyGrid = (
  personA: PersonProfile,
  personB: PersonProfile,
  isMarried: boolean,
  cola: number,
  realReturn: number,
  solvencyFactor: number,
  options: SimulationOptions = {}
): GridResult => {
  const grid: StrategySummary[] = [];
  let min: StrategySummary | null = null;
  let max: StrategySummary | null = null;

  // Grid search 62 to 70
  for (let a = 62; a <= 70; a++) {
    for (let b = 62; b <= 70; b++) {
      const sim = simulateHousehold(personA, personB, a, b, isMarried, cola, realReturn, solvencyFactor, options);
      const totalCash = sim[sim.length - 1]?.cumulative || 0;

      const entry = { ageA: a, ageB: b, totalCash };
      grid.push(entry);

      if (!min || totalCash < min.totalCash) min = entry;
      if (!max || totalCash > max.totalCash) max = entry;
    }
  }

  return { grid, min: min!, max: max! };
};

// --- Tax Bomb Calculator ---
// Tables live in statutoryTables.ts (TAX_TABLE_YEAR).

export const calculateFederalTax = (taxableIncome: number, isMarried: boolean): number => {
  if (taxableIncome <= 0) return 0;

  const brackets = isMarried ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  let tax = 0;
  let previousMax = 0;

  for (const bracket of brackets) {
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - previousMax;
    if (taxableInBracket <= 0) break;

    tax += taxableInBracket * bracket.rate;
    previousMax = bracket.max;
    if (taxableIncome <= bracket.max) break;
  }

  return tax;
};

// Helper to get marginal rate
export const getMarginalTaxRate = (taxableIncome: number, isMarried: boolean): number => {
  if (taxableIncome <= 0) return 0;
  const brackets = isMarried ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.max) return bracket.rate;
  }
  return brackets[brackets.length - 1].rate;
};

// Basic standard deduction plus the additional amount per person age 65+.
export const standardDeduction = (isMarried: boolean, count65Plus: number): number =>
  isMarried
    ? STD_DED_MARRIED + count65Plus * ADDL_STD_DED_65_MARRIED
    : STD_DED_SINGLE + count65Plus * ADDL_STD_DED_65_SINGLE;

// Senior deduction: only in tax years 2025-2028, phased out above a MAGI threshold.
export const seniorDeduction = (taxYear: number, count65Plus: number, magi: number, isMarried: boolean): number => {
  const s = SENIOR_DEDUCTION;
  if (taxYear < s.firstYear || taxYear > s.lastYear || count65Plus <= 0) return 0;
  const threshold = isMarried ? s.thresholdMarried : s.thresholdSingle;
  const perPerson = Math.max(0, s.amount - s.phaseOutRate * Math.max(0, magi - threshold));
  return perPerson * count65Plus;
};

// Social Security Taxability (IRC 86)
export const calculateTaxableSS = (ssAmount: number, otherIncome: number, isMarried: boolean, taxExemptInterest: number = 0): number => {
  // Provisional Income = AGI excluding SS + tax-exempt interest + 0.5 * SS
  const provInc = otherIncome + taxExemptInterest + (0.5 * ssAmount);

  const { t1, t2 } = isMarried ? SS_TAX_THRESHOLDS.married : SS_TAX_THRESHOLDS.single;

  if (provInc <= t1) {
    return 0;
  } else if (provInc <= t2) {
    return Math.min(0.5 * ssAmount, 0.5 * (provInc - t1));
  } else {
    // 85% Tier
    const taxableAtT2 = Math.min(0.5 * ssAmount, 0.5 * (t2 - t1)); // Max amount taxable in 50% tier
    return Math.min(0.85 * ssAmount, 0.85 * (provInc - t2) + taxableAtT2);
  }
};

export interface TaxSnapshotInput {
  balance: number;              // tax-deferred balance in the snapshot year
  rmdDivisor: number | null;    // Uniform Lifetime Table divisor; null = no RMD yet
  qcd: number;                  // already limited to the QCD cap / age rule
  ssBenefit: number;            // annual
  otherIncome: number;          // pensions etc.
  taxExemptInterest: number;
  isMarried: boolean;
  count65Plus: number;
  taxYear: number;              // snapshot calendar year (senior deduction window)
}

export const calculateTaxSnapshot = (input: TaxSnapshotInput): TaxResult => {
  const { balance, rmdDivisor, qcd, ssBenefit, otherIncome, taxExemptInterest, isMarried, count65Plus, taxYear } = input;

  // 1. Gross RMD
  const grossRmd = rmdDivisor ? balance / rmdDivisor : 0;

  // 2. Net Taxable RMD
  const taxableRmd = Math.max(0, grossRmd - qcd);

  // 3. Total "Other Income" for SS Formula
  const totalOtherIncome = taxableRmd + otherIncome;

  // 4. Calculate Taxable SS
  const taxableSS = calculateTaxableSS(ssBenefit, totalOtherIncome, isMarried, taxExemptInterest);

  // 5. AGI
  const agi = totalOtherIncome + taxableSS;

  // 6. Taxable Income
  const stdDed = standardDeduction(isMarried, count65Plus);
  const seniorDed = seniorDeduction(taxYear, count65Plus, agi, isMarried);
  const taxableIncome = Math.max(0, agi - stdDed - seniorDed);

  // 7. Federal Tax
  const federalTax = calculateFederalTax(taxableIncome, isMarried);

  // 8. Marginal Rate
  const marginalRate = getMarginalTaxRate(taxableIncome, isMarried);

  return {
    filingStatus: isMarried ? 'Married Joint' : 'Single',
    rmd: grossRmd,
    taxableRmd,
    qcd,
    ssBenefit,
    taxableSS,
    otherIncome,
    taxExemptInterest,
    agi,
    standardDeduction: stdDed,
    seniorDeduction: seniorDed,
    taxableIncome,
    federalTax,
    marginalRate
  };
};
