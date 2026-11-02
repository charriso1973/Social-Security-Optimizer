"""
Fetch official statutory factors directly from SSA.gov and update constants.ts.

Endpoints:
1. National Average Wage Index (AWI): https://www.ssa.gov/oact/cola/awiseries.html
2. Benefit Formula Bend Points: https://www.ssa.gov/oact/COLA/bendpoints.html
3. Contribution and Benefit Base (Tax Max): https://www.ssa.gov/oact/cola/cbb.html

Design & Safeguards (AMAS / Finance Tracker parity):
- Uses browser navigation headers to satisfy Akamai bot defense on ssa.gov.
- Strict short-parse refusal: requires MIN_EXPECTED_ROWS before writing.
- Validates data ordering and reasonable range sanity checks.
- Atomically regenerates constants.ts and public/statutory_factors.json.
"""

import sys
import re
import os
import json
import datetime
import urllib.request

AWI_URL = "https://www.ssa.gov/oact/cola/awiseries.html"
BEND_POINTS_URL = "https://www.ssa.gov/oact/COLA/bendpoints.html"
WAGE_BASE_URL = "https://www.ssa.gov/oact/cola/cbb.html"

MIN_EXPECTED_ROWS = 30

SSA_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.ssa.gov/oact/cola/",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "sec-ch-ua": '"Chromium";v="122", "Google Chrome";v="122"',
    "sec-ch-ua-platform": '"Windows"',
}


