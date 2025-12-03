import React, { useState, useEffect } from 'react';
import { UserProfile, Guild } from '../../../types';
import { db } from '../../../services/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { ConfirmationModal } from '../../../components/modals/ConfirmationModal';
import { Trash2 } from 'lucide-react';
import { logAction } from '../../../services/auditLogger';

interface MembersTabProps {
  userProfile: UserProfile;
}

export const MembersTab: React.FC<MembersTabProps> = ({ userProfile }) => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [memberListFilter, setMemberListFilter] = useState('All');
  const [deleteConf, setDeleteConf] = useState<{ isOpen: boolean; title: string; message: string; action: () => Promise<void> }>({ isOpen: false, title: '', message: '', action: async () => {} });

  const isAdmin = userProfile.systemRole === 'Admin';
  const isOfficer = userProfile.systemRole === 'Officer';

  useEffect(() => {
    if (isOfficer) setMemberListFilter(userProfile.guildId);
    const unsubU = db.collection("users").onSnapshot(snap => setAllUsers(snap.docs.map(d => d.data() as UserProfile)));
    const unsubG = db.collection("guilds").onSnapshot(snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    return () => { unsubU(); unsubG(); };
  }, [isOfficer, userProfile.guildId]);

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Member List</h2>
            <select 
                value={memberListFilter} 
                onChange={e => setMemberListFilter(e.target.value)}
                className="p-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm"
                disabled={isOfficer}
            >
                {isAdmin && <option value="All" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">All Branches</option>}
                {guilds.map(g => <option key={g.id} value={g.id} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{g.name}</option>)}
            </select>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-bold text-xs uppercase border-b border-zinc-200 dark:border-zinc-700">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">ID</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Branch</th>
                            <th className="p-4">Last Active</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                        {allUsers.filter(u => memberListFilter === 'All' || u.guildId === memberListFilter).map(u => {
                            const canKick = isAdmin || (isOfficer && u.guildId === userProfile.guildId && u.systemRole === 'Member');

                            return (
                            <tr key={u.uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 group">
                                <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    <img src={u.photoURL || 'https://via.placeholder.com/30'} className="w-6 h-6 rounded-full" />
                                    {u.displayName}
                                </td>
                                <td className="p-4 font-mono text-zinc-500">{u.inGameId}</td>
                                <td className="p-4 text-zinc-600 dark:text-zinc-400">{u.role}</td>
                                <td className="p-4 text-zinc-600 dark:text-zinc-400">{guilds.find(g => g.id === u.guildId)?.name}</td>
                                <td className="p-4 text-zinc-500 text-xs">
                                    {u.lastSeen ? new Date(u.lastSeen).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="p-4 text-right">
                                    {canKick && u.uid !== currentUser?.uid && (
                                        <button 
                                            onClick={() => {
                                                setDeleteConf({
                                                    isOpen: true,
                                                    title: `Kick ${u.displayName}?`,
                                                    message: "This will remove the user from the guild branch. They will need to rejoin.",
                                                    action: async () => {
                                                        await db.collection("users").doc(u.uid).update({ guildId: '', systemRole: 'Member' });
                                                        await logAction('Kick Member', `Kicked member ${u.displayName} from guild`, userProfile, 'Member');
                                                        showAlert(`${u.displayName} kicked.`, 'info');
                                                    }
                                                });
                                            }}
                                            className="text-zinc-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Kick Member"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
        </div>
        <ConfirmationModal isOpen={deleteConf.isOpen} onClose={() => setDeleteConf({...deleteConf, isOpen: false})} onConfirm={deleteConf.action} title={deleteConf.title} message={deleteConf.message} />
    </div>
  );
};