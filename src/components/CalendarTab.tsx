import React, { useState } from 'react';
import type { Expense } from '../types';
import { Calendar } from '@/components/ui/calendar';
import { CATEGORIES } from '../constants/categories';
import { CalendarDays, Sparkles, Trash2 } from 'lucide-react';

interface CalendarTabProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => Promise<void>;
}

// Helper to format date to local YYYY-MM-DD
const formatDateToYYYYMMDD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CalendarTab: React.FC<CalendarTabProps> = ({ expenses, onDeleteExpense }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const targetDateStr = selectedDate ? formatDateToYYYYMMDD(selectedDate) : '';
  
  // Filter expenses matching selected date
  const dayExpenses = expenses.filter((e) => e.date === targetDateStr);

  const totalSpent = dayExpenses
    .filter((e) => e.type !== 'credit')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalCredited = dayExpenses
    .filter((e) => e.type === 'credit')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6 pb-28 animate-fade-in flex flex-col items-center">
      {/* Calendar Card */}
      <div className="w-full bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col items-center space-y-4">
        <div className="w-full flex items-center gap-3">
          <div className="p-2.5 bg-ledgerMint/10 text-ledgerMint rounded-lg">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
              Calendar Explorer
            </h3>
            <p className="text-[11px] text-ledgerText font-medium mt-0.5 flex items-center gap-1">
              Interactive date ledger <Sparkles className="w-3 h-3 text-ledgerMint" />
            </p>
          </div>
        </div>

        {/* Calendar Picker wrapper */}
        <div className="w-full flex justify-center py-2 bg-ledgerElevated/35 border border-ledgerBorder/40 rounded-xl">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="text-ledgerText"
            expenses={expenses}
          />
        </div>
      </div>

      {/* Selected Day Log list */}
      <div className="w-full bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
        <div className="flex justify-between items-center border-b border-ledgerBorder/40 pb-2">
          <h4 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
            {selectedDate
              ? selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'Select a Date'}
          </h4>
          {selectedDate && dayExpenses.length > 0 && (
            <span className="text-[10px] text-ledgerMuted font-mono">
              Spent: ₹{totalSpent.toLocaleString('en-IN')} 
              {totalCredited > 0 && <span className="text-ledgerMint"> | Credited: +₹{totalCredited.toLocaleString('en-IN')}</span>}
            </span>
          )}
        </div>

        {dayExpenses.length === 0 ? (
          <p className="text-xs text-ledgerMuted text-center py-8">
            No transactions logged on this day.
          </p>
        ) : (
          <div className="divide-y divide-ledgerBorder/30">
            {dayExpenses.map((tx) => {
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
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`font-mono text-xs font-semibold tabular-nums ${isCredit ? 'text-ledgerMint' : 'text-ledgerText'}`}>
                      {isCredit ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => onDeleteExpense(tx.id)}
                      className="text-ledgerMuted hover:text-ledgerCoral p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
