
import React from 'react';
import { BaseModal } from './BaseModal';
import { Announcement } from '../../types';
import { Globe, Clock, User } from 'lucide-react';
import { RichText } from '../RichText';

interface ViewAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
}

export const ViewAnnouncementModal: React.FC<ViewAnnouncementModalProps> = ({ 
  isOpen, 
  onClose, 
  announcement 
}) => {
  if (!announcement) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl" hideCloseButton={true}>
      <div className="p-6">
        <div className="mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {announcement.title}
                </h3>
                {announcement.isGlobal && (
                    <span className="flex-shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-bold uppercase">
                        <Globe size={12} /> Global
                    </span>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                    <User size={14} /> {announcement.authorName}
                </span>
                <span className="flex items-center gap-1">
                    <Clock size={14} /> {new Date(announcement.timestamp).toLocaleString()}
                </span>
            </div>
        </div>

        {announcement.imageUrl && (
            <div className="w-full h-64 rounded-xl overflow-hidden mb-6 bg-zinc-100 dark:bg-zinc-800">
                <img src={announcement.imageUrl} className="w-full h-full object-cover" alt="Announcement" />
            </div>
        )}

        <div className="text-zinc-700 dark:text-zinc-300 leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            <RichText text={announcement.content} />
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-medium"
            >
                Close
            </button>
        </div>
      </div>
    </BaseModal>
  );
};
