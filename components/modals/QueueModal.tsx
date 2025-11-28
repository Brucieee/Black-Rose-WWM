
import React from 'react';
import { QueueEntry, RoleType } from '../../types';
import { Users, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { BaseModal } from './BaseModal';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  guildName: string;
  bossName: string;
  bossImageUrl?: string;
  queue: QueueEntry[];
  currentUserUid?: string;
  isCooldown: boolean;
  onJoin: () => void;
  onLeave: () => void;
}

export const QueueModal: React.FC<QueueModalProps> = ({
  isOpen,
  onClose,
  guildName,
  bossName,
  bossImageUrl,
  queue,
  currentUserUid,
  isCooldown,
  onJoin,
  onLeave
}) => {
  const isInQueue = currentUserUid && queue.find(q => q.uid === currentUserUid);

  const getRoleBadge = (role: RoleType) => {
    switch (role) {
      case RoleType.DPS: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">DPS</span>;
      case RoleType.TANK: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">TANK</span>;
      case RoleType.HEALER: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">HEALER</span>;
      case RoleType.HYBRID: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">HYBRID</span>;
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg flex flex-col max-h-[85vh]">
       <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex gap-4 items-center">
         {bossImageUrl && (
             <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-700 flex-shrink-0 relative" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <img src={bossImageUrl} alt={bossName} className="w-full h-full object-cover" />
             </div>
         )}
         <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Queue: {guildName}</h3>
            <p className="text-rose-700 dark:text-rose-400 font-medium text-sm mt-1">{bossName}</p>
            <p className="text-xs text-zinc-500 mt-2"><Users size={12} className="inline mr-1" /> {queue.length} / 30</p>
         </div>
       </div>
       <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 sticky top-0"><tr><th className="px-6 py-2 w-16">#</th><th className="px-6 py-2">Name</th><th className="px-6 py-2 text-right">Role</th></tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {queue.map((entry, i) => (
                <tr key={entry.uid} className={currentUserUid && entry.uid === currentUserUid ? 'bg-rose-50 dark:bg-rose-900/10' : ''}>
                  <td className="px-6 py-3 font-mono text-zinc-400">{i + 1}</td>
                  <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">{entry.name}</td>
                  <td className="px-6 py-3 text-right">{getRoleBadge(entry.role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
       </div>
       <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
          {isCooldown ? (
            <div className="flex flex-col items-center justify-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 flex items-center justify-center mb-2">
                    <Clock size={20} />
                </div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Cooldown Active</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[250px]">
                    You already won the last Breaking Army. Please wait for the next one.
                </p>
            </div>
          ) : isInQueue ? (
             <button onClick={onLeave} className="w-full py-3 bg-zinc-200 dark:bg-zinc-800 font-bold rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-zinc-300">Leave Queue</button>
          ) : (
            <button onClick={onJoin} disabled={queue.length >= 30} className="w-full py-3 bg-rose-900 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-rose-950 transition-colors"><CheckCircle className="inline mr-2" size={18} /> Join Queue</button>
          )}
       </div>
    </BaseModal>
  );
};
