
import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Sword, Users, Trophy, Activity, ListOrdered } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { UserProfile, RoleType, QueueEntry, Guild, GuildEvent, LeaderboardEntry, BreakingArmyConfig, ScheduleSlot } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, orderBy, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { useAlert } from '../contexts/AlertContext';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { QueueModal } from '../components/modals/QueueModal';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  
  // Real Data State
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [activePartiesCount, setActivePartiesCount] = useState(0);

  // System Config
  const [currentBossMap, setCurrentBossMap] = useState<Record<string, string>>({});
  const [schedulesMap, setSchedulesMap] = useState<Record<string, ScheduleSlot[]>>({});
  const [recentWinners, setRecentWinners] = useState<string[]>([]);
  const [bossImageUrl, setBossImageUrl] = useState<string>('');
  const [bossNames, setBossNames] = useState<string[]>([]);

  // Modals
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [selectedQueueGuildId, setSelectedQueueGuildId] = useState<string>('');

  // Forms & Filters
  const [leaderboardBranch, setLeaderboardBranch] = useState('All');
  const [leaderboardBoss, setLeaderboardBoss] = useState('All');

  // Fetch all data
  useEffect(() => {
    const unsubGuilds = onSnapshot(query(collection(db, "guilds"), orderBy("name")), snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    const unsubEvents = onSnapshot(collection(db, "events"), snap => setEvents(snap.docs.map(d => ({id: d.id, ...d.data()} as GuildEvent))));
    const unsubLeaderboard = onSnapshot(query(collection(db, "leaderboard"), orderBy("time")), snap => setLeaderboard(snap.docs.map(d => ({id: d.id, ...d.data()} as LeaderboardEntry))));
    const unsubQueue = onSnapshot(collection(db, "queue"), snap => setQueue(snap.docs.map(d => ({...d.data()} as QueueEntry))));
    const unsubUsers = onSnapshot(collection(db, "users"), snap => setUsers(snap.docs.map(d => d.data() as UserProfile)));
    const unsubParties = onSnapshot(collection(db, "parties"), snap => setActivePartiesCount(snap.size));
    
    const unsubConfig = onSnapshot(doc(db, "system", "breakingArmy"), snap => {
      if (snap.exists()) {
        const data = snap.data() as BreakingArmyConfig;
        setCurrentBossMap(data.currentBoss || {});
        setSchedulesMap(data.schedules || {});
        setRecentWinners(data.recentWinners || []);
        
        // Update Boss Names for Filters
        const names = data.bossPool?.map(b => b.name) || [];
        setBossNames(names);
        
        // Find Boss Image for primary branch or first available
        const firstActiveBoss = Object.values(data.currentBoss || {})[0];
        const current = data.bossPool?.find(b => b.name === firstActiveBoss);
        setBossImageUrl(current?.imageUrl || '');
      }
    });

    return () => { unsubGuilds(); unsubEvents(); unsubLeaderboard(); unsubQueue(); unsubUsers(); unsubParties(); unsubConfig(); };
  }, []);

  useEffect(() => {
    if (currentUser && users.length > 0) {
      const profile = users.find(u => u.uid === currentUser.uid);
      if (profile) setCurrentUserProfile(profile);
    }
  }, [currentUser, users]);

  // Derived State
  const currentBranchQueue = queue.filter(q => q.guildId === selectedQueueGuildId);
  const isCooldown = currentUser && recentWinners.includes(currentUser.uid);
  
  const todayIndex = new Date().getDay();
  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysMap[todayIndex];

  // Helper to check if any branch has an event today
  const isEventDay = Object.values(schedulesMap).some((slots) => (slots as ScheduleSlot[]).some(s => s.day === todayName));
  const breakingArmyStatusText = isEventDay ? 'Scheduled Today' : 'Upcoming';

  const filteredLeaderboard = leaderboard.filter(entry => {
    const matchesBranch = leaderboardBranch === 'All' || entry.branch === leaderboardBranch;
    const matchesBoss = leaderboardBoss === 'All' || entry.boss === leaderboardBoss;
    return matchesBranch && matchesBoss;
  });

  const handleJoinQueue = async () => {
    if (!currentUserProfile) {
        navigate('/register');
        return;
    }
    if (currentUserProfile.guildId !== selectedQueueGuildId) {
        showAlert(`You belong to a different branch!`, 'error');
        return;
    }
    if (currentBranchQueue.length >= 30) {
        showAlert("Queue Full", 'error');
        return;
    }

    // Add to Queue Collection
    // Use uid as doc ID to prevent duplicates easily
    const qRef = doc(db, "queue", currentUser!.uid); 
    await setDoc(qRef, {
        uid: currentUser!.uid,
        name: currentUserProfile.displayName,
        role: currentUserProfile.role,
        joinedAt: new Date(),
        guildId: selectedQueueGuildId
    });
    showAlert("Joined Queue Successfully!", 'success');
  };

  const handleLeaveQueue = async () => {
    if (!currentUser) return;
    await deleteDoc(doc(db, "queue", currentUser.uid));
    showAlert("Left Queue", 'info');
  };

  const getScheduleDisplay = (guildId: string) => {
      const slots = schedulesMap[guildId] || [];
      if (slots.length === 0) return { days: 'Not Scheduled', time: '' };
      
      const days = slots.map(s => s.day.substring(0, 3)).join(' / ');
      const time = slots[0].time; // Simplifying to show first time
      return { days, time };
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Guild Overview</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
            Welcome, <span className="font-semibold text-zinc-700 dark:text-zinc-200">{currentUserProfile?.displayName || currentUser?.displayName || 'Guest'}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl"><Users size={28} /></div>
          <div><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Total Members</p><p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{users.length}</p></div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl"><Sword size={28} /></div>
          <div><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Active Parties</p><p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{activePartiesCount}</p></div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-zinc-100 dark:bg-zinc-800 text-rose-600 dark:text-rose-500 rounded-xl"><Activity size={28} /></div>
          <div><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Breaking Army Status</p><p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{breakingArmyStatusText}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Breaking Army Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[400px] relative">
          
          {/* Background Image Overlay if Boss has Image */}
          {bossImageUrl && (
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none z-0"
              style={{
                backgroundImage: `url(${bossImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}

          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-rose-50/50 dark:bg-rose-950/20 flex-shrink-0 flex justify-between items-center z-10 relative">
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <Calendar className="text-rose-900 dark:text-rose-500 w-5 h-5" />
                 <h3 className="font-bold text-rose-900 dark:text-rose-500 text-lg">Weekly Event: Breaking Army</h3>
               </div>
               <p className="text-xs text-rose-700 dark:text-rose-400 font-medium ml-7 opacity-80">Weekly Boss Battles</p>
             </div>
          </div>
          <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 z-10 relative">
             {guilds.map((guild) => {
               const schedule = getScheduleDisplay(guild.id);
               const boss = currentBossMap[guild.id] || 'TBD';
               
               return (
               <div key={guild.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
                  <div className="flex flex-col max-w-[50%]">
                    <div className="font-bold text-zinc-800 dark:text-zinc-200">{guild.name}</div>
                    <div className="text-xs text-rose-700 dark:text-rose-400 font-medium truncate" title={`Boss: ${boss}`}>Boss: {boss}</div>
                  </div>
                  <div className="flex items-center gap-4 text-sm flex-shrink-0">
                    <div className="flex flex-col items-end">
                       <span className="text-zinc-500 dark:text-zinc-400 font-medium text-xs">{schedule.days}</span>
                       <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{schedule.time}</span>
                    </div>
                    <button onClick={() => { setSelectedQueueGuildId(guild.id); setIsQueueModalOpen(true); }} className="bg-zinc-100 dark:bg-zinc-700 hover:bg-rose-900 hover:text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"><ListOrdered size={14} /> Queue</button>
                  </div>
               </div>
             )})}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex flex-col gap-4 flex-shrink-0">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Trophy className="text-yellow-600 dark:text-yellow-500 w-5 h-5" />
                 <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">Fastest Boss Kill</h3>
               </div>
             </div>
             <div className="flex gap-2">
                <select className="px-2 py-1 text-xs border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" value={leaderboardBranch} onChange={(e) => setLeaderboardBranch(e.target.value)}>
                  <option value="All">All Branches</option>
                  {guilds.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
                <select className="px-2 py-1 text-xs border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" value={leaderboardBoss} onChange={(e) => setLeaderboardBoss(e.target.value)}>
                  <option value="All">All Bosses</option>
                  {bossNames.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left text-sm table-fixed">
              <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 sticky top-0 z-10">
                <tr><th className="px-4 py-3 w-16">#</th><th className="px-4 py-3 w-3/12">Player</th><th className="px-4 py-3 w-5/12">Boss</th><th className="px-4 py-3 w-2/12">Time</th><th className="px-4 py-3 w-2/12 text-right">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredLeaderboard.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3 truncate">
                      <button onClick={() => { 
                         const u = users.find(u => u.uid === entry.playerUid); 
                         if (u) setSelectedUser(u); 
                      }} className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-rose-900 hover:underline">{entry.playerName}</button>
                      <div className="text-xs text-zinc-500">{entry.branch}</div>
                    </td>
                    <td className="px-4 py-3 truncate" title={entry.boss}>{entry.boss}</td>
                    <td className="px-4 py-3 font-mono font-medium text-rose-900 dark:text-rose-400">{entry.time}</td>
                    <td className="px-4 py-3 text-right text-xs whitespace-nowrap">{entry.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-xl flex items-center gap-2"><Calendar className="text-rose-900 dark:text-rose-500" /> Upcoming Guild Events</h3>
          <Link to="/events" className="text-sm font-medium text-rose-900 hover:underline flex items-center gap-1">View Calendar <ArrowRight size={14} /></Link>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {events.map(event => {
            const branchName = guilds.find(g => g.id === event.guildId)?.name || 'Global';
            const eventDate = new Date(event.date);
            return (
              <div key={event.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-6 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <div className="flex-shrink-0 flex sm:flex-col items-center gap-2 sm:gap-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 min-w-[80px] text-center">
                  <span className="text-xs font-bold text-zinc-500 uppercase">{eventDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{eventDate.getDate()}</span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">{event.type}</span>
                    <span className="text-xs font-medium text-zinc-400">• {branchName}</span>
                  </div>
                  <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{event.title}</h4>
                  <p className="text-zinc-500 text-sm">{event.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <QueueModal 
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        guildName={guilds.find(g => g.id === selectedQueueGuildId)?.name || ''}
        bossName={currentBossMap[selectedQueueGuildId] || 'Boss TBD'}
        queue={currentBranchQueue}
        currentUserUid={currentUser?.uid}
        isCooldown={!!isCooldown}
        onJoin={handleJoinQueue}
        onLeave={handleLeaveQueue}
      />

      <UserProfileModal 
        user={selectedUser} 
        onClose={() => setSelectedUser(null)} 
        guilds={guilds}
      />
    </div>
  );
};

export default Dashboard;
