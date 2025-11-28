

import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Party, RoleType, Guild, GuildEvent, UserProfile } from '../types';
import { Users, Clock, Plus, Sword, Crown, Trash2, Calendar, Activity, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { useAlert } from '../contexts/AlertContext';
import { CreatePartyModal } from '../components/modals/CreatePartyModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';

const GuildDashboard: React.FC = () => {
  const params = ReactRouterDOM.useParams();
  const guildId = params.guildId;
  const navigateHook = ReactRouterDOM.useNavigate ? ReactRouterDOM.useNavigate() : (ReactRouterDOM as any).useHistory?.();
  const navigate = (path: string) => {
    if (typeof navigateHook === 'function') navigateHook(path);
    else if (navigateHook && navigateHook.push) navigateHook.push(path);
  };

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
    activity: '',
    maxMembers: 5
  });

  const [deleteConf, setDeleteConf] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', action: async () => {} });

  // Fetch all necessary data
  useEffect(() => {
    if (!guildId) return;

    const guildRef = doc(db, "guilds", guildId);
    const unsubGuild = onSnapshot(guildRef, (docSnap) => {
        if (docSnap.exists()) setGuild({ id: docSnap.id, ...docSnap.data() } as Guild);
        else setGuild(null);
        setLoading(false);
    });

    const qParties = query(collection(db, "parties"), where("guildId", "==", guildId));
    const unsubParties = onSnapshot(qParties, (snapshot) => setParties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Party)));

    const unsubAllUsers = onSnapshot(collection(db, "users"), snapshot => {
        const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
        setAllUsers(usersData);
        if(currentUser) {
            const profile = usersData.find(u => u.uid === currentUser.uid);
            setCurrentUserProfile(profile || null);
        }
    });
    
    const qUsersInGuild = query(collection(db, "users"), where("guildId", "==", guildId));
    const unsubUsersCount = onSnapshot(qUsersInGuild, (snapshot) => setMemberCount(snapshot.size));

    const unsubEvents = onSnapshot(collection(db, "events"), (snapshot) => setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuildEvent))));

    return () => { unsubGuild(); unsubParties(); unsubUsersCount(); unsubEvents(); unsubAllUsers(); };
  }, [guildId, currentUser]);

  // --- Automatic Cleanup for Offline Leaders ---
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const offlineLeaderParties = parties.filter(party => {
        const leader = allUsers.find(u => u.uid === party.leaderId);
        return leader && leader.status === 'offline';
      });

      if (offlineLeaderParties.length > 0) {
        console.log(`Cleaning up ${offlineLeaderParties.length} parties with offline leaders...`);
        offlineLeaderParties.forEach(party => {
          deleteDoc(doc(db, "parties", party.id));
        });
      }
    }, 60000); // Run every 60 seconds

    return () => clearInterval(cleanupInterval);
  }, [parties, allUsers]);
  
  const isUserInAnyParty = parties.some(p => p.currentMembers.some(m => m.uid === currentUser?.uid));
  const canCreateParty = currentUserProfile?.guildId === guildId;

  const branchEvents = events.filter(e => e.guildId === guildId || !e.guildId || e.guildId === '');

  const openDeleteModal = (title: string, message: string, action: () => Promise<void>) => {
    setDeleteConf({ isOpen: true, title, message, action });
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile) return navigate('/profile');
    if (isUserInAnyParty) return showAlert("You are already in a party.", 'error');
    if (!canCreateParty) return showAlert("You can only create parties in your own branch.", 'error');

    try {
      await addDoc(collection(db, "parties"), {
        guildId: guildId || '',
        name: newPartyData.name,
        activity: newPartyData.activity,
        leaderId: currentUserProfile.uid,
        leaderName: currentUserProfile.displayName,
        maxMembers: newPartyData.maxMembers,
        currentMembers: [{ 
            uid: currentUserProfile.uid, 
            name: currentUserProfile.displayName, 
            role: currentUserProfile.role,
            photoURL: currentUserProfile.photoURL // Use profile photoURL
        }]
      });
      setIsCreateModalOpen(false);
      setNewPartyData({ name: '', activity: '', maxMembers: 5 });
    } catch (error: any) {
      showAlert(`Failed to create party: ${error.message}`, 'error');
    }
  };
  
  const handleJoinClick = (party: Party) => {
    if (!currentUserProfile) return navigate('/register');
    if (isUserInAnyParty) return showAlert("You are already in another party.", 'error', "Cannot Join");
    if (party.currentMembers.length >= party.maxMembers) return showAlert("This party is already full.", 'error', "Party Full");

    joinParty(party);
  };


  const joinParty = async (party: Party) => {
    if (!currentUserProfile) return navigate('/profile');

    try {
      await updateDoc(doc(db, "parties", party.id), {
        currentMembers: arrayUnion({
          uid: currentUserProfile.uid,
          name: currentUserProfile.displayName,
          role: currentUserProfile.role,
          photoURL: currentUserProfile.photoURL
        })
      });
    } catch (error) {
      showAlert(`Failed to join party: ${error.message}`, 'error');
    }
  };

  const leaveParty = async (party: Party) => {
    if (!currentUserProfile) return;

    if (party.leaderId === currentUserProfile.uid) {
        // Leader leaves, disband party
        openDeleteModal("Disband Party?", "As the leader, leaving will disband this party for everyone.", async () => {
            await deleteDoc(doc(db, "parties", party.id));
            showAlert("Party disbanded", "info");
        });
    } else {
        // Member leaves
        const memberToRemove = party.currentMembers.find(m => m.uid === currentUserProfile.uid);
        if (memberToRemove) {
            try {
                await updateDoc(doc(db, "parties", party.id), {
                    currentMembers: arrayRemove(memberToRemove)
                });
                showAlert("You have left the party", "info");
            } catch (error: any) {
                showAlert(`Failed to leave party: ${error.message}`, "error");
            }
        }
    }
  };

  const kickMember = async (e: React.MouseEvent, party: Party, memberUid: string) => {
    e.stopPropagation();
    e.preventDefault();
    const memberToKick = party.currentMembers.find(m => m.uid === memberUid);
    if (!memberToKick) return;

    openDeleteModal("Kick Member?", `Are you sure you want to remove ${memberToKick.name} from the party?`, async () => {
        try {
            await updateDoc(doc(db, "parties", party.id), {
                currentMembers: arrayRemove(memberToKick)
            });
        } catch (error: any) {
            showAlert(`Failed to kick member: ${error.message}`, 'error');
        }
    });
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading Guild Data...</div>;
  if (!guild) return <div className="p-8 text-center text-red-500 font-bold">Guild Branch Not Found (ID: {guildId})</div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
           <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{guild.name} Dashboard</h1>
           {!currentUser && (
             <button type="button" onClick={() => navigate('/register')} className="text-sm bg-rose-900 text-white px-4 py-2 rounded">
               Login to Join Parties
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4"><div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><Users size={24} /></div><div><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Total Members</p><p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{memberCount}</p></div></div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4"><div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg"><Activity size={24} /></div><div><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Active Parties</p><p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{parties.length}</p></div></div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4"><div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg"><Calendar size={24} /></div><div><p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Upcoming Events</p><p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{branchEvents.length}</p></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Sword className="text-rose-900 dark:text-rose-500" />Party Finder</h2>
            <button 
              type="button"
              onClick={() => currentUser ? setIsCreateModalOpen(true) : navigate('/register')}
              disabled={isUserInAnyParty || !canCreateParty}
              title={!canCreateParty ? "You can only create parties in your own branch" : isUserInAnyParty ? "You are already in a party" : "Create a new party"}
              className="flex items-center gap-2 bg-rose-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-950 transition-colors shadow-sm shadow-rose-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Create Party
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {parties.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800"><p className="text-zinc-500 dark:text-zinc-400">No active parties in this branch.</p><button type="button" onClick={() => setIsCreateModalOpen(true)} className="text-rose-900 dark:text-rose-500 font-medium mt-2 hover:underline">Start a new party</button></div>
            ) : (
              parties.map(party => {
                const isUserInThisParty = party.currentMembers.some(m => m.uid === currentUser?.uid);
                
                return (
                <div key={party.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:border-rose-200 dark:hover:border-rose-900/50 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div><h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{party.name}</h3><p className="text-sm text-zinc-500 dark:text-zinc-400">{party.activity}</p></div>
                    <div className="flex items-center gap-2"><span className={`px-3 py-1 rounded-full text-xs font-medium ${party.currentMembers.length >= party.maxMembers ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>{party.currentMembers.length}/{party.maxMembers} Members</span>{currentUser?.uid === party.leaderId && (<button type="button" onClick={(e) => leaveParty(party)} className="text-zinc-400 hover:text-red-600 p-1" title="Disband Party"><Trash2 size={16} /></button>)}</div>
                  </div>

                  <div className="space-y-3 mb-6 bg-zinc-50/50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-700">
                    <div className="flex justify-between items-center mb-2"><div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Members</div><div className="text-xs text-zinc-400">Leader: {party.leaderName}</div></div>
                    {party.currentMembers.map(member => {
                       const latestProfile = allUsers.find(u => u.uid === member.uid);
                       return (
                       <div key={member.uid} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="relative"><img src={latestProfile?.photoURL || 'https://via.placeholder.com/150'} alt="" className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 object-cover" />{member.uid === party.leaderId && (<div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5" title="Party Leader"><Crown size={8} fill="currentColor" /></div>)}</div>
                            <div className="flex flex-col"><span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{latestProfile?.displayName || member.name}</span><span className={`text-[10px] uppercase font-bold ${member.role === RoleType.DPS ? 'text-red-700 dark:text-red-400' : member.role === RoleType.TANK ? 'text-yellow-700 dark:text-yellow-400' : member.role === RoleType.HEALER ? 'text-green-700 dark:text-green-400' : 'text-purple-700 dark:text-purple-400'}`}>{member.role}</span></div>
                          </div>
                          <div className="flex items-center gap-2">{currentUser && party.leaderId === currentUser.uid && member.uid !== currentUser.uid && (<button type="button" onClick={(e) => kickMember(e, party, member.uid)} className="text-zinc-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-all" title="Kick Member"><Trash2 size={14} /></button>)}</div>
                       </div>
                    )})}
                    {Array.from({ length: Math.max(0, party.maxMembers - party.currentMembers.length) }).map((_, i) => (<div key={i} className="flex items-center gap-3 opacity-30 px-1"><div className="w-8 h-8 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-600"></div><span className="text-sm text-zinc-400 italic">Empty Slot</span></div>))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs text-zinc-400"><Clock size={14} /><span>Live</span></div>
                    {isUserInThisParty ? (
                      <button onClick={() => leaveParty(party)} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-medium rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 flex items-center gap-2"><LogOut size={14}/>Leave Party</button>
                    ) : (
                      <button onClick={() => handleJoinClick(party)} className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">{party.currentMembers.length >= party.maxMembers ? 'Party Full' : 'Join Party'}</button>
                    )}
                  </div>
                </div>
              )})}
            
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Calendar className="text-rose-900 dark:text-rose-500" />Branch Events</h2>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4">{branchEvents.length === 0 ? (<p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No upcoming events scheduled for this branch.</p>) : (<div className="space-y-4">{branchEvents.map(event => (<div key={event.id} className="flex gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0"><div className="flex-col flex items-center bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-400 rounded p-2 min-w-[50px] h-fit"><span className="text-xs font-bold">{new Date(event.date).toLocaleDateString(undefined, {month:'short'})}</span><span className="text-lg font-bold">{new Date(event.date).getDate()}</span></div><div className="min-w-0"><h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{event.title}</h4><p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{event.description}</p><span className="inline-block mt-2 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded uppercase tracking-wider">{event.type}</span></div></div>))}</div>)}</div>
        </div>
      </div>

      <CreatePartyModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateParty} data={newPartyData} onChange={setNewPartyData} />
      <ConfirmationModal isOpen={deleteConf.isOpen} onClose={() => setDeleteConf({ ...deleteConf, isOpen: false })} onConfirm={deleteConf.action} title={deleteConf.title} message={deleteConf.message} />
    </div>
  );
};

export default GuildDashboard;
