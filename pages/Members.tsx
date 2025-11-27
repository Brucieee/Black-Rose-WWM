
import React, { useState, useEffect } from 'react';
import { UserProfile, RoleType, Guild } from '../types';
import { Search, ShieldCheck } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { UserProfileModal } from '../components/modals/UserProfileModal';

const Members: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [filterRole, setFilterRole] = useState<string>('All');
  const [filterGuild, setFilterGuild] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);

  useEffect(() => {
    // Real-time Users
    const unsubscribe = onSnapshot(query(collection(db, "users")), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });
    
    // Fetch Guilds for name resolution
    getDocs(collection(db, "guilds")).then(snapshot => {
      setGuilds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guild)));
    });

    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.displayName.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'All' || user.role === filterRole;
    const matchesGuild = filterGuild === 'All' || user.guildId === filterGuild;
    return matchesSearch && matchesRole && matchesGuild;
  });

  const getRoleBadge = (role: RoleType) => {
    switch (role) {
      case RoleType.DPS: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">DPS</span>;
      case RoleType.TANK: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">TANK</span>;
      case RoleType.HEALER: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">HEALER</span>;
      case RoleType.HYBRID: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">HYBRID</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Guild Roster</h2>
           <p className="text-zinc-500 dark:text-zinc-400 text-sm">Active members across all branches.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-56 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search members..." 
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-rose-900/20 outline-none text-zinc-900 dark:text-zinc-100"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-rose-900/20 outline-none text-zinc-900 dark:text-zinc-100"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="All">All Roles</option>
            {Object.values(RoleType).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select 
            className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-rose-900/20 outline-none text-zinc-900 dark:text-zinc-100"
            value={filterGuild}
            onChange={e => setFilterGuild(e.target.value)}
          >
            <option value="All">All Branches</option>
            {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredUsers.map(user => (
          <div 
            key={user.uid}
            onClick={() => setSelectedUser(user)}
            className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-rose-900/30 dark:hover:border-rose-900/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src={user.photoURL || 'https://via.placeholder.com/150'} 
                  alt={user.displayName} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-zinc-100 dark:border-zinc-700 group-hover:border-rose-100 dark:group-hover:border-rose-900/50"
                />
                {user.systemRole && user.systemRole !== 'Member' && (
                  <div className="absolute -bottom-1 -right-1 bg-rose-900 text-white p-0.5 rounded-full border border-white dark:border-zinc-900" title={user.systemRole}>
                    <ShieldCheck size={12} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.displayName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {getRoleBadge(user.role)}
                  {user.systemRole === 'Admin' && <span className="text-[10px] font-bold bg-zinc-800 text-white px-1.5 py-0.5 rounded">ADMIN</span>}
                  {user.systemRole === 'Officer' && <span className="text-[10px] font-bold bg-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded">OFFICER</span>}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
               <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{guilds.find(g => g.id === user.guildId)?.name || 'Unknown Branch'}</span>
                  <span className="text-rose-900 dark:text-rose-500 font-medium">See Details →</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      <UserProfileModal 
        user={selectedUser} 
        onClose={() => setSelectedUser(null)} 
        guilds={guilds}
      />
    </div>
  );
};

export default Members;
