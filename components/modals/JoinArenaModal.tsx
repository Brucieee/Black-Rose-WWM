
import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Trophy, AlertCircle } from 'lucide-react';

interface JoinArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (points: number) => void;
  minPoints: number;
}

export const JoinArenaModal: React.FC<JoinArenaModalProps> = ({ isOpen, onClose, onSubmit, minPoints }) => {
  const [points, setPoints] = useState<string>('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numPoints = parseInt(points);
    
    if (isNaN(numPoints)) {
      setError('Please enter a valid number.');
      return;
    }

    if (numPoints < minPoints) {
      setError(`You need at least ${minPoints} activity points to join.`);
      return;
    }

    onSubmit(numPoints);
    setPoints('');
    setError('');
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-sm">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4 text-zinc-900 dark:text-zinc-100">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-500">
            <Trophy size={24} />
          </div>
          <h3 className="text-xl font-bold">Join Tournament</h3>
        </div>
        
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          To qualify for the arena, you must meet the minimum weekly activity requirement of <strong className="text-rose-600 dark:text-rose-400">{minPoints}</strong> points.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Your Weekly Activity Points</label>
            <input 
              type="number" 
              required
              min="0"
              max="99999"
              placeholder="e.g. 3500"
              value={points}
              onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= 5) {
                      setPoints(val);
                      setError('');
                  }
              }}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-zinc-900 dark:text-zinc-100"
            />
            {error && (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                <AlertCircle size={12} /> {error}
              </div>
            )}
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
              Submit Entry
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};
