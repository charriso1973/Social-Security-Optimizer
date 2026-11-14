import { EarningsRecord } from './types';

// ==============================================================================
// SSA Statutory Actuarial Constants
// Auto-refreshed from SSA.gov on: 2026-11-14 12:33:33
// Sources:
// - AWI Series: https://www.ssa.gov/oact/cola/awiseries.html
// - PIA Bend Points: https://www.ssa.gov/oact/COLA/bendpoints.html
// - Contribution Base: https://www.ssa.gov/oact/cola/cbb.html
// ==============================================================================

// Latest published SSA PIA Formula Bend Points (Eligibility Year 2027).
// Used for the header badge and for workers whose eligibility year (age 62) is
// after the latest published year. See BEND_POINTS_SERIES for earlier cohorts.
export const STATUTORY_BEND_POINT_YEAR = 2027;
export const BEND_POINT_1 = 1340;
export const BEND_POINT_2 = 8077;

// PIA bend points by eligibility year (the year the worker turns 62)
export const BEND_POINTS_SERIES: Record<number, [number, number]> = {
  1979: [180, 1085], 1980: [194, 1171], 1981: [211, 1274], 1982: [230, 1388],
  1983: [254, 1528], 1984: [267, 1612], 1985: [280, 1691], 1986: [297, 1790],
  1987: [310, 1866], 1988: [319, 1922], 1989: [339, 2044], 1990: [356, 2145],
  1991: [370, 2230], 1992: [387, 2333], 1993: [401, 2420], 1994: [422, 2545],
  1995: [426, 2567], 1996: [437, 2635], 1997: [455, 2741], 1998: [477, 2875],
  1999: [505, 3043], 2000: [531, 3202], 2001: [561, 3381], 2002: [592, 3567],
  2003: [606, 3653], 2004: [612, 3689], 2005: [627, 3779], 2006: [656, 3955],
  2007: [680, 4100], 2008: [711, 4288], 2009: [744, 4483], 2010: [761, 4586],
  2011: [749, 4517], 2012: [767, 4624], 2013: [791, 4768], 2014: [816, 4917],
  2015: [826, 4980], 2016: [856, 5157], 2017: [885, 5336], 2018: [895, 5397],
  2019: [926, 5583], 2020: [960, 5785], 2021: [996, 6002], 2022: [1024, 6172],
  2023: [1115, 6721], 2024: [1174, 7078], 2025: [1226, 7391], 2026: [1286, 7749],
  2027: [1340, 8077]
};

// Assumptions
export const ASSUMED_COLA = 0.025;
export const DEFAULT_REAL_RETURN = 0.05; // 5% Real return
export const DEFAULT_BIRTH_YEAR = 1973;
// Full retirement age varies by birth year; see fraMonths() in statutoryTables.ts.

// Default PIA Values (Manual Mode Defaults)
export const DEFAULT_PIA_A = 3451;
export const DEFAULT_PIA_B = 3401;

// Input Bounds (Guardrails from stress-testing audit)
export const SS_MIN_COLA_PCT = 0.0;
export const SS_MAX_COLA_PCT = 10.0;
export const SS_MIN_REAL_RETURN_PCT = -10.0;
export const SS_MAX_REAL_RETURN_PCT = 20.0;
export const SS_MIN_LIFE_EXP = 45;
export const SS_MAX_LIFE_EXP = 105;
// Engine rules (FRA table, 8%/yr DRCs, deemed filing) are implemented for births 1943+.
export const SS_MIN_BIRTH_YEAR = 1943;
export const SS_MAX_BIRTH_YEAR = 2010;
export const SS_MAX_MONTHLY_PIA = 20000;
export const SS_MIN_CLAIM_AGE = 62;
export const SS_MAX_CLAIM_AGE = 70;

// Historical Tax Max (Contribution and Benefit Base through 2027: $192,300)
export const TAX_MAX_SERIES: Record<number, number> = {
  1951: 3600, 1952: 3600, 1953: 3600, 1954: 3600, 1955: 4200,
  1956: 4200, 1957: 4200, 1958: 4200, 1959: 4800, 1960: 4800,
  1961: 4800, 1962: 4800, 1963: 4800, 1964: 4800, 1965: 4800,
  1966: 6600, 1967: 6600, 1968: 7800, 1969: 7800, 1970: 7800,
  1971: 7800, 1972: 9000, 1973: 10800, 1974: 13200, 1975: 14100,
  1976: 15300, 1977: 16500, 1978: 17700, 1979: 22900, 1980: 25900,
  1981: 29700, 1982: 32400, 1983: 35700, 1984: 37800, 1985: 39600,
  1986: 42000, 1987: 43800, 1988: 45000, 1989: 48000, 1990: 51300,
  1991: 53400, 1992: 55500, 1993: 57600, 1994: 60600, 1995: 61200,
  1996: 62700, 1997: 65400, 1998: 68400, 1999: 72600, 2000: 76200,
  2001: 80400, 2002: 84900, 2003: 87000, 2004: 87900, 2005: 90000,
  2006: 94200, 2007: 97500, 2008: 102000, 2009: 106800, 2010: 106800,
  2011: 106800, 2012: 110100, 2013: 113700, 2014: 117000, 2015: 118500,
  2016: 118500, 2017: 127200, 2018: 128400, 2019: 132900, 2020: 137700,
  2021: 142800, 2022: 147000, 2023: 160200, 2024: 168600, 2025: 176100,
  2026: 184500, 2027: 192300
};

