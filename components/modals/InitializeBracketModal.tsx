import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { LayoutGrid, AlertTriangle, Swords } from 'lucide-react';
import { ArenaParticipant } from '../../types';

export interface BracketSetupConfig {
    mode: 'standard' | 'custom';
    size?: number;
    customMatches?: { p1: ArenaParticipant | null; p2: ArenaParticipant | null }[];
}

interface InitializeBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: BracketSetupConfig) => void;
  participants: ArenaParticipant[];
}

export const InitializeBracketModal: React.FC<InitializeBracketModalProps> = ({ isOpen, onClose, onConfirm, participants }) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');
  
  // Standard Mode State
  const [size, setSize] = useState<number>(8);

  // Custom Mode State
  const [customMatchCount, setCustomMatchCount] = useState<number>(1);

  useEffect(() => {
      if (isOpen) {
          setSize(8);
          setCustomMatchCount(1);
          setActiveTab('standard');
      }
  }, [isOpen]);

  const handleStandardSubmit = () => {
    onConfirm({ mode: 'standard', size });
    onClose();
  };

  const handleCustomSubmit = () => {
    // Generate empty matches based on the selected count
    // Each match is just an object with null players
    const emptyMatches = Array.from({ length: customMatchCount }).map(() => ({ p1: null, p2: null }));
    
    onConfirm({ mode: 'custom', customMatches: emptyMatches });
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-4xl w-full mx-4 h-[85vh] md:h-auto md:max-h-[85vh] flex flex-col" allowOverflow={true}>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 self-start md:self-auto">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-500">
            <LayoutGrid size={24} />
          </div>
          <h3 className="text-xl font-bold">Setup Bracket</h3>
        </div>
        
        <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-lg w-full md:w-auto">
            <button 
                onClick={() => setActiveTab('standard')}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'standard' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
            >
                Standard
            </button>
            <button 
                onClick={() => setActiveTab('custom')}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'custom' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
            >
                Custom Matchups
            </button>
        </div>
      </div>
      
      {/* Warning Banner */}
      <div className="bg-rose-50 dark:bg-rose-900/10 border-b border-rose-100 dark:border-rose-900/30 p-3 flex gap-3 justify-center items-center flex-shrink-0">
             <AlertTriangle className="text-rose-600 dark:text-rose-500 flex-shrink-0" size={16} />
             <p className="text-xs text-rose-700 dark:text-rose-400 font-medium text-center">
                Warning: This will delete the current bracket and match history.
             </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'standard' ? (
              <div className="p-6 md:p-8 flex flex-col items-center min-h-full">
                  <label className="block text-sm font-bold text-zinc-500 uppercase mb-4 text-center">Select Tournament Size</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-md mb-8">
                        {[4, 8, 16, 32, 64].map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSize(s)}
                                className={`p-4 rounded-xl border-2 text-center transition-all ${
                                    size === s 
                                    ? 'bg-rose-900 text-white border-rose-900 shadow-lg scale-105' 
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                                }`}
                            >
                                <span className="block text-2xl font-black mb-1">{s}</span>
                                <span className="text-xs opacity-80 uppercase tracking-wider font-bold">Players</span>
                            </button>
                        ))}
                  </div>
                  <div className="w-full max-w-md flex flex-col sm:flex-row gap-3 mt-auto pb-4">
                      <button onClick={onClose} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg font-bold text-zinc-600 dark:text-zinc-400 order-2 sm:order-1">Cancel</button>
                      <button onClick={handleStandardSubmit} className="flex-1 py-3 bg-rose-900 text-white rounded-lg font-bold shadow-lg hover:bg-rose-950 transition-colors order-1 sm:order-2">Initialize Bracket</button>
                  </div>
              </div>
          ) : (
              <div className="flex flex-col min-h-full bg-zinc-50 dark:bg-zinc-950/50 p-6 md:p-8">
                  <div className="text-center mb-6">
                      <h4 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2">Create Custom Bracket</h4>
                      <p className="text-zinc-500 text-sm max-w-md mx-auto">
                          Select the number of empty match slots to generate.
                      </p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-8 max-w-3xl mx-auto w-full">
                      {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                          <button
                              key={num}
                              onClick={() => setCustomMatchCount(num)}
                              className={`p-3 md:p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 relative ${
                                  customMatchCount === num
                                  ? 'bg-rose-900 border-rose-900 text-white shadow-xl scale-105 z-10'
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-md'
                              }`}
                          >
                              <span className="text-2xl md:text-3xl font-black leading-none">{num}</span>
                              <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider opacity-80">{num === 1 ? 'Match' : 'Matches'}</span>
                              <div className="mt-1 text-[8px] md:text-[9px] opacity-60 font-mono">({num * 2} Players)</div>
                          </button>
                      ))}
                  </div>

                  <div className="mt-auto max-w-md mx-auto w-full pt-4 pb-4">
                       <button 
                          onClick={handleCustomSubmit}
                          className="w-full py-4 bg-rose-900 text-white rounded-xl font-bold shadow-xl hover:bg-rose-950 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Swords size={20} />
                            Generate {customMatchCount} Empty {customMatchCount === 1 ? 'Match' : 'Matches'}
                        </button>
                  </div>
              </div>
          )}
      </div>
    </BaseModal>
  );
};