import React from 'react';

interface BudgetBarProps {
  spent: number;
  credited: number;
  budget: number;
  rangeLabel: string;
  onSetBudgetClick: () => void;
}

export const BudgetBar: React.FC<BudgetBarProps> = ({
  spent,
  credited,
  budget,
  rangeLabel,
  onSetBudgetClick,
}) => {
  const netSpent = spent - credited;
  const isOverBudget = netSpent > budget;
  
  // Remaining Balance = Budget - Debits + Credits
  const remainingBalance = budget - spent + credited;
  const isBalanceNegative = remainingBalance < 0;
  
  // Percentage of budget consumed
  const percentage = budget > 0 ? (netSpent / budget) * 100 : 0;
  const cappedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div className="mt-3">
      {budget > 0 ? (
        <div className="space-y-1.5">
          {/* Progress Bar Container */}
          <div className="w-full h-1.5 bg-ledgerElevated rounded-full overflow-hidden border border-ledgerBorder">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isOverBudget ? 'bg-ledgerCoral' : 'bg-ledgerMint'
              }`}
              style={{ width: `${cappedPercentage}%` }}
            />
          </div>
          
          {/* Labeling and calculations */}
          <div className="flex justify-between items-center text-xs text-ledgerMuted">
            <span className="font-mono">
              Balance: <span className={isBalanceNegative ? 'text-ledgerCoral font-semibold' : 'text-[#7FE7C4] font-semibold'}>
                ₹{remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </span>
            <span className="font-sans text-[10px] text-ledgerMuted opacity-70">
              {rangeLabel}
            </span>
            <span className={`font-mono font-medium ${isOverBudget ? 'text-ledgerCoral' : 'text-ledgerMint'}`}>
              {percentage.toFixed(0)}% used
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={onSetBudgetClick}
          className="text-xs text-ledgerMint hover:text-ledgerMint/80 transition-colors flex items-center gap-1 font-medium group"
        >
          Set a monthly budget 
          <span className="transform group-hover:translate-x-1 transition-transform">→</span>
        </button>
      )}
    </div>
  );
};
