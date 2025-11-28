
import React from 'react';
import { BaseModal } from './BaseModal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = 'danger'
}) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-sm" hideCloseButton={true}>
      <div className="p-6 text-center">
        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
          type === 'danger' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'
        }`}>
          <AlertTriangle className={`h-6 w-6 ${
            type === 'danger' ? 'text-red-600 dark:text-red-500' : 'text-yellow-600 dark:text-yellow-500'
          }`} />
        </div>
        
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{message}</p>
        
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-white rounded-lg font-medium shadow-md transition-colors ${
              type === 'danger' 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' 
                : 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-900/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
