
import React from 'react';
import { BaseModal } from './BaseModal';
import { LeaderboardEntry, Boss, Guild, UserProfile } from '../../types';
import { SearchableUserSelect } from '../SearchableUserSelect';

interface EditLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LeaderboardEntry | null;
  setEntry: (entry: LeaderboardEntry) => void;
  onUpdate: (e: React.FormEvent) => void;
  bossPool: Boss[];
  guilds: Guild[];
  allUsers: UserProfile[];
}

export const EditLeaderboardModal: React.FC<EditLeaderboardModalProps> = ({ 
  isOpen, 
  onClose, 
  entry, 
  setEntry, 
  onUpdate,
  bossPool,
  guilds,
  allUsers
}) => {
  if (!entry) return null;

  const handleTimeChange = (val: string) => {
    let clean = val.replace(/\D/g, '').substring(0, 4);
    let formatted = clean;
    if (clean.length >= 2) {
      formatted = `${clean.substring(0, 2)}:${clean.substring(2)}`;
    }
    setEntry({...entry, time: formatted});
  };

  const handleUserSelect = (user: UserProfile) => {
      setEntry({
          ...entry,
          playerName: user.displayName,
          playerUid: user.uid
      });
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="overflow-visible"> 
        <div className="p-6">
            <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">Edit Record</h3>
            <form onSubmit={onUpdate} className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Player</label>
                    <SearchableUserSelect 
                        users={allUsers}
                        selectedUid={entry.playerUid}
                        onSelect={handleUserSelect}
                    />
                </div>
                
                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Boss</label>
                    <select 
                        value={entry.boss} 
                        onChange={e => setEntry({...entry, boss: e.target.value})} 
                        className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                    >
                        <option value="">Select Boss</option>
                        {bossPool.map(b => (
                            <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Time (MM:SS)</label>
                        <input 
                            type="text" 
                            value={entry.time} 
                            onChange={e => handleTimeChange(e.target.value)} 
                            placeholder="00:00"
                            maxLength={5}
                            className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white font-mono" 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Date</label>
                        <input 
                            type="date" 
                            value={entry.date.includes('-') ? entry.date : ''} // basic check if it matches yyyy-mm-dd
                            onChange={e => setEntry({...entry, date: e.target.value})} 
                            className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" 
                        />
                        <p className="text-[10px] text-zinc-400 mt-1">Stored: {entry.date}</p>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Guild Branch</label>
                    <select 
                        value={entry.branch} 
                        onChange={e => setEntry({...entry, branch: e.target.value})} 
                        className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                    >
                        <option value="">Select Branch</option>
                        {guilds.map(g => (
                            <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                    </select>
                </div>

                <button type="submit" className="w-full bg-rose-900 text-white p-2 rounded hover:bg-rose-950 transition-colors mt-2">
                    Update Entry
                </button>
            </form>
        </div>
    </BaseModal>
  );
};
