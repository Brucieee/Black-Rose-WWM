
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { Party } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sword, X, ArrowRight } from 'lucide-react';

export const PartyNotifier: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<Party | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isFirstLoad = useRef(true);
  const lastPartyCount = useRef(0);

  useEffect(() => {
    if (!currentUser) return;

    // Listen to parties collection
    const unsub = db.collection("parties")
      .where("memberUids", "array-contains", currentUser.uid) // Just to establish a basic query, but we actually want ALL parties in user's guild? 
      // Actually, usually you want to see parties relevant to you. 
      // Let's listen to ALL parties but filter client side or query for user's guild if possible.
      // Since we don't have the user's guild ID readily available in this context without fetching profile,
      // We will listen to all parties created in the last few minutes.
      // A better approach for "Global" party finder is listening to the whole collection ordered by creation.
      .onSnapshot(snap => {
         // On initial load, just set the count so we don't spam notifications for existing parties
         if (isFirstLoad.current) {
             lastPartyCount.current = snap.size;
             isFirstLoad.current = false;
             return;
         }

         // If size increased, a new party might have been added
         if (snap.size > lastPartyCount.current) {
             const changes = snap.docChanges();
             changes.forEach(change => {
                 if (change.type === 'added') {
                     const newParty = { id: change.doc.id, ...change.doc.data() } as Party;
                     
                     // Don't notify if I created it
                     if (newParty.leaderId !== currentUser.uid) {
                         triggerNotification(newParty);
                     }
                 }
             });
         }
         lastPartyCount.current = snap.size;
      });

      // Refine: Actually, relying on docChanges is better. 
      // Let's attach a listener specifically for recent additions.
      const now = new Date();
      // Firestore doesn't support 'created_at' filtering easily if we didn't index it perfectly with other filters.
      // We'll stick to the collection listener logic above but make it more robust.
      
      const q = db.collection("parties"); // Listen to all parties
      const unsubscribe = q.onSnapshot(snapshot => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }

        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const party = { id: change.doc.id, ...change.doc.data() } as Party;
                // Avoid notifying for own party
                if (party.leaderId !== currentUser.uid) {
                    triggerNotification(party);
                }
            }
        });
      });

    return () => unsubscribe();
  }, [currentUser]);

  const triggerNotification = (party: Party) => {
      setNotification(party);
      setIsVisible(true);

      // Auto hide after 5 seconds
      const timer = setTimeout(() => {
          setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
  };

  const handleJoinClick = () => {
      if (notification) {
          setIsVisible(false);
          // Navigate to the guild dashboard of that party
          navigate(`/guild/${notification.guildId}`);
      }
  };

  if (!notification) return null;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-in-out transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0 pointer-events-none'}`}>
        <div className="bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 px-6 py-4 rounded-full shadow-2xl border border-zinc-700 dark:border-zinc-200 flex items-center gap-4 min-w-[320px] max-w-[90vw]">
            
            <div className="relative">
                <img 
                    src={notification.currentMembers[0]?.photoURL || 'https://via.placeholder.com/150'} 
                    className="w-10 h-10 rounded-full object-cover border-2 border-rose-500"
                    alt="Leader"
                />
                <div className="absolute -bottom-1 -right-1 bg-rose-600 text-white text-[10px] font-bold px-1.5 rounded-full border border-zinc-900">
                    LDR
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                    <span className="font-bold text-rose-400 dark:text-rose-600">{notification.leaderName}</span> is looking for group
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs bg-zinc-800 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-600 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                        {notification.activity}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {notification.currentMembers.length}/{notification.maxMembers}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-zinc-700 dark:border-zinc-300">
                <button 
                    onClick={handleJoinClick}
                    className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors shadow-lg hover:scale-105 active:scale-95"
                    title="Go to Party"
                >
                    <ArrowRight size={18} />
                </button>
                <button 
                    onClick={() => setIsVisible(false)}
                    className="p-1 text-zinc-500 hover:text-white dark:hover:text-black transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    </div>
  );
};
