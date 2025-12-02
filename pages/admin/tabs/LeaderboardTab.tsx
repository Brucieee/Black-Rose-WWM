
import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, Guild, UserProfile, Boss } from '../../../types';
import { db } from '../../../services/firebase';
import { useAlert } from '../../../contexts/AlertContext';
import { EditLeaderboardModal } from '../../../components/modals/EditLeaderboardModal';
import { ConfirmationModal } from '../../../components/modals/ConfirmationModal';
import { Edit, Trash2 } from 'lucide-react';

interface LeaderboardTabProps {
  userProfile: UserProfile;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ userProfile }) => {
  const { showAlert } = useAlert();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [bossPool, setBossPool] = useState<Boss[]>([]);
  
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [editingLeaderboardEntry, setEditingLeaderboardEntry] = useState<LeaderboardEntry | null>(null);
  const [deleteConf, setDeleteConf] = useState<{ isOpen: boolean; action: () => Promise<void> }>({ isOpen: false, action: async () => {} });

  const isOfficer = userProfile.systemRole === 'Officer';
  const selectedBranchId = isOfficer ? userProfile.guildId : ''; // For filtering

  useEffect(() => {
    const unsubL = db.collection("leaderboard").orderBy("date", "desc").onSnapshot(snap => setLeaderboard(snap.docs.map(d => ({id: d.id, ...d.data()} as LeaderboardEntry))));
    const unsubG = db.collection("guilds").onSnapshot(snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    const unsubU = db.collection("users").onSnapshot(snap => setAllUsers(snap.docs.map(d => d.data() as UserProfile)));
    const unsubB = db.collection("system").doc("breakingArmy").onSnapshot(doc => { if(doc.exists) setBossPool((doc.data() as any).bossPool || []) });
    return () => { unsubL(); unsubG(); unsubU(); unsubB(); };
  }, []);

  const handleLeaderboardUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingLeaderboardEntry) return;
      try {
          if (editingLeaderboardEntry.id) {
              await db.collection("leaderboard").doc(editingLeaderboardEntry.id).update(editingLeaderboardEntry);
              showAlert("Entry updated.", 'success');
          } else {
              await db.collection("leaderboard").add(editingLeaderboardEntry);
              showAlert("Entry created.", 'success');
          }
          setIsLeaderboardModalOpen(false);
          setEditingLeaderboardEntry(null);
      } catch (err: any) {
          showAlert(`Error: ${err.message}`, 'error');
      }
  };

  const handleLeaderboardDelete = (entry: LeaderboardEntry) => {
      setDeleteConf({
          isOpen: true,
          action: async () => {
              await db.collection("leaderboard").doc(entry.id).delete();
              showAlert("Deleted.", 'info');
          }
      });
  };

  // Filter based on officer role
  const displayedLeaderboard = isOfficer 
    ? leaderboard.filter(l => l.branch === guilds.find(g => g.id === selectedBranchId)?.name)
    : leaderboard;

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Speedrun Leaderboard</h2>
            <button 
                onClick={() => {
                    setEditingLeaderboardEntry({ id: '', rank: 0, playerName: '', playerUid: '', branch: '', boss: '', time: '', date: new Date().toISOString(), status: 'verified' });
                    setIsLeaderboardModalOpen(true);
                }}
                className="bg-rose-900 text-white px-4 py-2 rounded-lg font-bold text-sm"
            >
                + Add Entry
            </button>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-bold text-xs uppercase border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                        <th className="p-4">Rank</th>
                        <th className="p-4">Player</th>
                        <th className="p-4">Boss</th>
                        <th className="p-4">Time</th>
                        <th className="p-4">Date</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                    {displayedLeaderboard.map((entry, i) => (
                        <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                            <td className="p-4 font-mono text-zinc-400">{i + 1}</td>
                            <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100">{entry.playerName}</td>
                            <td className="p-4 text-zinc-600 dark:text-zinc-400">{entry.boss}</td>
                            <td className="p-4 font-mono font-bold text-rose-900 dark:text-rose-500">{entry.time}</td>
                            <td className="p-4 text-zinc-500">{new Date(entry.date).toLocaleDateString()}</td>
                            <td className="p-4 text-right flex justify-end gap-2">
                                <button onClick={() => {
                                    setEditingLeaderboardEntry(entry);
                                    setIsLeaderboardModalOpen(true);
                                }} className="text-zinc-400 hover:text-blue-500"><Edit size={16}/></button>
                                <button onClick={() => handleLeaderboardDelete(entry)} className="text-zinc-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        <EditLeaderboardModal 
            isOpen={isLeaderboardModalOpen} 
            onClose={() => setIsLeaderboardModalOpen(false)} 
            entry={editingLeaderboardEntry} 
            setEntry={(e) => setEditingLeaderboardEntry(e)} 
            onUpdate={handleLeaderboardUpdate} 
            bossPool={bossPool} 
            guilds={guilds}
            allUsers={allUsers}
            mode="leaderboard"
        />
        <ConfirmationModal 
            isOpen={deleteConf.isOpen} 
            onClose={() => setDeleteConf({...deleteConf, isOpen: false})} 
            onConfirm={deleteConf.action} 
            title="Delete Entry?" 
            message="This cannot be undone." 
        />
    </div>
  );
};
