"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  expenses?: Array<{ date: string; amount: number; type: string }>;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  components: userComponents,
  expenses = [],
  ...props
}: CalendarProps) {
  // Pre-calculate daily transactions map
  const spendsMap = React.useMemo(() => {
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

  const defaultClassNames = {
    // Horizontal row of months with swipe scroll support on narrow mobile viewports
    months: "relative flex flex-row gap-5 overflow-x-auto scrollbar-none pb-1 w-full snap-x snap-mandatory",
    month: "w-full min-w-[280px] snap-center",
    month_caption: "relative mx-10 mb-2 flex h-9 items-center justify-center z-20",
    caption_label: "text-xs font-bold uppercase tracking-wider text-ledgerMuted",
    nav: "absolute top-0 flex w-full justify-between z-10",
    button_previous: cn(
      buttonVariants({ variant: "ghost" }),
      "size-8 text-ledgerMuted hover:text-ledgerText p-0",
    ),
    button_next: cn(
      buttonVariants({ variant: "ghost" }),
      "size-8 text-ledgerMuted hover:text-ledgerText p-0",
    ),
    weekday: "size-10 p-0 text-[10px] font-bold uppercase tracking-wider text-ledgerMuted/60 text-center align-middle",
    day_button:
      "relative flex size-10 flex-col items-center justify-center whitespace-nowrap rounded-lg p-0 text-ledgerText outline-offset-2 hover:bg-ledgerElevated focus-visible:outline-none transition group-data-[disabled]:pointer-events-none group-data-[outside]:text-transparent group-data-[selected]:bg-ledgerMint group-data-[selected]:text-[#0F1B1E] group-data-[selected]:hover:bg-ledgerMint/90",
    day: "group size-10 px-0 text-sm",
    range_start: "range-start",
    range_end: "range-end",
    range_middle: "range-middle",
    today:
      "after:absolute after:bottom-1 after:start-1/2 after:z-10 after:size-[3px] after:-translate-x-1/2 after:rounded-full after:bg-ledgerMint group-data-[selected]:after:bg-[#0F1B1E] after:transition-colors",
    outside: "text-transparent pointer-events-none",
    hidden: "invisible",
    week_number: "size-10 p-0 text-xs font-medium text-ledgerMuted/50 text-center align-middle",
  };

  const mergedClassNames: typeof defaultClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => ({
      ...acc,
      [key]: classNames?.[key as keyof typeof classNames]
        ? cn(
            defaultClassNames[key as keyof typeof defaultClassNames],
            classNames[key as keyof typeof classNames],
          )
        : defaultClassNames[key as keyof typeof defaultClassNames],
    }),
    {} as typeof defaultClassNames,
  );

  const defaultComponents = {
    Chevron: (props: any) => {
      if (props.orientation === "left") {
        return <ChevronLeft size={16} strokeWidth={2} {...props} aria-hidden="true" />;
      }
      return <ChevronRight size={16} strokeWidth={2} {...props} aria-hidden="true" />;
    },
    DayButton: (dayButtonProps: any) => {
      const { day, modifiers, ...rest } = dayButtonProps;
      const dateStr = day.isoDate;
      const activity = spendsMap[dateStr];
      const hasActivity = !!activity;
      
      const debits = activity?.debits || 0;
      const credits = activity?.credits || 0;
      const netAmount = credits - debits;
      
      const isSelected = !!modifiers?.selected;

      // Color-coding rule: if net transactions is positive (credits > debits), green. Otherwise grey/black.
      const isPositive = netAmount > 0;
      const displayAmt = Math.round(Math.abs(netAmount));

      return (
        <button
          {...rest}
          className={cn(
            rest.className,
            "flex flex-col items-center justify-center w-full h-full relative"
          )}
        >
          <span className={cn(
            "text-[11px] font-semibold tracking-tight leading-none mt-1",
            isSelected ? "text-[#0F1B1E]" : "text-ledgerText"
          )}>
            {day.date.getDate()}
          </span>
          <span className={cn(
            "text-[7.5px] font-mono leading-none mt-1.5 min-h-[9px] flex items-center justify-center select-none font-bold",
            !hasActivity
              ? "text-transparent"
              : isSelected
              ? "text-[#0F1B1E]"
              : isPositive
              ? "text-ledgerMint"
              : "text-ledgerMuted"
          )}>
            {hasActivity ? `₹${displayAmt >= 1000 ? `${(displayAmt / 1000).toFixed(0)}k` : displayAmt}` : ''}
          </span>
        </button>
      );
    }
  };

  const mergedComponents = {
    ...defaultComponents,
    ...userComponents,
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-fit", className)}
      classNames={mergedClassNames}
      components={mergedComponents}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
