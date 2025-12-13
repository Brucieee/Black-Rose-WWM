
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Swords, Medal } from 'lucide-react';
import { ArenaMatch } from '../../types';

interface EditMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: { bestOf: number; raceTo?: number }) => void;
  match: ArenaMatch | null;
}

export const EditMatchModal: React.FC<EditMatchModalProps> = ({ isOpen, onClose, onConfirm, match }) => {
  const [bestOf, setBestOf] = useState<number>(3);
  const [raceTo, setRaceTo] = useState<number>(2);

  useEffect(() => {
    if (isOpen && match) {
      setBestOf(match.bestOf || 3);
      setRaceTo(match.raceTo || 2);
    }
  }, [isOpen, match]);

  const getRaceToOptions = (bo: number) => {
    if (bo === 1) return [];
    const start = Math.ceil(bo / 2);
    return Array.from({ length: bo - start + 1 }, (_, i) => start + i);
  };

  const handleSetBestOf = (bo: number) => {
    setBestOf(bo);
    const options = getRaceToOptions(bo);
    setRaceTo(options.length > 0 ? options[0] : 1);
  };

  const handleConfirm = () => {
    onConfirm({ bestOf, raceTo });
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6">
        <h3 className="text-lg font-bold mb-4">Edit Match Format</h3>
        <div className="w-full max-w-lg mb-8">
            <label className="block text-sm font-bold text-zinc-500 uppercase mb-4 text-center">Match Format</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 3, 5, 7].map(bo => (
                    <button
                        key={bo}
                        onClick={() => handleSetBestOf(bo)}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                            bestOf === bo
                            ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-600 dark:border-rose-500 text-rose-900 dark:text-rose-100 shadow-md'
                            : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                        }`}
                    >
                        <div className="font-black text-lg">Best of {bo}</div>
                        <div className="text-xs opacity-70">
                            {bo === 1 ? 'Elimination' : `First to ${getRaceToOptions(bo)[0]} wins`}
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {bestOf > 1 && (
            <div className="w-full max-w-lg mb-8">
                <label className="block text-sm font-bold text-zinc-500 uppercase mb-4 text-center">Race To</label>
                <div className="flex justify-center gap-2">
                    {getRaceToOptions(bestOf).map(r => (
                        <button
                            key={r}
                            onClick={() => setRaceTo(r)}
                            className={`px-4 py-2 rounded-lg border-2 font-bold transition-all ${
                                raceTo === r
                                ? 'bg-rose-900 text-white border-rose-900 shadow-lg'
                                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">Cancel</button>
          <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-rose-600 text-white">Save</button>
        </div>
      </div>
    </BaseModal>
  );
};
