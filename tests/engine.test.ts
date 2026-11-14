import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as engine from '../services/engine';
import { PersonProfile } from '../types';

const fixturePath = fileURLToPath(new URL('./fixtures/ss_golden_vectors.json', import.meta.url));
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));
const eng = engine as any;

const person = (id: string, p: { birth_year: number; pia: number; life_expectancy: number }): PersonProfile => ({
  id, name: id, birthYear: p.birth_year, lifeExpectancy: p.life_expectancy, claimAge: 67,
  piaInputMethod: 'manual', manualPia: p.pia, manualAime: 0, earningsInput: '', parsedEarnings: [],
  pia: p.pia, aime: 0,
});

const runHousehold = (input: any) =>
  engine.simulateHousehold(
    person('A', input.persons.a), person('B', input.persons.b),
    input.claim_age_a, input.claim_age_b, input.married,
    input.cola, input.real_return, input.solvency,
    { solvencyStartYear: input.solvency_start_year ?? undefined, currentYear: input.current_year } as any,
  );

const handlers: Record<string, (input: any, expected: any) => void> = {
  own_benefit: (input, expected) => {
    input.claim_ages.forEach((claimAge: number, i: number) => {
      const a = { birth_year: input.birth_year, pia: input.pia, life_expectancy: 90 };
      const b = { birth_year: input.birth_year, pia: 0, life_expectancy: 90 };
      const sim = runHousehold({
        persons: { a, b }, claim_age_a: claimAge, claim_age_b: 70, married: false,
        cola: 0, real_return: 0, solvency: 1, current_year: 2026,
      });
      const row = sim.find(r => r.ageA === claimAge)!;
      expect(row.benefitA / 12, `claim ${claimAge}`).toBe(expected.monthly[i]);
      if (eng.benefitAdjustmentFactor) {
        expect(eng.benefitAdjustmentFactor(claimAge, input.birth_year)).toBeCloseTo(expected.factors[i], 5);
      }
    });
  },
  pia_from_aime: (input, expected) => {
    const pia = eng.piaFromAimeForBirthYear
      ? eng.piaFromAimeForBirthYear(input.aime, input.birth_year)
      : engine.calculatePIAFromAIME(input.aime);
    expect(pia).toBe(expected.pia);
    if (eng.getBendPoints) expect(eng.getBendPoints(input.birth_year).year).toBe(expected.bend_point_year);
  },
  pia_from_earnings: (input, expected) => {
    const earnings = input.earnings.map(([year, amount]: [number, number]) => ({ year, amount }));
    const r = engine.calculatePIA(input.birth_year, earnings, input.current_year);
    expect(r.aime).toBe(expected.aime);
    expect(r.pia).toBe(expected.pia);
    expect(r.bendPointYear).toBe(expected.bend_point_year);
    expect(r.indexingYear).toBe(expected.indexing_year);
  },
  household: (input, expected) => {
    const sim = runHousehold(input);
    for (const [key, map] of Object.entries(expected) as [string, Record<string, number>][]) {
      const m = key.match(/^monthly_([ab])_(at_age|in_year)$/)!;
      const who = m[1].toUpperCase();
      for (const [k, v] of Object.entries(map)) {
        const row = m[2] === 'at_age'
          ? sim.find(r => (who === 'A' ? r.ageA : r.ageB) === Number(k))
          : sim.find(r => r.year === Number(k));
        expect(row, `${key}[${k}] row`).toBeDefined();
        const annual = who === 'A' ? row!.benefitA : row!.benefitB;
        expect(Math.round(annual / 12), `${key}[${k}]`).toBe(v);
      }
    }
  },
  taxable_ss: (input, expected) => {
    const v = (engine.calculateTaxableSS as any)(input.ss, input.other_income, input.married, input.tax_exempt_interest);
    expect(v).toBeCloseTo(expected.taxable_ss, 2);
  },
  federal_tax: (input, expected) => {
    const tax = (engine.calculateFederalTax as any)(input.taxable_income, input.married, input.table_year);
    expect(tax).toBeCloseTo(expected.tax, 2);
    const rate = (engine.getMarginalTaxRate as any)(input.taxable_income, input.married, input.table_year);
    expect(rate).toBe(expected.marginal_rate);
  },
  standard_deduction: (input, expected) => {
    expect(eng.standardDeduction, 'standardDeduction() exported').toBeTypeOf('function');
    expect(eng.standardDeduction(input.married, input.count_65_plus, input.table_year)).toBe(expected.standard_deduction);
  },
};

describe('golden vectors', () => {
  for (const c of fixture.cases) {
    it(`${c.id} (${c.rule})`, () => {
      const h = handlers[c.rule];
      expect(h, `handler for rule ${c.rule}`).toBeDefined();
      h(c.input, c.expected);
    });
  }
});
