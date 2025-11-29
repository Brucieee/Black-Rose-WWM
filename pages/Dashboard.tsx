import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Sword, Users, Trophy, Activity, Clock } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
import { UserProfile, QueueEntry, Guild, GuildEvent, LeaderboardEntry, BreakingArmyConfig } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { useAlert } from '../contexts/AlertContext';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { QueueModal } from '../components/modals/QueueModal';

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
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  const [breakingArmyConfig, setBreakingArmyConfig] = useState<BreakingArmyConfig | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [selectedLeaderboardUser, setSelectedLeaderboardUser] = useState<UserProfile | null>(null);

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
        // Filter client side for future events to avoid complex compound queries
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
      .limit(5)
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

    return () => {
        unsubGuilds(); unsubEvents(); unsubLeaderboard(); unsubConfig(); unsubQueue(); unsubUsers();
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
  const isCooldown = currentUserProfile ? (breakingArmyConfig?.recentWinners?.some(w => w.uid === currentUserProfile.uid && w.branchId === userGuildId && !w.prizeGiven) || false) : false;

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
            joinedAt: new Date() // Store as Date object or Timestamp
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
            
            {/* Breaking Army Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="relative h-40 bg-zinc-900">
                    {currentBoss?.imageUrl ? (
                        <img src={currentBoss.imageUrl} alt={currentBoss.name} className="w-full h-full object-cover opacity-60" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-rose-900 to-zinc-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                        <div className="w-full flex justify-between items-end">
                            <div>
                                <div className="text-rose-400 font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <Sword size={16} /> Breaking Army
                                </div>
                                <h2 className="text-2xl font-bold text-white">{currentBoss?.name || "No Active Boss"}</h2>
                                {userGuildId && breakingArmyConfig?.schedules?.[userGuildId] && breakingArmyConfig.schedules[userGuildId].length > 0 && (
                                    <p className="text-zinc-300 text-sm mt-1">
                                        Next: {breakingArmyConfig.schedules[userGuildId][0]?.day} @ {formatTime12Hour(breakingArmyConfig.schedules[userGuildId][0]?.time)}
                                    </p>
                                )}
                            </div>
                            <button 
                                onClick={() => setIsQueueModalOpen(true)}
                                className="bg-white text-zinc-900 px-6 py-2 rounded-lg font-bold hover:bg-zinc-100 transition-colors shadow-lg"
                                disabled={!currentBossName}
                            >
                                {queue.find(q => q.uid === currentUser?.uid) ? 'View Queue' : 'Join Queue'}
                            </button>
                        </div>
                    </div>
                </div>
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
                 <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <Trophy className="text-yellow-500" /> Top Speedruns
                </h3>
                <div className="space-y-1">
                    {leaderboard.map((entry, idx) => (
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
                                    <p className="text-xs text-zinc-500">{entry.boss}</p>
                                </div>
                            </div>
                            <span className="font-mono text-sm font-bold text-rose-900 dark:text-rose-500">{entry.time}</span>
                        </div>
                    ))}
                    {leaderboard.length === 0 && <p className="text-zinc-500 text-sm">No records yet.</p>}
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