
import React from 'react';
import { Guild, CustomTournament, UserProfile } from '../../types';
import { Swords, Globe, Plus, MonitorPlay, Settings, RefreshCw, Menu, Trash2, LayoutTemplate } from 'lucide-react';

interface ArenaHeaderProps {
  guilds: Guild[];
  customTournaments: CustomTournament[];
  selectedId: string;
  onSelectId: (id: string) => void;
  userProfile: UserProfile | null;
  canManage: boolean;
  isAdmin: boolean;
  isCustomMode: boolean;
  canDeleteCustom: boolean;
  selectedTournament?: CustomTournament;
  onDeleteTournament: () => void;
  onOpenCreateModal: () => void;
  onOpenStream: () => void;
  onOpenSettings: () => void;
  onOpenInit: () => void;
  onToggleSidebar: () => void;
  onOpenBanner?: () => void;
}

export const ArenaHeader: React.FC<ArenaHeaderProps> = ({
  guilds,
  customTournaments,
  selectedId,
  onSelectId,
  userProfile,
  canManage,
  isAdmin,
  isCustomMode,
  canDeleteCustom,
  selectedTournament,
  onDeleteTournament,
  onOpenCreateModal,
  onOpenStream,
  onOpenSettings,
  onOpenInit,
  onToggleSidebar,
  onOpenBanner
}) => {
  return (
    <div className="flex justify-between items-start mb-2">
      <div>
        <div className="flex items-center gap-3">
          <button onClick={onToggleSidebar} className="lg:hidden p-2 bg-zinc-100 dark:bg-zinc-800 rounded">
            <Menu size={18} />
          </button>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Swords className="text-rose-900 dark:text-rose-500" size={24} />
            {isCustomMode ? selectedTournament?.title : 'Arena Tournament'}
          </h1>
          {isCustomMode && canDeleteCustom && (
            <button 
              onClick={onDeleteTournament}
              className="text-zinc-400 hover:text-red-500 transition-colors p-2"
              title="Delete Tournament"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex gap-2 items-center overflow-x-auto custom-scrollbar pb-1 max-w-[40vw] lg:max-w-[60vw]">
          {guilds.map(g => (
            <button
              key={g.id}
              onClick={() => onSelectId(g.id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
                selectedId === g.id 
                ? 'bg-rose-900 text-white shadow-lg shadow-rose-900/20' 
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              {g.name}
            </button>
          ))}
          
          <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1"></div>

          {customTournaments.map(t => (
            <button
              key={t.id}
              onClick={() => onSelectId(t.id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedId === t.id 
                ? 'bg-purple-900 text-white shadow-lg shadow-purple-900/20' 
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              <Globe size={12} /> {t.title}
            </button>
          ))}

          {userProfile?.systemRole === 'Admin' && (
            <button 
              onClick={onOpenCreateModal}
              className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 p-1.5 rounded-lg transition-colors flex-shrink-0"
              title="Create Custom Tournament"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {canManage && (
          <div className="flex gap-2 flex-shrink-0">
            {isAdmin && onOpenBanner && (
              <button 
                onClick={onOpenBanner}
                className="bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors"
                title="Launch Match Banner"
              >
                <LayoutTemplate size={18} />
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={onOpenStream}
                className="bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors animate-pulse"
                title="Launch Stream Screen"
              >
                <MonitorPlay size={18} />
              </button>
            )}
            <button 
              onClick={onOpenSettings}
              className="bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors"
              title="Arena Settings"
            >
              <Settings size={18} />
            </button>
            {isAdmin && (
                <button 
                onClick={onOpenInit}
                className="bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors"
                title="Setup Bracket"
                >
                <RefreshCw size={18} />
                </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
