import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { MOCK_EVENTS, MOCK_USERS } from '../services/mockData';
import { Party, RoleType, Guild } from '../types';
import { Users, Clock, Plus, Sword, Crown, Trash2, Calendar, X, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDoc } from 'firebase/firestore';

const GuildDashboard: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const { currentUser, signInWithGoogle } = useAuth();
  
  // Real Data State
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Real-time parties from Firestore
  const [parties, setParties] = useState<Party[]>([]);
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
    const q = query(collection(db, "parties"), where("guildId", "==", guildId));
    const unsubParties = onSnapshot(q, (snapshot) => {
      const partiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Party[];
      setParties(partiesData);
    });

    return () => {
        unsubGuild();
        unsubParties();
    };
  }, [guildId]);

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading Guild Data...</div>;
  if (!guild) return <div className="p-8 text-center text-red-500 font-bold">Guild Branch Not Found (ID: {guildId})</div>;

  const branchEvents = MOCK_EVENTS.filter(e => e.guildId === guildId);

  // -- Handlers --

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("You must be logged in!");
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
      alert("Failed to create party. Check console.");
    }
  };

  const joinParty = async (partyId: string, currentMembers: any[]) => {
    if (!currentUser) {
      signInWithGoogle();
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
    if (!window.confirm("Are you sure you want to kick this member?")) return;
    
    try {
      const partyRef = doc(db, "parties", partyId);
      await updateDoc(partyRef, {
        currentMembers: arrayRemove(memberData)
      });
    } catch (error) {
      console.error("Error kicking member:", error);
    }
  };

  const deleteParty = async (partyId: string) => {
    if (!window.confirm("Disband this party?")) return;
    try {
      await deleteDoc(doc(db, "parties", partyId));
    } catch (error) {
      console.error("Error deleting party:", error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsCreateModalOpen(false);
    }
  };

  // Mock member count based on guild ID for display purposes
  const memberCount = MOCK_USERS.filter(u => u.guildId === guildId).length + 42; 

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      
      {/* Title & Breadcrumbs */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-1">
          <span>Guild Branches</span>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{guild.name}</span>
        </div>
        <div className="flex justify-between items-center">
           <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{guild.name} Dashboard</h1>
           {!currentUser && (
             <button onClick={signInWithGoogle} className="text-sm bg-rose-900 text-white px-4 py-2 rounded">
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
              onClick={() => currentUser ? setIsCreateModalOpen(true) : signInWithGoogle()}
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

          <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 dark:from-zinc-900 dark:to-black rounded-xl p-6 text-white">
            <h3 className="font-bold mb-2">Need Help?</h3>
            <p className="text-sm text-zinc-400 mb-4">Contact your branch officers if you need assistance with parties or events.</p>
            <div className="flex -space-x-2">
               {[1,2,3].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full bg-zinc-700 border-2 border-zinc-800 flex items-center justify-center text-xs">?</div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Party Modal */}
      {isCreateModalOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Create New Party</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateParty} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Party Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Daily Dungeon Run"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-rose-900/20 outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  value={newPartyData.name}
                  onChange={e => setNewPartyData({...newPartyData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Activity Type</label>
                <select 
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-rose-900/20 outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  value={newPartyData.activity}
                  onChange={e => setNewPartyData({...newPartyData, activity: e.target.value})}
                  required
                >
                  <option value="" disabled>Select Activity</option>
                  <option value="Raid">Raid</option>
                  <option value="Dungeon">Dungeon</option>
                  <option value="PvP Arena">PvP Arena</option>
                  <option value="World Boss">World Boss</option>
                  <option value="Questing">Questing</option>
                  <option value="Social">Social / Chill</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Max Members</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="2" 
                    max="10" 
                    step="1"
                    className="w-full accent-rose-900"
                    value={newPartyData.maxMembers}
                    onChange={e => setNewPartyData({...newPartyData, maxMembers: parseInt(e.target.value)})}
                  />
                  <span className="font-mono font-bold text-lg text-rose-900 dark:text-rose-500 w-8 text-center">{newPartyData.maxMembers}</span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-rose-900 text-white rounded-lg hover:bg-rose-950 font-medium shadow-lg shadow-rose-900/20"
                >
                  Create Party
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default GuildDashboard;