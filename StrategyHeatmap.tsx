import React, { useState, useMemo } from 'react';
import { Trophy, Target, Sparkles, HelpCircle } from 'lucide-react';
import { StrategySummary } from './types';
import { HEAT_RAMP, heatBgColor, heatLabelColor } from './theme';

interface StrategyHeatmapProps {
  grid: StrategySummary[];
  min: StrategySummary;
  max: StrategySummary;
  claimAgeA: number;
  claimAgeB: number;
  nameA: string;
  nameB: string;
  onSelectStrategy: (ageA: number, ageB: number) => void;
}

const AGES = [62, 63, 64, 65, 66, 67, 68, 69, 70];

export const StrategyHeatmap: React.FC<StrategyHeatmapProps> = ({
  grid,
  min,
  max,
  claimAgeA,
  claimAgeB,
  nameA,
  nameB,
  onSelectStrategy,
}) => {
  const [displayMode, setDisplayMode] = useState<'spread' | 'total'>('spread');

  // Total span for color scaling
  const span = useMemo(() => Math.max(1, max.totalCash - min.totalCash), [min, max]);

  // Map for fast O(1) lookup
  const gridMap = useMemo(() => {
    const map = new Map<string, StrategySummary>();
    for (const item of grid) {
      map.set(`${item.ageA}-${item.ageB}`, item);
    }
    return map;
  }, [grid]);

  const formatMillions = (val: number) => `$${(val / 1000000).toFixed(2)}M`;
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-800">81-Pair Claiming Strategy Grid</h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
              Interactive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Evaluates every combination of claim ages (62 to 70). Click any cell to simulate that strategy.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Preset Buttons */}
          <button
            type="button"
            onClick={() => onSelectStrategy(max.ageA, max.ageB)}
            className="text-xs px-2.5 py-1.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1"
            title="Set to optimal lifetime strategy"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Optimal ({max.ageA}/{max.ageB})
          </button>
          <button
            type="button"
            onClick={() => onSelectStrategy(67, 67)}
            className="text-xs px-2.5 py-1.5 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
          >
            FRA (67/67)
          </button>
          <button
            type="button"
            onClick={() => onSelectStrategy(62, 62)}
            className="text-xs px-2.5 py-1.5 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
          >
            Early (62/62)
          </button>

          {/* Toggle Spread vs Total */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 ml-1">
            <button
              type="button"
              onClick={() => setDisplayMode('spread')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                displayMode === 'spread'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Spread (+vs Worst)
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('total')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                displayMode === 'total'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Total ($M)
            </button>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Top Axis Label: Partner A */}
          <div className="text-center mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100 inline-block">
              {nameA} Claim Age (Columns) &rarr;
            </span>
          </div>

          <table className="w-full border-collapse select-none">
            <thead>
              <tr>
                {/* Corner Cell */}
                <th className="p-2 text-[11px] font-bold text-slate-400 uppercase text-left w-24 border-b border-slate-200">
                  <div className="leading-tight">
                    <span className="text-rose-600 block">{nameB} &darr;</span>
                    <span className="text-blue-600 block">{nameA} &rarr;</span>
                  </div>
                </th>
                {AGES.map((ageA) => (
                  <th
                    key={ageA}
                    className={`p-2 text-center text-xs font-bold border-b border-slate-200 ${
                      ageA === claimAgeA ? 'bg-blue-50 text-blue-800 rounded-t' : 'text-slate-600'
                    }`}
                  >
                    Age {ageA}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGES.map((ageB) => (
                <tr key={ageB}>
                  {/* Row Header: Partner B */}
                  <th
                    className={`p-2 text-left text-xs font-bold border-r border-slate-200 whitespace-nowrap ${
                      ageB === claimAgeB ? 'bg-rose-50 text-rose-800 rounded-l' : 'text-slate-600'
                    }`}
                  >
                    Age {ageB}
                  </th>

                  {/* 9 Column Cells */}
                  {AGES.map((ageA) => {
                    const item = gridMap.get(`${ageA}-${ageB}`);
                    if (!item) return <td key={ageA} className="p-1"></td>;

                    const totalCash = item.totalCash;
                    const delta = totalCash - min.totalCash;
                    const norm = Math.max(0, Math.min(1, (totalCash - min.totalCash) / span));

                    const isOptimal = ageA === max.ageA && ageB === max.ageB;
                    const isSelected = ageA === claimAgeA && ageB === claimAgeB;

                    const bgColor = heatBgColor(HEAT_RAMP.screen, norm);
                    const textColor = heatLabelColor(HEAT_RAMP.screen, norm);

                    const cellLabel =
                      displayMode === 'spread'
                        ? delta === 0
                          ? 'Base'
                          : `+${Math.round(delta / 1000)}k`
                        : `$${(totalCash / 1000000).toFixed(2)}M`;

                    return (
                      <td key={ageA} className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectStrategy(ageA, ageB)}
                          style={{ backgroundColor: bgColor, color: textColor }}
                          title={`${nameA}: Age ${ageA}, ${nameB}: Age ${ageB}\nLifetime: ${formatCurrency(
                            totalCash
                          )}\nSpread: +${formatCurrency(delta)} above worst${
                            isOptimal ? ' (OPTIMAL STRATEGY)' : ''
                          }${isSelected ? ' (CURRENT SELECTION)' : ''}`}
                          className={`w-full py-2.5 px-1 rounded transition-all transform hover:scale-105 hover:z-20 hover:shadow-lg focus:outline-none relative group ${
                            isSelected
                              ? 'ring-4 ring-indigo-900 shadow-lg font-black scale-105 z-10'
                              : isOptimal
                              ? 'ring-2 ring-amber-400 font-extrabold shadow-md'
                              : 'hover:opacity-95 font-medium'
                          }`}
                        >
                          {/* Optimal Star Badge */}
                          {isOptimal && (
                            <span
                              className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-950 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm"
                              title="Optimal Lifetime Claiming Pair"
                            >
                              ★
                            </span>
                          )}

                          {/* Selected Target Badge */}
                          {isSelected && !isOptimal && (
                            <span
                              className="absolute -top-1.5 -right-1.5 bg-indigo-900 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm"
                              title="Currently Selected Strategy"
                            >
                              ✓
                            </span>
                          )}

                          <div className="text-[11px] leading-tight truncate font-mono tracking-tight">
                            {cellLabel}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer & Legend */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">Worst ({formatMillions(min.totalCash)})</span>
              <div
                className="w-28 h-2.5 rounded-full"
                style={{
                  background: `linear-gradient(to right, ${HEAT_RAMP.screen[0]}, ${HEAT_RAMP.screen[2]}, ${HEAT_RAMP.screen[4]})`,
                }}
              ></div>
              <span className="text-[11px] text-slate-700 font-bold">
                Optimal (+{formatMillions(span)} spread)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-amber-700">
              <span className="bg-amber-400 text-amber-950 font-bold px-1 rounded text-[10px]">★</span> Optimal
              Pair ({max.ageA} / {max.ageB})
            </span>
            <span className="flex items-center gap-1 text-indigo-900 font-semibold">
              <span className="border-2 border-indigo-900 px-1 rounded text-[10px] bg-indigo-50">✓</span> Current
              Selection ({claimAgeA} / {claimAgeB})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

