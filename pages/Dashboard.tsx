
import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Sword, Users, Trophy, Activity, Clock, Globe, Filter, Sparkles } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
import { UserProfile, QueueEntry, Guild, GuildEvent, LeaderboardEntry, BreakingArmyConfig, Announcement } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { useAlert } from '../contexts/AlertContext';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { QueueModal } from '../components/modals/QueueModal';
import { RichText } from '../components/RichText';
import { CreateAnnouncementModal } from '../components/modals/CreateAnnouncementModal';

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
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  const [breakingArmyConfig, setBreakingArmyConfig] = useState<BreakingArmyConfig | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [selectedLeaderboardUser, setSelectedLeaderboardUser] = useState<UserProfile | null>(null);

  // Leaderboard Filters
  const [leaderboardFilterBoss, setLeaderboardFilterBoss] = useState<string>('All');
  const [leaderboardFilterGuild, setLeaderboardFilterGuild] = useState<string>('All');

  useEffect(() => {
    // Fetch Guilds
    // FIX: Use Firebase v8 compat syntax
    const unsubGuilds = db.collection("guilds").onSnapshot(snap => {
      setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild)));
    });

    // Fetch Events
    const unsubEvents = db.collection("events")
      .orderBy("date", "asc")
      .onSnapshot(snap => {
        // Filter client side for future events
        const now = new Date();
        const futureEvents = snap.docs
            .map(d => ({id: d.id, ...d.data()} as GuildEvent))
            .filter(e => new Date(e.date) >= now)
            .slice(0, 3);
        setEvents(futureEvents);
      });
      
    // Fetch Leaderboard
    const unsubLeaderboard = db.collection("leaderboard")
      .orderBy("time", "asc")
      .limit(50) // Increased limit to allow filtering on client side properly
      .onSnapshot(snap => {
        setLeaderboard(snap.docs.map(d => ({id: d.id, ...d.data()} as LeaderboardEntry)));
      });

    // Fetch Config
    const unsubConfig = db.collection("system").doc("breakingArmy").onSnapshot(doc => {
        if (doc.exists) setBreakingArmyConfig(doc.data() as BreakingArmyConfig);
    });

    // Fetch Queue
    const unsubQueue = db.collection("queue").orderBy("joinedAt", "asc").onSnapshot(snap => {
        // Cast data to QueueEntry, handling Date conversion if needed
        const qData = snap.docs.map(d => {
            const data = d.data();
            // Ensure joinedAt is a Date object if it's a Timestamp
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
      .orderBy("timestamp", "desc")
      .limit(5)
      .onSnapshot(snap => {
         setGlobalAnnouncements(snap.docs.map(d => ({id: d.id, ...d.data()} as Announcement)));
      });

    return () => {
        unsubGuilds(); unsubEvents(); unsubLeaderboard(); unsubConfig(); unsubQueue(); unsubUsers(); unsubAnnouncements();
    };
  }, []);

  useEffect(() => {
    if (currentUser && users.length > 0) {
        const profile = users.find(u => u.uid === currentUser.uid);
        setCurrentUserProfile(profile || null);
    }
  }, [currentUser, users]);

  // Derived state for Breaking Army
  const userGuildId = currentUserProfile?.guildId;
  const currentBossName = userGuildId && breakingArmyConfig?.currentBoss ? breakingArmyConfig.currentBoss[userGuildId] : null;
  const currentBoss = currentBossName ? breakingArmyConfig?.bossPool.find(b => b.name === currentBossName) : null;
  const guildQueue = queue.filter(q => q.guildId === userGuildId);
  
  // STRICT COOLDOWN: If user is in recentWinners, they are blocked. Prize status doesn't matter for re-queueing.
  // They must be manually removed or reset by admin to join again.
  const isCooldown = currentUserProfile ? (breakingArmyConfig?.recentWinners?.some(w => w.uid === currentUserProfile.uid && w.branchId === userGuildId) || false) : false;

  const isAdmin = currentUserProfile?.systemRole === 'Admin';
  
  // Calculate Queue Position
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
    
    // Check if already in queue
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
        showAlert("Joined queue successfully!", 'success');
    } catch (err: any) {
        showAlert(err.message, 'error');
    }
  };

  const handleLeaveQueue = async () => {
      if (!currentUserProfile) return;
      await db.collection("queue").doc(currentUserProfile.uid).delete();
      showAlert("Left the queue.", 'info');
  };

  const handleProfileClick = (uid: string) => {
      const user = users.find(u => u.uid === uid);
      if (user) setSelectedLeaderboardUser(user);
  };

  const handleMentionClick = (name: string) => {
      // Find user by display name
      const targetUser = users.find(u => u.displayName.toLowerCase() === name.toLowerCase());
      if (targetUser) {
          setSelectedLeaderboardUser(targetUser);
      }
  };

  const handlePostGlobalAnnouncement = async (title: string, content: string, isGlobal: boolean) => {
      if (!currentUserProfile) return;
      try {
        const newAnnouncement = {
          title,
          content,
          authorId: currentUserProfile.uid,
          authorName: currentUserProfile.displayName,
          guildId: 'global',
          timestamp: new Date().toISOString(),
          isGlobal: true
        };
        await db.collection("announcements").add(newAnnouncement);
        showAlert("Global announcement posted!", 'success');
      } catch (err: any) {
        showAlert(`Error posting: ${err.message}`, 'error');
      }
  };

  // Filter Leaderboard Logic
  const uniqueBosses = Array.from(new Set(leaderboard.map(l => l.boss))).sort();
  const uniqueGuilds = Array.from(new Set(leaderboard.map(l => l.branch))).sort();

  const filteredLeaderboard = leaderboard.filter(entry => {
      const matchBoss = leaderboardFilterBoss === 'All' || entry.boss === leaderboardFilterBoss;
      const matchGuild = leaderboardFilterGuild === 'All' || entry.branch === leaderboardFilterGuild;
      return matchBoss && matchGuild;
  }).slice(0, 5); // Limit to top 5 after filter

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
            
            {/* Breaking Army Card - Compact Design */}
            <div className="relative rounded-xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-rose-950 to-black flex">
                {/* Left Side: Boss Image */}
                <div className="w-48 relative overflow-hidden flex-shrink-0">
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

                {/* Right Side: Info */}
                <div className="flex-1 p-4 flex flex-col justify-center text-white relative z-10">
                     <div className="mb-3">
                        <div className="text-rose-500 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                            <Activity size={14} className="animate-pulse" /> Breaking Army
                        </div>
                        <h2 className="text-xl font-extrabold leading-tight mb-1 truncate">
                            {currentBoss?.name || "No Active Boss"}
                        </h2>
                        {userGuildId && breakingArmyConfig?.schedules?.[userGuildId] && breakingArmyConfig.schedules[userGuildId].length > 0 && (
                            <div className="inline-flex items-center gap-2 text-xs text-zinc-400">
                                <Clock size={12} />
                                <span>Next: {breakingArmyConfig.schedules[userGuildId][0]?.day} @ {formatTime12Hour(breakingArmyConfig.schedules[userGuildId][0]?.time)}</span>
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
                
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-2xl pointer-events-none"></div>
            </div>

            {/* Global Announcements */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Globe className="text-blue-500" /> Global Announcements
                    </h3>
                    {isAdmin && (
                        <button 
                            onClick={() => setIsAnnouncementModalOpen(true)}
                            className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-2 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 font-medium transition-colors"
                        >
                            + Post News
                        </button>
                    )}
                </div>
                
                {globalAnnouncements.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">No global announcements.</p>
                ) : (
                    <div className="space-y-4">
                        {globalAnnouncements.map(ann => (
                            <div key={ann.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{ann.title}</h4>
                                    <span className="text-xs text-zinc-400">{new Date(ann.timestamp).toLocaleDateString()}</span>
                                </div>
                                <RichText text={ann.content} className="text-sm text-zinc-600 dark:text-zinc-400 mt-2" onMentionClick={handleMentionClick} />
                                <div className="mt-2 text-xs text-zinc-400 italic flex justify-end">
                                    <span className="cursor-pointer hover:text-rose-500" onClick={() => handleMentionClick(ann.authorName)}>- {ann.authorName}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Events */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <Calendar className="text-rose-900 dark:text-rose-500" /> Upcoming Events
                </h3>
                <div className="space-y-4">
                    {events.length === 0 ? (
                        <p className="text-zinc-500 text-center py-4">No upcoming events.</p>
                    ) : (
                        events.map(event => (
                            <div key={event.id} className="flex gap-4 items-start p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg text-center min-w-[60px]">
                                    <span className="block text-xs font-bold text-rose-900 dark:text-rose-500 uppercase">{new Date(event.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                    <span className="block text-xl font-bold text-zinc-900 dark:text-zinc-100">{new Date(event.date).getDate()}</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-rose-900 dark:group-hover:text-rose-400 transition-colors">{event.title}</h4>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{event.description}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded font-medium">{event.type}</span>
                                        <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={12} /> {new Date(event.date).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span className="text-xs text-zinc-400">• {guilds.find(g => g.id === event.guildId)?.name || 'Global'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
                    <Link to="/events" className="text-sm font-bold text-rose-900 dark:text-rose-500 hover:underline flex items-center justify-center gap-1">
                        View Full Calendar <ArrowRight size={14} />
                    </Link>
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
