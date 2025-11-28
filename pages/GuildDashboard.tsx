
import React, { useState, useEffect, useRef } from 'react';
// FIX: Replaced useNavigate with useHistory for react-router-dom v5 compatibility.
import { useParams, useHistory, Link } from 'react-router-dom';
import { Party, RoleType, Guild, GuildEvent, UserProfile } from '../types';
import { Users, Clock, Plus, Sword, Crown, Trash2, Calendar, Activity, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { useAlert } from '../contexts/AlertContext';
import { CreatePartyModal } from '../components/modals/CreatePartyModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const GuildDashboard: React.FC = () => {
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId;
  // FIX: Replaced useNavigate with useHistory for react-router-dom v5 compatibility.
  const history = useHistory();
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

    const guildRef = doc(db, "guilds", guildId);
    const unsubGuild = onSnapshot(guildRef, docSnap => {
      if (docSnap.exists()) setGuild({ id: docSnap.id, ...docSnap.data() } as Guild);
      else setGuild(null);
      setLoading(false);
    });

    const qParties = query(collection(db, "parties"), where("guildId", "==", guildId));
    const unsubParties = onSnapshot(qParties, snapshot => setParties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Party)));

    const unsubAllUsers = onSnapshot(collection(db, "users"), snapshot => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(usersData);
      if (currentUser) {
        const profile = usersData.find(u => u.uid === currentUser.uid);
        setCurrentUserProfile(profile || null);
      }
    });

    const qUsersInGuild = query(collection(db, "users"), where("guildId", "==", guildId));
    const unsubUsersCount = onSnapshot(qUsersInGuild, snapshot => setMemberCount(snapshot.size));

    const unsubEvents = onSnapshot(collection(db, "events"), snapshot => setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as GuildEvent)));

    return () => { unsubGuild(); unsubParties(); unsubUsersCount(); unsubEvents(); unsubAllUsers(); };
  }, [guildId, currentUser]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      parties.forEach(party => {
        const leader = allUsers.find(u => u.uid === party.leaderId);
        
        if (leader && leader.status === 'offline') {
          deleteDoc(doc(db, "parties", party.id));
          return;
        }

        const membersToRemove = party.currentMembers.filter(member => {
            const memberProfile = allUsers.find(u => u.uid === member.uid);
            return memberProfile && memberProfile.status === 'offline' && member.uid !== party.leaderId;
        });
        
        if (membersToRemove.length > 0) {
            updateDoc(doc(db, "parties", party.id), { currentMembers: arrayRemove(...membersToRemove) });
        }
      });
    }, 60000); 

    return () => clearInterval(cleanupInterval);
  }, [parties, allUsers]);

  const isUserInAnyParty = allUsers.length > 0 && parties.some(p => p.currentMembers.some(m => m.uid === currentUser?.uid));
  const canCreateParty = currentUserProfile?.guildId === guildId;
  const branchEvents = events.filter(e => e.guildId === guildId || !e.guildId || e.guildId === '');
  const onlineMembers = allUsers.filter(u => u.guildId === guildId && u.status === 'online');

  const openDeleteModal = (title: string, message: string, action: () => Promise<void>) => { /* ... */ };
  const handleCreateParty = async (e: React.FormEvent) => { /* ... */ };
  const handleJoinClick = (party: Party) => { /* ... */ };
  const joinParty = async (party: Party) => { /* ... */ };
  const leaveParty = async (party: Party) => { /* ... */ };
  const kickMember = async (e: React.MouseEvent, party: Party, memberUid: string) => { /* ... */ };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading Guild Data...</div>;
  if (!guild) return <div className="p-8 text-center text-red-500 font-bold">Guild Branch Not Found (ID: {guildId})</div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{guild.name} Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><Users size={24} /></div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Total Members</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {memberCount} / {guild.memberCap}
            </p>
          </div>
        </div>
        {/* Other Stat cards */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg"><Activity size={24} /></div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Active Parties</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{parties.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg"><Calendar size={24} /></div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Upcoming Events</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{branchEvents.length}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Party Finder etc... */}
      </div>

      <CreatePartyModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateParty} data={newPartyData} onChange={setNewPartyData} />
      <ConfirmationModal isOpen={deleteConf.isOpen} onClose={() => setDeleteConf({ ...deleteConf, isOpen: false })} onConfirm={deleteConf.action} title={deleteConf.title} message={deleteConf.message} />
    </div>
  );
};

export default GuildDashboard;
