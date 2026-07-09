import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

/**
 * Wraps a transaction row element to add swipe‑to‑delete functionality.
 * Smoothly translates the row offscreen and reveals a trash icon backdrop.
 */
export const SwipeableTransactionRow: React.FC<{
  onDelete: () => void;
  children: React.ReactNode;
}> = ({ onDelete, children }) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Only track left swipes
      if (eventData.dir === 'Left') {
        // Logarithmic resistance for smooth feel
        const rawOffset = -eventData.absX;
        setSwipeOffset(Math.max(-120, rawOffset));
      }
    },
    onSwipedLeft: (eventData) => {
      if (eventData.absX > 90) {
        setSwipeOffset(-120);
        setShowConfirm(true);
      } else {
        setSwipeOffset(0);
      }
    },
    onSwipedRight: () => {
      setSwipeOffset(0);
    },
    preventScrollOnSwipe: false, // Do NOT block vertical page scrolling on swipes
    trackMouse: true,
  });

  const handleConfirmDelete = () => {
    setShowConfirm(false);
    setIsDeleting(true);
    setTimeout(() => {
      onDelete();
    }, 300); // Wait for sliding animation to finish
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
    setSwipeOffset(0);
  };

  return (
    <>
      <AnimatePresence>
        {!isDeleting && (
          <motion.div
            {...handlers}
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ 
              opacity: 0, 
              height: 0,
              transition: { height: { duration: 0.25 }, opacity: { duration: 0.2 } } 
            }}
            className="relative overflow-hidden w-full bg-ledgerCoral"
          >
            {/* Revealed Trash Icon Backdrop */}
            <div className="absolute inset-y-0 right-0 w-24 bg-ledgerCoral flex items-center justify-center text-[#EAF2F0] gap-1 z-0 select-none">
              <Trash2 className="w-4 h-4 animate-bounce" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Delete</span>
            </div>

            {/* Swipeable Upper Container */}
            <motion.div
              animate={{ x: swipeOffset }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="relative z-10 w-full bg-ledgerSurface"
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        open={showConfirm}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

export default SwipeableTransactionRow;
