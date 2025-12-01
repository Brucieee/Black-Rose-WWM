
import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Guild, ArenaParticipant, UserProfile } from '../../types';
import { Swords, Users, Trophy } from 'lucide-react';
import { db } from '../../services/firebase';
import { SearchableUserSelect } from '../SearchableUserSelect';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  guilds: Guild[];
  onConfirm: (title: string, participants: ArenaParticipant[]) => void;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({ isOpen, onClose, guilds, onConfirm }) => {
  const [title, setTitle] = useState('');
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([]);
  const [manualParticipants, setManualParticipants] = useState<ArenaParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Load users for manual selection
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

  const handleManualAdd = (user: UserProfile) => {
      if (manualParticipants.some(p => p.uid === user.uid)) return;
      
      const part: ArenaParticipant = {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          guildId: user.guildId,
          activityPoints: 0,
          status: 'approved'
      };
      setManualParticipants([...manualParticipants, part]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setLoading(true);

    try {
      const allParticipants: ArenaParticipant[] = [...manualParticipants];

      // Fetch Top 3 from selected guilds
      for (const guildId of selectedGuilds) {
          // 1. Get Matches
          const matchesSnap = await db.collection("arena_matches")
            .where("guildId", "==", guildId)
            .get();
          
          const matches = matchesSnap.docs.map(d => d.data());
          if (matches.length === 0) continue;

          const maxRound = Math.max(...matches.map(m => m.round));
          
          // Final Match (Winner = 1st, Loser = 2nd)
          const finalMatch = matches.find(m => m.round === maxRound && !m.isThirdPlace);
          // 3rd Place Match
          const thirdPlaceMatch = matches.find(m => m.isThirdPlace);

          if (finalMatch?.winner) {
              allParticipants.push({...finalMatch.winner, activityPoints: 0, status: 'approved'});
              
              // Get Loser (2nd Place)
              const loser = finalMatch.player1.uid === finalMatch.winner.uid ? finalMatch.player2 : finalMatch.player1;
              if (loser) allParticipants.push({...loser, activityPoints: 0, status: 'approved'});
          }

          if (thirdPlaceMatch?.winner) {
              allParticipants.push({...thirdPlaceMatch.winner, activityPoints: 0, status: 'approved'});
          }
      }

      // De-duplicate by UID
      const uniqueParticipants = Array.from(new Map(allParticipants.map(item => [item.uid, item])).values());

      onConfirm(title, uniqueParticipants);
      setTitle('');
      setSelectedGuilds([]);
      setManualParticipants([]);
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

          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-500" /> Import Winners
              </h4>
              <p className="text-xs text-zinc-500 mb-3">Select branches to auto-import their Top 3 players (1st, 2nd, 3rd).</p>
              <div className="grid grid-cols-2 gap-2">
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

          <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Add Manual Participants</label>
              <div className="mb-2">
                <SearchableUserSelect 
                    users={allUsers}
                    selectedUid=""
                    onSelect={handleManualAdd}
                    placeholder="Search user to add..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                  {manualParticipants.map(p => (
                      <span key={p.uid} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {p.displayName}
                          <button 
                            type="button" 
                            onClick={() => setManualParticipants(prev => prev.filter(x => x.uid !== p.uid))}
                            className="hover:text-red-500"
                          >
                              &times;
                          </button>
                      </span>
                  ))}
              </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-900/20 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Tournament'}
          </button>
        </form>
      </div>
    </BaseModal>
  );
};
