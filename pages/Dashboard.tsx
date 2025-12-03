import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Sword, Users, Trophy, Activity, Clock, Globe, Filter, Sparkles, Megaphone, ChevronLeft, ChevronRight, User } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
import { UserProfile, QueueEntry, Guild, GuildEvent, LeaderboardEntry, BreakingArmyConfig, Announcement, HerosRealmConfig, ScheduleSlot } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { useAlert } from '../contexts/AlertContext';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { QueueModal } from '../components/modals/QueueModal';
import { RichText } from '../components/RichText';
import { CreateAnnouncementModal } from '../components/modals/CreateAnnouncementModal';
import { ViewAnnouncementModal } from '../components/modals/ViewAnnouncementModal';
import { logAction } from '../services/auditLogger';

const { Link, useNavigate } = ReactRouterDOM as any;

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [globalAnnouncements, setGlobalAnnouncements] = useState<Announcement[]>([]);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  const [breakingArmyConfig, setBreakingArmyConfig] = useState<BreakingArmyConfig | null>(null);
  const [herosRealmConfig, setHerosRealmConfig] = useState<HerosRealmConfig | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [selectedLeaderboardUser, setSelectedLeaderboardUser] = useState<UserProfile | null>(null);

  // Leaderboard Filters
  const [leaderboardFilterBoss, setLeaderboardFilterBoss] = useState<string>('All');
  const [leaderboardFilterGuild, setLeaderboardFilterGuild] = useState<string>('All');

  useEffect(() => {
    // Fetch Guilds
    const unsubGuilds = db.collection("guilds").onSnapshot(snap => {
      setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild)));
    });

    // Fetch Events
    const unsubEvents = db.collection("events")
      .orderBy("date", "asc")
      .onSnapshot(snap => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); 

        const futureEvents = snap.docs
            .map(d => ({id: d.id, ...d.data()} as GuildEvent))
            .filter(e => new Date(e.date) >= now);
        setEvents(futureEvents);
      });
      
    // Fetch Leaderboard
    const unsubLeaderboard = db.collection("leaderboard")
      .orderBy("time", "asc")
      .limit(50) 
      .onSnapshot(snap => {
        setLeaderboard(snap.docs.map(d => ({id: d.id, ...d.data()} as LeaderboardEntry)));
      });

    // Fetch Configs
    const unsubConfig = db.collection("system").doc("breakingArmy").onSnapshot(doc => {
        if (doc.exists) setBreakingArmyConfig(doc.data() as BreakingArmyConfig);
    });
    
    const unsubHeroConfig = db.collection("system").doc("herosRealm").onSnapshot(doc => {
        if (doc.exists) setHerosRealmConfig(doc.data() as HerosRealmConfig);
    });

    // Fetch Queue
    const unsubQueue = db.collection("queue").orderBy("joinedAt", "asc").onSnapshot(snap => {
        const qData = snap.docs.map(d => {
            const data = d.data();
            const joinedAt = data.joinedAt?.toDate ? data.joinedAt.toDate() : new Date(data.joinedAt);
            return { ...data, joinedAt } as QueueEntry;
        });
        setQueue(qData);
    });
    
    // Fetch Users
    const unsubUsers = db.collection("users").onSnapshot(snap => {
        setUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    // Fetch Global Announcements
    const unsubAnnouncements = db.collection("announcements")
      .where("isGlobal", "==", true)
      .limit(20) 
      .onSnapshot(snap => {
         const data = snap.docs.map(d => ({id: d.id, ...d.data()} as Announcement));
         // Sort in memory (Newest first)
         data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
         setGlobalAnnouncements(data);
      });

    return () => {
        unsubGuilds(); unsubEvents(); unsubLeaderboard(); unsubConfig(); unsubQueue(); unsubUsers(); unsubAnnouncements(); unsubHeroConfig();
    };
  }, []);

  // Carousel Auto-Slide
  useEffect(() => {
    if (globalAnnouncements.length <= 1) return;
    const interval = setInterval(() => {
        setCurrentAnnouncementIndex(prev => (prev + 1) % globalAnnouncements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [globalAnnouncements.length]);

  useEffect(() => {
    if (currentUser && users.length > 0) {
        const profile = users.find(u => u.uid === currentUser.uid);
        setCurrentUserProfile(profile || null);
    } else {
        setCurrentUserProfile(null);
    }
  }, [currentUser, users]);

  // Automatic Daily Queue Reset (Midnight)
  useEffect(() => {
      if (queue.length === 0) return;

      const performDailyReset = async () => {
          const now = new Date();
          // Reset time: Midnight (00:00) today
          // Any entry before this time belongs to a previous day
          const todayMidnight = new Date(now);
          todayMidnight.setHours(0, 0, 0, 0);

          const batch = db.batch();
          let deleteCount = 0;

          queue.forEach(q => {
              const joinDate = new Date(q.joinedAt);
              if (joinDate < todayMidnight) {
                  const ref = db.collection("queue").doc(q.uid);
                  batch.delete(ref);
                  deleteCount++;
              }
          });

          if (deleteCount > 0) {
              try {
                  await batch.commit();
                  console.log(`Daily reset: Cleared ${deleteCount} expired queue entries.`);
              } catch (err) {
                  console.error("Failed to reset queue:", err);
              }
          }
      };

      performDailyReset();
  }, [queue]);

  // Derived state for Breaking Army
  const userGuildId = currentUserProfile?.guildId;
  const currentBossName = userGuildId && breakingArmyConfig?.currentBoss ? breakingArmyConfig.currentBoss[userGuildId] : null;
  const currentBoss = currentBossName ? breakingArmyConfig?.bossPool.find(b => b.name === currentBossName) : null;
  const guildQueue = queue.filter(q => q.guildId === userGuildId);
  
  // Smart Schedule Calculation
  const getNextSchedule = (): { displayDay: string; time: string } | null => {
      if (!userGuildId || !breakingArmyConfig?.schedules?.[userGuildId]) return null;
      const schedules = breakingArmyConfig.schedules[userGuildId];
      if (schedules.length === 0) return null;

      const now = new Date();
      const currentDayIndex = now.getDay(); // 0 = Sun, 1 = Mon...
      const currentTimeVal = now.getHours() * 60 + now.getMinutes();

      const dayMap: Record<string, number> = {
          'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };

      // Calculate time difference for each schedule
      const upcoming = schedules.map(s => {
          const sDayIndex = dayMap[s.day];
          let dayDiff = sDayIndex - currentDayIndex;
          const [h, m] = s.time.split(':').map(Number);
          const sTimeVal = h * 60 + m;

          // If day passed, add 7 days. If same day but time passed, add 7 days.
          if (dayDiff < 0) dayDiff += 7;
          if (dayDiff === 0 && sTimeVal < currentTimeVal) dayDiff += 7;

          // Normalize to total minutes for sorting
          const minutesUntil = (dayDiff * 24 * 60) + (sTimeVal - currentTimeVal);
          
          return { ...s, minutesUntil, dayDiff };
      });

      // Sort by closest time
      upcoming.sort((a, b) => a.minutesUntil - b.minutesUntil);
      const next = upcoming[0];

      let displayDay = next.day;
      if (next.dayDiff === 0) displayDay = "Today";
      else if (next.dayDiff === 1) displayDay = `Tomorrow, ${next.day}`;
      // else displayDay remains e.g. "Wednesday"

      return { displayDay, time: next.time };
  };

  const nextSchedule = getNextSchedule();

  // Hero's Realm Schedule & Configured Bosses
  const heroSchedule = userGuildId && herosRealmConfig?.schedules?.[userGuildId]?.[0];
  const configuredBossNames = userGuildId && herosRealmConfig?.currentBosses?.[userGuildId];
  
  const heroBoss1Name = configuredBossNames?.[0] || breakingArmyConfig?.bossPool?.[0]?.name;
  const heroBoss2Name = configuredBossNames?.[1] || breakingArmyConfig?.bossPool?.[1]?.name;
  
  const heroBoss1 = breakingArmyConfig?.bossPool?.find(b => b.name === heroBoss1Name);
  const heroBoss2 = breakingArmyConfig?.bossPool?.find(b => b.name === heroBoss2Name);


  const isCooldown = currentUserProfile ? (breakingArmyConfig?.recentWinners?.some(w => w.uid === currentUserProfile.uid && w.branchId === userGuildId) || false) : false;

  const isAdmin = currentUserProfile?.systemRole === 'Admin';
  
  const myQueueIndex = currentUserProfile ? guildQueue.findIndex(q => q.uid === currentUserProfile.uid) : -1;
  const myQueuePosition = myQueueIndex !== -1 ? myQueueIndex + 1 : null;

  const handleJoinQueue = async () => {
    if (!currentUserProfile) {
        showAlert("Please create a profile first.", 'error');
        navigate('/register');
        return;
    }
    if (!userGuildId) {
        showAlert("You must be part of a guild branch.", 'error');
        return;
    }
    if (isCooldown) {
        showAlert("You are on cooldown from a recent win.", 'error');
        return;
    }
    
    if (queue.some(q => q.uid === currentUserProfile.uid)) {
        showAlert("You are already in the queue.", 'error');
        return;
    }

    try {
        await db.collection("queue").doc(currentUserProfile.uid).set({
            uid: currentUserProfile.uid,
            name: currentUserProfile.displayName,
            role: currentUserProfile.role,
            guildId: userGuildId,
            joinedAt: new Date()
        });
        await logAction('Join Queue', `Joined Breaking Army queue for ${currentBossName}`, currentUserProfile, 'Queue');
        showAlert("Joined queue successfully!", 'success');
    } catch (err: any) {
        showAlert(err.message, 'error');
    }
  };

  const handleLeaveQueue = async () => {
      if (!currentUserProfile) return;
      await db.collection("queue").doc(currentUserProfile.uid).delete();
      await logAction('Leave Queue', `Left Breaking Army queue`, currentUserProfile, 'Queue');
      showAlert("Left the queue.", 'info');
  };

  const handleProfileClick = (uid: string) => {
      const user = users.find(u => u.uid === uid);
      if (user) setSelectedLeaderboardUser(user);
  };

  // Updated handler for new modal signature
  const handlePostGlobalAnnouncement = async (data: { title: string; content: string; isGlobal: boolean; imageUrl: string }) => {
      if (!currentUserProfile) return;
      try {
        const newAnnouncement = {
          title: data.title,
          content: data.content,
          authorId: currentUserProfile.uid,
          authorName: currentUserProfile.displayName,
          guildId: 'global',
          timestamp: new Date().toISOString(),
          isGlobal: true,
          imageUrl: data.imageUrl
        };
        await db.collection("announcements").add(newAnnouncement);
        await logAction('Post Global Announcement', `Posted global announcement: ${data.title}`, currentUserProfile, 'Announcement');
        showAlert("Global announcement posted!", 'success');
      } catch (err: any) {
        showAlert(`Error posting: ${err.message}`, 'error');
      }
  };

  const filteredLeaderboard = leaderboard.filter(entry => {
      const matchBoss = leaderboardFilterBoss === 'All' || entry.boss === leaderboardFilterBoss;
      const matchGuild = leaderboardFilterGuild === 'All' || entry.branch === leaderboardFilterGuild;
      return matchBoss && matchGuild;
  }).slice(0, 5); 

  const uniqueBosses = Array.from(new Set(leaderboard.map(l => l.boss))).sort();
  const uniqueGuilds = Array.from(new Set(leaderboard.map(l => l.branch))).sort();

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Welcome back, {currentUserProfile?.displayName || 'Traveler'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Current Status: <span className="text-rose-900 dark:text-rose-500 font-bold">{currentUserProfile?.guildId ? guilds.find(g => g.id === currentUserProfile.guildId)?.name : 'No Guild'}</span>
          </p>
        </div>
        <div className="flex gap-3">
             <Link to="/events" className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                <Calendar size={18} /> Calendar
             </Link>
             <Link to={`/guild/${currentUserProfile?.guildId}`} className={`flex items-center gap-2 bg-rose-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-950 transition-colors ${!currentUserProfile?.guildId ? 'opacity-50 pointer-events-none' : ''}`}>
                <Activity size={18} /> Guild Dashboard
             </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Breaking Army Card */}
                <div className="relative rounded-xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-rose-950 to-black flex md:col-span-2 lg:col-span-1">
                    <div className="w-40 relative overflow-hidden flex-shrink-0">
                        {currentBoss?.imageUrl ? (
                            <img 
                                src={currentBoss.imageUrl} 
                                alt={currentBoss.name} 
                                className="w-full h-full object-cover"
                                style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)' }}
                            />
                        ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700">
                                <Sword size={32} />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-center text-white relative z-10 min-w-0">
                        <div className="mb-3">
                            <div className="text-rose-500 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                                <Activity size={14} className="animate-pulse" /> Breaking Army
                            </div>
                            <h2 className="text-xl font-extrabold leading-tight mb-1 truncate">
                                {currentBoss?.name || "No Active Boss"}
                            </h2>
                            {nextSchedule && (
                                <div className="mt-2 flex flex-col">
                                    <span className="text-[10px] text-rose-300 uppercase font-bold tracking-widest mb-0.5">Next Run</span>
                                    <span className="text-xl font-black text-white leading-none shadow-black drop-shadow-sm">
                                        {nextSchedule.displayDay}
                                    </span>
                                    <span className="text-sm font-bold text-white/90 bg-black/20 backdrop-blur-sm self-start px-2 py-0.5 rounded mt-1 border border-white/10">
                                        @ {formatTime12Hour(nextSchedule.time)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setIsQueueModalOpen(true)}
                                className="bg-white text-rose-950 hover:bg-zinc-200 px-4 py-2 rounded font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                disabled={!currentBossName}
                            >
                                {myQueuePosition ? 'View Queue' : 'Join Queue'}
                            </button>
                            {myQueuePosition && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900/50 border border-zinc-800">
                                    <span className="text-xs font-medium text-zinc-300">Position:</span>
                                    <span className="text-sm font-bold text-green-400">#{myQueuePosition}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Hero's Realm Widget */}
                <div className="relative rounded-xl overflow-hidden shadow-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 md:col-span-2 lg:col-span-1 min-h-[160px]">
                    <div className="absolute inset-0 flex">
                        <div className="w-1/2 relative h-full">
                            {heroBoss1?.imageUrl ? (
                                <img src={heroBoss1.imageUrl} className="w-full h-full object-cover opacity-30" style={{ maskImage: 'linear-gradient(to right, black, transparent)' }} alt="Left Boss" />
                            ) : (
                                <div className="w-full h-full bg-purple-900/10 dark:bg-purple-900/20"></div>
                            )}
                        </div>
                        <div className="w-1/2 relative h-full">
                            {heroBoss2?.imageUrl ? (
                                <img src={heroBoss2.imageUrl} className="w-full h-full object-cover opacity-30" style={{ maskImage: 'linear-gradient(to left, black, transparent)' }} alt="Right Boss" />
                            ) : (
                                <div className="w-full h-full bg-purple-900/10 dark:bg-purple-900/20"></div>
                            )}
                        </div>
                    </div>

                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                                <Clock size={16} />
                            </div>
                            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 tracking-wide">HERO'S REALM</h3>
                        </div>

                         {heroSchedule ? (
                            <div>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider mb-1">Next Session</p>
                                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 leading-none mb-1">{heroSchedule.day}</p>
                                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 bg-white/50 dark:bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                                    @ {formatTime12Hour(heroSchedule.time)}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-2">
                                <p className="text-zinc-400 text-sm italic">No active schedule.</p>
                                <Link to={`/guild/${userGuildId}`} className="text-xs text-purple-600 hover:underline block mt-2 font-medium">Vote Now</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Global Announcements - Carousel */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[280px]">
                <div className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Globe className="text-blue-500" /> Global Announcements
                    </h3>
                </div>

                <div className="relative flex-1 overflow-hidden group">
                    {globalAnnouncements.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-zinc-500">
                            No global announcements.
                        </div>
                    ) : (
                        <div 
                            className="flex h-full transition-transform duration-700 ease-in-out"
                            style={{ transform: `translateX(-${currentAnnouncementIndex * 100}%)` }}
                        >
                            {globalAnnouncements.map((ann) => (
                                <div 
                                    key={ann.id} 
                                    className="min-w-full h-full relative flex flex-col cursor-pointer overflow-hidden"
                                    onClick={() => setViewingAnnouncement(ann)}
                                >
                                    {ann.imageUrl && (
                                        <>
                                            <img src={ann.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="" />
                                            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-900/20"></div>
                                        </>
                                    )}
                                    <div className="relative z-10 p-8 flex-1 flex flex-col">
                                        <div className="flex-1">
                                            <h4 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-2 leading-tight drop-shadow-sm">
                                                {ann.title}
                                            </h4>
                                            <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                                <span className="flex items-center gap-1"><User size={14} /> {ann.authorName}</span>
                                                <span>•</span>
                                                <span>{new Date(ann.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-zinc-600 dark:text-zinc-300 line-clamp-3 leading-relaxed max-w-2xl">
                                                {ann.content}
                                            </p>
                                        </div>
                                        <div className="mt-4 flex justify-between items-center">
                                             <div className="flex gap-1">
                                                {globalAnnouncements.map((_, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                                            idx === currentAnnouncementIndex 
                                                            ? 'w-6 bg-blue-600' 
                                                            : 'w-1.5 bg-zinc-300 dark:bg-zinc-700'
                                                        }`}
                                                    />
                                                ))}
                                             </div>
                                             <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline">
                                                Read More <ArrowRight size={12} />
                                             </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {globalAnnouncements.length > 1 && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setCurrentAnnouncementIndex(prev => (prev - 1 + globalAnnouncements.length) % globalAnnouncements.length); }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/80 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity text-zinc-800 dark:text-zinc-200 z-20"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setCurrentAnnouncementIndex(prev => (prev + 1) % globalAnnouncements.length); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/80 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity text-zinc-800 dark:text-zinc-200 z-20"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Recent Events */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Calendar className="text-rose-900 dark:text-rose-500" /> Upcoming Events
                    </h3>
                    <Link to="/events" className="text-xs font-bold text-rose-900 dark:text-rose-500 hover:underline">
                        View Calendar
                    </Link>
                </div>
                
                {/* Scrollable Container for Events */}
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-3 pr-1">
                    {events.length === 0 ? (
                        <p className="text-zinc-500 text-center py-4">No upcoming events.</p>
                    ) : (
                        events.map(event => (
                            <div key={event.id} className="flex gap-4 items-center p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
                                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                    {event.imageUrl ? (
                                        <img src={event.imageUrl} alt="Event" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-1">
                                            <span className="block text-[9px] font-bold text-rose-900 dark:text-rose-500 uppercase leading-none mb-0.5">{new Date(event.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                            <span className="block text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-none">{new Date(event.date).getDate()}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-rose-900 dark:group-hover:text-rose-400 transition-colors truncate">{event.title}</h4>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{event.description}</p>
                                    <div className="flex gap-2 mt-1.5">
                                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded font-medium">{event.type}</span>
                                        <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Clock size={10} /> {new Date(event.date).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
            {/* Leaderboard Preview */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                 <div className="mb-4">
                     <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                        <Trophy className="text-yellow-500" /> Top Speedruns
                    </h3>
                    
                    {/* Filters */}
                    <div className="flex flex-col gap-2">
                        <select 
                            value={leaderboardFilterBoss} 
                            onChange={(e) => setLeaderboardFilterBoss(e.target.value)}
                            className="w-full text-xs p-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                            <option value="All">All Bosses</option>
                            {uniqueBosses.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <select 
                            value={leaderboardFilterGuild} 
                            onChange={(e) => setLeaderboardFilterGuild(e.target.value)}
                            className="w-full text-xs p-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                            <option value="All">All Branches</option>
                            {uniqueGuilds.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                 </div>

                <div className="space-y-1">
                    {filteredLeaderboard.map((entry, idx) => (
                        <div key={entry.id} className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer" onClick={() => handleProfileClick(entry.playerUid)}>
                            <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full ${
                                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                    idx === 1 ? 'bg-zinc-200 text-zinc-700' :
                                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                                    'text-zinc-400'
                                }`}>{idx + 1}</span>
                                <div>
                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{entry.playerName}</p>
                                    <p className="text-xs text-zinc-500">{entry.boss} <span className="text-zinc-300 mx-1">•</span> {entry.branch}</p>
                                </div>
                            </div>
                            <span className="font-mono text-sm font-bold text-rose-900 dark:text-rose-500">{entry.time}</span>
                        </div>
                    ))}
                    {filteredLeaderboard.length === 0 && <p className="text-zinc-500 text-sm py-2">No records found matching filters.</p>}
                </div>
            </div>

            {/* Guild Status */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <Users className="text-blue-500" /> Guild Branches
                </h3>
                <div className="space-y-3">
                    {guilds.map(guild => {
                        const count = users.filter(u => u.guildId === guild.id).length;
                        return (
                            <Link key={guild.id} to={`/guild/${guild.id}`} className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{guild.name}</span>
                                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full text-zinc-500">{count} / {guild.memberCap}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>

      <QueueModal 
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        guildName={userGuildId && guilds.find(g => g.id === userGuildId)?.name || 'Unknown'}
        bossName={currentBoss?.name || 'Unknown'}
        bossImageUrl={currentBoss?.imageUrl}
        queue={guildQueue}
        currentUserUid={currentUser?.uid}
        isCooldown={isCooldown}
        onJoin={handleJoinQueue}
        onLeave={handleLeaveQueue}
      />

      <CreateAnnouncementModal 
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        onSubmit={handlePostGlobalAnnouncement}
        userProfile={currentUserProfile}
        forceGlobal={true}
      />

      <ViewAnnouncementModal 
        isOpen={!!viewingAnnouncement}
        onClose={() => setViewingAnnouncement(null)}
        announcement={viewingAnnouncement}
      />

      <UserProfileModal 
        user={selectedLeaderboardUser}
        onClose={() => setSelectedLeaderboardUser(null)}
        guilds={guilds}
      />
    </div>
  );
};

const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; h = h ? h : 12; 
    return `${h}:${minutes} ${ampm}`;
};

export default Dashboard;