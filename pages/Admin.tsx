
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Database, Crown, Check, RefreshCw, Skull, Clock, X, Edit, Trophy, Save, ShieldAlert, FileText, Gift, CheckCircle, Search, User, ListOrdered } from 'lucide-react';
import { Guild, QueueEntry, GuildEvent, UserProfile, Boss, BreakingArmyConfig, ScheduleSlot, LeaderboardEntry, CooldownEntry, WinnerLog } from '../types';
import { db } from '../services/firebase';
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
  
  const [activeTab, setActiveTab] = useState<'guilds' | 'events' | 'breakingArmy' | 'users' | 'leaderboard' | 'winnerLogs'>('guilds');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGuildData, setNewGuildData] = useState({ name: '', id: '', memberCap: 80});
  
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [winnerLogs, setWinnerLogs] = useState<WinnerLog[]>([]);
  
  const [currentBossMap, setCurrentBossMap] = useState<Record<string, string>>({});
  const [schedulesMap, setSchedulesMap] = useState<Record<string, ScheduleSlot[]>>({});
  const [bossPool, setBossPool] = useState<Boss[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [recentWinners, setRecentWinners] = useState<CooldownEntry[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const [editingGuildId, setEditingGuildId] = useState<string | null>(null);
  const [guildEditForm, setGuildEditForm] = useState({ name: '', memberCap: 80 });

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<Partial<GuildEvent>>({
    title: '', description: '', type: 'Raid', date: '', guildId: ''
  });

  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<QueueEntry | null>(null);
  const [winnerTime, setWinnerTime] = useState('');

  const [editingBossOriginalName, setEditingBossOriginalName] = useState<string | null>(null);
  const [bossForm, setBossForm] = useState({ name: '', imageUrl: '' });

  const [newSchedule, setNewSchedule] = useState({ day: 'Wednesday', time: '20:00' });

  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [editingLeaderboardEntry, setEditingLeaderboardEntry] = useState<LeaderboardEntry | null>(null);

  const [deleteConf, setDeleteConf] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', action: async () => {} });

  const isAdmin = userProfile?.systemRole === 'Admin';
  const isOfficer = userProfile?.systemRole === 'Officer';

  useEffect(() => {
    if (currentUser) {
        const unsubUser = db.collection("users").doc(currentUser.uid).onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const profile = docSnap.data() as UserProfile;
                setUserProfile(profile);
                
                // If officer, lock to their guild
                if (profile.systemRole === 'Officer' && !selectedBranchId) {
                    setSelectedBranchId(profile.guildId);
                }
            }
        });
        return () => unsubUser();
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubGuilds = db.collection("guilds").orderBy("name").onSnapshot(snap => {
      const g = snap.docs.map(d => ({ id: d.id, ...d.data() } as Guild));
      setGuilds(g);
      // If admin and no selection, select first
      if (g.length > 0 && !selectedBranchId && isAdmin) {
          setSelectedBranchId(g[0].id);
      }
    });

    const unsubEvents = db.collection("events").onSnapshot(snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as GuildEvent)));
    });

    const unsubLeaderboard = db.collection("leaderboard").orderBy("time").onSnapshot(snap => {
        setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderboardEntry)));
    });

    const unsubWinnerLogs = db.collection("winner_logs").orderBy("date", "desc").onSnapshot(snap => {
      setWinnerLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as WinnerLog)));
    });

    const unsubConfig = db.collection("system").doc("breakingArmy").onSnapshot(snap => {
      if (snap.exists) {
        const data = snap.data() as BreakingArmyConfig;
        setCurrentBossMap(data.currentBoss || {});
        setSchedulesMap(data.schedules || {});
        setRecentWinners(data.recentWinners || []);
        setBossPool(data.bossPool || []);
      }
    });

    // FIFO Queue for Admin: Order by joinedAt ascending
    const unsubQueue = db.collection("queue").orderBy("joinedAt", "asc").onSnapshot(snap => {
      setQueue(snap.docs.map(d => ({ ...d.data() } as QueueEntry)));
    });

    const unsubUsers = db.collection("users").onSnapshot(snap => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    return () => {
      unsubGuilds(); unsubEvents(); unsubConfig(); unsubQueue(); unsubUsers(); unsubLeaderboard(); unsubWinnerLogs();
    };
  }, [isAdmin, selectedBranchId]);

  const openDeleteModal = (title: string, message: string, action: () => Promise<void>) => {
    setDeleteConf({ isOpen: true, title, message, action });
  };
  
  const handleInitialize = async () => {
    openDeleteModal(
      "Initialize System?",
      "This will overwrite default data. Are you sure?",
      async () => {
        const batch = db.batch();

        // Create Guilds
        const defaultGuilds = [
          { id: 'g1', name: 'Black Rose I', memberCap: 80 },
          { id: 'g2', name: 'Black Rose II', memberCap: 80 },
          { id: 'g3', name: 'Black Rose III', memberCap: 50 },
        ];
        defaultGuilds.forEach(g => {
            batch.set(db.collection("guilds").doc(g.id), g);
        });
        
        // Create Config
        const configRef = db.collection("system").doc("breakingArmy");
        const defaultConfig: BreakingArmyConfig = {
            currentBoss: { g1: "Black God of Wealth", g2: "Dao Lord" },
            schedules: { 
                g1: [{ day: 'Wednesday', time: '20:00' }],
                g2: [{ day: 'Friday', time: '21:00' }],
            },
            recentWinners: [],
            bossPool: [
                { name: 'Black God of Wealth', imageUrl: '' },
                { name: 'Dao Lord', imageUrl: '' },
                { name: 'Heartseeker', imageUrl: '' },
            ]
        };
        batch.set(configRef, defaultConfig);
        
        // Promote current user to Admin
        if (currentUser) {
            batch.set(db.collection("users").doc(currentUser.uid), { systemRole: 'Admin' }, { merge: true });
        }

        await batch.commit();
        showAlert("System Initialized!", 'success');
      }
    );
  };

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
        await db.collection("guilds").doc(id).update(guildEditForm);
        setEditingGuildId(null);
        showAlert("Branch updated", 'success');
    } catch (error: any) {
        showAlert(`Failed to update: ${error.message}`, 'error');
    }
  };

  const handleDeleteGuild = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    openDeleteModal(
        "Delete Guild Branch?",
        "This will permanently delete the branch. This action cannot be undone.",
        async () => {
            try {
                await db.collection("guilds").doc(id).delete();
                showAlert("Branch deleted.", 'info');
            } catch (error: any) {
                showAlert(`Deletion failed: ${error.message}`, 'error');
            }
        }
    );
  };
  
  const handleSaveEvent = async () => {
    try {
        if (editingEventId) {
            await db.collection("events").doc(editingEventId).update(eventForm);
            showAlert("Event updated", 'success');
        } else {
            await db.collection("events").add(eventForm);
            showAlert("Event scheduled", 'success');
        }
        setEditingEventId(null);
        setEventForm({ title: '', description: '', type: 'Raid', date: '', guildId: '' });
    } catch(error: any) {
        showAlert(`Failed to save event: ${error.message}`, 'error');
    }
  };

  const handleEditEvent = (e: React.MouseEvent, event: GuildEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setEditingEventId(event.id);
      setEventForm(event);
  };

  const handleCancelEditEvent = () => {
      setEditingEventId(null);
      setEventForm({ title: '', description: '', type: 'Raid', date: '', guildId: '' });
  };

  const handleDeleteEvent = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      openDeleteModal(
          "Delete Event?",
          "Are you sure you want to delete this event?",
          async () => {
              try {
                  await db.collection("events").doc(id).delete();
                  showAlert("Event deleted.", 'info');
              } catch (error: any) {
                  showAlert(`Deletion failed: ${error.message}`, 'error');
              }
          }
      );
  };

  const handleSaveBoss = async () => {
    if (!bossForm.name) return;
    try {
        let updatedPool = [...bossPool];
        if (editingBossOriginalName) {
            const index = updatedPool.findIndex(b => b.name === editingBossOriginalName);
            if (index > -1) updatedPool[index] = bossForm;
        } else {
            updatedPool.push(bossForm);
        }
        await db.collection("system").doc("breakingArmy").set({ bossPool: updatedPool }, { merge: true });
        setBossForm({ name: '', imageUrl: '' });
        setEditingBossOriginalName(null);
        showAlert(editingBossOriginalName ? "Boss Updated" : "Boss Added", 'success');
    } catch (error: any) {
        showAlert(`Failed to save boss: ${error.message}`, 'error');
    }
  };

  const handleEditBoss = (e: React.MouseEvent, boss: Boss) => {
      e.stopPropagation();
      e.preventDefault();
      setEditingBossOriginalName(boss.name);
      setBossForm(boss);
  };

  const handleDeleteBoss = (e: React.MouseEvent, bossName: string) => {
    e.stopPropagation();
    e.preventDefault();
    openDeleteModal(
        "Delete Boss?",
        `Are you sure you want to remove '${bossName}' from the pool?`,
        async () => {
            try {
                const updatedPool = bossPool.filter(b => b.name !== bossName);
                await db.collection("system").doc("breakingArmy").set({ bossPool: updatedPool }, { merge: true });
                showAlert("Boss deleted", 'info');
            } catch (error: any) {
                showAlert(`Deletion failed: ${error.message}`, 'error');
            }
        }
    );
  };

  const handleUpdateCurrentBoss = async (name: string) => {
      if (!selectedBranchId) return;
      try {
          const updatedMap = { ...currentBossMap, [selectedBranchId]: name };
          await db.collection("system").doc("breakingArmy").set({ currentBoss: updatedMap }, { merge: true });
      } catch (error: any) {
          showAlert(`Failed to update boss: ${error.message}`, 'error');
      }
  };

  const handleAddSchedule = async () => {
      if (!selectedBranchId) return;
      const currentList = schedulesMap[selectedBranchId] || [];
      if (currentList.length >= 2) {
          showAlert("Maximum of 2 schedules per branch allowed.", "error");
          return;
      }
      try {
          const updatedList = [...currentList, newSchedule];
          const updatedMap = { ...schedulesMap, [selectedBranchId]: updatedList };
          await db.collection("system").doc("breakingArmy").set({ schedules: updatedMap }, { merge: true });
          showAlert("Schedule added", 'success');
      } catch (error: any) {
          showAlert(`Failed to add schedule: ${error.message}`, 'error');
      }
  };

  const handleRemoveSchedule = (index: number) => {
      openDeleteModal(
          "Remove Schedule?",
          "Are you sure you want to remove this time slot?",
          async () => {
              if (!selectedBranchId) return;
              try {
                  const currentList = schedulesMap[selectedBranchId] || [];
                  const updatedList = currentList.filter((_, i) => i !== index);
                  const updatedMap = { ...schedulesMap, [selectedBranchId]: updatedList };
                  await db.collection("system").doc("breakingArmy").set({ schedules: updatedMap }, { merge: true });
                  showAlert("Schedule removed", 'info');
              } catch (error: any) {
                  showAlert(`Removal failed: ${error.message}`, 'error');
              }
          }
      );
  };

  const handleResetQueue = (e: React.MouseEvent) => {
      e.preventDefault();
      openDeleteModal(
          "Clear Queue?",
          `This will remove all players from the queue for ${guilds.find(g => g.id === selectedBranchId)?.name}.`,
          async () => {
              const q = db.collection("queue").where('guildId', '==', selectedBranchId);
              const snapshot = await q.get();
              const batch = db.batch();
              snapshot.docs.forEach(doc => batch.delete(doc.ref));
              await batch.commit();
              showAlert("Queue cleared.", 'info');
          }
      );
  };

  const handleResetCooldowns = () => {
      openDeleteModal(
        "Reset Winners?",
        `This will remove all cooldowns for players in ${guilds.find(g => g.id === selectedBranchId)?.name}.`,
        async () => {
            // Keep winners NOT in the selected branch
            const remainingWinners = recentWinners.filter(w => w.branchId !== selectedBranchId);
            await db.collection("system").doc("breakingArmy").set({ recentWinners: remainingWinners }, { merge: true });
            showAlert("Winners reset.", 'info');
        }
      );
  };
  
  const handleRemoveWinner = async (e: React.MouseEvent, uid: string) => {
    e.stopPropagation();
    e.preventDefault();
    openDeleteModal(
        "Remove Winner?",
        "This will remove the winner from cooldown.",
        async () => {
            const updatedWinners = recentWinners.filter(w => w.uid !== uid);
            await db.collection("system").doc("breakingArmy").set({ recentWinners: updatedWinners }, { merge: true });
            showAlert("Winner removed", 'info');
        }
    );
  };
  
  const handleTogglePrize = async (uid: string, currentStatus: boolean) => {
    const updatedWinners = recentWinners.map(w => w.uid === uid ? {...w, prizeGiven: !currentStatus} : w);
    await db.collection("system").doc("breakingArmy").set({ recentWinners: updatedWinners }, { merge: true });
  };

  const handleConfirmWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWinner || !winnerTime) return;
    try {
        const guildName = guilds.find(g => g.id === selectedWinner.guildId)?.name || 'Unknown';

        const newEntry: Omit<LeaderboardEntry, 'id' | 'rank'> = {
            playerName: selectedWinner.name,
            playerUid: selectedWinner.uid,
            branch: guildName,
            boss: currentBossMap[selectedWinner.guildId],
            time: winnerTime,
            date: new Date().toISOString().split('T')[0],
            status: 'verified'
        };

        // Add to both logs and leaderboard
        await db.collection("leaderboard").add(newEntry);
        await db.collection("winner_logs").add(newEntry);
        
        // Add to cooldowns (recentWinners is array of CooldownEntry)
        const newCooldown: CooldownEntry = { 
            uid: selectedWinner.uid, 
            branchId: selectedWinner.guildId, 
            timestamp: new Date().toISOString(),
            prizeGiven: false
        };
        await db.collection("system").doc("breakingArmy").update({
            recentWinners: firebase.firestore.FieldValue.arrayUnion(newCooldown)
        });

        // Remove from queue (using UID as doc ID based on dashboard logic)
        await db.collection("queue").doc(selectedWinner.uid).delete();
        
        setIsWinnerModalOpen(false);
        setWinnerTime('');
        setSelectedWinner(null);
        showAlert(`${selectedWinner.name} declared as winner!`, 'success');
    } catch(error: any) {
        showAlert(`Failed to confirm winner: ${error.message}`, 'error');
    }
  };
  
  const handleUpdateLogEntry = async (e: React.FormEvent, collectionName: 'leaderboard' | 'winner_logs') => {
    e.preventDefault();
    if (!editingLeaderboardEntry) return;

    try {
        const { id, ...data } = editingLeaderboardEntry;
        if (id) {
            await db.collection(collectionName).doc(id).update(data);
            showAlert("Entry updated.", 'success');
        } else {
            await db.collection(collectionName).add(data);
            showAlert("Entry created.", 'success');
        }
        setIsLeaderboardModalOpen(false);
        setEditingLeaderboardEntry(null);
    } catch (error: any) {
        showAlert(`Failed to save entry: ${error.message}`, 'error');
    }
  };
  
  const handleDeleteLogEntry = async (e: React.MouseEvent, id: string, collectionName: 'leaderboard' | 'winner_logs') => {
      e.stopPropagation();
      e.preventDefault();
      openDeleteModal(
        "Delete Entry?",
        "Are you sure you want to delete this record?",
        async () => {
            try {
                await db.collection(collectionName).doc(id).delete();
                showAlert("Entry deleted.", 'info');
            } catch (error: any) {
                showAlert(`Deletion failed: ${error.message}`, 'error');
            }
        }
      );
  };
  
  const handleUpdateRole = async (uid: string, newRole: 'Member' | 'Officer' | 'Admin') => {
      await db.collection("users").doc(uid).update({ systemRole: newRole });
      showAlert("User role updated", 'success');
  };

  const handleKickUser = (e: React.MouseEvent, user: UserProfile) => {
      e.stopPropagation();
      e.preventDefault();
      openDeleteModal(
        `Kick ${user.displayName}?`,
        `This will permanently remove the user from the guild database. They can rejoin later.`,
        async () => {
            try {
                await db.collection("users").doc(user.uid).delete();
                showAlert("User kicked.", 'info');
            } catch (error: any) {
                showAlert(`Failed to kick user: ${error.message}`, 'error');
            }
        }
      );
  };
  
  const formatTimeInput = (val: string) => {
    let clean = val.replace(/\D/g, '').substring(0, 4);
    if (clean.length > 2) return `${clean.substring(0, 2)}:${clean.substring(2)}`;
    return clean;
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

  const filteredQueue = queue.filter(q => q.guildId === selectedBranchId);
  const filteredWinners = recentWinners.filter(w => w.branchId === selectedBranchId);
  const currentBranchBoss = currentBossMap[selectedBranchId] || '';
  const currentBranchSchedule = schedulesMap[selectedBranchId] || [];
  const activeBossImage = bossPool.find(b => b.name === currentBranchBoss)?.imageUrl;
  
  const filteredUsers = allUsers.filter(u => 
    u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
    (u.inGameId && u.inGameId.toLowerCase().includes(userSearch.toLowerCase()))
  );

  // Access checks
  if (!currentUser) return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Please Sign In.</div>;
  if (guilds.length > 0 && userProfile && !isAdmin && !isOfficer) return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Admins/Officers only.</div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
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
        {(isAdmin || isOfficer) && <button onClick={() => setActiveTab('events')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'events' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Events</button>}
        {(isAdmin || isOfficer) && <button onClick={() => setActiveTab('breakingArmy')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'breakingArmy' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Breaking Army</button>}
        {isAdmin && <button onClick={() => setActiveTab('leaderboard')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'leaderboard' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Leaderboard</button>}
        {isAdmin && <button onClick={() => setActiveTab('winnerLogs')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'winnerLogs' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Winner Logs</button>}
        {isAdmin && <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'users' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>User Management</button>}
      </div>
      
      {/* 1. GUILD BRANCHES TAB */}
      {activeTab === 'guilds' && isAdmin && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Branch Name</th>
                <th className="px-4 py-3">Member Cap</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {guilds.map(guild => (
                <tr key={guild.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">{guild.id}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {editingGuildId === guild.id ? (
                        <input className="border rounded p-1 dark:bg-zinc-800 dark:text-zinc-100" value={guildEditForm.name} onChange={e => setGuildEditForm({...guildEditForm, name: e.target.value})} />
                    ) : guild.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                    {editingGuildId === guild.id ? (
                        <input type="number" className="border rounded p-1 w-20 dark:bg-zinc-800 dark:text-zinc-100" value={guildEditForm.memberCap} onChange={e => setGuildEditForm({...guildEditForm, memberCap: parseInt(e.target.value)})} />
                    ) : guild.memberCap}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {editingGuildId === guild.id ? (
                        <>
                            <button onClick={() => handleSaveGuild(guild.id)} className="text-green-600 hover:text-green-800"><Save size={16} /></button>
                            <button onClick={() => setEditingGuildId(null)} className="text-zinc-400 hover:text-zinc-600"><X size={16} /></button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => handleEditGuild(guild)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"><Edit size={16} /></button>
                            <button onClick={(e) => handleDeleteGuild(e, guild.id)} className="text-zinc-400 hover:text-red-600"><Trash2 size={16} /></button>
                        </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* 2. EVENTS TAB */}
      {activeTab === 'events' && (isAdmin || isOfficer) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 h-fit">
            <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-zinc-100">{editingEventId ? 'Edit Event' : 'Create New Event'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Event Title" className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} />
              <textarea placeholder="Description" className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100" rows={3} value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})}></textarea>
              <div className="grid grid-cols-2 gap-2">
                <input type="datetime-local" className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} />
                <select className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100" value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value as any})}>
                  <option>Raid</option><option>PvP</option><option>Social</option><option>Meeting</option>
                </select>
              </div>
              <select 
                className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100" 
                value={eventForm.guildId} 
                onChange={e => setEventForm({...eventForm, guildId: e.target.value})}
                disabled={isOfficer} // Officers locked to their guild
              >
                <option value="">Global Event (All Branches)</option>
                {guilds.map(g => (
                    <option key={g.id} value={g.id} disabled={isOfficer && g.id !== userProfile?.guildId}>{g.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                  <button onClick={handleSaveEvent} className="flex-1 bg-rose-900 text-white p-2 rounded hover:bg-rose-950 transition-colors">
                    {editingEventId ? 'Update Event' : 'Schedule Event'}
                  </button>
                  {editingEventId && <button onClick={handleCancelEditEvent} className="px-3 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300">Cancel</button>}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-zinc-100">Upcoming Events</h3>
            <div className="space-y-3">
              {events.filter(e => isAdmin || e.guildId === '' || e.guildId === userProfile?.guildId).map(event => (
                <div key={event.id} className="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded text-center min-w-[50px]">
                      <span className="block text-xs font-bold text-zinc-500 uppercase">{new Date(event.date).toLocaleDateString(undefined, {month:'short'})}</span>
                      <span className="block text-lg font-bold text-zinc-900 dark:text-zinc-100">{new Date(event.date).getDate()}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{event.title}</h4>
                      <div className="flex gap-2 text-xs text-zinc-500">
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{event.type}</span>
                        <span>{guilds.find(g => g.id === event.guildId)?.name || 'Global'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => handleEditEvent(e, event)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"><Edit size={16} /></button>
                    <button onClick={(e) => handleDeleteEvent(e, event.id)} className="text-zinc-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. BREAKING ARMY TAB */}
      {activeTab === 'breakingArmy' && (isAdmin || isOfficer) && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Configuration */}
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Configuration</h3>
                          <select 
                            className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-sm px-3 py-1.5 text-zinc-900 dark:text-zinc-100 w-full sm:w-auto min-w-[150px] pr-8"
                            value={selectedBranchId}
                            onChange={e => setSelectedBranchId(e.target.value)}
                            disabled={isOfficer} // Officers locked
                          >
                              {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                      </div>
                      
                      <div className="space-y-6">
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Active Boss for Branch</label>
                              <div className="flex gap-2">
                                  <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex-shrink-0 overflow-hidden">
                                      {activeBossImage ? <img src={activeBossImage} className="w-full h-full object-cover" /> : <Skull className="w-full h-full p-2 text-zinc-400" />}
                                  </div>
                                  <select 
                                    className="flex-1 p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                                    value={currentBranchBoss}
                                    onChange={(e) => handleUpdateCurrentBoss(e.target.value)}
                                  >
                                      <option value="">Select Boss</option>
                                      {bossPool.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                                  </select>
                              </div>
                          </div>

                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Weekly Schedule</label>
                              <div className="space-y-2 mb-3">
                                  {currentBranchSchedule.map((slot, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded border border-zinc-100 dark:border-zinc-700">
                                          <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                              <Clock size={14} className="text-rose-500" />
                                              <span>{slot.day} @ {formatTime12Hour(slot.time)}</span>
                                          </div>
                                          <button type="button" onClick={() => handleRemoveSchedule(idx)} className="text-zinc-400 hover:text-red-600">
                                              <X size={14} />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                              <div className="flex gap-2">
                                  <select className="flex-1 p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm" value={newSchedule.day} onChange={e => setNewSchedule({...newSchedule, day: e.target.value})}>
                                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d}>{d}</option>)}
                                  </select>
                                  <input type="text" className="w-24 p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm" placeholder="20:00" value={newSchedule.time} onChange={e => setNewSchedule({...newSchedule, time: formatTimeInput(e.target.value)})} />
                                  <button 
                                    onClick={handleAddSchedule} 
                                    disabled={currentBranchSchedule.length >= 2}
                                    className="bg-zinc-200 dark:bg-zinc-700 p-2 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Plus size={16} />
                                  </button>
                              </div>
                          </div>

                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Global Actions</label>
                              <div className="flex gap-3">
                                  <button onClick={handleResetQueue} className="flex-1 py-2 px-3 border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center gap-2">
                                      <Trash2 size={14} /> Clear {guilds.find(g => g.id === selectedBranchId)?.name} Queue
                                  </button>
                                  <button onClick={handleResetCooldowns} className="flex-1 py-2 px-3 border border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/10 dark:border-blue-900/30 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/20 flex items-center justify-center gap-2">
                                      <RefreshCw size={14} /> Reset Winners
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Right: Queue Management */}
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-[500px]">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><ListOrdered size={20} /> Queue</h3>
                          <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{guilds.find(g => g.id === selectedBranchId)?.name}</span>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 flex-1 overflow-hidden flex flex-col">
                          <div className="grid grid-cols-12 text-xs font-bold text-zinc-500 p-3 border-b border-zinc-200 dark:border-zinc-800 uppercase tracking-wider">
                              <div className="col-span-8">Player</div>
                              <div className="col-span-4 text-right">Action</div>
                          </div>
                          <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                              {filteredQueue.length === 0 ? <p className="text-zinc-400 text-center py-8 text-sm">Queue is empty</p> : filteredQueue.map((entry) => (
                                  <div key={entry.uid} className="grid grid-cols-12 items-center p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                      <div className="col-span-8 font-medium text-zinc-900 dark:text-zinc-100">{entry.name}</div>
                                      <div className="col-span-4 flex justify-end">
                                          <button 
                                              onClick={() => { setSelectedWinner(entry); setIsWinnerModalOpen(true); }}
                                              className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 p-1.5 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                                              title="Declare Winner"
                                          >
                                              <Crown size={14} />
                                          </button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>

              {/* Bottom: Recent Winners & Bosses */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 h-[400px] flex flex-col">
                      <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><ShieldAlert size={20} /> Recent Winners (Cooldown)</h3>
                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 sticky top-0">
                                  <tr><th className="px-3 py-2">Player</th><th className="px-3 py-2 text-center">Prize</th><th className="px-3 py-2 text-right">Remove</th></tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                  {filteredWinners.map(w => {
                                      const profile = allUsers.find(u => u.uid === w.uid);
                                      return (
                                          <tr key={w.uid}>
                                              <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">{profile?.displayName || 'Unknown'}</td>
                                              <td className="px-3 py-2 text-center">
                                                  <button onClick={() => handleTogglePrize(w.uid, w.prizeGiven)} className={`p-1 rounded ${w.prizeGiven ? 'text-green-500 bg-green-100 dark:bg-green-900/20' : 'text-zinc-300 hover:text-zinc-500'}`}>
                                                      <Gift size={16} />
                                                  </button>
                                              </td>
                                              <td className="px-3 py-2 text-right">
                                                  <button onClick={(e) => handleRemoveWinner(e, w.uid)} className="text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
                                              </td>
                                          </tr>
                                      )
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  {isAdmin && (
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 h-[400px] flex flex-col">
                        <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Skull size={20} /> Bosses</h3>
                        <div className="flex gap-2 mb-4">
                            <input type="text" placeholder="Boss Name" className="flex-1 p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm" value={bossForm.name} onChange={e => setBossForm({...bossForm, name: e.target.value})} />
                            <input type="text" placeholder="Image URL" className="flex-1 p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm" value={bossForm.imageUrl} onChange={e => setBossForm({...bossForm, imageUrl: e.target.value})} />
                            <button onClick={handleSaveBoss} className="bg-rose-900 text-white px-3 py-2 rounded hover:bg-rose-950"><Plus size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                            {bossPool.map(boss => (
                                <div key={boss.name} className="flex items-center justify-between p-2 border border-zinc-100 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-zinc-300 dark:bg-zinc-700 rounded overflow-hidden">
                                            {boss.imageUrl && <img src={boss.imageUrl} className="w-full h-full object-cover" />}
                                        </div>
                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{boss.name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => handleEditBoss(e, boss)} className="text-zinc-400 hover:text-blue-500"><Edit size={14} /></button>
                                        <button onClick={(e) => handleDeleteBoss(e, boss.name)} className="text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}
              </div>
          </div>
      )}

      {/* 4. LEADERBOARD TAB (Admin Only) */}
      {activeTab === 'leaderboard' && isAdmin && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Manage Leaderboard</h3>
              <button onClick={() => { setEditingLeaderboardEntry({ id: '', rank: 0, playerName: '', playerUid: '', branch: '', boss: '', time: '', date: '', status: 'verified' }); setIsLeaderboardModalOpen(true); }} className="text-sm bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100">Manual Entry</button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              <tr><th className="px-4 py-3">Player</th><th className="px-4 py-3">Boss</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {leaderboard.map(entry => (
                <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{entry.playerName}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{entry.boss}</td>
                  <td className="px-4 py-3 font-mono text-zinc-900 dark:text-zinc-100">{entry.time}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatDateMMDDYYYY(entry.date)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => { setEditingLeaderboardEntry(entry); setIsLeaderboardModalOpen(true); }} className="text-zinc-400 hover:text-blue-500"><Edit size={16} /></button>
                    <button onClick={(e) => handleDeleteLogEntry(e, entry.id, 'leaderboard')} className="text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* 5. WINNER LOGS TAB (Admin Only) */}
      {activeTab === 'winnerLogs' && isAdmin && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-zinc-100">Historical Winner Logs</h3>
            <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              <tr><th className="px-4 py-3">Player</th><th className="px-4 py-3">Boss</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {winnerLogs.map(entry => (
                <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{entry.playerName}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{entry.boss}</td>
                  <td className="px-4 py-3 font-mono text-zinc-900 dark:text-zinc-100">{entry.time}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatDateMMDDYYYY(entry.date)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => { setEditingLeaderboardEntry(entry); setIsLeaderboardModalOpen(true); }} className="text-zinc-400 hover:text-blue-500"><Edit size={16} /></button>
                    <button onClick={(e) => handleDeleteLogEntry(e, entry.id, 'winner_logs')} className="text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. USER MANAGEMENT TAB (Admin Only) */}
      {activeTab === 'users' && isAdmin && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="mb-4 relative">
                <input 
                  type="text" 
                  placeholder="Search Users by Name or ID..." 
                  className="w-full pl-9 p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100" 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                    <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">ID</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">System Role</th><th className="px-4 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredUsers.map(user => (
                        <tr key={user.uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                            <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <img src={user.photoURL || 'https://via.placeholder.com/150'} className="w-6 h-6 rounded-full" />
                                {user.displayName}
                            </td>
                            <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{user.inGameId}</td>
                            <td className="px-4 py-3 text-zinc-500">{guilds.find(g => g.id === user.guildId)?.name}</td>
                            <td className="px-4 py-3">
                                <select 
                                    className="bg-transparent border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 pr-8"
                                    value={user.systemRole}
                                    onChange={(e) => handleUpdateRole(user.uid, e.target.value as any)}
                                >
                                    <option value="Member">Member</option>
                                    <option value="Officer">Officer</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button onClick={(e) => handleKickUser(e, user)} className="text-zinc-400 hover:text-red-500" title="Kick User"><Trash2 size={16} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
      

      <CreateGuildModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateGuild} data={newGuildData} onChange={setNewGuildData} />
      <DeclareWinnerModal isOpen={isWinnerModalOpen} onClose={() => setIsWinnerModalOpen(false)} winnerName={selectedWinner?.name || ''} time={winnerTime} onTimeChange={setWinnerTime} onConfirm={handleConfirmWinner} />
      <EditLeaderboardModal isOpen={isLeaderboardModalOpen} onClose={() => setIsLeaderboardModalOpen(false)} entry={editingLeaderboardEntry} setEntry={setEditingLeaderboardEntry} onUpdate={(e) => handleUpdateLogEntry(e, activeTab === 'leaderboard' ? 'leaderboard' : 'winner_logs')} bossPool={bossPool} guilds={guilds} allUsers={allUsers} />
      <ConfirmationModal isOpen={deleteConf.isOpen} onClose={() => setDeleteConf({ ...deleteConf, isOpen: false })} onConfirm={deleteConf.action} title={deleteConf.title} message={deleteConf.message} />
    </div>
  );
};

export default Admin;
