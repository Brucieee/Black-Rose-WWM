
import React, { useState, useEffect } from 'react';
import { BREAKING_ARMY_CONFIG, MOCK_GUILDS, MOCK_EVENTS } from '../services/mockData';
import { Plus, Trash2, Calendar, Database, ListOrdered, Crown, Check, RefreshCw, Skull, Clock, X, Edit, Trophy, Save, ShieldAlert, FileText, Gift } from 'lucide-react';
import { Guild, QueueEntry, GuildEvent, UserProfile, Boss, BreakingArmyConfig, ScheduleSlot, LeaderboardEntry, CooldownEntry, WinnerLog } from '../types';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, arrayUnion, writeBatch, arrayRemove, where } from 'firebase/firestore';
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
  const [activeTab, setActiveTab] = useState<'guilds' | 'events' | 'breakingArmy' | 'users' | 'leaderboard' | 'winnerLogs'>('events');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGuildData, setNewGuildData] = useState({ name: '', id: ''});
  
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

    const unsubWinnerLogs = onSnapshot(query(collection(db, "winner_logs"), orderBy("date", "desc")), snap => {
      setWinnerLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as WinnerLog)));
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
      unsubGuilds(); unsubEvents(); unsubConfig(); unsubQueue(); unsubUsers(); unsubLeaderboard(); unsubWinnerLogs();
    };
  }, [currentUser]);

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

  // --- Handlers ---

  const handleInitialize = async () => {
    openDeleteModal(
        "Initialize System?",
        "This will overwrite/create default data for Guilds, Config, and Events. Continue?",
        async () => {
            console.log("Initializing database...");
            try {
                for (const g of MOCK_GUILDS) {
                    await setDoc(doc(db, "guilds", g.id), { name: g.name });
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
        }
    );
  };

  // Guilds
  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating guild:", newGuildData);
    try {
      await setDoc(doc(db, "guilds", newGuildData.id), {name: newGuildData.name});
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
    if (!id) return;

    openDeleteModal("Delete Branch?", "This action cannot be undone.", async () => {
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
    });
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
    if (!id) return;

    openDeleteModal("Delete Event?", "This event will be removed permanently.", async () => {
        try {
            const eventRef = doc(db, "events", id);
            console.log("Targeting document for deletion:", eventRef.path);
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
    });
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
    if (!bossName) return;

    openDeleteModal(`Delete ${bossName}?`, "This boss will be removed from the pool.", async () => {
        try {
            const newPool = bossPool.filter(b => b.name !== bossName);
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
    });
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
    const currentList = schedulesMap[selectedBranchId] || [];
    if (currentList.length >= 2) {
      showAlert("You can only add a maximum of 2 schedules per branch.", 'error');
      return;
    }
    try {
      const updatedList = [...currentList, newSchedule];
      const updatedMap = { ...schedulesMap, [selectedBranchId]: updatedList };
      await setDoc(doc(db, "system", "breakingArmy"), { schedules: updatedMap }, { merge: true });
    } catch (error) {
      console.error("Error adding schedule:", error);
    }
  };

  const handleRemoveSchedule = async (index: number) => {
    if (!selectedBranchId) return;
    
    openDeleteModal(
        "Remove Schedule Slot?",
        "This will remove the selected time from the weekly schedule.",
        async () => {
            try {
                const currentList = schedulesMap[selectedBranchId] || [];
                const updatedList = currentList.filter((_, i) => i !== index);
                const updatedMap = { ...schedulesMap, [selectedBranchId]: updatedList };
                await setDoc(doc(db, "system", "breakingArmy"), { schedules: updatedMap }, { merge: true });
                showAlert("Schedule removed", 'success');
            } catch (error: any) {
                console.error("Error removing schedule:", error);
                showAlert(`Failed to remove schedule: ${error.message}`, 'error');
            }
        }
    );
  };

  const handleResetQueue = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    const branchName = guilds.find(g => g.id === selectedBranchId)?.name || selectedBranchId;

    openDeleteModal(`Clear Queue for ${branchName}?`, "This will remove everyone from this branch's queue.", async () => {
        console.log(`Resetting queue for ${selectedBranchId}...`);
        try {
            const batch = writeBatch(db);
            const q = query(collection(db, "queue"), where("guildId", "==", selectedBranchId));
            const snap = await getDocs(q);
            
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            console.log("Queue cleared for branch.");
            showAlert("Branch queue cleared successfully", 'success');
        } catch (error: any) {
            console.error("Error clearing queue:", error);
            showAlert(`Failed to clear queue: ${error.message}`, 'error');
        }
    });
  };

  const handleRemoveWinner = async (e: React.MouseEvent, uid: string) => {
      e.stopPropagation();
      e.preventDefault();
      openDeleteModal("Remove Cooldown?", "User will be able to join the queue again.", async () => {
          try {
            const newWinners = recentWinners.filter(w => w.uid !== uid);
            await updateDoc(doc(db, "system", "breakingArmy"), {
                recentWinners: newWinners
            });
            console.log("User removed from cooldown.");
            showAlert("User removed from cooldown", 'success');
          } catch (err: any) {
            console.error("Error removing winner:", err);
            showAlert(`Failed to update winners list: ${err.message}`, 'error');
          }
      });
  };

  const handleTogglePrize = async (uid: string, currentStatus: boolean) => {
      try {
          const newWinners = recentWinners.map(w => {
              if (w.uid === uid) {
                  return { ...w, prizeGiven: !currentStatus };
              }
              return w;
          });
          await updateDoc(doc(db, "system", "breakingArmy"), { recentWinners: newWinners });
      } catch (err: any) {
          console.error("Error toggling prize:", err);
      }
  };

  const handleResetCooldowns = async () => {
    if (!selectedBranchId) return;
    const branchName = guilds.find(g => g.id === selectedBranchId)?.name || selectedBranchId;

    openDeleteModal(`Reset Winners for ${branchName}?`, "Winners from this branch will be able to join the queue again.", async () => {
        try {
            const newWinners = recentWinners.filter(w => w.branchId !== selectedBranchId);

            await setDoc(doc(db, "system", "breakingArmy"), { recentWinners: newWinners }, { merge: true });
            showAlert(`Winners reset for ${branchName}`, 'success');
        } catch (error: any) {
            console.error("Error resetting winners:", error);
            showAlert(`Failed to reset winners: ${error.message}`, 'error');
        }
    });
  };

  const handleConfirmWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWinner) return;

    try {
      console.log("Processing winner:", selectedWinner.uid);
      await deleteDoc(doc(db, "queue", selectedWinner.uid));

      const winnerEntry: CooldownEntry = {
          uid: selectedWinner.uid,
          branchId: selectedWinner.guildId,
          timestamp: new Date().toISOString(),
          prizeGiven: false
      };

      await updateDoc(doc(db, "system", "breakingArmy"), {
        recentWinners: arrayUnion(winnerEntry)
      });
      
      const winnerLogData = {
          rank: 0, 
          playerName: selectedWinner.name,
          playerUid: selectedWinner.uid,
          branch: guilds.find(g => g.id === selectedWinner.guildId)?.name || 'Unknown',
          boss: currentBossMap[selectedWinner.guildId] || 'Unknown',
          time: winnerTime,
          date: new Date().toISOString().split('T')[0],
          status: 'verified' as const
      };

      await addDoc(collection(db, "leaderboard"), winnerLogData);
      await addDoc(collection(db, "winner_logs"), winnerLogData);

      setIsWinnerModalOpen(false);
      showAlert(`Winner Declared: ${selectedWinner.name}`, 'success');
    } catch (error: any) {
      console.error("Error confirming winner:", error);
      showAlert(`Failed to declare winner: ${error.message}`, 'error');
    }
  };

  // Leaderboard/Logs Management
  const handleUpdateLogEntry = async (e: React.FormEvent, collectionName: 'leaderboard' | 'winner_logs') => {
      e.preventDefault();
      if (!editingLeaderboardEntry) return;
      
      try {
          const { id, ...dataToSave } = editingLeaderboardEntry;
          if (id) {
              await updateDoc(doc(db, collectionName, id), dataToSave);
              showAlert("Entry updated", 'success');
          } else {
              await addDoc(collection(db, collectionName), dataToSave);
              showAlert("New record added", 'success');
          }
          
          setIsLeaderboardModalOpen(false);
          setEditingLeaderboardEntry(null);
      } catch (err: any) {
          console.error(`Error updating ${collectionName}:`, err);
          showAlert(`Failed to update entry: ${err.message}`, 'error');
      }
  };

  const handleDeleteLogEntry = async (e: React.MouseEvent, id: string, collectionName: 'leaderboard' | 'winner_logs') => {
      e.stopPropagation();
      e.preventDefault();
      if(!id) return;

      openDeleteModal("Delete Record?", "This entry will be permanently removed.", async () => {
          try {
            const ref = doc(db, collectionName, id);
            await deleteDoc(ref);
            showAlert("Entry deleted", 'success');
          } catch (error: any) {
            console.error(`Error deleting from ${collectionName}:`, error);
            if (error.code === 'permission-denied') {
                showAlert("Permission Denied: Check Firebase Rules.", 'error');
            } else {
                showAlert(`Failed to delete entry: ${error.message}`, 'error');
            }
          }
      });
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
    openDeleteModal(`Kick ${user.displayName}?`, "This will permanently delete their profile data.", async () => {
        try {
            await deleteDoc(doc(db, "users", user.uid));
            showAlert("User kicked/deleted", 'success');
        } catch (error: any) {
            console.error("Error deleting user:", error);
            if (error.code === 'permission-denied') {
                showAlert("Permission Denied: Check Firebase Rules.", 'error');
            } else {
                showAlert(`Failed to delete user: ${error.message}`, 'error');
            }
        }
    });
  };

  const formatTimeInput = (val: string) => {
    let clean = val.replace(/\D/g, '').substring(0, 4);
    if (clean.length >= 2) {
      return `${clean.substring(0, 2)}:${clean.substring(2)}`;
    }
    return clean;
  };

  // Filter queues by selected branch
  const filteredQueue = queue.filter(q => q.guildId === selectedBranchId);
  const filteredWinners = recentWinners.filter(w => w.branchId === selectedBranchId);
  
  const isAdmin = userProfile?.systemRole === 'Admin';
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
        <button onClick={() => setActiveTab('events')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'events' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Events</button>
        <button onClick={() => setActiveTab('breakingArmy')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'breakingArmy' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Breaking Army</button>
        {isAdmin && <button onClick={() => setActiveTab('leaderboard')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'leaderboard' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Leaderboard</button>}
        {isAdmin && <button onClick={() => setActiveTab('winnerLogs')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'winnerLogs' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Winner Logs</button>}
        {isAdmin && (
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'users' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>User Management</button>
        )}
      </div>

      {/* GUILDS TAB */}
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
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                     <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 flex-wrap gap-4">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Configuration</h3>
                        <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} className="p-2 border rounded dark:bg-zinc-800 dark:text-white text-sm">
                            {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                     </div>

                     {isAdmin && (
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Active Boss for Branch</label>
                            <div className="flex gap-2 items-center">
                                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden flex-shrink-0 border dark:border-zinc-700 flex items-center justify-center">
                                    {activeBossImage ? (
                                        <img src={activeBossImage} alt="Boss" className="w-full h-full object-cover" />
                                    ) : (
                                        <Skull size={20} className="text-zinc-300 dark:text-zinc-600" />
                                    )}
                                </div>
                                <select value={currentBranchBoss} onChange={e => handleUpdateCurrentBoss(e.target.value)} className="flex-1 p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white">
                                    <option value="">Select Boss...</option>
                                    {bossPool.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>
                     )}

                     <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Weekly Schedule</label>
                        <div className="space-y-2 mb-3">
                            {currentBranchSchedule.map((slot, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border dark:border-zinc-700">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-zinc-400" />
                                        <span className="text-sm dark:text-zinc-200 font-medium">
                                            {slot.day} @ {formatTime12Hour(slot.time)}
                                        </span>
                                    </div>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveSchedule(idx); }} className="text-zinc-400 hover:text-red-600"><X size={14} /></button>
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
                            <button type="button" onClick={handleResetQueue} className="flex-1 text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded flex gap-2 items-center justify-center border border-red-100 dark:border-red-900/30 hover:bg-red-100 text-xs font-bold"><Trash2 size={14} /> Clear Queue ({guilds.find(g => g.id === selectedBranchId)?.name})</button>
                            <button type="button" onClick={handleResetCooldowns} className="flex-1 text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded flex gap-2 items-center justify-center border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 text-xs font-bold"><RefreshCw size={14} /> Reset Winners ({guilds.find(g => g.id === selectedBranchId)?.name})</button>
                        </div>
                     </div>
                 </div>

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

                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[300px]">
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                             <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><ShieldAlert size={18} /> Recent Winners (Cooldown)</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 sticky top-0">
                                    <tr><th className="px-4 py-2">Player</th><th className="px-4 py-2">Prize</th><th className="px-4 py-2 text-right">Remove</th></tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {filteredWinners.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-8 text-center text-zinc-400">No recent winners for this branch.</td></tr>
                                    ) : (
                                        filteredWinners.map(winner => {
                                            const u = allUsers.find(user => user.uid === winner.uid);
                                            return (
                                                <tr key={winner.uid}>
                                                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{u?.displayName || winner.uid}</td>
                                                    <td className="px-4 py-3">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={winner.prizeGiven} 
                                                                onChange={() => handleTogglePrize(winner.uid, winner.prizeGiven)}
                                                                className="rounded border-zinc-300 text-rose-900 focus:ring-rose-900"
                                                            />
                                                            <span className={`text-xs ${winner.prizeGiven ? 'text-green-600 font-bold' : 'text-zinc-400'}`}>
                                                                {winner.prizeGiven ? 'Given' : 'Pending'}
                                                            </span>
                                                        </label>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button type="button" onClick={(e) => handleRemoveWinner(e, winner.uid)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
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
             
             {isAdmin && (
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
             )}
        </div>
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === 'leaderboard' && isAdmin && (
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
                                  <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Player</th>
                                  <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Boss</th>
                                  <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Time</th>
                                  <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Date</th>
                                  <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Branch</th>
                                  <th className="px-6 py-3 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                              {leaderboard.map(entry => (
                                  <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                      <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">{entry.playerName}</td>
                                      <td className="px-6 py-3 text-zinc-600 dark:text-zinc-100">{entry.boss}</td>
                                      <td className="px-6 py-3 font-mono text-zinc-600 dark:text-zinc-300">{entry.time}</td>
                                      <td className="px-6 py-3 text-zinc-500 dark:text-zinc-200">{formatDateMMDDYYYY(entry.date)}</td>
                                      <td className="px-6 py-3 text-zinc-500 dark:text-zinc-300">{entry.branch}</td>
                                      <td className="px-6 py-3 text-right">
                                          <button type="button" onClick={() => { setEditingLeaderboardEntry(entry); setIsLeaderboardModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-2"><Edit size={16} /></button>
                                          <button type="button" onClick={(e) => handleDeleteLogEntry(e, entry.id, 'leaderboard')} className="text-red-600 hover:text-red-800 p-2"><Trash2 size={16} /></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* WINNER LOGS TAB */}
      {activeTab === 'winnerLogs' && (
          <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Gift size={18} /> Winner History</h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                              <tr>
                                  <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Date</th>
                                  <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Winner</th>
                                  <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Boss</th>
                                  <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Time</th>
                                  <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Branch</th>
                                  {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                              {winnerLogs.map(entry => (
                                  <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                      <td className="px-6 py-3 text-zinc-500 dark:text-zinc-300 font-mono">{formatDateMMDDYYYY(entry.date)}</td>
                                      <td className="px-6 py-3 font-bold text-zinc-900 dark:text-zinc-100">{entry.playerName}</td>
                                      <td className="px-6 py-3 text-zinc-600 dark:text-zinc-100">{entry.boss}</td>
                                      <td className="px-6 py-3 font-mono text-zinc-600 dark:text-zinc-300">{entry.time}</td>
                                      <td className="px-6 py-3 text-zinc-500 dark:text-zinc-400">{entry.branch}</td>
                                      {isAdmin && (
                                        <td className="px-6 py-3 text-right">
                                            <button type="button" onClick={() => { setEditingLeaderboardEntry(entry); setIsLeaderboardModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-2"><Edit size={16} /></button>
                                            <button type="button" onClick={(e) => handleDeleteLogEntry(e, entry.id, 'winner_logs')} className="text-red-600 hover:text-red-800 p-2"><Trash2 size={16} /></button>
                                        </td>
                                      )}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* USER MANAGEMENT TAB */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-6">
           <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                 <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                   <tr>
                     <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">User</th>
                     <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">In-Game ID</th>
                     <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">Guild</th>
                     <th className="px-6 py-3 text-zinc-500 dark:text-zinc-400">System Role</th>
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
                       <td className="px-6 py-3 font-mono text-zinc-500 dark:text-zinc-400">{user.inGameId}</td>
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
        onUpdate={(e) => handleUpdateLogEntry(e, activeTab === 'leaderboard' ? 'leaderboard' : 'winner_logs')}
        bossPool={bossPool}
        guilds={guilds}
        allUsers={allUsers}
      />
      <ConfirmationModal
        isOpen={deleteConf.isOpen}
        onClose={() => setDeleteConf({ ...deleteConf, isOpen: false })}
        onConfirm={deleteConf.action}
        title={deleteConf.title}
        message={deleteConf.message}
      />
    </div>
  );
};

export default Admin;