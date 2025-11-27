import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ArrowRight, Sword, Users, Trophy, Activity, Clock, X, Upload, FileImage, ListOrdered, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserProfile, RoleType, QueueEntry, Guild, GuildEvent, LeaderboardEntry } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../services/firebase';
import { collection, addDoc, query, onSnapshot, orderBy, doc, getDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Real Data State
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [activePartiesCount, setActivePartiesCount] = useState(0);

  // System Config
  const [bossName, setBossName] = useState('Loading...');
  const [recentWinners, setRecentWinners] = useState<string[]>([]);

  // Modals
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [selectedQueueGuildId, setSelectedQueueGuildId] = useState<string>('');

  // Forms & Filters
  const [submitForm, setSubmitForm] = useState({ boss: 'Black God of Wealth', time: '', date: new Date().toISOString().split('T')[0], proofFile: null as File | null });
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
        const data = snap.data();
        setBossName(data.currentBoss);
        setRecentWinners(data.recentWinners || []);
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
  const isInCurrentQueue = currentUser && currentBranchQueue.find(q => q.uid === currentUser.uid);
  const isCooldown = currentUser && recentWinners.includes(currentUser.uid);
  
  const today = new Date().getDay();
  const isEventDay = today === 3 || today === 5;
  let breakingArmyStatusText = 'Next: Wednesday';
  if (isEventDay) breakingArmyStatusText = 'Scheduled Today';
  else if (today === 4) breakingArmyStatusText = 'Next: Friday';

  const filteredLeaderboard = leaderboard.filter(entry => {
    const matchesBranch = leaderboardBranch === 'All' || entry.branch === leaderboardBranch;
    const matchesBoss = leaderboardBoss === 'All' || entry.boss === leaderboardBoss;
    return matchesBranch && matchesBoss;
  });

  const uniqueBosses = [
    'Black God of Wealth', 'Dao Lord', 'Heartseeker', 'Lucky Seventeen', 'Murong Yuan', 
    'Qianye', 'The Void King', 'Tian Ying', 'Ye Wanshan', 'Zheng the Frostwing'
  ];

  const handleJoinQueue = async () => {
    if (!currentUserProfile) return alert("Please register a profile first!");
    if (currentUserProfile.guildId !== selectedQueueGuildId) {
        return alert(`You belong to a different branch!`);
    }
    if (currentBranchQueue.length >= 30) return alert("Queue Full");

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
  };

  const handleLeaveQueue = async () => {
    if (!currentUser) return;
    await deleteDoc(doc(db, "queue", currentUser.uid));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubmitForm(prev => ({ ...prev, proofFile: file }));
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitForm.proofFile) return alert("Proof required");
    alert("Entry submitted for verification! (File upload mocked for now)");
    setIsSubmitModalOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent, setter: (val: any) => void) => {
    if (e.target === e.currentTarget) setter(null);
  };

  const getRoleBadge = (role: RoleType) => {
    switch (role) {
      case RoleType.DPS: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">DPS</span>;
      case RoleType.TANK: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">TANK</span>;
      case RoleType.HEALER: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">HEALER</span>;
      case RoleType.HYBRID: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">HYBRID</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Guild Overview</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Welcome, {currentUser?.displayName || 'Guest'}.</p>
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
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-rose-50/50 dark:bg-rose-950/20 flex-shrink-0 flex justify-between items-center">
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <Calendar className="text-rose-900 dark:text-rose-500 w-5 h-5" />
                 <h3 className="font-bold text-rose-900 dark:text-rose-500 text-lg">Weekly Event: Breaking Army</h3>
               </div>
               <p className="text-xs text-rose-700 dark:text-rose-400 font-medium ml-7 opacity-80">2x a Week (Wed & Fri)</p>
             </div>
          </div>
          <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
             {guilds.map((guild) => (
               <div key={guild.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border border-zinc-100 dark:border-zinc-800">
                  <div className="flex flex-col max-w-[50%]">
                    <div className="font-bold text-zinc-800 dark:text-zinc-200">{guild.name}</div>
                    <div className="text-xs text-rose-700 dark:text-rose-400 font-medium truncate" title={`Boss: ${bossName}`}>Boss: {bossName}</div>
                  </div>
                  <div className="flex items-center gap-4 text-sm flex-shrink-0">
                    <div className="flex flex-col items-end">
                       <span className="text-zinc-500 dark:text-zinc-400 font-medium text-xs">Wed / Fri</span>
                       <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">8:00 PM</span>
                    </div>
                    <button onClick={() => { setSelectedQueueGuildId(guild.id); setIsQueueModalOpen(true); }} className="bg-zinc-100 dark:bg-zinc-700 hover:bg-rose-900 hover:text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"><ListOrdered size={14} /> Queue</button>
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex flex-col gap-4 flex-shrink-0">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Trophy className="text-yellow-600 dark:text-yellow-500 w-5 h-5" />
                 <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">Fastest Boss Kill</h3>
               </div>
               <button onClick={() => setIsSubmitModalOpen(true)} className="bg-rose-900 hover:bg-rose-950 text-white text-xs px-3 py-1.5 rounded-lg font-medium">Submit Entry</button>
             </div>
             <div className="flex gap-2">
                <select className="px-2 py-1 text-xs border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" value={leaderboardBranch} onChange={(e) => setLeaderboardBranch(e.target.value)}>
                  <option value="All">All Branches</option>
                  {guilds.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
                <select className="px-2 py-1 text-xs border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" value={leaderboardBoss} onChange={(e) => setLeaderboardBoss(e.target.value)}>
                  <option value="All">All Bosses</option>
                  {uniqueBosses.map(b => <option key={b} value={b}>{b}</option>)}
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

      {/* Queue Modal */}
      {isQueueModalOpen && createPortal(
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => handleBackdropClick(e, setIsQueueModalOpen)}>
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
             <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-start">
               <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Queue: {guilds.find(g => g.id === selectedQueueGuildId)?.name}</h3>
                  <p className="text-rose-700 dark:text-rose-400 font-medium text-sm mt-1">{bossName}</p>
                  <p className="text-xs text-zinc-500 mt-2"><Users size={12} className="inline mr-1" /> {currentBranchQueue.length} / 30</p>
               </div>
               <button onClick={() => setIsQueueModalOpen(false)}><X size={20} className="text-zinc-400" /></button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 sticky top-0"><tr><th className="px-6 py-2 w-16">#</th><th className="px-6 py-2">Name</th><th className="px-6 py-2 text-right">Role</th></tr></thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {currentBranchQueue.map((entry, i) => (
                      <tr key={entry.uid} className={currentUser && entry.uid === currentUser.uid ? 'bg-rose-50 dark:bg-rose-900/10' : ''}>
                        <td className="px-6 py-3 font-mono text-zinc-400">{i + 1}</td>
                        <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">{entry.name}</td>
                        <td className="px-6 py-3 text-right">{getRoleBadge(entry.role)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                {isCooldown ? (
                  <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 flex items-center gap-2"><AlertTriangle size={18} /> Cooldown Active</div>
                ) : isInCurrentQueue ? (
                   <button onClick={handleLeaveQueue} className="w-full py-3 bg-zinc-200 dark:bg-zinc-800 font-bold rounded-lg">Leave Queue</button>
                ) : (
                  <button onClick={handleJoinQueue} disabled={currentBranchQueue.length >= 30} className="w-full py-3 bg-rose-900 text-white font-bold rounded-lg disabled:opacity-50"><CheckCircle className="inline mr-2" size={18} /> Join Queue</button>
                )}
             </div>
          </div>
         </div>, document.body
      )}

      {/* User Modal */}
      {selectedUser && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => handleBackdropClick(e, setSelectedUser)}>
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="h-24 bg-zinc-900 relative"><button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-white"><X size={20} /></button></div>
            <div className="px-6 pb-6 -mt-12 relative">
               <div className="flex justify-between items-end mb-4">
                  <img src={selectedUser.photoURL || 'https://via.placeholder.com/150'} alt="" className="w-24 h-24 rounded-full border-4 border-white dark:border-zinc-800 bg-white object-cover" />
                  <div className="mb-2">{getRoleBadge(selectedUser.role)}</div>
               </div>
               <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{selectedUser.displayName}</h3>
               <p className="text-zinc-500 text-sm">ID: {selectedUser.inGameId}</p>
               <div className="mt-4 space-y-4">
                 <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border dark:border-zinc-700">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase mb-3">Martial Arts</h4>
                    <div className="flex flex-wrap gap-2">{selectedUser.weapons?.map(w => <span key={w} className="px-3 py-1 bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-full text-sm text-zinc-700 dark:text-zinc-300">{w}</span>)}</div>
                 </div>
               </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Submit Entry Modal */}
      {isSubmitModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => handleBackdropClick(e, setIsSubmitModalOpen)}>
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Submit Entry</h3>
            <form onSubmit={handleSubmitEntry} className="space-y-4">
              <select value={submitForm.boss} onChange={e => setSubmitForm({...submitForm, boss: e.target.value})} className="w-full p-2 border rounded dark:bg-zinc-800 dark:text-white">
                   {uniqueBosses.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <input type="text" placeholder="Time (MM:SS)" required value={submitForm.time} onChange={e => setSubmitForm({...submitForm, time: e.target.value})} className="w-full p-2 border rounded dark:bg-zinc-800 dark:text-white" />
              <div className="border-2 border-dashed p-6 text-center cursor-pointer" onClick={() => document.getElementById('proof')?.click()}>
                 <span className="text-zinc-500">{submitForm.proofFile ? submitForm.proofFile.name : "Click to Upload Proof"}</span>
                 <input id="proof" type="file" className="hidden" onChange={handleFileUpload} />
              </div>
              <button type="submit" className="w-full bg-rose-900 text-white p-2 rounded">Submit</button>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default Dashboard;