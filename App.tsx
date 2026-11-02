import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label
} from 'recharts';
import { Calculator, DollarSign, Heart, TrendingUp, Info, AlertTriangle, User, Settings, Edit3, FileText, ArrowRight, ArrowLeft, Trophy, Target, Scissors, Lightbulb, Bomb, Minus, Pin, PinOff, Calendar, RefreshCcw, Sparkles } from 'lucide-react';

import { PersonProfile, TaxInput } from './types';
import { 
  DEFAULT_EARNINGS_CSV, DEFAULT_EARNINGS_CSV_B, DEFAULT_BIRTH_YEAR, ASSUMED_COLA, DEFAULT_REAL_RETURN, DEFAULT_PIA_A, DEFAULT_PIA_B,
  SS_MIN_COLA_PCT, SS_MAX_COLA_PCT, SS_MIN_REAL_RETURN_PCT, SS_MAX_REAL_RETURN_PCT,
  SS_MIN_LIFE_EXP, SS_MAX_LIFE_EXP, SS_MAX_MONTHLY_PIA, SS_MIN_CLAIM_AGE, SS_MAX_CLAIM_AGE,
  STATUTORY_BEND_POINT_YEAR, BEND_POINT_1, BEND_POINT_2
} from './constants';
import { parseEarningsCSV, calculatePIA, simulateHousehold, calculateStrategyGrid, calculatePIAFromAIME, estimateAIMEFromPIA, calculateTaxSnapshot } from './services/engine';
import { StrategyHeatmap } from './StrategyHeatmap';

// Formatting Helpers
const formatNumber = (num: number) => num.toLocaleString('en-US');
const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const formatMillions = (val: number) => `$${(val / 1000000).toFixed(2)}M`;
const formatPct = (val: number) => `${(val * 100).toFixed(1)}%`;

// Tax Input Helper Component
const TaxInputBox = ({ value, onChange, placeholder }: { value: number, onChange: (val: number) => void, placeholder?: string }) => {
  const [localVal, setLocalVal] = useState<string>(value === 0 ? '' : formatNumber(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
        const currentNum = parseFloat(localVal.replace(/,/g, '') || '0');
        if (currentNum !== value) {
            setLocalVal(value === 0 ? '' : formatNumber(value));
        }
    }
  }, [value, isFocused, localVal]);

  const commit = () => {
    const raw = localVal.replace(/,/g, '');
    const num = parseFloat(raw);
    const final = isNaN(num) ? 0 : num;
    onChange(final);
    setLocalVal(final === 0 ? '' : formatNumber(final));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit();
      e.currentTarget.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valid = e.target.value.replace(/[^0-9,]/g, '');
    setLocalVal(valid);
  };

  return (
    <div className="relative">
      <span className="absolute left-2 top-1.5 text-xs text-slate-400">$</span>
      <input 
        type="text" 
        value={localVal} 
        onChange={handleChange}
        onBlur={() => { setIsFocused(false); commit(); }}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        className="w-full text-xs pl-5 py-1.5 border rounded bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
        placeholder={placeholder || "0"}
      />
    </div>
  );
};

