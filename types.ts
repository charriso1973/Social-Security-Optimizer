export interface EarningsRecord {
  year: number;
  amount: number;
}

export interface PersonProfile {
  id: string;
  name: string;
  birthYear: number;
  lifeExpectancy: number;
  claimAge: number;
  
  // PIA Calculation Method
  piaInputMethod: 'earnings' | 'manual' | 'aime';
  manualPia: number;
  manualAime: number;
  earningsInput: string;
  parsedEarnings: EarningsRecord[];
  
  // Computed
  pia: number; // Primary Insurance Amount
  aime: number; // Average Indexed Monthly Earnings
  piaWarnings?: string[]; // Data gaps or caveats from the PIA computation
}

export interface SimulationYear {
  ageA: number;
  ageB: number;
  year: number;
  benefitA: number;
  benefitB: number;
  totalAnnual: number;
  cumulative: number;
}

export interface StrategyResult {
  claimAgeA: number;
  claimAgeB: number;
  totalLifetimeCash: number;
  data: SimulationYear[];
}

export interface StrategySummary {
  ageA: number;
  ageB: number;
  totalCash: number;
}

export interface GridResult {
  grid: StrategySummary[];
  min: StrategySummary;
  max: StrategySummary;
}

export interface SimulationConfig {
  isMarried: boolean;
  cola: number; // e.g. 0.025
  realReturn: number; // e.g. 0.04
}

export interface TaxInput {
  currentSavings: number;
  annualContribution: number;
  otherIncome: number; // Pension, etc.
  qcd: number; // Qualified Charitable Distribution
}

export interface TaxResult {
  filingStatus: 'Single' | 'Married Joint';
  rmd: number; // Gross RMD
  taxableRmd: number; // After QCD
  qcd: number;
  ssBenefit: number;
  taxableSS: number;
  otherIncome: number;
  taxExemptInterest: number;
  agi: number;
  standardDeduction: number; // Including the 65+ additional amount
  seniorDeduction: number;
  taxableIncome: number;
  federalTax: number;
  marginalRate: number;
}