import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Database, Crown, Skull, Clock, Edit, Trophy, ShieldAlert, FileText, User, Plane, Megaphone, GripVertical, Globe, Check, Image as ImageIcon, Search, AlertTriangle, ArrowRight, ShieldCheck, Shield } from 'lucide-react';
import { Guild, QueueEntry, GuildEvent, UserProfile, Boss, BreakingArmyConfig, ScheduleSlot, LeaderboardEntry, CooldownEntry, WinnerLog, LeaveRequest, Announcement, HerosRealmRequest, HerosRealmConfig, RoleType } from '../types';
import { db } from '../services/firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { CreateGuildModal } from '../components/modals/CreateGuildModal';
import { EditLeaderboardModal } from '../components/modals/EditLeaderboardModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { AddBossModal } from '../components/modals/AddBossModal';
import { RichText } from '../components/RichText';
import { ImageUpload } from '../components/ImageUpload';

const Admin: React.FC = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Tab Management
  const defaultTabs = ['guilds', 'events', 'announcements', 'breakingArmy', 'herosRealm', 'leaderboard', 'winnerLogs', 'members', 'users', 'leaves'];
  
  const [tabOrder, setTabOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('adminTabOrder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const uniqueTabs = new Set([...parsed, ...defaultTabs]);
            return Array.from(uniqueTabs);
        }
      } catch (e) {
        console.error("Failed to parse tab order", e);
      }
    }
    return defaultTabs;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    return sessionStorage.getItem('adminActiveTab') || 'guilds';
  });

  // Drag State for Tabs
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);

  const [isCreateGuildModalOpen, setIsCreateGuildModalOpen] = useState(false);
  const [newGuildData, setNewGuildData] = useState({ name: '', id: '', memberCap: 80});
  
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [winnerLogs, setWinnerLogs] = useState<WinnerLog[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  
  const [currentBossMap, setCurrentBossMap] = useState<Record<string, string>>({});
  const [schedulesMap, setSchedulesMap] = useState<Record<string, ScheduleSlot[]>>({});
  const [bossPool, setBossPool] = useState<Boss[]>([]);
  
  const [herosRealmConfig, setHerosRealmConfig] = useState<HerosRealmConfig | null>(null);
  const [herosRealmRequests, setHerosRealmRequests] = useState<HerosRealmRequest[]>([]);

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Forms & Editing
  const [editingGuildId, setEditingGuildId] = useState<string | null>(null);
  const [guildEditForm, setGuildEditForm] = useState({ name: '', memberCap: 80 });

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<{
    title: string;
    description: string;
    type: string;
    customType: string;
    date: string;
    guildId: string;
    imageUrl: string;
  }>({
    title: '', description: '', type: 'Raid', customType: '', date: '', guildId: '', imageUrl: ''
  });

  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', isGlobal: true });

  const [isAddBossModalOpen, setIsAddBossModalOpen] = useState(false);
  const [editingBossOriginalName, setEditingBossOriginalName] = useState<string | null>(null);
  const [bossForm, setBossForm] = useState({ name: '', imageUrl: '' });

  // 12-Hour Schedule Input State
  const [newScheduleDay, setNewScheduleDay] = useState('Wednesday');
  const [newScheduleTime, setNewScheduleTime] = useState({ hour: '8', minute: '00', ampm: 'PM' });
  
  // Admin Config Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

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
  const [memberListFilter, setMemberListFilter] = useState('All');

  // Drag State for Boss Pool
  const [draggedBossIndex, setDraggedBossIndex] = useState<number | null>(null);

  const isAdmin = userProfile?.systemRole === 'Admin';
  const isOfficer = userProfile?.systemRole === 'Officer';

  const standardEventTypes = ['Raid', 'PvP', 'Social', 'Meeting'];

  useEffect(() => {
    localStorage.setItem('adminTabOrder', JSON.stringify(tabOrder));
  }, [tabOrder]);

  useEffect(() => {
    sessionStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (currentUser) {
        setLoadingProfile(true);
        const unsubUser = db.collection("users").doc(currentUser.uid).onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const profile = docSnap.data() as UserProfile;
                setUserProfile(profile);
                if (profile.systemRole === 'Officer') {
                    setSelectedBranchId(profile.guildId);
                    setEventForm(prev => ({...prev, guildId: profile.guildId}));
                    setAnnouncementForm(prev => ({...prev, isGlobal: false}));
                    // Officer: Force Member List to their guild
                    setMemberListFilter(profile.guildId);
                } else if (profile.systemRole === 'Admin') {
                    setAnnouncementForm(prev => ({...prev, isGlobal: true}));
                }
            } else {
                setUserProfile(null);
            }
            setLoadingProfile(false);
        });
        return () => unsubUser();
    } else {
        setLoadingProfile(false);
    }
  }, [currentUser]);

  useEffect(() => {
      if (!loadingProfile && userProfile?.systemRole === 'Officer') {
          const allowedTabs = ['events', 'breakingArmy', 'herosRealm', 'leaves', 'announcements', 'members'];
          if (!allowedTabs.includes(activeTab)) {
               setActiveTab('events');
          }
      }
  }, [loadingProfile, userProfile?.systemRole, activeTab]);

  // Ensure default branch is selected if admin hasn't selected one
  useEffect(() => {
    if (isAdmin && !selectedBranchId && guilds.length > 0) {
      setSelectedBranchId(guilds[0].id);
    }
  }, [guilds, isAdmin, selectedBranchId]);

  useEffect(() => {
    const unsubGuilds = db.collection("guilds").orderBy("name").onSnapshot(snap => {
      const g = snap.docs.map(d => ({ id: d.id, ...d.data() } as Guild));
      setGuilds(g);
    });

    const unsubEvents = db.collection("events").orderBy("date", "desc").onSnapshot(snap => {
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

    const unsubQueue = db.collection("queue").orderBy("joinedAt", "asc").onSnapshot(snap => {
        const qData = snap.docs.map(d => {
            const data = d.data();
            const joinedAt = data.joinedAt?.toDate ? data.joinedAt.toDate() : new Date(data.joinedAt);
            return { ...data, joinedAt } as QueueEntry;
        });
        setQueue(qData);
    });

    const unsubConfig = db.collection("system").doc("breakingArmy").onSnapshot(snap => {
      if (snap.exists) {
        const data = snap.data() as BreakingArmyConfig;
        setCurrentBossMap(data.currentBoss || {});
        setSchedulesMap(data.schedules || {});
        setBossPool(data.bossPool || []);
      }
    });
    
    const unsubHRConfig = db.collection("system").doc("herosRealm").onSnapshot(snap => {
      if (snap.exists) {
          setHerosRealmConfig(snap.data() as HerosRealmConfig);
      }
    });
    
    const unsubHRRequests = db.collection("heros_realm_requests").onSnapshot(snap => {
        setHerosRealmRequests(snap.docs.map(d => ({id: d.id, ...d.data()} as HerosRealmRequest)));
    });

    const unsubUsers = db.collection("users").onSnapshot(snap => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    return () => {
      unsubGuilds(); unsubEvents(); unsubConfig(); unsubUsers(); unsubLeaderboard(); unsubWinnerLogs(); unsubLeaves(); unsubAnnouncements(); unsubHRConfig(); unsubHRRequests(); unsubQueue();
    };
  }, []);

  // --- Logic for Hero's Realm Reset (Weekly Monday) ---
  useEffect(() => {
    const checkWeeklyReset = async () => {
        if (!isAdmin) return;
        // Logic placehoder
    };
    checkWeeklyReset();
  }, [isAdmin]);

  const handleResetHerosRealm = async () => {
      setDeleteConf({
          isOpen: true,
          title: "Reset Weekly Polls?",
          message: "This will clear all votes and requests for Hero's Realm. Do this every Monday.",
          action: async () => {
              const batch = db.batch();
              const snaps = await db.collection("heros_realm_requests").get();
              snaps.forEach(doc => batch.delete(doc.ref));
              await batch.commit();
              showAlert("Weekly polls reset.", 'success');
          }
      });
  };

  const handleApproveHerosRealm = async (req: HerosRealmRequest) => {
      // Set the schedule for this guild in system/herosRealm
      const newSchedule: ScheduleSlot = { day: req.day, time: req.time };
      const currentConfig = herosRealmConfig || { schedules: {}, currentBosses: {} };
      
      const updatedSchedules = { ...currentConfig.schedules, [req.guildId]: [newSchedule] };
      
      try {
          await db.collection("system").doc("herosRealm").set({ schedules: updatedSchedules }, { merge: true });
          // removed showAlert('success') as requested
      } catch (err: any) {
          showAlert(err.message, 'error');
      }
  };
  
  // --- Breaking Army Logic ---
  const handleDeclareBossWinner = async (entry: QueueEntry) => {
      setDeleteConf({
          isOpen: true,
          title: `Declare ${entry.name} Winner?`,
          message: "This will record them in the Winner Logs and start their cooldown period.",
          action: async () => {
             const batch = db.batch();
             
             // 1. Add to Winner Logs
             const winnerLogRef = db.collection("winner_logs").doc();
             batch.set(winnerLogRef, {
                 playerName: entry.name,
                 playerUid: entry.uid,
                 guildId: entry.guildId,
                 branch: guilds.find(g => g.id === entry.guildId)?.name || 'Unknown',
                 boss: currentBossMap[entry.guildId] || 'Breaking Army',
                 date: new Date().toISOString(),
                 time: 'N/A', // Boss kills usually don't have speedrun time in this context or it's manual
                 status: 'verified',
                 prizeGiven: false
             });

             // 2. Remove from Queue
             const queueRef = db.collection("queue").doc(entry.uid);
             batch.delete(queueRef);

             // 3. Add to Recent Winners (Cooldown) in system config
             const cooldownEntry: CooldownEntry = {
                 uid: entry.uid,
                 branchId: entry.guildId,
                 timestamp: new Date().toISOString(),
                 prizeGiven: false
             };
             const systemRef = db.collection("system").doc("breakingArmy");
             batch.update(systemRef, {
                 recentWinners: firebase.firestore.FieldValue.arrayUnion(cooldownEntry)
             });

             await batch.commit();
             showAlert(`${entry.name} declared winner!`, 'success');
          }
      });
  };

  const handleRemoveFromQueue = async (uid: string) => {
      await db.collection("queue").doc(uid).delete();
  };
  // ----------------------------------------------------

  if (loadingProfile) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-900"></div></div>;
  if (!isAdmin && !isOfficer) return <div className="p-8 text-center text-red-500">Access Denied.</div>;

  // -- Helpers --
  const formatTime = (time: string) => {
      if(!time) return '';
      const [h, m] = time.split(':');
      let hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour}:${m} ${ampm}`;
  };

  const convertTo24Hour = (hour: string, minute: string, ampm: string) => {
      let h = parseInt(hour, 10);
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${minute}`;
  };

  // -- Handlers --

  const handleCreateGuildOpen = () => {
      // Logic to auto-generate name
      const base = "Black Rose";
      const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
      let nextNum = 1;
      
      // Find highest number
      guilds.forEach(g => {
          if (g.name.startsWith(base)) {
              const suffix = g.name.replace(base, '').trim();
              const idx = romans.indexOf(suffix);
              if (idx !== -1 && idx + 1 >= nextNum) {
                  nextNum = idx + 2;
              }
          }
      });
      
      const nextRoman = romans[nextNum - 1] || `${nextNum}`;
      const nextName = `${base} ${nextRoman}`;
      // Generate ID
      const nextId = `g${Date.now().toString().slice(-4)}`;

      setNewGuildData({ name: nextName, id: nextId, memberCap: 80 });
      setIsCreateGuildModalOpen(true);
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'guilds':
        if (!isAdmin) return null;
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Guild Branches</h2>
              <button onClick={handleCreateGuildOpen} className="bg-rose-900 text-white px-4 py-2 rounded-lg hover:bg-rose-950 flex items-center gap-2 shadow-lg shadow-rose-900/20">
                <Plus size={18} /> New Branch
              </button>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                 <table className="w-full text-left">
                     <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                         <tr>
                             <th className="px-6 py-4 font-bold text-zinc-500 text-xs uppercase tracking-wider">Branch Name</th>
                             <th className="px-6 py-4 font-bold text-zinc-500 text-xs uppercase tracking-wider">Capacity</th>
                             <th className="px-6 py-4 text-right font-bold text-zinc-500 text-xs uppercase tracking-wider">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                         {guilds.map(guild => (
                             <tr key={guild.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                 <td className="px-6 py-4">
                                     {editingGuildId === guild.id ? (
                                         <input 
                                            value={guildEditForm.name} 
                                            onChange={e => setGuildEditForm({...guildEditForm, name: e.target.value})}
                                            className="p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 text-sm"
                                         />
                                     ) : (
                                         <span className="font-bold text-zinc-900 dark:text-zinc-100">{guild.name}</span>
                                     )}
                                 </td>
                                 <td className="px-6 py-4">
                                     {editingGuildId === guild.id ? (
                                         <input 
                                            type="number"
                                            value={guildEditForm.memberCap} 
                                            onChange={e => setGuildEditForm({...guildEditForm, memberCap: parseInt(e.target.value)})}
                                            className="p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 text-sm w-24"
                                         />
                                     ) : (
                                         <span className="text-zinc-500">{guild.memberCap} Members</span>
                                     )}
                                 </td>
                                 <td className="px-6 py-4 text-right flex justify-end gap-2">
                                     {editingGuildId === guild.id ? (
                                         <>
                                            <button onClick={() => {
                                                db.collection("guilds").doc(guild.id).update(guildEditForm);
                                                setEditingGuildId(null);
                                            }} className="text-green-600 p-2 hover:bg-green-50 rounded"><Check size={16} /></button>
                                            <button onClick={() => setEditingGuildId(null)} className="text-zinc-400 p-2 hover:bg-zinc-50 rounded"><Trash2 size={16} /></button>
                                         </>
                                     ) : (
                                         <>
                                            <button onClick={() => {
                                                setEditingGuildId(guild.id);
                                                setGuildEditForm({ name: guild.name, memberCap: guild.memberCap });
                                            }} className="text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"><Edit size={16} /></button>
                                            <button onClick={() => setDeleteConf({
                                                isOpen: true,
                                                title: "Delete Guild?",
                                                message: `Delete ${guild.name}? This cannot be undone.`,
                                                action: async () => await db.collection("guilds").doc(guild.id).delete()
                                            })} className="text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={16} /></button>
                                         </>
                                     )}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
            </div>
            
            <CreateGuildModal 
                isOpen={isCreateGuildModalOpen} onClose={() => setIsCreateGuildModalOpen(false)} 
                data={newGuildData} onChange={setNewGuildData} 
                onSubmit={async (e) => {
                    e.preventDefault();
                    await db.collection("guilds").doc(newGuildData.id).set(newGuildData);
                    setIsCreateGuildModalOpen(false);
                    showAlert("Guild Created", 'success');
                }}
            />
          </div>
        );

      case 'events':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
             {/* Left: Form */}
             <div className="lg:col-span-1 space-y-4">
                 <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-4">
                     <h3 className="font-bold mb-6 text-xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Calendar className="text-rose-900 dark:text-rose-500" />
                        {editingEventId ? 'Edit Event' : 'New Event'}
                     </h3>
                     
                     <div className="space-y-4">
                         <div>
                             <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Title</label>
                             <input 
                                className="w-full p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none" 
                                placeholder="Event Title" 
                                value={eventForm.title} 
                                onChange={e => setEventForm({...eventForm, title: e.target.value})}
                             />
                         </div>

                         <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Type</label>
                            <div className="relative">
                                <select 
                                    className="w-full p-3 appearance-none border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                                    value={eventForm.type}
                                    onChange={e => setEventForm({...eventForm, type: e.target.value})}
                                >
                                    {standardEventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    <option value="Custom">Custom</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">▼</div>
                            </div>
                            {eventForm.type === 'Custom' && (
                                <input 
                                    className="w-full mt-2 p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                                    placeholder="Enter custom type..."
                                    value={eventForm.customType}
                                    onChange={e => setEventForm({...eventForm, customType: e.target.value})}
                                />
                            )}
                         </div>

                         <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Date & Time</label>
                            <input 
                                type="datetime-local" 
                                className="w-full p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none" 
                                value={eventForm.date} 
                                onChange={e => setEventForm({...eventForm, date: e.target.value})}
                            />
                         </div>

                         <div>
                             <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Target Audience</label>
                             {isAdmin ? (
                                 <div className="relative">
                                     <select 
                                         className="w-full p-3 appearance-none border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                                         value={eventForm.guildId}
                                         onChange={e => setEventForm({...eventForm, guildId: e.target.value})}
                                     >
                                         <option value="">Global (All Branches)</option>
                                         {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                     </select>
                                     <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">▼</div>
                                 </div>
                             ) : (
                                 <div className="p-3 border rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed">
                                     {guilds.find(g => g.id === selectedBranchId)?.name || 'My Branch'}
                                 </div>
                             )}
                         </div>

                         <div>
                             <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cover Image</label>
                             <ImageUpload 
                                folder="events"
                                initialUrl={eventForm.imageUrl}
                                onUploadComplete={(url) => setEventForm({...eventForm, imageUrl: url})}
                             />
                         </div>

                         <div>
                             <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Description</label>
                             <textarea 
                                className="w-full p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white resize-none h-32 focus:ring-2 focus:ring-rose-500 outline-none" 
                                placeholder="Event details..." 
                                value={eventForm.description}
                                onChange={e => setEventForm({...eventForm, description: e.target.value})}
                             />
                         </div>

                         <div className="flex gap-2 pt-2">
                             <button 
                                onClick={async () => {
                                    if (!eventForm.title || !eventForm.date) return showAlert("Missing fields", 'error');
                                    const finalType = eventForm.type === 'Custom' ? eventForm.customType : eventForm.type;
                                    const payload = { 
                                        title: eventForm.title,
                                        description: eventForm.description,
                                        type: finalType,
                                        date: eventForm.date,
                                        guildId: eventForm.guildId,
                                        imageUrl: eventForm.imageUrl
                                    };

                                    if (editingEventId) {
                                        await db.collection("events").doc(editingEventId).update(payload);
                                        setEditingEventId(null);
                                        showAlert("Event Updated", 'success');
                                    } else {
                                        await db.collection("events").add(payload);
                                        showAlert("Event Created", 'success');
                                    }
                                    setEventForm({ title: '', description: '', type: 'Raid', customType: '', date: '', guildId: selectedBranchId, imageUrl: '' });
                                }}
                                className="flex-1 bg-rose-900 text-white py-3 rounded-lg hover:bg-rose-950 font-bold shadow-lg shadow-rose-900/20 transition-all active:scale-95"
                            >
                                 {editingEventId ? 'Update Event' : 'Create Event'}
                             </button>
                             {editingEventId && (
                                 <button 
                                    onClick={() => {
                                        setEditingEventId(null);
                                        setEventForm({ title: '', description: '', type: 'Raid', customType: '', date: '', guildId: selectedBranchId, imageUrl: '' });
                                    }}
                                    className="px-4 bg-zinc-200 text-zinc-800 rounded-lg hover:bg-zinc-300 font-bold"
                                 >
                                     Cancel
                                 </button>
                             )}
                         </div>
                     </div>
                 </div>
             </div>

             {/* Right: List */}
             <div className="lg:col-span-2 space-y-4">
                 <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Upcoming Events</h2>
                 {events.filter(e => isAdmin ? true : e.guildId === selectedBranchId || !e.guildId).length === 0 && (
                     <p className="text-zinc-500 italic">No events found.</p>
                 )}
                 {events
                    .filter(e => isAdmin ? true : e.guildId === selectedBranchId || !e.guildId)
                    .map(event => (
                     <div key={event.id} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex gap-5 hover:border-rose-900/30 transition-colors group">
                         <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden relative">
                             {event.imageUrl ? (
                                 <img src={event.imageUrl} className="w-full h-full object-cover" />
                             ) : (
                                 <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                                     <span className="text-2xl font-bold">{new Date(event.date).getDate()}</span>
                                     <span className="text-xs uppercase font-bold">{new Date(event.date).toLocaleDateString(undefined, {month:'short'})}</span>
                                 </div>
                             )}
                         </div>
                         <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 truncate">{event.title}</h4>
                                     <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-2">
                                         {event.type} • {guilds.find(g => g.id === event.guildId)?.name || 'Global'}
                                     </p>
                                 </div>
                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button 
                                        onClick={() => {
                                            setEditingEventId(event.id);
                                            setEventForm({
                                                ...event,
                                                customType: standardEventTypes.includes(event.type) ? '' : event.type,
                                                type: standardEventTypes.includes(event.type) ? event.type : 'Custom'
                                            });
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                     >
                                         <Edit size={16} />
                                     </button>
                                     <button 
                                        onClick={() => setDeleteConf({
                                            isOpen: true, 
                                            title: "Delete Event?", 
                                            message: "Are you sure?", 
                                            action: async () => await db.collection("events").doc(event.id).delete()
                                        })}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                     >
                                         <Trash2 size={16} />
                                     </button>
                                 </div>
                             </div>
                             <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{event.description}</p>
                             <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1">
                                 <Clock size={12} /> {new Date(event.date).toLocaleString()}
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
        );
        
      case 'breakingArmy':
        const branchQueue = queue.filter(q => q.guildId === selectedBranchId);
        
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
             {/* Left: Configuration */}
             <div className="lg:col-span-1 space-y-6">
                 <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-4">
                     <h3 className="font-bold mb-6 text-xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                         <Skull className="text-rose-900 dark:text-rose-500" /> Configuration
                     </h3>
                     
                     <div className="space-y-6">
                         <div>
                             <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Target Branch</label>
                             <div className="relative">
                                 {isAdmin ? (
                                     <select 
                                        value={selectedBranchId} 
                                        onChange={e => setSelectedBranchId(e.target.value)}
                                        className="w-full p-3 appearance-none border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                                     >
                                         {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                     </select>
                                 ) : (
                                     <div className="w-full p-3 border rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                         {guilds.find(g => g.id === selectedBranchId)?.name}
                                     </div>
                                 )}
                                 {isAdmin && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">▼</div>}
                             </div>
                         </div>

                         <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                             <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Active Boss</label>
                             
                             {/* Boss Visual Selection */}
                             {currentBossMap[selectedBranchId] && (
                                 <div className="mb-3 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 aspect-video relative">
                                     <img 
                                        src={bossPool.find(b => b.name === currentBossMap[selectedBranchId])?.imageUrl || ''} 
                                        className="w-full h-full object-cover"
                                        alt="Current Boss"
                                     />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                                         <span className="text-white font-bold text-sm truncate">{currentBossMap[selectedBranchId]}</span>
                                     </div>
                                 </div>
                             )}

                             <div className="relative">
                                 <select 
                                    value={currentBossMap[selectedBranchId] || ''}
                                    onChange={async (e) => {
                                        const newMap = { ...currentBossMap, [selectedBranchId]: e.target.value };
                                        await db.collection("system").doc("breakingArmy").set({ currentBoss: newMap }, { merge: true });
                                    }}
                                    className="w-full p-3 appearance-none border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                                 >
                                     <option value="">None Selected</option>
                                     {bossPool.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                                 </select>
                                 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">▼</div>
                             </div>
                         </div>

                         <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                             <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Schedule</label>
                             <div className="flex gap-2 mb-2">
                                 <select 
                                    value={newScheduleDay}
                                    onChange={e => setNewScheduleDay(e.target.value)}
                                    className="flex-1 p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700 dark:text-white text-xs"
                                 >
                                     {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                                 </select>
                                 <div className="flex items-center gap-1">
                                    <input 
                                        className="w-8 p-1 text-center border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white text-xs" 
                                        value={newScheduleTime.hour} onChange={e => setNewScheduleTime({...newScheduleTime, hour: e.target.value})} 
                                    />
                                    <span className="text-zinc-400">:</span>
                                    <select className="p-1 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white text-xs" value={newScheduleTime.minute} onChange={e => setNewScheduleTime({...newScheduleTime, minute: e.target.value})}>
                                        <option value="00">00</option><option value="15">15</option><option value="30">30</option><option value="45">45</option>
                                    </select>
                                    <select className="p-1 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white text-xs" value={newScheduleTime.ampm} onChange={e => setNewScheduleTime({...newScheduleTime, ampm: e.target.value})}>
                                        <option value="AM">AM</option><option value="PM">PM</option>
                                    </select>
                                 </div>
                                 <button 
                                    onClick={async () => {
                                         const time24 = convertTo24Hour(newScheduleTime.hour, newScheduleTime.minute, newScheduleTime.ampm);
                                         const newSlot: ScheduleSlot = { day: newScheduleDay, time: time24 };
                                         const currentSchedules = schedulesMap[selectedBranchId] || [];
                                         const updated = [...currentSchedules, newSlot];
                                         await db.collection("system").doc("breakingArmy").set({
                                             schedules: { ...schedulesMap, [selectedBranchId]: updated }
                                         }, { merge: true });
                                    }}
                                    className="bg-rose-900 text-white px-2 rounded hover:bg-rose-950"
                                 >
                                     <Plus size={16} />
                                 </button>
                             </div>
                             <div className="space-y-1">
                                 {(schedulesMap[selectedBranchId] || []).map((slot, idx) => (
                                     <div key={idx} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800 p-2 rounded border border-zinc-200 dark:border-zinc-700">
                                         <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{slot.day} @ {formatTime(slot.time)}</span>
                                         <button 
                                            onClick={async () => {
                                                 const currentSchedules = schedulesMap[selectedBranchId] || [];
                                                 const updated = currentSchedules.filter((_, i) => i !== idx);
                                                 await db.collection("system").doc("breakingArmy").set({
                                                     schedules: { ...schedulesMap, [selectedBranchId]: updated }
                                                 }, { merge: true });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                         >
                                             <Trash2 size={12} />
                                         </button>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
             
             {/* Right: Boss Pool & Queue */}
             <div className="lg:col-span-2 space-y-6">
                 {/* Queue Management (Visible to Officers & Admin) */}
                 <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                        <User size={20} className="text-blue-500" /> Queue Management
                        <span className="text-xs font-normal text-zinc-500">({branchQueue.length} waiting)</span>
                    </h3>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {branchQueue.length === 0 ? (
                            <p className="text-zinc-400 italic text-sm text-center py-4">Queue is empty.</p>
                        ) : (
                            branchQueue.map((entry, i) => (
                                <div key={entry.uid} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 rounded-full text-xs font-bold">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{entry.name}</div>
                                            <div className="text-xs text-zinc-500">{entry.role}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleDeclareBossWinner(entry)}
                                            className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-bold transition-colors flex items-center gap-1"
                                        >
                                            <Trophy size={12} /> Win
                                        </button>
                                        <button 
                                            onClick={() => handleRemoveFromQueue(entry.uid)}
                                            className="p-1.5 text-red-400 hover:text-red-600 rounded transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                 </div>

                 {/* Boss Pool (Admin Only) */}
                 {isAdmin && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Boss Pool</h2>
                            <button onClick={() => {
                                setBossForm({ name: '', imageUrl: '' });
                                setEditingBossOriginalName(null);
                                setIsAddBossModalOpen(true);
                            }} className="bg-rose-900 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-rose-950 shadow-lg shadow-rose-900/20">
                                <Plus size={16} /> Add Boss
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {bossPool.map((boss, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group relative hover:border-rose-900/30 transition-colors"
                                >
                                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 relative">
                                        {boss.imageUrl ? (
                                            <img src={boss.imageUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                                <Skull size={32} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    setBossForm(boss);
                                                    setEditingBossOriginalName(boss.name);
                                                    setIsAddBossModalOpen(true);
                                                }}
                                                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => setDeleteConf({
                                                    isOpen: true,
                                                    title: "Delete Boss?",
                                                    message: `Remove ${boss.name}?`,
                                                    action: async () => {
                                                        const newPool = bossPool.filter(b => b.name !== boss.name);
                                                        await db.collection("system").doc("breakingArmy").set({ bossPool: newPool }, { merge: true });
                                                    }
                                                })}
                                                className="p-2 bg-red-600/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate" title={boss.name}>{boss.name}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 )}
             </div>
             
             <AddBossModal 
                isOpen={isAddBossModalOpen}
                onClose={() => setIsAddBossModalOpen(false)}
                data={bossForm}
                onChange={setBossForm}
                onSubmit={async () => {
                    let updatedPool = [...bossPool];
                    if (editingBossOriginalName) {
                        const idx = updatedPool.findIndex(b => b.name === editingBossOriginalName);
                        if (idx !== -1) updatedPool[idx] = bossForm;
                    } else {
                        updatedPool.push(bossForm);
                    }
                    await db.collection("system").doc("breakingArmy").set({ bossPool: updatedPool }, { merge: true });
                    setIsAddBossModalOpen(false);
                    showAlert("Boss Pool Updated", 'success');
                }}
             />
          </div>
        );

      case 'announcements':
          return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                  <div className="lg:col-span-1 space-y-4">
                       <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-4">
                           <h3 className="font-bold mb-6 text-xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                               <Megaphone className="text-rose-900 dark:text-rose-500" />
                               {editingAnnouncement ? 'Edit Post' : 'New Post'}
                           </h3>
                           
                           <div className="space-y-4">
                               <div>
                                   <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Title</label>
                                   <input 
                                      className="w-full p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none" 
                                      placeholder="Title" 
                                      value={announcementForm.title} 
                                      onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})}
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Content</label>
                                   <textarea 
                                      className="w-full p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white resize-none h-40 focus:ring-2 focus:ring-rose-500 outline-none" 
                                      placeholder="Message..." 
                                      value={announcementForm.content}
                                      onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})}
                                   />
                               </div>
                               {isAdmin && (
                                   <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                       <input 
                                          type="checkbox" 
                                          checked={announcementForm.isGlobal} 
                                          onChange={e => setAnnouncementForm({...announcementForm, isGlobal: e.target.checked})}
                                          className="w-4 h-4 text-rose-900 rounded focus:ring-rose-900"
                                       />
                                       <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Global Announcement</label>
                                   </div>
                               )}
                               
                               <div className="flex gap-2 pt-2">
                                   <button 
                                      onClick={async () => {
                                          if (!announcementForm.title || !announcementForm.content) return showAlert("Missing fields", 'error');
                                          const payload = {
                                              title: announcementForm.title,
                                              content: announcementForm.content,
                                              isGlobal: announcementForm.isGlobal,
                                              guildId: announcementForm.isGlobal ? 'global' : selectedBranchId,
                                              authorId: currentUser.uid,
                                              authorName: userProfile.displayName,
                                              timestamp: new Date().toISOString()
                                          };
                                          
                                          if (editingAnnouncement) {
                                              await db.collection("announcements").doc(editingAnnouncement.id).update(payload);
                                              setEditingAnnouncement(null);
                                              showAlert("Updated", 'success');
                                          } else {
                                              await db.collection("announcements").add(payload);
                                              showAlert("Posted", 'success');
                                          }
                                          setAnnouncementForm({ title: '', content: '', isGlobal: isAdmin });
                                      }}
                                      className="flex-1 bg-rose-900 text-white py-3 rounded-lg hover:bg-rose-950 font-bold shadow-lg shadow-rose-900/20 active:scale-95 transition-all"
                                   >
                                       {editingAnnouncement ? 'Save Changes' : 'Post Now'}
                                   </button>
                                   {editingAnnouncement && (
                                       <button onClick={() => {
                                           setEditingAnnouncement(null);
                                           setAnnouncementForm({ title: '', content: '', isGlobal: isAdmin });
                                       }} className="px-4 bg-zinc-200 text-zinc-800 rounded-lg hover:bg-zinc-300 font-bold">Cancel</button>
                                   )}
                               </div>
                           </div>
                       </div>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Announcement History</h2>
                      {announcements.map(ann => (
                          <div key={ann.id} className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-rose-900/30 transition-colors group">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                          {ann.title}
                                          {ann.isGlobal && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><Globe size={10} /> GLOBAL</span>}
                                      </h3>
                                      <p className="text-xs text-zinc-500">
                                          {new Date(ann.timestamp).toLocaleString()} • by {ann.authorName}
                                      </p>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => {
                                          setEditingAnnouncement(ann);
                                          setAnnouncementForm({ title: ann.title, content: ann.content, isGlobal: ann.isGlobal });
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                                      <button onClick={() => setDeleteConf({
                                          isOpen: true, title: "Delete?", message: "Delete announcement?",
                                          action: async () => await db.collection("announcements").doc(ann.id).delete()
                                      })} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                  </div>
                              </div>
                              <RichText text={ann.content} className="text-sm text-zinc-600 dark:text-zinc-400" />
                          </div>
                      ))}
                  </div>
              </div>
          );

      case 'herosRealm':
          return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                   {/* Left: Polls grouped by Guild */}
                   <div className="lg:col-span-2 space-y-6">
                       <div className="flex justify-between items-center">
                           <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                               <Clock className="text-purple-600" /> Poll Requests
                           </h3>
                           {isAdmin && (
                               <button 
                                   onClick={handleResetHerosRealm}
                                   className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-colors"
                               >
                                   <Trash2 size={14} /> Weekly Reset
                               </button>
                           )}
                       </div>

                       {guilds.map(guild => {
                           const guildRequests = herosRealmRequests.filter(r => r.guildId === guild.id).sort((a,b) => b.votes.length - a.votes.length);
                           if (guildRequests.length === 0) return null;

                           return (
                               <div key={guild.id} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                   <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                       {guild.name}
                                   </h4>
                                   <div className="space-y-3">
                                       {guildRequests.map(req => (
                                           <div key={req.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                               <div className="flex items-center gap-4">
                                                   <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold px-3 py-1 rounded text-sm">
                                                       {req.votes.length} Votes
                                                   </div>
                                                   <div>
                                                       <p className="font-bold text-zinc-900 dark:text-zinc-100">{req.day} @ {formatTime(req.time)}</p>
                                                       <p className="text-xs text-zinc-400">By {req.createdByName}</p>
                                                   </div>
                                               </div>
                                               <div className="flex gap-2">
                                                   {(isAdmin || (isOfficer && selectedBranchId === guild.id)) && (
                                                       <button 
                                                            onClick={() => handleApproveHerosRealm(req)}
                                                            className="flex items-center gap-1 bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                                                       >
                                                           <Check size={14} /> Approve
                                                       </button>
                                                   )}
                                                   <button onClick={() => db.collection("heros_realm_requests").doc(req.id).delete()} className="text-zinc-400 hover:text-red-500 p-1.5"><Trash2 size={16} /></button>
                                               </div>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                           )
                       })}
                       {herosRealmRequests.length === 0 && <p className="text-zinc-500 italic text-center py-8">No active polls.</p>}
                   </div>
                   
                   {/* Right: Current Schedule Config */}
                   <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-4">
                             <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-100 mb-4">Active Schedules</h3>
                             <p className="text-xs text-zinc-500 mb-4">Currently approved schedules for each branch.</p>
                             
                             <div className="space-y-4">
                                 {guilds.map(g => {
                                     const schedule = herosRealmConfig?.schedules?.[g.id]?.[0];
                                     return (
                                         <div key={g.id} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                             <div className="font-bold text-xs text-zinc-500 uppercase mb-1">{g.name}</div>
                                             {schedule ? (
                                                 <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
                                                     <Clock size={16} /> {schedule.day} @ {formatTime(schedule.time)}
                                                 </div>
                                             ) : (
                                                 <span className="text-xs text-zinc-400 italic">No schedule set</span>
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>
                        </div>
                   </div>
              </div>
          );

      case 'leaderboard':
      case 'winnerLogs':
          const isLogs = activeTab === 'winnerLogs';
          // Use two distinct state variables to avoid mixing data
          const data = isLogs ? winnerLogs : leaderboard;
          
          return (
              <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{isLogs ? 'Winner Logs' : 'Speedrun Leaderboard'}</h2>
                      <button 
                        onClick={() => {
                            setEditingLeaderboardEntry({
                                id: '',
                                rank: 0,
                                playerName: '',
                                playerUid: '',
                                branch: '',
                                boss: '',
                                time: '',
                                date: new Date().toISOString(),
                                status: 'verified',
                                prizeGiven: false
                            });
                            setLeaderboardModalMode(isLogs ? 'winnerLog' : 'leaderboard');
                            setIsLeaderboardModalOpen(true);
                        }}
                        className="bg-rose-900 text-white px-4 py-2 rounded-lg hover:bg-rose-950 flex items-center gap-2 shadow-lg shadow-rose-900/20"
                      >
                          <Plus size={18} /> Add Entry
                      </button>
                  </div>
                  
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                              <tr>
                                  <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Date</th>
                                  <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Player</th>
                                  <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">{isLogs ? 'Event / Boss' : 'Boss'}</th>
                                  {!isLogs && <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Time</th>}
                                  <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Branch</th>
                                  {isLogs && <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Prize Status</th>}
                                  <th className="px-6 py-4 text-right font-bold text-zinc-500 uppercase text-xs">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                              {data.map((entry: any) => (
                                  <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                      <td className="px-6 py-4 text-zinc-500">{new Date(entry.date).toLocaleDateString()}</td>
                                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{entry.playerName}</td>
                                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{entry.boss}</td>
                                      {!isLogs && <td className="px-6 py-4 font-mono text-rose-600 dark:text-rose-400 font-bold">{entry.time}</td>}
                                      <td className="px-6 py-4 text-zinc-500">{entry.branch}</td>
                                      {isLogs && (
                                          <td className="px-6 py-4">
                                              <button 
                                                onClick={async () => {
                                                    await db.collection("winner_logs").doc(entry.id).update({ prizeGiven: !entry.prizeGiven });
                                                }}
                                                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                                    entry.prizeGiven 
                                                    ? 'bg-green-100 border-green-200 text-green-700 hover:bg-green-200' 
                                                    : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200'
                                                }`}
                                              >
                                                  {entry.prizeGiven ? 'Received' : 'Pending'}
                                              </button>
                                          </td>
                                      )}
                                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                                          <button 
                                            onClick={() => {
                                                setEditingLeaderboardEntry(entry);
                                                setLeaderboardModalMode(isLogs ? 'winnerLog' : 'leaderboard');
                                                setIsLeaderboardModalOpen(true);
                                            }}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                          >
                                              <Edit size={16} />
                                          </button>
                                          <button 
                                            onClick={() => setDeleteConf({
                                                isOpen: true,
                                                title: "Delete Entry?",
                                                message: "This cannot be undone.",
                                                action: async () => {
                                                    const collection = isLogs ? "winner_logs" : "leaderboard";
                                                    await db.collection(collection).doc(entry.id).delete();
                                                }
                                            })}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  <EditLeaderboardModal 
                    isOpen={isLeaderboardModalOpen}
                    onClose={() => setIsLeaderboardModalOpen(false)}
                    entry={editingLeaderboardEntry}
                    setEntry={setEditingLeaderboardEntry}
                    onUpdate={async (e) => {
                        e.preventDefault();
                        if (!editingLeaderboardEntry) return;
                        const collection = leaderboardModalMode === 'winnerLog' ? "winner_logs" : "leaderboard";
                        
                        // IMPORTANT: ID Logic Fix
                        if (editingLeaderboardEntry.id) {
                            // If ID exists, UPDATE
                            await db.collection(collection).doc(editingLeaderboardEntry.id).update(editingLeaderboardEntry);
                            showAlert("Entry Updated", 'success');
                        } else {
                            // If ID is empty/new, ADD
                            const { id, ...data } = editingLeaderboardEntry; // remove empty string ID
                            await db.collection(collection).add(data);
                            showAlert("Entry Created", 'success');
                        }
                        setIsLeaderboardModalOpen(false);
                    }}
                    bossPool={bossPool}
                    guilds={guilds}
                    allUsers={allUsers}
                    mode={leaderboardModalMode}
                  />
              </div>
          );

      case 'members':
        const filteredMembers = allUsers.filter(u => {
             const matchBranch = memberListFilter === 'All' || u.guildId === memberListFilter;
             const matchSearch = u.displayName.toLowerCase().includes(userSearch.toLowerCase());
             return matchBranch && matchSearch;
        });

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Member Roster</h2>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <input 
                                type="text"
                                placeholder="Search members..."
                                className="pl-9 pr-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 w-full"
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                        </div>
                        
                        {isAdmin && (
                            <div className="relative w-full md:w-auto">
                                <select
                                    className="w-full md:w-48 pl-3 pr-8 py-2 appearance-none border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-zinc-700 dark:text-zinc-300"
                                    value={memberListFilter}
                                    onChange={e => setMemberListFilter(e.target.value)}
                                >
                                    <option value="All">All Branches</option>
                                    {guilds.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">▼</div>
                            </div>
                        )}
                        {isOfficer && (
                             <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-500">
                                 {guilds.find(g => g.id === selectedBranchId)?.name}
                             </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Name</th>
                                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Role</th>
                                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Branch</th>
                                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">System Role</th>
                                <th className="px-6 py-4 text-right font-bold text-zinc-500 uppercase text-xs">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {filteredMembers.map(member => (
                                <tr key={member.uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                        <div className="flex items-center gap-3">
                                            <img src={member.photoURL || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-full bg-zinc-200" />
                                            <div>
                                                <div>{member.displayName}</div>
                                                <div className="text-[10px] text-zinc-400">{member.inGameId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{member.role}</td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                        {guilds.find(g => g.id === member.guildId)?.name || member.guildId}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            member.systemRole === 'Admin' ? 'bg-red-100 text-red-700' :
                                            member.systemRole === 'Officer' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-zinc-100 text-zinc-600'
                                        }`}>
                                            {member.systemRole}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {member.systemRole === 'Member' && (
                                            <button 
                                                onClick={() => setDeleteConf({
                                                    isOpen: true,
                                                    title: `Kick ${member.displayName}?`,
                                                    message: "This will remove them from the guild branch. They will need to re-apply.",
                                                    action: async () => {
                                                        await db.collection("users").doc(member.uid).update({
                                                            guildId: '',
                                                            systemRole: 'Member'
                                                        });
                                                        showAlert(`${member.displayName} kicked from guild.`, 'info');
                                                    }
                                                })}
                                                className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-red-100 border border-red-200 transition-colors"
                                            >
                                                Kick Member
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredMembers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No members found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );

      case 'users':
          // Only Admin can see this tab content
          if (!isAdmin) return null;
          
          const filteredSystemUsers = allUsers.filter(u => 
              u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
              u.inGameId.includes(userSearch)
          );

          return (
              <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                              <ShieldAlert className="text-rose-900 dark:text-rose-500" /> System Roles
                          </h2>
                          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Manage administrative privileges.</p>
                      </div>
                      <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                          <input 
                              type="text" 
                              placeholder="Search users..." 
                              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-900/20 text-zinc-900 dark:text-zinc-100"
                              value={userSearch}
                              onChange={e => setUserSearch(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredSystemUsers.map(u => (
                          <div key={u.uid} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                      <img src={u.photoURL || 'https://via.placeholder.com/150'} className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 object-cover" alt={u.displayName} />
                                      <div className="min-w-0">
                                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-sm">{u.displayName}</h3>
                                          <p className="text-xs text-zinc-500 font-mono">{u.inGameId}</p>
                                      </div>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                      u.systemRole === 'Admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                      u.systemRole === 'Officer' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                  }`}>
                                      {u.systemRole}
                                  </span>
                              </div>
                              
                              <div className="flex flex-col gap-2">
                                  <div className="grid grid-cols-2 gap-2">
                                      {u.systemRole !== 'Admin' && (
                                          <button 
                                              onClick={() => db.collection("users").doc(u.uid).update({systemRole: 'Admin'})}
                                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/10 dark:hover:bg-red-900/20 dark:text-red-400 text-xs font-bold transition-colors"
                                          >
                                              <Shield size={12} /> Make Admin
                                          </button>
                                      )}
                                      {u.systemRole !== 'Officer' && (
                                          <button 
                                              onClick={() => db.collection("users").doc(u.uid).update({systemRole: 'Officer'})}
                                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-700 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20 dark:text-yellow-400 text-xs font-bold transition-colors"
                                          >
                                              <ShieldCheck size={12} /> Make Officer
                                          </button>
                                      )}
                                  </div>
                                  {u.systemRole !== 'Member' && (
                                      <button 
                                          onClick={() => db.collection("users").doc(u.uid).update({systemRole: 'Member'})}
                                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400 text-xs font-bold transition-colors mt-auto"
                                      >
                                          <User size={12} /> Demote to Member
                                      </button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
                  {filteredSystemUsers.length === 0 && (
                      <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 border-dashed">
                          <p className="text-zinc-500">No users found.</p>
                      </div>
                  )}
              </div>
          )

      case 'leaves':
        const filteredLeaves = leaves.filter(l => leaveBranchFilter === 'All' || l.guildId === leaveBranchFilter);
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Leave Requests</h2>
                      {isAdmin && (
                          <div className="relative w-full md:w-auto">
                             <select 
                                value={leaveBranchFilter}
                                onChange={e => setLeaveBranchFilter(e.target.value)}
                                className="w-full md:w-48 pl-3 pr-8 py-2 appearance-none border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white text-sm focus:ring-2 focus:ring-rose-500"
                             >
                                 <option value="All">All Branches</option>
                                 {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                             </select>
                             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">▼</div>
                          </div>
                      )}
                 </div>

                 <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Player</th>
                                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Branch</th>
                                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Dates</th>
                                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs">Reason</th>
                                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs text-right">Filed At</th>
                                <th className="px-6 py-4 font-bold text-zinc-500 uppercase text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {filteredLeaves.map(leave => (
                                <tr key={leave.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                        {leave.displayName}
                                        <div className="text-[10px] text-zinc-400">{leave.inGameId}</div>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500">{leave.guildName}</td>
                                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500 italic max-w-xs truncate">{leave.reason || 'None provided'}</td>
                                    <td className="px-6 py-4 text-right text-zinc-400 text-xs">
                                        {new Date(leave.timestamp).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setDeleteConf({
                                                isOpen: true,
                                                title: "Delete Request?",
                                                message: "Remove this leave request?",
                                                action: async () => await db.collection("leaves").doc(leave.id).delete()
                                            })}
                                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredLeaves.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No leave requests found.</td></tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
        );

      default:
        return <div className="p-8 text-center text-zinc-500">Select a tab to manage settings.</div>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Admin Dashboard</h1>
      </div>

      <div className="flex flex-col gap-6">
        {/* Horizontal Scrollable Tabs */}
        <div className="w-full overflow-x-auto custom-scrollbar pb-2">
          <div className="flex gap-2">
            {tabOrder.map((tabId, index) => {
                const labels: Record<string, string> = {
                    guilds: 'Guild Branches',
                    events: 'Events',
                    announcements: 'Announcements',
                    breakingArmy: 'Breaking Army',
                    herosRealm: "Hero's Realm",
                    leaderboard: 'Leaderboard',
                    winnerLogs: 'Winner Logs',
                    users: 'System Roles',
                    members: 'Members',
                    leaves: 'Leave Requests'
                };
                
                const icons: Record<string, React.ReactNode> = {
                    guilds: <Database size={16} />,
                    events: <Calendar size={16} />,
                    announcements: <Megaphone size={16} />,
                    breakingArmy: <Skull size={16} />,
                    herosRealm: <Clock size={16} />,
                    leaderboard: <Trophy size={16} />,
                    winnerLogs: <Crown size={16} />,
                    users: <ShieldAlert size={16} />,
                    members: <User size={16} />,
                    leaves: <Plane size={16} />
                };

                if (!isAdmin && !['events', 'breakingArmy', 'herosRealm', 'leaves', 'announcements', 'members'].includes(tabId)) {
                    return null;
                }

                return (
                  <div 
                    key={tabId} 
                    draggable={isAdmin}
                    onDragStart={() => setDraggedTabIndex(index)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                        if (draggedTabIndex === null) return;
                        const newOrder = [...tabOrder];
                        const [removed] = newOrder.splice(draggedTabIndex, 1);
                        newOrder.splice(index, 0, removed);
                        setTabOrder(newOrder);
                        setDraggedTabIndex(null);
                    }}
                    className={`flex-shrink-0 cursor-pointer px-4 py-2.5 rounded-lg border text-sm font-bold flex items-center gap-2 transition-all select-none
                       ${activeTab === tabId 
                         ? 'bg-rose-900 text-white border-rose-900 shadow-md shadow-rose-900/10' 
                         : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                       }
                    `}
                    onClick={() => setActiveTab(tabId)}
                  >
                     {isAdmin && (
                         <span className="text-current opacity-30 cursor-grab active:cursor-grabbing mr-1"><GripVertical size={12} /></span>
                     )}
                     {icons[tabId]}
                     <span className="whitespace-nowrap">{labels[tabId] || tabId}</span>
                  </div>
                );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full min-w-0">
           {renderContent()}
        </div>
      </div>

      <ConfirmationModal 
        isOpen={deleteConf.isOpen}
        onClose={() => setDeleteConf({...deleteConf, isOpen: false})}
        onConfirm={deleteConf.action}
        title={deleteConf.title}
        message={deleteConf.message}
      />
    </div>
  );
};

export default Admin;