// Integer Input Helper (No leading zero issues)
const IntegerInput = ({ value, onChange, placeholder, className }: { value: number, onChange: (val: number) => void, placeholder?: string, className?: string }) => {
  const [localVal, setLocalVal] = useState<string>(value.toString());
  
  useEffect(() => {
    setLocalVal(value === 0 ? '' : value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalVal(val);
    if (val === '') {
      onChange(0);
      return;
    }
    const num = parseInt(val);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const handleBlur = () => {
     if (localVal === '') setLocalVal('0');
  };

  return (
    <input 
      type="text"
      inputMode="numeric"
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
    />
  );
};

const App: React.FC = () => {
  // --- Global State ---
  const [isMarried, setIsMarried] = useState<boolean>(false);
  const [cola, setCola] = useState<number>(ASSUMED_COLA);
  const [realReturn, setRealReturn] = useState<number>(DEFAULT_REAL_RETURN);
  const [applyHaircut, setApplyHaircut] = useState<boolean>(false);
  const [haircutPct, setHaircutPct] = useState<number>(83);
  const [showOptimalLine, setShowOptimalLine] = useState<boolean>(true);
  const [chartMode, setChartMode] = useState<'crossover' | 'cumulative'>('crossover');
  const [useRealDollars, setUseRealDollars] = useState<boolean>(false); // False = Future/Nominal, True = Today's/Real

  // --- UI State ---
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(true);
  const [isScorecardPinned, setIsScorecardPinned] = useState<boolean>(true);

  // --- Partner A State ---
  const [nameA, setNameA] = useState<string>('Partner A');
  const [birthYearA, setBirthYearA] = useState<number>(DEFAULT_BIRTH_YEAR); 
  const [lifeExpA, setLifeExpA] = useState<number>(85);
  const [claimAgeA, setClaimAgeA] = useState<number>(67);
  const [piaMethodA, setPiaMethodA] = useState<'earnings' | 'manual' | 'aime'>('manual');
  const [manualPiaA, setManualPiaA] = useState<number>(DEFAULT_PIA_A);
  const [manualAimeA, setManualAimeA] = useState<number>(10000);
  const [earningsA, setEarningsA] = useState<string>(DEFAULT_EARNINGS_CSV);

  // Tax Bomb State A
  const [savingsA, setSavingsA] = useState<number>(1300000);
  const [contribA, setContribA] = useState<number>(0);
  const [contribEndAgeA, setContribEndAgeA] = useState<number>(65);
  const [otherIncA1, setOtherIncA1] = useState<number>(36000);
  const [otherIncA2, setOtherIncA2] = useState<number>(5000);
  const [otherIncA3, setOtherIncA3] = useState<number>(0);
  const [qcdA, setQcdA] = useState<number>(0);

  // --- Partner B State ---
  const [nameB, setNameB] = useState<string>('Partner B');
  const [birthYearB, setBirthYearB] = useState<number>(DEFAULT_BIRTH_YEAR);
  const [lifeExpB, setLifeExpB] = useState<number>(95);
  const [claimAgeB, setClaimAgeB] = useState<number>(67);
  const [piaMethodB, setPiaMethodB] = useState<'earnings' | 'manual' | 'aime'>('manual');
  const [manualPiaB, setManualPiaB] = useState<number>(DEFAULT_PIA_B);
  const [manualAimeB, setManualAimeB] = useState<number>(10000);
  const [earningsB, setEarningsB] = useState<string>(DEFAULT_EARNINGS_CSV_B); 
  
  // Tax Bomb State B
  const [savingsB, setSavingsB] = useState<number>(1140000);
  const [contribB, setContribB] = useState<number>(31000);
  const [contribEndAgeB, setContribEndAgeB] = useState<number>(65);
  const [otherIncB1, setOtherIncB1] = useState<number>(100000);
  const [otherIncB2, setOtherIncB2] = useState<number>(0);
  const [otherIncB3, setOtherIncB3] = useState<number>(0);
  const [qcdB, setQcdB] = useState<number>(30000);


  // --- Derived Profiles ---
  const profileA: PersonProfile = useMemo(() => {
    let pia = 0;
    let aime = 0;
    const parsed = parseEarningsCSV(earningsA);

    if (piaMethodA === 'manual') {
      pia = manualPiaA;
      aime = estimateAIMEFromPIA(manualPiaA);
    } else if (piaMethodA === 'aime') {
      aime = manualAimeA;
      pia = calculatePIAFromAIME(manualAimeA);
    } else {
      const result = calculatePIA(birthYearA, parsed);
      pia = result.pia;
      aime = result.aime;
    }

    return {
      id: 'A', name: nameA, birthYear: birthYearA, lifeExpectancy: lifeExpA,
      claimAge: claimAgeA, earningsInput: earningsA, parsedEarnings: parsed, 
      pia, aime, piaInputMethod: piaMethodA, manualPia: manualPiaA, manualAime: manualAimeA
    };
  }, [nameA, earningsA, birthYearA, lifeExpA, claimAgeA, piaMethodA, manualPiaA, manualAimeA]);

  const profileB: PersonProfile = useMemo(() => {
    let pia = 0;
    let aime = 0;
    const parsed = parseEarningsCSV(earningsB);

    if (piaMethodB === 'manual') {
      pia = manualPiaB;
      aime = estimateAIMEFromPIA(manualPiaB);
    } else if (piaMethodB === 'aime') {
      aime = manualAimeB;
      pia = calculatePIAFromAIME(manualAimeB);
    } else {
      const result = calculatePIA(birthYearB, parsed);
      pia = result.pia;
      aime = result.aime;
    }

    return {
      id: 'B', name: nameB, birthYear: birthYearB, lifeExpectancy: lifeExpB,
      claimAge: claimAgeB, earningsInput: earningsB, parsedEarnings: parsed, 
      pia, aime, piaInputMethod: piaMethodB, manualPia: manualPiaB, manualAime: manualAimeB
    };
  }, [nameB, earningsB, birthYearB, lifeExpB, claimAgeB, piaMethodB, manualPiaB, manualAimeB]);

  // --- Calculations ---
  const solvencyFactor = applyHaircut ? (haircutPct / 100) : 1.0;
  
  // If "Today's Dollars" is checked, we turn off COLA in the simulation engine
  const effectiveCola = useRealDollars ? 0 : cola;

  const marriedAnalysis = useMemo(() => {
    return calculateStrategyGrid(profileA, profileB, true, effectiveCola, realReturn, solvencyFactor);
  }, [profileA, profileB, effectiveCola, realReturn, solvencyFactor]);

  const unmarriedAnalysis = useMemo(() => {
    return calculateStrategyGrid(profileA, profileB, false, effectiveCola, realReturn, solvencyFactor);
  }, [profileA, profileB, effectiveCola, realReturn, solvencyFactor]);

  const strategyAnalysis = isMarried ? marriedAnalysis : unmarriedAnalysis;
  const localOptimal = strategyAnalysis.max;

  const globalOptimal = useMemo(() => {
    const marMax = marriedAnalysis.max;
    const unmarMax = unmarriedAnalysis.max;
    if (marMax.totalCash >= unmarMax.totalCash) {
      return { ...marMax, isMarried: true };
    } else {
      return { ...unmarMax, isMarried: false };
    }
  }, [marriedAnalysis, unmarriedAnalysis]);

  const betterStrategyAvailable = globalOptimal.totalCash > localOptimal.totalCash + 1000;

  const userSim = useMemo(() => {
    return simulateHousehold(profileA, profileB, claimAgeA, claimAgeB, isMarried, effectiveCola, realReturn, solvencyFactor);
  }, [profileA, profileB, claimAgeA, claimAgeB, isMarried, effectiveCola, realReturn, solvencyFactor]);

  const optimalSim = useMemo(() => {
    return simulateHousehold(profileA, profileB, localOptimal.ageA, localOptimal.ageB, isMarried, effectiveCola, realReturn, solvencyFactor);
  }, [profileA, profileB, localOptimal, isMarried, effectiveCola, realReturn, solvencyFactor]);

  const worstSim = useMemo(() => {
    const { min } = strategyAnalysis;
    return simulateHousehold(profileA, profileB, min.ageA, min.ageB, isMarried, effectiveCola, realReturn, solvencyFactor);
  }, [profileA, profileB, strategyAnalysis, isMarried, effectiveCola, realReturn, solvencyFactor]);

  const baseline62Sim = useMemo(() => {
    return simulateHousehold(profileA, profileB, 62, 62, isMarried, effectiveCola, realReturn, solvencyFactor);
  }, [profileA, profileB, isMarried, effectiveCola, realReturn, solvencyFactor]);

  const fraSim = useMemo(() => {
    return simulateHousehold(profileA, profileB, 67, 67, isMarried, effectiveCola, realReturn, solvencyFactor);
  }, [profileA, profileB, isMarried, effectiveCola, realReturn, solvencyFactor]);

  const age70Sim = useMemo(() => {
    return simulateHousehold(profileA, profileB, 70, 70, isMarried, effectiveCola, realReturn, solvencyFactor);
  }, [profileA, profileB, isMarried, effectiveCola, realReturn, solvencyFactor]);

  // --- Chart Data Preparation ---
  const { chartData, deathRefs } = useMemo(() => {
    const map = new Map<number, any>();
    const baseYear = Math.min(profileA.birthYear, profileB.birthYear) + 62;

    const deathYearA = profileA.birthYear + profileA.lifeExpectancy;
    const deathYearB = profileB.birthYear + profileB.lifeExpectancy;
    const relDeathA = deathYearA - baseYear;
    const relDeathB = deathYearB - baseYear;

    const findSimVal = (yr: number, sim: any[]) => {
      const pt = sim.find(s => s.year === yr);
      return pt ? pt.cumulative : 0;
    };

    const valA = findSimVal(deathYearA, userSim);
    const valB = findSimVal(deathYearB, userSim);

    const lastDeathRel = Math.max(relDeathA, relDeathB);
    const finalVal = relDeathA > relDeathB ? valA : valB;

    const refs = {
      deathA: { x: relDeathA, val: valA },
      deathB: { x: relDeathB, val: valB },
      final: { x: lastDeathRel, val: finalVal }
    };

    const maxSimYears = 35;
    for (let yrOffset = 0; yrOffset <= maxSimYears; yrOffset++) {
      const calYear = baseYear + yrOffset;
      const userPt = userSim.find(s => s.year === calYear);
      const optPt = optimalSim.find(s => s.year === calYear);
      const worstPt = worstSim.find(s => s.year === calYear);
      const base62Pt = baseline62Sim.find(s => s.year === calYear);
      const fraPt = fraSim.find(s => s.year === calYear);
      const age70Pt = age70Sim.find(s => s.year === calYear);

      if (!userPt) continue;

      if (chartMode === 'crossover') {
        const b62 = base62Pt ? base62Pt.cumulative : 0;
        map.set(yrOffset, {
          year: yrOffset,
          calYear,
          'Your Strategy': userPt.cumulative - b62,
          ...(showOptimalLine && optPt ? { 'Optimal Strategy': optPt.cumulative - b62 } : {}),
          'Both at FRA (67)': fraPt ? fraPt.cumulative - b62 : 0,
          'Both at 70': age70Pt ? age70Pt.cumulative - b62 : 0,
          'Baseline (Both 62)': 0,
        });
      } else {
        map.set(yrOffset, {
          year: yrOffset,
          calYear,
          'Your Strategy': userPt.cumulative,
          ...(showOptimalLine && optPt ? { 'Optimal Strategy': optPt.cumulative } : {}),
          'Worst Case': worstPt ? worstPt.cumulative : 0,
        });
      }
    }

    return { 
      chartData: Array.from(map.values()).sort((a, b) => a.year - b.year),
      deathRefs: refs
    };
  }, [userSim, optimalSim, worstSim, baseline62Sim, fraSim, age70Sim, showOptimalLine, chartMode, profileA.birthYear, profileB.birthYear, profileA.lifeExpectancy, profileB.lifeExpectancy]);

  const currentCash = userSim[userSim.length - 1]?.cumulative || 0;
  const maxLifetimeLocal = localOptimal.totalCash;
  const minLifetimeLocal = strategyAnalysis.min.totalCash;
  const gap = maxLifetimeLocal - currentCash;
  const globalGap = globalOptimal.totalCash - maxLifetimeLocal;

  const currentMarriedCash = marriedAnalysis.grid.find(s => s.ageA === claimAgeA && s.ageB === claimAgeB)?.totalCash || 0;
  const currentUnmarriedCash = unmarriedAnalysis.grid.find(s => s.ageA === claimAgeA && s.ageB === claimAgeB)?.totalCash || 0;

  const spreadVal = maxLifetimeLocal - minLifetimeLocal;
  const spreadPct = spreadVal > 0 ? ((currentCash - minLifetimeLocal) / spreadVal) * 100 : 0;
  
  const chartTicks = Array.from({length: 36}, (_, i) => i);

  const claimRefs = useMemo(() => {
    const baseYear = Math.min(profileA.birthYear, profileB.birthYear) + 62;
    const claimYearA = profileA.birthYear + profileA.claimAge;
    const claimYearB = profileB.birthYear + profileB.claimAge;
    const xA = claimYearA - baseYear;
    const xB = claimYearB - baseYear;
    const isALeft = xA <= xB;
    const leftDeathVal = deathRefs.deathA.x < deathRefs.deathB.x ? deathRefs.deathA.val : deathRefs.deathB.val;
    const rightClaimHeight = leftDeathVal * 0.85;
    const leftClaimHeight = rightClaimHeight * 1.30;
    const heightA = isALeft ? leftClaimHeight : rightClaimHeight;
    const heightB = !isALeft ? leftClaimHeight : rightClaimHeight;

    return {
      claimA: { x: xA, height: heightA, color: '#2563eb', label: `Claim ${nameA}` },
      claimB: { x: xB, height: heightB, color: '#e11d48', label: `Claim ${nameB}` }
    };
  }, [profileA, profileB, deathRefs, nameA, nameB]);
  
  const { chartDomain, chartYTicks } = useMemo(() => {
    if (chartMode === 'crossover') {
      let min = 0;
      let max = 0;
      chartData.forEach(d => {
        ['Your Strategy', 'Optimal Strategy', 'Both at FRA (67)', 'Both at 70'].forEach(k => {
          if (typeof d[k] === 'number') {
            if (d[k] < min) min = d[k];
            if (d[k] > max) max = d[k];
          }
        });
      });
      const buffer = Math.max(100000, (max - min) * 0.15);
      const floor = Math.floor((min - buffer) / 100000) * 100000;
      const ceil = Math.ceil((max + buffer) / 200000) * 200000;
      return {
        chartDomain: [floor, ceil],
        chartYTicks: undefined
      };
    } else {
      let max = 0;
      chartData.forEach(d => {
        max = Math.max(max, d['Your Strategy'] || 0, d['Optimal Strategy'] || 0, d['Worst Case'] || 0);
      });
      const maxClaim = Math.max(claimRefs.claimA.height, claimRefs.claimB.height);
      const rawMax = Math.max(max * 1.25, maxClaim * 1.25); 
      const ceilMax = Math.max(2000000, Math.ceil(rawMax / 2000000) * 2000000);
      const ticks = [];
      const step = Math.max(1000000, Math.ceil(ceilMax / 5 / 1000000) * 1000000);
      for (let i = 0; i <= ceilMax; i += step) {
        ticks.push(i);
      }
      return {
        chartDomain: [0, ceilMax],
        chartYTicks: ticks
      };
    }
  }, [chartData, chartMode, claimRefs]);

  const taxAnalysis = useMemo(() => {
     const otherIncA = otherIncA1 + otherIncA2 + otherIncA3;
     const otherIncB = otherIncB1 + otherIncB2 + otherIncB3;
     const currentYear = 2025;
     const birthYearOlder = Math.min(birthYearA, birthYearB);
     const yearsTo75 = 75 - (currentYear - birthYearOlder);
     const inflationTo75 = Math.pow(1 + cola, yearsTo75 > 0 ? yearsTo75 : 0);
     const displayFactor = useRealDollars ? 1.0 : inflationTo75;

     // 1. Calculate Real Balance Growth (Always calc in Real for tax basis)
     const growBalanceReal = (startBal: number, annualContrib: number, birthYear: number, contribStopAge: number) => {
        const ageNow = currentYear - birthYear;
        const age75 = 75;
        const yearsTotal = age75 - ageNow;
        if (yearsTotal <= 0) return startBal;
        
        const yearsContrib = Math.max(0, Math.min(yearsTotal, contribStopAge - ageNow));
        const yearsGrowOnly = Math.max(0, yearsTotal - yearsContrib);
        
        // Use Real Return rate
        const rate = realReturn;
        
        let fv = startBal * Math.pow(1 + rate, yearsContrib);
        if (rate !== 0) {
           fv += annualContrib * ((Math.pow(1 + rate, yearsContrib) - 1) / rate);
        } else {
           fv += annualContrib * yearsContrib;
        }
        fv = fv * Math.pow(1 + rate, yearsGrowOnly);
        return fv;
     };

     const projBalRealA = growBalanceReal(savingsA, contribA, birthYearA, contribEndAgeA);
     const projBalRealB = growBalanceReal(savingsB, contribB, birthYearB, contribEndAgeB);

     // 2. Get Real SS Benefit at 75
     const getProjectedRealSS = (profile: PersonProfile, claimAge: number) => {
        const year75 = profile.birthYear + 75;
        const row = userSim.find(r => r.year === year75);
        
        let simBenefit = 0;
        if (row) {
            simBenefit = profile.id === 'A' ? row.benefitA : row.benefitB;
        } else {
            const lastRow = userSim[userSim.length-1];
            if (!lastRow) return 0;
            const yearsMissed = year75 - lastRow.year;
            const base = profile.id === 'A' ? lastRow.benefitA : lastRow.benefitB;
            simBenefit = base * Math.pow(1 + effectiveCola, yearsMissed);
        }
        
        // If simulation was Nominal (!useRealDollars), deflate to get Real
        if (!useRealDollars) {
            const startYear = Math.min(profileA.birthYear, profileB.birthYear) + 62;
            const deflator = Math.pow(1 + cola, year75 - startYear);
            return simBenefit / deflator;
        }
        // If simulation was Real, return as is
        return simBenefit;
     };

     const ssRealA = getProjectedRealSS(profileA, claimAgeA);
     const ssRealB = getProjectedRealSS(profileB, claimAgeB);
     
     // 3. Calculate Tax (Using 2025 Brackets, so Inputs must be Real)
     // Assumption: User inputs otherInc and QCD are in Today's Dollars (Real)
     const resA = calculateTaxSnapshot(projBalRealA, qcdA, ssRealA, otherIncA, false);
     const resB = calculateTaxSnapshot(projBalRealB, qcdB, ssRealB, otherIncB, false);
     
     const totalSingleTaxReal = resA.federalTax + resB.federalTax;
     const totalSingleAGIReal = resA.agi + resB.agi;
     const singleEffectiveRate = totalSingleAGIReal > 0 ? totalSingleTaxReal / totalSingleAGIReal : 0;
     
     const resJoint = calculateTaxSnapshot(
       projBalRealA + projBalRealB, qcdA + qcdB, ssRealA + ssRealB, otherIncA + otherIncB, true
     );
     const marriedEffectiveRate = resJoint.agi > 0 ? resJoint.federalTax / resJoint.agi : 0;
     
     // 4. Prepare Display Values (Inflate if Nominal Mode selected)
     const inflate = (val: number) => val * displayFactor;

     const rawDiff = resJoint.federalTax - totalSingleTaxReal;
     const diffPct = totalSingleTaxReal > 0 ? rawDiff / totalSingleTaxReal : 0;
     
     return {
        single: { 
            taxA: inflate(resA.federalTax), 
            taxB: inflate(resB.federalTax), 
            total: inflate(totalSingleTaxReal), 
            agi: inflate(totalSingleAGIReal), 
            effectiveRate: singleEffectiveRate, // Rate stays same
            detailsA: resA, 
            detailsB: resB,
            // Summed components
            rmd: inflate(resA.rmd + resB.rmd),
            taxableRmd: inflate(resA.taxableRmd + resB.taxableRmd),
            ssBenefit: inflate(resA.ssBenefit + resB.ssBenefit),
            taxableSS: inflate(resA.taxableSS + resB.taxableSS),
            otherIncome: inflate(resA.otherIncome + resB.otherIncome),
            qcd: inflate(qcdA + qcdB)
        },
        joint: { 
            total: inflate(resJoint.federalTax), 
            agi: inflate(resJoint.agi), 
            effectiveRate: marriedEffectiveRate, 
            details: resJoint,
            rmd: inflate(resJoint.rmd),
            taxableRmd: inflate(resJoint.taxableRmd),
            ssBenefit: inflate(resJoint.ssBenefit),
            taxableSS: inflate(resJoint.taxableSS),
            otherIncome: inflate(resJoint.otherIncome),
            qcd: inflate(qcdA + qcdB)
        },
        diff: inflate(rawDiff),
        diffPct: diffPct,
        isSignificant: Math.abs(diffPct) > 0.02,
        balances: {
          projBalA: inflate(projBalRealA),
          projBalB: inflate(projBalRealB)
        },
        currencyMode: useRealDollars ? "Today's Dollars" : "Future Dollars"
     };
  }, [savingsA, savingsB, contribA, contribB, contribEndAgeA, contribEndAgeB, otherIncA1, otherIncA2, otherIncA3, otherIncB1, otherIncB2, otherIncB3, qcdA, qcdB, realReturn, cola, birthYearA, birthYearB, claimAgeA, claimAgeB, userSim, profileA, profileB, useRealDollars, effectiveCola]);

  // Guarded setters for inputs
  const handleManualPiaA = (val: number) => setManualPiaA(Math.max(0, Math.min(SS_MAX_MONTHLY_PIA, isNaN(val) ? 0 : val)));
  const handleManualPiaB = (val: number) => setManualPiaB(Math.max(0, Math.min(SS_MAX_MONTHLY_PIA, isNaN(val) ? 0 : val)));
  const handleManualAimeA = (val: number) => setManualAimeA(Math.max(0, Math.min(50000, isNaN(val) ? 0 : val)));
  const handleManualAimeB = (val: number) => setManualAimeB(Math.max(0, Math.min(50000, isNaN(val) ? 0 : val)));
  const handleBirthYearA = (val: number) => setBirthYearA(Math.max(1920, Math.min(2010, isNaN(val) ? DEFAULT_BIRTH_YEAR : val)));
  const handleBirthYearB = (val: number) => setBirthYearB(Math.max(1920, Math.min(2010, isNaN(val) ? DEFAULT_BIRTH_YEAR : val)));
  const handleLifeExpA = (val: number) => setLifeExpA(Math.max(SS_MIN_LIFE_EXP, Math.min(SS_MAX_LIFE_EXP, isNaN(val) ? 85 : val)));
  const handleLifeExpB = (val: number) => setLifeExpB(Math.max(SS_MIN_LIFE_EXP, Math.min(SS_MAX_LIFE_EXP, isNaN(val) ? 95 : val)));
  const handleColaChange = (val: number) => setCola(Math.max(0, Math.min(SS_MAX_COLA_PCT / 100, isNaN(val) ? ASSUMED_COLA : val)));
  const handleRealReturnChange = (val: number) => setRealReturn(Math.max(SS_MIN_REAL_RETURN_PCT / 100, Math.min(SS_MAX_REAL_RETURN_PCT / 100, isNaN(val) ? DEFAULT_REAL_RETURN : val)));

  const handleResetDefaults = () => {
    setIsMarried(false);
    setCola(ASSUMED_COLA);
    setRealReturn(DEFAULT_REAL_RETURN);
    setApplyHaircut(false);
    setHaircutPct(83);
    setUseRealDollars(false);
    setNameA('Partner A');
    setBirthYearA(DEFAULT_BIRTH_YEAR);
    setLifeExpA(85);
    setClaimAgeA(67);
    setPiaMethodA('manual');
    setManualPiaA(DEFAULT_PIA_A);
    setManualAimeA(10000);
    setNameB('Partner B');
    setBirthYearB(DEFAULT_BIRTH_YEAR);
    setLifeExpB(95);
    setClaimAgeB(67);
    setPiaMethodB('manual');
    setManualPiaB(DEFAULT_PIA_B);
    setManualAimeB(10000);
  };

  const handleApplyPreset = (preset: 'balanced' | 'asymmetric' | 'longevity') => {
    if (preset === 'balanced') {
      setIsMarried(true);
      setClaimAgeA(67);
      setClaimAgeB(67);
      setManualPiaA(3400);
      setManualPiaB(3400);
      setLifeExpA(85);
      setLifeExpB(85);
    } else if (preset === 'asymmetric') {
      setIsMarried(true);
      setClaimAgeA(70);
      setClaimAgeB(62);
      setManualPiaA(4000);
      setManualPiaB(1600);
      setLifeExpA(85);
      setLifeExpB(92);
    } else if (preset === 'longevity') {
      setIsMarried(true);
      setClaimAgeA(65);
      setClaimAgeB(70);
      setLifeExpA(78);
      setLifeExpB(96);
    }
  };

  return (
    <div className="min-h-screen pb-12 font-sans bg-slate-50 text-slate-800">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Social Security Optimizer <span className="text-slate-400 font-light">v3.0</span></h1>
          </div>
          <div className="flex items-center gap-3">
             <div 
               className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-medium border border-emerald-200" 
               title={`Bend Points: $${BEND_POINT_1} / $${BEND_POINT_2}. Official published SSA constants.`}
             >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>SSA Official: <strong>{STATUTORY_BEND_POINT_YEAR || 2027}</strong></span>
             </div>
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${isMarried ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {isMarried ? <Heart className="w-4 h-4"/> : <User className="w-4 h-4"/>}
                {isMarried ? "Married Household" : "Single Household"}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col xl:flex-row gap-8 items-start">
        
        {/* LEFT: Persistent Sidebar */}
        <div 
          className={`w-full xl:w-96 flex-shrink-0 xl:pr-1 space-y-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 ${isSidebarPinned ? 'xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto' : ''}`}
          style={{ colorScheme: 'light' }}
        >
            
            {/* Global Assumptions */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-slate-900">
               <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Settings className="w-5 h-5" /> Global Assumptions
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleResetDefaults}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-100"
                      title="Reset all inputs to standard defaults"
                    >
                      <RefreshCcw size={15} />
                    </button>
                    <button 
                      onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                      className="text-slate-300 hover:text-slate-900 transition-colors p-1"
                      title={isSidebarPinned ? "Unpin Sidebar" : "Pin Sidebar"}
                    >
                      {isSidebarPinned ? <Pin size={16} className="fill-current" /> : <PinOff size={16} />}
                    </button>
                  </div>
               </div>

               {/* Advisor Presets Bar */}
               <div className="mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                 <div className="flex items-center justify-between mb-1.5">
                   <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                     <Sparkles className="w-3 h-3 text-amber-500" /> Advisor Presets
                   </span>
                 </div>
                 <div className="grid grid-cols-3 gap-1.5">
                   <button
                     type="button"
                     onClick={() => handleApplyPreset('balanced')}
                     className="px-1.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 transition-colors text-center truncate"
                     title="Equal PIAs ($3,400) and symmetrical FRA claim (67/67)"
                   >
                     Balanced
                   </button>
                   <button
                     type="button"
                     onClick={() => handleApplyPreset('asymmetric')}
                     className="px-1.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 transition-colors text-center truncate"
                     title="Primary earner delays to 70, lower earner claims early at 62"
                   >
                     Asymmetric
                   </button>
                   <button
                     type="button"
                     onClick={() => handleApplyPreset('longevity')}
                     className="px-1.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 transition-colors text-center truncate"
                     title="Significant longevity gap (Age 78 vs. 96)"
                   >
                     Longevity
                   </button>
                 </div>
               </div>

               <div className="space-y-6">
                 {/* Toggle Dollar Value */}
                 <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><DollarSign className="w-3 h-3"/> Dollar Value</span>
                    <div className="flex bg-white rounded border border-slate-200 p-0.5">
                       <button 
                          onClick={() => setUseRealDollars(true)}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${useRealDollars ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                       >
                          Today's
                       </button>
                       <button 
                          onClick={() => setUseRealDollars(false)}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${!useRealDollars ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                       >
                          Future
                       </button>
                    </div>
                 </div>

                 <div>
                   <label className={`block text-xs font-medium uppercase mb-2 ${useRealDollars ? 'text-slate-400' : 'text-slate-500'}`}>
                     General Inflation Rate (=SS COLA): <span className={`font-bold ml-1 ${useRealDollars ? 'text-slate-400' : 'text-slate-900'}`}>{formatPct(cola)}</span>
                   </label>
                   <input 
                     type="range" min={SS_MIN_COLA_PCT / 100} max={SS_MAX_COLA_PCT / 100} step="0.001" 
                     value={cola} onChange={e => handleColaChange(Number(e.target.value))} 
                     disabled={useRealDollars}
                     className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${useRealDollars ? 'bg-slate-100' : 'bg-slate-200 accent-slate-900'}`} 
                   />
                   <div className="flex justify-between text-xs text-slate-400 mt-1"><span>0%</span><span>5%</span><span>10%</span></div>
                 </div>

                 <div>
                   <label className="block text-xs font-medium text-slate-500 uppercase mb-2">
                     Real Investment Return: <span className="text-slate-900 font-bold ml-1">{formatPct(realReturn)}</span>
                   </label>
                   <input 
                     type="range" min={SS_MIN_REAL_RETURN_PCT / 100} max={SS_MAX_REAL_RETURN_PCT / 100} step="0.005" list="return-markers"
                     value={realReturn} onChange={e => handleRealReturnChange(Number(e.target.value))} 
                     className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900" 
                   />
                   <datalist id="return-markers">
                     <option value="-0.10"></option>
                     <option value="-0.05"></option>
                     <option value="0"></option>
                     <option value="0.05"></option>
                     <option value="0.10"></option>
                     <option value="0.15"></option>
                     <option value="0.20"></option>
                   </datalist>
                   <div className="flex justify-between text-xs text-slate-400 mt-1 px-1"><span>-10%</span><span>0%</span><span>+10%</span><span>+20%</span></div>
                   <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                     Return on invested benefits above inflation. Net nominal growth rate: <strong>{formatPct((1+realReturn)*(1 + (useRealDollars ? 0 : cola))-1)}</strong>.
                   </p>
                 </div>

                 {/* Solvency Toggle */}
                 <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-slate-400" />
                          <label className="text-sm font-medium text-slate-700">Apply Solvency Haircut?</label>
                       </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={applyHaircut} onChange={e => setApplyHaircut(e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-slate-900 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                       </label>
                    </div>
                    
                    {applyHaircut && (
                      <div className="mb-2 pl-6 animate-in fade-in slide-in-from-top-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                          Benefits Payable: <span className="text-slate-900 font-bold ml-1">{haircutPct}%</span>
                        </label>
                        <input 
                           type="range" min="50" max="100" step="1" 
                           value={haircutPct} onChange={e => setHaircutPct(Number(e.target.value))} 
                           className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900" 
                        />
                         <div className="flex justify-between text-xs text-slate-400 mt-1"><span>50%</span><span>75%</span><span>100%</span></div>
                      </div>
                    )}
                 </div>
               </div>
            </div>

            {/* Partner A Input */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
              <div className="mb-4">
                 <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Partner A</label>
                 <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={nameA} 
                      onChange={(e) => setNameA(e.target.value)}
                      className="text-lg font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent w-full"
                    />
                    <Edit3 className="w-4 h-4 text-slate-300" />
                 </div>
                 
                 <div className="flex items-center justify-between mt-4">
                   <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase"><Calendar className="w-3 h-3"/> Birth Year</label>
                   <input 
                     type="number" 
                     min="1900" max="2010"
                     value={birthYearA} 
                     onChange={e => handleBirthYearA(parseInt(e.target.value) || DEFAULT_BIRTH_YEAR)}
                     className="w-20 text-right text-sm border-b border-slate-300 focus:border-blue-500 outline-none bg-transparent font-bold text-slate-700"
                   />
                 </div>
              </div>

              <div className="space-y-4">
                <div>
                   <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Life Expectancy: <span className="text-blue-600 font-bold text-base ml-1">{lifeExpA}</span></label>
                   <input type="range" min="50" max="105" step="1" value={lifeExpA} onChange={e => handleLifeExpA(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                   <div className="flex justify-between text-xs text-slate-400 mt-1"><span>60</span><span>70</span><span>80</span><span>90</span><span>100</span></div>
                </div>

                <div>
                   <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Claim Age: <span className="text-blue-600 font-bold text-base ml-1">{claimAgeA}</span></label>
                   <input type="range" min="62" max="70" step="1" value={claimAgeA} onChange={e => setClaimAgeA(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                   <div className="flex justify-between text-xs text-slate-400 mt-1"><span>62</span><span>66</span><span>70</span></div>
                </div>
                
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                     <span className="text-xs font-medium text-slate-500 uppercase">Marital Status</span>
                      <div className="flex items-center gap-2">
                         <span className={`text-xs ${!isMarried ? 'font-bold text-slate-700' : 'text-slate-400'}`}>Single</span>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isMarried} onChange={e => setIsMarried(e.target.checked)} className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                         </label>
                         <span className={`text-xs ${isMarried ? 'font-bold text-blue-600' : 'text-slate-400'}`}>Married</span>
                      </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                   <div className="flex flex-wrap items-center gap-4 mb-2">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <input 
                          type="radio" 
                          checked={piaMethodA === 'manual'} 
                          onChange={() => setPiaMethodA('manual')} 
                          className="appearance-none w-3.5 h-3.5 rounded-full border border-slate-300 bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors mt-0.5"
                        /> 
                        Manual PIA
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <input 
                          type="radio" 
                          checked={piaMethodA === 'aime'} 
                          onChange={() => setPiaMethodA('aime')} 
                          className="appearance-none w-3.5 h-3.5 rounded-full border border-slate-300 bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors mt-0.5"
                        /> 
                        Manual AIME
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <input 
                          type="radio" 
                          checked={piaMethodA === 'earnings'} 
                          onChange={() => setPiaMethodA('earnings')} 
                          className="appearance-none w-3.5 h-3.5 rounded-full border border-slate-300 bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors mt-0.5"
                        /> 
                        Earnings
                      </label>
                   </div>
                   {piaMethodA === 'manual' && (<TaxInputBox value={manualPiaA} onChange={handleManualPiaA} />)}
                   {piaMethodA === 'aime' && (<TaxInputBox value={manualAimeA} onChange={handleManualAimeA} />)}
                   {piaMethodA === 'earnings' && (<textarea rows={3} value={earningsA} onChange={e => setEarningsA(e.target.value)} className="block w-full rounded border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs font-mono bg-slate-50 p-2 border" />)}
                   <div className="mt-2 pt-2 border-t border-slate-50 text-xs flex justify-between items-center text-slate-500">
                      <span>Effective PIA: <strong>{formatCurrency(profileA.pia)}/mo</strong></span>
                   </div>
                </div>
              </div>
            </div>

            {/* Partner B Input */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-rose-500">
              <div className="mb-4">
                 <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Partner B</label>
                 <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={nameB} 
                      onChange={(e) => setNameB(e.target.value)}
                      className="text-lg font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-rose-500 focus:outline-none bg-transparent w-full"
                    />
                    <Edit3 className="w-4 h-4 text-slate-300" />
                 </div>
                 <div className="flex items-center justify-between mt-4">
                   <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase"><Calendar className="w-3 h-3"/> Birth Year</label>
                   <input 
                     type="number" 
                     min="1900" max="2010"
                     value={birthYearB} 
                     onChange={e => handleBirthYearB(parseInt(e.target.value) || DEFAULT_BIRTH_YEAR)}
                     className="w-20 text-right text-sm border-b border-slate-300 focus:border-rose-500 outline-none bg-transparent font-bold text-slate-700"
                   />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                   <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Life Expectancy: <span className="text-rose-600 font-bold text-base ml-1">{lifeExpB}</span></label>
                   <input type="range" min="50" max="105" step="1" value={lifeExpB} onChange={e => handleLifeExpB(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600" />
                   <div className="flex justify-between text-xs text-slate-400 mt-1"><span>60</span><span>70</span><span>80</span><span>90</span><span>100</span></div>
                </div>

                <div>
                   <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Claim Age: <span className="text-rose-600 font-bold text-base ml-1">{claimAgeB}</span></label>
                   <input type="range" min="62" max="70" step="1" value={claimAgeB} onChange={e => setClaimAgeB(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600" />
                   <div className="flex justify-between text-xs text-slate-400 mt-1"><span>62</span><span>66</span><span>70</span></div>
                </div>
                
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between opacity-80" title="Change this in Partner A's card">
                     <span className="text-xs font-medium text-slate-500 uppercase">Marital Status (Linked)</span>
                      <div className="flex items-center gap-2">
                         <span className={`text-xs ${!isMarried ? 'font-bold text-slate-700' : 'text-slate-400'}`}>Single</span>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isMarried} onChange={e => setIsMarried(e.target.checked)} className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                         </label>
                         <span className={`text-xs ${isMarried ? 'font-bold text-blue-600' : 'text-slate-400'}`}>Married</span>
                      </div>
                </div>

                 <div className="border-t border-slate-100 pt-3">
                   <div className="flex flex-wrap items-center gap-4 mb-2">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <input 
                          type="radio" 
                          checked={piaMethodB === 'manual'} 
                          onChange={() => setPiaMethodB('manual')} 
                          className="appearance-none w-3.5 h-3.5 rounded-full border border-slate-300 bg-white checked:bg-rose-600 checked:border-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 transition-colors mt-0.5"
                        /> 
                        Manual PIA
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <input 
                          type="radio" 
                          checked={piaMethodB === 'aime'} 
                          onChange={() => setPiaMethodB('aime')} 
                          className="appearance-none w-3.5 h-3.5 rounded-full border border-slate-300 bg-white checked:bg-rose-600 checked:border-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 transition-colors mt-0.5"
                        /> 
                        Manual AIME
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <input 
                          type="radio" 
                          checked={piaMethodB === 'earnings'} 
                          onChange={() => setPiaMethodB('earnings')} 
                          className="appearance-none w-3.5 h-3.5 rounded-full border border-slate-300 bg-white checked:bg-rose-600 checked:border-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 transition-colors mt-0.5"
                        /> 
                        Earnings
                      </label>
                   </div>
                   {piaMethodB === 'manual' && (<TaxInputBox value={manualPiaB} onChange={handleManualPiaB} />)}
                   {piaMethodB === 'aime' && (<TaxInputBox value={manualAimeB} onChange={handleManualAimeB} />)}
                   {piaMethodB === 'earnings' && (<textarea rows={3} value={earningsB} onChange={e => setEarningsB(e.target.value)} className="block w-full rounded border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-xs font-mono bg-slate-50 p-2 border" />)}
                   <div className="mt-2 pt-2 border-t border-slate-50 text-xs flex justify-between items-center text-slate-500">
                      <span>Effective PIA: <strong>{formatCurrency(profileB.pia)}/mo</strong></span>
                   </div>
                </div>
              </div>
            </div>

        </div>

        {/* RIGHT: Results Column */}
        <div className="flex-1 min-w-0 space-y-6">
            
            {/* SCORECARD (Sticky) */}
            <div className={`${isScorecardPinned ? 'sticky top-16 z-30' : ''} bg-slate-50 pb-2 -mt-4 pt-4`}>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
                 {/* Pin Toggle for Scorecard */}
                 <button 
                    onClick={() => setIsScorecardPinned(!isScorecardPinned)}
                    className="absolute top-2 right-2 z-50 p-1.5 rounded-full bg-white/50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                    title={isScorecardPinned ? "Unpin Scorecard" : "Pin Scorecard"}
                 >
                    {isScorecardPinned ? <Pin size={14} className="fill-current" /> : <PinOff size={14} />}
                 </button>

                 {/* Global Alert */}
                 {betterStrategyAvailable && (
                   <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold uppercase tracking-wider">
                         <Lightbulb className="w-4 h-4" />
                         Opportunity Alert
                      </div>
                      <div className="text-sm text-amber-900 pr-4">
                         Switching to <span className="font-bold underline">{globalOptimal.isMarried ? "Married" : "Unmarried"}</span> would add <span className="font-bold">{formatMillions(globalGap)}</span> to the optimal strategy.
                      </div>
                   </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-10 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {/* Optimal Row Header */}
                    <div className="md:col-span-3 p-6 flex flex-col justify-center bg-emerald-50/50">
                       <div className="text-base font-bold uppercase tracking-wider text-emerald-600 mb-2 flex items-center gap-1">
                         <Trophy className="w-5 h-5" /> Optimal Strategy
                       </div>
                       <div className="text-4xl font-extrabold text-slate-900 mb-4">{formatMillions(maxLifetimeLocal)}</div>
                       
                       <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center border-b border-emerald-100 pb-1">
                            <span className="text-xs text-slate-500 uppercase font-bold">{nameA} Claim Age</span>
                            <span className="text-xl font-bold text-emerald-700">{localOptimal.ageA}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-xs text-slate-500 uppercase font-bold">{nameB} Claim Age</span>
                            <span className="text-xl font-bold text-emerald-700">{localOptimal.ageB}</span>
                          </div>
                       </div>
                    </div>

                    {/* Data Points */}
                    <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">

                         {/* Current Details */}
                         <div className="p-6 flex flex-col justify-center bg-blue-50/30">
                           <div className="text-base font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                              <Target className="w-5 h-5" /> Selected Strategy
                           </div>
                           <div className="text-3xl font-extrabold text-slate-900 mb-2">{formatMillions(currentCash)}</div>

                           <div className="flex items-baseline gap-4 mt-1">
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase font-semibold block">{nameA} Claim</span>
                                <span className="text-lg font-bold text-blue-700">{claimAgeA}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase font-semibold block">{nameB} Claim</span>
                                <span className="text-lg font-bold text-blue-700">{claimAgeB}</span>
                              </div>
                           </div>
                        </div>

                        {/* Gap Analysis */}
                        <div className="p-6 flex flex-col justify-center">
                           <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Analysis</div>
                           <div className="space-y-3">
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Gap to Optimal:</span>
                                <span className={`font-bold ${gap > 1000 ? 'text-amber-600' : 'text-slate-300'}`}>
                                   {gap > 1000 ? `-${formatMillions(gap)}` : '$0.00M'}
                                </span>
                             </div>
                             
                             <div className="flex justify-between items-center text-sm">
                                 <span className="text-slate-500">{isMarried ? "Unmarried" : "Marriage"} Gain:</span>
                                 <span className={`font-bold ${globalGap > 1000 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                     {globalGap > 1000 ? `+${formatMillions(globalGap)}` : '$0.00M'}
                                 </span>
                             </div>

                             <div className="flex justify-between items-center text-sm">
                                 <span className="text-slate-500">Min-Opt Spread:</span>
                                 <span className="font-bold text-slate-700">
                                     {formatMillions(spreadVal)}
                                 </span>
                             </div>
                             
                           </div>
                        </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* CARD 2.5: Interactive 81-Pair Claiming Strategy Grid */}
            <StrategyHeatmap
              grid={strategyAnalysis.grid}
              min={strategyAnalysis.min}
              max={strategyAnalysis.max}
              claimAgeA={claimAgeA}
              claimAgeB={claimAgeB}
              nameA={nameA}
              nameB={nameB}
              onSelectStrategy={(ageA, ageB) => {
                setClaimAgeA(ageA);
                setClaimAgeB(ageB);
              }}
            />

            {/* CARD 3: Main Strategy Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                 <div>
                   <h3 className="text-lg font-bold text-slate-800">
                     {chartMode === 'crossover' ? 'When Delay Pays Off (Break-Even Analysis)' : 'Projected Portfolio Growth over Time'}
                   </h3>
                   <div className="text-xs text-slate-500">
                     {chartMode === 'crossover' 
                       ? 'Net lifetime wealth difference vs. claiming at 62 (crossing above $0 indicates break-even age)' 
                       : 'Projected portfolio growth over time (including reinvestment)'}
                   </div>
                 </div>
                 <div className="flex flex-wrap items-center gap-3 text-sm">
                   <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                     <button
                       type="button"
                       onClick={() => setChartMode('crossover')}
                       className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                         chartMode === 'crossover'
                           ? 'bg-white text-indigo-600 shadow-sm'
                           : 'text-slate-600 hover:text-slate-900'
                       }`}
                     >
                       Break-Even vs. 62
                     </button>
                     <button
                       type="button"
                       onClick={() => setChartMode('cumulative')}
                       className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                         chartMode === 'cumulative'
                           ? 'bg-white text-indigo-600 shadow-sm'
                           : 'text-slate-600 hover:text-slate-900'
                       }`}
                     >
                       Cumulative Portfolio
                     </button>
                   </div>
                   <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                     <input type="checkbox" checked={showOptimalLine} onChange={e => setShowOptimalLine(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                     Optimal
                   </label>
                 </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md mb-4 border border-amber-100">
                  <Info className="w-3 h-3 flex-shrink-0" />
                  <span>Simulations utilize 2026 SSA Actuarial Constants (Bend Points, Tax Max through 2026, AWI). Projections assume current statutory schedules.</span>
              </div>
              <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 80, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="year" 
                      domain={[0, 35]} 
                      ticks={chartTicks} 
                      tickFormatter={(val) => val % 5 === 0 ? val : ''} 
                      type="number" 
                      tick={{fill: '#64748b', fontSize: 12}} 
                      label={{ value: 'Retirement Year (Age from 62)', position: 'insideBottom', offset: -5, style: {fill: '#64748b', fontSize: 12} }} 
                    />
                    <YAxis 
                      domain={chartDomain} 
                      ticks={chartYTicks} 
                      label={{ 
                        value: chartMode === 'crossover' ? 'Net Difference vs. Claim at 62' : 'Projected Value', 
                        angle: -90, 
                        position: 'insideLeft', 
                        offset: 10, 
                        style: {fill: '#64748b', fontSize: 12, textAnchor: 'middle'} 
                      }} 
                      tickFormatter={(val) => {
                        if (val === 0) return '$0';
                        const sign = val > 0 ? '+' : '-';
                        const abs = Math.abs(val);
                        if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
                        return `${sign}$${Math.round(abs / 1000)}k`;
                      }} 
                      tick={{fill: '#64748b', fontSize: 12}} 
                    />
                    <Tooltip 
                      formatter={(val: number) => {
                        if (val === 0) return '$0';
                        return `${val > 0 ? '+' : ''}${formatCurrency(val)}`;
                      }} 
                      labelFormatter={(label) => {
                        const item = chartData.find(d => d.year === label);
                        return item ? `Retirement Year ${label} (${item.calYear})` : `Year ${label}`;
                      }} 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    />
                    <Legend verticalAlign="top" height={36}/>
                    {chartMode === 'crossover' ? (
                      <>
                        <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} strokeDasharray="3 3">
                          <Label value="Break-Even ($0 vs Claim at 62)" position="insideBottomRight" fill="#475569" fontSize={11} offset={6} />
                        </ReferenceLine>
                        <Line type="monotone" dataKey="Your Strategy" stroke="#2563eb" strokeWidth={3.5} dot={false} />
                        {showOptimalLine && (<Line type="monotone" dataKey="Optimal Strategy" stroke="#15803d" strokeWidth={3} dot={false} />)}
                        <Line type="monotone" dataKey="Both at FRA (67)" stroke="#d97706" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="Both at 70" stroke="#7c3aed" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                      </>
                    ) : (
                      <>
                        <Line type="monotone" dataKey="Worst Case" stroke="#dc2626" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="Your Strategy" stroke="#2563eb" strokeWidth={4} dot={false} />
                        {showOptimalLine && (<Line type="monotone" dataKey="Optimal Strategy" stroke="#15803d" strokeWidth={2} dot={false} />)}
                        <ReferenceLine segment={[{ x: claimRefs.claimA.x, y: 0 }, { x: claimRefs.claimA.x, y: claimRefs.claimA.height }]} stroke={claimRefs.claimA.color} strokeWidth={3}>
                          <Label value={claimRefs.claimA.label} position="top" offset={10} fontSize={10} fill={claimRefs.claimA.color} style={{ textAnchor: 'start' }} dx={5} />
                        </ReferenceLine>
                        <ReferenceLine segment={[{ x: claimRefs.claimB.x, y: 0 }, { x: claimRefs.claimB.x, y: claimRefs.claimB.height }]} stroke={claimRefs.claimB.color} strokeWidth={3}>
                          <Label value={claimRefs.claimB.label} position="top" offset={10} fontSize={10} fill={claimRefs.claimB.color} style={{ textAnchor: 'start' }} dx={5} />
                        </ReferenceLine>
                        <ReferenceLine segment={[{ x: deathRefs.deathA.x, y: 0 }, { x: deathRefs.deathA.x, y: deathRefs.deathA.val }]} stroke={claimRefs.claimA.color} strokeWidth={1}>
                          <Label value={`Death ${nameA}`} position="insideTopLeft" offset={10} fontSize={10} fill={claimRefs.claimA.color} />
                        </ReferenceLine>
                        <ReferenceLine segment={[{ x: deathRefs.deathB.x, y: 0 }, { x: deathRefs.deathB.x, y: deathRefs.deathB.val }]} stroke={claimRefs.claimB.color} strokeWidth={1}>
                          <Label value={`Death ${nameB}`} position="insideTopLeft" offset={10} fontSize={10} fill={claimRefs.claimB.color} />
                        </ReferenceLine>
                        <ReferenceLine segment={[{ x: 0, y: deathRefs.final.val }, { x: deathRefs.final.x, y: deathRefs.final.val }]} stroke="#64748b" strokeDasharray="3 3">
                          <Label value={`Final: ${formatMillions(deathRefs.final.val)}`} position="insideBottomRight" offset={10} fontSize={10} fill="#666" />
                        </ReferenceLine>
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* CARD 4: Tax Bomb Simulator */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                   <h3 className="text-lg font-bold text-slate-800">Federal Tax Implications with RMDs</h3>
                   <p className="text-sm text-slate-500">Snapshot at Age 75: Projected Tax Liability Comparison</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2">
                   <div className="p-6 border-r border-slate-200 bg-slate-50/50">
                       <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Financial Inputs</h4>
                       <div className="grid grid-cols-2 gap-4 mb-2 px-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{nameA}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{nameB}</div>
                       </div>
                       <div className="space-y-6">
                           <div>
                              <div className="flex justify-between text-xs font-medium text-slate-700 mb-2"><span>Qualified Savings (401k/IRA)</span><span className="text-slate-400 text-[10px]">Current Balance</span></div>
                              <div className="grid grid-cols-2 gap-4"><TaxInputBox value={savingsA} onChange={setSavingsA} /><TaxInputBox value={savingsB} onChange={setSavingsB} /></div>
                           </div>
                           <div>
                              <div className="flex justify-between text-xs font-medium text-slate-700 mb-2"><span>Annual Contributions</span><span className="text-slate-400 text-[10px]">Amount / Until Age</span></div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex gap-2">
                                   <div className="flex-1"><TaxInputBox value={contribA} onChange={setContribA} /></div>
                                   <div className="w-14 relative">
                                      <span className="absolute left-1 top-1.5 text-xs text-slate-400">@</span>
                                      <IntegerInput value={contribEndAgeA} onChange={setContribEndAgeA} className="w-full text-xs pl-4 py-1.5 border rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Age" />
                                   </div>
                                </div>
                                <div className="flex gap-2">
                                   <div className="flex-1"><TaxInputBox value={contribB} onChange={setContribB} /></div>
                                   <div className="w-14 relative">
                                      <span className="absolute left-1 top-1.5 text-xs text-slate-400">@</span>
                                      <IntegerInput value={contribEndAgeB} onChange={setContribEndAgeB} className="w-full text-xs pl-4 py-1.5 border rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Age" />
                                   </div>
                                </div>
                              </div>
                           </div>
                           <div className="pt-2 border-t border-slate-200">
                              <label className="text-xs font-medium text-slate-700 block mb-2">Other Income (pension, interest, etc) at Age 75</label>
                              <div className="space-y-2">
                                 <div className="grid grid-cols-2 gap-4"><TaxInputBox value={otherIncA1} onChange={setOtherIncA1} placeholder="Source 1" /><TaxInputBox value={otherIncB1} onChange={setOtherIncB1} placeholder="Source 1" /></div>
                                 <div className="grid grid-cols-2 gap-4"><TaxInputBox value={otherIncA2} onChange={setOtherIncA2} placeholder="Source 2" /><TaxInputBox value={otherIncB2} onChange={setOtherIncB2} placeholder="Source 2" /></div>
                                 <div className="grid grid-cols-2 gap-4"><TaxInputBox value={otherIncA3} onChange={setOtherIncA3} placeholder="Source 3" /><TaxInputBox value={otherIncB3} onChange={setOtherIncB3} placeholder="Source 3" /></div>
                              </div>
                           </div>
                           <div className="pt-2 border-t border-slate-200">
                              <label className="text-xs font-medium text-slate-700 block mb-2">Charitable Giving (QCDs) at Age 75</label>
                              <div className="grid grid-cols-2 gap-4"><TaxInputBox value={qcdA} onChange={setQcdA} /><TaxInputBox value={qcdB} onChange={setQcdB} /></div>
                           </div>
                           <div className="pt-4 mt-4 border-t border-slate-200">
                               <div className="flex justify-between items-end mb-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Projected Qualified Balance (Age 75, {taxAnalysis.currencyMode})</label>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="text-right">
                                     <div className="text-[10px] text-slate-400">Partner A</div>
                                     <div className="text-sm font-bold text-slate-800">{formatCurrency(taxAnalysis.balances.projBalA)}</div>
                                  </div>
                                  <div className="text-right">
                                     <div className="text-[10px] text-slate-400">Partner B</div>
                                     <div className="text-sm font-bold text-slate-800">{formatCurrency(taxAnalysis.balances.projBalB)}</div>
                                  </div>
                               </div>
                           </div>
                       </div>
                   </div>
                   <div className="p-6 flex flex-col justify-center">
                       <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6 flex justify-between">
                         <span>Tax Liability (Age 75)</span>
                         <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] normal-case border border-indigo-100">2025 Brackets</span>
                       </h4>
                       <div className="space-y-6">
                           <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-50 border border-slate-200 rounded p-4 text-center">
                                 <div className="text-xs text-slate-500 mb-3 font-bold uppercase tracking-wider">Unmarried (Combined)</div>
                                 
                                 <div className="space-y-1 mb-4 border-b border-slate-100 pb-3">
                                   <div className="flex justify-between items-center text-[10px]">
                                     <span className="text-slate-400 whitespace-nowrap">RMDs</span>
                                     <span className="font-semibold text-slate-700">{formatCurrency(taxAnalysis.single.taxableRmd)}</span>
                                   </div>
                                   <div className="flex justify-between items-center text-[10px]">
                                     <span className="text-slate-400">Taxable SS</span>
                                     <span className="font-semibold text-slate-700">{formatCurrency(taxAnalysis.single.taxableSS)}</span>
                                   </div>
                                   <div className="flex justify-between items-center text-[10px]">
                                     <span className="text-slate-400">Other Income</span>
                                     <span className="font-semibold text-slate-700">{formatCurrency(taxAnalysis.single.otherIncome)}</span>
                                   </div>
                                 </div>

                                 <div className="mb-3"><div className="text-[10px] text-slate-400 uppercase">Projected AGI</div><div className="text-sm font-semibold text-slate-700">{formatCurrency(taxAnalysis.single.agi)}</div></div>
                                 <div className="mb-3"><div className="text-[10px] text-slate-400 uppercase">Est. Tax Liability</div><div className="text-2xl font-bold text-slate-800">{formatCurrency(taxAnalysis.single.total)}</div></div>
                                 <div className="mb-3"><div className="text-[10px] text-slate-400 uppercase">Effective Rate</div><div className="text-sm font-bold text-slate-600">{formatPct(taxAnalysis.single.effectiveRate)}</div></div>
                                 <div>
                                   <div className="text-[10px] text-slate-400 uppercase">Top Marginal Bracket</div>
                                   <div className="text-sm font-bold text-slate-600 flex justify-center gap-2">
                                     <span title={nameA}>{nameA}: {formatPct(taxAnalysis.single.detailsA.marginalRate)}</span>
                                     <span className="text-slate-300">|</span>
                                     <span title={nameB}>{nameB}: {formatPct(taxAnalysis.single.detailsB.marginalRate)}</span>
                                   </div>
                                 </div>
                              </div>
                              <div className="bg-indigo-50 border border-indigo-200 rounded p-4 text-center relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-200 rounded-bl-full z-0 opacity-50"></div>
                                 <div className="text-xs text-indigo-800 mb-3 font-bold uppercase tracking-wider relative z-10">Married Filing Jointly</div>
                                 
                                 <div className="space-y-1 mb-4 border-b border-indigo-100 pb-3 relative z-10">
                                   <div className="flex justify-between items-center text-[10px]">
                                     <span className="text-indigo-400 whitespace-nowrap">RMDs</span>
                                     <span className="font-semibold text-indigo-800">{formatCurrency(taxAnalysis.joint.taxableRmd)}</span>
                                   </div>
                                   <div className="flex justify-between items-center text-[10px]">
                                     <span className="text-indigo-400">Taxable SS</span>
                                     <span className="font-semibold text-indigo-800">{formatCurrency(taxAnalysis.joint.taxableSS)}</span>
                                   </div>
                                   <div className="flex justify-between items-center text-[10px]">
                                     <span className="text-indigo-400">Other Income</span>
                                     <span className="font-semibold text-indigo-800">{formatCurrency(taxAnalysis.joint.otherIncome)}</span>
                                   </div>
                                 </div>

                                 <div className="mb-3 relative z-10"><div className="text-[10px] text-indigo-400 uppercase">Projected AGI</div><div className="text-sm font-semibold text-indigo-900">{formatCurrency(taxAnalysis.joint.agi)}</div></div>
                                 <div className="mb-3 relative z-10"><div className="text-[10px] text-indigo-400 uppercase">Est. Tax Liability</div><div className="text-2xl font-bold text-indigo-900">{formatCurrency(taxAnalysis.joint.total)}</div></div>
                                 <div className="relative z-10 mb-3"><div className="text-[10px] text-indigo-400 uppercase">Effective Rate</div><div className="text-sm font-bold text-indigo-900">{formatPct(taxAnalysis.joint.effectiveRate)}</div></div>
                                 <div className="relative z-10"><div className="text-[10px] text-indigo-400 uppercase">Top Marginal Bracket</div><div className="text-sm font-bold text-indigo-900">{formatPct(taxAnalysis.joint.details.marginalRate)}</div></div>
                              </div>
                           </div>
                           {!taxAnalysis.isSignificant ? (
                             <div className="rounded-lg p-4 border-l-4 bg-slate-100 border-slate-400 text-slate-600">
                               <div className="flex items-start gap-3"><Minus className="w-5 h-5 flex-shrink-0 mt-0.5" /><div><div className="font-bold text-sm mb-1">No Significant Difference ({formatPct(Math.abs(taxAnalysis.diffPct))})</div><p className="text-xs opacity-90 leading-relaxed">At age 75, filing jointly results in a tax liability nearly identical to filing as two single individuals (within 2%).</p></div></div>
                             </div>
                           ) : (
                             <div className={`rounded-lg p-4 border-l-4 ${taxAnalysis.diff > 0 ? 'bg-red-50 border-red-500 text-red-900' : 'bg-emerald-50 border-emerald-500 text-emerald-900'}`}>
                               <div className="flex items-start gap-3">{taxAnalysis.diff > 0 ? <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <Trophy className="w-5 h-5 flex-shrink-0 mt-0.5" />}<div><div className="font-bold text-sm mb-1">{taxAnalysis.diff > 0 ? "Marriage Penalty Detected" : "Marriage Bonus Detected"}</div><p className="text-xs opacity-90 leading-relaxed">At age 75, filing jointly results in a <span className="font-bold">{formatCurrency(Math.abs(taxAnalysis.diff))} ({formatPct(Math.abs(taxAnalysis.diffPct))}) {taxAnalysis.diff > 0 ? 'increase' : 'decrease'}</span> in annual federal taxes compared to filing as two single individuals.</p>{taxAnalysis.diff > 0 && (<p className="text-[10px] mt-2 opacity-75">This is often caused by the "Tax Torpedo" where combined RMDs and Social Security push the couple into higher tax brackets more quickly than the single brackets allow.</p>)}</div></div>
                             </div>
                           )}
                       </div>
                   </div>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
};

export default App;