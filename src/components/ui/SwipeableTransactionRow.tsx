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
      if (eventData.absX > 100) {
        onDelete();
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  return (
    <div {...handlers} className="relative overflow-hidden">
      {children}
    </div>
  );
};

export default SwipeableTransactionRow;
