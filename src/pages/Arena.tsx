import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { ArenaMatch, ArenaParticipant, RoleType, UserProfile, Guild } from '../types';
import { Clock, Trophy, Swords, Users, Crown, Settings, Plus, LayoutGrid } from 'lucide-react';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { JoinArenaModal } from '../components/modals/JoinArenaModal';
import { InitializeBracketModal } from '../components/modals/InitializeBracketModal';
import { EditPointsModal } from '../components/modals/EditPointsModal';
import { ArenaSettingsModal } from '../components/modals/ArenaSettingsModal';
import { CreateTournamentModal } from '../components/modals/CreateTournamentModal';
import { useAlert } from '../contexts/AlertContext';
import firebase from 'firebase/compat/app';

const Arena: React.FC = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();

  const [matches, setMatches] = useState<ArenaMatch[]>([]);
  const [participants, setParticipants] = useState<ArenaParticipant[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Modal States
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isBracketModalOpen, setIsBracketModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCreateTournamentModalOpen, setIsCreateTournamentModalOpen] = useState(false);
  const [isEditPointsModalOpen, setIsEditPointsModalOpen] = useState(false);

  // Settings
  const [minPoints, setMinPoints] = useState(1000); // Default

  useEffect(() => {
    if (currentUser) {
        db.collection("users").doc(currentUser.uid).get().then(doc => {
            if (doc.exists) setUserProfile(doc.data() as UserProfile);
        });
    }
    
    const unsubMatches = db.collection("arena_matches").onSnapshot(snap => {
        setMatches(snap.docs.map(d => ({id: d.id, ...d.data()} as ArenaMatch)));
    });

    const unsubParticipants = db.collection("arena_participants").onSnapshot(snap => {
        setParticipants(snap.docs.map(d => d.data() as ArenaParticipant));
    });

    const unsubGuilds = db.collection("guilds").onSnapshot(snap => {
        setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild)));
    });

    return () => { unsubMatches(); unsubParticipants(); unsubGuilds(); };
  }, [currentUser]);

  const userActiveMatch = matches.find(m => 
     !m.winner && (m.player1?.uid === currentUser?.uid || m.player2?.uid === currentUser?.uid)
  );

  const getRoleBadge = (role?: RoleType) => {
    if (!role) return null;
    switch (role) {
      case RoleType.DPS: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">DPS</span>;
      case RoleType.TANK: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">TANK</span>;
      case RoleType.HEALER: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">HEALER</span>;
      case RoleType.HYBRID: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">HYBRID</span>;
      default: return null;
    }
  };

  const handleViewProfile = async (uid: string) => {
      const doc = await db.collection("users").doc(uid).get();
      if (doc.exists) {
          setSelectedUser(doc.data() as UserProfile);
      }
  };

  const renderActiveMatchBanner = () => {
      if (!userActiveMatch) return null;
      const opponent = userActiveMatch.player1?.uid === currentUser?.uid ? userActiveMatch.player2 : userActiveMatch.player1;
      const userPlayer = userActiveMatch.player1?.uid === currentUser?.uid ? userActiveMatch.player1 : userActiveMatch.player2;

      return (
          <div className="relative w-full h-32 md:h-40 bg-zinc-950 overflow-hidden shrink-0 border-b border-zinc-800 animate-in fade-in duration-500">
              {/* Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-black to-red-900/40 z-0"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 via-transparent to-transparent z-0"></div>
              
              <div className="relative z-10 flex items-center justify-center h-full px-4 md:px-12 gap-3 md:gap-8 w-full max-w-6xl mx-auto">
                  
                  {/* User (Left) */}
                  <div className="flex items-center gap-3 md:gap-5 flex-1 justify-end animate-in slide-in-from-left duration-700 min-w-0">
                      <div className="text-right hidden md:block min-w-0 shrink">
                          <h3 className="font-black text-white text-lg md:text-2xl uppercase italic tracking-tighter leading-none truncate" title={userPlayer?.displayName}>{userPlayer?.displayName}</h3>
                          <div className="flex justify-end mt-1">{getRoleBadge(userPlayer?.role)}</div>
                          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">YOU</p>
                      </div>
                      <div 
                        className="relative group shrink-0 cursor-pointer"
                        onClick={() => userPlayer && handleViewProfile(userPlayer.uid)}
                      >
                          <div className="absolute -inset-2 bg-blue-500/30 rounded-full blur-md group-hover:bg-blue-500/60 transition-all"></div>
                          <img src={userPlayer?.photoURL || 'https://via.placeholder.com/150'} className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-blue-500 object-cover relative z-10 bg-zinc-900 transition-transform group-hover:scale-105" />
                      </div>
                  </div>

                  {/* VS (Center) */}
                  <div className="flex flex-col items-center justify-center shrink-0 mx-2 z-20 min-w-[60px] md:min-w-[100px]">
                      <div className="relative">
                          <span className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-pulse block">VS</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mt-1 whitespace-nowrap">Matchup</span>
                  </div>

                  {/* Opponent (Right) */}
                  <div className="flex items-center gap-3 md:gap-5 flex-1 justify-start animate-in slide-in-from-right duration-700 min-w-0">
                      {opponent ? (
                          <>
                              <div 
                                className="relative group shrink-0 cursor-pointer"
                                onClick={() => handleViewProfile(opponent.uid)}
                              >
                                  <div className="absolute -inset-2 bg-red-500/30 rounded-full blur-md group-hover:bg-red-500/60 transition-all"></div>
                                  <img src={opponent.photoURL || 'https://via.placeholder.com/150'} className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-red-500 object-cover relative z-10 bg-zinc-900 transition-transform group-hover:scale-105" />
                              </div>
                              <div className="text-left hidden md:block min-w-0 shrink">
                                  <h3 className="font-black text-white text-lg md:text-2xl uppercase italic tracking-tighter leading-none truncate" title={opponent.displayName}>{opponent.displayName}</h3>
                                  <div className="flex justify-start mt-1">{getRoleBadge(opponent.role)}</div>
                                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-1">OPPONENT</p>
                              </div>
                          </>
                      ) : (
                          <div className="flex items-center gap-4 opacity-50 min-w-0">
                              <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-dashed border-zinc-600 bg-zinc-900 flex items-center justify-center shrink-0">
                                  <Clock className="text-zinc-500 animate-spin-slow" size={24} />
                              </div>
                              <div className="text-left hidden md:block whitespace-nowrap">
                                  <h3 className="font-bold text-zinc-500 text-lg uppercase italic">Waiting...</h3>
                                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Searching</p>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  const isAdmin = userProfile?.systemRole === 'Admin';
  const isOfficer = userProfile?.systemRole === 'Officer';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      {renderActiveMatchBanner()}

      <div className="max-w-7xl mx-auto py-8 px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                    <Swords className="text-rose-900 dark:text-rose-500" /> Arena
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">Competitive brackets and weekly rankings.</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
                 <button onClick={() => setIsJoinModalOpen(true)} className="bg-rose-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-rose-950 transition-colors shadow-lg shadow-rose-900/20">
                    Join Arena
                 </button>
                 {(isAdmin || isOfficer) && (
                     <>
                        <button onClick={() => setIsBracketModalOpen(true)} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700">
                           <LayoutGrid size={18} />
                        </button>
                        <button onClick={() => setIsSettingsModalOpen(true)} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700">
                           <Settings size={18} />
                        </button>
                        {isAdmin && (
                            <button onClick={() => setIsCreateTournamentModalOpen(true)} className="bg-purple-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-950 transition-colors shadow-lg shadow-purple-900/20">
                               <Plus size={18} /> Custom Tourney
                            </button>
                        )}
                     </>
                 )}
            </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-500 dark:text-zinc-400">
             <Trophy size={48} className="mx-auto mb-4 text-zinc-300 dark:text-zinc-700" />
             <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Tournament In Progress</h3>
             <p>Brackets and match details will appear here.</p>
             <p className="text-xs mt-4 opacity-50">Match ID: {userActiveMatch ? userActiveMatch.id : 'None'}</p>
        </div>
      </div>

      <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} guilds={guilds} />
      
      <JoinArenaModal 
        isOpen={isJoinModalOpen} 
        onClose={() => setIsJoinModalOpen(false)} 
        minPoints={minPoints}
        onSubmit={(points) => {
            // Placeholder logic
            showAlert("Request sent! Pending approval.", 'success');
            setIsJoinModalOpen(false);
        }}
      />
      
      <InitializeBracketModal 
        isOpen={isBracketModalOpen} 
        onClose={() => setIsBracketModalOpen(false)} 
        onConfirm={(size) => {
             showAlert(`Initialized ${size}-player bracket.`, 'success');
        }}
      />
      
      <ArenaSettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        currentMin={minPoints}
        onSave={(min) => setMinPoints(min)}
      />

      <CreateTournamentModal 
         isOpen={isCreateTournamentModalOpen}
         onClose={() => setIsCreateTournamentModalOpen(false)}
         guilds={guilds}
         onConfirm={(title, parts, finale) => {
             showAlert(`Created tournament: ${title}`, 'success');
         }}
      />
      
      <EditPointsModal 
         isOpen={isEditPointsModalOpen}
         onClose={() => setIsEditPointsModalOpen(false)}
         participant={null}
         onConfirm={() => {}}
      />

    </div>
  );
};

export default Arena;