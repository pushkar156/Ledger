import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Expense, Budget } from '../types';
import { CATEGORIES } from '../constants/categories';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from 'recharts';
import { Save, AlertCircle, TrendingUp, Calendar, CalendarRange, Clock, Sparkles } from 'lucide-react';

interface InsightsTabProps {
  expenses: Expense[];
  activeBudget: Budget | null;
  activeRange: { startDate: string; endDate: string; label: string };
  onSaveBudget: (data: {
    type: 'monthly' | 'custom';
    monthly: number;
    start_date?: string;
    end_date?: string;
  }) => Promise<void>;
  hideBudgetConfig?: boolean;
  hideCharts?: boolean;
}

// Utility to get local date in YYYY-MM-DD
const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const InsightsTab: React.FC<InsightsTabProps> = ({
  expenses,
  activeBudget,
  activeRange,
  onSaveBudget,
  hideBudgetConfig = false,
  hideCharts = false,
}) => {
  const [trackingMode, setTrackingMode] = useState<'monthly' | 'custom'>('monthly');
  const [budgetString, setBudgetString] = useState('');
  
  // Custom Date fields
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return getLocalDateString(endOfMonth);
  });
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Keep track of the last synced budget identifier to prevent resetting inputs during active edits
  const lastSyncedBudgetRef = useRef<string | null>(null);

  // Sync state if activeBudget changes upstream
  useEffect(() => {
    const budgetIdentifier = activeBudget
      ? `${activeBudget.id || ''}-${activeBudget.type}-${activeBudget.monthly}-${activeBudget.start_date || ''}-${activeBudget.end_date || ''}`
      : 'none';

    if (lastSyncedBudgetRef.current !== budgetIdentifier) {
      if (activeBudget) {
        setTrackingMode(activeBudget.type);
        setBudgetString(activeBudget.monthly.toString());
        if (activeBudget.type === 'custom') {
          if (activeBudget.start_date) setStartDate(activeBudget.start_date);
          if (activeBudget.end_date) setEndDate(activeBudget.end_date);
        }
      } else {
        setTrackingMode('monthly');
        setBudgetString('');
      }
      lastSyncedBudgetRef.current = budgetIdentifier;
    }
  }, [activeBudget]);

  const handleStartDateChange = (val: string) => {
    const todayStr = getLocalDateString();
    if (val > todayStr) {
      setValidationError('Start date cannot be in the future.');
      setStartDate(todayStr);
    } else {
      setValidationError(null);
      setStartDate(val);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSaveSuccess(false);

    const limitNum = parseFloat(budgetString);
    if (isNaN(limitNum) || limitNum < 0) {
      setValidationError('Please enter a valid budget amount.');
      return;
    }

    if (trackingMode === 'custom') {
      if (!startDate || !endDate) {
        setValidationError('Start date and End date are required for custom ranges.');
        return;
      }
      const todayStr = getLocalDateString();
      if (startDate > todayStr) {
        setValidationError('Start date cannot be in the future.');
        setStartDate(todayStr);
        return;
      }
      if (startDate > endDate) {
        setValidationError('Start date cannot occur after End date.');
        return;
      }
    }

    setSaving(true);
    try {
      await onSaveBudget({
        type: trackingMode,
        monthly: limitNum,
        start_date: trackingMode === 'custom' ? startDate : undefined,
        end_date: trackingMode === 'custom' ? endDate : undefined,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setValidationError('Failed to save budget settings.');
    } finally {
      setSaving(false);
    }
  };

  // 1. Calculations: Category Breakdown (Scoped to Active Budget Date Range)
  const scopedExpenses = expenses.filter(
    (e) => e.date >= activeRange.startDate && e.date <= activeRange.endDate && e.type !== 'credit'
  );
  const scopedTotal = scopedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const categoryTotals = scopedExpenses.reduce((acc, expense) => {
    const cat = expense.category;
    acc[cat] = (acc[cat] || 0) + Number(expense.amount);
    return acc;
  }, {} as Record<string, number>);

  const donutData = Object.entries(categoryTotals)
    .map(([catId, amount]) => {
      const catInfo = CATEGORIES[catId] || CATEGORIES.other;
      return {
        id: catId,
        name: catInfo.label,
        emoji: catInfo.emoji,
        value: amount,
        color: catInfo.hex,
        bgClass: catInfo.bgClass,
        textClass: catInfo.textClass,
      };
    })
    .sort((a, b) => b.value - a.value);

  // 2. Calculations: 7-day daily spending trend (Debits Only)
  const trendData = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const dayTotal = expenses
      .filter((e) => e.date === dateStr && e.type !== 'credit')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const formattedLabel = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });

    trendData.push({
      dateStr,
      label: formattedLabel,
      amount: dayTotal,
    });
  }

  // Heuristics Calculations for Smart Insights
  const insights = useMemo(() => {
    if (!activeBudget || scopedExpenses.length === 0) return null;

    const getDaysDifference = (startStr: string, endStr: string): number => {
      const [sy, sm, sd] = startStr.split('-').map(Number);
      const [ey, em, ed] = endStr.split('-').map(Number);
      const sDate = new Date(sy, sm - 1, sd);
      const eDate = new Date(ey, em - 1, ed);
      const diff = eDate.getTime() - sDate.getTime();
      return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
    };

    const todayStr = getLocalDateString();
    const totalPeriodDays = getDaysDifference(activeRange.startDate, activeRange.endDate);
    
    let elapsedDays = 1;
    if (todayStr >= activeRange.startDate) {
      const targetEnd = todayStr < activeRange.endDate ? todayStr : activeRange.endDate;
      elapsedDays = getDaysDifference(activeRange.startDate, targetEnd);
    }
    
    const remainingDays = Math.max(0, totalPeriodDays - elapsedDays);
    const averageSpentPerDay = scopedTotal / elapsedDays;
    
    const limit = Number(activeBudget.monthly);
    
    const projectedTotalSpend = averageSpentPerDay * totalPeriodDays;
    const isProjectedOver = projectedTotalSpend > limit;
    const projectedDifference = Math.abs(limit - projectedTotalSpend);
    
    const topCategory = donutData[0];
    const categoryPct = topCategory && scopedTotal > 0 ? (topCategory.value / scopedTotal) * 100 : 0;
    
    const parseDateOffset = (offset: number): string => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return getLocalDateString(d);
    };
    
    const d7 = parseDateOffset(7);
    const d14 = parseDateOffset(14);
    
    const last7DaysTotal = expenses
      .filter((e) => e.date >= d7 && e.type !== 'credit')
      .reduce((sum, e) => sum + Number(e.amount), 0);
      
    const prev7DaysTotal = expenses
      .filter((e) => e.date >= d14 && e.date < d7 && e.type !== 'credit')
      .reduce((sum, e) => sum + Number(e.amount), 0);
      
    let wowPercentage = 0;
    let wowDirection: 'up' | 'down' | 'flat' = 'flat';
    if (prev7DaysTotal > 0) {
      wowPercentage = Math.abs(((last7DaysTotal - prev7DaysTotal) / prev7DaysTotal) * 100);
      wowDirection = last7DaysTotal > prev7DaysTotal ? 'up' : 'down';
    } else if (last7DaysTotal > 0) {
      wowPercentage = 100;
      wowDirection = 'up';
    }

    return {
      averageSpentPerDay,
      remainingDays,
      isProjectedOver,
      projectedDifference,
      projectedTotalSpend,
      topCategory,
      categoryPct,
      wowPercentage,
      wowDirection,
      last7DaysTotal,
      prev7DaysTotal,
    };
  }, [scopedExpenses, scopedTotal, activeBudget, activeRange, expenses, donutData]);

  const hasExpenses = expenses.length > 0;

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-ledgerElevated border border-ledgerBorder p-2.5 rounded-lg text-xs shadow-xl font-mono">
          <p className="text-ledgerMuted mb-0.5">{payload[0].payload.label}</p>
          <p className="text-ledgerMint font-semibold">
            ₹{payload[0].value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = scopedTotal > 0 ? (data.value / scopedTotal) * 100 : 0;
      return (
        <div className="bg-ledgerElevated border border-ledgerBorder p-2.5 rounded-lg text-xs shadow-xl font-mono">
          <p className="text-ledgerText mb-0.5">{data.emoji} {data.name}</p>
          <p className="text-ledgerMint font-semibold">
            ₹{data.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-ledgerMuted text-[10px]">{percentage.toFixed(1)}% of budget spend</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Budget Card Setup */}
      {!hideBudgetConfig && (
        <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4 animate-fade-in">
          <div>
            <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
              Budget Configuration
            </h3>
          </div>

          {/* Segmented Mode Selector */}
          <div className="flex bg-ledgerElevated border border-ledgerBorder rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => {
                setTrackingMode('monthly');
                setValidationError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
                trackingMode === 'monthly'
                  ? 'bg-ledgerSurface text-ledgerMint border border-ledgerBorder/40 shadow-sm font-bold'
                  : 'text-ledgerMuted hover:text-ledgerText'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Monthly (1 to 1)
            </button>
            <button
              type="button"
              onClick={() => {
                setTrackingMode('custom');
                setValidationError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
                trackingMode === 'custom'
                  ? 'bg-ledgerSurface text-ledgerMint border border-ledgerBorder/40 shadow-sm font-bold'
                  : 'text-ledgerMuted hover:text-ledgerText'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              Custom Range
            </button>
          </div>

          <form onSubmit={handleSaveBudget} className="space-y-3.5">
            {/* Custom Date Pickers */}
            {trackingMode === 'custom' && (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2 px-3 font-mono text-xs transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2 px-3 font-mono text-xs transition"
                  />
                </div>
              </div>
            )}

            {/* Budget Limit Input */}
            <div className="space-y-1">
              {trackingMode === 'custom' && (
                <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                  Budget Limit
                </label>
              )}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 font-mono text-ledgerMuted text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={budgetString}
                    onChange={(e) => setBudgetString(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-8 pr-4 font-mono text-sm tracking-tight transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-ledgerMint text-[#0F1B1E] font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-ledgerMint/90 active:transform active:scale-[0.98] transition flex items-center justify-center gap-1.5 flex-shrink-0"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>

          {validationError && (
            <p className="text-xs text-ledgerCoral mt-1 flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5" />
              {validationError}
            </p>
          )}
          {saveSuccess && (
            <p className="text-xs text-ledgerMint mt-1 flex items-center gap-1.5 animate-fade-in">
              ✓ Budget configured successfully.
            </p>
          )}
        </div>
      )}

      {!hideCharts && (
        !hasExpenses ? (
          <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-8 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-ledgerElevated border border-ledgerBorder flex items-center justify-center text-ledgerMuted mb-3">
              <AlertCircle className="w-6 h-6 text-ledgerMuted" />
            </div>
            <p className="text-xs text-ledgerMuted max-w-[200px]">
              No transactions found. Add expenses to view analysis and visual charts.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* 2. Category Breakdown Donut Chart */}
            <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg">
              <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider mb-4">
                Breakdown ({activeRange.label})
              </h3>
              
              {donutData.length === 0 ? (
                <div className="py-8 text-center text-xs text-ledgerMuted">
                  No debit transactions logged for this tracking period.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Donut graph container */}
                  <div className="h-[180px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#16262A" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} cursor={false} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Categorized Legend, Percentages and Relative Footprint Progress Bars */}
                  <div className="space-y-2">
                    {donutData.map((entry) => {
                      const pctNum = (entry.value / scopedTotal) * 100;
                      const pct = pctNum.toFixed(0);
                      
                      return (
                        <div key={entry.id} className="p-3 rounded-lg bg-ledgerElevated/30 border border-ledgerBorder/40 flex flex-col space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-6 h-6 rounded flex items-center justify-center text-xs ${entry.bgClass}`}>
                                {entry.emoji}
                              </span>
                              <span className="text-xs text-ledgerText font-medium truncate">
                                {entry.name}
                              </span>
                              <span className="text-[9px] text-ledgerMuted font-mono bg-ledgerElevated border border-ledgerBorder/60 px-1 rounded">
                                {pct}% footprint
                              </span>
                            </div>
                            <span className="font-mono text-xs text-ledgerText tabular-nums text-right font-medium">
                              ₹{entry.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          {/* Relative Footprint progress bar indicator */}
                          <div className="w-full h-1 bg-ledgerElevated rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{ 
                                width: `${pctNum}%`,
                                backgroundColor: entry.color 
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* 3. 7-day Trend Chart */}
            <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg">
              <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-ledgerMint" />
                7-Day Trend
              </h3>
              
              <div className="h-[180px] w-full mt-2 pr-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--color-ledgerMuted)', fontSize: 9 }}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(234,242,240,0.02)' }} />
                    <Bar
                      dataKey="amount"
                      fill="var(--color-ledgerMint)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Smart Insights Heuristics Deck */}
            {insights && (
              <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg space-y-4">
                <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-ledgerMint" />
                  Smart Insights
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-ledgerMuted">
                  {/* Insight 1: Daily Burn Rate */}
                  <div className="p-3.5 rounded-lg bg-ledgerElevated/30 border border-ledgerBorder/40 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-ledgerText mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-ledgerMint" />
                        Daily Burn Rate
                      </h4>
                      <p className="leading-normal">
                        You are spending an average of <span className="font-mono text-ledgerText font-bold">₹{insights.averageSpentPerDay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/day</span>.
                      </p>
                    </div>
                  </div>

                  {/* Insight 2: Budget Lifespan Projections */}
                  <div className={`p-3.5 rounded-lg border flex flex-col justify-between ${
                    insights.isProjectedOver 
                      ? 'bg-ledgerCoral/5 border-ledgerCoral/20 text-ledgerCoral'
                      : 'bg-ledgerGreen/5 border-ledgerGreen/20 text-ledgerGreen'
                  }`}>
                    <div>
                      <h4 className="font-semibold mb-1 flex items-center gap-1.5 text-ledgerText">
                        <AlertCircle className={`w-3.5 h-3.5 ${insights.isProjectedOver ? 'text-ledgerCoral' : 'text-ledgerGreen'}`} />
                        Budget Projection
                      </h4>
                      <p className="leading-normal">
                        {insights.isProjectedOver ? (
                          <>
                            Warning: Projected to exceed budget by <span className="font-mono text-ledgerCoral font-bold">₹{insights.projectedDifference.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>.
                          </>
                        ) : (
                          <>
                            Looking good! Projected to finish under budget by <span className="font-mono text-ledgerGreen font-bold">₹{insights.projectedDifference.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Insight 3: Category Dominance */}
                  {insights.topCategory && (
                    <div className="p-3.5 rounded-lg bg-ledgerElevated/30 border border-ledgerBorder/40 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-ledgerText mb-1 flex items-center gap-1.5">
                          <span className="text-sm">{insights.topCategory.emoji}</span>
                          Top Expense Category
                        </h4>
                        <p className="leading-normal">
                          <span className="font-bold text-ledgerText">{insights.topCategory.name}</span> is your highest spending category, consuming <span className="font-bold text-ledgerText">{insights.categoryPct.toFixed(0)}%</span> of total expenses.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Insight 4: Week-over-Week */}
                  <div className="p-3.5 rounded-lg bg-ledgerElevated/30 border border-ledgerBorder/40 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-ledgerText mb-1 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-ledgerMint" />
                        Weekly Momentum
                      </h4>
                      <p className="leading-normal">
                        {insights.wowDirection === 'flat' ? (
                          "Your spending has remained flat compared to last week."
                        ) : (
                          <>
                            Weekly spend is {insights.wowDirection === 'up' ? 'up' : 'down'} by{' '}
                            <span className={`font-bold ${insights.wowDirection === 'up' ? 'text-ledgerCoral' : 'text-ledgerGreen'}`}>
                              {insights.wowPercentage.toFixed(0)}%
                            </span>{' '}
                            compared to the previous 7 days.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};
