import { BEND_POINT_1, BEND_POINT_2, DATA_AWI_SERIES, FRA_YEARS, TAX_MAX_SERIES } from '../constants';
import { EarningsRecord, PersonProfile, SimulationYear, StrategyResult, StrategySummary, GridResult, TaxResult } from '../types';

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

export const calculatePIAFromAIME = (aime: number): number => {
  let pia = 0;
  // First Segment
  pia += 0.90 * Math.min(aime, BEND_POINT_1);
  
  // Second Segment
  if (aime > BEND_POINT_1) {
    pia += 0.32 * Math.min(aime - BEND_POINT_1, BEND_POINT_2 - BEND_POINT_1);
  }

  // Third Segment
  if (aime > BEND_POINT_2) {
    pia += 0.15 * (aime - BEND_POINT_2);
  }

  return Math.floor(pia * 10) / 10; // Truncate to dime
};

export const estimateAIMEFromPIA = (pia: number): number => {
  // Reverse the bend points logic (Approximation using 2025 factors)
  // Segment 1 max PIA = 0.9 * 1226 = 1103.4
  // Segment 2 max PIA = 1103.4 + 0.32 * (7391 - 1226) = 1103.4 + 1972.8 = 3076.2
  
  const seg1Limit = 0.9 * BEND_POINT_1;
  const seg2Limit = seg1Limit + 0.32 * (BEND_POINT_2 - BEND_POINT_1);
  
  if (pia <= seg1Limit) {
      return Math.round(pia / 0.9);
  } else if (pia <= seg2Limit) {
      return Math.round(BEND_POINT_1 + (pia - seg1Limit) / 0.32);
  } else {
      return Math.round(BEND_POINT_2 + (pia - seg2Limit) / 0.15);
  }
};

export const calculatePIA = (birthYear: number, earnings: EarningsRecord[]): { pia: number, aime: number } => {
  // 1. Determine Indexing Year (Year person turns 60)
  // Per SSA convention (today's-dollars basis): for cohorts under 60, freeze indexing at latest published AWI year
  const latestAWIObj = DATA_AWI_SERIES[DATA_AWI_SERIES.length - 1];
  const indexingYear = Math.min(birthYear + 60, latestAWIObj.year);
  const indexYearAWI = (DATA_AWI_SERIES.find(d => d.year === indexingYear) || latestAWIObj).amount;

  // 2. Index Earnings
  const latestCap = TAX_MAX_SERIES[2026] || 184500;
  const indexedEarnings = earnings.map(rec => {
    // Sanity check for year
    if (rec.year < 1950 || rec.year > 2035) return 0;

    // Cap at Tax Max
    const cap = TAX_MAX_SERIES[rec.year] || latestCap;
    const cappedAmount = Math.min(rec.amount, cap);

    if (rec.year >= indexingYear) return cappedAmount; // After 60, use nominal
    
    const recordYearAWI = DATA_AWI_SERIES.find(d => d.year === rec.year);
    if (!recordYearAWI) return cappedAmount; // Fallback

    const factor = indexYearAWI / recordYearAWI.amount;
    return cappedAmount * factor;
  });

  // 3. Top 35 Years
  indexedEarnings.sort((a, b) => b - a);
  const top35 = indexedEarnings.slice(0, 35);
  // Pad with zeros if fewer than 35
  while (top35.length < 35) top35.push(0);

  const totalLifetimeIndexedEarnings = top35.reduce((sum, val) => sum + val, 0);
  
  // 4. Calculate AIME
  const aime = Math.floor(totalLifetimeIndexedEarnings / 420); // 35 years * 12 months

  // 5. Calculate PIA using shared logic
  const pia = calculatePIAFromAIME(aime);

  return { pia, aime };
};

// --- Benefit Adjustment ---

const getBenefitAdjustmentFactor = (claimAge: number, fra: number) => {
  const monthsEarly = Math.max(0, (fra - claimAge) * 12);
  const monthsLate = Math.max(0, (claimAge - fra) * 12);

  if (monthsEarly > 0) {
    // Reduction logic
    // 5/9 of 1% for first 36 months
    // 5/12 of 1% for remaining months
    const first36 = Math.min(monthsEarly, 36);
    const remaining = Math.max(0, monthsEarly - 36);
    const reduction = (first36 * (5/900)) + (remaining * (5/1200));
    return 1 - reduction;
  } else if (monthsLate > 0) {
    // Credit logic: 8% per year (2/3 of 1% per month)
    // Capped at age 70 (handled by inputs usually, but logic here: max 3 years past 67)
    const validMonthsLate = Math.min(monthsLate, (70 - fra) * 12); 
    const increase = validMonthsLate * (8/1200);
    return 1 + increase;
  }
  return 1.0;
};

// --- Simulation Loop ---

