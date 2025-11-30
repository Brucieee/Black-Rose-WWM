
import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Timer, Trophy, AlertCircle } from 'lucide-react';
import { ImageUpload } from '../ImageUpload';
import { Boss, Guild, UserProfile } from '../../types';

interface SubmitSpeedrunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  bosses: Boss[];
  guilds: Guild[];
  userProfile: UserProfile | null;
}

export const SubmitSpeedrunModal: React.FC<SubmitSpeedrunModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  bosses,
  guilds,
  userProfile 
}) => {
  const [formData, setFormData] = useState({
    boss: '',
    time: '',
    proofUrl: ''
  });

  const handleTimeChange = (val: string) => {
    let clean = val.replace(/\D/g, '').substring(0, 4);
    let formatted = clean;
    if (clean.length >= 2) {
      formatted = `${clean.substring(0, 2)}:${clean.substring(2)}`;
    }
    setFormData({...formData, time: formatted});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.proofUrl) {
        alert("Please upload proof (screenshot/video thumbnail).");
        return;
    }
    onSubmit({
        ...formData,
        playerUid: userProfile?.uid,
        playerName: userProfile?.displayName,
        guildId: userProfile?.guildId,
        branch: guilds.find(g => g.id === userProfile?.guildId)?.name || 'Unknown',
        date: new Date().toISOString(),
        status: 'pending' // pending verification
    });
    setFormData({ boss: '', time: '', proofUrl: '' });
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg text-yellow-600 dark:text-yellow-500">
            <Trophy size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Submit Record</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Upload proof of your speedrun</p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-3 rounded-lg flex gap-3 mb-6">
            <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={18} />
            <p className="text-xs text-blue-700 dark:text-blue-300">
                Submissions will be verified by an officer before appearing on the leaderboard.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Boss</label>
            <select 
              required
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500 outline-none"
              value={formData.boss}
              onChange={e => setFormData({...formData, boss: e.target.value})}
            >
                <option value="">Select Boss</option>
                {bosses.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          <div>
             <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Clear Time (MM:SS)</label>
             <div className="relative">
                <input 
                  type="text" 
                  required
                  placeholder="00:00"
                  maxLength={5}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500 outline-none"
                  value={formData.time}
                  onChange={e => handleTimeChange(e.target.value)}
                />
                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
             </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Proof (Screenshot)</label>
             <ImageUpload 
                onUploadComplete={(url) => setFormData({...formData, proofUrl: url})}
                folder="speedruns"
             />
          </div>

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
              Submit Record
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};
