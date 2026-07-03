import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

export const DeleteLogButton: React.FC<{ onConfirm: () => void }> = ({ onConfirm }) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => setOpen(true);
  const confirm = () => {
    onConfirm();
    setOpen(false);
  };
  const cancel = () => setOpen(false);

  return (
    <>
      <button
        onClick={handleClick}
        className="text-ledgerMuted hover:text-ledgerCoral opacity-20 hover:opacity-100 transition-all p-1.5 rounded hover:bg-ledgerCoral/10"
        aria-label="Delete log"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <ConfirmationModal
        open={open}
        title="Delete log"
        message="Are you sure you want to delete this log?"
        onConfirm={confirm}
        onCancel={cancel}
      />
    </>
  );
};
