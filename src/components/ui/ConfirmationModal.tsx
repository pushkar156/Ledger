import React from 'react';

export const ConfirmationModal: React.FC<{
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title = 'Confirm', message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
      <div className="bg-ledgerSurface rounded-xl shadow-xl p-6 w-96 max-w-full border border-ledgerBorder">
        <h3 className="text-lg font-semibold text-ledgerText mb-2">{title}</h3>
        <p className="text-sm text-ledgerMuted mb-4">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md bg-ledgerElevated hover:bg-ledgerElevated/70 text-ledgerMuted"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm rounded-md bg-ledgerCoral/10 text-ledgerCoral border border-ledgerCoral/20 hover:bg-ledgerCoral/20"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
