
import React from 'react';
import { BaseModal } from './BaseModal';

interface CreateGuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  data: { name: string; id: string };
  onChange: (data: any) => void;
}

export const CreateGuildModal: React.FC<CreateGuildModalProps> = ({ isOpen, onClose, onSubmit, data, onChange }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">Create Guild Branch</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <input 
            type="text" 
            placeholder="Branch Name" 
            required 
            value={data.name} 
            onChange={e => onChange({...data, name: e.target.value})} 
            className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" 
          />
          <input 
            type="text" 
            placeholder="ID (e.g. g1)" 
            required 
            value={data.id} 
            onChange={e => onChange({...data, id: e.target.value})} 
            className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" 
          />
          <button type="submit" className="w-full bg-rose-900 text-white p-2 rounded hover:bg-rose-950 transition-colors">Create</button>
        </form>
      </div>
    </BaseModal>
  );
};
