
import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { LayoutGrid, AlertTriangle } from 'lucide-react';

interface InitializeBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (size: number) => void;
}

export const InitializeBracketModal: React.FC<InitializeBracketModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [size, setSize] = useState<number>(8);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(size);
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4 text-zinc-900 dark:text-zinc-100">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-500">
            <LayoutGrid size={24} />
          </div>
          <h3 className="text-xl font-bold">Setup Bracket</h3>
        </div>
        
        <div className="mb-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-lg p-3 flex gap-3">
             <AlertTriangle className="text-rose-600 dark:text-rose-500 flex-shrink-0" size={18} />
             <p className="text-xs text-rose-700 dark:text-rose-400">
                Warning: This will delete the current bracket and all match history for this guild branch.
             </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tournament Size</label>
            <div className="grid grid-cols-3 gap-3">
                {[4, 8, 16, 32, 64].map(s => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={`p-3 rounded-lg border text-sm font-bold transition-all ${
                            size === s 
                            ? 'bg-rose-900 text-white border-rose-900 shadow-md ring-2 ring-rose-900/20' 
                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500'
                        }`}
                    >
                        {s} Players
                        <span className="block text-[10px] font-normal opacity-80">
                            {Math.log2(s)} Rounds
                        </span>
                    </button>
                ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-2.5 bg-rose-900 text-white rounded-lg font-bold hover:bg-rose-950 transition-colors shadow-lg shadow-rose-900/20"
            >
              Initialize
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};
