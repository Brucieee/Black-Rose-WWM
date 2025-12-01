
import React, { useState, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Swords, Trophy, Users, Shield, Crown, RefreshCw, LogOut, X, Shuffle, Check, Clock, AlertCircle, Settings, Edit2, Plus, Minus, RotateCcw, Move, Trash2, Sparkles, UserMinus, Globe, Medal } from 'lucide-react';
import { Guild, ArenaParticipant, ArenaMatch, UserProfile, CustomTournament } from '../types';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { JoinArenaModal } from '../components/modals/JoinArenaModal';
import { InitializeBracketModal } from '../components/modals/InitializeBracketModal';
import { EditPointsModal } from '../components/modals/EditPointsModal';
import { ArenaSettingsModal } from '../components/modals/ArenaSettingsModal';
import { CreateTournamentModal } from '../components/modals/CreateTournamentModal';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import firebase from 'firebase/compat/app';

const { useNavigate } = ReactRouterDOM as any;

const Arena: React.FC = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [customTournaments, setCustomTournaments] = useState<CustomTournament[]>([]);
  
  // ID can be a Guild ID OR a Tournament ID
  const [selectedId, setSelectedId] = useState<string>(''); 
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [participants, setParticipants] = useState<ArenaParticipant[]>([]);
  const [matches, setMatches] = useState<ArenaMatch[]>([]);
  
  // Modals State
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCreateTourneyModalOpen, setIsCreateTourneyModalOpen] = useState(false);
  
  // Edit Points State
  const [editingPointsParticipant, setEditingPointsParticipant] = useState<ArenaParticipant | null>(null);

  // Profile Viewing State
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);

  // Pan & Zoom State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Confirmation Modal State
  const [confModal, setConfModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', action: async () => {} });

  // Determine if viewing a Guild or a Custom Tournament
  const selectedGuild = guilds.find(g => g.id === selectedId);
  const selectedTournament = customTournaments.find(t => t.id === selectedId);
  const isCustomMode = !!selectedTournament;

  // Permissions: Admin can do all. Officer can manage THEIR guild.
  const canManage = userProfile?.systemRole === 'Admin' || (userProfile?.systemRole === 'Officer' && userProfile.guildId === selectedId && !isCustomMode);
  // Custom tournaments can be managed by Admin or Creator (assuming creator check logic if needed, simplied to Admin for now)
  const canDeleteCustom = userProfile?.systemRole === 'Admin';

  // User Status
  const currentUserParticipant = currentUser ? participants.find(p => p.uid === currentUser.uid) : undefined;
  
  // Derived lists
  const approvedParticipants = participants.filter(p => p.status === 'approved');
  const pendingParticipants = participants.filter(p => p.status === 'pending');

  const arenaMinPoints = selectedGuild?.arenaMinPoints || 0;
  // Use lastArenaWinners if available, otherwise fallback to lastArenaChampion for legacy support
  const arenaWinners = selectedGuild?.lastArenaWinners || (selectedGuild?.lastArenaChampion ? [{...selectedGuild.lastArenaChampion, rank: 1}] : []);

  const assignedParticipantUids = React.useMemo(() => {
    const uids = new Set<string>();
    matches.forEach(match => {
      if (match.player1) uids.add(match.player1.uid);
      if (match.player2) uids.add(match.player2.uid);
    });
    return uids;
  }, [matches]);

  // Current User Match Info
  const myActiveMatch = currentUser ? matches.find(m => 
    !m.winner && 
    ((m.player1?.uid === currentUser.uid) || (m.player2?.uid === currentUser.uid))
  ) : undefined;

  const opponent = myActiveMatch 
    ? (myActiveMatch.player1?.uid === currentUser?.uid ? myActiveMatch.player2 : myActiveMatch.player1)
    : null;

  // Calculate Tournament Winners (Top 3) - LIVE Calculation from Bracket State for display when tournament just finishes
  const getTournamentWinners = () => {
      if (matches.length === 0) return { first: null, second: null, third: null };
      
      const regularMatches = matches.filter(m => !m.isThirdPlace);
      const maxRound = Math.max(...regularMatches.map(m => m.round));
      const finalMatch = regularMatches.find(m => m.round === maxRound);
      const thirdPlaceMatch = matches.find(m => m.isThirdPlace);

      if (!finalMatch || !finalMatch.winner) return { first: null, second: null, third: null };

      const first = finalMatch.winner;
      const second = finalMatch.player1?.uid === first.uid ? finalMatch.player2 : finalMatch.player1;
      const third = thirdPlaceMatch?.winner || null;

      return { first, second, third };
  };

  const { first: liveFirst, second: liveSecond, third: liveThird } = getTournamentWinners();
  // Is the current live bracket finished?
  const isTournamentDone = !!liveFirst;

  useEffect(() => {
    // Fetch Guilds
    const unsubGuilds = db.collection("guilds").orderBy("name").onSnapshot(snap => {
      const g = snap.docs.map(d => ({ id: d.id, ...d.data() } as Guild));
      setGuilds(g);
      if (g.length > 0 && !selectedId) {
        setSelectedId(g[0].id);
      }
    });

    // Fetch Custom Tournaments
    const unsubTourneys = db.collection("custom_tournaments").orderBy("createdAt", "desc").onSnapshot(snap => {
        setCustomTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomTournament)));
    });

    // Fetch User Profile
    if (currentUser) {
      const unsubUser = db.collection("users").doc(currentUser.uid).onSnapshot(snap => {
        if (snap.exists) setUserProfile(snap.data() as UserProfile);
      });
      return () => { unsubGuilds(); unsubUser(); unsubTourneys(); };
    }
    
    return () => { unsubGuilds(); unsubTourneys(); };
  }, [currentUser, selectedId]);

  useEffect(() => {
    if (!selectedId) return;

    // Fetch Participants for selected guild/tournament
    const unsubParticipants = db.collection("arena_participants")
      .where("guildId", "==", selectedId)
      .onSnapshot(snap => {
        setParticipants(snap.docs.map(d => d.data() as ArenaParticipant));
      });

    // Fetch Matches for selected guild/tournament
    const unsubMatches = db.collection("arena_matches")
      .where("guildId", "==", selectedId)
      .onSnapshot(snap => {
        const matchesData = snap.docs.map(d => ({id: d.id, ...d.data()} as ArenaMatch));
        // Sort by Round ASC, then Position ASC
        matchesData.sort((a, b) => {
            if (a.round !== b.round) return a.round - b.round;
            return a.position - b.position;
        });
        setMatches(matchesData);
      });

    return () => { unsubParticipants(); unsubMatches(); };
  }, [selectedId]);

  // --- Helper to Save Winners to Guild History ---
  const saveGuildWinners = async () => {
      if (isCustomMode) return;
      
      // We need to query the DB directly to ensure we get the latest state including the write we just made
      const matchesSnap = await db.collection("arena_matches").where("guildId", "==", selectedId).get();
      const dbMatches = matchesSnap.docs.map(d => d.data() as ArenaMatch);
      
      const regularMatches = dbMatches.filter(m => !m.isThirdPlace);
      if (regularMatches.length === 0) return;

      const maxRound = Math.max(...regularMatches.map(m => m.round));
      const finalMatch = regularMatches.find(m => m.round === maxRound);
      const thirdPlaceMatch = dbMatches.find(m => m.isThirdPlace);

      // Only proceed if we have a Champion
      if (!finalMatch || !finalMatch.winner) return;

      const first = finalMatch.winner;
      const second = finalMatch.player1?.uid === first.uid ? finalMatch.player2 : finalMatch.player1;
      const third = thirdPlaceMatch?.winner || null;

      const winners = [
          { rank: 1, uid: first.uid, displayName: first.displayName, photoURL: first.photoURL, wonAt: new Date().toISOString() }
      ];

      if (second) {
          winners.push({ rank: 2, uid: second.uid, displayName: second.displayName, photoURL: second.photoURL, wonAt: new Date().toISOString() });
      }
      if (third) {
          winners.push({ rank: 3, uid: third.uid, displayName: third.displayName, photoURL: third.photoURL, wonAt: new Date().toISOString() });
      }

      await db.collection("guilds").doc(selectedId).update({
          lastArenaWinners: winners,
          // Update legacy field for compatibility if needed
          lastArenaChampion: winners[0] 
      });
  };

  // --- Pan/Zoom Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('[draggable="true"]') ||
        (e.target as HTMLElement).closest('.match-card')) { 
        return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        const newZoom = Math.min(Math.max(0.1, zoom + delta), 2);
        setZoom(newZoom);
    }
  };

  const zoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
  const zoomOut = () => setZoom(z => Math.max(z - 0.1, 0.2));
  const resetView = () => { setZoom(1); setPan({x: 50, y: 50}); };

  useEffect(() => {
    setPan({x: 50, y: 50});
  }, []);


  const handleInitializeBracket = async (size: number) => {
    const batch = db.batch();
    try {
      // 1. Delete existing matches
      const existingMatchesQuery = await db.collection("arena_matches").where("guildId", "==", selectedId).get();
      existingMatchesQuery.forEach(doc => {
          batch.delete(doc.ref);
      });

      // 2. Generate new structure
      let round = 1;
      let matchCount = size / 2;
      
      while (matchCount >= 1) {
          for (let i = 0; i < matchCount; i++) {
              const matchRef = db.collection("arena_matches").doc();
              batch.set(matchRef, { 
                  guildId: selectedId, 
                  round: round, 
                  position: i, 
                  player1: null, 
                  player2: null, 
                  winner: null 
              });
          }
          matchCount /= 2;
          round++;
      }

      // 3. Create 3rd Place Match (If size >= 4)
      if (size >= 4) {
          const thirdPlaceRef = db.collection("arena_matches").doc();
          batch.set(thirdPlaceRef, {
              guildId: selectedId,
              round: 99, // Special Round ID for 3rd Place
              position: 0,
              player1: null,
              player2: null,
              winner: null,
              isThirdPlace: true
          });
      }

      await batch.commit();
      
      if (size >= 32) setZoom(0.6);
      else if (size >= 16) setZoom(0.8);
      else setZoom(1);
      
      setPan({x: 50, y: 50});
      showAlert(`Bracket initialized for ${size} players.`, 'success');
    } catch (err: any) {
       console.error("Failed to init bracket", err);
       showAlert(`Failed to initialize: ${err.message}`, 'error');
    }
  };

  const handleManualReset = () => {
      setConfModal({
          isOpen: true,
          title: "Reset Bracket?",
          message: "This will clear the entire tournament bracket and remove all assigned players. This action cannot be undone.",
          action: async () => {
              const batch = db.batch();
              matches.forEach(m => batch.delete(db.collection("arena_matches").doc(m.id)));
              await batch.commit();
              showAlert("Bracket has been cleared.", 'success');
          }
      });
  };
  
  const handleClearAllParticipants = async () => {
    setConfModal({
      isOpen: true,
      title: "Clear All Participants?",
      message: "This will remove ALL participants and clear them from the bracket. This cannot be undone.",
      action: async () => {
        const batch = db.batch();
        const parts = await db.collection("arena_participants").where("guildId", "==", selectedId).get();
        parts.forEach(doc => batch.delete(doc.ref));
        matches.forEach(m => {
             const ref = db.collection("arena_matches").doc(m.id);
             batch.update(ref, { player1: null, player2: null, winner: null });
        });
        await batch.commit();
        showAlert("All participants cleared.", 'success');
      }
    });
  };

  const handleShuffleClick = () => {
    if (!canManage || approvedParticipants.length === 0) return;
    const round1Matches = matches.filter(m => m.round === 1);
    const shuffled = [...approvedParticipants].sort(() => 0.5 - Math.random());
    const batch = db.batch();
    
    matches.forEach(m => {
         const matchRef = db.collection("arena_matches").doc(m.id);
         batch.update(matchRef, { player1: null, player2: null, winner: null });
    });

    let participantIndex = 0;
    for (const match of round1Matches) {
        if (participantIndex >= shuffled.length) break;
        const player1 = shuffled[participantIndex++];
        const player2 = (participantIndex < shuffled.length) ? shuffled[participantIndex++] : null;
        batch.update(db.collection("arena_matches").doc(match.id), { player1, player2 });
    }
    
    batch.commit().then(() => showAlert("Shuffled into Round 1.", 'success'));
  };

  const handleJoinClick = () => {
      if (!currentUser) {
          showAlert("Please sign in first.", 'error');
          return;
      }
      if (!userProfile) {
          showAlert("Please create a profile first.", 'error');
          navigate('/register');
          return;
      }
      setIsJoinModalOpen(true);
  };

  const handleJoinSubmit = async (points: number) => {
    if (!userProfile) return;
    if (userProfile.guildId !== selectedId) {
      showAlert("You can only join the Arena for your own Guild Branch.", 'error');
      return;
    }
    try {
      await db.collection("arena_participants").doc(userProfile.uid).set({
        uid: userProfile.uid,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
        guildId: selectedId,
        activityPoints: points,
        status: 'pending'
      });
      setIsJoinModalOpen(false);
      showAlert("Entry submitted!", 'success');
    } catch (err: any) {
      showAlert(`Error: ${err.message}`, 'error');
    }
  };

  const handleCreateTournament = async (title: string, importedParticipants: ArenaParticipant[]) => {
      try {
          // 1. Create Tournament Doc
          const tourneyRef = await db.collection("custom_tournaments").add({
              title,
              createdAt: new Date().toISOString(),
              createdBy: userProfile?.uid || 'Admin'
          });

          // 2. Add Participants
          const batch = db.batch();
          importedParticipants.forEach(p => {
              // Override guildId with new tournamentId so they show up in this view
              const pRef = db.collection("arena_participants").doc(); // New ID for custom tourney entry
              batch.set(pRef, {
                  ...p,
                  guildId: tourneyRef.id,
                  status: 'approved'
              });
          });
          await batch.commit();
          
          setSelectedId(tourneyRef.id);
          showAlert("Custom Tournament Created!", 'success');
      } catch (err: any) {
          showAlert(`Error: ${err.message}`, 'error');
      }
  };

  const handleDeleteTournament = async () => {
      if (!isCustomMode || !selectedId) return;
      setConfModal({
          isOpen: true,
          title: "Delete Tournament?",
          message: `Are you sure you want to delete "${selectedTournament?.title}"? This action cannot be undone.`,
          action: async () => {
              try {
                  const batch = db.batch();
                  // 1. Delete Tournament Doc
                  batch.delete(db.collection("custom_tournaments").doc(selectedId));
                  
                  // 2. Delete Participants
                  const parts = await db.collection("arena_participants").where("guildId", "==", selectedId).get();
                  parts.forEach(doc => batch.delete(doc.ref));

                  // 3. Delete Matches
                  const matchSnaps = await db.collection("arena_matches").where("guildId", "==", selectedId).get();
                  matchSnaps.forEach(doc => batch.delete(doc.ref));

                  await batch.commit();
                  showAlert("Tournament Deleted.", 'success');
                  if (guilds.length > 0) setSelectedId(guilds[0].id);
                  else setSelectedId('');
              } catch (err: any) {
                  showAlert(`Delete failed: ${err.message}`, 'error');
              }
          }
      });
  };

  const handleSaveMinPoints = async (min: number) => {
      try {
          await db.collection("guilds").doc(selectedId).update({ arenaMinPoints: min });
          showAlert("Updated.", 'success');
      } catch (err: any) { showAlert(err.message, 'error'); }
  };
  
  const handleLeaveArena = async () => {
    if (!currentUser) return;
    try {
        const batch = db.batch();
        const pRef = db.collection("arena_participants").doc(currentUser.uid);
        batch.delete(pRef);

        const activeMatches = matches.filter(m => 
            m.player1?.uid === currentUser.uid || m.player2?.uid === currentUser.uid || m.winner?.uid === currentUser.uid
        );

        activeMatches.forEach(m => {
            const updates: any = {};
            if (m.player1?.uid === currentUser.uid) updates.player1 = null;
            if (m.player2?.uid === currentUser.uid) updates.player2 = null;
            if (m.winner?.uid === currentUser.uid) updates.winner = null;
            
            const matchRef = db.collection("arena_matches").doc(m.id);
            batch.update(matchRef, updates);
        });

        await batch.commit();
        showAlert("You have left the arena.", 'info');
    } catch (err: any) {
        showAlert(`Error leaving: ${err.message}`, 'error');
    }
  };

  const handleRemoveParticipant = async (uid: string, name: string) => {
      setConfModal({
          isOpen: true,
          title: `Remove ${name}?`,
          message: "This will remove the user from the participants list and clear any active match slots they occupy.",
          action: async () => {
              const batch = db.batch();
              
              const pQuery = await db.collection("arena_participants").where("guildId", "==", selectedId).where("uid", "==", uid).get();
              pQuery.forEach(doc => batch.delete(doc.ref));

              const activeMatches = matches.filter(m => 
                m.player1?.uid === uid || m.player2?.uid === uid || m.winner?.uid === uid
              );
              
              activeMatches.forEach(m => {
                const updates: any = {};
                if (m.player1?.uid === uid) updates.player1 = null;
                if (m.player2?.uid === uid) updates.player2 = null;
                if (m.winner?.uid === uid) updates.winner = null;
                batch.update(db.collection("arena_matches").doc(m.id), updates);
              });

              await batch.commit();
              showAlert(`${name} removed.`, 'success');
          }
      });
  };
  
  const handleRemoveChampion = async () => {
     await db.collection("guilds").doc(selectedId).update({ 
         lastArenaChampion: firebase.firestore.FieldValue.delete(),
         lastArenaWinners: firebase.firestore.FieldValue.delete() 
     });
  };

  const handleApprove = async (uid: string) => db.collection("arena_participants").doc(uid).update({ status: 'approved' });
  const handleDeny = async (uid: string) => db.collection("arena_participants").doc(uid).update({ status: 'denied' });
  const handleUpdatePoints = async (uid: string, newPoints: number) => db.collection("arena_participants").doc(uid).update({ activityPoints: newPoints });

  const handleViewProfile = async (uid: string) => {
      const doc = await db.collection("users").doc(uid).get();
      if (doc.exists) setViewingProfile(doc.data() as UserProfile);
  };

  const handleDeclareWinner = async (match: ArenaMatch, winner: ArenaParticipant) => {
    if (!canManage) return;
    
    try {
        const batch = db.batch();
        const matchRef = db.collection("arena_matches").doc(match.id);
        
        batch.update(matchRef, { winner });

        const nextRound = match.round + 1;
        
        const regularMatches = matches.filter(m => !m.isThirdPlace);
        const maxRoundNum = Math.max(...regularMatches.map(m => m.round));
        
        const isSemiFinal = match.round === maxRoundNum - 1;

        if (isSemiFinal) {
            const loser = match.player1?.uid === winner.uid ? match.player2 : match.player1;
            const thirdPlaceMatch = matches.find(m => m.isThirdPlace);
            
            if (thirdPlaceMatch && loser) {
                const slot = match.position % 2 === 0 ? 'player1' : 'player2';
                const thirdRef = db.collection("arena_matches").doc(thirdPlaceMatch.id);
                batch.update(thirdRef, { [slot]: loser });
            }
        }

        const nextPosition = Math.floor(match.position / 2);
        const nextSlot = match.position % 2 === 0 ? 'player1' : 'player2';

        const nextMatchQuery = await db.collection("arena_matches")
            .where("guildId", "==", selectedId)
            .where("round", "==", nextRound)
            .where("position", "==", nextPosition)
            .get();
        
        let isChampion = false;
        if (!nextMatchQuery.empty) {
            const nextMatchDoc = nextMatchQuery.docs[0];
            batch.update(nextMatchDoc.ref, {
                [nextSlot]: winner,
                winner: null // Reset next match winner if re-deciding
            });
        } else if (match.round === maxRoundNum) {
             isChampion = true;
        }

        await batch.commit();

        if (isChampion) {
            showAlert(`${winner.displayName} is the champion!`, 'success', 'Tournament Winner!');
        }

        // Trigger persistence of winners if we just decided the Champion or if we updated the 3rd place match
        // Only for Guild Tournaments
        if (!isCustomMode && (isChampion || match.isThirdPlace)) {
            // Wait slightly for Firestore to propagate
            setTimeout(() => saveGuildWinners(), 500); 
        }

    } catch (err: any) {
        showAlert(`Error updating bracket: ${err.message}`, 'error');
    }
  };

  const handleClearSlot = async (e: React.MouseEvent, matchId: string, slot: 'player1' | 'player2') => {
      e.stopPropagation();
      if (!canManage) return;
      await db.collection("arena_matches").doc(matchId).update({ [slot]: null, winner: null });
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, user: ArenaParticipant) => {
    if (!canManage || assignedParticipantUids.has(user.uid)) return;
    e.dataTransfer.setData("application/json", JSON.stringify(user));
  };

  const handleDrop = async (e: React.DragEvent, match: ArenaMatch, slot: 'player1' | 'player2') => {
    if (!canManage) return;
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    const droppedUser: ArenaParticipant = JSON.parse(data);
    
    await db.collection("arena_matches").doc(match.id).update({ [slot]: droppedUser, winner: null });
  };

  const handleDragOver = (e: React.DragEvent) => { if (canManage) e.preventDefault(); };

  const renderMatch = (match: ArenaMatch) => {
    const renderPlayer = (player: ArenaParticipant | null, slot: 'player1' | 'player2') => {
        const isWinner = match.winner?.uid === player?.uid;
        const isInteractive = !!player;

        const handleClick = (e: React.MouseEvent) => {
            if (!player) return;
            if (canManage && !match.winner) handleDeclareWinner(match, player);
            else handleViewProfile(player.uid);
        };

        return (
            <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, match, slot)}
                className={`p-2 rounded flex items-center justify-between transition-all min-h-[44px]
                    ${isWinner 
                        ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900' 
                        : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700'
                    }
                    ${isInteractive ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800' : ''}
                `}
                onClick={handleClick}
            >
                {player ? (
                    <div className="flex items-center gap-2 min-w-0">
                        <img src={player.photoURL || 'https://via.placeholder.com/150'} className="w-6 h-6 rounded-full flex-shrink-0 bg-zinc-200 dark:bg-zinc-700" />
                        <span className={`text-sm truncate font-medium ${isWinner ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>{player.displayName}</span>
                    </div>
                ) : (
                    <span className="text-xs text-zinc-400 italic">Empty Slot</span>
                )}
                <div className="flex items-center gap-1">
                  {isWinner && <Crown size={14} className="text-yellow-500 fill-yellow-500" />}
                  {canManage && player && (
                      <button onClick={(e) => handleClearSlot(e, match.id, slot)} className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12} />
                      </button>
                  )}
                </div>
            </div>
        )
    }

    const regularMatches = matches.filter(m => !m.isThirdPlace);
    const maxRound = regularMatches.length > 0 ? Math.max(...regularMatches.map(m => m.round)) : 3;

    return (
        <div key={match.id} className="match-card relative flex items-center z-10 w-full mb-8 last:mb-0">
            {/* The Match Box */}
            <div className={`bg-zinc-50 dark:bg-zinc-950 border ${match.isThirdPlace ? 'border-orange-300 dark:border-orange-800 bg-white dark:bg-black' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg p-2 w-64 shadow-sm group`}>
                {match.isThirdPlace && <div className="text-[10px] text-orange-600 dark:text-orange-500 text-center font-bold uppercase mb-1">3rd Place Match</div>}
                {renderPlayer(match.player1, 'player1')}
                <div className="text-[10px] text-zinc-300 dark:text-zinc-600 text-center font-bold py-0.5">VS</div>
                {renderPlayer(match.player2, 'player2')}
            </div>
            
            {/* Connector Lines (Not for 3rd place match) */}
            {!match.isThirdPlace && match.round < maxRound && (
                <div className={`absolute left-full top-1/2 w-16 h-[calc(100%+2rem)] -translate-y-1/2 pointer-events-none`}>
                    <div className="absolute top-1/2 left-0 w-8 h-[2px] bg-zinc-300 dark:bg-zinc-700"></div>
                    {match.position % 2 === 0 ? (
                        <div className="absolute top-1/2 left-8 w-[2px] h-[calc(50%+1rem)] bg-zinc-300 dark:bg-zinc-700 origin-top"></div>
                    ) : (
                        <div className="absolute bottom-1/2 left-8 w-[2px] h-[calc(50%+1rem)] bg-zinc-300 dark:bg-zinc-700 origin-bottom"></div>
                    )}
                </div>
            )}
            
            {/* Receiver Horizontal Connector (for rounds > 1) */}
            {!match.isThirdPlace && match.round > 1 && (
                 <div className="absolute right-full top-1/2 w-8 h-[2px] bg-zinc-300 dark:bg-zinc-700 -translate-y-1/2"></div>
            )}
        </div>
    );
  };

  // Rounds Logic
  const regularMatches = matches.filter(m => !m.isThirdPlace);
  const maxRound = regularMatches.length > 0 ? Math.max(...regularMatches.map(m => m.round)) : 3;
  const rounds = Array.from({ length: maxRound }, (_, i) => ({ 
      id: i + 1, 
      name: i + 1 === maxRound ? 'Finals' : (i + 1 === maxRound - 1 ? 'Semi-Finals' : `Round ${i + 1}`) 
  }));

  const thirdPlaceMatch = matches.find(m => m.isThirdPlace);

  // Dynamic Bracket Sizing
  const round1MatchCount = matches.filter(m => m.round === 1).length || 1;
  const minContainerHeight = Math.max(800, round1MatchCount * 140);

  // --- RENDER WINNERS (Top 3) ---
  const firstPlace = arenaWinners.find(w => w.rank === 1) || (isTournamentDone ? liveFirst : null);
  const secondPlace = arenaWinners.find(w => w.rank === 2) || (isTournamentDone ? liveSecond : null);
  const thirdPlace = arenaWinners.find(w => w.rank === 3) || (isTournamentDone ? liveThird : null);

  const hasWinners = !!firstPlace;

  return (
    <div className="p-8 max-w-[1920px] mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                    <Swords className="text-rose-900" size={32} />
                    {isCustomMode ? selectedTournament?.title : 'Arena Tournament'}
                </h1>
                {isCustomMode && canDeleteCustom && (
                    <button 
                        onClick={handleDeleteTournament}
                        className="text-zinc-400 hover:text-red-500 transition-colors p-2"
                        title="Delete Tournament"
                    >
                        <Trash2 size={20} />
                    </button>
                )}
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex gap-2 items-center">
                {/* Guild Buttons */}
                {guilds.map(g => (
                    <button
                        key={g.id}
                        onClick={() => setSelectedId(g.id)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                            selectedId === g.id 
                            ? 'bg-rose-900 text-white shadow-lg shadow-rose-900/20' 
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                        }`}
                    >
                        {g.name}
                    </button>
                ))}
                
                {/* Divider */}
                <div className="w-px h-8 bg-zinc-300 dark:bg-zinc-700 mx-2"></div>

                {/* Custom Tournaments */}
                {customTournaments.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setSelectedId(t.id)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                            selectedId === t.id 
                            ? 'bg-purple-900 text-white shadow-lg shadow-purple-900/20' 
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                        }`}
                    >
                        <Globe size={14} /> {t.title}
                    </button>
                ))}

                {/* Add Tournament Button (Admins) */}
                {userProfile?.systemRole === 'Admin' && (
                    <button 
                        onClick={() => setIsCreateTourneyModalOpen(true)}
                        className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 p-2 rounded-lg transition-colors"
                        title="Create Custom Tournament"
                    >
                        <Plus size={20} />
                    </button>
                )}
            </div>

            {canManage && (
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors"
                        title="Arena Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <button 
                        onClick={() => setIsInitModalOpen(true)}
                        className="bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors"
                        title="Setup Bracket"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* --- REIGNING CHAMPIONS BANNER (Shows persisted data or live results) --- */}
      {hasWinners && !isCustomMode && (
          <div className="mb-6 relative overflow-hidden rounded-xl bg-gradient-to-r from-zinc-900 to-black p-[2px] shadow-lg border border-zinc-800">
              <div className="bg-zinc-950 p-6 rounded-[10px] flex items-center justify-center relative overflow-hidden min-h-[160px]">
                  
                  {/* Background Effects */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-zinc-950 to-zinc-950"></div>
                  <Sparkles className="absolute top-4 left-10 text-yellow-500/20" size={40} />
                  <Sparkles className="absolute bottom-4 right-10 text-yellow-500/20" size={60} />

                  <div className="relative z-10 flex items-end gap-8 md:gap-16">
                      
                      {/* 2nd Place */}
                      {secondPlace && (
                          <div className="flex flex-col items-center group cursor-pointer" onClick={() => handleViewProfile(secondPlace.uid)}>
                              <div className="relative mb-2">
                                  <img src={secondPlace.photoURL || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-full border-4 border-zinc-400 object-cover shadow-lg" />
                                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">#2</div>
                              </div>
                              <h3 className="font-bold text-zinc-300 text-sm">{secondPlace.displayName}</h3>
                              <p className="text-xs text-zinc-500 font-medium">Silver</p>
                          </div>
                      )}

                      {/* 1st Place (Champion) */}
                      {firstPlace && (
                          <div className="flex flex-col items-center -mt-8 group cursor-pointer" onClick={() => handleViewProfile(firstPlace.uid)}>
                              <Trophy className="text-yellow-500 mb-2 drop-shadow-glow animate-bounce-slow" size={32} />
                              <div className="relative mb-3">
                                  <div className="absolute -inset-2 bg-yellow-500/30 rounded-full blur-md animate-pulse"></div>
                                  <img src={firstPlace.photoURL || 'https://via.placeholder.com/150'} className="relative w-24 h-24 rounded-full border-4 border-yellow-500 object-cover shadow-2xl" />
                                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-black px-3 py-1 rounded-full border-2 border-white shadow-sm">
                                      CHAMPION
                                  </div>
                              </div>
                              <h2 className="font-black text-white text-xl uppercase tracking-wide text-center">{firstPlace.displayName}</h2>
                              <p className="text-xs text-yellow-500/80 font-bold uppercase tracking-widest mt-1">
                                  Grand Champion
                              </p>
                          </div>
                      )}

                      {/* 3rd Place */}
                      {thirdPlace && (
                          <div className="flex flex-col items-center group cursor-pointer" onClick={() => handleViewProfile(thirdPlace.uid)}>
                              <div className="relative mb-2">
                                  <img src={thirdPlace.photoURL || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-full border-4 border-orange-700 object-cover shadow-lg" />
                                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">#3</div>
                              </div>
                              <h3 className="font-bold text-zinc-300 text-sm">{thirdPlace.displayName}</h3>
                              <p className="text-xs text-zinc-500 font-medium">Bronze</p>
                          </div>
                      )}
                  </div>

                  {canManage && (
                        <button 
                            onClick={handleRemoveChampion}
                            className="absolute top-4 right-4 bg-black/30 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm transition-colors z-20"
                            title="Remove Champions"
                        >
                            <Trash2 size={16} />
                        </button>
                  )}
              </div>
          </div>
      )}

      {/* --- CUSTOM TOURNAMENT WINNER BANNER (Only 1st place) --- */}
      {isCustomMode && liveFirst && (
          <div className="mb-6 relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-900 to-black p-[2px] shadow-lg border border-purple-800">
              <div className="bg-zinc-950 p-6 rounded-[10px] flex items-center justify-center relative overflow-hidden min-h-[140px]">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/20 via-zinc-950 to-zinc-950"></div>
                  
                  <div className="relative z-10 flex flex-col items-center group cursor-pointer" onClick={() => handleViewProfile(liveFirst.uid)}>
                      <Trophy className="text-purple-400 mb-2" size={32} />
                      <div className="relative mb-3">
                          <img src={liveFirst.photoURL || 'https://via.placeholder.com/150'} className="relative w-20 h-20 rounded-full border-4 border-purple-500 object-cover shadow-2xl" />
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-black px-3 py-1 rounded-full border-2 border-white shadow-sm">
                              WINNER
                          </div>
                      </div>
                      <h2 className="font-black text-white text-xl uppercase tracking-wide text-center">{liveFirst.displayName}</h2>
                  </div>
              </div>
          </div>
      )}

      {/* --- Current Matchup Banner --- */}
      {myActiveMatch && (
        <div className="mb-6 bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 p-6 rounded-xl border border-rose-200 dark:border-rose-900/30 shadow-sm relative overflow-hidden">
             {/* ... (Existing code kept same) ... */}
             <div className="relative z-10">
                 <h3 className="text-sm font-bold text-rose-700 dark:text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                     Current Matchup - Round {myActiveMatch.round}
                 </h3>
                 <div className="flex items-center justify-center gap-8 md:gap-16">
                     {/* YOU */}
                     <div 
                        className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => currentUserParticipant && handleViewProfile(currentUserParticipant.uid)}
                     >
                         <div className="relative">
                            <img src={currentUserParticipant?.photoURL || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-full border-4 border-white dark:border-zinc-800 shadow-lg object-cover" />
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">YOU</span>
                         </div>
                         <div>
                             <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{currentUserParticipant?.displayName}</h4>
                             <p className="text-xs text-zinc-500">{currentUserParticipant?.activityPoints} pts</p>
                         </div>
                     </div>

                     <div className="text-2xl font-black text-zinc-300 dark:text-zinc-700 italic">VS</div>

                     {/* OPPONENT */}
                     {opponent ? (
                         <div 
                            className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleViewProfile(opponent.uid)}
                         >
                            <div className="text-right">
                                <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{opponent.displayName}</h4>
                                <p className="text-xs text-zinc-500">{opponent.activityPoints} pts</p>
                            </div>
                            <div className="relative">
                                <img src={opponent.photoURL || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-full border-4 border-rose-100 dark:border-rose-900/30 shadow-lg object-cover" />
                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ENEMY</span>
                            </div>
                         </div>
                     ) : (
                         <div className="flex items-center gap-4 opacity-50">
                             <div className="text-right">
                                 <h4 className="text-xl font-bold text-zinc-500 dark:text-zinc-400 italic">Waiting...</h4>
                                 <p className="text-xs text-zinc-500">TBD</p>
                             </div>
                             <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center border-4 border-dashed border-zinc-300 dark:border-zinc-700">
                                 <Users size={24} className="text-zinc-400" />
                             </div>
                         </div>
                     )}
                 </div>
             </div>
        </div>
      )}

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left Sidebar: Participants */}
        <div className="w-80 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex-shrink-0 z-10">
            {/* ... Existing Participant List ... */}
            {canManage && pendingParticipants.length > 0 && (
                <div className="border-b-4 border-zinc-100 dark:border-zinc-950 bg-rose-50 dark:bg-rose-900/10">
                    <div className="p-3 flex items-center justify-between">
                         <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={12} /> Pending Approval
                         </h3>
                         <span className="text-xs font-bold bg-white dark:bg-zinc-800 px-1.5 rounded text-rose-600">{pendingParticipants.length}</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2">
                        {pendingParticipants.map(p => (
                            <div key={p.uid} className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <img src={p.photoURL || 'https://via.placeholder.com/150'} className="w-5 h-5 rounded-full" />
                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.displayName}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                     <span className="text-xs text-zinc-500 flex items-center gap-1">
                                        Points: <strong className="text-zinc-700 dark:text-zinc-300">{p.activityPoints}</strong>
                                        <button onClick={()=>setEditingPointsParticipant(p)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ml-1"><Edit2 size={10} /></button>
                                     </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleApprove(p.uid)} className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs py-1 rounded font-bold transition-colors">Approve</button>
                                    <button onClick={() => handleDeny(p.uid)} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs py-1 rounded font-medium transition-colors">Deny</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Users size={18} /> Participants
                </h3>
                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full font-mono text-zinc-500">{approvedParticipants.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {approvedParticipants.map(p => {
                    const isAssigned = assignedParticipantUids.has(p.uid);
                    const canDrag = canManage && !isAssigned;
                    return (
                        <div 
                            key={p.uid}
                            draggable={canDrag}
                            onDragStart={(e) => handleDragStart(e, p)}
                            className={`flex items-center gap-3 p-2 rounded-lg border transition-all group ${
                                isAssigned 
                                  ? 'bg-zinc-50 dark:bg-zinc-800 opacity-50 border-transparent' 
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-rose-900 shadow-sm'
                            } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        >
                            <img src={p.photoURL || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-full object-cover bg-zinc-200 dark:bg-zinc-700" alt={p.displayName} />
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.displayName}</span>
                                {!isCustomMode && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-zinc-400">{p.activityPoints} pts</span>
                                        {canManage && (
                                            <button 
                                                onClick={() => setEditingPointsParticipant(p)}
                                                className="text-zinc-300 hover:text-zinc-500 dark:hover:text-zinc-200"
                                            >
                                                <Edit2 size={10} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {canManage && (
                                <button 
                                    onClick={() => handleRemoveParticipant(p.uid, p.displayName)}
                                    className="text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove Participant"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}
                {approvedParticipants.length === 0 && (
                    <p className="text-center text-zinc-400 text-sm py-4">No approved participants.</p>
                )}
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-900/50">
                {/* Join button hidden in Custom Mode (usually invite only) */}
                {!isCustomMode && (
                    <>
                        {!currentUserParticipant ? (
                            <button 
                                onClick={() => {
                                    if (!currentUser) {
                                        showAlert("Please sign in first.", 'error');
                                        return;
                                    }
                                    if (!userProfile) {
                                        showAlert("Please create a profile first.", 'error');
                                        navigate('/register');
                                        return;
                                    }
                                    setIsJoinModalOpen(true);
                                }}
                                className="w-full py-3 bg-rose-900 text-white rounded-lg font-bold hover:bg-rose-950 transition-colors shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2"
                            >
                                <Shield size={18} /> Join Tournament
                            </button>
                        ) : currentUserParticipant.status === 'pending' ? (
                            <button disabled className="w-full py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg font-bold cursor-not-allowed flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700">
                                <Clock size={18} /> Pending Approval
                            </button>
                        ) : currentUserParticipant.status === 'denied' ? (
                            <div className="flex flex-col gap-2">
                                <button disabled className="w-full py-2 bg-transparent text-red-600 dark:text-red-500 rounded-lg font-bold cursor-not-allowed flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/50">
                                    <AlertCircle size={18} /> Entry Denied
                                </button>
                                <button onClick={() => setIsJoinModalOpen(true)} className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline">Update Points & Re-apply</button>
                            </div>
                        ) : (
                            <button onClick={handleLeaveArena} className="w-full py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-white rounded-lg font-bold hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors flex items-center justify-center gap-2">
                                <LogOut size={18} /> Leave Arena
                            </button>
                        )}
                    </>
                )}

                {canManage && (
                   <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <button onClick={handleShuffleClick} className="text-xs flex items-center justify-center gap-1 bg-white dark:bg-zinc-800 hover:bg-rose-900 hover:text-white px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 transition-colors text-zinc-600 dark:text-zinc-400">
                          <Shuffle size={12} /> Shuffle
                      </button>
                      <button onClick={handleManualReset} className="text-xs flex items-center justify-center gap-1 bg-white dark:bg-zinc-800 hover:bg-rose-900 hover:text-white px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 transition-colors text-zinc-600 dark:text-zinc-400">
                          <RefreshCw size={12} /> Reset Bracket
                      </button>
                      <button onClick={handleClearAllParticipants} className="col-span-2 text-xs flex items-center justify-center gap-1 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded border border-red-100 dark:border-red-900/30 transition-colors">
                          <UserMinus size={12} /> Remove All Participants
                      </button>
                   </div>
                )}
            </div>
        </div>

        {/* Main Area: Bracket Canvas */}
        <div 
            className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col z-0"
            ref={containerRef}
        >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex items-center justify-between z-10 relative">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Trophy size={18} className="text-rose-900 dark:text-rose-500" /> Tournament Bracket
                </h3>
                {arenaMinPoints > 0 && !isCustomMode && <span className="text-xs text-zinc-500">Min Points: {arenaMinPoints}</span>}
            </div>

            {/* Zoom Controls */}
            <div className="absolute top-16 right-4 z-20 flex flex-col gap-2 bg-white dark:bg-zinc-800 p-2 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
                <button onClick={zoomIn} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300"><Plus size={20} /></button>
                <button onClick={zoomOut} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300"><Minus size={20} /></button>
                <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1"></div>
                <button onClick={resetView} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300" title="Reset View"><RotateCcw size={16} /></button>
            </div>
            
            {/* Draggable Viewport */}
            <div 
                className={`flex-1 overflow-hidden relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] bg-zinc-50/30 dark:bg-black/20`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                {/* Centered Empty State */}
                {matches.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-zinc-400 z-10 pointer-events-none">
                        <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Bracket not initialized.</p>
                        {canManage && <p className="text-sm mt-2">Click the <RefreshCw size={14} className="inline" /> icon to setup.</p>}
                    </div>
                )}

                <div 
                    style={{ 
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
                        transformOrigin: '0 0',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    className="origin-top-left absolute top-0 left-0 min-w-full min-h-full"
                >
                    <div 
                        className="flex gap-16 p-16"
                        style={{ minHeight: `${minContainerHeight}px` }} 
                    >
                        {matches.length > 0 && (
                            <>
                                {rounds.map(round => {
                                    const matchesInRound = regularMatches.filter(m => m.round === round.id);
                                    const isSemiFinal = round.id === maxRound - 1;
                                    
                                    return (
                                        <div key={round.id} className="flex flex-col min-w-[260px] relative z-0">
                                            <div className="mb-4 text-center">
                                                <div className="inline-block px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                                    {round.name}
                                                </div>
                                            </div>
                                            <div className="flex flex-col justify-around flex-grow gap-4 py-8 relative">
                                                {matchesInRound.map((match, i) => (
                                                    <React.Fragment key={match.id}>
                                                        {renderMatch(match)}
                                                        {/* Inject 3rd Place Match visually in the middle of Semi-Finals */}
                                                        {isSemiFinal && i === 0 && thirdPlaceMatch && (
                                                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 scale-90 opacity-90">
                                                                {renderMatch(thirdPlaceMatch)}
                                                            </div>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      <ConfirmationModal isOpen={confModal.isOpen} onClose={() => setConfModal({ ...confModal, isOpen: false })} onConfirm={confModal.action} title={confModal.title} message={confModal.message} />
      <JoinArenaModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} onSubmit={handleJoinSubmit} minPoints={arenaMinPoints} />
      <InitializeBracketModal isOpen={isInitModalOpen} onClose={() => setIsInitModalOpen(false)} onConfirm={handleInitializeBracket} />
      <EditPointsModal isOpen={!!editingPointsParticipant} onClose={() => setEditingPointsParticipant(null)} participant={editingPointsParticipant} onConfirm={handleUpdatePoints} />
      <ArenaSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} currentMin={arenaMinPoints} onSave={handleSaveMinPoints} />
      <CreateTournamentModal isOpen={isCreateTourneyModalOpen} onClose={() => setIsCreateTourneyModalOpen(false)} guilds={guilds} onConfirm={handleCreateTournament} />
      <UserProfileModal user={viewingProfile} onClose={() => setViewingProfile(null)} guilds={guilds} />
    </div>
  );
};

export default Arena;
