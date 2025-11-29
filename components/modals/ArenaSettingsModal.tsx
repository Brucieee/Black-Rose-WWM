
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Settings } from 'lucide-react';

interface ArenaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMin: number;
  onSave: (min: number) => void;
}

export const ArenaSettingsModal: React.FC<ArenaSettingsModalProps> = ({ isOpen, onClose, currentMin, onSave }) => {
  const [val, setVal] = useState(currentMin.toString());

  useEffect(() => {
    setVal(currentMin.toString());
  }, [currentMin, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(parseInt(val) || 0);
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-sm">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4 text-zinc-900 dark:text-zinc-100">
          <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
            <Settings size={24} />
          </div>
          <h3 className="text-xl font-bold">Arena Settings</h3>
        </div>
        
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Set the minimum weekly activity points required for members to join the arena.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Minimum Activity Points</label>
            <input 
              type="number" 
              required
              min="0"
              placeholder="e.g. 3000"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-zinc-900 dark:text-zinc-100"
            />
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
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};
