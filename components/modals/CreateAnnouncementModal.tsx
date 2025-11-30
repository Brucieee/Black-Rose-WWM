
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Megaphone, Globe } from 'lucide-react';
import { UserProfile, Announcement } from '../../types';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string, isGlobal: boolean) => void;
  userProfile: UserProfile | null;
  forceGlobal?: boolean;
  initialData?: Announcement | null;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  userProfile,
  forceGlobal = false,
  initialData
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isGlobal, setIsGlobal] = useState(forceGlobal);

  // Sync forceGlobal if it changes or initialData provided
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setContent(initialData.content);
        setIsGlobal(initialData.isGlobal);
      } else {
        setTitle('');
        setContent('');
        setIsGlobal(forceGlobal);
      }
    }
  }, [isOpen, initialData, forceGlobal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(title, content, isGlobal);
    onClose();
  };

  const isAdmin = userProfile?.systemRole === 'Admin';

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-rose-100 dark:bg-rose-900/20 p-2.5 rounded-full text-rose-600 dark:text-rose-500">
            <Megaphone size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {initialData ? 'Edit Announcement' : (forceGlobal ? 'Post Global Announcement' : 'Post Announcement')}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {forceGlobal ? 'Share updates with all branches' : 'Share updates with the guild'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Title</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500 outline-none"
              placeholder="e.g. Server Maintenance"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
             <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-zinc-500 uppercase">Content</label>
             </div>
            <textarea 
              required
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500 outline-none min-h-[120px]"
              placeholder="Write your announcement here..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>

          {isAdmin && !forceGlobal && (
             <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <input 
                  type="checkbox" 
                  id="globalCheck"
                  checked={isGlobal}
                  onChange={e => setIsGlobal(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-300 text-rose-900 focus:ring-rose-900"
                />
                <label htmlFor="globalCheck" className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <Globe size={16} /> Global Announcement (Main Dashboard)
                </label>
             </div>
          )}

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-2.5 bg-rose-900 text-white rounded-lg font-bold hover:bg-rose-950 transition-colors shadow-lg shadow-rose-900/20"
            >
              {initialData ? 'Update' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};
