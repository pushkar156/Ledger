export interface Category {
  id: string;
  label: string;
  emoji: string;
  colorName: string;
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hoverBgClass: string;
}

export const CATEGORIES: Record<string, Category> = {
  food: {
    id: 'food',
    label: 'Food & Dining',
    emoji: '🍜',
    colorName: 'amber',
    hex: '#E8A94C',
    bgClass: 'bg-catAmber/10',
    textClass: 'text-catAmber',
    borderClass: 'border-catAmber',
    hoverBgClass: 'hover:bg-catAmber/20',
  },
  groceries: {
    id: 'groceries',
    label: 'Groceries',
    emoji: '🛒',
    colorName: 'mint',
    hex: '#7FE7C4',
    bgClass: 'bg-catMint/10',
    textClass: 'text-catMint',
    borderClass: 'border-catMint',
    hoverBgClass: 'hover:bg-catMint/20',
  },
  transport: {
    id: 'transport',
    label: 'Transport',
    emoji: '🚕',
    colorName: 'blue',
    hex: '#6FA8DC',
    bgClass: 'bg-catBlue/10',
    textClass: 'text-catBlue',
    borderClass: 'border-catBlue',
    hoverBgClass: 'hover:bg-catBlue/20',
  },
  shopping: {
    id: 'shopping',
    label: 'Shopping',
    emoji: '🛍️',
    colorName: 'lavender',
    hex: '#C792EA',
    bgClass: 'bg-catLavender/10',
    textClass: 'text-catLavender',
    borderClass: 'border-catLavender',
    hoverBgClass: 'hover:bg-catLavender/20',
  },
  bills: {
    id: 'bills',
    label: 'Bills & Utilities',
    emoji: '💡',
    colorName: 'coral',
    hex: '#E8615A',
    bgClass: 'bg-catCoral/10',
    textClass: 'text-catCoral',
    borderClass: 'border-catCoral',
    hoverBgClass: 'hover:bg-catCoral/20',
  },
  entertainment: {
    id: 'entertainment',
    label: 'Entertainment',
    emoji: '🎬',
    colorName: 'sand',
    hex: '#F2D06B',
    bgClass: 'bg-catSand/10',
    textClass: 'text-catSand',
    borderClass: 'border-catSand',
    hoverBgClass: 'hover:bg-catSand/20',
  },
  health: {
    id: 'health',
    label: 'Health',
    emoji: '💊',
    colorName: 'sage',
    hex: '#6FD1A0',
    bgClass: 'bg-catSage/10',
    textClass: 'text-catSage',
    borderClass: 'border-catSage',
    hoverBgClass: 'hover:bg-catSage/20',
  },
  other: {
    id: 'other',
    label: 'Other',
    emoji: '📎',
    colorName: 'grey',
    hex: '#9AA8A5',
    bgClass: 'bg-catGrey/10',
    textClass: 'text-catGrey',
    borderClass: 'border-catGrey',
    hoverBgClass: 'hover:bg-catGrey/20',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);
