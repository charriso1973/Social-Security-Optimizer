import { EarningsRecord } from './types';

// 2025 Bend Points
export const BEND_POINT_1 = 1226;
export const BEND_POINT_2 = 7391;

// Assumptions
export const ASSUMED_COLA = 0.025;
export const DEFAULT_REAL_RETURN = 0.05; // 5% Real return
export const DEFAULT_BIRTH_YEAR = 1973;
export const FRA_YEARS = 67; // For 1963 cohort

// Default PIA Values (Manual Mode)
export const DEFAULT_PIA_A = 3451;
export const DEFAULT_PIA_B = 3401;

// Historical Tax Max (Contribution and Benefit Base) - Simplified recent history for capping
export const TAX_MAX_SERIES: Record<number, number> = {
  1980: 25900, 1981: 29700, 1982: 32400, 1983: 35700, 1984: 37800,
  1985: 39600, 1986: 42000, 1987: 43800, 1988: 45000, 1989: 48000,
  1990: 51300, 1991: 53400, 1992: 55500, 1993: 57600, 1994: 60600,
  1995: 61200, 1996: 62700, 1997: 65400, 1998: 68400, 1999: 72600,
  2000: 76200, 2001: 80400, 2002: 84900, 2003: 87000, 2004: 87900,
  2005: 90000, 2006: 94200, 2007: 97500, 2008: 102000, 2009: 106800,
  2010: 106800, 2011: 106800, 2012: 110100, 2013: 113700, 2014: 117000,
  2015: 118500, 2016: 118500, 2017: 127200, 2018: 128400, 2019: 132900,
  2020: 137700, 2021: 142800, 2022: 147000, 2023: 160200, 2024: 168600,
  2025: 176100, 2026: 184500
};

// AWI Series provided in prompt
export const DATA_AWI_SERIES: EarningsRecord[] = [
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
  { "year": 2023, "amount": 66621.80 }, { "year": 2024, "amount": 69846.57 }
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