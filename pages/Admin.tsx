import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Database, Crown, RefreshCw, Skull, Clock, X, Edit, Trophy, Save, ShieldAlert, FileText, User, ListOrdered, Plane, Settings, Shield, Megaphone, ArrowLeft, ArrowRight, GripHorizontal, Globe, CheckCircle } from 'lucide-react';
import { Guild, QueueEntry, GuildEvent, UserProfile, Boss, BreakingArmyConfig, ScheduleSlot, LeaderboardEntry, CooldownEntry, WinnerLog, LeaveRequest, Announcement, HerosRealmRequest, HerosRealmConfig } from '../types';
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
import { ImageUpload } from '../components/ImageUpload';

const Admin: React.FC = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Tab Management
  // Added 'herosRealm'
  const defaultTabs = ['guilds', 'events', 'announcements', 'breakingArmy', 'herosRealm', 'leaderboard', 'winnerLogs', 'users', 'members', 'leaves'];
  
  // Lazy init to prevent reset
  const [tabOrder, setTabOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('adminTabOrder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
            // Merge parsed with defaultTabs to ensure new tabs appear
            const uniqueTabs = new Set([...parsed, ...defaultTabs]);
            return Array.from(uniqueTabs);
        }
      } catch (e) {
        console.error("Failed to parse tab order", e);
      }
    }
    return defaultTabs;
  });

  // Lazy init active tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    return sessionStorage.getItem('adminActiveTab') || 'guilds';
  });

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
  
  // Hero's Realm
  const [herosRealmConfig, setHerosRealmConfig] = useState<HerosRealmConfig | null>(null);
  const [herosRealmRequests, setHerosRealmRequests] = useState<HerosRealmRequest[]>([]);

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const [editingGuildId, setEditingGuildId] = useState<string | null>(null);
  const [guildEditForm, setGuildEditForm] = useState({ name: '', memberCap: 80 });

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<Partial<GuildEvent>>({
    title: '', description: '', type: 'Raid', date: '', guildId: '', imageUrl: ''
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

  // Standard Event Types
  const standardEventTypes = ['Raid', 'PvP', 'Social', 'Meeting'];

  useEffect(() => {
    // Save tab order to localStorage whenever it changes
    localStorage.setItem('adminTabOrder', JSON.stringify(tabOrder));
  }, [tabOrder]);

  useEffect(() => {
    // Save active tab to sessionStorage whenever it changes
    sessionStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (currentUser) {
        const unsubUser = db.collection("users").doc(currentUser.uid).onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const profile = docSnap.data() as UserProfile;
                setUserProfile(profile);
                
                // If officer, automatically select their branch and don't allow changing for certain tabs
                if (profile.systemRole === 'Officer') {
                    setSelectedBranchId(profile.guildId);
                    setEventForm(prev => ({...prev, guildId: profile.guildId}));
                }
            }
        });
        return () => unsubUser();
    }
  }, [currentUser]);

  // Enforce restricted tabs for Officers (Safety check)
  useEffect(() => {
      if (userProfile?.systemRole === 'Officer') {
          const allowedTabs = ['events', 'breakingArmy', 'herosRealm', 'leaves', 'announcements', 'members'];
          if (!allowedTabs.includes(activeTab)) {
               setActiveTab('events');
          }
      }
  }, [userProfile?.systemRole, activeTab]);

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
    
    // Hero's Realm Config
    const unsubHRConfig = db.collection("system").doc("herosRealm").onSnapshot(snap => {
      if (snap.exists) {
          setHerosRealmConfig(snap.data() as HerosRealmConfig);
      }
    });
    
    // Hero's Realm Requests
    const unsubHRRequests = db.collection("heros_realm_requests").onSnapshot(snap => {
        setHerosRealmRequests(snap.docs.map(d => ({id: d.id, ...d.data()} as HerosRealmRequest)));
    });

    const unsubQueue = db.collection("queue").orderBy("joinedAt", "asc").onSnapshot(snap => {
      setQueue(snap.docs.map(d => ({ ...d.data() } as QueueEntry)));
    });

    const unsubUsers = db.collection("users").onSnapshot(snap => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    return () => {
      unsubGuilds(); unsubEvents(); unsubConfig(); unsubQueue(); unsubUsers(); unsubLeaderboard(); unsubWinnerLogs(); unsubLeaves(); unsubAnnouncements(); unsubHRConfig(); unsubHRRequests();
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
      // localStorage is updated via useEffect
    }
  };

  const getTabLabel = (key: string) => {
    switch (key) {
      case 'guilds': return 'Guild Branches';
      case 'events': return 'Events';
      case 'announcements': return 'Announcements';
      case 'breakingArmy': return 'Breaking Army';
      case 'herosRealm': return "Hero's Realm";
      case 'leaderboard': return 'Leaderboard';
      case 'winnerLogs': return 'Winner Logs';
      case 'users': return 'User Database'; // Renamed for clarity vs Members
      case 'members': return 'Members';
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
        batch.set(db.collection("system").doc("herosRealm"), {
            schedules: {}
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
          setEventForm({ title: '', description: '', type: 'Raid', date: '', guildId: isOfficer ? userProfile.guildId : '', imageUrl: '' });
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
        guildId: event.guildId || '',
        imageUrl: event.imageUrl || ''
    });
  };

  // ANNOUNCEMENT LOGIC
  const handleSaveAnnouncement = async (title: string, content: string, isGlobal: boolean) => {
      try {
          const finalIsGlobal = isOfficer ? false : isGlobal;
          const finalGuildId = isOfficer ? userProfile.guildId : (isGlobal ? 'global' : 'global');

          if (editingAnnouncement) {
              await db.collection("announcements").doc(editingAnnouncement.id).update({
                  title, content, isGlobal: finalIsGlobal, guildId: editingAnnouncement.guildId 
              });
              showAlert("Announcement updated!", 'success');
          } else {
              await db.collection("announcements").add({
                  title, content, isGlobal: finalIsGlobal,
                  authorId: userProfile.uid,
                  authorName: userProfile.displayName,
                  timestamp: new Date().toISOString(),
                  guildId: finalGuildId
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

  // HERO'S REALM LOGIC
  const handleSetHerosRealmSchedule = async (req: HerosRealmRequest) => {
      if (!selectedBranchId) return;
      try {
          const systemRef = db.collection("system").doc("herosRealm");
          const currentSchedules = herosRealmConfig?.schedules || {};
          
          // Set as the only schedule for now, or append? Let's treat it as setting THE schedule
          const updatedSchedules = {
              ...currentSchedules,
              [selectedBranchId]: [{ day: req.day, time: req.time }]
          };
          
          await systemRef.set({ schedules: updatedSchedules }, { merge: true });
          showAlert("Hero's Realm schedule updated.", 'success');
      } catch (err: any) {
          showAlert(`Error: ${err.message}`, 'error');
      }
  };

  const handleClearHerosRealmSchedule = async () => {
      if (!selectedBranchId) return;
       try {
          const batch = db.batch();
          const systemRef = db.collection("system").doc("herosRealm");
          
          // 1. Clear config schedule
          const currentSchedules = herosRealmConfig?.schedules || {};
          const updatedSchedules = { ...currentSchedules };
          delete updatedSchedules[selectedBranchId];
          batch.set(systemRef, { schedules: updatedSchedules }, { merge: true });

          // 2. Delete all requests for this branch
          const reqs = await db.collection("heros_realm_requests").where("guildId", "==", selectedBranchId).get();
          reqs.forEach(doc => batch.delete(doc.ref));

          await batch.commit();
          showAlert("Schedule cleared and requests reset.", 'info');
      } catch (err: any) {
          showAlert(`Error: ${err.message}`, 'error');
      }
  };
  
  const handleUpdateHerosRealmBoss = async (index: number, bossName: string) => {
      if (!selectedBranchId) return;
      try {
          const systemRef = db.collection("system").doc("herosRealm");
          const currentBosses = herosRealmConfig?.currentBosses || {};
          const branchBosses = currentBosses[selectedBranchId] ? [...currentBosses[selectedBranchId]] : ["", ""];
          
          // Ensure array has at least 2 slots
          while(branchBosses.length < 2) branchBosses.push("");
          
          branchBosses[index] = bossName;
          
          await systemRef.set({
              currentBosses: { ...currentBosses, [selectedBranchId]: branchBosses }
          }, { merge: true });
          
      } catch (err) {
          console.error(err);
      }
  };

  const handleDeleteHerosRealmRequest = async (id: string) => {
      await db.collection("heros_realm_requests").doc(id).delete();
  };


  const handleConfirmWinner = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedWinner) return;

      const batch = db.batch();
      
      const leaderboardDocRef = db.collection("leaderboard").doc();
      const winnerLogDocRef = db.collection("winner_logs").doc();

      const newEntry: LeaderboardEntry = {
        id: leaderboardDocRef.id,
        rank: 1,
        playerName: selectedWinner.name,
        playerUid: selectedWinner.uid,
        branch: guilds.find(g => g.id === selectedWinner.guildId)?.name || 'Unknown',
        boss: currentBossMap[selectedWinner.guildId] || 'Unknown Boss',
        time: winnerTime,
        date: new Date().toISOString(),
        status: 'verified'
      };
      
      const winnerLogEntry: WinnerLog = {
          ...newEntry,
          id: winnerLogDocRef.id, // Winner log gets its own ID
          prizeGiven: false,
          status: 'verified'
      };

      batch.set(leaderboardDocRef, newEntry);
      batch.set(winnerLogDocRef, winnerLogEntry);
      batch.delete(db.collection("queue").doc(selectedWinner.uid));
      
      const newCooldownEntry: CooldownEntry = {
          uid: selectedWinner.uid,
          branchId: selectedWinner.guildId,
          timestamp: new Date().toISOString(),
          prizeGiven: false
      };
      batch.set(configRef, { recentWinners: firebase.firestore.FieldValue.arrayUnion(newCooldownEntry) }, { merge: true });
      await batch.commit();
      
      setIsWinnerModalOpen(false);
      setSelectedWinner(null);
      setWinnerTime('');
      showAlert(`${selectedWinner.name} is the winner!`, 'success');
  };

  const handleRemoveFromQueue = async (uid: string) => {
      try {
          await db.collection("queue").doc(uid).delete();
          showAlert("Player removed from queue.", 'success');
      } catch (err: any) {
          showAlert(`Failed to remove player: ${err.message}`, 'error');
      }
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
  
  const handleToggleWinnerLogPrize = async (logId: string, currentVal: boolean) => {
      try {
          await db.collection("winner_logs").doc(logId).update({ prizeGiven: !currentVal });
      } catch (err: any) {
          showAlert(`Failed to update prize status: ${err.message}`, 'error');
      }
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
  
  // Filter for Officer's Member tab (or Admin viewing a specific branch)
  const targetGuildId = isAdmin ? selectedBranchId : userProfile.guildId;
  const filteredBranchMembers = allUsers.filter(u => 
      u.guildId === targetGuildId &&
      (u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
       (u.inGameId && u.inGameId.toLowerCase().includes(userSearch.toLowerCase())))
  );

  const filteredLeaves = leaves.filter(l => 
      isOfficer ? l.guildId === userProfile.guildId : (leaveBranchFilter === 'All' || l.guildId === leaveBranchFilter)
  );
  
  const filteredAnnouncements = announcements.filter(a => {
      if (isAdmin) return true;
      if (isOfficer) return a.guildId === userProfile.guildId;
      return false; 
  });
  
  // Hero's Realm Filter
  const filteredHerosRealmRequests = herosRealmRequests
    .filter(req => req.guildId === selectedBranchId)
    .sort((a, b) => b.votes.length - a.votes.length);

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

  const availableTabs = tabOrder.filter(tab => {
      if (isAdmin) return true;
      if (isOfficer) return ['events', 'breakingArmy', 'herosRealm', 'leaves', 'announcements', 'members'].includes(tab);
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

      {/* --- EVENTS TAB --- */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardClass}>
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Calendar size={20} className="text-zinc-500" /> Schedule Event
                    </h3>
                </div>
                <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                    <div>
                        <label className={labelClass}>Event Title</label>
                        <input required value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className={inputClass} placeholder="e.g. Raid Reset" />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className={labelClass}>Description</label>
                            <span className="text-[10px] text-zinc-400">{eventForm.description?.length || 0} / 500</span>
                        </div>
                        <textarea required value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} className={`${inputClass} min-h-[100px]`} maxLength={500} />
                    </div>
                    <div>
                         <label className={labelClass}>Banner Image (Optional)</label>
                         <ImageUpload 
                            initialUrl={eventForm.imageUrl}
                            onUploadComplete={(url) => setEventForm({...eventForm, imageUrl: url})}
                            folder="events"
                         />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Date & Time</label>
                            <input required type="datetime-local" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className={`${inputClass} w-full [color-scheme:light] dark:[color-scheme:dark]`} />
                        </div>
                        <div>
                            <label className={labelClass}>Type</label>
                            {eventForm.type && !standardEventTypes.includes(eventForm.type) ? (
                                <div className="flex gap-2">
                                    <input autoFocus type="text" value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value})} className={inputClass} placeholder="Custom Type" />
                                    <button type="button" onClick={() => setEventForm({...eventForm, type: 'Raid'})} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500"><X size={16} /></button>
                                </div>
                            ) : (
                                <select value={eventForm.type} onChange={e => {
                                    if(e.target.value === 'Custom') setEventForm({...eventForm, type: ''});
                                    else setEventForm({...eventForm, type: e.target.value});
                                }} className={inputClass}>
                                    {standardEventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    <option value="Custom">Custom...</option>
                                </select>
                            )}
                        </div>
                    </div>
                    {isAdmin && (
                        <div>
                            <label className={labelClass}>Guild Branch</label>
                            <select value={eventForm.guildId} onChange={e => setEventForm({...eventForm, guildId: e.target.value})} className={inputClass}>
                                <option value="">Global (All Branches)</option>
                                {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                    )}
                    <button type="submit" className="w-full bg-rose-900 text-white p-3 rounded-lg font-bold hover:bg-rose-950 transition-colors shadow-lg shadow-rose-900/20">
                        {editingEventId ? 'Update Event' : 'Schedule Event'}
                    </button>
                    {editingEventId && (
                        <button type="button" onClick={() => { setEditingEventId(null); setEventForm({ title: '', description: '', type: 'Raid', date: '', guildId: isOfficer ? userProfile.guildId : '', imageUrl: '' }); }} className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 p-2 rounded-lg font-medium">Cancel Edit</button>
                    )}
                </form>
            </div>
            
            <div className={`${cardClass} flex flex-col`}>
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <ListOrdered size={20} className="text-zinc-500" /> Upcoming Events
                    </h3>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[600px]">
                    {events.filter(e => isOfficer ? e.guildId === userProfile.guildId || !e.guildId : true).map(event => (
                        <div key={event.id} className="p-4 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{event.title}</h4>
                                    <span className="text-xs text-zinc-500">{new Date(event.date).toLocaleString()}</span>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEditEvent(event)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit size={14}/></button>
                                    <button onClick={(e) => openDeleteModal("Delete Event?", "Are you sure?", () => handleDeleteEvent(e, event.id))} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{event.description}</p>
                            <div className="mt-2 flex gap-2">
                                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">{event.type}</span>
                                <span className="text-xs bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded">{event.guildId ? guilds.find(g => g.id === event.guildId)?.name : 'Global'}</span>
                            </div>
                        </div>
                    ))}
                    {events.length === 0 && <div className="p-8 text-center text-zinc-400">No events scheduled.</div>}
                </div>
            </div>
        </div>
      )}

      {/* --- ANNOUNCEMENTS TAB --- */}
      {activeTab === 'announcements' && (
        <div className={cardClass}>
           <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Megaphone size={20} className="text-blue-500" /> Announcements
                </h2>
                <button 
                    onClick={() => { setEditingAnnouncement(null); setIsAnnouncementModalOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                    <Plus size={16}/> Post Announcement
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={tableHeaderClass}>Date</th>
                            <th className={tableHeaderClass}>Title</th>
                            <th className={tableHeaderClass}>Author</th>
                            <th className={tableHeaderClass}>Scope</th>
                            <th className={`${tableHeaderClass} text-right`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAnnouncements.map(ann => (
                            <tr key={ann.id} className={tableRowClass}>
                                <td className={tableCellClass}>{new Date(ann.timestamp).toLocaleDateString()}</td>
                                <td className={tableCellClass}><span className="font-medium text-zinc-900 dark:text-zinc-100">{ann.title}</span></td>
                                <td className={tableCellClass}>{ann.authorName}</td>
                                <td className={tableCellClass}>
                                    {ann.isGlobal ? (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Global</span>
                                    ) : (
                                        <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{guilds.find(g => g.id === ann.guildId)?.name || ann.guildId}</span>
                                    )}
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setEditingAnnouncement(ann); setIsAnnouncementModalOpen(true); }} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"><Edit size={16} /></button>
                                        <button onClick={() => openDeleteModal("Delete Announcement?", "Are you sure?", () => handleDeleteAnnouncement(ann.id))} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredAnnouncements.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-zinc-400 text-sm">No announcements found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- HERO'S REALM TAB --- */}
      {activeTab === 'herosRealm' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={cardClass}>
                  <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                      <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <Settings size={20} className="text-zinc-500" /> Settings
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
                          <label className={labelClass}>Active Bosses (Left & Right)</label>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                              {[0, 1].map((idx) => (
                                  <div key={idx} className="relative">
                                      <select 
                                          className={`${inputClass} text-xs`}
                                          value={herosRealmConfig?.currentBosses?.[selectedBranchId]?.[idx] || ""}
                                          onChange={(e) => handleUpdateHerosRealmBoss(idx, e.target.value)}
                                      >
                                          <option value="">Random / Pool</option>
                                          {bossPool.map(b => (
                                              <option key={b.name} value={b.name}>{b.name}</option>
                                          ))}
                                      </select>
                                  </div>
                              ))}
                          </div>
                          <p className="text-xs text-zinc-400">Select specific bosses to display on the dashboard.</p>
                      </div>

                      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                          <label className={labelClass}>Current Official Schedule</label>
                          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700">
                              {herosRealmConfig?.schedules?.[selectedBranchId]?.length ? (
                                  <div className="flex items-center justify-between">
                                      <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                          <Clock size={16} className="text-purple-600 dark:text-purple-400" />
                                          {herosRealmConfig.schedules[selectedBranchId][0].day} @ {formatTime12Hour(herosRealmConfig.schedules[selectedBranchId][0].time)}
                                      </span>
                                      <button onClick={handleClearHerosRealmSchedule} className="text-xs text-red-500 hover:underline">Clear</button>
                                  </div>
                              ) : (
                                  <p className="text-sm text-zinc-400 italic">No schedule set.</p>
                              )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-2">
                              Clearing the schedule will also remove all current member requests/votes.
                          </p>
                      </div>
                  </div>
              </div>

              <div className={`${cardClass} md:col-span-2`}>
                  <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                      <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <Clock size={20} className="text-purple-500" /> Member Requests (Polls)
                      </h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full">
                          <thead>
                              <tr>
                                  <th className={tableHeaderClass}>Proposed Time</th>
                                  <th className={tableHeaderClass}>Requested By</th>
                                  <th className={tableHeaderClass}>Votes</th>
                                  <th className={`${tableHeaderClass} text-right`}>Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              {filteredHerosRealmRequests.map(req => (
                                  <tr key={req.id} className={tableRowClass}>
                                      <td className={tableCellClass}>
                                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{req.day}</span>
                                          <span className="text-zinc-500 dark:text-zinc-400 ml-2">@ {formatTime12Hour(req.time)}</span>
                                      </td>
                                      <td className={tableCellClass}>{req.createdByName}</td>
                                      <td className={tableCellClass}>
                                          <span className="inline-flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 px-2 py-0.5 rounded-full text-xs">
                                              {req.votes.length} Votes
                                          </span>
                                      </td>
                                      <td className={`${tableCellClass} text-right`}>
                                          <div className="flex justify-end gap-2">
                                              <button 
                                                onClick={() => handleSetHerosRealmSchedule(req)}
                                                className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded transition-colors"
                                                title="Approve & Set as Schedule"
                                              >
                                                  <CheckCircle size={16} />
                                              </button>
                                              <button 
                                                onClick={() => handleDeleteHerosRealmRequest(req.id)}
                                                className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded transition-colors"
                                                title="Delete Request"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                              {filteredHerosRealmRequests.length === 0 && (
                                  <tr><td colSpan={4} className="p-8 text-center text-zinc-400 text-sm">No requests found.</td></tr>
                              )}
                          </tbody>
                      </table>
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
                        {/* ... Existing Breaking Army Config UI ... */}
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
                                       <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {queue.filter(q=>q.guildId===selectedBranchId).map((q, i)=>(
                                       <tr key={q.uid} className={tableRowClass}>
                                           <td className={tableCellClass}><span className="font-mono text-zinc-400">{i+1}</span></td>
                                           <td className={tableCellClass}><span className="font-medium text-zinc-900 dark:text-zinc-100">{q.name}</span></td>
                                           <td className={tableCellClass}><span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{q.role}</span></td>
                                           <td className={`${tableCellClass} text-right`}>
                                               <div className="flex justify-end gap-2">
                                                   <button type="button" onClick={()=>{setSelectedWinner(q);setIsWinnerModalOpen(true)}} className="p-1.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 hover:bg-yellow-200 dark:hover:bg-yellow-900/40 rounded transition-colors" title="Declare Winner">
                                                       <Crown size={16}/>
                                                   </button>
                                                   <button type="button" onClick={()=>openDeleteModal("Remove Player?", `Remove ${q.name} from the queue?`, () => handleRemoveFromQueue(q.uid))} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Remove from Queue">
                                                       <Trash2 size={16}/>
                                                   </button>
                                               </div>
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
                                <Clock size={20} className="text-yellow-500" /> Recent Winners (Cooldowns)
                            </h3>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                           <table className="w-full">
                               <thead>
                                   <tr>
                                       <th className={tableHeaderClass}>Player</th>
                                       <th className={tableHeaderClass}>Win Date</th>
                                       <th className={`${tableHeaderClass} text-right`}>Actions</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {recentWinners.filter(w=>w.branchId===selectedBranchId).map(w => {
                                       const user = allUsers.find(u => u.uid === w.uid);
                                       return (
                                           <tr key={`${w.uid}-${w.timestamp}`} className={tableRowClass}>
                                               <td className={tableCellClass}><span className="font-medium text-zinc-900 dark:text-zinc-100">{user?.displayName || 'Unknown'}</span></td>
                                               <td className={tableCellClass}>{new Date(w.timestamp).toLocaleDateString()}</td>
                                               <td className={`${tableCellClass} text-right`}>
                                                   <button type="button" onClick={()=>openDeleteModal("Reset Cooldown?", `Remove cooldown for ${user?.displayName}?`, () => handleRemoveWinner(w))} className="text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                               </td>
                                           </tr>
                                       );
                                   })}
                                   {recentWinners.filter(w=>w.branchId===selectedBranchId).length === 0 && (
                                       <tr><td colSpan={3} className="p-8 text-center text-zinc-400 text-sm">No active cooldowns.</td></tr>
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
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {bossPool.map(boss => (
                            <div key={boss.name} className="relative group bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 text-center border border-zinc-200 dark:border-zinc-700">
                                <div className="w-full aspect-square rounded bg-zinc-200 dark:bg-zinc-700 mb-2 overflow-hidden relative">
                                    {boss.imageUrl ? <img src={boss.imageUrl} className="w-full h-full object-cover" /> : <Skull className="absolute inset-0 m-auto text-zinc-400" />}
                                </div>
                                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{boss.name}</p>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                    <button onClick={()=>{setBossForm(boss); setEditingBossOriginalName(boss.name)}} className="p-1 bg-blue-500 text-white rounded shadow"><Edit size={10} /></button>
                                    <button onClick={(e)=>handleDeleteBoss(e, boss.name)} className="p-1 bg-red-500 text-white rounded shadow"><Trash2 size={10} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* --- LEADERBOARD TAB --- */}
      {activeTab === 'leaderboard' && (
        <div className={cardClass}>
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Trophy size={20} className="text-yellow-500" /> Leaderboard Records
                </h2>
                <button 
                    onClick={() => {
                        setEditingLeaderboardEntry({id: '', rank: 0, playerName: '', playerUid: '', branch: '', boss: '', time: '', date: new Date().toISOString(), status: 'verified'});
                        setLeaderboardModalMode('leaderboard');
                        setIsLeaderboardModalOpen(true);
                    }}
                    className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-zinc-200 dark:border-zinc-700"
                >
                    <Plus size={16}/> Add Record
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={tableHeaderClass}>Rank</th>
                            <th className={tableHeaderClass}>Player</th>
                            <th className={tableHeaderClass}>Boss</th>
                            <th className={tableHeaderClass}>Time</th>
                            <th className={tableHeaderClass}>Branch</th>
                            <th className={`${tableHeaderClass} text-right`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((entry, idx) => (
                            <tr key={entry.id} className={tableRowClass}>
                                <td className={tableCellClass}><span className="font-mono font-bold text-zinc-500">#{idx + 1}</span></td>
                                <td className={tableCellClass}><span className="font-medium text-zinc-900 dark:text-zinc-100">{entry.playerName}</span></td>
                                <td className={tableCellClass}>{entry.boss}</td>
                                <td className={tableCellClass}><span className="font-mono text-rose-900 dark:text-rose-400 font-bold">{entry.time}</span></td>
                                <td className={tableCellClass}><span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">{entry.branch}</span></td>
                                <td className={`${tableCellClass} text-right`}>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setEditingLeaderboardEntry(entry); setLeaderboardModalMode('leaderboard'); setIsLeaderboardModalOpen(true); }} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"><Edit size={16} /></button>
                                        <button onClick={(e) => handleDeleteLeaderboardEntry(e, entry.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"><Trash2 size={16} /></button>
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
      {activeTab === 'winnerLogs' && (
        <div className={cardClass}>
             <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Trophy size={20} className="text-orange-500" /> Winner Logs & Prizes
                </h2>
                <button 
                    onClick={() => {
                        setEditingLeaderboardEntry({id: '', rank: 1, playerName: '', playerUid: '', branch: '', boss: '', time: '', date: new Date().toISOString(), status: 'verified'});
                        setLeaderboardModalMode('winnerLog');
                        setIsLeaderboardModalOpen(true);
                    }}
                    className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-zinc-200 dark:border-zinc-700"
                >
                    <Plus size={16}/> Add Winner Log
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={tableHeaderClass}>Date</th>
                            <th className={tableHeaderClass}>Winner</th>
                            <th className={tableHeaderClass}>Event/Boss</th>
                            <th className={tableHeaderClass}>Branch</th>
                            <th className={tableHeaderClass}>Prize Status</th>
                            <th className={`${tableHeaderClass} text-right`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {winnerLogs.map(log => (
                            <tr key={log.id} className={tableRowClass}>
                                <td className={tableCellClass}>{new Date(log.date).toLocaleDateString()}</td>
                                <td className={tableCellClass}><span className="font-bold text-zinc-900 dark:text-zinc-100">{log.playerName}</span></td>
                                <td className={tableCellClass}>{log.boss}</td>
                                <td className={tableCellClass}>{log.branch}</td>
                                <td className={tableCellClass}>
                                    <button 
                                        onClick={() => handleToggleWinnerLogPrize(log.id, !!log.prizeGiven)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                                            log.prizeGiven 
                                            ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900' 
                                            : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900'
                                        }`}
                                    >
                                        {log.prizeGiven ? 'Prize Given' : 'Pending Prize'}
                                    </button>
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                     <button onClick={(e) => handleDeleteWinnerLog(e, log.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                         {winnerLogs.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-zinc-400 text-sm">No winner logs found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && isAdmin && (
        <div className={cardClass}>
           <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <User size={20} className="text-zinc-500" /> User Database
                </h2>
                <input 
                    type="text" 
                    placeholder="Search Users..." 
                    className={`${inputClass} max-w-xs`}
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={tableHeaderClass}>User</th>
                            <th className={tableHeaderClass}>Guild Branch</th>
                            <th className={tableHeaderClass}>Role</th>
                            <th className={tableHeaderClass}>System Role</th>
                            <th className={`${tableHeaderClass} text-right`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(u => (
                            <tr key={u.uid} className={tableRowClass}>
                                <td className={tableCellClass}>
                                    <div className="flex items-center gap-3">
                                        <img src={u.photoURL || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                                        <div>
                                            <p className="font-bold text-zinc-900 dark:text-zinc-100">{u.displayName}</p>
                                            <p className="text-xs text-zinc-500">{u.inGameId}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className={tableCellClass}>{guilds.find(g => g.id === u.guildId)?.name || 'None'}</td>
                                <td className={tableCellClass}>{u.role}</td>
                                <td className={tableCellClass}>
                                    <select 
                                        value={u.systemRole} 
                                        onChange={(e) => handleRoleChange(u.uid, e.target.value as any)}
                                        className="bg-transparent border-none text-sm font-medium text-zinc-700 dark:text-zinc-300 focus:ring-0 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-2"
                                        disabled={u.uid === currentUser?.uid}
                                    >
                                        <option value="Member">Member</option>
                                        <option value="Officer">Officer</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                     <button onClick={(e) => openDeleteModal("Kick User?", `Are you sure you want to remove ${u.displayName} from the guild?`, () => handleKickUser(e, u.uid))} className="text-zinc-400 hover:text-red-500 transition-colors" disabled={u.uid === currentUser?.uid}><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- MEMBERS TAB --- */}
      {activeTab === 'members' && (
          <div className={cardClass}>
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <User size={20} className="text-zinc-500" /> Members Management
                      </h2>
                      {isAdmin && (
                        <select 
                            value={selectedBranchId} 
                            onChange={e => setSelectedBranchId(e.target.value)} 
                            className={`${inputClass} py-1 text-xs w-auto`}
                        >
                            {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      )}
                  </div>
                  <input 
                      type="text" 
                      placeholder="Search..." 
                      className={`${inputClass} max-w-xs`}
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                  />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={tableHeaderClass}>User</th>
                            <th className={tableHeaderClass}>System Role</th>
                            <th className={`${tableHeaderClass} text-right`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBranchMembers.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-zinc-400 text-sm">No members found in this branch.</td></tr>
                        ) : (
                            filteredBranchMembers.map(u => {
                                const canKick = isAdmin ? u.systemRole !== 'Admin' : (isOfficer ? u.systemRole === 'Member' : false);
                                return (
                                    <tr key={u.uid} className={tableRowClass}>
                                        <td className={tableCellClass}>
                                            <div className="flex items-center gap-3">
                                                <img src={u.photoURL || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                                                <div>
                                                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{u.displayName}</p>
                                                    <p className="text-xs text-zinc-500">{u.inGameId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={tableCellClass}>
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${
                                                u.systemRole === 'Admin' ? 'bg-red-100 text-red-700' :
                                                u.systemRole === 'Officer' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-zinc-100 text-zinc-600'
                                            }`}>{u.systemRole}</span>
                                        </td>
                                        <td className={`${tableCellClass} text-right`}>
                                            <button 
                                                onClick={(e) => openDeleteModal("Kick Member?", `Remove ${u.displayName} from the guild?`, () => handleKickUser(e, u.uid))}
                                                className={`text-zinc-400 hover:text-red-500 transition-colors ${!canKick ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                disabled={!canKick}
                                                title={!canKick ? "Cannot kick higher or equal role" : "Kick Member"}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
          </div>
      )}

      {/* --- LEAVES TAB --- */}
      {activeTab === 'leaves' && (
        <div className={cardClass}>
           <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-4">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Plane size={20} className="text-zinc-500" /> Leave Requests
                </h2>
                {isAdmin && (
                    <select value={leaveBranchFilter} onChange={e => setLeaveBranchFilter(e.target.value)} className={`${inputClass} max-w-xs`}>
                        <option value="All">All Branches</option>
                        {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={tableHeaderClass}>Member</th>
                            <th className={tableHeaderClass}>Guild</th>
                            <th className={tableHeaderClass}>Dates</th>
                            <th className={tableHeaderClass}>Reason</th>
                            <th className={tableHeaderClass}>Filed On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLeaves.map(l => (
                            <tr key={l.id} className={tableRowClass}>
                                <td className={tableCellClass}>
                                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{l.displayName}</div>
                                    <div className="text-xs text-zinc-500">{l.inGameId}</div>
                                </td>
                                <td className={tableCellClass}>{l.guildName}</td>
                                <td className={tableCellClass}>
                                    <div className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded inline-block text-zinc-600 dark:text-zinc-400">
                                        {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className={tableCellClass}><span className="text-zinc-600 dark:text-zinc-400 italic">{l.reason || 'None provided'}</span></td>
                                <td className={tableCellClass}><span className="text-xs text-zinc-400">{new Date(l.timestamp).toLocaleDateString()}</span></td>
                            </tr>
                        ))}
                        {filteredLeaves.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-zinc-400 text-sm">No leave requests found.</td></tr>
                        )}
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