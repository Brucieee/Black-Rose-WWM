
import React, { useState, useEffect } from 'react';
import { BREAKING_ARMY_CONFIG, MOCK_GUILDS, MOCK_EVENTS } from '../services/mockData';
import { Plus, Trash2, Calendar, Database, ListOrdered, Crown, Check, RefreshCw, UserCog, Skull, Clock, X, Edit, Trophy, Save, ShieldAlert, Bug } from 'lucide-react';
import { Guild, QueueEntry, GuildEvent, UserProfile, Boss, BreakingArmyConfig, ScheduleSlot, LeaderboardEntry } from '../types';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, arrayUnion, writeBatch, arrayRemove, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { CreateGuildModal } from '../components/modals/CreateGuildModal';
import { DeclareWinnerModal } from '../components/modals/DeclareWinnerModal';
import { EditLeaderboardModal } from '../components/modals/EditLeaderboardModal';

const Admin: React.FC = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'guilds' | 'events' | 'breakingArmy' | 'users' | 'leaderboard'>('events');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGuildData, setNewGuildData] = useState({ name: '', id: '', primaryGame: 'MMORPG X' });
  
  // Real Data State
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Breaking Army State
  const [currentBossMap, setCurrentBossMap] = useState<Record<string, string>>({});
  const [schedulesMap, setSchedulesMap] = useState<Record<string, ScheduleSlot[]>>({});
  const [bossPool, setBossPool] = useState<Boss[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [recentWinners, setRecentWinners] = useState<string[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

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

  // Fetch Data
  useEffect(() => {
    if (currentUser) {
        getDocs(query(collection(db, "users"))).then(snap => {
            const me = snap.docs.find(d => d.id === currentUser.uid);
            if (me) {
                const profile = me.data() as UserProfile;
                setUserProfile(profile);
                // Default tab selection based on role
                if (profile.systemRole === 'Admin') setActiveTab('guilds');
                else setActiveTab('events');
            }
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

    const unsubLeaderboard = onSnapshot(query(collection(db, "leaderboard"), orderBy("time")), snap => {
        setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderboardEntry)));
    });

    const unsubConfig = onSnapshot(doc(db, "system", "breakingArmy"), snap => {
      if (snap.exists()) {
        const data = snap.data() as BreakingArmyConfig;
        setCurrentBossMap(data.currentBoss || {});
        setSchedulesMap(data.schedules || {});
        setRecentWinners(data.recentWinners || []);
        setBossPool(data.bossPool || []);
      }
    });

    const unsubQueue = onSnapshot(collection(db, "queue"), snap => {
      setQueue(snap.docs.map(d => ({ ...d.data() } as QueueEntry)));
    });

    const unsubUsers = onSnapshot(collection(db, "users"), snap => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    return () => {
      unsubGuilds(); unsubEvents(); unsubConfig(); unsubQueue(); unsubUsers(); unsubLeaderboard();
    };
  }, [currentUser]);

  // Debug Helper
  const debugDataStructure = () => {
    console.group("Admin Debug Data");
    console.log("Guilds:", guilds);
    console.log("Events:", events);
    console.log("Leaderboard:", leaderboard);
    console.log("Users:", allUsers);
    console.log("Boss Pool:", bossPool);
    console.groupEnd();
    showAlert("Debug data logged to console", 'info');
  };

  // --- Handlers ---

  const handleInitialize = async () => {
    if (!window.confirm("This will overwrite/create default data. Continue?")) return;
    console.log("Initializing database...");
    
    try {
      for (const g of MOCK_GUILDS) {
        await setDoc(doc(db, "guilds", g.id), g);
      }
      
      const config: BreakingArmyConfig = {
        currentBoss: BREAKING_ARMY_CONFIG.currentBoss,
        schedules: BREAKING_ARMY_CONFIG.schedules,
        recentWinners: [],
        bossPool: [
          { name: 'Black God of Wealth', imageUrl: '' },
          { name: 'Dao Lord', imageUrl: '' },
          { name: 'Heartseeker', imageUrl: '' },
          { name: 'Lucky Seventeen', imageUrl: '' }
        ]
      };
      await setDoc(doc(db, "system", "breakingArmy"), config, { merge: true });

      for (const e of MOCK_EVENTS) {
         await addDoc(collection(db, "events"), e);
      }

      if (currentUser) {
          await updateDoc(doc(db, "users", currentUser.uid), { systemRole: 'Admin' });
          showAlert("System Initialized! You have been promoted to Admin.", 'success');
      } else {
          showAlert("System Initialized with Default Data!", 'success');
      }
      console.log("Initialization complete.");
    } catch (error: any) {
      console.error("Initialization failed:", error);
      showAlert(`Initialization failed: ${error.message}`, 'error');
    }
  };

  // Guilds
  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating guild:", newGuildData);
    try {
      await setDoc(doc(db, "guilds", newGuildData.id), newGuildData);
      setIsCreateModalOpen(false);
      console.log("Guild created.");
    } catch (error: any) {
      console.error("Error creating guild:", error);
      showAlert(`Failed to create guild: ${error.message}`, 'error');
    }
  };

  const handleDeleteGuild = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("Attempting to delete guild ID:", id);
    
    if (!id) {
        console.error("No guild ID provided");
        return;
    }
    
    if (!window.confirm("Delete this branch?")) return;
    
    try {
      const guildRef = doc(db, "guilds", id);
      console.log("Targeting document path:", guildRef.path);
      await deleteDoc(guildRef);
      console.log("Guild deleted successfully.");
      showAlert("Guild deleted", 'success');
    } catch (error: any) {
      console.error("Error deleting guild:", error);
      
      if (error.code === 'permission-denied') {
          showAlert("Permission Denied: Check Firebase Firestore Rules.", 'error');
      } else {
          showAlert(`Failed to delete guild: ${error.message}`, 'error');
      }
    }
  };

  // Events
  const handleSaveEvent = async () => {
    if (!eventForm.title || !eventForm.date) return showAlert("Fill required fields", 'error');
    
    try {
      if (editingEventId) {
          await updateDoc(doc(db, "events", editingEventId), eventForm);
          showAlert("Event updated", 'success');
          setEditingEventId(null);
      } else {
          await addDoc(collection(db, "events"), eventForm);
          showAlert("Event scheduled", 'success');
      }
      setEventForm({ title: '', description: '', type: 'Raid', date: '', guildId: '' });
    } catch (error: any) {
      console.error("Error saving event:", error);
      showAlert(`Failed to save event: ${error.message}`, 'error');
    }
  };

  const handleEditEvent = (e: React.MouseEvent, event: GuildEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setEditingEventId(event.id);
      setEventForm({
          title: event.title,
          description: event.description,
          type: event.type,
          date: event.date,
          guildId: event.guildId
      });
  };

  const handleCancelEditEvent = () => {
      setEditingEventId(null);
      setEventForm({ title: '', description: '', type: 'Raid', date: '', guildId: '' });
  };

  const handleDeleteEvent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("Attempting to delete event ID:", id);
    
    if (!id) {
        console.error("No event ID provided");
        return;
    }

    if(!window.confirm("Delete this event?")) return;

    try {
      const eventRef = doc(db, "events", id);
      console.log("Targeting document for deletion:", eventRef.path);
      
      // Verify existence first
      const docSnap = await getDoc(eventRef);
      if (!docSnap.exists()) {
          console.warn("Document does not exist in Firestore.");
          // We can proceed to delete anyway, or alert user. 
      }

      await deleteDoc(eventRef);
      console.log("Event deleted successfully.");
      showAlert("Event deleted", 'success');
    } catch (error: any) {
      console.error("Error deleting event:", error);
      if (error.code === 'permission-denied') {
          showAlert("Permission Denied: Check Firebase Rules.", 'error');
      } else {
          showAlert(`Failed to delete event: ${error.message}`, 'error');
      }
    }
  };

  // Bosses
  const handleSaveBoss = async () => {
    if (!bossForm.name) return;
    
    try {
      const newPool = [...bossPool];
      if (editingBossOriginalName) {
          const index = newPool.findIndex(b => b.name === editingBossOriginalName);
          if (index !== -1) {
              newPool[index] = bossForm;
          }
      } else {
          newPool.push(bossForm);
      }

      await setDoc(doc(db, "system", "breakingArmy"), { bossPool: newPool }, { merge: true });
      
      setBossForm({ name: '', imageUrl: '' });
      setEditingBossOriginalName(null);
      console.log("Boss saved successfully.");
    } catch (error: any) {
      console.error("Error saving boss:", error);
      showAlert(`Failed to save boss: ${error.message}`, 'error');
    }
  };

  const handleEditBoss = (e: React.MouseEvent, boss: Boss) => {
      e.stopPropagation();
      e.preventDefault();
      setBossForm(boss);
      setEditingBossOriginalName(boss.name);
  };

  const handleDeleteBoss = async (e: React.MouseEvent, bossName: string) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("Attempting to delete boss:", bossName);
    if (!bossName) return;
    if (!window.confirm(`Delete ${bossName}?`)) return;
    
    try {
      const newPool = bossPool.filter(b => b.name !== bossName);
      // Use setDoc with merge to ensure robust updating of the array
      await setDoc(doc(db, "system", "breakingArmy"), { bossPool: newPool }, { merge: true });
      
      console.log("Boss deleted successfully.");
      showAlert("Boss deleted", 'success');
    } catch (error: any) {
      console.error("Error deleting boss:", error);
      if (error.code === 'permission-denied') {
          showAlert("Permission Denied: Check Firebase Rules.", 'error');
      } else {
          showAlert(`Failed to delete boss: ${error.message}`, 'error');
      }
    }
  };

  const handleUpdateCurrentBoss = async (name: string) => {
    if (!selectedBranchId) return;
    try {
      const updatedMap = { ...currentBossMap, [selectedBranchId]: name };
      await setDoc(doc(db, "system", "breakingArmy"), { currentBoss: updatedMap }, { merge: true });
    } catch (error) {
      console.error("Error updating current boss:", error);
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedBranchId) return;
    try {
      const currentList = schedulesMap[selectedBranchId] || [];
      const updatedList = [...currentList, newSchedule];
      const updatedMap = { ...schedulesMap, [selectedBranchId]: updatedList };
      await setDoc(doc(db, "system", "breakingArmy"), { schedules: updatedMap }, { merge: true });
    } catch (error) {
      console.error("Error adding schedule:", error);
    }
  };

  const handleRemoveSchedule = async (index: number) => {
    if (!selectedBranchId) return;
    try {
      const currentList = schedulesMap[selectedBranchId] || [];
      const updatedList = currentList.filter((_, i) => i !== index);
      const updatedMap = { ...schedulesMap, [selectedBranchId]: updatedList };
      await setDoc(doc(db, "system", "breakingArmy"), { schedules: updatedMap }, { merge: true });
    } catch (error) {
      console.error("Error removing schedule:", error);
    }
  };

  const handleResetQueue = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.confirm("Clear entire queue? This cannot be undone.")) return;
    console.log("Resetting queue using batch operation...");
    try {
        const batch = writeBatch(db);
        const snap = await getDocs(collection(db, "queue"));
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        console.log("Queue cleared.");
        showAlert("Queue cleared successfully", 'success');
    } catch (error: any) {
        console.error("Error clearing queue:", error);
        showAlert(`Failed to clear queue: ${error.message}`, 'error');
    }
  };

  const handleRemoveWinner = async (e: React.MouseEvent, uid: string) => {
      e.stopPropagation();
      e.preventDefault();
      console.log("Removing winner cooldown for:", uid);
      if(!window.confirm("Remove this user from Recent Winners/Cooldown?")) return;
      try {
        await updateDoc(doc(db, "system", "breakingArmy"), {
            recentWinners: arrayRemove(uid)
        });
        console.log("User removed from cooldown.");
        showAlert("User removed from cooldown", 'success');
      } catch (err: any) {
        console.error("Error removing winner:", err);
        showAlert(`Failed to update winners list: ${err.message}`, 'error');
      }
  };

  const handleResetCooldowns = async () => {
    if (!window.confirm("Reset ALL cooldowns?")) return;
    try {
      await setDoc(doc(db, "system", "breakingArmy"), { recentWinners: [] }, { merge: true });
      showAlert("All cooldowns reset", 'success');
    } catch (error: any) {
      console.error("Error resetting cooldowns:", error);
      showAlert(`Failed to reset cooldowns: ${error.message}`, 'error');
    }
  };

  const handleConfirmWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWinner) return;

    try {
      // Direct deletion by ID since we use UID as Document ID for Queue entries
      console.log("Processing winner:", selectedWinner.uid);
      await deleteDoc(doc(db, "queue", selectedWinner.uid));

      await setDoc(doc(db, "system", "breakingArmy"), {
        recentWinners: arrayUnion(selectedWinner.uid)
      }, { merge: true });

      await addDoc(collection(db, "leaderboard"), {
          rank: 0, 
          playerName: selectedWinner.name,
          playerUid: selectedWinner.uid,
          branch: guilds.find(g => g.id === selectedWinner.guildId)?.name || 'Unknown',
          boss: currentBossMap[selectedWinner.guildId] || 'Unknown',
          time: winnerTime,
          date: new Date().toISOString().split('T')[0],
          status: 'verified'
      });

      setIsWinnerModalOpen(false);
      showAlert(`Winner Declared: ${selectedWinner.name}`, 'success');
    } catch (error: any) {
      console.error("Error confirming winner:", error);
      showAlert(`Failed to declare winner: ${error.message}`, 'error');
    }
  };

  // Leaderboard Management
  const handleUpdateLeaderboardEntry = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingLeaderboardEntry) return;
      
      try {
          await updateDoc(doc(db, "leaderboard", editingLeaderboardEntry.id), {
              playerName: editingLeaderboardEntry.playerName,
              playerUid: editingLeaderboardEntry.playerUid,
              boss: editingLeaderboardEntry.boss,
              time: editingLeaderboardEntry.time,
              branch: editingLeaderboardEntry.branch,
              date: editingLeaderboardEntry.date
          });
          showAlert("Leaderboard entry updated", 'success');
          setIsLeaderboardModalOpen(false);
          setEditingLeaderboardEntry(null);
      } catch (err: any) {
          console.error("Error updating leaderboard:", err);
          showAlert(`Failed to update entry: ${err.message}`, 'error');
      }
  };

  const handleDeleteLeaderboardEntry = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      console.log("Attempting to delete leaderboard entry:", id);
      if(!id) return;
      if(!window.confirm("Delete this leaderboard entry?")) return;
      
      try {
        const lbRef = doc(db, "leaderboard", id);
        console.log("Deleting doc:", lbRef.path);
        
        await deleteDoc(lbRef);
        console.log("Leaderboard entry deleted.");
        showAlert("Entry deleted", 'success');
      } catch (error: any) {
        console.error("Error deleting leaderboard entry:", error);
        console.error("Error Code:", error.code);
        if (error.code === 'permission-denied') {
            showAlert("Permission Denied: Check Firebase Rules.", 'error');
        } else {
            showAlert(`Failed to delete entry: ${error.message}`, 'error');
        }
      }
  };

  // User Management
  const handleUpdateRole = async (uid: string, newRole: 'Member' | 'Officer' | 'Admin') => {
    try {
      await updateDoc(doc(db, "users", uid), { systemRole: newRole });
      console.log(`Role updated for ${uid} to ${newRole}`);
    } catch (error: any) {
      console.error("Error updating role:", error);
      showAlert(`Failed to update role: ${error.message}`, 'error');
    }
  };

  const handleKickUser = async (e: React.MouseEvent, user: UserProfile) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("Attempting to kick/delete user:", user.uid);
    if (!window.confirm(`Kick ${user.displayName}? This deletes their profile data.`)) return;
    
    try {
        await deleteDoc(doc(db, "users", user.uid));
        console.log("User deleted successfully.");
        showAlert("User kicked/deleted", 'success');
    } catch (error: any) {
        console.error("Error deleting user:", error);
        if (error.code === 'permission-denied') {
            showAlert("Permission Denied: Check Firebase Rules.", 'error');
        } else {
            showAlert(`Failed to delete user: ${error.message}`, 'error');
        }
    }
  };

  const formatTimeInput = (val: string) => {
    let clean = val.replace(/\D/g, '').substring(0, 4);
    if (clean.length >= 2) {
      return `${clean.substring(0, 2)}:${clean.substring(2)}`;
    }
    return clean;
  };

  const filteredQueue = queue.filter(q => q.guildId === selectedBranchId);
  const isAdmin = userProfile?.systemRole === 'Admin';
  const currentBranchBoss = currentBossMap[selectedBranchId] || '';
  const currentBranchSchedule = schedulesMap[selectedBranchId] || [];

  // Security Check
  if (!currentUser) return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Please Sign In.</div>;
  if (guilds.length > 0 && userProfile?.systemRole === 'Member') return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Admins/Officers only.</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Administration</h2>
        <div className="flex gap-2">
            <button onClick={debugDataStructure} type="button" className="bg-zinc-800 text-white px-3 py-2 rounded-lg hover:bg-zinc-700 flex items-center gap-2 text-xs font-mono">
                <Bug size={14} /> Debug
            </button>
            <button onClick={handleInitialize} type="button" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium">
                <Database size={16} /> Initialize System
            </button>
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
        <button onClick={() => setActiveTab('events')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'events' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Events</button>
        <button onClick={() => setActiveTab('breakingArmy')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'breakingArmy' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Breaking Army</button>
        <button onClick={() => setActiveTab('leaderboard')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'leaderboard' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Leaderboard</button>
        {isAdmin && (
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'users' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>User Management</button>
        )}
      </div>

      {/* GUILDS TAB (Admins Only) */}
      {activeTab === 'guilds' && isAdmin && (
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
                         <button type="button" onClick={(e) => handleDeleteGuild(e, g.id)} className="text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
          </div>
        </div>
      )}
      
      {/* EVENTS TAB */}
      {activeTab === 'events' && (
        <div className="space-y-6">
           <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                {editingEventId ? "Edit Event" : "Create New Event"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="text" placeholder="Title" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className="p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
              <select value={eventForm.guildId} onChange={e => setEventForm({...eventForm, guildId: e.target.value})} className="p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white">
                <option value="">Global / All Branches</option>
                {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <select value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value as any})} className="p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white">
                  <option>Raid</option><option>PvP</option><option>Meeting</option><option>Social</option>
                </select>
               <input type="datetime-local" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
             </div>
             <textarea placeholder="Description" value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} className="p-2 border rounded h-24 w-full mb-4 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
             <div className="flex gap-2">
                <button type="button" onClick={handleSaveEvent} className="bg-rose-900 text-white px-4 py-2 rounded-md hover:bg-rose-950 flex gap-2">
                    {editingEventId ? <Save size={16} /> : <Calendar size={16} />}
                    {editingEventId ? "Update Event" : "Schedule"}
                </button>
                {editingEventId && (
                    <button type="button" onClick={handleCancelEditEvent} className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-4 py-2 rounded-md hover:bg-zinc-300">
                        Cancel Edit
                    </button>
                )}
             </div>
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
                      <div className="flex gap-2">
                        <button type="button" onClick={(e) => handleEditEvent(e, event)} className="text-zinc-400 hover:text-blue-600 p-2"><Edit size={18} /></button>
                        <button type="button" onClick={(e) => handleDeleteEvent(e, event.id)} className="text-zinc-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                      </div>
                  </div>
             ))}
           </div>
        </div>
      )}

      {/* BREAKING ARMY TAB */}
      {activeTab === 'breakingArmy' && (
        <div className="space-y-8">
             
             {/* Top Row: Config & Queue */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Left Column: Config */}
                 <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                     <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Configuration</h3>
                        <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} className="p-2 border rounded dark:bg-zinc-800 dark:text-white text-sm">
                            {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Active Boss for Branch</label>
                        <select value={currentBranchBoss} onChange={e => handleUpdateCurrentBoss(e.target.value)} className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white">
                            <option value="">Select Boss...</option>
                            {bossPool.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Weekly Schedule</label>
                        <div className="space-y-2 mb-3">
                            {currentBranchSchedule.map((slot, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border dark:border-zinc-700">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-zinc-400" />
                                        <span className="text-sm dark:text-zinc-200 font-medium">{slot.day} @ {slot.time}</span>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveSchedule(idx)} className="text-zinc-400 hover:text-red-600"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                             <select value={newSchedule.day} onChange={e => setNewSchedule({...newSchedule, day: e.target.value})} className="flex-1 p-2 border rounded dark:bg-zinc-800 dark:text-white text-sm">
                                 {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                             </select>
                             <input type="time" value={newSchedule.time} onChange={e => setNewSchedule({...newSchedule, time: e.target.value})} className="w-24 p-2 border rounded dark:bg-zinc-800 dark:text-white text-sm" />
                             <button type="button" onClick={handleAddSchedule} className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 px-3 rounded"><Plus size={16} /></button>
                        </div>
                     </div>
                     
                     <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Global Actions</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={handleResetQueue} className="flex-1 text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded flex gap-2 items-center justify-center border border-red-100 dark:border-red-900/30 hover:bg-red-100 text-xs font-bold"><Trash2 size={14} /> Clear All Queues</button>
                            <button type="button" onClick={handleResetCooldowns} className="flex-1 text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded flex gap-2 items-center justify-center border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 text-xs font-bold"><RefreshCw size={14} /> Reset Cooldowns</button>
                        </div>
                     </div>
                 </div>

                 {/* Right Column: Manage Queue */}
                 <div className="flex flex-col gap-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[300px]">
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><ListOrdered size={18} /> Queue</h3>
                            <span className="font-bold text-rose-900 dark:text-rose-500 text-sm">{guilds.find(g => g.id === selectedBranchId)?.name || 'Select Branch'}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 sticky top-0">
                                <tr><th className="px-4 py-2">Player</th><th className="px-4 py-2 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filteredQueue.length === 0 ? (
                                    <tr><td colSpan={2} className="px-6 py-8 text-center text-zinc-400">Queue empty.</td></tr>
                                ) : (
                                    filteredQueue.map(entry => (
                                        <tr key={entry.uid}>
                                        <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">{entry.name}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button type="button" onClick={() => { setSelectedWinner(entry); setIsWinnerModalOpen(true); }} className="bg-yellow-100 text-yellow-700 p-1.5 rounded hover:bg-yellow-200" title="Declare Winner"><Crown size={16} /></button>
                                        </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Winners / Cooldown Table */}
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[300px]">
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                             <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><ShieldAlert size={18} /> Recent Winners (Cooldown)</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 sticky top-0">
                                    <tr><th className="px-4 py-2">Player</th><th className="px-4 py-2 text-right">Remove</th></tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {recentWinners.length === 0 ? (
                                        <tr><td colSpan={2} className="px-6 py-8 text-center text-zinc-400">No users on cooldown.</td></tr>
                                    ) : (
                                        recentWinners.map(uid => {
                                            const u = allUsers.find(user => user.uid === uid);
                                            return (
                                                <tr key={uid}>
                                                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{u?.displayName || uid}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button type="button" onClick={(e) => handleRemoveWinner(e, uid)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                             </table>
                        </div>
                    </div>
                 </div>
             </div>
             
             {/* Bottom Row: Bosses */}
             <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2"><Skull size={18} /> Bosses</h4>
                <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="Boss Name" value={bossForm.name} onChange={e => setBossForm({...bossForm, name: e.target.value})} className="flex-1 p-2 border rounded dark:bg-zinc-800 dark:text-white" />
                    <input type="text" placeholder="Image URL (Optional)" value={bossForm.imageUrl} onChange={e => setBossForm({...bossForm, imageUrl: e.target.value})} className="flex-1 p-2 border rounded dark:bg-zinc-800 dark:text-white" />
                    <button type="button" onClick={handleSaveBoss} className="bg-zinc-900 text-white px-4 py-2 rounded flex items-center gap-2">
                        {editingBossOriginalName ? <Save size={16} /> : <Plus size={16} />}
                        {editingBossOriginalName ? "Save Changes" : "Add Boss"}
                    </button>
                    {editingBossOriginalName && <button type="button" onClick={() => { setEditingBossOriginalName(null); setBossForm({name:'', imageUrl:''}); }} className="bg-zinc-200 text-zinc-700 px-3 rounded">Cancel</button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto custom-scrollbar">
                    {bossPool.map(b => (
                        <div key={b.name} className={`flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded border ${editingBossOriginalName === b.name ? 'border-rose-500' : 'border-zinc-100 dark:border-zinc-800'}`}>
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                                    {b.imageUrl ? <img src={b.imageUrl} className="w-full h-full object-cover" /> : <Skull className="m-2 text-zinc-400" />}
                                </div>
                                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{b.name}</span>
                             </div>
                             <div className="flex gap-1">
                                 <button type="button" onClick={(e) => handleEditBoss(e, b)} className="text-zinc-400 hover:text-blue-500 p-1"><Edit size={14} /></button>
                                 <button type="button" onClick={(e) => handleDeleteBoss(e, b.name)} className="text-zinc-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                             </div>
                        </div>
                    ))}
                </div>
             </div>
        </div>
      )}

      {/* LEADERBOARD TAB (Admin/Officer) */}
      {activeTab === 'leaderboard' && (
          <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Leaderboard Records</h3>
                      <button type="button" onClick={() => { setEditingLeaderboardEntry({id:'', rank:0, playerName:'', playerUid:'', branch:guilds[0]?.name, boss:bossPool[0]?.name, time:'', date:new Date().toISOString().split('T')[0], status:'verified'}); setIsLeaderboardModalOpen(true); }} className="text-xs bg-zinc-900 text-white px-3 py-1.5 rounded hover:bg-zinc-800">Add Record Manually</button>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                              <tr>
                                  <th className="px-6 py-3">Player</th>
                                  <th className="px-6 py-3">Boss</th>
                                  <th className="px-6 py-3">Time</th>
                                  <th className="px-6 py-3">Date</th>
                                  <th className="px-6 py-3">Branch</th>
                                  <th className="px-6 py-3 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                              {leaderboard.map(entry => (
                                  <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                      <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">{entry.playerName}</td>
                                      <td className="px-6 py-3 text-zinc-600 dark:text-zinc-300">{entry.boss}</td>
                                      <td className="px-6 py-3 font-mono">{entry.time}</td>
                                      <td className="px-6 py-3 text-zinc-500">{entry.date}</td>
                                      <td className="px-6 py-3 text-zinc-500">{entry.branch}</td>
                                      <td className="px-6 py-3 text-right">
                                          <button type="button" onClick={() => { setEditingLeaderboardEntry(entry); setIsLeaderboardModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-2"><Edit size={16} /></button>
                                          <button type="button" onClick={(e) => handleDeleteLeaderboardEntry(e, entry.id)} className="text-red-600 hover:text-red-800 p-2"><Trash2 size={16} /></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* USER MANAGEMENT TAB (Admin Only) */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-6">
           <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                 <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                   <tr>
                     <th className="px-6 py-3">User</th>
                     <th className="px-6 py-3">In-Game ID</th>
                     <th className="px-6 py-3">Guild</th>
                     <th className="px-6 py-3">System Role</th>
                     <th className="px-6 py-3 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                   {allUsers.map(user => (
                     <tr key={user.uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                       <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-zinc-200 overflow-hidden">
                               {user.photoURL && <img src={user.photoURL} className="w-full h-full object-cover" />}
                             </div>
                             <div>
                               <div className="font-bold text-zinc-900 dark:text-zinc-100">{user.displayName}</div>
                               <div className="text-xs text-zinc-500">{user.email}</div>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-3 font-mono text-zinc-500">{user.inGameId}</td>
                       <td className="px-6 py-3 text-zinc-600 dark:text-zinc-300">{guilds.find(g => g.id === user.guildId)?.name || '-'}</td>
                       <td className="px-6 py-3">
                          <select 
                            value={user.systemRole || 'Member'} 
                            onChange={(e) => handleUpdateRole(user.uid, e.target.value as any)}
                            className="bg-zinc-100 dark:bg-zinc-800 border-none rounded px-2 py-1 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 cursor-pointer"
                          >
                             <option value="Member">Member</option>
                             <option value="Officer">Officer</option>
                             <option value="Admin">Admin</option>
                          </select>
                       </td>
                       <td className="px-6 py-3 text-right">
                          <button type="button" onClick={(e) => handleKickUser(e, user)} className="text-red-500 hover:bg-red-50 p-2 rounded" title="Kick User (Delete Profile)"><Trash2 size={16} /></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Modals */}
      <CreateGuildModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateGuild} data={newGuildData} onChange={setNewGuildData} />
      <DeclareWinnerModal 
        isOpen={isWinnerModalOpen} 
        onClose={() => setIsWinnerModalOpen(false)} 
        winnerName={selectedWinner?.name || ''} 
        time={winnerTime} 
        onTimeChange={(val) => setWinnerTime(formatTimeInput(val))} 
        onConfirm={handleConfirmWinner} 
      />
      <EditLeaderboardModal
        isOpen={isLeaderboardModalOpen}
        onClose={() => setIsLeaderboardModalOpen(false)}
        entry={editingLeaderboardEntry}
        setEntry={setEditingLeaderboardEntry}
        onUpdate={handleUpdateLeaderboardEntry}
        bossPool={bossPool}
        guilds={guilds}
        allUsers={allUsers}
      />
    </div>
  );
};

export default Admin;
