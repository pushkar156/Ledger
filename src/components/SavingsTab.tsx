import React, { useState } from 'react';
import type { SavingsTransaction } from '../types';
import { PiggyBank, ArrowUpRight, ArrowDownLeft, Plus, Trash2, Calendar, Clipboard } from 'lucide-react';

interface SavingsTabProps {
  savings: SavingsTransaction[];
  onAddSavings: (data: {
    amount: number;
    type: 'incoming' | 'outgoing';
    note: string;
    date: string;
  }) => Promise<void>;
  onDeleteSavings: (id: string) => Promise<void>;
}

// Utility to get local date in YYYY-MM-DD
const getLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format date to short text
const formatDateShort = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const SavingsTab: React.FC<SavingsTabProps> = ({
  savings,
  onAddSavings,
  onDeleteSavings,
}) => {
  const [type, setType] = useState<'incoming' | 'outgoing'>('incoming');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  // 1. Calculations
  const totalDeposited = savings
    .filter((s) => s.type === 'incoming')
    .reduce((sum, s) => sum + Number(s.amount), 0);

  const totalWithdrawn = savings
    .filter((s) => s.type === 'outgoing')
    .reduce((sum, s) => sum + Number(s.amount), 0);

  const savingsBalance = totalDeposited - totalWithdrawn;
  const isBalanceNegative = savingsBalance < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setValidationError('Please enter a valid amount.');
      return;
    }

    setSaving(true);
    try {
      await onAddSavings({
        amount: amt,
        type,
        note: note.trim(),
        date,
      });
      // Clear Form on success
      setAmountStr('');
      setNote('');
      setDate(getLocalDateString());
    } catch (err) {
      console.error(err);
      setValidationError('Failed to log savings transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 animate-fade-in">
      {/* 1. Metrics deck */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-4 flex flex-col justify-between shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
            Total Deposited
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-ledgerMint flex-shrink-0" />
            <span className="text-lg font-mono font-bold text-ledgerMint truncate tabular-nums">
              ₹{totalDeposited.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-4 flex flex-col justify-between shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
            Total Withdrawn
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-ledgerCoral flex-shrink-0" />
            <span className="text-lg font-mono font-bold text-ledgerCoral truncate tabular-nums">
              ₹{totalWithdrawn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="col-span-2 bg-ledgerSurface border border-ledgerBorder rounded-xl p-4 flex justify-between items-center shadow-md">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
              Net Savings Balance
            </span>
            <p className={`text-2xl font-mono font-bold tabular-nums mt-1 ${isBalanceNegative ? 'text-ledgerCoral' : 'text-ledgerMint'}`}>
              {showBalance ? `₹${savingsBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹ ••••••'}
            </p>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className={`p-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
              isBalanceNegative
                ? 'bg-ledgerCoral/5 text-ledgerCoral border border-ledgerCoral/10 hover:bg-ledgerCoral/10'
                : 'bg-ledgerMint/5 text-ledgerMint border border-ledgerMint/10 hover:bg-ledgerMint/10'
            }`}
            title={showBalance ? "Hide balance" : "Show balance"}
          >
            <PiggyBank className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 2. Add Savings Form */}
      <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
            Log Savings Movement
          </h3>
        </div>

        {/* Toggle Option Selector */}
        <div className="flex bg-ledgerElevated border border-ledgerBorder rounded-lg p-0.5">
          {/* Deposit button first */}
          <button
            type="button"
            onClick={() => setType('incoming')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
              type === 'incoming'
                ? 'bg-ledgerSurface text-ledgerMint border border-ledgerBorder/40 shadow-sm font-bold'
                : 'text-ledgerMuted hover:text-ledgerText'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-ledgerMint" />
            Deposit
          </button>
          {/* Withdraw button second */}
          <button
            type="button"
            onClick={() => setType('outgoing')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
              type === 'outgoing'
                ? 'bg-ledgerSurface text-ledgerCoral border border-ledgerBorder/40 shadow-sm font-bold'
                : 'text-ledgerMuted hover:text-ledgerText'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-ledgerCoral" />
            Withdraw
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
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Monthly allocation, Emergency fund..."
                  className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2 pl-8 pr-3 font-sans text-xs transition"
                />
              </div>
            </div>

            {/* Date Selector */}
            <div className="space-y-1 col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                Date
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ledgerMuted">
                  <Calendar className="w-3.5 h-3.5" />
                </span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2 pl-8 pr-3 font-mono text-xs transition"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full font-medium py-2.5 rounded-lg text-xs active:transform active:scale-[0.98] transition flex items-center justify-center gap-1.5 ${
              type === 'incoming'
                ? 'bg-ledgerMint text-[#0F1B1E] hover:bg-ledgerMint/90'
                : 'bg-ledgerCoral text-[#EAF2F0] hover:bg-ledgerCoral/90'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {saving ? 'Logging...' : type === 'incoming' ? 'Log Deposit' : 'Log Withdrawal'}
          </button>
        </form>

        {validationError && (
          <p className="text-xs text-ledgerCoral flex items-center gap-1.5 px-1 animate-fade-in">
            {validationError}
          </p>
        )}
      </div>

      {/* 3. Savings Logs list */}
      <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
            Savings History Logs
          </h3>
        </div>

        {savings.length === 0 ? (
          <p className="text-xs text-ledgerMuted text-center py-6">
            No savings transactions logged yet. Move funds using the form above.
          </p>
        ) : (
          <div className="divide-y divide-ledgerBorder/40 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin">
            {savings.map((tx) => {
              const isDeposit = tx.type === 'incoming';
              return (
                <div key={tx.id} className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0 group">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-medium text-ledgerText truncate">
                      {tx.note || (isDeposit ? 'Deposit' : 'Withdrawal')}
                    </p>
                    <span className="text-[9px] text-ledgerMuted font-mono">
                      {formatDateShort(tx.date)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className={`font-mono text-xs font-bold tabular-nums ${isDeposit ? 'text-ledgerMint' : 'text-ledgerCoral'}`}>
                      {isDeposit ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    
                    <button
                      onClick={() => onDeleteSavings(tx.id)}
                      className="text-ledgerMuted hover:text-ledgerCoral p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete log"
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
