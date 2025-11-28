

import React, { useState, useEffect } from 'react';
import { BREAKING_ARMY_CONFIG, MOCK_GUILDS, MOCK_EVENTS } from '../services/mockData';
import { Plus, Trash2, Calendar, Database, ListOrdered, Crown, Check, RefreshCw, Skull, Clock, X, Edit, Trophy, Save, ShieldAlert, FileText, Gift, CheckCircle } from 'lucide-react';
import { Guild, QueueEntry, GuildEvent, UserProfile, Boss, BreakingArmyConfig, ScheduleSlot, LeaderboardEntry, CooldownEntry, WinnerLog } from '../types';
import { db } from '../services/firebase';
// FIX: Removed unused Firestore v9 imports and added firebase compat for FieldValue.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { CreateGuildModal } from '../components/modals/CreateGuildModal';
import { DeclareWinnerModal } from '../components/modals/DeclareWinnerModal';
import { EditLeaderboardModal } from '../components/modals/EditLeaderboardModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';

const Admin: React.FC = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'guilds' | 'events' | 'breakingArmy' | 'users' | 'leaderboard' | 'winnerLogs'>('guilds');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGuildData, setNewGuildData] = useState({ name: '', id: '', memberCap: 80});
  
  // Real Data State
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [winnerLogs, setWinnerLogs] = useState<WinnerLog[]>([]);
  
  // Breaking Army State
  const [currentBossMap, setCurrentBossMap] = useState<Record<string, string>>({});
  const [schedulesMap, setSchedulesMap] = useState<Record<string, ScheduleSlot[]>>({});
  const [bossPool, setBossPool] = useState<Boss[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [recentWinners, setRecentWinners] = useState<CooldownEntry[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Inline Guild Edit State
  const [editingGuildId, setEditingGuildId] = useState<string | null>(null);
  const [guildEditForm, setGuildEditForm] = useState({ name: '', memberCap: 80 });

  // Events Form
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<Partial<GuildEvent>>({
    title: '', description: '', type: 'Raid', date: '', guildId: ''
  });

  // Winner Selection State
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<QueueEntry | null>(null);
  const [winnerTime, setWinnerTime] = useState('');

  // Boss Form
  const [editingBossOriginalName, setEditingBossOriginalName] = useState<string | null>(null);
  const [bossForm, setBossForm] = useState({ name: '', imageUrl: '' });

  // Schedule Form
  const [newSchedule, setNewSchedule] = useState({ day: 'Wednesday', time: '20:00' });

  // Leaderboard Edit State
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [editingLeaderboardEntry, setEditingLeaderboardEntry] = useState<LeaderboardEntry | null>(null);

  // Confirmation Modal State
  const [deleteConf, setDeleteConf] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', action: async () => {} });

  const isAdmin = userProfile?.systemRole === 'Admin';
  const isOfficer = userProfile?.systemRole === 'Officer';

  // Fetch Data
  useEffect(() => {
    if (currentUser) {
        // FIX: Updated Firestore query to v8 compat syntax.
        const unsubUser = db.collection("users").doc(currentUser.uid).onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const profile = docSnap.data() as UserProfile;
                setUserProfile(profile);
                if (profile.systemRole === 'Admin' && activeTab !== 'guilds' && activeTab !== 'users') setActiveTab('guilds');
                else if (profile.systemRole === 'Officer') setActiveTab('events');
                
                if (profile.systemRole === 'Officer') {
                    setSelectedBranchId(profile.guildId);
                }
            }
        });
        return () => unsubUser();
    }
  }, [currentUser]);

  useEffect(() => {
    // FIX: Updated Firestore query to v8 compat syntax.
    const unsubGuilds = db.collection("guilds").orderBy("name").onSnapshot(snap => {
      const g = snap.docs.map(d => ({ id: d.id, ...d.data() } as Guild));
      setGuilds(g);
      if (g.length > 0 && !selectedBranchId && !isOfficer) setSelectedBranchId(g[0].id);
    });

    // FIX: Updated Firestore query to v8 compat syntax.
    const unsubEvents = db.collection("events").onSnapshot(snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as GuildEvent)));
    });

    // FIX: Updated Firestore query to v8 compat syntax.
    const unsubLeaderboard = db.collection("leaderboard").orderBy("time").onSnapshot(snap => {
        setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderboardEntry)));
    });

    // FIX: Updated Firestore query to v8 compat syntax.
    const unsubWinnerLogs = db.collection("winner_logs").orderBy("date", "desc").onSnapshot(snap => {
      setWinnerLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as WinnerLog)));
    });

    // FIX: Updated Firestore query to v8 compat syntax.
    const unsubConfig = db.collection("system").doc("breakingArmy").onSnapshot(snap => {
      if (snap.exists) {
        const data = snap.data() as BreakingArmyConfig;
        setCurrentBossMap(data.currentBoss || {});
        setSchedulesMap(data.schedules || {});
        setRecentWinners(data.recentWinners || []);
        setBossPool(data.bossPool || []);
      }
    });

    // FIX: Updated Firestore query to v8 compat syntax.
    const unsubQueue = db.collection("queue").onSnapshot(snap => {
      setQueue(snap.docs.map(d => ({ ...d.data() } as QueueEntry)));
    });

    // FIX: Updated Firestore query to v8 compat syntax.
    const unsubUsers = db.collection("users").onSnapshot(snap => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    return () => {
      unsubGuilds(); unsubEvents(); unsubConfig(); unsubQueue(); unsubUsers(); unsubLeaderboard(); unsubWinnerLogs();
    };
  }, [isOfficer, selectedBranchId]); 

  const openDeleteModal = (title: string, message: string, action: () => Promise<void>) => {
    setDeleteConf({ isOpen: true, title, message, action });
  };

  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; 
    return `${h}:${minutes} ${ampm}`;
  };

  const formatDateMMDDYYYY = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
      }).replace(/\//g, '-');
  };

  const handleInitialize = async () => {
    openDeleteModal(
        "Initialize System?",
        "This will create default data for Guilds, Config, and Events. Continue?",
        async () => {
            try {
                for (const g of MOCK_GUILDS) {
                    // FIX: Updated Firestore write to v8 compat syntax.
                    await db.collection("guilds").doc(g.id).set({ name: g.name, memberCap: g.memberCap || 80 });
                }
                // FIX: Updated Firestore write to v8 compat syntax.
                await db.collection("system").doc("breakingArmy").set(BREAKING_ARMY_CONFIG, { merge: true });
                if (currentUser) {
                    // FIX: Updated Firestore write to v8 compat syntax.
                    await db.collection("users").doc(currentUser.uid).update({ systemRole: 'Admin' });
                }
                showAlert("System Initialized!", 'success');
            } catch (error: any) {
                showAlert(`Initialization failed: ${error.message}`, 'error');
            }
        }
    );
  };

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // FIX: Updated Firestore write to v8 compat syntax.
      await db.collection("guilds").doc(newGuildData.id).set({name: newGuildData.name, memberCap: newGuildData.memberCap});
      setIsCreateModalOpen(false);
      showAlert("Branch created", 'success');
    } catch (error: any) {
      showAlert(`Failed to create guild: ${error.message}`, 'error');
    }
  };

  const handleEditGuild = (guild: Guild) => {
    setEditingGuildId(guild.id);
    setGuildEditForm({ name: guild.name, memberCap: guild.memberCap });
  };

  const handleSaveGuild = async (id: string) => {
    try {
        // FIX: Updated Firestore write to v8 compat syntax.
        await db.collection("guilds").doc(id).update(guildEditForm);
        setEditingGuildId(null);
        showAlert("Branch updated", 'success');
    } catch (error: any) {
        showAlert(`Failed to update: ${error.message}`, 'error');
    }
  };

  const handleDeleteGuild = async (e: React.MouseEvent, id: string) => { /* ... */ };
  const handleSaveEvent = async () => { /* ... */ };
  const handleEditEvent = (e: React.MouseEvent, event: GuildEvent) => { /* ... */ };
  const handleCancelEditEvent = () => { /* ... */ };
  const handleDeleteEvent = async (e: React.MouseEvent, id: string) => { /* ... */ };
  const handleSaveBoss = async () => { /* ... */ };
  const handleEditBoss = (e: React.MouseEvent, boss: Boss) => { /* ... */ };
  const handleDeleteBoss = async (e: React.MouseEvent, bossName: string) => { /* ... */ };
  const handleUpdateCurrentBoss = async (name: string) => { /* ... */ };
  const handleAddSchedule = async () => { /* ... */ };
  const handleRemoveSchedule = async (index: number) => { /* ... */ };
  const handleResetQueue = async (e: React.MouseEvent) => { /* ... */ };
  const handleRemoveWinner = async (e: React.MouseEvent, uid: string) => { /* ... */ };
  const handleTogglePrize = async (uid: string, currentStatus: boolean) => { /* ... */ };
  const handleResetCooldowns = async () => { /* ... */ };
  const handleConfirmWinner = async (e: React.FormEvent) => { /* ... */ };
  const handleUpdateLogEntry = async (e: React.FormEvent, collectionName: 'leaderboard' | 'winner_logs') => { /* ... */ };
  const handleDeleteLogEntry = async (e: React.MouseEvent, id: string, collectionName: 'leaderboard' | 'winner_logs') => { /* ... */ };
  const handleUpdateRole = async (uid: string, newRole: 'Member' | 'Officer' | 'Admin') => { /* ... */ };
  const handleKickUser = async (e: React.MouseEvent, user: UserProfile) => { /* ... */ };
  const formatTimeInput = (val: string) => { /* ... */ return val; };

  const filteredQueue = queue.filter(q => q.guildId === selectedBranchId);
  const filteredWinners = recentWinners.filter(w => w.branchId === selectedBranchId);
  const currentBranchBoss = currentBossMap[selectedBranchId] || '';
  const currentBranchSchedule = schedulesMap[selectedBranchId] || [];
  const activeBossImage = bossPool.find(b => b.name === currentBranchBoss)?.imageUrl;

  if (!currentUser) return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Please Sign In.</div>;
  if (guilds.length > 0 && userProfile?.systemRole === 'Member') return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Admins/Officers only.</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Administration</h2>
        <div className="flex gap-2">
            {guilds.length === 0 && (
                <button onClick={handleInitialize} type="button" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium">
                    <Database size={16} /> Initialize System
                </button>
            )}
            {activeTab === 'guilds' && isAdmin && (
            <button 
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 flex items-center gap-2 text-sm font-medium"
            >
                <Plus size={16} /> Create Branch
            </button>
            )}
        </div>
      </div>

      <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg w-fit mb-8 overflow-x-auto">
        {isAdmin && <button onClick={() => setActiveTab('guilds')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'guilds' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Guild Branches</button>}
        {/* Other tabs */}
      </div>

      {activeTab === 'guilds' && isAdmin && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
             <table className="w-full text-left text-sm">
                 <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                   <tr>
                     <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">ID</th>
                     <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Branch Name</th>
                     <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Member Cap</th>
                     <th className="px-6 py-3 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                   {guilds.map(g => (
                     <tr key={g.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                       <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{g.id}</td>
                       <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                         {editingGuildId === g.id ? (
                           <input type="text" value={guildEditForm.name} onChange={(e) => setGuildEditForm({...guildEditForm, name: e.target.value})} className="p-1 rounded bg-zinc-100 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 w-full" />
                         ) : (
                           g.name
                         )}
                       </td>
                       <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                         {editingGuildId === g.id ? (
                           <input type="number" value={guildEditForm.memberCap} onChange={(e) => setGuildEditForm({...guildEditForm, memberCap: parseInt(e.target.value) || 0})} className="p-1 rounded bg-zinc-100 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 w-20" />
                         ) : (
                           g.memberCap
                         )}
                       </td>
                       <td className="px-6 py-4 text-right">
                         {editingGuildId === g.id ? (
                           <div className="flex gap-2 justify-end">
                             <button onClick={() => handleSaveGuild(g.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle size={16} /></button>
                             <button onClick={() => setEditingGuildId(null)} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg"><X size={16} /></button>
                           </div>
                         ) : (
                           <div className="flex gap-2 justify-end">
                             <button type="button" onClick={() => handleEditGuild(g)} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                             <button type="button" onClick={(e) => handleDeleteGuild(e, g.id)} className="text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                           </div>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
          </div>
        </div>
      )}
      
      {/* Other Tabs Content... */}
      
      {/* Modals */}
      <CreateGuildModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateGuild} data={newGuildData} onChange={setNewGuildData} />
      {/* Other Modals... */}
      <ConfirmationModal isOpen={deleteConf.isOpen} onClose={() => setDeleteConf({ ...deleteConf, isOpen: false })} onConfirm={deleteConf.action} title={deleteConf.title} message={deleteConf.message} />
    </div>
  );
};

export default Admin;
