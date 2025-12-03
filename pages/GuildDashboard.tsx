
import React, { useState, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Party, RoleType, Guild, GuildEvent, UserProfile, Announcement, HerosRealmConfig } from '../types';
import { Users, Plus, Sword, Crown, Trash2, Calendar, Activity, LogOut, Megaphone, Edit, Clock, ArrowRight, Shield, ChevronLeft, ChevronRight, User, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { useAlert } from '../contexts/AlertContext';
import { CreatePartyModal } from '../components/modals/CreatePartyModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { HerosRealmModal } from '../components/modals/HerosRealmModal';
import { RichText } from '../components/RichText';
import { ViewAnnouncementModal } from '../components/modals/ViewAnnouncementModal';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { logAction } from '../services/auditLogger';

const { useParams, useNavigate, Link } = ReactRouterDOM as any;

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
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
  const [allGuilds, setAllGuilds] = useState<Guild[]>([]); // New State for looking up other branches
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState<Party[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [herosRealmConfig, setHerosRealmConfig] = useState<HerosRealmConfig | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isHerosRealmModalOpen, setIsHerosRealmModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Announcement Carousel State
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);

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

  // Helper to check if a user is online based on lastSeen (within 3 minutes)
  const isUserOnline = (user: UserProfile) => {
      if (user.status === 'online') {
          if (!user.lastSeen) return true; 
          const diff = Date.now() - new Date(user.lastSeen).getTime();
          return diff < 3 * 60 * 1000; // 3 minute inactivity threshold
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

    // Fetch Current Guild Info
    const guildRef = db.collection("guilds").doc(guildId);
    const unsubGuild = guildRef.onSnapshot(docSnap => {
      if (docSnap.exists) setGuild({ id: docSnap.id, ...docSnap.data() } as Guild);
      else setGuild(null);
      setLoading(false);
    });

    // Fetch ALL Guilds (so we can identify users from other branches)
    const unsubAllGuilds = db.collection("guilds").onSnapshot(snap => {
        setAllGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild)));
    });

    const qParties = db.collection("parties").where("guildId", "==", guildId);
    const unsubParties = qParties.onSnapshot(snapshot => setParties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Party)));

    const unsubAllUsers = db.collection("users").onSnapshot(snapshot => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(usersData);
      if (currentUser) {
        const profile = usersData.find(u => u.uid === currentUser.uid);
        setCurrentUserProfile(profile || null);
      } else {
        setCurrentUserProfile(null);
      }
    });

    const qUsersInGuild = db.collection("users").where("guildId", "==", guildId);
    const unsubUsersCount = qUsersInGuild.onSnapshot(snapshot => setMemberCount(snapshot.size));

    const unsubEvents = db.collection("events").onSnapshot(snapshot => setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as GuildEvent)));
    
    // Clear announcements before fetching new ones to prevent ghosting
    setAnnouncements([]);
    
    // Fetch Announcements for this guild
    const unsubAnnouncements = db.collection("announcements")
      .where("guildId", "==", guildId)
      .onSnapshot(snap => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
        // Sort client-side
        data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAnnouncements(data);
      });

    // Fetch Hero's Realm Config
    const unsubHerosRealmCorrect = db.collection("system").doc("herosRealm").onSnapshot(snap => {
        if (snap.exists) {
            setHerosRealmConfig(snap.data() as HerosRealmConfig);
        }
    });

    return () => { 
        unsubGuild(); 
        unsubAllGuilds();
        unsubParties(); 
        unsubUsersCount(); 
        unsubEvents(); 
        unsubAllUsers(); 
        unsubAnnouncements(); 
        unsubHerosRealmCorrect(); 
    };
  }, [guildId, currentUser]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (!parties.length || !allUsers.length) return;

      const batch = db.batch();

      parties.forEach(party => {
        const leader = allUsers.find(u => u.uid === party.leaderId);
        
        // Use lastSeen check for leader (3 min threshold)
        const isLeaderOnline = leader ? isUserOnline(leader) : false;

        if (leader && !isLeaderOnline) {
          batch.delete(db.collection("parties").doc(party.id));
          return;
        }

        // Also remove inactive members
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

    }, 10000); // Check every 10 seconds for responsiveness

    return () => clearInterval(cleanupInterval);
  }, [parties, allUsers]);

  // Carousel Auto-Slide
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
        setCurrentAnnouncementIndex(prev => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements.length]);
  
  // This derived state is for UI logic within the current guild dashboard context
  const canCreatePartyInThisBranch = currentUserProfile?.guildId === guildId;
  
  // Filter events: Must match guildId OR be global (empty), AND must be in the future (or today)
  const now = new Date();
  // Reset time to start of day for comparison to show events happening today
  now.setHours(0,0,0,0); 

  // Sort events by date ascending (soonest first)
  const branchEvents = events
    .filter(e => {
        const isCorrectBranch = e.guildId === guildId || !e.guildId || e.guildId === '';
        const eventDate = new Date(e.date);
        return isCorrectBranch && eventDate >= now;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
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
        await logAction('Create Party', `Created party: ${newPartyData.name} (${newPartyData.activity})`, currentUserProfile, 'Guild');
        setIsCreateModalOpen(false);
        setNewPartyData({ name: '', activity: 'Raid', maxMembers: 5 });
        showAlert("Party created!", 'success');
    } catch (error: any) {
        showAlert(`Failed to create party: ${error.message}`, 'error');
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
    // Removed restriction to allow cross-branch joining
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
    await logAction('Join Party', `Joined party: ${party.name}`, currentUserProfile, 'Guild');
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
                await logAction('Disband Party', `Disbanded party: ${party.name}`, currentUserProfile, 'Guild');
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
            await logAction('Leave Party', `Left party: ${party.name}`, currentUserProfile, 'Guild');
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
                if(currentUserProfile) await logAction('Kick Party Member', `Kicked ${memberToRemove.name} from party: ${party.name}`, currentUserProfile, 'Guild');
                showAlert("Member kicked.", 'info');
            }
        }
    );
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading Guild Data...</div>;
  if (!guild) return <div className="p-8 text-center text-red-500 font-bold">Guild Branch Not Found (ID: {guildId})</div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                <Shield size={32} className="text-rose-900 dark:text-rose-500" />
                {guild.name}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Branch Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (Main Content - Announcements & Parties) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Announcements Section - CAROUSEL (Top of Grid) */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[320px] relative group">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Megaphone className="text-rose-900 dark:text-rose-500" size={20} /> Guild Board
                    </h3>
                </div>
                
                <div className="relative flex-1 overflow-hidden">
                    {announcements.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-zinc-500">
                            No announcements posted yet.
                        </div>
                    ) : (
                        <div 
                            className="flex h-full transition-transform duration-700 ease-in-out"
                            style={{ transform: `translateX(-${currentAnnouncementIndex * 100}%)` }}
                        >
                            {announcements.map((ann) => (
                                <div 
                                    key={ann.id} 
                                    className="min-w-full h-full relative flex flex-col cursor-pointer overflow-hidden"
                                    onClick={() => setViewingAnnouncement(ann)}
                                >
                                    {ann.imageUrl && (
                                        <>
                                            <img src={ann.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" />
                                            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-900/20"></div>
                                        </>
                                    )}
                                    <div className="relative z-10 p-8 flex-1 flex flex-col">
                                        <div className="flex-1">
                                            <h4 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-2 leading-tight drop-shadow-sm">
                                                {ann.title}
                                            </h4>
                                            <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                                <span className="flex items-center gap-1"><User size={14} /> {ann.authorName}</span>
                                                <span>•</span>
                                                <span>{new Date(ann.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-zinc-600 dark:text-zinc-300 line-clamp-3 leading-relaxed max-w-2xl">
                                                {ann.content}
                                            </p>
                                        </div>
                                        <div className="mt-4 flex justify-between items-center">
                                             <div className="flex gap-1">
                                                {announcements.map((_, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                                            idx === currentAnnouncementIndex 
                                                            ? 'w-6 bg-rose-600' 
                                                            : 'w-1.5 bg-zinc-300 dark:bg-zinc-700'
                                                        }`}
                                                    />
                                                ))}
                                             </div>
                                             <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 hover:underline">
                                                Read More <ArrowRight size={12} />
                                             </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {announcements.length > 1 && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setCurrentAnnouncementIndex(prev => (prev - 1 + announcements.length) % announcements.length); }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/80 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity text-zinc-800 dark:text-zinc-200 z-20"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setCurrentAnnouncementIndex(prev => (prev + 1) % announcements.length); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/80 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity text-zinc-800 dark:text-zinc-200 z-20"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Party Finder Section */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Activity className="text-rose-900 dark:text-rose-500" /> Party Finder
                    </h2>
                    
                    {/* Create Party Button (Now moved here) */}
                    <div className="relative group">
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            disabled={!canCreatePartyInThisBranch || !!userActiveParty}
                            className="bg-rose-900 text-white px-4 py-2 rounded-lg hover:bg-rose-950 flex items-center gap-2 text-sm font-bold shadow-md shadow-rose-900/10 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            <Plus size={16} /> Create Party
                        </button>
                        {!canCreatePartyInThisBranch && (
                            <div className="absolute bottom-full mb-2 right-0 w-48 bg-black text-white text-xs p-2 rounded hidden group-hover:block z-20 pointer-events-none">
                                You can only create parties in your own guild branch.
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        disabled={!!userActiveParty} 
                                        className="bg-rose-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                                    >
                                        Join
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Party Grid Layout */}
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
                                    {/* Role Badge */}
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

        {/* RIGHT COLUMN (Sidebar - Events, Stats, Online) */}
        <div className="space-y-6">
            
            {/* NEXT EVENT WIDGET (Redesigned) */}
            <div className="relative group overflow-hidden rounded-2xl h-56 bg-zinc-900 border border-zinc-800 shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl" onClick={() => navigate('/events')}>
                {branchEvents.length > 0 ? (
                    <>
                        {branchEvents[0].imageUrl ? (
                            <img 
                                src={branchEvents[0].imageUrl} 
                                alt="Event" 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-50"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-900 to-purple-900 opacity-80" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                        
                        <div className="relative z-10 p-6 flex flex-col h-full justify-end animate-in slide-in-from-bottom duration-500">
                            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-lg">
                                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={12} /> {new Date(branchEvents[0].date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                </span>
                            </div>
                            
                            <div className="mb-1">
                                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm border border-white/5 inline-block mb-2">
                                    Next Event
                                </span>
                                <h3 className="text-2xl font-black text-white leading-tight mb-1 drop-shadow-md">
                                    {branchEvents[0].title}
                                </h3>
                                <p className="text-sm text-zinc-300 line-clamp-2">{branchEvents[0].description}</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 bg-zinc-100 dark:bg-zinc-800">
                        <Calendar size={48} className="mb-2 opacity-20" />
                        <p className="font-bold">No Upcoming Events</p>
                    </div>
                )}
            </div>

            {/* Compact Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center text-center hover:border-blue-500/30 transition-colors">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg mb-2">
                        <Users size={20} />
                    </div>
                    <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-none">{memberCount}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Members</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center text-center hover:border-rose-500/30 transition-colors">
                    <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg mb-2">
                        <Sword size={20} />
                    </div>
                    <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-none">{parties.length}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Parties</p>
                </div>
            </div>

            {/* Hero's Realm Widget */}
            <div className="bg-gradient-to-br from-purple-900 to-zinc-900 rounded-xl p-1 shadow-lg">
                <div className="bg-white dark:bg-zinc-900 rounded-[10px] p-6 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                            <Clock size={24} />
                        </div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-lg mb-1">Hero's Realm</h3>
                        {activeHeroSchedule ? (
                            <div className="my-4">
                                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-600 to-purple-400 dark:from-white dark:to-purple-400">
                                    {activeHeroSchedule.day}
                                </p>
                                <p className="text-sm font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/20 py-1 px-3 rounded-full inline-block mt-1 border border-purple-200 dark:border-purple-500/20">
                                    @ {formatTime(activeHeroSchedule.time)}
                                </p>
                            </div>
                        ) : (
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm italic my-4">Schedule Pending</p>
                        )}
                        <button 
                            onClick={() => setIsHerosRealmModalOpen(true)}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-purple-900/20"
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
            guilds={allGuilds} // Pass all guilds here for cross-branch lookups
        />
      )}

      <ViewAnnouncementModal 
        isOpen={!!viewingAnnouncement}
        onClose={() => setViewingAnnouncement(null)}
        announcement={viewingAnnouncement}
      />
    </div>
  );
};

export default GuildDashboard;
