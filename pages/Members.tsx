import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile, RoleType, Guild } from '../types';
import { Search, X, ShieldCheck } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';

const Members: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [filterRole, setFilterRole] = useState<string>('All');
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
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: RoleType) => {
    switch (role) {
      case RoleType.DPS: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">DPS</span>;
      case RoleType.TANK: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">TANK</span>;
      case RoleType.HEALER: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">HEALER</span>;
      case RoleType.HYBRID: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">HYBRID</span>;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedUser(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Guild Roster</h2>
           <p className="text-zinc-500 dark:text-zinc-400 text-sm">Active members across all branches.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
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
            className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-rose-900/20 outline-none text-zinc-900 dark:text-zinc-100"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="All">All Roles</option>
            {Object.values(RoleType).map(r => <option key={r} value={r}>{r}</option>)}
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

      {selectedUser && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="h-24 bg-zinc-900 dark:bg-black relative">
               <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors z-10"
               >
                 <X size={20} />
               </button>
            </div>
            <div className="px-6 pb-6 -mt-12 relative">
               <div className="flex justify-between items-end mb-4">
                  <img 
                    src={selectedUser.photoURL || 'https://via.placeholder.com/150'} 
                    alt={selectedUser.displayName} 
                    className="w-24 h-24 rounded-full border-4 border-white dark:border-zinc-800 shadow-md bg-white dark:bg-zinc-800 object-cover" 
                  />
                  <div className="mb-2">{getRoleBadge(selectedUser.role)}</div>
               </div>
               
               <div className="mb-6">
                 <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {selectedUser.displayName}
                    {selectedUser.systemRole !== 'Member' && <ShieldCheck size={18} className="text-rose-900 dark:text-rose-500" />}
                 </h3>
                 <p className="text-zinc-500 dark:text-zinc-400 text-sm">ID: {selectedUser.inGameId || 'N/A'}</p>
                 {selectedUser.systemRole !== 'Member' && <span className="inline-block mt-1 text-xs font-bold uppercase tracking-wider text-zinc-400">{selectedUser.systemRole}</span>}
               </div>

               <div className="space-y-4">
                 <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Martial Arts</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.weapons?.map(w => (
                        <span key={w} className="px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full text-sm text-zinc-700 dark:text-zinc-300 shadow-sm">
                          {w}
                        </span>
                      ))}
                    </div>
                 </div>

                 <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700 flex justify-between items-center">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Guild Branch</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{guilds.find(g => g.id === selectedUser.guildId)?.name}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Members;