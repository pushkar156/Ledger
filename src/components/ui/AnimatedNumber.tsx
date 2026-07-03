import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedNumberProps {
  /** The numeric value to display */
  value: number;
  /** Number of decimal places */
  precision?: number;
  /** Tailwind CSS classes for the container */
  className?: string;
  /** Optional prefix (e.g., '$') */
  prefix?: string;
  /** Optional suffix (e.g., '%') */
  suffix?: string;
}

/**
 * AnimatedNumber smoothly animates numeric changes using framer-motion.
 * It formats the number with the given precision and adds optional prefix/suffix.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  precision = 0,
  className = '',
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const formatted = displayValue.toFixed(precision);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={formatted}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.3 }}
        className={className}
      >
        {prefix}{formatted}{suffix}
      </motion.span>
    </AnimatePresence>
  );
};

export default AnimatedNumber;
