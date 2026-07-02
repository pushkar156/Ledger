import React from 'react';
import type { Expense } from '../types';
import { CATEGORIES } from '../constants/categories';
import { Trash2, AlertCircle } from 'lucide-react';

interface TransactionsTabProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  filterDate: string | null;
  onFilterDateChange: (date: string | null) => void;
  hasAnyExpenses: boolean;
}

// Utility to parse local date cleanly
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Format date headers relative to local timezone
const formatGroupDate = (dateStr: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const targetDate = parseLocalDate(dateStr);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return targetDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }
};

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  expenses,
  onDeleteExpense,
  filterDate,
  onFilterDateChange,
  hasAnyExpenses,
}) => {
  // If there are absolutely no expenses in the system, show the overall empty state
  if (!hasAnyExpenses && !filterDate) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-ledgerElevated border border-ledgerBorder flex items-center justify-center text-ledgerMuted mb-4">
          <AlertCircle className="w-6 h-6 text-ledgerMuted" />
        </div>
        <h3 className="text-sm font-medium text-ledgerText mb-1">No expenses yet</h3>
        <p className="text-xs text-ledgerMuted max-w-[240px]">
          Tap "+ Add expense" below to log your first transaction.
        </p>
      </div>
    );
  }

  // Get local date string for 'max' attribute of date input (to prevent future date selection)
  const getLocalDateString = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Group expenses by date string
  const grouped = expenses.reduce((acc, expense) => {
    const key = expense.date;
    if (!acc[key]) {
      acc[key] = {
        date: key,
        expenses: [],
        subtotal: 0,
      };
    }
    acc[key].expenses.push(expense);
    acc[key].subtotal += Number(expense.amount);
    return acc;
  }, {} as Record<string, { date: string; expenses: Expense[]; subtotal: number }>);

  // Sort groups descending by date
  const sortedGroups = Object.values(grouped).sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Date Filter Bar */}
      <div className="flex items-center justify-between bg-ledgerSurface border border-ledgerBorder rounded-xl px-4 py-2.5 shadow-md">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
          {filterDate ? 'Filtered Date' : 'Filter by Date'}
        </span>
        <div className="flex items-center gap-2.5">
          {filterDate && (
            <button
              onClick={() => onFilterDateChange(null)}
              className="text-[10px] text-ledgerCoral bg-ledgerCoral/10 hover:bg-ledgerCoral/20 border border-ledgerCoral/20 px-2 py-1 rounded-md uppercase font-semibold transition"
            >
              Clear
            </button>
          )}
          <div className="relative flex items-center bg-ledgerElevated border border-ledgerBorder rounded-lg px-2 py-1 text-xs text-ledgerText font-mono">
            <input
              type="date"
              max={getLocalDateString()}
              value={filterDate || ''}
              onChange={(e) => onFilterDateChange(e.target.value || null)}
              className="bg-transparent text-ledgerText border-none p-0 cursor-pointer font-mono outline-none text-xs focus:ring-0 w-[110px]"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-ledgerSurface border border-ledgerBorder rounded-xl shadow-lg mt-2">
          <div className="w-10 h-10 rounded-full bg-ledgerElevated border border-ledgerBorder flex items-center justify-center text-ledgerMuted mb-3">
            <AlertCircle className="w-5 h-5 text-ledgerMuted" />
          </div>
          <h3 className="text-xs font-semibold text-ledgerText mb-0.5">No expenses on this date</h3>
          <p className="text-[11px] text-ledgerMuted max-w-[200px]">
            You have no transactions logged for {filterDate ? formatGroupDate(filterDate) : 'this day'}.
          </p>
        </div>
      ) : (
        sortedGroups.map((group) => (
          <div key={group.date} className="space-y-2">
            {/* Day Group Header */}
            <div className="flex justify-between items-center px-1 text-xs text-ledgerMuted uppercase tracking-wider font-semibold">
              <span>{formatGroupDate(group.date)}</span>
              <span className="font-mono lowercase text-right">
                ₹{group.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Day Transactions */}
            <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl overflow-hidden divide-y divide-ledgerBorder">
              {group.expenses.map((expense) => {
                const categoryInfo = CATEGORIES[expense.category] || CATEGORIES.other;
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3.5 group hover:bg-ledgerElevated/30 transition-colors relative"
                    style={{ borderLeft: `3px solid ${categoryInfo.hex}` }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Category Tinted Chip */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${categoryInfo.bgClass}`}
                      >
                        <span className="text-lg leading-none">{categoryInfo.emoji}</span>
                      </div>

                      {/* Category Label and Optional Note */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ledgerText leading-tight">
                          {categoryInfo.label}
                        </p>
                        {expense.note && (
                          <p className="text-xs text-ledgerMuted truncate mt-0.5 max-w-[200px]">
                            {expense.note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right hand Side: Amount & Delete */}
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-ledgerText tabular-nums text-right font-medium">
                        ₹{Number(expense.amount).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>

                      <button
                        onClick={() => onDeleteExpense(expense.id)}
                        className="text-ledgerMuted hover:text-ledgerCoral opacity-20 hover:opacity-100 transition-all p-1.5 rounded hover:bg-ledgerCoral/10"
                        aria-label="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
