
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Edit2 } from 'lucide-react';
import { ArenaParticipant } from '../../types';

interface EditPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: ArenaParticipant | null;
  onConfirm: (uid: string, newPoints: number) => void;
}

export const EditPointsModal: React.FC<EditPointsModalProps> = ({ isOpen, onClose, participant, onConfirm }) => {
  const [points, setPoints] = useState<string>('');

  useEffect(() => {
    if (participant) {
        setPoints(participant.activityPoints.toString());
    }
  }, [participant]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (participant) {
        onConfirm(participant.uid, parseInt(points) || 0);
        onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-xs">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
            <Edit2 size={16} />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Edit Points</h3>
        </div>
        
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Update activity points for <strong className="text-zinc-900 dark:text-zinc-100">{participant?.displayName}</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <input 
            type="number" 
            autoFocus
            min="0"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-zinc-900 dark:text-zinc-100 mb-4"
          />

          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-2 bg-rose-900 text-white rounded-lg text-sm font-bold hover:bg-rose-950 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};
