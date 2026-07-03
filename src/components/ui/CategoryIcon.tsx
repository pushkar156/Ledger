import React from 'react';
import { Icon, CircleCheck, Folder, ShoppingCart, CreditCard, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Maps a transaction category string to an illustrative icon.
 * Extend the map as needed for new categories.
 */
export const CategoryIcon: React.FC<{ category: string; className?: string }> = ({
  category,
  className = 'h-5 w-5 text-gray-600 dark:text-gray-300',
}) => {
  // Simple lookup – fallback to a generic icon
  const icons: Record<string, React.ReactNode> = {
    food: <ShoppingCart className={className} />,
    entertainment: <TrendingUp className={className} />,
    bills: <CreditCard className={className} />,
    salary: <DollarSign className={className} />,
    savings: <Folder className={className} />,
    transfer: <CircleCheck className={className} />,
  };

  const fallback = <Icon name="circle" className={className} />; // generic circle
  return <>{icons[category.toLowerCase()] ?? fallback}</>;
};

export default CategoryIcon;
