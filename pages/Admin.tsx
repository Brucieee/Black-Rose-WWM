
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Database, Crown, RefreshCw, Skull, Clock, X, Edit, Trophy, Save, ShieldAlert, FileText, User, ListOrdered, Plane, Settings, Shield, Megaphone, ArrowLeft, ArrowRight, GripHorizontal, Globe } from 'lucide-react';
import { Guild, QueueEntry, GuildEvent, UserProfile, Boss, BreakingArmyConfig, ScheduleSlot, LeaderboardEntry, CooldownEntry, WinnerLog, LeaveRequest, Announcement } from '../types';
import { db } from '../services/firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { CreateGuildModal } from '../components/modals/CreateGuildModal';
import { DeclareWinnerModal } from '../components/modals/DeclareWinnerModal';
import { EditLeaderboardModal } from '../components/modals/EditLeaderboardModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { CreateAnnouncementModal } from '../components/modals/CreateAnnouncementModal';
import { RichText } from '../components/RichText';

const Admin: React.FC = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Tab Management
  const defaultTabs = ['guilds', 'events', 'announcements', 'breakingArmy', 'leaderboard', 'winnerLogs', 'users', 'leaves'];
  const [tabOrder, setTabOrder] = useState<string[]>(defaultTabs);
  const [activeTab, setActiveTab] = useState<string>('guilds');
  const [isReorderMode, setIsReorderMode] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGuildData, setNewGuildData] = useState({ name: '', id: '', memberCap: 80});
  
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [winnerLogs, setWinnerLogs] = useState<WinnerLog[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  
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

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<QueueEntry | null>(null);
  const [winnerTime, setWinnerTime] = useState('');

  const [editingBossOriginalName, setEditingBossOriginalName] = useState<string | null>(null);
  const [bossForm, setBossForm] = useState({ name: '', imageUrl: '' });

  const [newSchedule, setNewSchedule] = useState({ day: 'Wednesday', time: '20:00' });

  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [editingLeaderboardEntry, setEditingLeaderboardEntry] = useState<LeaderboardEntry | null>(null);
  const [leaderboardModalMode, setLeaderboardModalMode] = useState<'leaderboard' | 'winnerLog'>('leaderboard');

  const [deleteConf, setDeleteConf] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', action: async () => {} });

  const [leaveBranchFilter, setLeaveBranchFilter] = useState('All');

  const isAdmin = userProfile?.systemRole === 'Admin';
  const isOfficer = userProfile?.systemRole === 'Officer';

  useEffect(() => {
    // Load tab order preference
    const savedOrder = localStorage.getItem('adminTabOrder');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        // Basic validation to ensure we have valid tabs
        if (Array.isArray(parsed) && parsed.length > 0) {
            setTabOrder(parsed);
            if (!parsed.includes(activeTab)) setActiveTab(parsed[0]);
        }
      } catch (e) {
        console.error("Failed to parse tab order", e);
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
        const unsubUser = db.collection("users").doc(currentUser.uid).onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const profile = docSnap.data() as UserProfile;
                setUserProfile(profile);
                
                // If officer, automatically select their branch and don't allow changing for certain tabs
                if (profile.systemRole === 'Officer') {
                    setSelectedBranchId(profile.guildId);
                    // Also preset event form guild ID
                    setEventForm(prev => ({...prev, guildId: profile.guildId}));
                    // Default to allowed tab if current is restricted
                    if (!['events', 'breakingArmy', 'leaves', 'announcements'].includes(activeTab)) {
                         setActiveTab('events');
                    }
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
      // Only set default branch for Admins, Officers are handled in user effect
      if (g.length > 0 && !selectedBranchId && isAdmin) {
          setSelectedBranchId(g[0].id);
      }
    });

    const unsubEvents = db.collection("events").onSnapshot(snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as GuildEvent)));
    });

    const unsubAnnouncements = db.collection("announcements").orderBy("timestamp", "desc").onSnapshot(snap => {
        setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
    });

    const unsubLeaderboard = db.collection("leaderboard").orderBy("time", "asc").onSnapshot(snap => {
        setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderboardEntry)));
    });
    
    const unsubWinnerLogs = db.collection("winner_logs").orderBy("date", "desc").onSnapshot(snap => {
      setWinnerLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as WinnerLog)));
    });

    const unsubLeaves = db.collection("leaves").orderBy("timestamp", "desc").onSnapshot(snap => {
      setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest)));
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

    const unsubQueue = db.collection("queue").orderBy("joinedAt", "asc").onSnapshot(snap => {
      setQueue(snap.docs.map(d => ({ ...d.data() } as QueueEntry)));
    });

    const unsubUsers = db.collection("users").onSnapshot(snap => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    return () => {
      unsubGuilds(); unsubEvents(); unsubConfig(); unsubQueue(); unsubUsers(); unsubLeaderboard(); unsubWinnerLogs(); unsubLeaves(); unsubAnnouncements();
    };
  }, [isAdmin, selectedBranchId]);

  if (!currentUser || !userProfile) {
    return <div className="p-8">Access Denied. You must be logged in.</div>;
  }
  if (!isAdmin && !isOfficer) {
    return <div className="p-8">Access Denied. You do not have permission to view this page.</div>;
  }

  // --- TAB SORTING ---
  const handleMoveTab = (index: number, direction: 'left' | 'right') => {
    const newOrder = [...tabOrder];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setTabOrder(newOrder);
      localStorage.setItem('adminTabOrder', JSON.stringify(newOrder));
    }
  };

  const getTabLabel = (key: string) => {
    switch (key) {
      case 'guilds': return 'Guild Branches';
      case 'events': return 'Events';
      case 'announcements': return 'Announcements';
      case 'breakingArmy': return 'Breaking Army';
      case 'leaderboard': return 'Leaderboard';
      case 'winnerLogs': return 'Winner Logs';
      case 'users': return 'Users';
      case 'leaves': return 'Leaves';
      default: return key;
    }
  };

  // GUILD LOGIC
  const handleInitializeSystem = async () => {
    try {
        const batch = db.batch();
        batch.set(db.collection("guilds").doc("br1"), { name: "Black Rose I", memberCap: 80 });
        batch.set(db.collection("guilds").doc("br2"), { name: "Black Rose II", memberCap: 80 });
        batch.set(db.collection("guilds").doc("br3"), { name: "Black Rose III", memberCap: 50 });
        batch.set(db.collection("system").doc("breakingArmy"), {
            currentBoss: { 'br1': 'Dao Lord' },
            schedules: {},
            recentWinners: [],
            bossPool: []
        });
        if (currentUser) {
            batch.update(db.collection("users").doc(currentUser.uid), { systemRole: 'Admin' });
        }
        await batch.commit();
        showAlert("System Initialized Successfully!", 'success');
        window.location.reload(); 
    } catch (err: any) {
        showAlert(err.message, 'error');
    }
  };

  const handleCreateGuild = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isAdmin) return;
      try {
        await db.collection("guilds").doc(newGuildData.id).set({name: newGuildData.name, memberCap: newGuildData.memberCap});
        showAlert("Guild Branch created!", 'success');
        setIsCreateModalOpen(false);
      } catch (err: any) {
        showAlert(err.message, 'error');
      }
  };

  const handleDeleteGuild = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!id) return;
    try {
        await db.collection("guilds").doc(id).delete();
        showAlert("Guild Branch deleted.", 'success');
    } catch (error: any) {
        showAlert(`Failed to delete: ${error.message}`, 'error');
    }
  };

  const handleSaveGuild = async (id: string) => {
    if (!isAdmin) return;
    await db.collection("guilds").doc(id).update(guildEditForm);
    setEditingGuildId(null);
    showAlert("Guild updated!", 'success');
  };

  const handleEditGuild = (guild: Guild) => {
    setEditingGuildId(guild.id);
    setGuildEditForm({ name: guild.name, memberCap: guild.memberCap });
  };

  // EVENT LOGIC
  const handleSaveEvent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isOfficer && eventForm.guildId !== userProfile.guildId) {
          showAlert("You can only create events for your own branch.", 'error');
          return;
      }
      try {
          if (editingEventId) {
              await db.collection("events").doc(editingEventId).update(eventForm);
              showAlert("Event updated!", 'success');
          } else {
              await db.collection("events").add(eventForm);
              showAlert("Event scheduled!", 'success');
          }
          setEditingEventId(null);
          setEventForm({ title: '', description: '', type: 'Raid', date: '', guildId: isOfficer ? userProfile.guildId : '' });
      } catch (err: any) {
          showAlert(err.message, 'error');
      }
  };

  const handleDeleteEvent = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (!id) return;
      try {
        await db.collection("events").doc(id).delete();
        showAlert("Event deleted.", 'success');
      } catch (error: any) {
        showAlert(`Failed to delete event: ${error.message}`, 'error');
      }
  };
  
  const handleEditEvent = (event: GuildEvent) => {
    setEditingEventId(event.id);
    setEventForm({
        title: event.title,
        description: event.description,
        type: event.type,
        date: event.date,
        guildId: event.guildId || ''
    });
  };

  // ANNOUNCEMENT LOGIC
  const handleSaveAnnouncement = async (title: string, content: string, isGlobal: boolean) => {
      try {
          // Determine target guild. If Admin and isGlobal checked -> 'global'.
          // If Officer -> userProfile.guildId.
          // If Admin and !isGlobal -> this modal in Admin doesn't really have a Guild Selector, 
          // so we default to 'global' OR if we want admins to post for specific guilds, we'd need a selector.
          // For now, in Admin Tab, new posts are 'global' for Admins, and 'branch' for Officers.
          
          let targetGuildId = 'global';
          
          if (isOfficer) {
              targetGuildId = userProfile.guildId;
              isGlobal = false; // Force false for officers
          } else if (isAdmin) {
             // Admin keeps the isGlobal flag. If false, it's effectively "global" in our current model unless we add a selector.
             // But the prompt implies Officers editing their branch announcements.
             targetGuildId = isGlobal ? 'global' : 'global'; 
          }

          if (editingAnnouncement) {
              // Preserve existing guildId unless we want to change it, but usually we just edit content
              await db.collection("announcements").doc(editingAnnouncement.id).update({
                  title, content, isGlobal
              });
              showAlert("Announcement updated!", 'success');
          } else {
              await db.collection("announcements").add({
                  title, content, isGlobal,
                  authorId: userProfile.uid,
                  authorName: userProfile.displayName,
                  timestamp: new Date().toISOString(),
                  guildId: targetGuildId
              });
              showAlert("Announcement posted!", 'success');
          }
          setEditingAnnouncement(null);
      } catch (err: any) {
          showAlert(err.message, 'error');
      }
  };

  const handleDeleteAnnouncement = async (id: string) => {
      try {
          await db.collection("announcements").doc(id).delete();
          showAlert("Announcement deleted.", 'success');
      } catch (err: any) {
          showAlert(err.message, 'error');
      }
  };

  // BREAKING ARMY LOGIC
  const configRef = db.collection("system").doc("breakingArmy");
  
  const handleUpdateCurrentBoss = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedBranchId) return;
    const bossName = e.target.value;
    try {
        await configRef.set({ currentBoss: { ...currentBossMap, [selectedBranchId]: bossName } }, { merge: true });
    } catch(err) { console.error(err); }
  };

  const handleAddSchedule = async () => {
      if (!selectedBranchId) return;
      const currentList = schedulesMap[selectedBranchId] || [];
      if (currentList.length >= 2) {
          showAlert("Maximum of 2 schedules per branch reached.", 'error');
          return;
      }
      const updatedList = [...currentList, newSchedule];
      const updatedMap = { ...schedulesMap, [selectedBranchId]: updatedList };
      await configRef.set({ schedules: updatedMap }, { merge: true });
  };

  const handleRemoveSchedule = async (index: number) => {
      if (!selectedBranchId) return;
      const currentList = schedulesMap[selectedBranchId] || [];
      const updatedList = currentList.filter((_, i) => i !== index);
      const updatedMap = { ...schedulesMap, [selectedBranchId]: updatedList };
      await configRef.set({ schedules: updatedMap }, { merge: true });
  };

  const handleSaveBoss = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          let updatedPool = [...bossPool];
          if (editingBossOriginalName) {
              const index = updatedPool.findIndex(b => b.name === editingBossOriginalName);
              if (index > -1) updatedPool[index] = bossForm;
          } else {
              updatedPool.push(bossForm);
          }
          await configRef.set({ bossPool: updatedPool }, { merge: true });
          setBossForm({ name: '', imageUrl: '' });
          setEditingBossOriginalName(null);
      } catch (err) {
          console.error("Error saving boss:", err);
      }
  };

  const handleDeleteBoss = async (e: React.MouseEvent, bossName: string) => {
      e.stopPropagation();
      e.preventDefault();
      const updatedPool = bossPool.filter(b => b.name !== bossName);
      try {
        await configRef.set({ bossPool: updatedPool }, { merge: true });
        showAlert("Boss removed.", 'success');
      } catch (error: any) {
        showAlert(`Failed to remove boss: ${error.message}`, 'error');
      }
  };

  const handleConfirmWinner = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedWinner) return;

      const batch = db.batch();
      const newEntry = {
        playerName: selectedWinner.name,
        playerUid: selectedWinner.uid,
        branch: guilds.find(g => g.id === selectedWinner.guildId)?.name || 'Unknown',
        boss: currentBossMap[selectedWinner.guildId] || 'Unknown Boss',
        time: winnerTime,
        date: new Date().toISOString(),
        status: 'verified'
      };
      batch.set(db.collection("leaderboard").doc(), newEntry);
      batch.set(db.collection("winner_logs").doc(), newEntry);
      batch.delete(db.collection("queue").doc(selectedWinner.uid));
      const newWinnerEntry: CooldownEntry = {
          uid: selectedWinner.uid,
          branchId: selectedWinner.guildId,
          timestamp: new Date().toISOString(),
          prizeGiven: false
      };
      batch.set(configRef, { recentWinners: firebase.firestore.FieldValue.arrayUnion(newWinnerEntry) }, { merge: true });
      await batch.commit();
      
      setIsWinnerModalOpen(false);
      setSelectedWinner(null);
      setWinnerTime('');
      showAlert(`${selectedWinner.name} is the winner!`, 'success');
  };

  const handleResetQueue = async () => {
      if (!selectedBranchId) return;
      const batch = db.batch();
      const branchQueue = queue.filter(q => q.guildId === selectedBranchId);
      branchQueue.forEach(q => {
          batch.delete(db.collection("queue").doc(q.uid));
      });
      await batch.commit();
      showAlert("Queue cleared for this branch.", 'info');
  };

  const handleResetCooldowns = async () => {
    if (!selectedBranchId) return;
    const branchWinners = recentWinners.filter(w => w.branchId === selectedBranchId);
    if (branchWinners.length > 0) {
        await configRef.update({
            recentWinners: firebase.firestore.FieldValue.arrayRemove(...branchWinners)
        });
        showAlert("Winners reset for this branch.", 'info');
    }
  };
  
  const handleTogglePrize = async (winner: CooldownEntry) => {
      const updatedWinners = recentWinners.map(w => w.uid === winner.uid && w.branchId === winner.branchId ? { ...w, prizeGiven: !w.prizeGiven } : w);
      await configRef.set({ recentWinners: updatedWinners }, { merge: true });
  };

  const handleRemoveWinner = async (winner: CooldownEntry) => {
      await configRef.update({
          recentWinners: firebase.firestore.FieldValue.arrayRemove(winner)
      });
  };

  // LEADERBOARD & LOGS LOGIC
  const handleUpdateLeaderboardEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeaderboardEntry) return;

    const collectionName = leaderboardModalMode === 'winnerLog' ? 'winner_logs' : 'leaderboard';

    if (editingLeaderboardEntry.id) {
        await db.collection(collectionName).doc(editingLeaderboardEntry.id).set(editingLeaderboardEntry, { merge: true });
    } else {
        await db.collection(collectionName).add(editingLeaderboardEntry);
    }
    setIsLeaderboardModalOpen(false);
    showAlert("Record updated!", 'success');
  };

  const handleDeleteLeaderboardEntry = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        await db.collection("leaderboard").doc(id).delete();
        showAlert("Leaderboard entry deleted.", 'success');
      } catch (error: any) {
        showAlert(`Failed to delete: ${error.message}`, 'error');
      }
  };
  
  const handleDeleteWinnerLog = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    try {
        await db.collection("winner_logs").doc(id).delete();
        showAlert("Winner log deleted.", 'success');
    } catch (error: any) {
        showAlert(`Failed to delete: ${error.message}`, 'error');
    }
  };

  // USER MANAGEMENT
  const handleRoleChange = async (uid: string, newRole: 'Member' | 'Officer' | 'Admin') => {
      await db.collection("users").doc(uid).update({ systemRole: newRole });
  };
  
  const handleKickUser = async (e: React.MouseEvent, uid: string) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        await db.collection("users").doc(uid).delete();
        showAlert("User has been kicked from the guild.", 'success');
      } catch (error: any) {
        showAlert(`Failed to kick user: ${error.message}`, 'error');
      }
  };

  const filteredUsers = allUsers.filter(u => 
      u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
      (u.inGameId && u.inGameId.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredLeaves = leaves.filter(l => 
      isOfficer ? l.guildId === userProfile.guildId : (leaveBranchFilter === 'All' || l.guildId === leaveBranchFilter)
  );
  
  // Announcement Filter:
  // Admin sees ALL.
  // Officer sees only their guild.
  const filteredAnnouncements = announcements.filter(a => {
      if (isAdmin) return true;
      if (isOfficer) return a.guildId === userProfile.guildId;
      return false;
  });

  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; h = h ? h : 12; 
    return `${h}:${minutes} ${ampm}`;
  };

  const openDeleteModal = (title: string, message: string, action: () => Promise<void>) => {
    setDeleteConf({ isOpen: true, title, message, action });
  };

  const inputClass = "w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-zinc-900 dark:text-zinc-100 transition-all text-sm";
  const labelClass = "block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2";
  const cardClass = "bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden";
  const tableHeaderClass = "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase text-xs font-bold px-4 py-3 text-left border-b border-zinc-200 dark:border-zinc-700";
  const tableCellClass = "px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 border-b border-zinc-100 dark:border-zinc-800";
  const tableRowClass = "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors";

  // Filter tabs based on role
  const availableTabs = tabOrder.filter(tab => {
      if (isAdmin) return true;
      if (isOfficer) return ['events', 'breakingArmy', 'leaves', 'announcements'].includes(tab);
      return false;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Administration</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage system settings, events, and guild rosters.</p>
        </div>
        
        {guilds.length === 0 && (
            <button 
                onClick={handleInitializeSystem} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
                <Database size={18} /> Initialize System
            </button>
        )}
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2">
        {isAdmin && (
            <button 
                onClick={() => setIsReorderMode(!isReorderMode)}
                className={`p-2 rounded-lg transition-colors ${isReorderMode ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
                title="Configure Tabs"
            >
                <Settings size={18} />
            </button>
        )}
        <div className="flex overflow-x-auto pb-2 scrollbar-hide flex-1">
            <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
                {availableTabs.map((tabKey, index) => (
                    <div key={tabKey} className="flex items-center">
                        {isReorderMode && isAdmin && (
                             <button 
                                onClick={() => handleMoveTab(index, 'left')} 
                                disabled={index === 0}
                                className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30"
                             >
                                <ArrowLeft size={10} />
                             </button>
                        )}
                        <button 
                            onClick={() => setActiveTab(tabKey)} 
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === tabKey 
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                        >
                            {getTabLabel(tabKey)}
                        </button>
                        {isReorderMode && isAdmin && (
                             <button 
                                onClick={() => handleMoveTab(index, 'right')} 
                                disabled={index === availableTabs.length - 1}
                                className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30"
                             >
                                <ArrowRight size={10} />
                             </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* --- GUILDS TAB --- */}
      {activeTab === 'guilds' && isAdmin && (
        <div className={cardClass}>
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Shield size={20} className="text-rose-600" /> Guild Management
                </h2>
                <button onClick={() => { setNewGuildData({ name: '', id: '', memberCap: 80 }); setIsCreateModalOpen(true); }} className="bg-rose-900 hover:bg-rose-950 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                    <Plus size={16}/> Create Branch
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={tableHeaderClass}>Branch Name</th>
                            <th className={tableHeaderClass}>Guild ID</th>
                            <th className={tableHeaderClass}>Member Cap</th>
                            <th className={tableHeaderClass}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {guilds.map(g => (
                            <tr key={g.id} className={tableRowClass}>
                                <td className={tableCellClass}>
                                    {editingGuildId === g.id ? 
                                        <input value={guildEditForm.name} onChange={e => setGuildEditForm({...guildEditForm, name: e.target.value})} className="p-1 border rounded bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-full" /> 
                                        : <span className="font-medium text-zinc-900 dark:text-zinc-100">{g.name}</span>
                                    }
                                </td>
                                <td className={tableCellClass}><code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">{g.id}</code></td>
                                <td className={tableCellClass}>
                                    {editingGuildId === g.id ? 
                                        <input type="number" value={guildEditForm.memberCap} onChange={e => setGuildEditForm({...guildEditForm, memberCap: parseInt(e.target.value) || 0})} className="p-1 border rounded bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-20" /> 
                                        : g.memberCap
                                    }
                                </td>
                                <td className={tableCellClass}>
                                    <div className="flex gap-2">
                                        {editingGuildId === g.id ? (
                                            <>
                                                <button type="button" onClick={() => handleSaveGuild(g.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"><Save size={16} /></button>
                                                <button type="button" onClick={() => setEditingGuildId(null)} className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"><X size={16} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button type="button" onClick={() => handleEditGuild(g)} className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"><Edit size={16}/></button>
                                                <button type="button" onClick={() => openDeleteModal("Delete Branch?", `Are you sure you want to delete ${g.name}?`, () => handleDeleteGuild(null as any, g.id))} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 size={16}/></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- ANNOUNCEMENTS TAB --- */}
      {activeTab === 'announcements' && (
          <div className={cardClass}>
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Megaphone size={20} className="text-blue-500" /> {isOfficer ? 'My Branch Announcements' : 'Global Announcements'}
                  </h2>
                  <button 
                      onClick={() => { setEditingAnnouncement(null); setIsAnnouncementModalOpen(true); }}
                      className="bg-rose-900 hover:bg-rose-950 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                      <Plus size={16}/> Create New
                  </button>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full">
                      <thead>
                          <tr>
                              <th className={tableHeaderClass}>Title</th>
                              <th className={tableHeaderClass}>Target</th>
                              <th className={tableHeaderClass}>Author</th>
                              <th className={tableHeaderClass}>Date</th>
                              <th className={tableHeaderClass}>Content Preview</th>
                              <th className={`${tableHeaderClass} text-right`}>Actions</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredAnnouncements.map(a => (
                              <tr key={a.id} className={tableRowClass}>
                                  <td className={tableCellClass}>
                                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{a.title}</span>
                                  </td>
                                  <td className={tableCellClass}>
                                      {a.isGlobal ? (
                                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                                              <Globe size={10} /> Global
                                          </span>
                                      ) : (
                                          <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                              {guilds.find(g => g.id === a.guildId)?.name || 'Branch'}
                                          </span>
                                      )}
                                  </td>
                                  <td className={tableCellClass}>{a.authorName}</td>
                                  <td className={tableCellClass}>{new Date(a.timestamp).toLocaleDateString()}</td>
                                  <td className={tableCellClass}>
                                      <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[200px] block">{a.content}</span>
                                  </td>
                                  <td className={`${tableCellClass} text-right`}>
                                      <div className="flex justify-end gap-2">
                                          <button 
                                              type="button" 
                                              onClick={() => { setEditingAnnouncement(a); setIsAnnouncementModalOpen(true); }} 
                                              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                          >
                                              <Edit size={16}/>
                                          </button>
                                          <button 
                                              type="button" 
                                              onClick={() => openDeleteModal("Delete Announcement?", `Delete "${a.title}"?`, () => handleDeleteAnnouncement(a.id))} 
                                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                          >
                                              <Trash2 size={16}/>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredAnnouncements.length === 0 && (
                              <tr><td colSpan={6} className="p-8 text-center text-zinc-400 text-sm">No announcements found.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- EVENTS TAB --- */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`${cardClass} lg:col-span-1`}>
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{editingEventId ? 'Edit Event' : 'Schedule Event'}</h3>
                </div>
                <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                    <div>
                        <label className={labelClass}>Title</label>
                        <input required placeholder="e.g. Weekly Raid" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Description</label>
                        <textarea required placeholder="Event details..." value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} className={`${inputClass} min-h-[100px]`} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Date & Time</label>
                            <input type="datetime-local" required value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Type</label>
                            <select value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value as any})} className={inputClass}>
                                <option>Raid</option><option>PvP</option><option>Social</option><option>Meeting</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Branch</label>
                        {isOfficer ? (
                            // Officer: Locked to their own branch
                            <select 
                                value={eventForm.guildId} 
                                disabled
                                className={`${inputClass} opacity-70 cursor-not-allowed`}
                            >
                                <option value={userProfile.guildId}>{guilds.find(g => g.id === userProfile.guildId)?.name}</option>
                            </select>
                        ) : (
                            // Admin: Can choose any branch or Global
                            <select value={eventForm.guildId} onChange={e => setEventForm({...eventForm, guildId: e.target.value})} className={inputClass}>
                                <option value="">Global (All Branches)</option>
                                {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        )}
                        {isOfficer && <p className="text-xs text-zinc-400 mt-1">Officers can only schedule events for their branch.</p>}
                    </div>
                    <div className="pt-2 flex gap-3">
                        {editingEventId && <button type="button" onClick={() => { setEditingEventId(null); setEventForm({ title: '', description: '', type: 'Raid', date: '', guildId: isOfficer ? userProfile.guildId : '' }); }} className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium">Cancel</button>}
                        <button type="submit" className="flex-1 bg-rose-900 hover:bg-rose-950 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-rose-900/20 transition-all">{editingEventId ? 'Update Event' : 'Create Event'}</button>
                    </div>
                </form>
            </div>

            <div className={`${cardClass} lg:col-span-2 flex flex-col`}>
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Calendar size={20} className="text-zinc-500" /> Upcoming Events
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[600px] p-6 space-y-3">
                    {events.map(e => (
                        <div key={e.id} className="group p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700/50 hover:border-rose-200 dark:hover:border-rose-900/50 transition-colors flex justify-between items-center">
                            <div className="flex items-start gap-4">
                                <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center min-w-[60px]">
                                    <span className="block text-[10px] font-bold text-rose-600 dark:text-rose-500 uppercase">{new Date(e.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                    <span className="block text-xl font-bold text-zinc-900 dark:text-zinc-100">{new Date(e.date).getDate()}</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">{e.title}</h4>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{guilds.find(g => g.id === e.guildId)?.name || 'Global Event'}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-500">{e.type}</span>
                                        <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={12}/> {new Date(e.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                            </div>
                            {(isAdmin || (isOfficer && e.guildId === userProfile.guildId) || (isOfficer && !e.guildId)) && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button type="button" onClick={() => handleEditEvent(e)} className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg hover:shadow-sm"><Edit size={16}/></button>
                                    <button type="button" onClick={(ev) => openDeleteModal("Delete Event?", `Are you sure you want to delete "${e.title}"?`, () => handleDeleteEvent(ev, e.id))} className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg hover:shadow-sm"><Trash2 size={16}/></button>
                                </div>
                            )}
                        </div>
                    ))}
                    {events.length === 0 && <p className="text-center text-zinc-400 py-8">No events scheduled.</p>}
                </div>
            </div>
        </div>
      )}

      {/* --- BREAKING ARMY TAB --- */}
      {activeTab === 'breakingArmy' && (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* CONFIGURATION CARD */}
                <div className={`${cardClass} md:col-span-1 lg:col-span-1 min-w-[300px]`}>
                    <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Settings size={20} className="text-zinc-500" /> Control Center
                        </h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className={labelClass}>Target Branch</label>
                            <select 
                                value={selectedBranchId} 
                                onChange={e => setSelectedBranchId(e.target.value)} 
                                disabled={isOfficer} 
                                className={`${inputClass} ${isOfficer ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {guilds.filter(g => isOfficer ? g.id === userProfile.guildId : true).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Active Boss</label>
                            <div className="relative">
                                {bossPool.find(b => b.name === currentBossMap[selectedBranchId])?.imageUrl && (
                                    <img src={bossPool.find(b => b.name === currentBossMap[selectedBranchId])!.imageUrl} className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md object-cover border border-zinc-300 dark:border-zinc-600" />
                                )}
                                <select value={currentBossMap[selectedBranchId] || ''} onChange={handleUpdateCurrentBoss} className={`${inputClass} ${bossPool.find(b => b.name === currentBossMap[selectedBranchId])?.imageUrl ? 'pl-12' : ''}`}>
                                    <option value="">Select Boss</option>
                                    {bossPool.map(b=><option key={b.name} value={b.name}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className={labelClass}>Weekly Schedule</label>
                                <span className="text-xs text-zinc-400">{(schedulesMap[selectedBranchId] || []).length}/2 Slots</span>
                            </div>
                            <div className="space-y-2 mb-3">
                                {schedulesMap[selectedBranchId]?.map((s,i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-700/50">
                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                            <Clock size={14} className="text-zinc-400" /> {s.day} @ {formatTime12Hour(s.time)}
                                        </span>
                                        <button type="button" onClick={()=>openDeleteModal("Remove Schedule?","Are you sure?",()=>handleRemoveSchedule(i))} className="text-zinc-400 hover:text-red-500 transition-colors"><X size={16} /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col gap-2">
                                <select value={newSchedule.day} onChange={e=>setNewSchedule({...newSchedule, day: e.target.value})} className={inputClass}>
                                    <option>Sunday</option><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option>
                                </select>
                                <div className="flex gap-2">
                                    <input type="time" value={newSchedule.time} onChange={e=>setNewSchedule({...newSchedule, time: e.target.value})} className={`${inputClass} flex-1`} />
                                    <button type="button" onClick={handleAddSchedule} disabled={(schedulesMap[selectedBranchId] || []).length >= 2} className="px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-50"><Plus size={18} /></button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Actions</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={()=>openDeleteModal("Clear Queues?", `Clear all queues for ${guilds.find(g=>g.id===selectedBranchId)?.name}?`, handleResetQueue)} className="px-3 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2">
                                    <Trash2 size={14} /> Clear Queue
                                </button>
                                <button type="button" onClick={()=>openDeleteModal("Reset Winners?", `Reset all winners/cooldowns for ${guilds.find(g=>g.id===selectedBranchId)?.name}?`, handleResetCooldowns)} className="px-3 py-2 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2">
                                    <RefreshCw size={14} /> Reset Winners
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QUEUE & WINNERS */}
                <div className="md:col-span-2 flex flex-col gap-6">
                    <div className={`${cardClass} flex-1`}>
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <ListOrdered size={20} className="text-zinc-500" /> Queue Manager
                            </h3>
                            <span className="text-xs font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500">{guilds.find(g=>g.id===selectedBranchId)?.name}</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                           <table className="w-full">
                               <thead>
                                   <tr>
                                       <th className={tableHeaderClass}>#</th>
                                       <th className={tableHeaderClass}>Player</th>
                                       <th className={tableHeaderClass}>Role</th>
                                       <th className={`${tableHeaderClass} text-right`}>Declare Winner</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {queue.filter(q=>q.guildId===selectedBranchId).map((q, i)=>(
                                       <tr key={q.uid} className={tableRowClass}>
                                           <td className={tableCellClass}><span className="font-mono text-zinc-400">{i+1}</span></td>
                                           <td className={tableCellClass}><span className="font-medium text-zinc-900 dark:text-zinc-100">{q.name}</span></td>
                                           <td className={tableCellClass}><span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{q.role}</span></td>
                                           <td className={`${tableCellClass} text-right`}>
                                               <button type="button" onClick={()=>{setSelectedWinner(q);setIsWinnerModalOpen(true)}} className="p-1.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 hover:bg-yellow-200 dark:hover:bg-yellow-900/40 rounded transition-colors" title="Declare Winner">
                                                   <Crown size={16}/>
                                               </button>
                                           </td>
                                       </tr>
                                   ))}
                                   {queue.filter(q=>q.guildId===selectedBranchId).length === 0 && (
                                       <tr><td colSpan={4} className="p-8 text-center text-zinc-400 text-sm">Queue is empty.</td></tr>
                                   )}
                               </tbody>
                           </table>
                        </div>
                    </div>

                    <div className={`${cardClass} flex-1`}>
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <ShieldAlert size={20} className="text-zinc-500" /> Recent Winners (Cooldown)
                            </h3>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                           <table className="w-full">
                               <thead>
                                   <tr>
                                       <th className={tableHeaderClass}>Player</th>
                                       <th className={tableHeaderClass}>Date</th>
                                       <th className={`${tableHeaderClass} text-center`}>Prize Given</th>
                                       <th className={`${tableHeaderClass} text-right`}>Remove</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {recentWinners.filter(w=>w.branchId===selectedBranchId).map((w,i)=>(
                                       <tr key={i} className={tableRowClass}>
                                           <td className={tableCellClass}>
                                               <div className="flex items-center gap-2">
                                                   <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                                                       <img src={allUsers.find(u=>u.uid===w.uid)?.photoURL || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                                                   </div>
                                                   <span className="font-medium text-zinc-900 dark:text-zinc-100">{allUsers.find(u=>u.uid===w.uid)?.displayName || w.uid}</span>
                                               </div>
                                           </td>
                                           <td className={tableCellClass}>{new Date(w.timestamp).toLocaleDateString()}</td>
                                           <td className={`${tableCellClass} text-center`}>
                                               <input type="checkbox" checked={w.prizeGiven} onChange={()=>handleTogglePrize(w)} className="rounded border-zinc-300 text-rose-900 focus:ring-rose-500" />
                                           </td>
                                           <td className={`${tableCellClass} text-right`}>
                                               <button type="button" onClick={()=>openDeleteModal("Remove Winner?","Remove cooldown for this player?",()=>handleRemoveWinner(w))} className="text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                           </td>
                                       </tr>
                                   ))}
                                   {recentWinners.filter(w=>w.branchId===selectedBranchId).length === 0 && (
                                       <tr><td colSpan={4} className="p-8 text-center text-zinc-400 text-sm">No recent winners.</td></tr>
                                   )}
                               </tbody>
                           </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOSS POOL GRID */}
            {isAdmin && (
                <div className={cardClass}>
                    <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Skull size={20} className="text-zinc-500" /> Boss Pool
                        </h3>
                        <form onSubmit={handleSaveBoss} className="flex gap-2 w-full md:w-auto">
                            <input required placeholder="Name" value={bossForm.name} onChange={e=>setBossForm({...bossForm, name: e.target.value})} className={`${inputClass} w-full md:w-48`} />
                            <input placeholder="Image URL" value={bossForm.imageUrl} onChange={e=>setBossForm({...bossForm, imageUrl: e.target.value})} className={`${inputClass} w-full md:w-48`} />
                            <button type="submit" className="bg-rose-900 hover:bg-rose-950 text-white px-4 py-2 rounded-lg font-medium whitespace-nowrap">{editingBossOriginalName ? 'Update' : 'Add'}</button>
                        </form>
                    </div>
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {bossPool.map(b => (
                            <div key={b.name} className="group relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                {b.imageUrl ? (
                                    <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600"><Skull size={40} /></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                                    <span className="text-white font-bold text-sm truncate shadow-black drop-shadow-md">{b.name}</span>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button type="button" onClick={()=>{setEditingBossOriginalName(b.name);setBossForm(b)}} className="p-1.5 bg-white/90 text-zinc-700 rounded-full shadow-sm hover:bg-white"><Edit size={14}/></button>
                                    <button type="button" onClick={(ev)=>openDeleteModal("Delete Boss?", `Delete ${b.name}?`, ()=>handleDeleteBoss(ev, b.name))} className="p-1.5 bg-white/90 text-red-600 rounded-full shadow-sm hover:bg-white"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* --- LEADERBOARD TAB --- */}
      {activeTab === 'leaderboard' && isAdmin && (
          <div className={cardClass}>
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Trophy size={20} className="text-yellow-500" /> Leaderboard Records
                </h3>
                <button onClick={()=>{setEditingLeaderboardEntry({id:'', rank:0,playerName:'',playerUid:'',branch:'',boss:'',time:'',date:'',status:'verified'}); setLeaderboardModalMode('leaderboard'); setIsLeaderboardModalOpen(true)}} className="bg-rose-900 hover:bg-rose-950 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                    <Plus size={16}/> Manual Record
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={tableHeaderClass}>Player</th>
                            <th className={tableHeaderClass}>Boss</th>
                            <th className={tableHeaderClass}>Time</th>
                            <th className={tableHeaderClass}>Branch</th>
                            <th className={tableHeaderClass}>Date</th>
                            <th className={`${tableHeaderClass} text-right`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map(l=>(
                            <tr key={l.id} className={tableRowClass}>
                                <td className={tableCellClass}><span className="font-bold text-zinc-900 dark:text-zinc-100">{l.playerName}</span></td>
                                <td className={tableCellClass}>{l.boss}</td>
                                <td className={tableCellClass}><span className="font-mono text-rose-700 dark:text-rose-400 font-bold">{l.time}</span></td>
                                <td className={tableCellClass}><span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full text-zinc-500">{l.branch}</span></td>
                                <td className={tableCellClass}>{new Date(l.date).toLocaleDateString()}</td>
                                <td className={`${tableCellClass} text-right`}>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={()=>{setEditingLeaderboardEntry(l);setLeaderboardModalMode('leaderboard');setIsLeaderboardModalOpen(true)}} className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"><Edit size={16}/></button>
                                        <button type="button" onClick={(e)=>openDeleteModal("Delete Record?",`Delete ${l.playerName}'s record?`,()=>handleDeleteLeaderboardEntry(e, l.id))} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
      )}
      
      {/* --- WINNER LOGS TAB --- */}
      {activeTab === 'winnerLogs' && isAdmin && (
          <div className={cardClass}>
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <FileText size={20} className="text-zinc-500" /> Historical Win Logs
                </h3>
                <button 
                    onClick={()=>{
                        setEditingLeaderboardEntry({id:'', rank:0,playerName:'',playerUid:'',branch:'',boss:'',time:'',date:'',status:'verified'}); 
                        setLeaderboardModalMode('winnerLog'); 
                        setIsLeaderboardModalOpen(true);
                    }} 
                    className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-zinc-200 dark:border-zinc-700"
                >
                    <Plus size={16}/> Manual Record
                </button>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                        <tr>
                            <th className={tableHeaderClass}>Player</th>
                            <th className={tableHeaderClass}>Event Name</th>
                            <th className={tableHeaderClass}>Date</th>
                            <th className={`${tableHeaderClass} text-right`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {winnerLogs.map(l=>(
                            <tr key={l.id} className={tableRowClass}>
                                <td className={tableCellClass}><span className="font-medium text-zinc-900 dark:text-zinc-100">{l.playerName}</span></td>
                                <td className={tableCellClass}>{l.boss}</td>
                                <td className={tableCellClass}>{new Date(l.date).toLocaleDateString()}</td>
                                <td className={`${tableCellClass} text-right`}>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={()=>{setEditingLeaderboardEntry(l);setLeaderboardModalMode('winnerLog');setIsLeaderboardModalOpen(true)}} className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"><Edit size={16}/></button>
                                        <button type="button" onClick={(e)=>openDeleteModal("Delete Log?",`Delete ${l.playerName}'s log?`,()=>handleDeleteWinnerLog(e, l.id))} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                  </table>
              </div>
          </div>
      )}
      
      {/* --- USER MANAGEMENT --- */}
      {activeTab === 'users' && isAdmin && (
          <div className={cardClass}>
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between gap-4">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <User size={20} className="text-zinc-500" /> User Database
                </h3>
                <div className="relative w-full md:w-64">
                    {/* Search logic here */}
                    <input type="text" placeholder="Search by name or ID..." value={userSearch} onChange={e=>setUserSearch(e.target.value)} className={`${inputClass} pl-4`} />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                    <thead>
                        <tr>
                            <th className={`${tableHeaderClass} w-1/4`}>User</th>
                            <th className={`${tableHeaderClass} w-1/6`}>ID</th>
                            <th className={`${tableHeaderClass} w-1/4`}>Branch</th>
                            <th className={`${tableHeaderClass} w-1/4`}>System Role</th>
                            <th className={`${tableHeaderClass} w-1/6 text-right`}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(u=>(
                            <tr key={u.uid} className={tableRowClass}>
                                <td className={tableCellClass}>
                                    <div className="flex items-center gap-3">
                                        <img src={u.photoURL || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 object-cover" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{u.displayName}</span>
                                            <span className="text-[10px] text-zinc-500 uppercase">{u.role}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className={tableCellClass}><code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-mono">{u.inGameId}</code></td>
                                <td className={tableCellClass}>{guilds.find(g=>g.id===u.guildId)?.name || <span className="text-zinc-400 italic">None</span>}</td>
                                <td className={tableCellClass}>
                                    <select 
                                        value={u.systemRole} 
                                        onChange={e=>handleRoleChange(u.uid, e.target.value as any)} 
                                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs p-1.5 pr-8 rounded focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                    >
                                        <option>Member</option><option>Officer</option><option>Admin</option>
                                    </select>
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                    <button type="button" onClick={(e)=>openDeleteModal("Kick User?",`Kick ${u.displayName}?`,()=>handleKickUser(e, u.uid))} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
      )}
      
      {/* --- LEAVES TAB --- */}
      {activeTab === 'leaves' && (
          <div className={cardClass}>
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Plane size={20} className="text-zinc-500" /> Leave Requests
                </h3>
                {!isOfficer && (
                    <select value={leaveBranchFilter} onChange={e=>setLeaveBranchFilter(e.target.value)} className={`${inputClass} w-48`}>
                        <option value="All">All Branches</option>
                        {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={tableHeaderClass}>Name</th>
                            <th className={tableHeaderClass}>Branch</th>
                            <th className={tableHeaderClass}>Start Date</th>
                            <th className={tableHeaderClass}>End Date</th>
                            <th className={tableHeaderClass}>Reason</th>
                            <th className={`${tableHeaderClass} text-right`}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLeaves.map(l=>(
                            <tr key={l.id} className={tableRowClass}>
                                <td className={tableCellClass}><span className="font-medium text-zinc-900 dark:text-zinc-100">{l.displayName}</span></td>
                                <td className={tableCellClass}><span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full text-zinc-500">{l.guildName}</span></td>
                                <td className={tableCellClass}>{new Date(l.startDate).toLocaleDateString()}</td>
                                <td className={tableCellClass}>{new Date(l.endDate).toLocaleDateString()}</td>
                                <td className={tableCellClass}><span className="text-zinc-500 italic max-w-[200px] truncate block" title={l.reason}>{l.reason || '-'}</span></td>
                                <td className={`${tableCellClass} text-right`}>
                                    <button type="button" onClick={()=>openDeleteModal("Delete Leave?","Clear this request?",()=>db.collection("leaves").doc(l.id).delete())} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                        {filteredLeaves.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-zinc-400 text-sm">No leave requests found.</td></tr>}
                    </tbody>
                </table>
            </div>
          </div>
      )}

      {/* Modals */}
      <CreateGuildModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateGuild} data={newGuildData} onChange={setNewGuildData} />
      <CreateAnnouncementModal isOpen={isAnnouncementModalOpen} onClose={() => setIsAnnouncementModalOpen(false)} onSubmit={handleSaveAnnouncement} userProfile={userProfile} forceGlobal={false} initialData={editingAnnouncement} />
      <DeclareWinnerModal isOpen={isWinnerModalOpen} onClose={()=>setIsWinnerModalOpen(false)} winnerName={selectedWinner?.name || ''} time={winnerTime} onTimeChange={setWinnerTime} onConfirm={handleConfirmWinner} />
      {editingLeaderboardEntry && <EditLeaderboardModal isOpen={isLeaderboardModalOpen} onClose={()=>setIsLeaderboardModalOpen(false)} entry={editingLeaderboardEntry} setEntry={setEditingLeaderboardEntry} onUpdate={handleUpdateLeaderboardEntry} bossPool={bossPool} guilds={guilds} allUsers={allUsers} mode={leaderboardModalMode} />}
      <ConfirmationModal isOpen={deleteConf.isOpen} onClose={()=>setDeleteConf({...deleteConf, isOpen: false})} onConfirm={deleteConf.action} title={deleteConf.title} message={deleteConf.message} />
    </div>
  );
};

export default Admin;
