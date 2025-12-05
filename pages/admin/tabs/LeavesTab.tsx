
import React, { useState, useEffect } from 'react';
import { LeaveRequest, Guild, UserProfile } from '../../../types';
import { db } from '../../../services/firebase';
import { useAlert } from '../../../contexts/AlertContext';
import { Trash2 } from 'lucide-react';

interface LeavesTabProps {
  userProfile: UserProfile;
}

export const LeavesTab: React.FC<LeavesTabProps> = ({ userProfile }) => {
  const { showAlert } = useAlert();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [leaveBranchFilter, setLeaveBranchFilter] = useState('All');

  const isAdmin = userProfile.systemRole === 'Admin';
  const isOfficer = userProfile.systemRole === 'Officer';

  useEffect(() => {
    if (isOfficer) setLeaveBranchFilter(userProfile.guildId);
    const unsubL = db.collection("leaves").orderBy("timestamp", "desc").onSnapshot(snap => setLeaves(snap.docs.map(d => ({id: d.id, ...d.data()} as LeaveRequest))));
    const unsubG = db.collection("guilds").onSnapshot(snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    return () => { unsubL(); unsubG(); };
  }, [isOfficer, userProfile.guildId]);

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Leave Requests</h2>
            <select 
                value={leaveBranchFilter} 
                onChange={e => setLeaveBranchFilter(e.target.value)}
                className="p-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm"
                disabled={isOfficer}
            >
                {isAdmin && <option value="All" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">All Branches</option>}
                {guilds.map(g => <option key={g.id} value={g.id} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{g.name}</option>)}
            </select>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-bold text-xs uppercase border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                        <th className="p-4">Member</th>
                        <th className="p-4">Dates</th>
                        <th className="p-4">Reason</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                    {leaves.filter(l => leaveBranchFilter === 'All' || l.guildId === leaveBranchFilter).map(leave => (
                        <tr key={leave.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                            <td className="p-4">
                                <p className="font-bold text-zinc-900 dark:text-zinc-100">{leave.displayName}</p>
                                <p className="text-xs text-zinc-500">{leave.guildName}</p>
                            </td>
                            <td className="p-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                {new Date(leave.startDate).toLocaleDateString()} <span className="mx-1">→</span> {new Date(leave.endDate).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-zinc-500 italic whitespace-pre-wrap">{leave.reason || "No reason provided"}</td>
                            <td className="p-4 text-right">
                                {isAdmin && (
                                    <button onClick={() => {
                                        db.collection("leaves").doc(leave.id).delete();
                                        showAlert("Leave request removed.", 'info');
                                    }} className="text-zinc-400 hover:text-red-500"><Trash2 size={16}/></button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};
