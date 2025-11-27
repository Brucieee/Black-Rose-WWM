import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BREAKING_ARMY_CONFIG, MOCK_GUILDS, MOCK_EVENTS } from '../services/mockData';
import { Plus, Trash2, Calendar, Database, ListOrdered, Crown, Check, RefreshCw, UserCog } from 'lucide-react';
import { Guild, QueueEntry, GuildEvent, UserProfile } from '../types';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const Admin: React.FC = () => {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'guilds' | 'events' | 'breakingArmy' | 'users'>('guilds');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGuildData, setNewGuildData] = useState({ name: '', id: '', primaryGame: 'MMORPG X' });
  
  // Real Data State
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [bossName, setBossName] = useState('');
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [recentWinners, setRecentWinners] = useState<string[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Events Form
  const [newEvent, setNewEvent] = useState<Partial<GuildEvent>>({
    title: '', description: '', type: 'Raid', date: '', guildId: ''
  });

  // Winner Selection State
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<QueueEntry | null>(null);
  const [winnerTime, setWinnerTime] = useState('');

  // Fetch Data
  useEffect(() => {
    if (currentUser) {
        getDocs(query(collection(db, "users"))).then(snap => {
            const me = snap.docs.find(d => d.id === currentUser.uid);
            if (me) setUserProfile(me.data() as UserProfile);
        });
    }

    const unsubGuilds = onSnapshot(query(collection(db, "guilds"), orderBy("name")), snap => {
      const g = snap.docs.map(d => ({ id: d.id, ...d.data() } as Guild));
      setGuilds(g);
      if (g.length > 0 && !selectedBranchId) setSelectedBranchId(g[0].id);
    });

    const unsubEvents = onSnapshot(collection(db, "events"), snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as GuildEvent)));
    });

    const unsubConfig = onSnapshot(doc(db, "system", "breakingArmy"), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setBossName(data.currentBoss);
        setRecentWinners(data.recentWinners || []);
      }
    });

    const unsubQueue = onSnapshot(collection(db, "queue"), snap => {
      setQueue(snap.docs.map(d => ({ ...d.data() } as QueueEntry)));
    });

    const unsubUsers = onSnapshot(collection(db, "users"), snap => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    return () => {
      unsubGuilds(); unsubEvents(); unsubConfig(); unsubQueue(); unsubUsers();
    };
  }, [currentUser]);

  const handleInitialize = async () => {
    if (!confirm("This will overwrite/create default data. Continue?")) return;
    
    // Create Default Guilds
    for (const g of MOCK_GUILDS) {
      await setDoc(doc(db, "guilds", g.id), g);
    }
    
    // Create Breaking Army Config
    await setDoc(doc(db, "system", "breakingArmy"), BREAKING_ARMY_CONFIG);

    // Create Mock Events
    for (const e of MOCK_EVENTS) {
       await addDoc(collection(db, "events"), e);
    }

    // Auto-promote current user to Admin
    if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), { systemRole: 'Admin' });
        alert("System Initialized! You have been promoted to Admin.");
        window.location.reload();
    } else {
        alert("System Initialized with Default Data!");
    }
  };

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, "guilds", newGuildData.id), newGuildData);
    setIsCreateModalOpen(false);
  };

  const handleDeleteGuild = async (id: string) => {
    if (confirm("Delete this branch?")) {
      await deleteDoc(doc(db, "guilds", id));
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) return alert("Fill required fields");
    await addDoc(collection(db, "events"), newEvent);
    setNewEvent({ title: '', description: '', type: 'Raid', date: '', guildId: '' });
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteDoc(doc(db, "events", id));
  };

  const handleUpdateBoss = async () => {
    await updateDoc(doc(db, "system", "breakingArmy"), { currentBoss: bossName });
    alert("Boss updated!");
  };

  const handleResetQueue = async () => {
    if (!confirm("Clear queue?")) return;
    const snap = await getDocs(collection(db, "queue"));
    snap.forEach(d => deleteDoc(d.ref));
  };

  const handleResetCooldowns = async () => {
    if (!confirm("Reset cooldowns?")) return;
    await updateDoc(doc(db, "system", "breakingArmy"), { recentWinners: [] });
  };

  const handleConfirmWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWinner) return;

    const qSnap = await getDocs(collection(db, "queue"));
    const entryDoc = qSnap.docs.find(d => d.data().uid === selectedWinner.uid);
    if (entryDoc) await deleteDoc(entryDoc.ref);

    await updateDoc(doc(db, "system", "breakingArmy"), {
      recentWinners: [...recentWinners, selectedWinner.uid]
    });

    await addDoc(collection(db, "leaderboard"), {
        rank: 0, 
        playerName: selectedWinner.name,
        playerUid: selectedWinner.uid,
        branch: guilds.find(g => g.id === selectedWinner.guildId)?.name || 'Unknown',
        boss: bossName,
        time: winnerTime,
        date: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric'}),
        status: 'verified'
    });

    setIsWinnerModalOpen(false);
  };

  const handleUpdateRole = async (uid: string, newRole: 'Member' | 'Officer' | 'Admin') => {
    await updateDoc(doc(db, "users", uid), { systemRole: newRole });
  };

  const filteredQueue = queue.filter(q => q.guildId === selectedBranchId);

  const handleBackdropClick = (e: React.MouseEvent, setter: (val: any) => void) => {
    if (e.target === e.currentTarget) setter(false);
  };

  // Security Check: If not logged in, OR (Logged in but not Admin/Officer AND system is not empty)
  if (!currentUser) return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Please Sign In.</div>;
  if (guilds.length > 0 && userProfile?.systemRole === 'Member') return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Admins/Officers only.</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Administration</h2>
        <div className="flex gap-2">
            <button onClick={handleInitialize} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium">
                <Database size={16} /> Initialize System
            </button>
            {activeTab === 'guilds' && (
            <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 flex items-center gap-2 text-sm font-medium"
            >
                <Plus size={16} /> Create Branch
            </button>
            )}
        </div>
      </div>

      <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg w-fit mb-8 overflow-x-auto">
        <button onClick={() => setActiveTab('guilds')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'guilds' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Guild Branches</button>
        <button onClick={() => setActiveTab('events')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'events' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Events</button>
        <button onClick={() => setActiveTab('breakingArmy')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'breakingArmy' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Breaking Army</button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'users' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>User Management</button>
      </div>

      {activeTab === 'guilds' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
             <table className="w-full text-left text-sm">
                 <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                   <tr>
                     <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">ID</th>
                     <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Branch Name</th>
                     <th className="px-6 py-3 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                   {guilds.map(g => (
                     <tr key={g.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                       <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{g.id}</td>
                       <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{g.name}</td>
                       <td className="px-6 py-4 text-right">
                         <button onClick={() => handleDeleteGuild(g.id)} className="text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
          </div>
        </div>
      )}
      
      {activeTab === 'events' && (
        <div className="space-y-6">
           <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Create New Event</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="text" placeholder="Title" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
              <select value={newEvent.guildId} onChange={e => setNewEvent({...newEvent, guildId: e.target.value})} className="p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white">
                <option value="">Global / All Branches</option>
                {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})} className="p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white">
                  <option>Raid</option><option>PvP</option><option>Meeting</option><option>Social</option>
                </select>
               <input type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
             </div>
             <textarea placeholder="Description" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="p-2 border rounded h-24 w-full mb-4 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
            <button onClick={handleCreateEvent} className="bg-rose-900 text-white px-4 py-2 rounded-md hover:bg-rose-950 flex gap-2"><Calendar size={16} /> Schedule</button>
          </div>
           <div className="grid grid-cols-1 gap-4">
             {events.map(event => (
                  <div key={event.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-rose-900 dark:text-rose-400 uppercase tracking-wider bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded">{event.type}</span>
                          <span className="text-xs font-medium text-zinc-400">{guilds.find(g => g.id === event.guildId)?.name || 'Global'}</span>
                        </div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{event.title}</h4>
                      </div>
                      <button onClick={() => handleDeleteEvent(event.id)} className="text-zinc-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'breakingArmy' && (
        <div className="space-y-6">
           <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
             <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Configuration</h3>
             <div className="flex gap-2 mb-6">
                <input type="text" value={bossName} onChange={e => setBossName(e.target.value)} className="flex-1 p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
                <button onClick={handleUpdateBoss} className="bg-zinc-900 text-white px-4 py-2 rounded">Update Boss</button>
             </div>
             <div className="flex gap-4">
                <button onClick={handleResetQueue} className="text-red-600 bg-red-50 p-2 rounded flex gap-2 items-center"><Trash2 size={16} /> Clear Queue</button>
                <button onClick={handleResetCooldowns} className="text-blue-600 bg-blue-50 p-2 rounded flex gap-2 items-center"><RefreshCw size={16} /> Reset Cooldowns</button>
             </div>
           </div>

           <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><ListOrdered /> Manage Queue</h3>
                <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} className="p-2 border rounded dark:bg-zinc-800 dark:text-white">
                   {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
             </div>
             <table className="w-full text-left text-sm">
               <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500">
                  <tr><th className="px-6 py-3">Player</th><th className="px-6 py-3">Role</th><th className="px-6 py-3 text-right">Declare Winner</th></tr>
               </thead>
               <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredQueue.map(entry => (
                    <tr key={entry.uid}>
                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">{entry.name}</td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{entry.role}</td>
                      <td className="px-6 py-4 text-right">
                         <button onClick={() => { setSelectedWinner(entry); setIsWinnerModalOpen(true); }} className="bg-yellow-100 text-yellow-700 p-2 rounded"><Crown size={16} /></button>
                      </td>
                    </tr>
                  ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
           <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
             <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><UserCog /> User Management</h3>
           </div>
           <table className="w-full text-left text-sm">
             <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500">
               <tr>
                 <th className="px-6 py-3">Name</th>
                 <th className="px-6 py-3">In-Game ID</th>
                 <th className="px-6 py-3">Guild</th>
                 <th className="px-6 py-3">System Role</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
               {allUsers.map(user => (
                 <tr key={user.uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                   <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                     <div className="flex flex-col">
                       <span>{user.displayName}</span>
                       <span className="text-xs text-zinc-400">{user.email}</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 font-mono">{user.inGameId}</td>
                   <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{guilds.find(g => g.id === user.guildId)?.name || 'Unknown'}</td>
                   <td className="px-6 py-4">
                     <select 
                       value={user.systemRole || 'Member'} 
                       onChange={(e) => handleUpdateRole(user.uid, e.target.value as any)}
                       className="p-1 border rounded text-xs dark:bg-zinc-800 dark:text-white"
                     >
                       <option value="Member">Member</option>
                       <option value="Officer">Officer</option>
                       <option value="Admin">Admin</option>
                     </select>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {/* Create Guild Modal */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => handleBackdropClick(e, setIsCreateModalOpen)}>
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">Create Guild Branch</h3>
            <form onSubmit={handleCreateGuild} className="space-y-4">
              <input type="text" placeholder="Branch Name" required value={newGuildData.name} onChange={e => setNewGuildData({...newGuildData, name: e.target.value})} className="w-full p-2 border rounded dark:bg-zinc-800 dark:text-white" />
              <input type="text" placeholder="ID (e.g. g1)" required value={newGuildData.id} onChange={e => setNewGuildData({...newGuildData, id: e.target.value})} className="w-full p-2 border rounded dark:bg-zinc-800 dark:text-white" />
              <button type="submit" className="w-full bg-rose-900 text-white p-2 rounded">Create</button>
            </form>
          </div>
        </div>, document.body
      )}

      {/* Winner Modal */}
      {isWinnerModalOpen && selectedWinner && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => handleBackdropClick(e, setIsWinnerModalOpen)}>
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">Declare Winner</h3>
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">Player: <strong>{selectedWinner.name}</strong></p>
            <input type="text" placeholder="Time (MM:SS)" value={winnerTime} onChange={e => setWinnerTime(e.target.value)} className="w-full p-2 border rounded mb-4 dark:bg-zinc-800 dark:text-white" />
            <button onClick={handleConfirmWinner} className="w-full bg-rose-900 text-white p-2 rounded flex items-center justify-center gap-2"><Check size={16} /> Confirm</button>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default Admin;