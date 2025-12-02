
import React, { useState, useEffect } from 'react';
import { UserProfile, RoleType, Guild } from '../types';
import { Search, ShieldCheck, ChevronDown, Sword, Shield, Heart, Zap } from 'lucide-react';
import { db } from '../services/firebase';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { useAuth } from '../contexts/AuthContext';

const Members: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [filterRole, setFilterRole] = useState<string>('All');
  const [filterGuild, setFilterGuild] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);

  useEffect(() => {
    const usersCollection = db.collection("users");
    const unsubscribe = usersCollection.onSnapshot((snapshot) => {
      const allUsers = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(allUsers);
    });
    
    const guildsCollection = db.collection("guilds");
    guildsCollection.get().then(snapshot => {
      setGuilds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guild)));
    });

    return () => unsubscribe();
  }, []);

  const isUserOnline = (user: UserProfile) => {
      if (user.status === 'online') {
          if (!user.lastSeen) return true; 
          const diff = Date.now() - new Date(user.lastSeen).getTime();
          return diff < 1 * 60 * 1000; // 1 minute inactivity
      }
      return false;
  };

  const sortedAndFilteredUsers = users
    .sort((a, b) => {
      const aOnline = isUserOnline(a);
      const bOnline = isUserOnline(b);
      if (aOnline && !bOnline) return -1;
      if (bOnline && !aOnline) return 1;
      return a.displayName.localeCompare(b.displayName);
    })
    .filter(user => {
      const matchesSearch = user.displayName.toLowerCase().includes(search.toLowerCase());
      const matchesRole = filterRole === 'All' || user.role === filterRole;
      const matchesGuild = filterGuild === 'All' || user.guildId === filterGuild;
      return matchesSearch && matchesRole && matchesGuild;
    });

  const getRoleIcon = (role: RoleType) => {
    switch (role) {
      case RoleType.DPS: return <Sword size={14} />;
      case RoleType.TANK: return <Shield size={14} />;
      case RoleType.HEALER: return <Heart size={14} />;
      case RoleType.HYBRID: return <Zap size={14} />;
    }
  };

  const getRoleGradient = (role: RoleType) => {
      switch(role) {
          case RoleType.DPS: return 'from-red-500/20 to-rose-500/5 border-red-500/20';
          case RoleType.TANK: return 'from-yellow-500/20 to-orange-500/5 border-yellow-500/20';
          case RoleType.HEALER: return 'from-green-500/20 to-emerald-500/5 border-green-500/20';
          case RoleType.HYBRID: return 'from-purple-500/20 to-indigo-500/5 border-purple-500/20';
          default: return 'from-zinc-500/20 to-zinc-500/5 border-zinc-500/20';
      }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 animate-in slide-in-from-top duration-500">
        <div>
           <h2 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">ROSTER</h2>
           <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
             <span className="text-rose-900 dark:text-rose-500 font-bold">{sortedAndFilteredUsers.length}</span> Active Members
           </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Find agent..." 
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-rose-500/50 outline-none text-zinc-900 dark:text-zinc-100 transition-all placeholder:text-zinc-400"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative w-full sm:w-32">
                <select 
                className="w-full appearance-none pl-3 pr-8 py-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-rose-500/50 outline-none text-zinc-700 dark:text-zinc-300 cursor-pointer border-r-[8px] border-transparent"
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                >
                <option value="All">Role: All</option>
                {Object.values(RoleType).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            
            <div className="relative w-full sm:w-40">
                <select 
                className="w-full appearance-none pl-3 pr-8 py-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-rose-500/50 outline-none text-zinc-700 dark:text-zinc-300 cursor-pointer border-r-[8px] border-transparent"
                value={filterGuild}
                onChange={e => setFilterGuild(e.target.value)}
                >
                <option value="All">Branch: All</option>
                {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedAndFilteredUsers.map((user, idx) => {
          const isOnline = isUserOnline(user);
          const roleGradient = getRoleGradient(user.role);
          const guildName = guilds.find(g => g.id === user.guildId)?.name || 'Unknown Branch';

          return (
          <div 
            key={user.uid}
            onClick={() => setSelectedUser(user)}
            style={{ animationDelay: `${idx * 0.05}s` }}
            className={`
                group relative bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 
                hover:border-rose-500/50 dark:hover:border-rose-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer
                animate-in fade-in zoom-in-95 fill-mode-backwards
            `}
          >
            {/* Top Banner Gradient */}
            <div className={`h-24 bg-gradient-to-br ${roleGradient} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent"></div>
            </div>

            {/* Content */}
            <div className="px-5 pb-6 pt-0 relative flex flex-col items-center">
                {/* Avatar */}
                <div className="relative -mt-12 mb-3">
                    <div className="w-24 h-24 rounded-full p-1 bg-white dark:bg-zinc-900 shadow-lg">
                        <img 
                            src={user.photoURL || 'https://via.placeholder.com/150'} 
                            alt={user.displayName} 
                            className="w-full h-full rounded-full object-cover bg-zinc-200 dark:bg-zinc-800"
                        />
                    </div>
                    {/* Status Dot */}
                    <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-white dark:border-zinc-900 ${isOnline ? 'bg-green-500' : 'bg-zinc-500'}`} title={isOnline ? "Online" : "Offline"}></div>
                    
                    {/* System Role Badge */}
                    {user.systemRole !== 'Member' && (
                        <div className="absolute top-0 right-0 bg-zinc-900 text-white p-1.5 rounded-full border-2 border-white dark:border-zinc-900 shadow-md z-10" title={user.systemRole}>
                            <ShieldCheck size={14} />
                        </div>
                    )}
                </div>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate w-full text-center mb-1">
                    {user.displayName}
                </h3>
                
                <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        {getRoleIcon(user.role)} {user.role}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 truncate max-w-[120px]">
                        {guildName}
                    </span>
                </div>

                <button className="w-full py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-900/10 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold transition-colors uppercase tracking-wider flex items-center justify-center gap-2 group-hover:bg-rose-900 group-hover:text-white dark:group-hover:text-white">
                    View Profile
                </button>
            </div>
          </div>
        )})}
        
        {sortedAndFilteredUsers.length === 0 && (
            <div className="col-span-full py-20 text-center">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                    <Search size={32} />
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">No members found matching your criteria.</p>
            </div>
        )}
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
