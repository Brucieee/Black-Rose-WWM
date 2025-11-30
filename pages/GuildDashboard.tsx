
import React, { useState, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Party, RoleType, Guild, GuildEvent, UserProfile, Announcement } from '../types';
import { Users, Plus, Sword, Crown, Trash2, Calendar, Activity, LogOut, Megaphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { useAlert } from '../contexts/AlertContext';
import { CreatePartyModal } from '../components/modals/CreatePartyModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { CreateAnnouncementModal } from '../components/modals/CreateAnnouncementModal';
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

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

    return () => { unsubGuild(); unsubParties(); unsubUsersCount(); unsubEvents(); unsubAllUsers(); unsubAnnouncements(); };
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
            // FIX: Use FieldValue for arrayRemove
            batch.update(partyRef, { currentMembers: firebase.firestore.FieldValue.arrayRemove(...membersToRemove) });
        }
      });

      batch.commit().catch(err => console.error("Party cleanup failed:", err));

    }, 60000); 

    return () => clearInterval(cleanupInterval);
  }, [parties, allUsers]);
  
  const isUserInAnyParty = allUsers.length > 0 && parties.some(p => p.currentMembers.some(m => m.uid === currentUser?.uid));
  const canCreatePartyInThisBranch = currentUserProfile?.guildId === guildId;
  const canPostAnnouncement = currentUserProfile && (currentUserProfile.systemRole === 'Admin' || (currentUserProfile.systemRole === 'Officer' && currentUserProfile.guildId === guildId));
  
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
    if (isUserInAnyParty) {
        showAlert("You are already in a party.", 'error');
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
      // Force local guild ID if not global, to ensure it doesn't leak
      const targetGuildId = isGlobal ? 'global' : guildId;
      
      const newAnnouncement = {
        title,
        content,
        authorId: currentUserProfile.uid,
        authorName: currentUserProfile.displayName,
        guildId: targetGuildId,
        timestamp: new Date().toISOString(),
        isGlobal
      };
      await db.collection("announcements").add(newAnnouncement);
      showAlert("Announcement posted!", 'success');
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
    if (isUserInAnyParty) {
        showAlert("You are already in another party.", 'error');
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
    // FIX: Use Firebase v8 compat syntax
    const partyRef = db.collection("parties").doc(party.id);
    await partyRef.update({
        currentMembers: firebase.firestore.FieldValue.arrayUnion({
            uid: currentUserProfile.uid,
            name: currentUserProfile.displayName,
            role: currentUserProfile.role,
            photoURL: currentUserProfile.photoURL,
        })
    });
  };

  const leaveParty = async (party: Party) => {
    if (!currentUserProfile) return;
    // FIX: Use Firebase v8 compat syntax
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
                currentMembers: firebase.firestore.FieldValue.arrayRemove(memberToRemove)
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
                // FIX: Use Firebase v8 compat syntax
                await db.collection("parties").doc(party.id).update({
                    currentMembers: firebase.firestore.FieldValue.arrayRemove(memberToRemove)
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
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{guild.name} Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl"><Users size={28} /></div>
          <div><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Total Members</p><p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{memberCount} / {guild.memberCap}</p></div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl"><Sword size={28} /></div>
          <div><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Active Parties</p><p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{parties.length}</p></div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 max-h-[300px] overflow-y-auto custom-scrollbar">
           <div className="flex-1">
              <h3 className="text-sm text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-2 mb-2"><Calendar size={16} /> Branch Events</h3>
              {branchEvents.length === 0 ? (
                <p className="text-xs text-zinc-400">No upcoming events.</p>
              ) : (
                <div className="space-y-2">
                  {branchEvents.map(event => (
                    <Link to="/events" key={event.id} className="block p-2 rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 hover:border-rose-300 dark:hover:border-rose-700 transition-colors">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-1.5 rounded">{new Date(event.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">{event.type}</span>
                        </div>
                        <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-1 truncate">{event.title}</h4>
                        <RichText text={event.description} className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 break-all whitespace-pre-wrap min-w-0" />
                    </Link>
                  ))}
                </div>
              )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Online Members */}
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Online Members
            </h2>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-wrap gap-2">
                {onlineMembers.length === 0 ? (
                    <span className="text-zinc-500 text-sm">No members online.</span>
                ) : (
                    onlineMembers.map(u => (
                        <div key={u.uid} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 pr-3 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors" title={u.role} onClick={() => setSelectedUser(u)}>
                            <img src={u.photoURL || 'https://via.placeholder.com/150'} className="w-8 h-8 object-cover" alt={u.displayName} />
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{u.displayName}</span>
                        </div>
                    ))
                )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Activity className="text-rose-900 dark:text-rose-500" /> Party Finder</h2>
            <div className="relative group">
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    disabled={!canCreatePartyInThisBranch || isUserInAnyParty}
                    className="bg-rose-900 text-white px-4 py-2 rounded-lg hover:bg-rose-950 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={16} /> Create Party
                </button>
                {!canCreatePartyInThisBranch && (
                    <div className="absolute bottom-full mb-2 right-0 w-48 bg-black text-white text-xs p-2 rounded hidden group-hover:block z-10">
                        You can only create parties in your own guild branch.
                    </div>
                )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parties.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 border-dashed">
                <Sword size={48} className="mx-auto text-zinc-300 mb-4" />
                <p className="text-zinc-500 dark:text-zinc-400">No active parties. Be the first to start one!</p>
              </div>
            ) : (
              parties.map(party => {
                const isMember = currentUser && party.currentMembers.some(m => m.uid === currentUser.uid);
                const isLeader = currentUser && party.leaderId === currentUser.uid;
                
                return (
                <div key={party.id} className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-rose-900/30 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{party.name}</h3>
                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs rounded-full font-medium border border-zinc-200 dark:border-zinc-700">{party.activity}</span>
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Crown size={14} className="text-yellow-500" /> Leader: <span className="font-medium text-zinc-700 dark:text-zinc-300">{party.leaderName}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                            <Users size={14} />
                            <span>{party.currentMembers.length} / {party.maxMembers}</span>
                        </div>
                        {isMember ? (
                             <button 
                                onClick={() => leaveParty(party)}
                                className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1"
                             >
                                <LogOut size={14} /> {isLeader ? 'Disband' : 'Leave'}
                             </button>
                        ) : (
                            <button 
                                onClick={() => handleJoinClick(party)}
                                disabled={isUserInAnyParty || currentUserProfile?.guildId !== party.guildId} 
                                className="bg-rose-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-rose-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Join
                            </button>
                        )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {party.currentMembers.map((member) => {
                        const memberProfile = allUsers.find(u => u.uid === member.uid);
                        const isOnline = memberProfile ? isUserOnline(memberProfile) : false;
                        return (
                          <div key={member.uid} className="relative group/member cursor-pointer" onClick={() => { if(memberProfile) setSelectedUser(memberProfile); }}>
                            <img 
                              src={memberProfile?.photoURL || member.photoURL || 'https://via.placeholder.com/150'} 
                              alt={member.name} 
                              className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm object-cover"
                              title={`${member.name} (${member.role})`}
                            />
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-800 ${isOnline ? 'bg-green-500' : 'bg-zinc-500'}`}></span>
                            {/* Role Badge - Adjusted Styling */}
                            <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-white dark:border-zinc-800 shadow-sm min-w-[20px] w-auto whitespace-nowrap
                                ${member.role === RoleType.DPS ? 'bg-red-500' : member.role === RoleType.TANK ? 'bg-yellow-600' : member.role === RoleType.HEALER ? 'bg-green-500' : 'bg-purple-500'}
                            `}>
                                {member.role}
                            </div>
                            {isLeader && member.uid !== currentUser?.uid && (
                                <button 
                                    onClick={(e) => kickMember(e, party, member.uid)}
                                    className="absolute -bottom-2 -left-1 bg-zinc-800 text-white p-0.5 rounded-full opacity-0 group-hover/member:opacity-100 transition-opacity hover:bg-red-600"
                                    title="Kick Member"
                                >
                                    <Trash2 size={10} />
                                </button>
                            )}
                          </div>
                        );
                    })}
                    {Array.from({ length: party.maxMembers - party.currentMembers.length }).map((_, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
                        <span className="text-zinc-300 dark:text-zinc-700 text-xs">+</span>
                      </div>
                    ))}
                  </div>
                  {/* Member Names List */}
                  <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {party.currentMembers.map(m => m.name).join(', ')}
                  </div>
                </div>
              )})
            )}
          </div>
        </div>

        {/* Right Column: Announcements */}
        <div className="space-y-6">
           <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Megaphone className="text-rose-900 dark:text-rose-500" size={20} /> Announcements
                  </h3>
                  {canPostAnnouncement && (
                      <button 
                        onClick={() => setIsAnnouncementModalOpen(true)}
                        className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-2 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 font-medium transition-colors"
                      >
                          + Post
                      </button>
                  )}
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {announcements.length === 0 ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">No announcements.</p>
                  ) : (
                      announcements.map(ann => {
                          // Allow delete if: Admin, or Officer of this guild, or original author
                          const canDelete = currentUserProfile?.systemRole === 'Admin' || 
                                          (currentUserProfile?.systemRole === 'Officer' && currentUserProfile?.guildId === guildId) ||
                                          currentUser?.uid === ann.authorId;
                          
                          return (
                              <div key={ann.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 relative group">
                                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{ann.title}</h4>
                                  <div className="text-xs text-zinc-400 mb-2 flex justify-between">
                                      <span>{new Date(ann.timestamp).toLocaleDateString()}</span>
                                      <button 
                                        className="hover:text-rose-600 hover:underline cursor-pointer"
                                        onClick={() => handleMentionClick(ann.authorName)}
                                      >
                                        {ann.authorName}
                                      </button>
                                  </div>
                                  <RichText 
                                    text={ann.content} 
                                    className="text-sm text-zinc-600 dark:text-zinc-400" 
                                    onMentionClick={handleMentionClick}
                                  />
                                  {canDelete && (
                                      <button 
                                        onClick={() => openDeleteModal("Delete Announcement?", "Are you sure you want to delete this?", () => handleDeleteAnnouncement(ann.id))}
                                        className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <Trash2 size={14} />
                                      </button>
                                  )}
                              </div>
                          );
                      })
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