export const simulateHousehold = (
  personA: PersonProfile,
  personB: PersonProfile,
  claimAgeA: number,
  claimAgeB: number,
  isMarried: boolean,
  cola: number,
  realReturn: number,
  solvencyFactor: number // 0.0 to 1.0 (1.0 = 100% benefits)
): SimulationYear[] => {
  const results: SimulationYear[] = [];
  const startYear = Math.min(personA.birthYear, personB.birthYear) + 62;
  const maxAge = 100; // Cap simulation
  const endYear = startYear + (maxAge - 62) + 20; // Safe buffer

  // Calculate Nominal Return Rate for investment growth
  // Formula: (1 + Real) * (1 + Inflation/COLA) - 1
  const nominalReturnRate = (1 + realReturn) * (1 + cola) - 1;

  // Calculate Initial Monthly Benefits (in today's dollars, unadjusted for COLA yet)
  const factorA = getBenefitAdjustmentFactor(claimAgeA, FRA_YEARS);
  const factorB = getBenefitAdjustmentFactor(claimAgeB, FRA_YEARS);

  const baseBenefitA = Math.floor(personA.pia * factorA);
  const baseBenefitB = Math.floor(personB.pia * factorB);

  // Spousal Check
  // Spousal benefit is 50% of the other person's PIA (not their benefit), minus own PIA.
  const rawSpousalForA = Math.max(0, (0.5 * personB.pia) - personA.pia);
  const rawSpousalForB = Math.max(0, (0.5 * personA.pia) - personB.pia);
  
  const getSpousalReduction = (age: number) => {
    const monthsEarly = Math.max(0, (FRA_YEARS - age) * 12);
    if (monthsEarly === 0) return 1;
    const first36 = Math.min(monthsEarly, 36);
    const rem = Math.max(0, monthsEarly - 36);
    const red = (first36 * (25/3600)) + (rem * (5/1200));
    return Math.max(0, 1 - red);
  };
  
  const spousalFactorA = getSpousalReduction(claimAgeA);
  const spousalFactorB = getSpousalReduction(claimAgeB);
  
  const spousalTopUpA = Math.floor(rawSpousalForA * spousalFactorA);
  const spousalTopUpB = Math.floor(rawSpousalForB * spousalFactorB);

  let cumulative = 0;

  for (let year = startYear; year <= endYear; year++) {
    const ageA = year - personA.birthYear;
    const ageB = year - personB.birthYear;

    // Check if alive
    const aliveA = ageA <= personA.lifeExpectancy;
    const aliveB = ageB <= personB.lifeExpectancy;

    if (!aliveA && !aliveB) break;

    // COLA adjustment factor since age 62 (approximated base year)
    // Use A's timeline as baseline for inflation
    const inflationFactor = Math.pow(1 + cola, year - startYear);

    let monthlyCheckA = 0;
    let monthlyCheckB = 0;

    // --- ALIVE LOGIC ---
    if (aliveA && aliveB) {
      // BOTH ALIVE
      if (ageA >= claimAgeA) monthlyCheckA = baseBenefitA * inflationFactor;
      if (ageB >= claimAgeB) monthlyCheckB = baseBenefitB * inflationFactor;

      if (isMarried) {
        if (ageA >= claimAgeA && ageB >= claimAgeB) {
            // Deemed filing: If you file for own, you file for spousal.
            // Spousal requires PRIMARY to have filed.
            // Logic: Add spousal top-up if the OTHER spouse has filed.
            if (ageB >= claimAgeB) {
              // B has filed, A can get spousal
               if (monthlyCheckA > 0 || (ageA >= claimAgeA)) { // Basic check: A must be filed to get topup? Actually A files at claimAgeA.
                  monthlyCheckA += (spousalTopUpA * inflationFactor);
               }
            }
            if (ageA >= claimAgeA) {
              // A has filed, B can get spousal
               if (monthlyCheckB > 0 || (ageB >= claimAgeB)) {
                  monthlyCheckB += (spousalTopUpB * inflationFactor);
               }
            }
        }
      }

    } else if (aliveA && !aliveB) {
      // A ALIVE, B DEAD
      let own = 0;
      if (ageA >= claimAgeA) own = baseBenefitA * inflationFactor;

      if (isMarried) {
        // Survivor Logic
        // Survivor gets 100% of deceased benefit (including delayed credits)
        // If deceased claimed early, there are complex "widow limit" rules (RIB-LIM).
        // Simplified here: Max(DeceasedActual, SurvivorOwn)
        // Note: The deceased benefit grows with COLA.
        
        // Construct Deceased Benefit B (as if alive for COLA purposes)
        // If B died before claiming? 
        // Assumption: If B died before claiming, B is assumed to claim at death or FRA?
        // Standard rule: If B died before claiming, use B's PIA (adjusted if death < FRA).
        // We'll simplify: If B claimed, use B's benefit. If not, use B's PIA.
        
        let deceasedBenefit = 0;
        if (claimAgeB <= ageB) {
           deceasedBenefit = baseBenefitB * inflationFactor; 
        } else {
           // B hadn't claimed yet. 
           // If B died after FRA, they get credits. 
           // If B died before FRA, no reduction? (Actually full PIA usually).
           // We will assume Base Benefit B (which might include credits if claimAgeB was set high, but B died young? Logic gap).
           // FIX: If B died before claiming, survivor gets B's PIA adjusted for B's death age?
           // For optimization grid (62-70), we assume they live to LE. So this branch only hits if LE < 100.
           deceasedBenefit = baseBenefitB * inflationFactor; // Simplification
        }
        
        // Survivor benefit can be taken as early as 60. Here we assume A claims survivor at 'claimAgeA' or immediately if older.
        // If A is already claiming own, they switch to survivor if higher.
        // A survivor reduction applies if A < FRA.
        
        monthlyCheckA = Math.max(own, deceasedBenefit);
      } else {
        monthlyCheckA = own;
      }

    } else if (!aliveA && aliveB) {
       // B ALIVE, A DEAD
       let own = 0;
       if (ageB >= claimAgeB) own = baseBenefitB * inflationFactor;

       if (isMarried) {
         let deceasedBenefit = baseBenefitA * inflationFactor;
         monthlyCheckB = Math.max(own, deceasedBenefit);
       } else {
         monthlyCheckB = own;
       }
    }

    // Apply Solvency Haircut
    monthlyCheckA *= solvencyFactor;
    monthlyCheckB *= solvencyFactor;

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
  solvencyFactor: number
): GridResult => {
  const grid: StrategySummary[] = [];
  let min: StrategySummary | null = null;
  let max: StrategySummary | null = null;

  // Grid search 62 to 70
  for (let a = 62; a <= 70; a++) {
    for (let b = 62; b <= 70; b++) {
      const sim = simulateHousehold(personA, personB, a, b, isMarried, cola, realReturn, solvencyFactor);
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

// 2025 Standard Deductions
const STD_DED_SINGLE = 15000;
const STD_DED_MARRIED = 30000;

// 2025 Tax Brackets (Single)
const BRACKETS_SINGLE = [
  { max: 11925, rate: 0.10 },
  { max: 48475, rate: 0.12 },
  { max: 103350, rate: 0.22 },
  { max: 197300, rate: 0.24 },
  { max: 250525, rate: 0.32 },
  { max: Infinity, rate: 0.35 } // Cap for simulation
];

// 2025 Tax Brackets (Married)
const BRACKETS_MARRIED = [
  { max: 23850, rate: 0.10 },
  { max: 96950, rate: 0.12 },
  { max: 206700, rate: 0.22 },
  { max: 394600, rate: 0.24 },
  { max: 501050, rate: 0.32 },
  { max: Infinity, rate: 0.35 }
];

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

// Social Security Taxability
export const calculateTaxableSS = (ssAmount: number, otherIncome: number, isMarried: boolean): number => {
  // Provisional Income = AGI (excluding SS) + Tax Exempt Interest (ignored) + 0.5 * SS
  // Here, 'otherIncome' represents the AGI component from RMDs, Pensions, etc.
  const provInc = otherIncome + (0.5 * ssAmount);
  
  const t1 = isMarried ? 32000 : 25000;
  const t2 = isMarried ? 44000 : 34000;

  if (provInc < t1) {
    return 0;
  } else if (provInc < t2) {
    return Math.min(0.5 * ssAmount, 0.5 * (provInc - t1));
  } else {
    // 85% Tier
    const taxableAtT2 = Math.min(0.5 * ssAmount, 0.5 * (t2 - t1)); // Max amount taxable in 50% tier
    return Math.min(0.85 * ssAmount, 0.85 * (provInc - t2) + taxableAtT2);
  }
};

export const calculateTaxSnapshot = (
  balance: number,
  qcd: number,
  ssBenefit: number, // Annual
  otherIncomeFixed: number, // Pensions etc
  isMarried: boolean
): TaxResult => {
  // 1. Calculate Gross RMD
  // Divisor for Age 75 is 24.6
  const grossRmd = balance / 24.6;
  
  // 2. Net Taxable RMD
  const taxableRmd = Math.max(0, grossRmd - qcd);
  
  // 3. Total "Other Income" for SS Formula
  const totalOtherIncome = taxableRmd + otherIncomeFixed;
  
  // 4. Calculate Taxable SS
  const taxableSS = calculateTaxableSS(ssBenefit, totalOtherIncome, isMarried);
  
  // 5. AGI
  const agi = totalOtherIncome + taxableSS;
  
  // 6. Taxable Income
  const stdDed = isMarried ? STD_DED_MARRIED : STD_DED_SINGLE;
  const taxableIncome = Math.max(0, agi - stdDed);
  
  // 7. Federal Tax
  const federalTax = calculateFederalTax(taxableIncome, isMarried);
  
  // 8. Marginal Rate
  const marginalRate = getMarginalTaxRate(taxableIncome, isMarried);

  return {
    filingStatus: isMarried ? 'Married Joint' : 'Single',
    rmd: grossRmd,
    taxableRmd,
    ssBenefit,
    taxableSS,
    otherIncome: otherIncomeFixed,
    agi,
    taxableIncome,
    federalTax,
    marginalRate
  };
};