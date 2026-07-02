export const buttonVariants = ({ variant }: { variant?: 'ghost' | 'default' } = {}) => {
  if (variant === 'ghost') {
    return "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors hover:bg-ledgerElevated hover:text-ledgerText focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
  }
  return "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-ledgerMint text-[#0F1B1E] hover:bg-ledgerMint/90 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
};
