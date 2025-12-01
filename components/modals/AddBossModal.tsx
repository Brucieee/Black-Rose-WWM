
import React from 'react';
import { BaseModal } from './BaseModal';
import { ImageUpload } from '../ImageUpload';
import { Skull } from 'lucide-react';

interface AddBossModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: { name: string; imageUrl: string };
  onChange: (data: { name: string; imageUrl: string }) => void;
  onSubmit: () => void;
}

export const AddBossModal: React.FC<AddBossModalProps> = ({ isOpen, onClose, data, onChange, onSubmit }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-sm">
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-500">
                    <Skull size={24} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Boss Details</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Boss Name</label>
                    <input 
                        placeholder="e.g. Grand General" 
                        className="w-full p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                        value={data.name}
                        onChange={e => onChange({...data, name: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Boss Image</label>
                    <ImageUpload 
                        folder="bosses"
                        initialUrl={data.imageUrl}
                        onUploadComplete={(url) => onChange({...data, imageUrl: url})}
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onSubmit}
                        className="flex-1 py-2.5 bg-rose-900 text-white rounded-lg font-bold hover:bg-rose-950 transition-colors shadow-lg shadow-rose-900/20"
                    >
                        Save Boss
                    </button>
                </div>
            </div>
        </div>
    </BaseModal>
  );
};
