import React, { useState, useEffect } from 'react';
import type { Expense } from '../types';
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
import { Save, AlertCircle, TrendingUp } from 'lucide-react';

interface InsightsTabProps {
  expenses: Expense[];
  currentBudget: number;
  onSaveBudget: (limit: number) => Promise<void>;
}

export const InsightsTab: React.FC<InsightsTabProps> = ({
  expenses,
  currentBudget,
  onSaveBudget,
}) => {
  const [budgetString, setBudgetString] = useState(currentBudget.toString());
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if budget changes upstream
  useEffect(() => {
    setBudgetString(currentBudget.toString());
  }, [currentBudget]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(budgetString);
    if (isNaN(limitNum) || limitNum < 0) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveBudget(limitNum);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // 1. Calculations: Category Breakdown (Current Month)
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const currentMonthExpenses = expenses.filter((e) => e.date.startsWith(currentMonthStr));
  const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const categoryTotals = currentMonthExpenses.reduce((acc, expense) => {
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

  // 2. Calculations: 14-day daily spending trend
  const trendData = [];
  const today = new Date();
  
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`; // local format YYYY-MM-DD
    
    const dayTotal = expenses
      .filter((e) => e.date === dateStr)
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

  // Check if there is any data to visualize
  const hasExpenses = expenses.length > 0;

  // Custom tooltips for Recharts
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
      const percentage = currentMonthTotal > 0 ? (data.value / currentMonthTotal) * 100 : 0;
      return (
        <div className="bg-ledgerElevated border border-ledgerBorder p-2.5 rounded-lg text-xs shadow-xl font-mono">
          <p className="text-ledgerText mb-0.5">{data.emoji} {data.name}</p>
          <p className="text-ledgerMint font-semibold">
            ₹{data.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-ledgerMuted text-[10px]">{percentage.toFixed(1)}% of month total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Monthly Budget Card */}
      <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg">
        <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider mb-3">
          Monthly Limit Setup
        </h3>
        <form onSubmit={handleSaveBudget} className="flex gap-3">
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
        </form>
        {saveSuccess && (
          <p className="text-xs text-ledgerMint mt-2 flex items-center gap-1.5 animate-fade-in">
            ✓ Budget limits updated successfully.
          </p>
        )}
      </div>

      {!hasExpenses ? (
        <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-ledgerElevated border border-ledgerBorder flex items-center justify-center text-ledgerMuted mb-3">
            <AlertCircle className="w-6 h-6 text-ledgerMuted" />
          </div>
          <p className="text-xs text-ledgerMuted max-w-[200px]">
            No transactions found. Add expenses to view analysis and visual charts.
          </p>
        </div>
      ) : (
        <>
          {/* 2. Category Breakdown Donut Chart */}
          <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg">
            <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider mb-4">
              Category Breakdown (This Month)
            </h3>
            
            {donutData.length === 0 ? (
              <div className="py-8 text-center text-xs text-ledgerMuted">
                No expenses logged for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.
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

                {/* Categorized Legend and Percentages */}
                <div className="space-y-2">
                  {donutData.map((entry) => {
                    const pct = ((entry.value / currentMonthTotal) * 100).toFixed(0);
                    return (
                      <div key={entry.id} className="flex justify-between items-center p-2 rounded-lg bg-ledgerElevated/30 border border-ledgerBorder/40">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded flex items-center justify-center text-xs ${entry.bgClass}`}>
                            {entry.emoji}
                          </span>
                          <span className="text-xs text-ledgerText font-medium truncate">
                            {entry.name}
                          </span>
                          <span className="text-[10px] text-ledgerMuted font-mono">
                            {pct}%
                          </span>
                        </div>
                        <span className="font-mono text-xs text-ledgerText tabular-nums text-right font-medium">
                          ₹{entry.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. 14-day Trend Chart */}
          <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg">
            <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-ledgerMint" />
              14-Day Trend
            </h3>
            
            <div className="h-[180px] w-full mt-2 pr-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8FA8A3', fontSize: 9 }}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(234,242,240,0.02)' }} />
                  <Bar
                    dataKey="amount"
                    fill="#7FE7C4"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
