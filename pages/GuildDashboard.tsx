
import React, { useState, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Party, RoleType, Guild, GuildEvent, UserProfile, Announcement, HerosRealmConfig } from '../types';
import { Users, Plus, Sword, Crown, Trash2, Calendar, Activity, LogOut, Megaphone, Edit, Clock, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { useAlert } from '../contexts/AlertContext';
import { CreatePartyModal } from '../components/modals/CreatePartyModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { CreateAnnouncementModal } from '../components/modals/CreateAnnouncementModal';
import { HerosRealmModal } from '../components/modals/HerosRealmModal';
import { RichText } from '../components/RichText';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const { useParams, useNavigate, Link } = ReactRouterDOM as any;

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const GuildDashboard: React.FC = () => {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState<Party[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [herosRealmConfig, setHerosRealmConfig] = useState<HerosRealmConfig | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isHerosRealmModalOpen, setIsHerosRealmModalOpen] = useState(false);
  
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Global Party State
  const [userActiveParty, setUserActiveParty] = useState<Party | null>(null);

  const [newPartyData, setNewPartyData] = useState({
    name: '',
    activity: 'Raid',
    maxMembers: 5
  });

  const [deleteConf, setDeleteConf] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', action: async () => {} });

  const prevParties = usePrevious(parties);

  // Helper to check if a user is online based on lastSeen (within 3 mins)
  const isUserOnline = (user: UserProfile) => {
      if (user.status === 'online') {
          if (!user.lastSeen) return true; // Legacy support
          const diff = Date.now() - new Date(user.lastSeen).getTime();
          return diff < 3 * 60 * 1000; // 3 minutes
      }
      return false;
  };

  useEffect(() => {
    if (!currentUser || !prevParties || !allUsers.length) return;
  
    const userPartyBefore = prevParties.find(p => p.currentMembers.some(m => m.uid === currentUser.uid));
    
    if (userPartyBefore) {
      const userPartyNow = parties.find(p => p.id === userPartyBefore.id);
      if (!userPartyNow) {
        const leader = allUsers.find(u => u.uid === userPartyBefore.leaderId);
        // Check if leader went offline
        const isLeaderOnline = leader ? isUserOnline(leader) : false;
        
        if (leader && !isLeaderOnline) {
          showAlert(
            "Your party was disbanded because the leader went offline.", 
            'info', 
            "Party Disbanded"
          );
        }
      }
    }
  }, [parties, prevParties, currentUser, allUsers, showAlert]);

  // Global Party Listener
  useEffect(() => {
    if (!currentUser) {
        setUserActiveParty(null);
        return;
    }

    // Listen to ANY party where the user is a member, regardless of guild
    const q = db.collection("parties").where("memberUids", "array-contains", currentUser.uid);
    const unsub = q.onSnapshot(snap => {
       if (!snap.empty) {
           // User is in at least one party
           setUserActiveParty({ id: snap.docs[0].id, ...snap.docs[0].data() } as Party);
       } else {
           setUserActiveParty(null);
       }
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!guildId) return;

    // FIX: Use Firebase v8 compat syntax
    const guildRef = db.collection("guilds").doc(guildId);
    const unsubGuild = guildRef.onSnapshot(docSnap => {
      if (docSnap.exists) setGuild({ id: docSnap.id, ...docSnap.data() } as Guild);
      else setGuild(null);
      setLoading(false);
    });

    const qParties = db.collection("parties").where("guildId", "==", guildId);
    const unsubParties = qParties.onSnapshot(snapshot => setParties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Party)));

    const unsubAllUsers = db.collection("users").onSnapshot(snapshot => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(usersData);
      if (currentUser) {
        const profile = usersData.find(u => u.uid === currentUser.uid);
        setCurrentUserProfile(profile || null);
      }
    });

    const qUsersInGuild = db.collection("users").where("guildId", "==", guildId);
    const unsubUsersCount = qUsersInGuild.onSnapshot(snapshot => setMemberCount(snapshot.size));

    const unsubEvents = db.collection("events").onSnapshot(snapshot => setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as GuildEvent)));
    
    // Fetch Announcements for this guild
    const unsubAnnouncements = db.collection("announcements")
      .where("guildId", "==", guildId)
      .orderBy("timestamp", "desc")
      .onSnapshot(snap => {
        setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
      });

    // Fetch Hero's Realm Config
    const unsubHerosRealmCorrect = db.collection("system").doc("herosRealm").onSnapshot(snap => {
        if (snap.exists) {
            setHerosRealmConfig(snap.data() as HerosRealmConfig);
        }
    });

    return () => { unsubGuild(); unsubParties(); unsubUsersCount(); unsubEvents(); unsubAllUsers(); unsubAnnouncements(); unsubHerosRealmCorrect(); };
  }, [guildId, currentUser]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (!parties.length || !allUsers.length) return;

      // FIX: Use Firebase v8 compat syntax for batch writes
      const batch = db.batch();

      parties.forEach(party => {
        const leader = allUsers.find(u => u.uid === party.leaderId);
        
        // Use lastSeen check for leader
        const isLeaderOnline = leader ? isUserOnline(leader) : false;

        if (leader && !isLeaderOnline) {
          batch.delete(db.collection("parties").doc(party.id));
          return;
        }

        const membersToRemove = party.currentMembers.filter(member => {
            const memberProfile = allUsers.find(u => u.uid === member.uid);
            return memberProfile && !isUserOnline(memberProfile) && member.uid !== party.leaderId;
        });
        
        if (membersToRemove.length > 0) {
            const partyRef = db.collection("parties").doc(party.id);
            // Remove from both arrays
            batch.update(partyRef, { 
                currentMembers: firebase.firestore.FieldValue.arrayRemove(...membersToRemove),
                memberUids: firebase.firestore.FieldValue.arrayRemove(...membersToRemove.map(m => m.uid))
            });
        }
      });

      batch.commit().catch(err => console.error("Party cleanup failed:", err));

    }, 60000); 

    return () => clearInterval(cleanupInterval);
  }, [parties, allUsers]);
  
  // This derived state is for UI logic within the current guild dashboard context
  const canCreatePartyInThisBranch = currentUserProfile?.guildId === guildId;
  
  // Filter events: Must match guildId OR be global (empty), AND must be in the future (or today)
  const now = new Date();
  // Reset time to start of day for comparison to show events happening today
  now.setHours(0,0,0,0); 

  const branchEvents = events.filter(e => {
      const isCorrectBranch = e.guildId === guildId || !e.guildId || e.guildId === '';
      const eventDate = new Date(e.date);
      return isCorrectBranch && eventDate >= now;
  });
  
  const onlineMembers = allUsers.filter(u => u.guildId === guildId && isUserOnline(u));
  const activeHeroSchedule = herosRealmConfig?.schedules?.[guildId || '']?.[0];
  
  const formatTime = (time: string) => {
      const [h, m] = time.split(':');
      let hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour}:${m} ${ampm}`;
  };

  const openDeleteModal = (title: string, message: string, action: () => Promise<void>) => {
    setDeleteConf({ isOpen: true, title, message, action });
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile) {
        showAlert("Please create your profile first.", 'error');
        navigate('/register');
        return;
    }
    if (userActiveParty) {
        showAlert("You are already in a party (possibly in another branch).", 'error');
        return;
    }
    if (!canCreatePartyInThisBranch) {
        showAlert("You can only create parties in your own branch.", 'error');
        return;
    }

    try {
        // FIX: Use Firebase v8 compat syntax
        await db.collection("parties").add({
            ...newPartyData,
            guildId: guildId,
            leaderId: currentUserProfile.uid,
            leaderName: currentUserProfile.displayName,
            memberUids: [currentUserProfile.uid], // Init with leader uid
            currentMembers: [{
                uid: currentUserProfile.uid,
                name: currentUserProfile.displayName,
                role: currentUserProfile.role,
                photoURL: currentUserProfile.photoURL,
            }]
        });
        setIsCreateModalOpen(false);
        setNewPartyData({ name: '', activity: 'Raid', maxMembers: 5 });
        showAlert("Party created!", 'success');
    } catch (error: any) {
        showAlert(`Failed to create party: ${error.message}`, 'error');
    }
  };

  const handlePostAnnouncement = async (title: string, content: string, isGlobal: boolean) => {
    if (!currentUserProfile) return;
    try {
      if (editingAnnouncement) {
          await db.collection("announcements").doc(editingAnnouncement.id).update({
              title,
              content
          });
          showAlert("Announcement updated!", 'success');
      } else {
          // Fallback if triggered unexpectedly, though button is removed
          return;
      }
      setEditingAnnouncement(null);
    } catch (err: any) {
      showAlert(`Error posting announcement: ${err.message}`, 'error');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await db.collection("announcements").doc(id).delete();
      showAlert("Announcement deleted.", 'info');
    } catch(err: any) {
      showAlert(`Error deleting: ${err.message}`, 'error');
    }
  };

  const handleJoinClick = (party: Party) => {
    if (!currentUserProfile) {
        showAlert("Please create your profile first.", 'error');
        navigate('/register');
        return;
    }
    if (userActiveParty) {
        showAlert("You are already in a party.", 'error');
        return;
    }
    if (currentUserProfile.guildId !== party.guildId) {
        showAlert("You can only join parties from your own branch.", 'error');
        return;
    }
    if (party.currentMembers.length >= party.maxMembers) {
        showAlert("This party is full.", 'error', "Party Full");
        return;
    }
    joinParty(party);
  };
  
  const joinParty = async (party: Party) => {
    if (!currentUserProfile) return;
    const partyRef = db.collection("parties").doc(party.id);
    await partyRef.update({
        currentMembers: firebase.firestore.FieldValue.arrayUnion({
            uid: currentUserProfile.uid,
            name: currentUserProfile.displayName,
            role: currentUserProfile.role,
            photoURL: currentUserProfile.photoURL,
        }),
        memberUids: firebase.firestore.FieldValue.arrayUnion(currentUserProfile.uid)
    });
  };

  const leaveParty = async (party: Party) => {
    if (!currentUserProfile) return;
    const partyRef = db.collection("parties").doc(party.id);

    if (currentUserProfile.uid === party.leaderId) {
        // Leader leaves, disband party
        openDeleteModal(
            "Disband Party?",
            "As the leader, leaving will disband the party for everyone. Are you sure?",
            async () => {
                await partyRef.delete();
                showAlert("Party disbanded.", 'info');
            }
        );
    } else {
        // Member leaves
        const memberToRemove = party.currentMembers.find(m => m.uid === currentUserProfile.uid);
        if (memberToRemove) {
            await partyRef.update({
                currentMembers: firebase.firestore.FieldValue.arrayRemove(memberToRemove),
                memberUids: firebase.firestore.FieldValue.arrayRemove(currentUserProfile.uid)
            });
        }
    }
  };

  const kickMember = async (e: React.MouseEvent, party: Party, memberUid: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentUser?.uid !== party.leaderId) return;

    openDeleteModal(
        "Kick Member?",
        "Are you sure you want to remove this member from the party?",
        async () => {
            const memberToRemove = party.currentMembers.find(m => m.uid === memberUid);
            if (memberToRemove) {
                await db.collection("parties").doc(party.id).update({
                    currentMembers: firebase.firestore.FieldValue.arrayRemove(memberToRemove),
                    memberUids: firebase.firestore.FieldValue.arrayRemove(memberUid)
                });
                showAlert("Member kicked.", 'info');
            }
        }
    );
  };

  const handleMentionClick = (name: string) => {
      // Find user by display name
      const targetUser = allUsers.find(u => u.displayName.toLowerCase() === name.toLowerCase());
      if (targetUser) {
          setSelectedUser(targetUser);
      } else {
          showAlert(`User '${name}' not found.`, 'info');
      }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading Guild Data...</div>;
  if (!guild) return <div className="p-8 text-center text-red-500 font-bold">Guild Branch Not Found (ID: {guildId})</div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 animate-in fade-in duration-500">
      <div className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                <Shield size={32} className="text-rose-900 dark:text-rose-500" />
                {guild.name}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Branch Dashboard</p>
        </div>
        
        <div className="relative group">
            <button 
                onClick={() => setIsCreateModalOpen(true)}
                disabled={!canCreatePartyInThisBranch || !!userActiveParty}
                className="bg-rose-900 text-white px-5 py-2.5 rounded-xl hover:bg-rose-950 flex items-center gap-2 text-sm font-bold shadow-lg shadow-rose-900/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
                <Plus size={18} /> Create Party
            </button>
            {!canCreatePartyInThisBranch && (
                <div className="absolute top-full mt-2 right-0 w-48 bg-black text-white text-xs p-2 rounded hidden group-hover:block z-20">
                    You can only create parties in your own guild branch.
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* LEFT COLUMN (Main Content) */}
        <div className="xl:col-span-3 space-y-8">
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Members Card */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 hover:border-blue-500/30 transition-all hover:shadow-md">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Total Members</p>
                        <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{memberCount} <span className="text-sm font-medium text-zinc-400">/ {guild.memberCap}</span></p>
                    </div>
                </div>

                {/* Parties Card */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 hover:border-rose-500/30 transition-all hover:shadow-md">
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl">
                        <Sword size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Active Parties</p>
                        <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{parties.length}</p>
                    </div>
                </div>

                {/* Upcoming Event Preview */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:border-purple-500/30 transition-all hover:shadow-md h-full min-h-[100px]">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-2">
                            <Calendar size={14} /> Next Event
                        </p>
                        <Link to="/events" className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">View All</Link>
                    </div>
                    {branchEvents.length > 0 ? (
                        <div>
                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{branchEvents[0].title}</p>
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                {new Date(branchEvents[0].date).toLocaleDateString()}
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-400 italic mt-1">No upcoming events.</p>
                    )}
                </div>
            </div>

            {/* Announcements Section (Moved here per request) */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-500 to-purple-600"></div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Megaphone className="text-rose-900 dark:text-rose-500" size={20} /> Guild Board
                    </h3>
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {announcements.length === 0 ? (
                        <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 border-dashed">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">No announcements posted yet.</p>
                        </div>
                    ) : (
                        announcements.map(ann => {
                            const isAuthor = currentUser?.uid === ann.authorId;
                            const isOfficer = currentUserProfile?.systemRole === 'Officer' && currentUserProfile?.guildId === guildId;
                            const isAdmin = currentUserProfile?.systemRole === 'Admin';
                            const canManage = isAdmin || isOfficer || isAuthor;
                            
                            return (
                                <div key={ann.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800/50 relative group/item hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{ann.title}</h4>
                                        <span className="text-[10px] text-zinc-400 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-100 dark:border-zinc-800">
                                            {new Date(ann.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <RichText 
                                        text={ann.content} 
                                        className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-2" 
                                        onMentionClick={handleMentionClick}
                                    />
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
                                        <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                                            By <span className="text-rose-600 dark:text-rose-400 cursor-pointer hover:underline" onClick={() => handleMentionClick(ann.authorName)}>{ann.authorName}</span>
                                        </span>
                                        {canManage && (
                                            <button 
                                                onClick={() => openDeleteModal("Delete Announcement?", "Are you sure?", () => handleDeleteAnnouncement(ann.id))}
                                                className="text-zinc-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover/item:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Party Finder Section */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Activity className="text-rose-900 dark:text-rose-500" /> Party Finder
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {parties.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 border-dashed">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
                            <Sword size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No Active Parties</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 mb-4">Be the first to start a group!</p>
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            disabled={!canCreatePartyInThisBranch || !!userActiveParty}
                            className="text-rose-900 dark:text-rose-500 font-bold text-sm hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                        >
                            Create a Party
                        </button>
                    </div>
                    ) : (
                    parties.map(party => {
                        const isMember = currentUser && party.currentMembers.some(m => m.uid === currentUser.uid);
                        const isLeader = currentUser && party.leaderId === currentUser.uid;
                        
                        return (
                        <div key={party.id} className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-rose-900/30 dark:hover:border-rose-900/30 transition-all group">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                            <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 truncate max-w-full">{party.name}</h3>
                                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] uppercase rounded font-bold border border-zinc-200 dark:border-zinc-700 whitespace-nowrap">{party.activity}</span>
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                <Crown size={14} className="text-yellow-500 flex-shrink-0" /> <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">{party.leaderName}</span>
                            </p>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                                <div className="flex items-center gap-1 text-sm font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded whitespace-nowrap">
                                    <Users size={14} />
                                    <span>{party.currentMembers.length} / {party.maxMembers}</span>
                                </div>
                                {isMember ? (
                                    <button 
                                        onClick={() => leaveParty(party)}
                                        className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap"
                                    >
                                        <LogOut size={14} /> {isLeader ? 'Disband' : 'Leave'}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleJoinClick(party)}
                                        disabled={!!userActiveParty || currentUserProfile?.guildId !== party.guildId} 
                                        className="bg-rose-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                                    >
                                        Join
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Party Grid Layout - Using CSS Grid for 5+ columns if large, else horizontal flex */}
                        <div className={party.maxMembers > 5 ? 'grid grid-cols-5 gap-2' : 'flex flex-row gap-2'}>
                            {party.currentMembers.map((member) => {
                                const memberProfile = allUsers.find(u => u.uid === member.uid);
                                const isOnline = memberProfile ? isUserOnline(memberProfile) : false;
                                return (
                                <div key={member.uid} className="relative w-10 h-10 group/member cursor-pointer" onClick={() => { if(memberProfile) setSelectedUser(memberProfile); }}>
                                    <img 
                                    src={memberProfile?.photoURL || member.photoURL || 'https://via.placeholder.com/150'} 
                                    alt={member.name} 
                                    className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm object-cover"
                                    title={`${member.name} (${member.role})`}
                                    />
                                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-800 ${isOnline ? 'bg-green-500' : 'bg-zinc-500'}`}></span>
                                    {/* Role Badge - Adjusted Styling */}
                                    <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-white dark:border-zinc-800 shadow-sm min-w-[20px] w-auto whitespace-nowrap z-10
                                        ${member.role === RoleType.DPS ? 'bg-red-500' : member.role === RoleType.TANK ? 'bg-yellow-600' : member.role === RoleType.HEALER ? 'bg-green-500' : 'bg-purple-500'}
                                    `}>
                                        {member.role}
                                    </div>
                                    {isLeader && member.uid !== currentUser?.uid && (
                                        <button 
                                            onClick={(e) => kickMember(e, party, member.uid)}
                                            className="absolute -bottom-2 -left-1 bg-zinc-800 text-white p-0.5 rounded-full opacity-0 group-hover/member:opacity-100 transition-opacity hover:bg-red-600 z-10 shadow-sm"
                                            title="Kick Member"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    )}
                                </div>
                                );
                            })}
                            {Array.from({ length: party.maxMembers - party.currentMembers.length }).map((_, i) => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
                                <span className="text-zinc-300 dark:text-zinc-700 text-xs">+</span>
                            </div>
                            ))}
                        </div>
                        </div>
                    )})
                    )}
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN (Sidebar) */}
        <div className="space-y-6">
            
            {/* Hero's Realm Widget (Sidebar) */}
            <div className="bg-gradient-to-br from-purple-900 to-zinc-900 rounded-xl p-1 shadow-lg">
                <div className="bg-zinc-900 rounded-[10px] p-6 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-400 border border-purple-500/20">
                            <Clock size={24} />
                        </div>
                        <h3 className="font-bold text-white text-lg mb-1">Hero's Realm</h3>
                        {activeHeroSchedule ? (
                            <div className="my-4">
                                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-400">
                                    {activeHeroSchedule.day}
                                </p>
                                <p className="text-sm font-bold text-purple-300 bg-purple-900/20 py-1 px-3 rounded-full inline-block mt-1 border border-purple-500/20">
                                    @ {formatTime(activeHeroSchedule.time)}
                                </p>
                            </div>
                        ) : (
                            <p className="text-zinc-400 text-sm italic my-4">Schedule Pending</p>
                        )}
                        <button 
                            onClick={() => setIsHerosRealmModalOpen(true)}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-purple-900/30"
                        >
                            View Polls & Vote
                        </button>
                    </div>
                </div>
            </div>

            {/* Online Members Sidebar */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm max-h-[600px] flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Online Members</h3>
                    <span className="ml-auto text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">
                        {onlineMembers.length}
                    </span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {onlineMembers.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-4">No one is online.</p>
                    ) : (
                        onlineMembers.map(u => (
                            <div 
                                key={u.uid} 
                                onClick={() => setSelectedUser(u)}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors group"
                            >
                                <div className="relative">
                                    <img src={u.photoURL || 'https://via.placeholder.com/150'} className="w-9 h-9 rounded-full object-cover bg-zinc-200 dark:bg-zinc-700" alt={u.displayName} />
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-rose-900 dark:group-hover:text-rose-400 transition-colors">
                                        {u.displayName}
                                    </p>
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide">
                                        {u.role}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
      </div>
      
      <CreatePartyModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSubmit={handleCreateParty}
        data={newPartyData}
        onChange={setNewPartyData}
      />

      <CreateAnnouncementModal 
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        onSubmit={handlePostAnnouncement}
        userProfile={currentUserProfile}
        initialData={editingAnnouncement}
      />
      
      <HerosRealmModal 
        isOpen={isHerosRealmModalOpen}
        onClose={() => setIsHerosRealmModalOpen(false)}
        guildId={guildId || ''}
        currentUser={currentUserProfile}
      />

      <ConfirmationModal
        isOpen={deleteConf.isOpen}
        onClose={() => setDeleteConf({...deleteConf, isOpen: false})}
        onConfirm={deleteConf.action}
        title={deleteConf.title}
        message={deleteConf.message}
      />
      
      {guild && (
        <UserProfileModal 
            user={selectedUser} 
            onClose={() => setSelectedUser(null)} 
            guilds={[guild]}
        />
      )}
    </div>
  );
};

export default GuildDashboard;
