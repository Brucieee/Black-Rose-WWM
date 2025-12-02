
import React from 'react';
import { UserProfile, RoleType, Guild } from '../../types';
import { ShieldCheck, X, Sword, Shield, Heart, Zap, User } from 'lucide-react';
import { BaseModal } from './BaseModal';

interface UserProfileModalProps {
  user: UserProfile | null;
  onClose: () => void;
  guilds: Guild[];
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose, guilds }) => {
  if (!user) return null;

  const getRoleIcon = (role: RoleType) => {
    switch (role) {
      case RoleType.DPS: return <Sword size={16} />;
      case RoleType.TANK: return <Shield size={16} />;
      case RoleType.HEALER: return <Heart size={16} />;
      case RoleType.HYBRID: return <Zap size={16} />;
    }
  };

  const getRoleColor = (role: RoleType) => {
      switch(role) {
          case RoleType.DPS: return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30';
          case RoleType.TANK: return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/30';
          case RoleType.HEALER: return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30';
          case RoleType.HYBRID: return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-900/30';
      }
  };

  return (
    <BaseModal isOpen={!!user} onClose={onClose} hideCloseButton className="max-w-md overflow-hidden bg-white dark:bg-zinc-900">
      
      {/* Banner */}
      <div className="h-32 bg-gradient-to-br from-zinc-800 to-black relative">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-50"></div>
         <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-colors z-10 backdrop-blur-sm"
         >
           <X size={20} />
         </button>
      </div>

      <div className="px-8 pb-8 -mt-16 relative flex flex-col items-center">
         {/* Avatar */}
         <div className="relative mb-4 group">
            <div className="w-32 h-32 rounded-full p-1.5 bg-white dark:bg-zinc-900 shadow-xl">
                <img 
                    src={user.photoURL || 'https://via.placeholder.com/150'} 
                    alt={user.displayName} 
                    className="w-full h-full rounded-full object-cover bg-zinc-200 dark:bg-zinc-800" 
                />
            </div>
            {user.systemRole !== 'Member' && (
                <div className="absolute top-1 right-1 bg-zinc-900 text-white p-2 rounded-full border-4 border-white dark:border-zinc-900 shadow-md z-10" title={user.systemRole}>
                    <ShieldCheck size={18} />
                </div>
            )}
         </div>
         
         <div className="text-center mb-6 w-full">
           <h3 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 mb-1">
              {user.displayName}
           </h3>
           <p className="text-zinc-500 dark:text-zinc-400 text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full inline-block">
                ID: {user.inGameId || 'N/A'}
           </p>
         </div>

         <div className="w-full space-y-4">
           {/* Stats Grid */}
           <div className="grid grid-cols-2 gap-4">
               <div className={`flex flex-col items-center justify-center p-3 rounded-xl border ${getRoleColor(user.role)}`}>
                   <span className="text-xs font-bold uppercase mb-1 flex items-center gap-1 opacity-80">
                        {getRoleIcon(user.role)} Role
                   </span>
                   <span className="font-black text-lg uppercase">{user.role}</span>
               </div>
               <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                   <span className="text-xs font-bold uppercase text-zinc-500 mb-1">Branch</span>
                   <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate w-full text-center">
                        {guilds.find(g => g.id === user.guildId)?.name || 'Unknown'}
                   </span>
               </div>
           </div>

           {/* Weapons */}
           <div className="bg-zinc-50 dark:bg-zinc-800 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-center mb-4">Martial Arts Loadout</h4>
              <div className="flex flex-wrap justify-center gap-2">
                {user.weapons?.map(w => (
                  <span key={w} className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-bold text-zinc-700 dark:text-zinc-300 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-default">
                    {w}
                  </span>
                ))}
                {(!user.weapons || user.weapons.length === 0) && (
                    <span className="text-zinc-400 text-sm italic">No weapons equipped</span>
                )}
              </div>
           </div>
         </div>
      </div>
    </BaseModal>
  );
};
