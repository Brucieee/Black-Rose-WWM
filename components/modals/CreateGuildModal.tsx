
import React from 'react';
import { BaseModal } from './BaseModal';

interface CreateGuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  data: { name: string; id: string; memberCap: number };
  onChange: (data: any) => void;
}

export const CreateGuildModal: React.FC<CreateGuildModalProps> = ({ isOpen, onClose, onSubmit, data, onChange }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-sm">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">Create New Branch</h3>
        <p className="text-sm text-zinc-500 mb-6">The system has automatically generated the next branch credentials.</p>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase">Branch Name</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{data.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase">System ID</span>
                  <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{data.id}</span>
              </div>
              <div className="flex justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase">Capacity</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{data.memberCap}</span>
              </div>
          </div>
          
          <button type="submit" className="w-full bg-rose-900 text-white py-3 rounded-lg font-bold hover:bg-rose-950 transition-colors shadow-lg shadow-rose-900/20">
              Confirm Creation
          </button>
        </form>
      </div>
    </BaseModal>
  );
};
