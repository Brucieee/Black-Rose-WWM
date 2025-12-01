
import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Guild, ArenaParticipant, UserProfile, RoleType } from '../../types';
import { Swords, Trophy, Users, Crown } from 'lucide-react';
import { db } from '../../services/firebase';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  guilds: Guild[];
  onConfirm: (title: string, participants: ArenaParticipant[], hasGrandFinale: boolean) => void;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({ isOpen, onClose, guilds, onConfirm }) => {
  const [title, setTitle] = useState('');
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  // Import Options
  const [importWinners, setImportWinners] = useState(true); // Top 3
  const [importLosers, setImportLosers] = useState(false); // Everyone else
  const [hasGrandFinale, setHasGrandFinale] = useState(true); // Exaggerated Top 1 Banner

  // Load users to get roles
  React.useEffect(() => {
      if(isOpen) {
          db.collection("users").get().then(snap => {
              setAllUsers(snap.docs.map(d => d.data() as UserProfile));
          });
      }
  }, [isOpen]);

  const handleGuildToggle = (guildId: string) => {
    setSelectedGuilds(prev => 
      prev.includes(guildId) ? prev.filter(id => id !== guildId) : [...prev, guildId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    if (!importWinners && !importLosers) return; // Must select something
    setLoading(true);

    try {
      const allParticipants: ArenaParticipant[] = [];

      for (const guildId of selectedGuilds) {
          const guild = guilds.find(g => g.id === guildId);
          
          // Get all approved participants from this guild's arena
          const partsSnap = await db.collection("arena_participants")
            .where("guildId", "==", guildId)
            .where("status", "==", "approved")
            .get();
            
          const guildParticipants = partsSnap.docs.map(d => d.data() as ArenaParticipant);
          
          // Identify Winners (Top 3)
          let winnerUids: string[] = [];
          if (guild?.lastArenaWinners) {
              winnerUids = guild.lastArenaWinners.map(w => w.uid);
          }

          guildParticipants.forEach(p => {
              const isWinner = winnerUids.includes(p.uid);
              const userProfile = allUsers.find(u => u.uid === p.uid);
              
              const newParticipant: ArenaParticipant = {
                  ...p,
                  guildId: guildId, // Will be overwritten by tourney ID
                  originalGuildId: guildId,
                  activityPoints: 0,
                  role: userProfile?.role || p.role || RoleType.DPS
              };

              if (isWinner && importWinners) {
                  allParticipants.push(newParticipant);
              } else if (!isWinner && importLosers) {
                  allParticipants.push(newParticipant);
              }
          });
      }

      // De-duplicate by UID
      const uniqueParticipants = Array.from(new Map(allParticipants.map(item => [item.uid, item])).values());

      onConfirm(title, uniqueParticipants, hasGrandFinale);
      setTitle('');
      setSelectedGuilds([]);
      setImportWinners(true);
      setImportLosers(false);
      onClose();
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg" allowOverflow={true}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 text-zinc-900 dark:text-zinc-100">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-500">
            <Swords size={24} />
          </div>
          <h3 className="text-xl font-bold">Create Custom Tournament</h3>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tournament Title</label>
            <input 
              type="text" 
              required
              placeholder="e.g. All-Star Brawl"
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-zinc-900 dark:text-zinc-100"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Select Guilds</label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                  {guilds.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleGuildToggle(g.id)}
                        className={`text-xs px-3 py-2 rounded-lg border text-left transition-all ${
                            selectedGuilds.includes(g.id)
                            ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-bold'
                            : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                          {g.name}
                      </button>
                  ))}
              </div>
          </div>

          <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <label className="block text-xs font-bold text-zinc-500 uppercase">Import Settings</label>
              
              <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="importWinners"
                    checked={importWinners}
                    onChange={e => setImportWinners(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="importWinners" className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer select-none">
                      <Trophy size={14} className="text-yellow-500" />
                      Import Top 3 Winners
                  </label>
              </div>

              <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="importLosers"
                    checked={importLosers}
                    onChange={e => setImportLosers(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="importLosers" className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer select-none">
                      <Users size={14} className="text-zinc-400" />
                      Import Non-Winners (Losers)
                  </label>
              </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4 rounded-xl border border-yellow-500/20">
              <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="grandFinale"
                    checked={hasGrandFinale}
                    onChange={e => setHasGrandFinale(e.target.checked)}
                    className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                  />
                  <label htmlFor="grandFinale" className="flex-1 cursor-pointer select-none">
                      <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <Crown size={16} className="text-yellow-500" /> Grand Finale Mode
                      </span>
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Enables the special "Champion" celebration overlay for the #1 winner. Uncheck to use standard Top 3 banner.
                      </span>
                  </label>
              </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || selectedGuilds.length === 0 || (!importWinners && !importLosers)}
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Tournament'}
          </button>
        </form>
      </div>
    </BaseModal>
  );
};
