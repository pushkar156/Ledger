import React from 'react';

interface EmptyStateProps {
  /** Illustration image URL or imported asset */
  imageSrc?: string;
  /** Primary message to display */
  title: string;
  /** Optional secondary text */
  description?: string;
  /** Optional CTA button text and handler */
  ctaLabel?: string;
  onCtaClick?: () => void;
  /** Additional Tailwind classes */
  className?: string;
}

/**
 * Generic empty‑state component. Shows an illustration and optional CTA.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  imageSrc,
  title,
  description,
  ctaLabel,
  onCtaClick,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-4 ${className}`}>
      {imageSrc && (
        <img src={imageSrc} alt="empty state" className="w-48 h-48 object-contain" />
      )}
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
          {description}
        </p>
      )}
      {ctaLabel && onCtaClick && (
        <button
          onClick={onCtaClick}
          className="mt-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