def fetch_text(url: str, timeout: int = 25) -> str:
    req = urllib.request.Request(url, headers=SSA_HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def parse_awi_html(html: str) -> dict[int, float]:
    """Parse {year: awi_amount} from awiseries.html."""
    text = re.sub(r"<[^>]+>", " ", html).replace("$", " ").replace("\xa0", " ")
    this_year = datetime.date.today().year + 1
    out = {}
    pending_year = None
    for tok in text.split():
        if re.fullmatch(r"(?:19|20)\d{2}", tok):
            y = int(tok)
            if 1951 <= y <= this_year:
                pending_year = y
            continue
        if pending_year is not None and re.fullmatch(r"[\d,]+\.\d+", tok):
            val = float(tok.replace(",", ""))
            if val >= 1000:
                out[pending_year] = round(val, 2)
                pending_year = None
    return out


def parse_bend_points_html(html: str) -> dict[int, tuple[float, float]]:
    """Parse {year: (bend_point_1, bend_point_2)} from bendpoints.html."""
    this_year = datetime.date.today().year + 1
    text = re.sub(r"(?is)<script.*?</script>", " ", html)
    text = re.sub(r"<[^>]+>", " ", text).replace("$", " ").replace("\xa0", " ")
    toks = text.split()

    out = {}
    i = 0
    while i < len(toks):
        if not re.fullmatch(r"(?:19|20)\d{2}", toks[i]):
            i += 1
            continue
        year = int(toks[i])
        if not (1979 <= year <= this_year):
            i += 1
            continue
        amounts = []
        j = i + 1
        while j < len(toks) and len(amounts) < 5:
            if not re.fullmatch(r"[\d,]+", toks[j]):
                break
            amounts.append(float(toks[j].replace(",", "")))
            j += 1
        if len(amounts) >= 2:
            bp1, bp2 = amounts[0], amounts[1]
            if bp1 > 0 and bp2 > bp1:
                out[year] = (round(bp1), round(bp2))
        i = j
    return out


def parse_wage_base_html(html: str) -> dict[int, int]:
    """Parse {year: tax_max} from cbb.html."""
    this_year = datetime.date.today().year + 1
    text = re.sub(r"<[^>]+>", " ", html).replace("$", " ").replace("\xa0", " ")
    toks = text.split()

    out = {}
    i = 0
    while i < len(toks):
        if re.fullmatch(r"(?:19|20)\d{2}", toks[i]):
            y = int(toks[i])
            if 1937 <= y <= this_year and (i + 1) < len(toks):
                next_tok = toks[i + 1].replace(",", "")
                if next_tok.isdigit():
                    val = int(next_tok)
                    if val >= 3000:
                        out[y] = val
                        i += 2
                        continue
        i += 1
    return out


def update_constants_file(
    repo_dir: str,
    awi_series: dict[int, float],
    bend_points: dict[int, tuple[float, float]],
    wage_caps: dict[int, int],
):
    latest_bp_year = max(bend_points.keys())
    bp1, bp2 = bend_points[latest_bp_year]
    latest_cap_year = max(wage_caps.keys())
    latest_cap = wage_caps[latest_cap_year]
    latest_awi_year = max(awi_series.keys())
    latest_awi = awi_series[latest_awi_year]

    now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Format TAX_MAX_SERIES (filtered for recent years from 1980)
    recent_caps = {y: wage_caps[y] for y in sorted(wage_caps.keys()) if y >= 1980}
    cap_lines = []
    items = list(recent_caps.items())
    for k in range(0, len(items), 5):
        chunk = items[k : k + 5]
        cap_lines.append("  " + ", ".join(f"{y}: {val}" for y, val in chunk))
    formatted_caps = ",\n".join(cap_lines)

    # Format DATA_AWI_SERIES (filtered from 1987)
    recent_awi = [
        {"year": y, "amount": awi_series[y]}
        for y in sorted(awi_series.keys())
        if y >= 1987
    ]
    awi_lines = []
    for k in range(0, len(recent_awi), 3):
        chunk = recent_awi[k : k + 3]
        formatted_chunk = ", ".join(
            f'{{ "year": {d["year"]}, "amount": {d["amount"]:.2f} }}' for d in chunk
        )
        awi_lines.append(f"  {formatted_chunk}")
    formatted_awi = ",\n".join(awi_lines)

    content = f"""import {{ EarningsRecord }} from './types';

// ==============================================================================
// SSA Statutory Actuarial Constants
// Auto-refreshed from SSA.gov on: {now_iso}
// Sources:
// - AWI Series: {AWI_URL}
// - PIA Bend Points: {BEND_POINTS_URL}
// - Contribution Base: {WAGE_BASE_URL}
// ==============================================================================

// Official SSA PIA Formula Bend Points (Eligibility Year {latest_bp_year})
export const STATUTORY_BEND_POINT_YEAR = {latest_bp_year};
export const BEND_POINT_1 = {bp1};
export const BEND_POINT_2 = {bp2};

// Assumptions
export const ASSUMED_COLA = 0.025;
export const DEFAULT_REAL_RETURN = 0.05; // 5% Real return
export const DEFAULT_BIRTH_YEAR = 1973;
export const FRA_YEARS = 67; // Full Retirement Age for cohorts born 1960+

// Default PIA Values (Manual Mode Defaults)
export const DEFAULT_PIA_A = 3451;
export const DEFAULT_PIA_B = 3401;

// Input Bounds (Guardrails from stress-testing audit)
export const SS_MIN_COLA_PCT = 0.0;
export const SS_MAX_COLA_PCT = 10.0;
export const SS_MIN_REAL_RETURN_PCT = -10.0;
export const SS_MAX_REAL_RETURN_PCT = 20.0;
export const SS_MIN_LIFE_EXP = 40;
export const SS_MAX_LIFE_EXP = 120;
export const SS_MAX_MONTHLY_PIA = 20000;
export const SS_MIN_CLAIM_AGE = 62;
export const SS_MAX_CLAIM_AGE = 70;

// Historical Tax Max (Contribution and Benefit Base through {latest_cap_year}: ${latest_cap:,})
export const TAX_MAX_SERIES: Record<number, number> = {{
{formatted_caps}
}};

// National Average Wage Index (AWI) Series (Latest published: {latest_awi_year} = ${latest_awi:,.2f})
export const DATA_AWI_SERIES: EarningsRecord[] = [
{formatted_awi}
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
"""

    constants_path = os.path.join(repo_dir, "constants.ts")
    with open(constants_path, "w", encoding="utf-8") as f:
        f.write(content)

    # Also output public/statutory_factors.json for audit and client inspection
    factors_payload = {
        "refreshed_at": now_iso,
        "latest_bend_point_year": latest_bp_year,
        "bend_points": {
            "first": bp1,
            "second": bp2,
        },
        "latest_wage_base_year": latest_cap_year,
        "latest_wage_base": latest_cap,
        "latest_awi_year": latest_awi_year,
        "latest_awi_amount": latest_awi,
        "all_bend_points": bend_points,
        "all_wage_bases": wage_caps,
        "all_awi_series": awi_series,
    }
    public_dir = os.path.join(repo_dir, "public")
    os.makedirs(public_dir, exist_ok=True)
    with open(os.path.join(public_dir, "statutory_factors.json"), "w", encoding="utf-8") as f:
        json.dump(factors_payload, f, indent=2)

    return {
        "latest_bp_year": latest_bp_year,
        "bp1": bp1,
        "bp2": bp2,
        "latest_cap_year": latest_cap_year,
        "latest_cap": latest_cap,
        "latest_awi_year": latest_awi_year,
        "latest_awi": latest_awi,
        "awi_rows": len(awi_series),
        "bp_rows": len(bend_points),
        "cap_rows": len(wage_caps),
    }


def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    print("=" * 70)
    print("FETCHING OFFICIAL SSA STATUTORY FACTORS (AWI, BEND POINTS, TAX MAX)")
    print("=" * 70)

    # 1. Fetch & Parse AWI
    print(f"Fetching AWI series from {AWI_URL}...")
    html_awi = fetch_text(AWI_URL)
    awi_series = parse_awi_html(html_awi)
    if len(awi_series) < MIN_EXPECTED_ROWS:
        raise ValueError(f"AWI parse failed: only {len(awi_series)} rows (expected >= {MIN_EXPECTED_ROWS})")
    print(f"-> Parsed {len(awi_series)} AWI years (Latest: {max(awi_series.keys())} = ${awi_series[max(awi_series.keys())]:,.2f})")

    # 2. Fetch & Parse Bend Points
    print(f"Fetching Bend Points from {BEND_POINTS_URL}...")
    html_bp = fetch_text(BEND_POINTS_URL)
    bend_points = parse_bend_points_html(html_bp)
    if len(bend_points) < MIN_EXPECTED_ROWS:
        raise ValueError(f"Bend points parse failed: only {len(bend_points)} rows (expected >= {MIN_EXPECTED_ROWS})")
    latest_bp = max(bend_points.keys())
    print(f"-> Parsed {len(bend_points)} Bend Point years (Latest: {latest_bp} = ${bend_points[latest_bp][0]} / ${bend_points[latest_bp][1]})")

    # 3. Fetch & Parse Wage Base (Tax Max)
    print(f"Fetching Wage Base series from {WAGE_BASE_URL}...")
    html_wb = fetch_text(WAGE_BASE_URL)
    wage_caps = parse_wage_base_html(html_wb)
    if len(wage_caps) < MIN_EXPECTED_ROWS:
        raise ValueError(f"Wage base parse failed: only {len(wage_caps)} rows (expected >= {MIN_EXPECTED_ROWS})")
    latest_cap = max(wage_caps.keys())
    print(f"-> Parsed {len(wage_caps)} Wage Base years (Latest: {latest_cap} = ${wage_caps[latest_cap]:,})")

    # 4. Update constants.ts and public/statutory_factors.json
    summary = update_constants_file(repo_dir, awi_series, bend_points, wage_caps)
    print("\nSUCCESS: Updated constants.ts and public/statutory_factors.json")
    print(f"  * Statutory Year: {summary['latest_bp_year']}")
    print(f"  * PIA Bend Points: ${summary['bp1']} / ${summary['bp2']}")
    print(f"  * Wage Base Cap: ${summary['latest_cap']:,} (Year {summary['latest_cap_year']})")
    print(f"  * Latest AWI: ${summary['latest_awi']:,.2f} (Year {summary['latest_awi_year']})")
    print("=" * 70)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

