import React, { useState, useMemo } from 'react';
import type { Expense, Budget } from '../types';
import { CATEGORIES } from '../constants/categories';
import { ChevronDown, ChevronUp, CalendarDays, Trash2 } from 'lucide-react';
import { DeleteLogButton } from '@/components/ui/DeleteLogButton';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface PeriodLogsTabProps {
  expenses: Expense[];
  allBudgets: Budget[];
  onDeleteExpense: (id: string) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
}

// Helper to format date to short text
const formatDateShort = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Helper to calculate standard calendar month range
const getMonthRange = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
};

export const PeriodLogsTab: React.FC<PeriodLogsTabProps> = ({
  expenses,
  allBudgets,
  onDeleteExpense,
  onDeleteBudget,
}) => {
  // Store expanded period budget IDs in local state
  const [expandedPeriodIds, setExpandedPeriodIds] = useState<Record<string, boolean>>({});
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedPeriodIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Compile periods and group transactions matching their dates
  const periodsData = useMemo(() => {
    // If no budgets configured, we don't have periods yet
    if (allBudgets.length === 0) return [];

    // Map each budget configuration to a calculated period with dates and transactions
    const mapped = allBudgets.map((b, index) => {
      const budgetId = b.id || `budget-${index}-${b.type}-${b.month || b.start_date}`;
      
      let startDate = '';
      let endDate = '';
      let label = '';

      if (b.type === 'custom') {
        startDate = b.start_date || '';
        endDate = b.end_date || '';
        if (startDate && endDate) {
          label = `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
        } else {
          label = 'Custom Range';
        }
      } else {
        const monthStr = b.month || new Date().toISOString().substring(0, 7);
        const range = getMonthRange(monthStr);
        startDate = range.startDate;
        endDate = range.endDate;
        label = new Date(monthStr + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      }

      // Filter transactions occurring in this budget period range
      const periodExpenses = expenses.filter(
        (e) => e.date >= startDate && e.date <= endDate
      );

      const debitsSum = periodExpenses
        .filter((e) => e.type !== 'credit')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const creditsSum = periodExpenses
        .filter((e) => e.type === 'credit')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const netBalance = Number(b.monthly) - debitsSum + creditsSum;

      // Sort period transactions by date descending
      const sortedTransactions = [...periodExpenses].sort((a, b) => b.date.localeCompare(a.date));

      return {
        id: budgetId,
        config: b,
        label,
        startDate,
        endDate,
        limit: Number(b.monthly),
        spent: debitsSum,
        credited: creditsSum,
        balance: netBalance,
        transactions: sortedTransactions,
        createdAtTime: b.created_at ? new Date(b.created_at).getTime() : 0,
      };
    });

    // Sort periods by creation date / start date descending (newest first)
    return mapped.sort((a, b) => {
      if (b.createdAtTime !== a.createdAtTime) {
        return b.createdAtTime - a.createdAtTime;
      }
      return b.startDate.localeCompare(a.startDate);
    });
  }, [allBudgets, expenses]);

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      <div>
        <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider pl-1">
          Historical Budget Periods
        </h3>
      </div>

      {periodsData.length === 0 ? (
        <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <CalendarDays className="w-10 h-10 text-ledgerMuted mb-2.5 opacity-60" />
          <p className="text-xs text-ledgerMuted max-w-[220px]">
            No budget periods configured yet. Set a budget in the Settings panel to open a tracking period.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {periodsData.map((period) => {
            const isExpanded = !!expandedPeriodIds[period.id];
            const isBalanceNegative = period.balance < 0;

            return (
              <div
                key={period.id}
                className="bg-ledgerSurface border border-ledgerBorder rounded-xl overflow-hidden shadow-md transition-all duration-200"
              >
                {/* Period Summary Card Header */}
                <div
                  onClick={() => toggleExpand(period.id)}
                  className="p-4 cursor-pointer hover:bg-ledgerElevated/35 flex justify-between items-center transition select-none"
                >
                  <div className="space-y-1 pr-3 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-ledgerText truncate">
                        {period.label}
                      </h4>
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        period.config.type === 'custom'
                          ? 'border-indigo-400/20 text-indigo-300 bg-indigo-400/5'
                          : 'border-ledgerMint/20 text-ledgerMint bg-ledgerMint/5'
                      }`}>
                        {period.config.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-ledgerMuted font-mono">
                      Spent: <span className="text-ledgerText">₹{period.spent.toLocaleString('en-IN')}</span> 
                      {period.credited > 0 && (
                        <> | Credited: <span className="text-ledgerMint">+₹{period.credited.toLocaleString('en-IN')}</span></>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <span className="block text-[9px] text-ledgerMuted uppercase tracking-wider">
                        Remaining
                      </span>
                      <span className={`text-xs font-mono font-bold tabular-nums ${isBalanceNegative ? 'text-ledgerCoral' : 'text-[#7FE7C4]'}`}>
                        ₹{period.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingBudgetId(period.id);
                        }}
                        className="text-ledgerMuted hover:text-ledgerCoral opacity-40 hover:opacity-100 transition-all p-1.5 rounded hover:bg-ledgerCoral/10"
                        title="Delete budget period"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="text-ledgerMuted p-1 bg-ledgerElevated/50 rounded-lg">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Period Transactions Sub-List */}
                {isExpanded && (
                  <div className="border-t border-ledgerBorder bg-ledgerElevated/15 p-4 animate-slide-up space-y-3">
                    <div className="flex justify-between items-center border-b border-ledgerBorder/40 pb-2">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
                        Transaction History ({period.transactions.length})
                      </h5>
                      <span className="text-[9px] text-ledgerMuted font-mono">
                        Budget Limit: ₹{period.limit.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {period.transactions.length === 0 ? (
                      <p className="text-xs text-ledgerMuted py-4 text-center">
                        No transactions logged during this period range.
                      </p>
                    ) : (
                      <div className="divide-y divide-ledgerBorder/30 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                        {period.transactions.slice(0, 5).map((tx) => {
                          const isCredit = tx.type === 'credit';
                          const catInfo = CATEGORIES[tx.category] || CATEGORIES.other;

                          return (
                            <div key={tx.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0 group">
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <span className={`w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0 ${catInfo.bgClass}`}>
                                  {catInfo.emoji}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-ledgerText truncate">
                                    {tx.note || catInfo.label}
                                  </p>
                                  <span className="text-[9px] text-ledgerMuted font-mono">
                                    {formatDateShort(tx.date)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 flex-shrink-0">
                                <span className={`font-mono text-xs font-semibold tabular-nums ${isCredit ? 'text-ledgerMint' : 'text-ledgerText'}`}>
                                  {isCredit ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <DeleteLogButton onConfirm={() => onDeleteExpense(tx.id)} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        open={deletingBudgetId !== null}
        title="Delete budget period"
        message="Are you sure you want to delete this budget period? The transactions linked to this date range will not be deleted."
        onConfirm={async () => {
          if (deletingBudgetId) {
            await onDeleteBudget(deletingBudgetId);
            setDeletingBudgetId(null);
          }
        }}
        onCancel={() => setDeletingBudgetId(null)}
      />
    </div>
  );
};
