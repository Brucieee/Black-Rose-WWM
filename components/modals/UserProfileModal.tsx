
import React from 'react';
import { UserProfile, RoleType, Guild } from '../../types';
import { ShieldCheck, X } from 'lucide-react';
import { BaseModal } from './BaseModal';

interface UserProfileModalProps {
  user: UserProfile | null;
  onClose: () => void;
  guilds: Guild[];
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose, guilds }) => {
  if (!user) return null;

  const getRoleBadge = (role: RoleType) => {
    switch (role) {
      case RoleType.DPS: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">DPS</span>;
      case RoleType.TANK: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">TANK</span>;
      case RoleType.HEALER: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">HEALER</span>;
      case RoleType.HYBRID: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">HYBRID</span>;
    }
  };

  return (
    <BaseModal isOpen={!!user} onClose={onClose} hideCloseButton className="max-w-md">
      <div className="h-24 bg-zinc-900 dark:bg-black relative">
         <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors z-10"
         >
           <X size={20} />
         </button>
      </div>
      <div className="px-6 pb-6 -mt-12 relative">
         <div className="flex justify-between items-end mb-4">
            <img 
              src={user.photoURL || 'https://via.placeholder.com/150'} 
              alt={user.displayName} 
              className="w-24 h-24 rounded-full border-4 border-white dark:border-zinc-800 shadow-md bg-white dark:bg-zinc-800 object-cover" 
            />
            <div className="mb-2">{getRoleBadge(user.role)}</div>
         </div>
         
         <div className="mb-6">
           <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {user.displayName}
              {user.systemRole !== 'Member' && <ShieldCheck size={18} className="text-rose-900 dark:text-rose-500" />}
           </h3>
           <p className="text-zinc-500 dark:text-zinc-400 text-sm">ID: {user.inGameId || 'N/A'}</p>
           {user.systemRole !== 'Member' && <span className="inline-block mt-1 text-xs font-bold uppercase tracking-wider text-zinc-400">{user.systemRole}</span>}
         </div>

         <div className="space-y-4">
           <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Martial Arts</h4>
              <div className="flex flex-wrap gap-2">
                {user.weapons?.map(w => (
                  <span key={w} className="px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full text-sm text-zinc-700 dark:text-zinc-300 shadow-sm">
                    {w}
                  </span>
                ))}
              </div>
           </div>

           <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700 flex justify-between items-center">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Guild Branch</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{guilds.find(g => g.id === user.guildId)?.name || 'Unknown'}</span>
           </div>
         </div>
      </div>
    </BaseModal>
  );
};
