
import React from 'react';
import { BaseModal } from './BaseModal';

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  data: { name: string; activity: string; maxMembers: number };
  onChange: (data: any) => void;
}

export const CreatePartyModal: React.FC<CreatePartyModalProps> = ({ isOpen, onClose, onSubmit, data, onChange }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Create New Party</h3>
      </div>
      
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Party Name</label>
          <input 
            type="text" 
            required
            placeholder="e.g. Daily Dungeon Run"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-rose-900/20 outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            value={data.name}
            onChange={e => onChange({...data, name: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Activity Type</label>
          <select 
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-rose-900/20 outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            value={data.activity}
            onChange={e => onChange({...data, activity: e.target.value})}
            required
          >
            <option value="" disabled>Select Activity</option>
            <option value="Raid">Raid</option>
            <option value="Dungeon">Dungeon</option>
            <option value="PvP Arena">PvP Arena</option>
            <option value="World Boss">World Boss</option>
            <option value="Questing">Questing</option>
            <option value="Social">Social / Chill</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Max Members</label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="2" 
              max="10" 
              step="1"
              className="w-full accent-rose-900"
              value={data.maxMembers}
              onChange={e => onChange({...data, maxMembers: parseInt(e.target.value)})}
            />
            <span className="font-mono font-bold text-lg text-rose-900 dark:text-rose-500 w-8 text-center">{data.maxMembers}</span>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="flex-1 px-4 py-2 bg-rose-900 text-white rounded-lg hover:bg-rose-950 font-medium shadow-lg shadow-rose-900/20"
          >
            Create Party
          </button>
        </div>
      </form>
    </BaseModal>
  );
};
