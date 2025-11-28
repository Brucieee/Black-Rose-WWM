
import React, { useState, useEffect } from 'react';
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
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');

  useEffect(() => {
      // Sync local state when prop changes/modal opens
      if (isOpen) {
          if (time.includes(':')) {
              const [m, s] = time.split(':');
              setMinutes(m || '00');
              setSeconds(s || '00');
          } else {
              setMinutes('00');
              setSeconds('00');
          }
      }
  }, [isOpen, time]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 2) val = val.slice(0, 2);
      setMinutes(val);
      updateTime(val, seconds);
  };

  const handleSecChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 2) val = val.slice(0, 2);
      setSeconds(val);
      updateTime(minutes, val);
  };

  const handleBlur = () => {
      // Pad with zeros on blur
      const m = minutes.padStart(2, '0');
      const s = seconds.padStart(2, '0');
      setMinutes(m);
      setSeconds(s);
      updateTime(m, s);
  }

  const updateTime = (m: string, s: string) => {
      onTimeChange(`${m.padStart(2, '0')}:${s.padStart(2, '0')}`);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-sm">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">Declare Winner</h3>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">Player: <strong className="text-zinc-900 dark:text-zinc-100">{winnerName}</strong></p>
        
        <div className="mb-6">
            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Clear Time</label>
            <div className="flex items-center justify-center gap-2">
                <div className="flex flex-col items-center">
                    <input 
                        type="number" 
                        value={minutes} 
                        onChange={handleMinChange}
                        onBlur={handleBlur}
                        placeholder="00"
                        min="0"
                        max="59"
                        className="w-16 p-3 text-center text-2xl font-mono font-bold border rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-rose-500 focus:outline-none" 
                    />
                    <span className="text-[10px] text-zinc-400 mt-1 uppercase font-bold">Min</span>
                </div>
                <span className="text-2xl font-bold text-zinc-300 dark:text-zinc-600 -mt-4">:</span>
                <div className="flex flex-col items-center">
                    <input 
                        type="number" 
                        value={seconds} 
                        onChange={handleSecChange}
                        onBlur={handleBlur}
                        placeholder="00"
                        min="0"
                        max="59"
                        className="w-16 p-3 text-center text-2xl font-mono font-bold border rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-rose-500 focus:outline-none" 
                    />
                    <span className="text-[10px] text-zinc-400 mt-1 uppercase font-bold">Sec</span>
                </div>
            </div>
        </div>

        <button onClick={onConfirm} className="w-full bg-rose-900 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-rose-950 transition-colors shadow-lg shadow-rose-900/20">
            <Check size={18} /> Confirm Result
        </button>
      </div>
    </BaseModal>
  );
};
