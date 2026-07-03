import React, { useState } from 'react';
import type { RecurringTransaction } from '../types';
import { CATEGORIES, CATEGORY_LIST } from '../constants/categories';
import { Repeat, Plus, Trash2, CalendarDays, Clipboard, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { CategoryIcon } from './ui/CategoryIcon';
import { EmptyState } from './ui/EmptyState';

interface RecurringTabProps {
  recurring: RecurringTransaction[];
  onAddRecurring: (data: {
    amount: number;
    category: string;
    note: string;
    type: 'debit' | 'credit';
    dayOfMonth: number;
  }) => Promise<void>;
  onDeleteRecurring: (id: string) => Promise<void>;
}

export const RecurringTab: React.FC<RecurringTabProps> = ({
  recurring,
  onAddRecurring,
  onDeleteRecurring,
}) => {
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState(CATEGORY_LIST[0].id);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setValidationError('Please enter a valid amount.');
      return;
    }

    if (dayOfMonth < 1 || dayOfMonth > 31) {
      setValidationError('Day of month must be between 1 and 31.');
      return;
    }

    setSaving(true);
    try {
      await onAddRecurring({
        amount: amt,
        category,
        note: note.trim(),
        type,
        dayOfMonth,
      });
      // Clear Form on success
      setAmountStr('');
      setNote('');
      setDayOfMonth(1);
    } catch (err) {
      console.error(err);
      setValidationError('Failed to save recurring transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 animate-fade-in">
      {/* 1. Add Recurring Rule Form */}
      <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-ledgerMint/10 text-ledgerMint rounded-lg">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
              Setup Auto-Billing
            </h3>
            <p className="text-[11px] text-ledgerText font-medium mt-0.5">
              Configure recurring monthly expenses & incomes
            </p>
          </div>
        </div>

        {/* Toggle Option Selector */}
        <div className="flex bg-ledgerElevated border border-ledgerBorder rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setType('debit')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
              type === 'debit'
                ? 'bg-ledgerSurface text-ledgerCoral border border-ledgerBorder/40 shadow-sm font-bold'
                : 'text-ledgerMuted hover:text-ledgerText'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-ledgerCoral" />
            Recurring Expense
          </button>
          <button
            type="button"
            onClick={() => setType('credit')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
              type === 'credit'
                ? 'bg-ledgerSurface text-ledgerMint border border-ledgerBorder/40 shadow-sm font-bold'
                : 'text-ledgerMuted hover:text-ledgerText'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-ledgerMint" />
            Recurring Income
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Amount input */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 font-mono text-ledgerMuted text-sm">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-8 pr-4 font-mono text-sm tracking-tight transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Note input */}
            <div className="space-y-1 col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                Description / Note
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ledgerMuted">
                  <Clipboard className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  required
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Netflix Subscription, Gym, Salary..."
                  className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2 pl-8 pr-3 font-sans text-xs transition"
                />
              </div>
            </div>

            {/* Category dropdown */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2 px-3 font-sans text-xs transition outline-none cursor-pointer"
              >
                {CATEGORY_LIST.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Day of Month */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                Day of Month (1-31)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ledgerMuted">
                  <CalendarDays className="w-3.5 h-3.5" />
                </span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                  className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2 pl-8 pr-3 font-mono text-xs transition"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full font-medium py-2.5 rounded-lg text-xs active:transform active:scale-[0.98] transition flex items-center justify-center gap-1.5 ${
              type === 'credit'
                ? 'bg-ledgerMint text-[#0F1B1E] hover:bg-ledgerMint/90'
                : 'bg-ledgerCoral text-[#EAF2F0] hover:bg-ledgerCoral/90'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Add Auto-Bill'}
          </button>
        </form>

        {validationError && (
          <p className="text-xs text-ledgerCoral flex items-center gap-1.5 px-1 animate-fade-in">
            {validationError}
          </p>
        )}
      </div>

      {/* 2. Recurring List */}
      <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
            Active Auto-Bills & Subscriptions
          </h3>
        </div>

        {recurring.length === 0 ? (
          <EmptyState
            title="No recurring transactions configured yet"
            description="Setup a rule above."
          />
        ) : (
          <div className="divide-y divide-ledgerBorder/40 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin">
            {recurring.map((tx) => {
              const isCredit = tx.type === 'credit';
              return (
                <div key={tx.id} className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0 group">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <CategoryIcon category={tx.category} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ledgerText truncate">
                        {tx.note}
                      </p>
                      <span className="text-[9px] text-ledgerMuted font-mono">
                        Every month on the {tx.dayOfMonth === 1 ? '1st' : tx.dayOfMonth === 2 ? '2nd' : tx.dayOfMonth === 3 ? '3rd' : `${tx.dayOfMonth}th`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className={`font-mono text-xs font-bold tabular-nums ${isCredit ? 'text-ledgerMint' : 'text-ledgerText'}`}>
                      {isCredit ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    
                    <button
                      onClick={() => onDeleteRecurring(tx.id)}
                      className="text-ledgerMuted hover:text-ledgerCoral p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete auto-bill"
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
