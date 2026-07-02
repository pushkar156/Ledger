import React, { useState, useEffect } from 'react';
import type { Budget } from '../types';
import { Save, AlertCircle, Calendar, CalendarRange, X } from 'lucide-react';

interface ConfigureBudgetSheetProps {
  activeBudget: Budget | null;
  onClose: () => void;
  onSave: (data: {
    type: 'monthly' | 'custom';
    monthly: number;
    start_date?: string;
    end_date?: string;
  }) => Promise<void>;
}

// Utility to get local date in YYYY-MM-DD
const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ConfigureBudgetSheet: React.FC<ConfigureBudgetSheetProps> = ({
  activeBudget,
  onClose,
  onSave,
}) => {
  const [trackingMode, setTrackingMode] = useState<'monthly' | 'custom'>('monthly');
  const [budgetString, setBudgetString] = useState('');
  
  // Custom Date fields
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return getLocalDateString(endOfMonth);
  });
  
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state if activeBudget changes
  useEffect(() => {
    if (activeBudget) {
      setTrackingMode(activeBudget.type);
      setBudgetString(activeBudget.monthly.toString());
      if (activeBudget.type === 'custom') {
        if (activeBudget.start_date) setStartDate(activeBudget.start_date);
        if (activeBudget.end_date) setEndDate(activeBudget.end_date);
      }
    }
  }, [activeBudget]);

  const handleStartDateChange = (val: string) => {
    const todayStr = getLocalDateString();
    if (val > todayStr) {
      setValidationError('Start date cannot be in the future.');
      setStartDate(todayStr);
    } else {
      setValidationError(null);
      setStartDate(val);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const limitNum = parseFloat(budgetString);
    if (isNaN(limitNum) || limitNum < 0) {
      setValidationError('Please enter a valid budget amount.');
      return;
    }

    if (trackingMode === 'custom') {
      if (!startDate || !endDate) {
        setValidationError('Start date and End date are required for custom ranges.');
        return;
      }
      const todayStr = getLocalDateString();
      if (startDate > todayStr) {
        setValidationError('Start date cannot be in the future.');
        setStartDate(todayStr);
        return;
      }
      if (startDate > endDate) {
        setValidationError('Start date cannot occur after End date.');
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        type: trackingMode,
        monthly: limitNum,
        start_date: trackingMode === 'custom' ? startDate : undefined,
        end_date: trackingMode === 'custom' ? endDate : undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setValidationError('Failed to save budget settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F1B1E]/80 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in">
      <div className="w-full max-w-[480px] bg-ledgerSurface border-t border-ledgerBorder rounded-t-2xl p-5 pb-8 shadow-2xl flex flex-col space-y-4 animate-slide-up relative">
        
        {/* Header Title & Close Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-ledgerMuted uppercase tracking-wider">
            Configure Active Budget
          </h3>
          <button
            onClick={onClose}
            className="text-ledgerMuted hover:text-ledgerText p-1.5 rounded-lg hover:bg-ledgerElevated"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Mode Selector */}
        <div className="flex bg-ledgerElevated border border-ledgerBorder rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => {
              setTrackingMode('monthly');
              setValidationError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
              trackingMode === 'monthly'
                ? 'bg-ledgerSurface text-ledgerMint border border-ledgerBorder/40 shadow-sm font-bold'
                : 'text-ledgerMuted hover:text-ledgerText'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Monthly (1 to 1)
          </button>
          <button
            type="button"
            onClick={() => {
              setTrackingMode('custom');
              setValidationError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
              trackingMode === 'custom'
                ? 'bg-ledgerSurface text-ledgerMint border border-ledgerBorder/40 shadow-sm font-bold'
                : 'text-ledgerMuted hover:text-ledgerText'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            Custom Range
          </button>
        </div>

        <form onSubmit={handleSaveBudget} className="space-y-4">
          {/* Custom Date Pickers */}
          {trackingMode === 'custom' && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 px-3 font-mono text-xs transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 px-3 font-mono text-xs transition"
                />
              </div>
            </div>
          )}

          {/* Budget Limit Input */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
              Budget Limit
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
                value={budgetString}
                onChange={(e) => setBudgetString(e.target.value)}
                placeholder="0.00"
                className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-3 pl-8 pr-4 font-mono text-sm tracking-tight transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-ledgerMint text-[#0F1B1E] font-semibold py-2.5 rounded-lg text-xs hover:bg-ledgerMint/90 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Budget Setup'}
          </button>
        </form>

        {validationError && (
          <p className="text-xs text-ledgerCoral flex items-center gap-1.5 px-1 animate-fade-in bg-ledgerCoral/5 border border-ledgerCoral/10 py-2 rounded-lg justify-center">
            <AlertCircle className="w-3.5 h-3.5" />
            {validationError}
          </p>
        )}
      </div>
    </div>
  );
};
