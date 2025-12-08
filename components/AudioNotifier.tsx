
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ScheduledNotification, UserProfile } from '../types';
import { Bell, X } from 'lucide-react';

interface AudioNotifierProps {
  isMuted: boolean;
}

export const AudioNotifier: React.FC<AudioNotifierProps> = ({ isMuted }) => {
  const { currentUser } = useAuth();
  const { users } = useData();
  const [schedules, setSchedules] = useState<ScheduledNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<ScheduledNotification | null>(null);
  
  // Refs for tracking state inside interval
  const lastPlayedMap = useRef<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Get full user profile to check guildId
  const userProfile = React.useMemo(() => {
      return users.find(u => u.uid === currentUser?.uid) || null;
  }, [users, currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // Listen to schedules
    const unsub = db.collection("scheduled_notifications").onSnapshot(snap => {
        setSchedules(snap.docs.map(d => ({id: d.id, ...d.data()} as ScheduledNotification)));
    });

    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!userProfile?.guildId) return;

    const checkTime = () => {
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTimeString = `${currentHour}:${currentMinute}`;
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        const nowTs = Date.now();

        schedules.forEach(schedule => {
            // 1. Check if schedule is for user's guild
            if (schedule.guildId !== userProfile.guildId) return;

            // 2. Check Day: If 'days' is defined and not empty, current day must be in it.
            if (schedule.days && schedule.days.length > 0 && !schedule.days.includes(currentDay)) {
                return;
            }

            // 3. Check if time matches
            if (schedule.time === currentTimeString) {
                // 4. Check debounce (don't play twice within 50 seconds for the same schedule ID)
                const lastPlayed = lastPlayedMap.current[schedule.id] || 0;
                if (nowTs - lastPlayed > 50000) {
                    triggerNotification(schedule);
                    lastPlayedMap.current[schedule.id] = nowTs;
                }
            }
        });
    };

    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [schedules, userProfile, isMuted]);

  const triggerNotification = (schedule: ScheduledNotification) => {
      // Set visual
      setActiveNotification(schedule);

      // Play audio if not muted globally
      if (!isMuted && schedule.audioUrl) {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
          }
          audioRef.current = new Audio(schedule.audioUrl);
          audioRef.current.volume = 0.6;
          audioRef.current.play().catch(e => console.warn("Autoplay prevented:", e));
      }

      // Auto hide visual after 10s
      setTimeout(() => {
          setActiveNotification(prev => prev?.id === schedule.id ? null : prev);
      }, 10000);
  };

  if (!activeNotification) return null;

  return (
    <div className="fixed top-24 right-4 z-[100] animate-in slide-in-from-right duration-500">
        <div className="bg-zinc-900/95 backdrop-blur-md text-white border border-rose-500/50 shadow-2xl shadow-rose-900/20 rounded-xl p-4 flex items-center gap-4 max-w-sm">
            <div className="bg-rose-600 p-3 rounded-full animate-pulse">
                <Bell size={24} fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg leading-tight text-rose-100">Notification</h4>
                <p className="text-zinc-300 font-medium truncate">{activeNotification.label}</p>
                <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-wider">
                    {activeNotification.audioName}
                </p>
            </div>
            <button 
                onClick={() => {
                    setActiveNotification(null);
                    if(audioRef.current) audioRef.current.pause();
                }}
                className="text-zinc-400 hover:text-white p-1"
            >
                <X size={18} />
            </button>
        </div>
    </div>
  );
};
