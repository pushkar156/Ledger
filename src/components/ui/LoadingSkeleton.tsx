import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface LoadingSkeletonProps {
  /** Width of the skeleton (e.g., '100%', '200px') */
  width?: string | number;
  /** Height of the skeleton (e.g., '1rem', '20px') */
  height?: string | number;
  /** Optional additional Tailwind CSS classes */
  className?: string;
}

/**
 * A reusable loading skeleton component using `react-loading-skeleton`.
 * It provides a consistent placeholder UI across the app.
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
}) => {
  return (
    <Skeleton
      width={width}
      height={height}
      className={`bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
};

export default LoadingSkeleton;
