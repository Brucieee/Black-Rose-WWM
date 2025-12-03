
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { Party } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';

interface PartyNotifierProps {
  isMuted: boolean;
}

export const PartyNotifier: React.FC<PartyNotifierProps> = ({ isMuted }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<Party | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isFirstLoad = useRef(true);
  
  // Refs for managing state without re-renders inside listeners
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSoundTime = useRef<number>(0);
  
  // Create a ref for isMuted so the listener always sees the latest value
  const isMutedRef = useRef(isMuted);

  // Sync ref with prop
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
      audioRef.current = new Audio('https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/sfx/Party_Notifier.mp3');
      audioRef.current.volume = 0.5; 
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const q = db.collection("parties"); 
    const unsubscribe = q.onSnapshot(snapshot => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }

        snapshot.docChanges().forEach(change => {
            const party = { id: change.doc.id, ...change.doc.data() } as Party;
            
            // Avoid notifying for own party
            if (party.leaderId === currentUser.uid) return;

            let shouldNotify = false;

            if (change.type === 'added') {
                shouldNotify = true;
            } 
            else if (change.type === 'modified') {
                // If modified, check if it was a Broadcast (lastNotificationTime changed recently)
                const now = Date.now();
                if (party.lastNotificationTime && (now - party.lastNotificationTime < 5000)) {
                    shouldNotify = true;
                }
            }

            if (shouldNotify) {
                triggerNotification(party);
            }
        });
    });

    return () => {
        unsubscribe();
        if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentUser]);

  const triggerNotification = (party: Party) => {
      setNotification(party);
      setIsVisible(true);

      const now = Date.now();
      // Sound Logic: Check isMutedRef.current for the fresh value
      // Debounce: Ensure we don't spam if multiple events happen instantly
      if (!isMutedRef.current && audioRef.current && (now - lastSoundTime.current > 1000)) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.warn("Audio play blocked by browser:", e));
          lastSoundTime.current = now;
      }

      // Clear existing timer to prevent hiding the NEW notification too early
      if (timerRef.current) {
          clearTimeout(timerRef.current);
      }

      // Auto hide after 10 seconds
      timerRef.current = setTimeout(() => {
          setIsVisible(false);
      }, 10000);
  };

  const handleJoinClick = () => {
      if (notification) {
          setIsVisible(false);
          if (timerRef.current) clearTimeout(timerRef.current);
          navigate(`/guild/${notification.guildId}`);
      }
  };

  const handleClose = () => {
      setIsVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
  };

  if (!notification) return null;

  const otherMembers = notification.currentMembers
    .filter(m => m.uid !== notification.leaderId)
    .map(m => m.name);

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-in-out transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0 pointer-events-none'}`}>
        <div className="bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 px-6 py-4 rounded-full shadow-2xl border border-zinc-700 dark:border-zinc-200 flex items-center gap-4 min-w-[320px] max-w-[90vw]">
            
            <div className="relative">
                <img 
                    src={notification.currentMembers[0]?.photoURL || 'https://via.placeholder.com/150'} 
                    className="w-10 h-10 rounded-full object-cover border-2 border-rose-500"
                    alt="Leader"
                />
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
                {otherMembers.length > 0 && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1 truncate max-w-[200px]">
                        with {otherMembers.join(", ")}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-zinc-700 dark:border-zinc-300">
                <button 
                    onClick={handleJoinClick}
                    className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors shadow-lg hover:scale-105 active:scale-95"
                    title="Go to Party Guild Branch"
                >
                    <ArrowRight size={18} />
                </button>
                <button 
                    onClick={handleClose}
                    className="p-1 text-zinc-500 hover:text-white dark:hover:text-black transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    </div>
  );
};