// National Average Wage Index (AWI) Series (Latest published: 2025 = $72,800.33)
export const DATA_AWI_SERIES: EarningsRecord[] = [
  { "year": 1951, "amount": 2799.16 }, { "year": 1952, "amount": 2973.32 }, { "year": 1953, "amount": 3139.44 },
  { "year": 1954, "amount": 3155.64 }, { "year": 1955, "amount": 3301.44 }, { "year": 1956, "amount": 3532.36 },
  { "year": 1957, "amount": 3641.72 }, { "year": 1958, "amount": 3673.80 }, { "year": 1959, "amount": 3855.80 },
  { "year": 1960, "amount": 4007.12 }, { "year": 1961, "amount": 4086.76 }, { "year": 1962, "amount": 4291.40 },
  { "year": 1963, "amount": 4396.64 }, { "year": 1964, "amount": 4576.32 }, { "year": 1965, "amount": 4658.72 },
  { "year": 1966, "amount": 4938.36 }, { "year": 1967, "amount": 5213.44 }, { "year": 1968, "amount": 5571.76 },
  { "year": 1969, "amount": 5893.76 }, { "year": 1970, "amount": 6186.24 }, { "year": 1971, "amount": 6497.08 },
  { "year": 1972, "amount": 7133.80 }, { "year": 1973, "amount": 7580.16 }, { "year": 1974, "amount": 8030.76 },
  { "year": 1975, "amount": 8630.92 }, { "year": 1976, "amount": 9226.48 }, { "year": 1977, "amount": 9779.44 },
  { "year": 1978, "amount": 10556.03 }, { "year": 1979, "amount": 11479.46 }, { "year": 1980, "amount": 12513.46 },
  { "year": 1981, "amount": 13773.10 }, { "year": 1982, "amount": 14531.34 }, { "year": 1983, "amount": 15239.24 },
  { "year": 1984, "amount": 16135.07 }, { "year": 1985, "amount": 16822.51 }, { "year": 1986, "amount": 17321.82 },
  { "year": 1987, "amount": 18426.51 }, { "year": 1988, "amount": 19334.04 }, { "year": 1989, "amount": 20099.55 },
  { "year": 1990, "amount": 21027.98 }, { "year": 1991, "amount": 21811.60 }, { "year": 1992, "amount": 22935.42 },
  { "year": 1993, "amount": 23132.67 }, { "year": 1994, "amount": 23753.53 }, { "year": 1995, "amount": 24705.66 },
  { "year": 1996, "amount": 25913.90 }, { "year": 1997, "amount": 27426.00 }, { "year": 1998, "amount": 28861.44 },
  { "year": 1999, "amount": 30469.84 }, { "year": 2000, "amount": 32154.82 }, { "year": 2001, "amount": 32921.92 },
  { "year": 2002, "amount": 33252.09 }, { "year": 2003, "amount": 34064.95 }, { "year": 2004, "amount": 35648.55 },
  { "year": 2005, "amount": 36952.94 }, { "year": 2006, "amount": 38651.41 }, { "year": 2007, "amount": 40405.48 },
  { "year": 2008, "amount": 41334.97 }, { "year": 2009, "amount": 40711.61 }, { "year": 2010, "amount": 41673.83 },
  { "year": 2011, "amount": 42979.61 }, { "year": 2012, "amount": 44321.67 }, { "year": 2013, "amount": 44888.16 },
  { "year": 2014, "amount": 46481.52 }, { "year": 2015, "amount": 48098.63 }, { "year": 2016, "amount": 48642.15 },
  { "year": 2017, "amount": 50321.89 }, { "year": 2018, "amount": 52145.80 }, { "year": 2019, "amount": 54099.99 },
  { "year": 2020, "amount": 55628.60 }, { "year": 2021, "amount": 60575.07 }, { "year": 2022, "amount": 63795.13 },
  { "year": 2023, "amount": 66621.80 }, { "year": 2024, "amount": 69846.57 }, { "year": 2025, "amount": 72800.33 }
];

// Helper for default placeholder CSV - High Earner
export const DEFAULT_EARNINGS_CSV = `2024, 150000
2023, 145000
2022, 140000
2021, 135000
2020, 130000
2019, 125000
2018, 120000
2017, 115000
2016, 110000
2015, 105000
2014, 100000
2013, 95000
2012, 90000
2011, 85000
2010, 80000
2009, 75000
2008, 70000
2007, 65000
2006, 60000
2005, 55000`;

// Helper for default placeholder CSV - Low Earner (Scaled properly)
export const DEFAULT_EARNINGS_CSV_B = `2024, 75000
2023, 72500
2022, 70000
2021, 67500
2020, 65000
2019, 62500
2018, 60000
2017, 57500
2016, 55000
2015, 52500
2014, 50000
2013, 47500
2012, 45000
2011, 42500
2010, 40000
2009, 37500
2008, 35000
2007, 32500
2006, 30000
2005, 27500`;
