import React, { useState } from 'react';
import type { Expense } from '../types';
import { CATEGORIES } from '../constants/categories';
import { CategoryIcon } from './ui/CategoryIcon';
import { EmptyState } from './ui/EmptyState';
import { SwipeableTransactionRow } from './ui/SwipeableTransactionRow';
import { CalendarStrip } from './ui/CalendarStrip';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, ListFilter } from 'lucide-react';

interface TransactionsTabProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  activeRange: { startDate: string; endDate: string };
}

// Utility to parse local date cleanly
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper to get local date in YYYY-MM-DD
const getLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format date to local YYYY-MM-DD from Date object
const formatDateToYYYYMMDD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  activeRange,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [showFullCalendar, setShowFullCalendar] = useState<boolean>(false);

  // Filter based on strip selection (if selectedDate is empty string, show all)
  const filteredExpenses = selectedDate
    ? expenses.filter((e) => e.date === selectedDate)
    : expenses;

  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Tap '+ Add expense' below to log your first transaction."
      />
    );
  }

  // Group filtered expenses by date string
  const grouped = filteredExpenses.reduce((acc, expense) => {
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
    <div className="space-y-4 pb-24">
      {/* View Toggle Header */}
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
          Timeline
        </span>
        <button
          onClick={() => setShowFullCalendar(!showFullCalendar)}
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#6FA8DC] hover:text-[#6FA8DC]/80 transition-colors"
        >
          {showFullCalendar ? (
            <>
              <ListFilter className="w-3.5 h-3.5" />
              Show Strip Feed
            </>
          ) : (
            <>
              <CalendarDays className="w-3.5 h-3.5" />
              Full Calendar View
            </>
          )}
        </button>
      </div>

      {showFullCalendar ? (
        /* Full Calendar Card view */
        <div className="w-full bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col items-center">
          <Calendar
            mode="single"
            selected={selectedDate ? parseLocalDate(selectedDate) : undefined}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(formatDateToYYYYMMDD(date));
              }
            }}
            className="text-ledgerText"
            expenses={expenses}
            numberOfMonths={1}
            showOutsideDays={false}
          />
        </div>
      ) : (
        /* Calendar horizontal strip filter */
        <CalendarStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          expenses={expenses}
          activeRange={activeRange}
        />
      )}

      {sortedGroups.length === 0 ? (
        <EmptyState
          title="No transactions"
          description={selectedDate ? `Nothing logged for ${formatGroupDate(selectedDate)}.` : "No transactions logged in this period."}
        />
      ) : (
        sortedGroups.map((group) => (
          <div key={group.date} className="space-y-2">
            {/* Day Group Header */}
            <div className="flex justify-between items-center px-1 text-xs text-ledgerMuted uppercase tracking-wider font-semibold">
              <span>{formatGroupDate(group.date)}</span>
              <span className={`font-mono text-right ${group.subtotal < 0 ? 'text-ledgerGreen font-medium' : 'text-ledgerMuted'}`}>
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
                          expense.type === 'credit' ? 'text-ledgerGreen' : 'text-ledgerCoral'
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
        ))
      )}
    </div>
  );
};
