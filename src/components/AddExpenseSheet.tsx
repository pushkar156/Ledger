import React, { useState, useEffect, useRef } from 'react';
import { CATEGORY_LIST } from '../constants/categories';
import { X, Calendar, AlignLeft } from 'lucide-react';
import type { Expense } from '../types';

interface AddExpenseSheetProps {
  onClose: () => void;
  onSave: (data: { amount: number; category: string; note: string; date: string; type: 'debit' | 'credit' }) => Promise<void>;
  editingExpense?: Expense | null;
}

// Utility to get local date in YYYY-MM-DD
const getLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AddExpenseSheet: React.FC<AddExpenseSheetProps> = ({ onClose, onSave, editingExpense = null }) => {
  const [amount, setAmount] = useState(editingExpense ? String(editingExpense.amount) : '');
  const [selectedCategory, setSelectedCategory] = useState<string>(editingExpense ? editingExpense.category : 'food');
  const [note, setNote] = useState(editingExpense ? (editingExpense.note || '') : '');
  const [date, setDate] = useState(editingExpense ? editingExpense.date : getLocalDateString());
  const [type, setType] = useState<'debit' | 'credit'>(editingExpense ? (editingExpense.type as 'debit' | 'credit') : 'debit');
  const [submitting, setSubmitting] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Autofocus the amount input on sheet mount
  useEffect(() => {
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits, a single optional decimal point, and up to two decimal places
    if (/^\d*\.?\d{0,2}$/.test(val)) {
      setAmount(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setSubmitting(true);
    try {
      await onSave({
        amount: parsedAmount,
        category: selectedCategory,
        note: note.trim(),
        date,
        type,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save expense:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isSaveDisabled = submitting || !amount || parseFloat(amount) <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in cursor-pointer"
      />

      {/* Slide-up sheet */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[480px] bg-ledgerSurface border-t border-ledgerBorder rounded-t-2xl z-50 px-6 pt-5 pb-8 shadow-2xl animate-slide-up flex flex-col space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ledgerText uppercase tracking-wider">
            {editingExpense ? (type === 'credit' ? 'Edit Credit' : 'Edit Expense') : (type === 'credit' ? 'New Credit' : 'New Expense')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ledgerMuted hover:text-ledgerText p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Control for Debit vs Credit */}
        <div className="flex bg-ledgerElevated border border-ledgerBorder rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setType('debit')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-[6px] transition-all duration-200 ${
              type === 'debit'
                ? 'bg-ledgerSurface text-[#E8615A] border border-ledgerBorder/40 shadow-sm font-bold'
                : 'text-ledgerMuted hover:text-ledgerText'
            }`}
          >
            Debit (Expense)
          </button>
          <button
            type="button"
            onClick={() => setType('credit')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-[6px] transition-all duration-200 ${
              type === 'credit'
                ? 'bg-ledgerSurface text-[#7FE7C4] border border-ledgerBorder/40 shadow-sm font-bold'
                : 'text-ledgerMuted hover:text-ledgerText'
            }`}
          >
            Credit (Income)
          </button>
        </div>

        {/* Large Amount Input */}
        <div className="relative flex items-center justify-center py-2">
          <span className={`absolute left-4 font-mono text-3xl transition-colors ${type === 'credit' ? 'text-ledgerMint' : 'text-ledgerMuted'}`}>₹</span>
          <input
            ref={amountInputRef}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            required
            value={amount}
            onChange={handleAmountChange}
            className={`w-full bg-ledgerElevated border border-ledgerBorder rounded-xl py-4 pl-12 pr-4 text-center font-mono text-3xl font-semibold tracking-tight tabular-nums transition ${
              type === 'credit' ? 'text-ledgerMint border-ledgerMint/30 focus:border-ledgerMint' : 'text-ledgerText'
            }`}
          />
        </div>

        {/* Category Picker Grid (4 Columns) */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted mb-2 px-1">
            Category
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORY_LIST.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-[10px] font-medium transition-all duration-200 ${
                    isSelected
                      ? `${cat.bgClass} ${cat.borderClass} ${cat.textClass} scale-[1.03] ring-1 ring-offset-0 ring-${cat.colorName}`
                      : 'bg-ledgerElevated border-ledgerBorder text-ledgerMuted hover:bg-ledgerElevated/75 hover:text-ledgerText'
                  }`}
                >
                  <span className="text-xl mb-1">{cat.emoji}</span>
                  <span className="truncate w-full text-center px-1">{cat.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Note field */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted mb-1 px-1">
            Note (Optional)
          </label>
          <div className="relative">
            <AlignLeft className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ledgerMuted" />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. dinner with friends"
              className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-4 text-sm transition"
            />
          </div>
        </div>

        {/* Date Field */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted mb-1 px-1">
            Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ledgerMuted" />
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-4 text-sm font-mono transition"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-ledgerBorder text-ledgerMuted hover:text-ledgerText hover:bg-ledgerElevated/35 font-medium py-2.5 rounded-lg text-sm transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaveDisabled}
            className="flex-1 bg-ledgerMint text-[#0F1B1E] font-medium py-2.5 rounded-lg text-sm hover:bg-ledgerMint/90 active:transform active:scale-[0.98] transition disabled:opacity-40 disabled:hover:bg-ledgerMint disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : type === 'credit' ? 'Save Credit' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};
