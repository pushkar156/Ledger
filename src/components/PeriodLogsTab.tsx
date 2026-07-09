import React, { useState, useMemo, useRef } from 'react';
import type { Expense, Budget } from '../types';
import { CATEGORIES } from '../constants/categories';
import { ChevronDown, ChevronUp, CalendarDays, Trash2, Download, Upload } from 'lucide-react';
import { DeleteLogButton } from '@/components/ui/DeleteLogButton';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface PeriodLogsTabProps {
  expenses: Expense[];
  allBudgets: Budget[];
  onDeleteExpense: (id: string) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
  onImportExpenses: (imported: Array<{
    amount: number;
    category: string;
    note: string;
    date: string;
    type: 'debit' | 'credit';
  }>) => Promise<void>;
}

// Helper to format date to short text
const formatDateShort = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Helper to calculate standard calendar month range
const getMonthRange = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
};

export const PeriodLogsTab: React.FC<PeriodLogsTabProps> = ({
  expenses,
  allBudgets,
  onDeleteExpense,
  onDeleteBudget,
  onImportExpenses,
}) => {
  // Store expanded period budget IDs in local state
  const [expandedPeriodIds, setExpandedPeriodIds] = useState<Record<string, boolean>>({});
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedPeriodIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Helper to convert array of expenses to CSV file and download it
  const downloadCSV = (data: Expense[], filename: string) => {
    // CSV Header row
    const headers = ['Date', 'Amount', 'Type', 'Category', 'Note'];
    const rows = data.map((e) => [
      e.date,
      e.amount,
      e.type,
      e.category,
      e.note || ''
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger export of all history transactions
  const exportAllToCSV = () => {
    if (expenses.length === 0) return;
    const dateStr = new Date().toISOString().substring(0, 10);
    downloadCSV(expenses, `ledger_all_expenses_backup_${dateStr}.csv`);
  };

  // Trigger export of period-specific transactions
  const exportPeriodToCSV = (period: any) => {
    if (period.transactions.length === 0) return;
    const sanitizedLabel = period.label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    downloadCSV(period.transactions, `ledger_expenses_period_${sanitizedLabel}.csv`);
  };

  // Trigger file browser for CSV upload
  const triggerCSVImport = () => {
    fileInputRef.current?.click();
  };

  // Parse imported CSV file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length <= 1) {
          alert('CSV file is empty or missing headers.');
          return;
        }

        // Header mapping check
        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        const dateIdx = headers.indexOf('date');
        const amountIdx = headers.indexOf('amount');
        const typeIdx = headers.indexOf('type');
        const categoryIdx = headers.indexOf('category');
        const noteIdx = headers.indexOf('note');

        if (dateIdx === -1 || amountIdx === -1 || typeIdx === -1 || categoryIdx === -1) {
          alert('Invalid CSV structure. Headers must contain Date, Amount, Type, and Category.');
          return;
        }

        const parsedItems: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          // Parse CSV values handling quotes correctly
          const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
          const cleanRow = row.map(val => val.replace(/^"|"$/g, '').trim());

          const dateVal = cleanRow[dateIdx];
          const amountVal = parseFloat(cleanRow[amountIdx]);
          const typeVal = cleanRow[typeIdx] as 'debit' | 'credit';
          const categoryVal = cleanRow[categoryIdx];
          const noteVal = noteIdx !== -1 ? cleanRow[noteIdx] : '';

          if (dateVal && !isNaN(amountVal) && (typeVal === 'debit' || typeVal === 'credit') && categoryVal) {
            parsedItems.push({
              amount: amountVal,
              category: categoryVal,
              note: noteVal,
              date: dateVal,
              type: typeVal
            });
          }
        }

        if (parsedItems.length > 0) {
          await onImportExpenses(parsedItems);
        } else {
          alert('No valid transaction logs found in the CSV.');
        }
      } catch (err) {
        console.error('Failed to parse CSV:', err);
        alert('Failed to parse CSV file. Ensure it is formatted correctly.');
      } finally {
        // Reset file input value to allow uploading the same file again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  // Compile periods and group transactions matching their dates
  const periodsData = useMemo(() => {
    // If no budgets configured, we don't have periods yet
    if (allBudgets.length === 0) return [];

    // Map each budget configuration to a calculated period with dates and transactions
    const mapped = allBudgets.map((b, index) => {
      const budgetId = b.id || `budget-${index}-${b.type}-${b.month || b.start_date}`;
      
      let startDate = '';
      let endDate = '';
      let label = '';

      if (b.type === 'custom') {
        startDate = b.start_date || '';
        endDate = b.end_date || '';
        if (startDate && endDate) {
          label = `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
        } else {
          label = 'Custom Range';
        }
      } else {
        const monthStr = b.month || new Date().toISOString().substring(0, 7);
        const range = getMonthRange(monthStr);
        startDate = range.startDate;
        endDate = range.endDate;
        label = new Date(monthStr + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      }

      // Filter transactions occurring in this budget period range
      const periodExpenses = expenses.filter(
        (e) => e.date >= startDate && e.date <= endDate
      );

      const debitsSum = periodExpenses
        .filter((e) => e.type !== 'credit')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const creditsSum = periodExpenses
        .filter((e) => e.type === 'credit')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const netBalance = Number(b.monthly) - debitsSum + creditsSum;

      // Sort period transactions by date descending
      const sortedTransactions = [...periodExpenses].sort((a, b) => b.date.localeCompare(a.date));

      return {
        id: budgetId,
        config: b,
        label,
        startDate,
        endDate,
        limit: Number(b.monthly),
        spent: debitsSum,
        credited: creditsSum,
        balance: netBalance,
        transactions: sortedTransactions,
        createdAtTime: b.created_at ? new Date(b.created_at).getTime() : 0,
      };
    });

    // Sort periods by creation date / start date descending (newest first)
    return mapped.sort((a, b) => {
      if (b.createdAtTime !== a.createdAtTime) {
        return b.createdAtTime - a.createdAtTime;
      }
      return b.startDate.localeCompare(a.startDate);
    });
  }, [allBudgets, expenses]);

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
          Historical Budget Periods
        </h3>
        
        <div className="flex items-center gap-2">
          {/* Hidden file input for CSV parsing */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          
          <button
            onClick={triggerCSVImport}
            className="bg-ledgerElevated hover:bg-ledgerElevated/80 border border-ledgerBorder text-ledgerText font-medium px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition flex items-center gap-1 active:scale-95"
            title="Import expense logs from a CSV backup file"
          >
            <Upload className="w-3.5 h-3.5 text-ledgerMint" />
            Import
          </button>

          {expenses.length > 0 && (
            <button
              onClick={exportAllToCSV}
              className="bg-ledgerElevated hover:bg-ledgerElevated/80 border border-ledgerBorder text-ledgerText font-medium px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition flex items-center gap-1 active:scale-95"
              title="Export all logged transactions as CSV backup"
            >
              <Download className="w-3.5 h-3.5 text-ledgerMint" />
              Export All
            </button>
          )}
        </div>
      </div>

      {periodsData.length === 0 ? (
        <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <CalendarDays className="w-10 h-10 text-ledgerMuted mb-2.5 opacity-60" />
          <p className="text-xs text-ledgerMuted max-w-[220px]">
            No budget periods configured yet. Set a budget in the Settings panel to open a tracking period.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {periodsData.map((period) => {
            const isExpanded = !!expandedPeriodIds[period.id];
            const isBalanceNegative = period.balance < 0;

            return (
              <div
                key={period.id}
                className="bg-ledgerSurface border border-ledgerBorder rounded-xl overflow-hidden shadow-md transition-all duration-200"
              >
                {/* Period Summary Card Header */}
                <div
                  onClick={() => toggleExpand(period.id)}
                  className="p-4 cursor-pointer hover:bg-ledgerElevated/35 flex justify-between items-center transition select-none"
                >
                  <div className="space-y-1 pr-3 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-ledgerText truncate">
                        {period.label}
                      </h4>
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        period.config.type === 'custom'
                          ? 'border-indigo-400/20 text-indigo-300 bg-indigo-400/5'
                          : 'border-ledgerMint/20 text-ledgerMint bg-ledgerMint/5'
                      }`}>
                        {period.config.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-ledgerMuted font-mono">
                      Spent: <span className="text-ledgerText">₹{period.spent.toLocaleString('en-IN')}</span> 
                      {period.credited > 0 && (
                        <> | Credited: <span className="text-ledgerMint">+₹{period.credited.toLocaleString('en-IN')}</span></>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <span className="block text-[9px] text-ledgerMuted uppercase tracking-wider">
                        Remaining
                      </span>
                      <span className={`text-xs font-mono font-bold tabular-nums ${isBalanceNegative ? 'text-ledgerCoral' : 'text-[#7FE7C4]'}`}>
                        ₹{period.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingBudgetId(period.id);
                        }}
                        className="text-ledgerMuted hover:text-ledgerCoral opacity-40 hover:opacity-100 transition-all p-1.5 rounded hover:bg-ledgerCoral/10"
                        title="Delete budget period"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="text-ledgerMuted p-1 bg-ledgerElevated/50 rounded-lg">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Period Transactions Sub-List */}
                {isExpanded && (
                  <div className="border-t border-ledgerBorder bg-ledgerElevated/15 p-4 animate-slide-up space-y-3">
                    <div className="flex justify-between items-center border-b border-ledgerBorder/40 pb-2">
                      <div className="flex items-center gap-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
                          Transaction History ({period.transactions.length})
                        </h5>
                        {period.transactions.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportPeriodToCSV(period);
                            }}
                            className="text-[9px] text-ledgerMint hover:text-ledgerMint/80 font-bold uppercase tracking-wider border border-ledgerMint/20 hover:border-ledgerMint/40 bg-ledgerMint/5 px-2 py-0.5 rounded transition"
                            title="Export only this period's logs as CSV"
                          >
                            Export CSV
                          </button>
                        )}
                      </div>
                      <span className="text-[9px] text-ledgerMuted font-mono">
                        Budget Limit: ₹{period.limit.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {period.transactions.length === 0 ? (
                      <p className="text-xs text-ledgerMuted py-4 text-center">
                        No transactions logged during this period range.
                      </p>
                    ) : (
                      <div className="divide-y divide-ledgerBorder/30 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                        {period.transactions.map((tx) => {
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
                                  <span className="text-[9px] text-ledgerMuted font-mono">
                                    {formatDateShort(tx.date)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 flex-shrink-0">
                                <span className={`font-mono text-xs font-semibold tabular-nums ${isCredit ? 'text-ledgerMint' : 'text-ledgerText'}`}>
                                  {isCredit ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <DeleteLogButton onConfirm={() => onDeleteExpense(tx.id)} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        open={deletingBudgetId !== null}
        title="Delete budget period"
        message="Are you sure you want to delete this budget period? The transactions linked to this date range will not be deleted."
        onConfirm={async () => {
          if (deletingBudgetId) {
            await onDeleteBudget(deletingBudgetId);
            setDeletingBudgetId(null);
          }
        }}
        onCancel={() => setDeletingBudgetId(null)}
      />
    </div>
  );
};
