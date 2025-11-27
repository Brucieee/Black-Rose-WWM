
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_EVENTS } from '../services/mockData';
import { Party, RoleType, Guild } from '../types';
import { Users, Clock, Plus, Sword, Crown, Trash2, Calendar, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { useAlert } from '../contexts/AlertContext';
import { CreatePartyModal } from '../components/modals/CreatePartyModal';

const GuildDashboard: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  
  // Real Data State
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Real-time parties from Firestore
  const [parties, setParties] = useState<Party[]>([]);
  const [memberCount, setMemberCount] = useState(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [newPartyData, setNewPartyData] = useState({
    name: '',
    activity: '',
    maxMembers: 5
  });

  // 1. Fetch Guild Details & Real-time Listeners
  useEffect(() => {
    if (!guildId) return;

    // Fetch Guild Details
    const guildRef = doc(db, "guilds", guildId);
    const unsubGuild = onSnapshot(guildRef, (docSnap) => {
        if (docSnap.exists()) {
            setGuild({ id: docSnap.id, ...docSnap.data() } as Guild);
        } else {
            setGuild(null);
        }
        setLoading(false);
    });

    // Fetch Parties
    const qParties = query(collection(db, "parties"), where("guildId", "==", guildId));
    const unsubParties = onSnapshot(qParties, (snapshot) => {
      const partiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Party[];
      setParties(partiesData);
    });

    // Fetch Real Member Count
    const qUsers = query(collection(db, "users"), where("guildId", "==", guildId));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setMemberCount(snapshot.size);
    });

    return () => {
        unsubGuild();
        unsubParties();
        unsubUsers();
    };
  }, [guildId]);

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading Guild Data...</div>;
  if (!guild) return <div className="p-8 text-center text-red-500 font-bold">Guild Branch Not Found (ID: {guildId})</div>;

  const branchEvents = MOCK_EVENTS.filter(e => e.guildId === guildId);

  // -- Handlers --

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/register');
      return;
    }

    try {
      // Create new party in Firestore
      await addDoc(collection(db, "parties"), {
        guildId: guildId || '',
        name: newPartyData.name,
        activity: newPartyData.activity,
        leaderId: currentUser.uid,
        leaderName: currentUser.displayName || 'Anonymous',
        maxMembers: newPartyData.maxMembers,
        currentMembers: [
          { 
            uid: currentUser.uid, 
            name: currentUser.displayName || 'Anonymous', 
            role: RoleType.DPS, // In a real app, fetch user's actual role from profile
            photoURL: currentUser.photoURL 
          }
        ]
      });

      setIsCreateModalOpen(false);
      setNewPartyData({ name: '', activity: '', maxMembers: 5 });
    } catch (error) {
      console.error("Error creating party:", error);
      showAlert("Failed to create party. Check console.", 'error');
    }
  };

  const joinParty = async (partyId: string, currentMembers: any[]) => {
    if (!currentUser) {
      navigate('/register');
      return;
    }

    const partyRef = doc(db, "parties", partyId);
    
    // Check if already in party locally before sending request
    if (currentMembers.find((m: any) => m.uid === currentUser.uid)) return;

    try {
      await updateDoc(partyRef, {
        currentMembers: arrayUnion({
          uid: currentUser.uid,
          name: currentUser.displayName || 'Anonymous',
          role: RoleType.DPS, // Fetch real role in production
          photoURL: currentUser.photoURL
        })
      });
    } catch (error) {
      console.error("Error joining party:", error);
    }
  };

  const kickMember = async (partyId: string, memberUid: string, memberData: any) => {
    console.log(`Attempting to kick member ${memberUid} from party ${partyId}`);
    if (!window.confirm("Are you sure you want to kick this member?")) return;
    
    try {
      const partyRef = doc(db, "parties", partyId);
      await updateDoc(partyRef, {
        currentMembers: arrayRemove(memberData)
      });
      console.log("Member kicked successfully.");
    } catch (error) {
      console.error("Error kicking member:", error);
      showAlert("Failed to kick member. Check console.", 'error');
    }
  };

  const deleteParty = async (partyId: string) => {
    console.log(`Attempting to delete party: ${partyId}`);
    if (!window.confirm("Disband this party?")) return;
    try {
      await deleteDoc(doc(db, "parties", partyId));
      console.log("Party deleted successfully.");
    } catch (error) {
      console.error("Error deleting party:", error);
      showAlert("Failed to delete party. Check console.", 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      
      {/* Title */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
           <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{guild.name} Dashboard</h1>
           {!currentUser && (
             <button onClick={() => navigate('/register')} className="text-sm bg-rose-900 text-white px-4 py-2 rounded">
               Login to Join Parties
             </button>
           )}
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Total Members</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{memberCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Active Parties</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{parties.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Upcoming Events</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{branchEvents.length}</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Parties */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sword className="text-rose-900 dark:text-rose-500" />
              Party Finder
            </h2>
            <button 
              onClick={() => currentUser ? setIsCreateModalOpen(true) : navigate('/register')}
              className="flex items-center gap-2 bg-rose-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-950 transition-colors shadow-sm shadow-rose-900/20"
            >
              <Plus size={16} />
              Create Party
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {parties.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                <p className="text-zinc-500 dark:text-zinc-400">No active parties in this branch.</p>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-rose-900 dark:text-rose-500 font-medium mt-2 hover:underline"
                >
                  Start a new party
                </button>
              </div>
            ) : (
              parties.map(party => (
                <div key={party.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:border-rose-200 dark:hover:border-rose-900/50 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{party.name}</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{party.activity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                         party.currentMembers.length >= party.maxMembers 
                           ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                           : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                       }`}>
                         {party.currentMembers.length}/{party.maxMembers} Members
                       </span>
                       {currentUser?.uid === party.leaderId && (
                         <button 
                           onClick={() => deleteParty(party.id)}
                           className="text-zinc-400 hover:text-red-600 p-1" 
                           title="Disband Party"
                         >
                           <Trash2 size={16} />
                         </button>
                       )}
                    </div>
                  </div>

                  {/* Roster */}
                  <div className="space-y-3 mb-6 bg-zinc-50/50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-700">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Members</div>
                      <div className="text-xs text-zinc-400">Leader: {party.leaderName}</div>
                    </div>
                    
                    {party.currentMembers.map(member => (
                       <div key={member.uid} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img src={member.photoURL || 'https://via.placeholder.com/150'} alt="" className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 object-cover" />
                              {member.uid === party.leaderId && (
                                <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5" title="Party Leader">
                                  <Crown size={8} fill="currentColor" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{member.name}</span>
                              <span className={`text-[10px] uppercase font-bold ${
                                member.role === RoleType.DPS ? 'text-red-700 dark:text-red-400' : 
                                member.role === RoleType.TANK ? 'text-yellow-700 dark:text-yellow-400' :
                                member.role === RoleType.HEALER ? 'text-green-700 dark:text-green-400' : 'text-purple-700 dark:text-purple-400'
                              }`}>
                                {member.role}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Kick Button: Only visible if Current User is Leader AND target is not themselves */}
                            {currentUser && party.leaderId === currentUser.uid && member.uid !== currentUser.uid && (
                              <button 
                                onClick={() => kickMember(party.id, member.uid, member)}
                                className="text-zinc-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                title="Kick Member"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                       </div>
                    ))}
                    {/* Empty Slots */}
                    {Array.from({ length: Math.max(0, party.maxMembers - party.currentMembers.length) }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 opacity-30 px-1">
                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-600"></div>
                        <span className="text-sm text-zinc-400 italic">Empty Slot</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Clock size={14} />
                      <span>Live</span>
                    </div>
                    
                    {/* Join Logic */}
                    {currentUser && party.currentMembers.find(m => m.uid === currentUser.uid) ? (
                      <button disabled className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 text-sm font-medium rounded-lg cursor-default">
                        Joined
                      </button>
                    ) : (
                      <button 
                        onClick={() => joinParty(party.id, party.currentMembers)}
                        disabled={party.currentMembers.length >= party.maxMembers}
                        className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {party.currentMembers.length >= party.maxMembers ? 'Party Full' : 'Join Party'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Events */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Calendar className="text-rose-900 dark:text-rose-500" />
            Branch Events
          </h2>
          
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4">
            {branchEvents.length === 0 ? (
               <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No upcoming events scheduled for {guild.name}.</p>
            ) : (
              <div className="space-y-4">
                {branchEvents.map(event => (
                  <div key={event.id} className="flex gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                    <div className="flex-col flex items-center bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-400 rounded p-2 min-w-[50px] h-fit">
                      <span className="text-xs font-bold">{new Date(event.date).toLocaleDateString(undefined, {month:'short'})}</span>
                      <span className="text-lg font-bold">{new Date(event.date).getDate()}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{event.title}</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{event.description}</p>
                      <span className="inline-block mt-2 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded uppercase tracking-wider">
                        {event.type}
                      </span>
                    </div>
                  </div>
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

    </div>
  );
};

export default GuildDashboard;
