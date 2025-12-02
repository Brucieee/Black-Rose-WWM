
import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Send, MessageSquarePlus, Bug, AlertTriangle, Lightbulb, X } from 'lucide-react';
import { db } from '../../services/firebase';
import { UserProfile } from '../../types';
import { useAlert } from '../../contexts/AlertContext';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
}

export const SuggestionModal: React.FC<SuggestionModalProps> = ({ isOpen, onClose, userProfile }) => {
  const { showAlert } = useAlert();
  const [type, setType] = useState<'Suggestion' | 'Complaint' | 'Bug' | 'Other'>('Suggestion');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isFlying, setIsFlying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      showAlert("Please enter some content.", 'error');
      return;
    }
    if (!userProfile) return;

    setIsSending(true);
    
    // Trigger Animation
    setIsFlying(true);

    try {
      // Small delay to let animation start visually before async op
      await new Promise(r => setTimeout(r, 100));

      await db.collection("suggestions").add({
        uid: userProfile.uid,
        displayName: userProfile.displayName,
        type,
        content,
        timestamp: new Date().toISOString(),
        status: 'new'
      });

      // Wait for animation to finish (approx 1s)
      setTimeout(() => {
          setIsFlying(false);
          setIsSending(false);
          setContent('');
          setType('Suggestion');
          onClose();
          showAlert("Your feedback has been sent.", 'success');
      }, 900);

    } catch (err: any) {
      console.error(err);
      setIsFlying(false);
      setIsSending(false);
      showAlert("Failed to send suggestion.", 'error');
    }
  };

  // If currently flying, we render a special minimized version that flies
  if (isFlying) {
      return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
              <div className="bg-rose-900 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 animate-fly-up-out">
                  <Send size={24} />
                  <span className="font-bold whitespace-nowrap">Sending...</span>
              </div>
          </div>
      );
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-rose-500 to-purple-600 p-3 rounded-xl text-white shadow-lg shadow-rose-500/20">
            <MessageSquarePlus size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Guild Feedback</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Suggestions, complaints, or bug reports.</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <p className="text-sm text-zinc-600 dark:text-zinc-300 italic">
                "Got any suggestions for the website or events? Complaints about anything? Feel free to speak your mind. We are listening."
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                    { id: 'Suggestion', icon: Lightbulb, color: 'text-yellow-500' },
                    { id: 'Complaint', icon: AlertTriangle, color: 'text-red-500' },
                    { id: 'Bug', icon: Bug, color: 'text-blue-500' },
                    { id: 'Other', icon: MessageSquarePlus, color: 'text-zinc-500' }
                ].map((cat) => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => setType(cat.id as any)}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                            type === cat.id 
                            ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-inner' 
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                    >
                        <cat.icon size={20} className={cat.color} />
                        <span className={`text-[10px] font-bold uppercase ${type === cat.id ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>{cat.id}</span>
                    </button>
                ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Message</label>
            <textarea 
                required
                className="w-full p-4 border rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500 outline-none min-h-[120px] resize-none"
                placeholder="Type your message here..."
                value={content}
                onChange={e => setContent(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium transition-colors"
            >
                Cancel
            </button>
            <button 
                type="submit"
                disabled={isSending}
                className="px-6 py-2 bg-rose-900 hover:bg-rose-950 text-white rounded-lg font-bold shadow-lg shadow-rose-900/20 transition-all transform active:scale-95 disabled:opacity-70 disabled:transform-none flex items-center gap-2"
            >
                {isSending ? 'Sending...' : <><Send size={16} /> Send Feedback</>}
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};
