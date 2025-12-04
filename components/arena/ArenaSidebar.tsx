import React from 'react';
import { ArenaParticipant, Guild, RoleType } from '../../types';
import { X, Clock, Edit2, Users, Shuffle, RefreshCw, UserMinus, Shield, LogOut, AlertCircle, Trash2 } from 'lucide-react';

interface ArenaSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  approvedParticipants: ArenaParticipant[];
  pendingParticipants: ArenaParticipant[];
  currentUserParticipant?: ArenaParticipant;
  currentUser: any;
  userProfile: any;
  canManage: boolean;
  isCustomMode: boolean;
  guilds: Guild[];
  isShuffling: boolean;
  assignedParticipantUids: Set<string>;
  
  onRemoveParticipant: (uid: string, name: string) => void;
  onApprove: (uid: string) => void;
  onDeny: (uid: string) => void;
  onEditPoints: (p: ArenaParticipant) => void;
  onManualAdd: () => void;
  onShuffle: () => void;
  onReset: () => void;
  onClearAll: () => void;
  onJoin: () => void;
  onLeave: () => void;
}

export const ArenaSidebar: React.FC<ArenaSidebarProps> = ({
  isOpen, onClose, approvedParticipants, pendingParticipants, currentUserParticipant,
  currentUser, userProfile, canManage, isCustomMode, guilds, isShuffling, assignedParticipantUids,
  onRemoveParticipant, onApprove, onDeny, onEditPoints, onManualAdd, onShuffle, onReset, onClearAll, onJoin, onLeave
}) => {

  const getRoleBadge = (role?: RoleType) => {
      if (!role) return null;
      switch (role) {
          case RoleType.DPS: return <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-bold tracking-wide">DPS</span>;
          case RoleType.TANK: return <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 font-bold tracking-wide">TANK</span>;
          case RoleType.HEALER: return <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-bold tracking-wide">HEALER</span>;
          case RoleType.HYBRID: return <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold tracking-wide">HYBRID</span>;
          default: return null;
      }
  };

  const handleDragStart = (e: React.DragEvent, user: ArenaParticipant) => {
    if (!canManage || assignedParticipantUids.has(user.uid)) return;
    e.dataTransfer.setData("application/json", JSON.stringify(user));
  };

  return (
    <div className={`
        absolute lg:relative z-20 h-full w-full lg:w-80 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
        <button 
            onClick={onClose} 
            className="lg:hidden absolute top-2 right-2 p-2 text-zinc-500"
        >
            <X size={20} />
        </button>

        {canManage && pendingParticipants.length > 0 && (
            <div className="border-b-4 border-zinc-100 dark:border-zinc-950 bg-rose-50 dark:bg-rose-900/10 flex-shrink-0">
                <div className="p-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
                        <Clock size={12} /> Pending Approval
                    </h3>
                    <span className="text-xs font-bold bg-white dark:bg-zinc-800 px-1.5 rounded text-rose-600">{pendingParticipants.length}</span>
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2">
                    {pendingParticipants.map(p => (
                        <div key={p.uid} className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <img src={p.photoURL || 'https://via.placeholder.com/150'} className="w-5 h-5 rounded-full" />
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.displayName}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                    Points: <strong className="text-zinc-700 dark:text-zinc-300">{p.activityPoints}</strong>
                                    <button onClick={()=>onEditPoints(p)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ml-1"><Edit2 size={10} /></button>
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => onApprove(p.uid)} className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs py-1 rounded font-bold transition-colors">Approve</button>
                                <button onClick={() => onDeny(p.uid)} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs py-1 rounded font-medium transition-colors">Deny</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Users size={18} /> Participants
                </h3>
                {canManage && (
                    <button 
                        onClick={onManualAdd}
                        className="text-xs bg-rose-900 text-white hover:bg-rose-950 px-2 py-1 rounded transition-colors font-bold ml-2"
                        title="Manually Add Participant"
                    >
                        + Add Member
                    </button>
                )}
            </div>
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full font-mono text-zinc-500">{approvedParticipants.length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 relative">
            {isShuffling && (
              <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-20 flex items-center justify-center backdrop-blur-[1px]">
                  <div className="flex flex-col items-center animate-pulse">
                      <Shuffle className="text-rose-900 dark:text-rose-500 animate-spin" size={32} />
                      <span className="text-xs font-bold mt-2 text-rose-900 dark:text-rose-500">SHUFFLING...</span>
                  </div>
              </div>
            )}

            {approvedParticipants.map((p, idx) => {
                const isAssigned = assignedParticipantUids.has(p.uid);
                const canDrag = canManage && !isAssigned;
                const animDelay = `${idx * 0.05}s`;
                
                return (
                    <div 
                        key={p.uid}
                        draggable={canDrag}
                        onDragStart={(e) => handleDragStart(e, p)}
                        style={{ animationDelay: isShuffling ? animDelay : '0s' }}
                        className={`flex items-center gap-3 p-2 rounded-lg border transition-all group relative 
                            ${isAssigned 
                              ? 'bg-zinc-50 dark:bg-zinc-800 opacity-50 border-transparent' 
                              : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-rose-900 shadow-sm'
                            } 
                            ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
                            ${isShuffling ? 'animate-shuffle' : ''}
                        `}
                    >
                        <img src={p.photoURL || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-full object-cover bg-zinc-200 dark:bg-zinc-700" alt={p.displayName} />
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.displayName}</span>
                                {getRoleBadge(p.role)}
                            </div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              {guilds.find(g => g.id === p.originalGuildId || g.id === p.guildId)?.name || 'Custom'}
                            </span>
                            {!isCustomMode && (
                                <span className="text-[10px] text-zinc-400 mt-0.5">{p.activityPoints} pts</span>
                            )}
                        </div>
                        {canManage && (
                            <button 
                                onClick={() => onRemoveParticipant(p.uid, p.displayName)}
                                className="text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove Participant"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                );
            })}
            {approvedParticipants.length === 0 && (
                <p className="text-center text-zinc-400 text-sm py-4">No approved participants.</p>
            )}
        </div>

        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-900/50 flex-shrink-0">
            {!isCustomMode && (
                <>
                    {!currentUserParticipant ? (
                        <button 
                            onClick={onJoin}
                            className="w-full py-2 bg-rose-900 text-white rounded-lg font-bold hover:bg-rose-950 transition-colors shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 text-sm"
                        >
                            <Shield size={16} /> Join Tournament
                        </button>
                    ) : currentUserParticipant.status === 'pending' ? (
                        <button disabled className="w-full py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg font-bold cursor-not-allowed flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 text-sm">
                            <Clock size={16} /> Pending Approval
                        </button>
                    ) : currentUserParticipant.status === 'denied' ? (
                        <div className="flex flex-col gap-2">
                            <button disabled className="w-full py-2 bg-transparent text-red-600 dark:text-red-500 rounded-lg font-bold cursor-not-allowed flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/50 text-sm">
                                <AlertCircle size={16} /> Entry Denied
                            </button>
                            <button onClick={onJoin} className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline">Update Points & Re-apply</button>
                        </div>
                    ) : (
                        <button onClick={onLeave} className="w-full py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-white rounded-lg font-bold hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors flex items-center justify-center gap-2 text-sm">
                            <LogOut size={16} /> Leave Arena
                        </button>
                    )}
                </>
            )}

            {canManage && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <button onClick={onShuffle} className="text-xs flex items-center justify-center gap-1 bg-white dark:bg-zinc-800 hover:bg-rose-900 hover:text-white px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 transition-colors text-zinc-600 dark:text-zinc-400">
                      <Shuffle size={12} className={isShuffling ? "animate-spin" : ""} /> Shuffle
                  </button>
                  <button onClick={onReset} className="text-xs flex items-center justify-center gap-1 bg-white dark:bg-zinc-800 hover:bg-rose-900 hover:text-white px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 transition-colors text-zinc-600 dark:text-zinc-400">
                      <RefreshCw size={12} /> Reset Bracket
                  </button>
                  <button onClick={onClearAll} className="col-span-2 text-xs flex items-center justify-center gap-1 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded border border-red-100 dark:border-red-900/30 transition-colors">
                      <UserMinus size={12} /> Remove All Participants
                  </button>
              </div>
            )}
        </div>
    </div>
  );
};