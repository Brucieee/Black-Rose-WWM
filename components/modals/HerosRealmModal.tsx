
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { HerosRealmRequest, UserProfile } from '../../types';
import { db } from '../../services/firebase';
import { Clock, ThumbsUp, Plus, Trash2 } from 'lucide-react';
import firebase from 'firebase/compat/app';

interface HerosRealmModalProps {
  isOpen: boolean;
  onClose: () => void;
  guildId: string;
  currentUser: UserProfile | null;
}

export const HerosRealmModal: React.FC<HerosRealmModalProps> = ({ isOpen, onClose, guildId, currentUser }) => {
  const [requests, setRequests] = useState<HerosRealmRequest[]>([]);
  // Use separate state for time parts
  const [newRequestDay, setNewRequestDay] = useState('Wednesday');
  const [newRequestTime, setNewRequestTime] = useState({ hour: '8', minute: '00', ampm: 'PM' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !guildId) return;
    
    // FIX: Use Firebase v8 compat syntax
    const q = db.collection("heros_realm_requests").where("guildId", "==", guildId);
    const unsubscribe = q.onSnapshot(snap => {
        const data = snap.docs.map(d => ({id: d.id, ...d.data()} as HerosRealmRequest));
        // Sort by vote count descending
        data.sort((a, b) => b.votes.length - a.votes.length);
        setRequests(data);
    });
    return () => unsubscribe();
  }, [isOpen, guildId]);

  const handleVote = async (req: HerosRealmRequest) => {
      if (!currentUser) return;
      const hasVoted = req.votes.includes(currentUser.uid);
      const ref = db.collection("heros_realm_requests").doc(req.id);
      
      if (hasVoted) {
          await ref.update({
              votes: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
          });
      } else {
          await ref.update({
              votes: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
          });
      }
  };

  const handleDelete = async (id: string) => {
      await db.collection("heros_realm_requests").doc(id).delete();
  }

  const convertTo24Hour = (hour: string, minute: string, ampm: string) => {
      let h = parseInt(hour, 10);
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${minute}`;
  };

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      
      setIsSubmitting(true);
      try {
          const time24 = convertTo24Hour(newRequestTime.hour, newRequestTime.minute, newRequestTime.ampm);

          // Check for duplicate day/time in this guild
          const existing = requests.find(r => r.day === newRequestDay && r.time === time24);
          if (existing) {
              // Just vote for it if it exists
               await handleVote(existing);
          } else {
              await db.collection("heros_realm_requests").add({
                  guildId,
                  day: newRequestDay,
                  time: time24,
                  createdByUid: currentUser.uid,
                  createdByName: currentUser.displayName,
                  votes: [currentUser.uid], // Auto-vote for own request
                  timestamp: new Date().toISOString()
              });
          }
          // Reset
          setNewRequestDay('Wednesday');
          setNewRequestTime({ hour: '8', minute: '00', ampm: 'PM' });
      } catch (err) {
          console.error("Error creating request", err);
      } finally {
          setIsSubmitting(false);
      }
  };
  
  const formatTime = (time: string) => {
      const [h, m] = time.split(':');
      let hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour}:${m} ${ampm}`;
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                <Clock size={24} />
            </div>
            <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Hero's Realm Poll</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Vote for your preferred schedule</p>
            </div>
        </div>

        {/* Create Request Form */}
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3">Request New Time</h4>
            <div className="flex flex-wrap gap-2 items-center">
                <select 
                    value={newRequestDay} 
                    onChange={e => setNewRequestDay(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                        <option key={d} value={d} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">{d}</option>
                    ))}
                </select>
                
                {/* Time Selection */}
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-1">
                     <select 
                        value={newRequestTime.hour}
                        onChange={e => setNewRequestTime({...newRequestTime, hour: e.target.value})}
                        className="bg-transparent text-sm p-1 focus:outline-none text-zinc-900 dark:text-white"
                     >
                         {Array.from({length: 12}, (_, i) => i + 1).map(h => (
                             <option key={h} value={h} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">{h}</option>
                         ))}
                     </select>
                     <span className="text-zinc-500 dark:text-zinc-400">:</span>
                     <select 
                        value={newRequestTime.minute}
                        onChange={e => setNewRequestTime({...newRequestTime, minute: e.target.value})}
                        className="bg-transparent text-sm p-1 focus:outline-none text-zinc-900 dark:text-white"
                     >
                         {['00', '15', '30', '45'].map(m => (
                             <option key={m} value={m} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">{m}</option>
                         ))}
                     </select>
                     <select 
                        value={newRequestTime.ampm}
                        onChange={e => setNewRequestTime({...newRequestTime, ampm: e.target.value})}
                        className="bg-transparent text-sm p-1 focus:outline-none text-zinc-900 dark:text-white"
                     >
                         <option value="AM" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">AM</option>
                         <option value="PM" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">PM</option>
                     </select>
                </div>

                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                    <Plus size={18} />
                </button>
            </div>
        </form>

        <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {requests.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-sm">No requests yet. Be the first!</div>
            ) : (
                requests.map((req, idx) => {
                    const hasVoted = req.votes.includes(currentUser?.uid || '');
                    const isOwner = req.createdByUid === currentUser?.uid;
                    const canDelete = currentUser?.systemRole === 'Admin' || (currentUser?.systemRole === 'Officer' && req.guildId === currentUser.guildId) || isOwner;

                    return (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-purple-500/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                    idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                }`}>
                                    #{idx + 1}
                                </div>
                                <div>
                                    <p className="font-bold text-zinc-900 dark:text-zinc-100">
                                        {req.day} <span className="text-purple-600 dark:text-purple-400">@ {formatTime(req.time)}</span>
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        Requested by {req.createdByName}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {canDelete && (
                                    <button onClick={() => handleDelete(req.id)} className="text-zinc-300 hover:text-red-500 transition-colors p-1">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleVote(req)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                        hasVoted 
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                    }`}
                                >
                                    <ThumbsUp size={14} className={hasVoted ? 'fill-current' : ''} />
                                    {req.votes.length}
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>
    </BaseModal>
  );
};
