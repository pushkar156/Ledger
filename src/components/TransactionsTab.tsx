import React from 'react';
import type { Expense } from '../types';
import { CATEGORIES } from '../constants/categories';
import { CategoryIcon } from './ui/CategoryIcon';
import { EmptyState } from './ui/EmptyState';
import { SwipeableTransactionRow } from './ui/SwipeableTransactionRow';
import { DeleteLogButton } from '@/components/ui/DeleteLogButton';

interface TransactionsTabProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
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
}) => {
  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Tap '+ Add expense' below to log your first transaction."
      />
    );
  }

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
    
    // Debits increase spending, credits decrease it
    if (expense.type === 'credit') {
      acc[key].subtotal -= Number(expense.amount);
    } else {
      acc[key].subtotal += Number(expense.amount);
    }
    return acc;
  }, {} as Record<string, { date: string; expenses: Expense[]; subtotal: number }>);

  // Sort groups descending by date
  const sortedGroups = Object.values(grouped).sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <div className="space-y-6 pb-24">
      {sortedGroups.map((group) => (
        <div key={group.date} className="space-y-2">
          {/* Day Group Header */}
          <div className="flex justify-between items-center px-1 text-xs text-ledgerMuted uppercase tracking-wider font-semibold">
            <span>{formatGroupDate(group.date)}</span>
            <span className={`font-mono text-right ${group.subtotal < 0 ? 'text-ledgerMint font-medium' : 'text-ledgerMuted'}`}>
              {group.subtotal < 0 ? '+' : ''}₹{Math.abs(group.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Day Transactions */}
          <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl overflow-hidden divide-y divide-ledgerBorder">
            {group.expenses.map((expense) => {
              const categoryInfo = CATEGORIES[expense.category] || CATEGORIES.other;
              return (
                <SwipeableTransactionRow
                  key={expense.id}
                  onDelete={() => onDeleteExpense(expense.id)}
                >
                  <div
                    className="flex items-center justify-between p-3.5 group hover:bg-ledgerElevated/30 transition-colors relative w-full"
                    style={{ borderLeft: `3px solid ${categoryInfo.hex}` }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Category Icon */}
                      <CategoryIcon category={expense.category} size="md" />

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

                    {/* Right hand Side: Amount */}
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-sm tabular-nums text-right font-medium ${
                        expense.type === 'credit' ? 'text-ledgerMint' : 'text-ledgerText'
                      }`}>
                        {expense.type === 'credit' ? '+' : '−'}₹{Number(expense.amount).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </SwipeableTransactionRow>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
