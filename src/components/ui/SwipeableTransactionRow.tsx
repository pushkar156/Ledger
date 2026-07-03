import React from 'react';
import { useSwipeable } from 'react-swipeable';
import { DeleteLogButton } from './DeleteLogButton';

/**
 * Wraps a transaction row element to add swipe‑to‑delete functionality.
 * The `children` should be the row content (e.g., the markup from TransactionsTab).
 * When swiped left beyond the threshold, the `onDelete` callback is invoked.
 */
export const SwipeableTransactionRow: React.FC<{
  onDelete: () => void;
  children: React.ReactNode;
}> = ({ onDelete, children }) => {
  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      // Simple threshold check – could be refined
      if (eventData.absX > 80) {
        onDelete();
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  return (
    <div {...handlers} className="relative">
      {/* The row content */}
      {children}
      {/* Overlay delete button that appears on swipe – simplified */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
        <DeleteLogButton onConfirm={onDelete} />
      </div>
    </div>
  );
};

export default SwipeableTransactionRow;
