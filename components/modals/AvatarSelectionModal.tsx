
import React from 'react';
import { BaseModal } from './BaseModal';
import { PRESET_AVATARS } from '../../services/mockData';

interface AvatarSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAvatar: string;
  onSelect: (avatarUrl: string) => void;
}

export const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  selectedAvatar, 
  onSelect 
}) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] flex flex-col">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Select Avatar</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Choose your character portrait</p>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {PRESET_AVATARS.map((avatar, idx) => {
            const isSelected = selectedAvatar === avatar;
            // Extract filename for alt text
            const fileName = avatar.split('/').pop()?.split('.')[0].replace(/_/g, ' ') || `Avatar ${idx + 1}`;
            
            return (
              <button
                key={idx}
                type="button"
                onClick={() => { onSelect(avatar); onClose(); }}
                className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  isSelected 
                    ? 'border-rose-900 ring-2 ring-rose-900/30 shadow-lg scale-[1.02]' 
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-rose-500 hover:shadow-md'
                }`}
              >
                <img 
                  src={avatar} 
                  alt={fileName}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  loading="lazy"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
                  <span className="text-white text-xs font-medium truncate w-full text-center shadow-black drop-shadow-md">
                    {fileName}
                  </span>
                </div>
                
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-rose-900 text-white p-1 rounded-full shadow-lg">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </BaseModal>
  );
};
