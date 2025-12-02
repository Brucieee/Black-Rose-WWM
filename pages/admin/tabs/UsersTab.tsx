
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../../types';
import { db } from '../../../services/firebase';
import { Search } from 'lucide-react';

export const UsersTab: React.FC = () => {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    const unsub = db.collection("users").onSnapshot(snap => setAllUsers(snap.docs.map(d => d.data() as UserProfile)));
    return () => unsub();
  }, []);

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">User Management</h2>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <input 
                    placeholder="Search users..." 
                    className="pl-9 pr-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-rose-500 text-zinc-900"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                />
            </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-bold text-xs uppercase border-b border-zinc-200 dark:border-zinc-700">
                        <tr>
                            <th className="p-4">User</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">System Role</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                        {allUsers
                            .filter(u => u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
                            .map(u => (
                            <tr key={u.uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100">{u.displayName}</td>
                                <td className="p-4 text-zinc-500">{u.email}</td>
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
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
