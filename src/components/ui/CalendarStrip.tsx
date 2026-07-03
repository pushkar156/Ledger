import React, { useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  expenses: Array<{ date: string; amount: number; type: string }>;
  activeRange: { startDate: string; endDate: string };
}

// Utility to get day name, date, month
const getDayDetails = (date: Date) => {
  const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
  const dayNum = date.getDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(dayNum).padStart(2, '0');
  const isoStr = `${year}-${month}-${day}`;
  return { dayName, dayNum, isoStr };
};

export const CalendarStrip: React.FC<CalendarStripProps> = ({
  selectedDate,
  onSelectDate,
  expenses,
  activeRange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate days in the active range or current month if active range is default/empty
  const days = useMemo(() => {
    const start = new Date(activeRange.startDate);
    const end = new Date(activeRange.endDate);
    const list = [];
    let current = new Date(start);

    // Safeguard to prevent infinite loops or excessive rendering
    const maxDays = 60;
    let count = 0;

    while (current <= end && count < maxDays) {
      list.push(getDayDetails(new Date(current)));
      current.setDate(current.getDate() + 1);
      count++;
    }
    return list;
  }, [activeRange.startDate, activeRange.endDate]);

  // Map dates containing activities
  const activityMap = useMemo(() => {
    const map: Record<string, { debits: number; credits: number }> = {};
    expenses.forEach((e) => {
      if (!map[e.date]) {
        map[e.date] = { debits: 0, credits: 0 };
      }
      const amt = Number(e.amount);
      if (e.type === 'credit') {
        map[e.date].credits += amt;
      } else {
        map[e.date].debits += amt;
      }
    });
    return map;
  }, [expenses]);

  // Auto-scroll selected date into view
  useEffect(() => {
    if (!containerRef.current) return;
    const selectedEl = containerRef.current.querySelector('[data-selected="true"]');
    if (selectedEl) {
      selectedEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedDate]);

  return (
    <div className="w-full bg-ledgerSurface border border-ledgerBorder rounded-xl p-3 shadow-md">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
          Select Day
        </span>
        <button
          onClick={() => onSelectDate('')}
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider transition-colors",
            selectedDate === ''
              ? "text-ledgerMint"
              : "text-ledgerMuted hover:text-ledgerText"
          )}
        >
          Show All
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory"
      >
        {days.map((d) => {
          const isSelected = selectedDate === d.isoStr;
          const activity = activityMap[d.isoStr];
          const hasDebit = activity && activity.debits > 0;
          const hasCredit = activity && activity.credits > 0;

          return (
            <button
              key={d.isoStr}
              data-selected={isSelected}
              onClick={() => onSelectDate(d.isoStr)}
              className={cn(
                "flex-shrink-0 w-11 py-2 rounded-lg flex flex-col items-center justify-between transition-all select-none snap-center relative border",
                isSelected
                  ? "bg-ledgerMint border-ledgerMint text-[#0F1B1E] scale-105 shadow-sm shadow-ledgerMint/20"
                  : "bg-ledgerElevated border-ledgerBorder text-ledgerText hover:border-ledgerMuted/40"
              )}
            >
              <span className={cn(
                "text-[8px] uppercase tracking-wider font-bold",
                isSelected ? "text-[#0F1B1E]" : "text-ledgerMuted"
              )}>
                {d.dayName}
              </span>
              <span className="text-sm font-mono font-bold leading-none mt-1">
                {d.dayNum}
              </span>

              {/* Glowing activity dots */}
              <div className="flex gap-0.5 mt-1.5 h-1 items-center justify-center">
                {hasDebit && (
                  <span className={cn(
                    "w-1 h-1 rounded-full",
                    isSelected ? "bg-[#0F1B1E]" : "bg-ledgerCoral"
                  )} />
                )}
                {hasCredit && (
                  <span className={cn(
                    "w-1 h-1 rounded-full",
                    isSelected ? "bg-[#0F1B1E]" : "bg-ledgerMint"
                  )} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
