
import React, { useState, useEffect } from 'react';
import { UserProfile, Guild } from '../../../types';
import { db } from '../../../services/firebase';
import { Search } from 'lucide-react';

export const UsersTab: React.FC = () => {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');

  useEffect(() => {
    const unsub = db.collection("users").onSnapshot(snap => setAllUsers(snap.docs.map(d => d.data() as UserProfile)));
    const unsubGuilds = db.collection("guilds").onSnapshot(snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    return () => { unsub(); unsubGuilds(); };
  }, []);

  const filteredUsers = allUsers.filter(u => {
      const matchesSearch = u.displayName.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = filterRole === 'All' || u.systemRole === filterRole;
      return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">User Management</h2>
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                    <input 
                        placeholder="Search users..." 
                        className="w-full pl-9 pr-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-rose-500 text-zinc-900"
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                    />
                </div>
                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                    <option value="All">All Roles</option>
                    <option value="Member">Member</option>
                    <option value="Officer">Officer</option>
                    <option value="Admin">Admin</option>
                </select>
            </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-bold text-xs uppercase border-b border-zinc-200 dark:border-zinc-700">
                        <tr>
                            <th className="p-4">User</th>
                            <th className="p-4">Guild Branch</th>
                            <th className="p-4">System Role</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                        {filteredUsers.map(u => (
                            <tr key={u.uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100">{u.displayName}</td>
                                <td className="p-4 text-zinc-600 dark:text-zinc-400">
                                    {guilds.find(g => g.id === u.guildId)?.name || <span className="text-zinc-400 italic">No Branch</span>}
                                </td>
                                <td className="p-4">
                                    <select 
                                        value={u.systemRole}
                                        onChange={(e) => db.collection("users").doc(u.uid).update({ systemRole: e.target.value })}
                                        className="bg-transparent border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs font-bold uppercase text-zinc-900 dark:text-white"
                                    >
                                        <option value="Member" className="bg-white dark:bg-zinc-800">Member</option>
                                        <option value="Officer" className="bg-white dark:bg-zinc-800">Officer</option>
                                        <option value="Admin" className="bg-white dark:bg-zinc-800">Admin</option>
                                    </select>
                                </td>
                                <td className="p-4 text-right"></td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-zinc-500">No users found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
