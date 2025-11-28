
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Party, RoleType, Guild, GuildEvent, UserProfile } from '../types';
import { Users, Clock, Plus, Sword, Crown, Trash2, Calendar, Activity, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { useAlert } from '../contexts/AlertContext';
import { CreatePartyModal } from '../components/modals/CreatePartyModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';


function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const GuildDashboard: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  useEffect(() => {
    if (!currentUser || !prevParties || !allUsers.length) return;
  
    const userPartyBefore = prevParties.find(p => p.currentMembers.some(m => m.uid === currentUser.uid));
    
    if (userPartyBefore) {
      const userPartyNow = parties.find(p => p.id === userPartyBefore.id);
      if (!userPartyNow) {
        const leader = allUsers.find(u => u.uid === userPartyBefore.leaderId);
        if (leader && leader.status === 'offline') {
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

    return () => { unsubGuild(); unsubParties(); unsubUsersCount(); unsubEvents(); unsubAllUsers(); };
  }, [guildId, currentUser]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (!parties.length || !allUsers.length) return;

      const batch = db.batch();

      parties.forEach(party => {
        const leader = allUsers.find(u => u.uid === party.leaderId);
        
        if (leader && leader.status === 'offline') {
          batch.delete(db.collection("parties").doc(party.id));
          return;
        }

        const membersToRemove = party.currentMembers.filter(member => {
            const memberProfile = allUsers.find(u => u.uid === member.uid);
            return memberProfile && memberProfile.status === 'offline' && member.uid !== party.leaderId;
        });
        
        if (membersToRemove.length > 0) {
            const partyRef = db.collection("parties").doc(party.id);
            batch.update(partyRef, { currentMembers: firebase.firestore.FieldValue.arrayRemove(...membersToRemove) });
        }
      });

      batch.commit().catch(err => console.error("Party cleanup failed:", err));

    }, 60000); 

    return () => clearInterval(cleanupInterval);
  }, [parties, allUsers]);
  
  const isUserInAnyParty = allUsers.length > 0 && parties.some(p => p.currentMembers.some(m => m.uid === currentUser?.uid));
  const canCreatePartyInThisBranch = currentUserProfile?.guildId === guildId;
  const branchEvents = events.filter(e => e.guildId === guildId || !e.guildId || e.guildId === '');
  const onlineMembers = allUsers.filter(u => u.guildId === guildId && u.status === 'online');

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
                await db.collection("parties").doc(party.id).update({
                    currentMembers: firebase.firestore.FieldValue.arrayRemove(memberToRemove)
                });
                showAlert("Member kicked.", 'info');
            }
        }
    );
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
                        <div key={u.uid} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 pr-3 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700" title={u.role}>
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

          <div className="grid gap-4">
            {parties.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 border-dashed">
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
                        const isOnline = memberProfile?.status === 'online';
                        return (
                          <div key={member.uid} className="relative group/member">
                            <img 
                              src={memberProfile?.photoURL || member.photoURL || 'https://via.placeholder.com/150'} 
                              alt={member.name} 
                              className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm object-cover"
                              title={`${member.name} (${member.role})`}
                            />
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-800 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {/* Role Badge */}
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-white dark:border-zinc-800
                                ${member.role === RoleType.DPS ? 'bg-red-500' : member.role === RoleType.TANK ? 'bg-yellow-600' : member.role === RoleType.HEALER ? 'bg-green-500' : 'bg-purple-500'}
                            `}>
                                {member.role[0]}
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
                </div>
              )})
            )}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4"><Calendar className="text-rose-900 dark:text-rose-500" />Branch Events</h2>
              {branchEvents.length === 0 ? (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No upcoming events scheduled for this branch.</p>
              ) : (
                <div className="space-y-4">
                  {branchEvents.map(event => (
                    <Link to="/events" key={event.id} className="flex gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-2 rounded-lg transition-colors group">
                      <div className="flex-col flex items-center bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-400 rounded p-2 min-w-[50px] h-fit group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-colors">
                        <span className="text-xs font-bold">{new Date(event.date).toLocaleDateString(undefined, {month:'short'})}</span>
                        <span className="text-lg font-bold">{new Date(event.date).getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-rose-900 dark:group-hover:text-rose-400 transition-colors">{event.title}</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 break-words whitespace-pre-wrap">{event.description}</p>
                        <span className="inline-block mt-2 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded uppercase tracking-wider">{event.type}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
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

export default GuildDashboard;
