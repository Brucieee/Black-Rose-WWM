
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
  mode?: 'leaderboard' | 'winnerLog';
}

export const EditLeaderboardModal: React.FC<EditLeaderboardModalProps> = ({ 
  isOpen, 
  onClose, 
  entry, 
  setEntry, 
  onUpdate,
  bossPool,
  guilds,
  allUsers,
  mode = 'leaderboard'
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
      // Find user's guild name
      const userGuildName = guilds.find(g => g.id === user.guildId)?.name || '';
      
      setEntry({
          ...entry,
          playerName: user.displayName,
          playerUid: user.uid,
          branch: userGuildName || entry.branch // Auto-fill branch
      });
  };

  const isWinnerLog = mode === 'winnerLog';

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-md overflow-visible"> 
        <div className="p-6">
            <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                {entry.id ? 'Edit Entry' : 'New Entry'}
            </h3>
            <form onSubmit={onUpdate} className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Player</label>
                    <SearchableUserSelect 
                        users={allUsers}
                        selectedUid={entry.playerUid}
                        onSelect={handleUserSelect}
                        placeholder="Search player..."
                    />
                </div>
                
                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">
                        {isWinnerLog ? 'Event Name' : 'Boss'}
                    </label>
                    {isWinnerLog ? (
                        <input 
                            required
                            type="text"
                            value={entry.boss} // Reusing 'boss' field as 'Event Name' for winner logs
                            onChange={e => setEntry({...entry, boss: e.target.value})}
                            placeholder="e.g. Breaking Army, PvP Tournament"
                            className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                    ) : (
                        <select 
                            required
                            value={entry.boss} 
                            onChange={e => setEntry({...entry, boss: e.target.value})} 
                            className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        >
                            <option value="">Select Boss</option>
                            {bossPool.map(b => (
                                <option key={b.name} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {!isWinnerLog && (
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Time (MM:SS)</label>
                            <input 
                                required
                                type="text" 
                                value={entry.time} 
                                onChange={e => handleTimeChange(e.target.value)} 
                                placeholder="00:00"
                                maxLength={5}
                                className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500" 
                            />
                        </div>
                    )}
                    <div className={isWinnerLog ? 'col-span-2' : ''}>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Date</label>
                        <input 
                            required
                            type="date" 
                            value={entry.date.includes('-') ? entry.date.split('T')[0] : ''} 
                            onChange={e => setEntry({...entry, date: e.target.value})} 
                            className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" 
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Guild Branch</label>
                     <input 
                        required
                        type="text" 
                        value={entry.branch} 
                        onChange={e => setEntry({...entry, branch: e.target.value})} 
                        className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" 
                        placeholder="Auto-filled from user"
                    />
                </div>

                <button type="submit" className="w-full bg-rose-900 text-white p-2 rounded hover:bg-rose-950 transition-colors mt-2 font-medium">
                    Save Record
                </button>
            </form>
        </div>
    </BaseModal>
  );
};
