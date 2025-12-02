
import React, { useState, useEffect } from 'react';
import { WinnerLog, Guild, UserProfile } from '../../../types';
import { db } from '../../../services/firebase';
import { useAlert } from '../../../contexts/AlertContext';
import { EditLeaderboardModal } from '../../../components/modals/EditLeaderboardModal';
import { ConfirmationModal } from '../../../components/modals/ConfirmationModal';
import { Edit, Trash2, Crown } from 'lucide-react';

interface WinnerLogsTabProps {
  userProfile: UserProfile;
}

export const WinnerLogsTab: React.FC<WinnerLogsTabProps> = ({ userProfile }) => {
  const { showAlert } = useAlert();
  const [winnerLogs, setWinnerLogs] = useState<WinnerLog[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WinnerLog | null>(null);
  const [deleteConf, setDeleteConf] = useState<{ isOpen: boolean; action: () => Promise<void> }>({ isOpen: false, action: async () => {} });

  useEffect(() => {
    const unsubW = db.collection("winner_logs").orderBy("timestamp", "desc").onSnapshot(snap => setWinnerLogs(snap.docs.map(d => ({id: d.id, ...d.data()} as WinnerLog))));
    const unsubG = db.collection("guilds").onSnapshot(snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    const unsubU = db.collection("users").onSnapshot(snap => setAllUsers(snap.docs.map(d => d.data() as UserProfile)));
    return () => { unsubW(); unsubG(); unsubU(); };
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingEntry) return;
      try {
          if (editingEntry.id) {
              await db.collection("winner_logs").doc(editingEntry.id).update(editingEntry);
              showAlert("Log updated.", 'success');
          } else {
              await db.collection("winner_logs").add(editingEntry);
              showAlert("Log created.", 'success');
          }
          setIsModalOpen(false);
          setEditingEntry(null);
      } catch (err: any) {
          showAlert(`Error: ${err.message}`, 'error');
      }
  };

  const handleDelete = (entry: WinnerLog) => {
      setDeleteConf({
          isOpen: true,
          action: async () => {
              await db.collection("winner_logs").doc(entry.id).delete();
              showAlert("Deleted.", 'info');
          }
      });
  };

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Winner History</h2>
            <button 
                onClick={() => {
                    setEditingEntry({ id: '', rank: 1, playerName: '', playerUid: '', branch: '', boss: '', time: '', date: new Date().toISOString(), status: 'verified' });
                    setIsModalOpen(true);
                }}
                className="bg-rose-900 text-white px-4 py-2 rounded-lg font-bold text-sm"
            >
                + Log Winner
            </button>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-bold text-xs uppercase border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Event</th>
                        <th className="p-4">Winner</th>
                        <th className="p-4">Branch</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                    {winnerLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                            <td className="p-4 text-zinc-500">{new Date(log.date).toLocaleDateString()}</td>
                            <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100">{log.boss}</td>
                            <td className="p-4 flex items-center gap-2">
                                <Crown size={14} className="text-yellow-500" />
                                {log.playerName}
                            </td>
                            <td className="p-4 text-zinc-600 dark:text-zinc-400">{log.branch}</td>
                            <td className="p-4 text-right flex justify-end gap-2">
                                <button onClick={() => {
                                    setEditingEntry(log);
                                    setIsModalOpen(true);
                                }} className="text-zinc-400 hover:text-blue-500"><Edit size={16}/></button>
                                <button onClick={() => handleDelete(log)} className="text-zinc-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <EditLeaderboardModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            entry={editingEntry} 
            setEntry={(e) => setEditingEntry(e)} 
            onUpdate={handleUpdate} 
            bossPool={[]} 
            guilds={guilds}
            allUsers={allUsers}
            mode="winnerLog"
        />
        <ConfirmationModal isOpen={deleteConf.isOpen} onClose={() => setDeleteConf({...deleteConf, isOpen: false})} onConfirm={deleteConf.action} title="Delete Log?" message="This cannot be undone." />
    </div>
  );
};
