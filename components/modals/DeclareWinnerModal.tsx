
import React from 'react';
import { BaseModal } from './BaseModal';
import { Check } from 'lucide-react';

interface DeclareWinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  winnerName: string;
  time: string;
  onTimeChange: (val: string) => void;
  onConfirm: (e: React.FormEvent) => void;
}

export const DeclareWinnerModal: React.FC<DeclareWinnerModalProps> = ({ isOpen, onClose, winnerName, time, onTimeChange, onConfirm }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-sm">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">Declare Winner</h3>
        <p className="mb-4 text-zinc-600 dark:text-zinc-400">Player: <strong>{winnerName}</strong></p>
        <input 
            type="text" 
            placeholder="Time (MM:SS)" 
            value={time} 
            onChange={e => onTimeChange(e.target.value)} 
            maxLength={5}
            className="w-full p-2 border rounded mb-4 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white text-center font-mono text-lg tracking-widest" 
        />
        <button onClick={onConfirm} className="w-full bg-rose-900 text-white p-2 rounded flex items-center justify-center gap-2 hover:bg-rose-950 transition-colors">
            <Check size={16} /> Confirm
        </button>
      </div>
    </BaseModal>
  );
};
