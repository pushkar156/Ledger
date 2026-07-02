import React from 'react';

interface BudgetBarProps {
  spent: number;
  budget: number;
  onSetBudgetClick: () => void;
}

export const BudgetBar: React.FC<BudgetBarProps> = ({ spent, budget, onSetBudgetClick }) => {
  const isOverBudget = spent > budget;
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const cappedPercentage = Math.min(100, percentage);

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
              ₹{spent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ₹{budget.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`font-mono font-medium ${isOverBudget ? 'text-ledgerCoral' : 'text-ledgerMint'}`}>
              {percentage.toFixed(0)}%
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
