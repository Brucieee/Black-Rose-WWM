
import React, { useState, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Guild, ArenaParticipant, ArenaMatch, UserProfile, CustomTournament, RoleType } from '../types';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useAlert } from '../contexts/AlertContext';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { JoinArenaModal } from '../components/modals/JoinArenaModal';
import { InitializeBracketModal, BracketSetupConfig } from '../components/modals/InitializeBracketModal';
import { EditPointsModal } from '../components/modals/EditPointsModal';
import { ArenaSettingsModal } from '../components/modals/ArenaSettingsModal';
import { CreateTournamentModal } from '../components/modals/CreateTournamentModal';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { SearchableUserSelect } from '../components/SearchableUserSelect';
import { BaseModal } from '../components/modals/BaseModal';
import { ArenaHeader } from '../components/arena/ArenaHeader';
import { ArenaSidebar } from '../components/arena/ArenaSidebar';
import { ArenaBracket } from '../components/arena/ArenaBracket';
import { ArenaChampions } from '../components/arena/ArenaChampions';
import firebase from 'firebase/compat/app';

const { useNavigate } = ReactRouterDOM as any;

const Arena: React.FC = () => {
  const { currentUser } = useAuth();
  const { guilds, users: allUsers } = useData();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  
  const [customTournaments, setCustomTournaments] = useState<CustomTournament[]>([]);
  
  const [selectedId, setSelectedId] = useState<string>(''); 
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [participants, setParticipants] = useState<ArenaParticipant[]>([]);
  const [matches, setMatches] = useState<ArenaMatch[]>([]);
  
  const [isShuffling, setIsShuffling] = useState(false);
  const [isChampionBannerVisible, setIsChampionBannerVisible] = useState(true);
  
  // Modals
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCreateTourneyModalOpen, setIsCreateTourneyModalOpen] = useState(false);
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  
  const [editingPointsParticipant, setEditingPointsParticipant] = useState<ArenaParticipant | null>(null);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);

  // Mobile Participant List Toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [confModal, setConfModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', action: async () => {} });

  const selectedGuild = guilds.find(g => g.id === selectedId);
  const selectedTournament = customTournaments.find(t => t.id === selectedId);
  const isCustomMode = !!selectedTournament;

  // Determine Best Of (Default to 3 if not set), and handle legacy "best of 2"
  const getEffectiveBestOf = () => {
    const value = isCustomMode ? (selectedTournament?.bestOf || 3) : (selectedGuild?.bestOf || 3);
    return value === 2 ? 3 : value;
  };
  const bestOf = getEffectiveBestOf();

  const canManage = userProfile?.systemRole === 'Admin' || (userProfile?.systemRole === 'Officer' && userProfile.guildId === selectedId && !isCustomMode);
  const isAdmin = userProfile?.systemRole === 'Admin';
  const canDeleteCustom = userProfile?.systemRole === 'Admin';

  const currentUserParticipant = currentUser ? participants.find(p => p.uid === currentUser.uid) : undefined;
  
  const approvedParticipants = participants.filter(p => p.status === 'approved');
  const pendingParticipants = participants.filter(p => p.status === 'pending');

  const arenaMinPoints = selectedGuild?.arenaMinPoints || 0;
  const arenaWinners = isCustomMode ? [] : (selectedGuild?.lastArenaWinners || (selectedGuild?.lastArenaChampion ? [{...selectedGuild.lastArenaChampion, rank: 1}] : []));

  const activeStreamMatchId = isCustomMode ? selectedTournament?.activeStreamMatchId : selectedGuild?.activeStreamMatchId;
  const activeBannerMatchId = isCustomMode ? selectedTournament?.activeBannerMatchId : selectedGuild?.activeBannerMatchId;

  const assignedParticipantUids = React.useMemo(() => {
    const uids = new Set<string>();
    matches.forEach(match => {
      if (match.player1) uids.add(match.player1.uid);
      if (match.player2) uids.add(match.player2.uid);
    });
    return uids;
  }, [matches]);

  const userActiveMatch = React.useMemo(() => {
      if (!currentUser) return null;
      return matches.find(m => !m.winner && (m.player1?.uid === currentUser.uid || m.player2?.uid === currentUser.uid));
  }, [matches, currentUser]);

  const getTournamentWinners = () => {
      if (matches.length === 0) return { first: null, second: null, third: null, fourth: null };
      
      const regularMatches = matches.filter(m => !m.isThirdPlace);
      if (regularMatches.length === 0) return { first: null, second: null, third: null, fourth: null };

      const maxRound = Math.max(...regularMatches.map(m => m.round));
      const finalMatch = regularMatches.find(m => m.round === maxRound);
      const thirdPlaceMatch = matches.find(m => m.isThirdPlace);

      if (!finalMatch || !finalMatch.winner) return { first: null, second: null, third: null, fourth: null };

      const first = finalMatch.winner;
      const second = finalMatch.player1?.uid === first.uid ? finalMatch.player2 : finalMatch.player1;
      
      const third = thirdPlaceMatch?.winner || null;
      // Calculate 4th place (loser of 3rd place match)
      let fourth: ArenaParticipant | null = null;
      if (thirdPlaceMatch && third) {
          fourth = thirdPlaceMatch.player1?.uid === third.uid ? thirdPlaceMatch.player2 : thirdPlaceMatch.player1;
      }

      return { first, second, third, fourth };
  };

  const { first: liveFirst, second: liveSecond, third: liveThird, fourth: liveFourth } = getTournamentWinners();
  const isTournamentDone = !!liveFirst;

  const firstPlace = arenaWinners.find(w => w.rank === 1) || (isTournamentDone ? liveFirst : null);
  const secondPlace = arenaWinners.find(w => w.rank === 2) || (isTournamentDone ? liveSecond : null);
  const thirdPlace = arenaWinners.find(w => w.rank === 3) || (isTournamentDone ? liveThird : null);
  const fourthPlace = arenaWinners.find(w => w.rank === 4) || (isTournamentDone ? liveFourth : null);

  const hasWinners = !!firstPlace;
  const showStandardBanner = hasWinners && (!isCustomMode || (isCustomMode && !selectedTournament?.hasGrandFinale));
  const showOverlayBanner = hasWinners && isCustomMode && selectedTournament?.hasGrandFinale && isChampionBannerVisible;

  useEffect(() => {
    setIsChampionBannerVisible(true);
  }, [selectedId, matches]);

  // Use profile from allUsers context to avoid extra listener, unless strict realtime is needed on profile changes
  // Actually, we can just use the context user.
  useEffect(() => {
      if (currentUser && allUsers.length > 0) {
          const profile = allUsers.find(u => u.uid === currentUser.uid);
          setUserProfile(profile || null);
      }
  }, [currentUser, allUsers]);

  // Fetch Custom Tournaments (Specific to this page, keep local)
  useEffect(() => {
    const unsubTourneys = db.collection("custom_tournaments").orderBy("createdAt", "desc").onSnapshot(snap => {
        setCustomTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomTournament)));
    });
    return () => unsubTourneys();
  }, []);

  // Initial Selection Logic
  useEffect(() => {
    if (selectedId) return; // Already selected
    if (guilds.length === 0) return; // Data not ready

    // If we have a user profile, default to their guild
    if (userProfile?.guildId) {
        const myGuild = guilds.find(g => g.id === userProfile.guildId);
        if (myGuild) {
            setSelectedId(myGuild.id);
            return;
        }
    }

    // Fallback
    if (guilds.length > 0) {
        setSelectedId(guilds[0].id);
    }
  }, [guilds, userProfile, selectedId]);

  useEffect(() => {
    setMatches([]);
    setParticipants([]);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    // Participants and Matches are specific to the selected ID (Guild or Tourney), so local listener is appropriate
    const unsubParticipants = db.collection("arena_participants")
      .where("guildId", "==", selectedId)
      .onSnapshot(snap => {
        setParticipants(snap.docs.map(d => d.data() as ArenaParticipant));
      });
    const unsubMatches = db.collection("arena_matches")
      .where("guildId", "==", selectedId)
      .onSnapshot(snap => {
        const matchesData = snap.docs.map(d => ({id: d.id, ...d.data()} as ArenaMatch));
        matchesData.sort((a, b) => {
            if (a.round !== b.round) return a.round - b.round;
            return a.position - b.position;
        });
        setMatches(matchesData);
      });
    return () => { unsubParticipants(); unsubMatches(); };
  }, [selectedId]);

  const saveGuildWinners = async () => {
      if (isCustomMode) return;
      const matchesSnap = await db.collection("arena_matches").where("guildId", "==", selectedId).get();
      const dbMatches = matchesSnap.docs.map(d => d.data() as ArenaMatch);
      const regularMatches = dbMatches.filter(m => !m.isThirdPlace);
      if (regularMatches.length === 0) return;
      const maxRound = Math.max(...regularMatches.map(m => m.round));
      const finalMatch = regularMatches.find(m => m.round === maxRound);
      const thirdPlaceMatch = dbMatches.find(m => m.isThirdPlace);
      
      if (!finalMatch || !finalMatch.winner) return;
      
      const first = finalMatch.winner;
      const second = finalMatch.player1?.uid === first.uid ? finalMatch.player2 : finalMatch.player1;
      const third = thirdPlaceMatch?.winner || null;
      let fourth: ArenaParticipant | null = null;
      if (thirdPlaceMatch && third) {
          fourth = thirdPlaceMatch.player1?.uid === third.uid ? thirdPlaceMatch.player2 : thirdPlaceMatch.player1;
      }

      const winners = [
          { rank: 1, uid: first.uid, displayName: first.displayName, photoURL: first.photoURL, wonAt: new Date().toISOString() }
      ];
      if (second) winners.push({ rank: 2, uid: second.uid, displayName: second.displayName, photoURL: second.photoURL, wonAt: new Date().toISOString() });
      if (third) winners.push({ rank: 3, uid: third.uid, displayName: third.displayName, photoURL: third.photoURL, wonAt: new Date().toISOString() });
      if (fourth) winners.push({ rank: 4, uid: fourth.uid, displayName: fourth.displayName, photoURL: fourth.photoURL, wonAt: new Date().toISOString() });

      await db.collection("guilds").doc(selectedId).update({
          lastArenaWinners: winners,
          lastArenaChampion: winners[0] 
      });
  };

  const handleInitializeBracket = async (config: BracketSetupConfig) => {
    const { mode, size, customMatches, bestOf } = config;
    const batch = db.batch();
    try {
      // 1. Update Tournament/Guild Settings with BestOf
      const collectionName = isCustomMode ? "custom_tournaments" : "guilds";
      batch.update(db.collection(collectionName).doc(selectedId), { bestOf: bestOf });

      // 2. Clear existing matches
      const existingMatchesQuery = await db.collection("arena_matches").where("guildId", "==", selectedId).get();
      existingMatchesQuery.forEach(doc => {
          batch.delete(doc.ref);
      });

      // 3. Create new bracket
      if (mode === 'standard' && size) {
          let round = 1;
          let matchCount = size / 2;
          while (matchCount >= 1) {
              for (let i = 0; i < matchCount; i++) {
                  const matchRef = db.collection("arena_matches").doc();
                  batch.set(matchRef, { guildId: selectedId, round: round, position: i, player1: null, player2: null, winner: null, score1: 0, score2: 0 });
              }
              matchCount /= 2;
              round++;
          }
          if (size >= 4) {
              const thirdPlaceRef = db.collection("arena_matches").doc();
              batch.set(thirdPlaceRef, { guildId: selectedId, round: 99, position: 0, player1: null, player2: null, winner: null, isThirdPlace: true, score1: 0, score2: 0 });
          }
      } else if (mode === 'custom' && customMatches) {
          customMatches.forEach((m, idx) => {
              const matchRef = db.collection("arena_matches").doc();
              batch.set(matchRef, { guildId: selectedId, round: 1, position: idx, player1: m.p1 || null, player2: m.p2 || null, winner: null, score1: 0, score2: 0 });
          });
      }

      await batch.commit();
      showAlert(`Bracket initialized (${bestOf === 1 ? 'Best of 1' : 'Best of 3'}).`, 'success');
    } catch (err: any) {
       console.error("Failed to init bracket", err);
       showAlert(`Failed to initialize: ${err.message}`, 'error');
    }
  };

  const handleManualReset = () => {
      setConfModal({
          isOpen: true,
          title: "Reset Bracket?",
          message: "This will clear the entire tournament bracket and remove all assigned players.",
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
             batch.update(ref, { player1: null, player2: null, winner: null, score1: 0, score2: 0 });
        });
        await batch.commit();
        showAlert("All participants cleared.", 'success');
      }
    });
  };

  const handleShuffleClick = () => {
    if (!canManage || approvedParticipants.length === 0) return;
    setIsShuffling(true);
    setTimeout(() => {
        const round1Matches = matches.filter(m => m.round === 1);
        
        // Find who is already assigned in Round 1
        const assignedUids = new Set<string>();
        round1Matches.forEach(m => {
            if (m.player1) assignedUids.add(m.player1.uid);
            if (m.player2) assignedUids.add(m.player2.uid);
        });

        // Filter approved participants to find those NOT in the bracket yet
        const availableParticipants = approvedParticipants.filter(p => !assignedUids.has(p.uid));
        
        // Shuffle the available ones
        const shuffled = [...availableParticipants].sort(() => 0.5 - Math.random());
        
        const batch = db.batch();
        let participantIndex = 0;
        
        round1Matches.forEach(match => {
            // Skip match if it has ANY participant assigned (manually locked)
            if (match.player1 || match.player2) {
                return;
            }

            let updates: any = {};
            let changed = false;

            // Fill slot 1 if empty
            if (!match.player1 && participantIndex < shuffled.length) {
                updates.player1 = shuffled[participantIndex++];
                changed = true;
            }
            
            // Fill slot 2 if empty
            if (!match.player2 && participantIndex < shuffled.length) {
                updates.player2 = shuffled[participantIndex++];
                changed = true;
            }

            if (changed) {
                // Reset match state for the newly filled match
                updates.winner = null;
                updates.score1 = 0;
                updates.score2 = 0;
                batch.update(db.collection("arena_matches").doc(match.id), updates);
            }
        });
        
        batch.commit().then(() => { 
            setTimeout(() => setIsShuffling(false), 500); 
        }).catch(err => {
            console.error(err);
            setIsShuffling(false);
        });
    }, 600); 
  };

  const handleJoinClick = () => {
      if (!currentUser) { showAlert("Please sign in first.", 'error'); return; }
      if (!userProfile) { showAlert("Please create a profile first.", 'error'); navigate('/register'); return; }
      setIsJoinModalOpen(true);
  };

  const handleJoinSubmit = async (points: number) => {
    if (!userProfile) return;
    if (userProfile.guildId !== selectedId) { showAlert("You can only join the Arena for your own Guild Branch.", 'error'); return; }
    try {
      await db.collection("arena_participants").doc(userProfile.uid).set({
        uid: userProfile.uid, 
        displayName: userProfile.displayName, 
        photoURL: userProfile.photoURL || null,
        guildId: selectedId,
        activityPoints: points, 
        status: 'pending', 
        role: userProfile.role || 'DPS',
        originalGuildId: userProfile.guildId
      });
      setIsJoinModalOpen(false); showAlert("Entry submitted!", 'success');
    } catch (err: any) { showAlert(`Error: ${err.message}`, 'error'); }
  };

  const handleCreateTournament = async (title: string, importedParticipants: ArenaParticipant[], hasGrandFinale: boolean, hideRankings: boolean) => {
      try {
          const tourneyRef = await db.collection("custom_tournaments").add({
              title, createdAt: new Date().toISOString(), createdBy: userProfile?.uid || 'Admin', hasGrandFinale, hideRankings, bestOf: 3 // Default
          });
          const batch = db.batch();
          importedParticipants.forEach(p => {
              const pRef = db.collection("arena_participants").doc(); 
              batch.set(pRef, { ...p, guildId: tourneyRef.id, status: 'approved' });
          });
          await batch.commit();
          setSelectedId(tourneyRef.id); showAlert("Custom Tournament Created!", 'success');
      } catch (err: any) { showAlert(`Error: ${err.message}`, 'error'); }
  };

  const handleDeleteTournament = async () => {
      if (!isCustomMode || !selectedId) return;
      setConfModal({
          isOpen: true, title: "Delete Tournament?", message: `Are you sure you want to delete "${selectedTournament?.title}"?`,
          action: async () => {
              try {
                  const batch = db.batch();
                  batch.delete(db.collection("custom_tournaments").doc(selectedId));
                  const parts = await db.collection("arena_participants").where("guildId", "==", selectedId).get();
                  parts.forEach(doc => batch.delete(doc.ref));
                  const matchSnaps = await db.collection("arena_matches").where("guildId", "==", selectedId).get();
                  matchSnaps.forEach(doc => batch.delete(doc.ref));
                  await batch.commit();
                  showAlert("Tournament Deleted.", 'success');
                  if (guilds.length > 0) setSelectedId(guilds[0].id); else setSelectedId('');
              } catch (err: any) { showAlert(`Delete failed: ${err.message}`, 'error'); }
          }
      });
  };

  const handleSaveMinPoints = async (min: number) => {
      try { await db.collection("guilds").doc(selectedId).update({ arenaMinPoints: min }); showAlert("Updated.", 'success'); } catch (err: any) { showAlert(err.message, 'error'); }
  };
  
  const handleLeaveArena = async () => {
    if (!currentUser) return;
    try {
        const batch = db.batch();
        batch.delete(db.collection("arena_participants").doc(currentUser.uid));
        const activeMatches = matches.filter(m => m.player1?.uid === currentUser.uid || m.player2?.uid === currentUser.uid || m.winner?.uid === currentUser.uid);
        activeMatches.forEach(m => {
            const updates: any = {};
            if (m.player1?.uid === currentUser.uid) { updates.player1 = null; updates.score1 = 0; }
            if (m.player2?.uid === currentUser.uid) { updates.player2 = null; updates.score2 = 0; }
            if (m.winner?.uid === currentUser.uid) updates.winner = null;
            batch.update(db.collection("arena_matches").doc(m.id), updates);
        });
        await batch.commit(); showAlert("You have left the arena.", 'info');
    } catch (err: any) { showAlert(`Error leaving: ${err.message}`, 'error'); }
  };

  const handleRemoveParticipant = async (uid: string, name: string) => {
      setConfModal({
          isOpen: true, title: `Remove ${name}?`, message: "This will remove the user from the participants list.",
          action: async () => {
              const batch = db.batch();
              const pQuery = await db.collection("arena_participants").where("guildId", "==", selectedId).where("uid", "==", uid).get();
              pQuery.forEach(doc => batch.delete(doc.ref));
              const activeMatches = matches.filter(m => m.player1?.uid === uid || m.player2?.uid === uid || m.winner?.uid === uid);
              activeMatches.forEach(m => {
                const updates: any = {};
                if (m.player1?.uid === uid) { updates.player1 = null; updates.score1 = 0; }
                if (m.player2?.uid === uid) { updates.player2 = null; updates.score2 = 0; }
                if (m.winner?.uid === uid) updates.winner = null;
                batch.update(db.collection("arena_matches").doc(m.id), updates);
              });
              await batch.commit(); showAlert(`${name} removed.`, 'success');
          }
      });
  };
  
  const handleRemoveChampion = async () => {
     await db.collection("guilds").doc(selectedId).update({ lastArenaChampion: firebase.firestore.FieldValue.delete(), lastArenaWinners: firebase.firestore.FieldValue.delete() });
  };

  const handleApprove = async (uid: string) => db.collection("arena_participants").doc(uid).update({ status: 'approved' });
  const handleDeny = async (uid: string) => db.collection("arena_participants").doc(uid).update({ status: 'denied' });
  const handleUpdatePoints = async (uid: string, newPoints: number) => db.collection("arena_participants").doc(uid).update({ activityPoints: newPoints });

  const handleManualAddParticipant = async (user: UserProfile) => {
      if (participants.some(p => p.uid === user.uid)) { showAlert("User is already in the participant list.", 'info'); return; }
      try {
          const docRef = isCustomMode ? db.collection("arena_participants").doc() : db.collection("arena_participants").doc(user.uid);
          await docRef.set({ 
              uid: user.uid, 
              displayName: user.displayName, 
              photoURL: user.photoURL || null, 
              guildId: selectedId, 
              originalGuildId: user.guildId || null, 
              activityPoints: 0, 
              status: 'approved', 
              role: user.role || 'DPS' 
          });
          setIsAddParticipantModalOpen(false); showAlert("Participant added.", 'success');
      } catch (err: any) { showAlert(`Error: ${err.message}`, 'error'); }
  };

  const handleViewProfile = async (uid: string) => {
      // Find user from context first to save read
      const cachedUser = allUsers.find(u => u.uid === uid);
      if (cachedUser) {
          setViewingProfile(cachedUser);
      } else {
          // Fallback fetch
          const doc = await db.collection("users").doc(uid).get();
          if (doc.exists) setViewingProfile(doc.data() as UserProfile);
      }
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
                batch.update(thirdRef, { [slot]: loser, [slot === 'player1' ? 'score1' : 'score2']: 0 });
            }
        }
        const nextPosition = Math.floor(match.position / 2);
        const nextSlot = match.position % 2 === 0 ? 'player1' : 'player2';
        const nextMatchQuery = await db.collection("arena_matches").where("guildId", "==", selectedId).where("round", "==", nextRound).where("position", "==", nextPosition).get();
        let isChampion = false;
        if (!nextMatchQuery.empty) {
            const nextMatchDoc = nextMatchQuery.docs[0];
            batch.update(nextMatchDoc.ref, { [nextSlot]: winner, winner: null, [nextSlot === 'player1' ? 'score1' : 'score2']: 0 });
        } else if (match.round === maxRoundNum) { isChampion = true; }
        await batch.commit();
        if (!isCustomMode && (isChampion || match.isThirdPlace)) { setTimeout(() => saveGuildWinners(), 500); }
    } catch (err: any) { showAlert(`Error updating bracket: ${err.message}`, 'error'); }
  };

  const handleScoreUpdate = async (match: ArenaMatch, slot: 'player1' | 'player2', increment: boolean) => {
      if (!canManage) return;
      
      const currentScore = slot === 'player1' ? (match.score1 || 0) : (match.score2 || 0);
      let newScore = currentScore + (increment ? 1 : -1);
      
      const winningScore = bestOf === 3 ? 3 : Math.ceil(bestOf / 2);

      if (newScore < 0) newScore = 0;
      if (newScore > winningScore) newScore = winningScore;
      
      if (newScore === currentScore) return;

      const updateData: any = {
          [slot === 'player1' ? 'score1' : 'score2']: newScore
      };

      if (newScore === winningScore) {
           const winner = slot === 'player1' ? match.player1 : match.player2;
           if(winner && match.winner?.uid !== winner.uid) {
                await db.collection("arena_matches").doc(match.id).update(updateData);
                handleDeclareWinner(match, winner);
                return;
           }
      } else if (match.winner && newScore < winningScore) {
          const currentWinnerUid = match.winner.uid;
          const playerUid = slot === 'player1' ? match.player1?.uid : match.player2?.uid;
          if (currentWinnerUid === playerUid) {
              updateData.winner = null;
          }
      }

      await db.collection("arena_matches").doc(match.id).update(updateData);
  };

  const handleClearSlot = async (e: React.MouseEvent, matchId: string, slot: 'player1' | 'player2') => {
      e.stopPropagation();
      if (!canManage) return;
      await db.collection("arena_matches").doc(matchId).update({ [slot]: null, winner: null, [slot === 'player1' ? 'score1' : 'score2']: 0 });
  };

  const handleDrop = async (e: React.DragEvent, match: ArenaMatch, slot: 'player1' | 'player2') => {
    if (!canManage) return;
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    const droppedUser: ArenaParticipant = JSON.parse(data);
    await db.collection("arena_matches").doc(match.id).update({ [slot]: droppedUser, winner: null, [slot === 'player1' ? 'score1' : 'score2']: 0 });
  };

  const handleOpenStreamScreen = () => {
      if (!selectedId) return;
      window.open(`/#/vs-screen?contextId=${selectedId}`, 'VsScreen', 'width=1920,height=1080');
  };

  const handlePreviewMatch = async (match: ArenaMatch) => {
      const collection = isCustomMode ? "custom_tournaments" : "guilds";
      try { 
          const newValue = activeStreamMatchId === match.id ? null : match.id;
          await db.collection(collection).doc(selectedId).update({ activeStreamMatchId: newValue }); 
      } catch (e: any) { showAlert(e.message, "error"); }
  };

  const handlePreviewBanner = async (match: ArenaMatch) => {
      const collection = isCustomMode ? "custom_tournaments" : "guilds";
      try { 
          const newValue = activeBannerMatchId === match.id ? null : match.id;
          await db.collection(collection).doc(selectedId).update({ activeBannerMatchId: newValue }); 
      } catch (e: any) { showAlert(e.message, "error"); }
  };

  const handleOpenBannerScreen = () => window.open(`/#/match-banner?contextId=${selectedId}`, 'MatchBanner', 'width=1200,height=300');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className={`p-4 w-full flex flex-col relative overflow-hidden transition-all duration-300 ${userActiveMatch ? 'h-[calc(100vh-144px)] md:h-[calc(100vh-176px)]' : 'h-[calc(100vh-64px)]'}`}>
        
        <ArenaHeader 
          guilds={guilds} 
          customTournaments={customTournaments} 
          selectedId={selectedId} 
          onSelectId={setSelectedId} 
          userProfile={userProfile} 
          canManage={canManage} 
          isAdmin={isAdmin}
          isCustomMode={isCustomMode} 
          canDeleteCustom={canDeleteCustom}
          selectedTournament={selectedTournament}
          onDeleteTournament={handleDeleteTournament}
          onOpenCreateModal={() => setIsCreateTourneyModalOpen(true)}
          onOpenStream={handleOpenStreamScreen}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenInit={() => setIsInitModalOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenBanner={handleOpenBannerScreen}
        />

        <ArenaChampions 
          firstPlace={firstPlace} 
          secondPlace={secondPlace} 
          thirdPlace={thirdPlace} 
          fourthPlace={fourthPlace}
          canManage={canManage}
          showStandardBanner={showStandardBanner}
          showOverlayBanner={!!showOverlayBanner}
          userActiveMatch={userActiveMatch}
          currentUser={currentUser}
          isChampionBannerVisible={isChampionBannerVisible}
          onRemoveChampion={handleRemoveChampion}
          onViewProfile={(uid) => handleViewProfile(uid)}
          onCloseBanner={() => setIsChampionBannerVisible(false)}
          allUsers={allUsers}
          guilds={guilds}
        />

        <div className="flex flex-col lg:flex-row flex-1 gap-6 overflow-hidden min-h-0 relative">
          <ArenaSidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)}
            approvedParticipants={approvedParticipants}
            pendingParticipants={pendingParticipants}
            currentUserParticipant={currentUserParticipant}
            currentUser={currentUser}
            userProfile={userProfile}
            canManage={canManage}
            isAdmin={isAdmin}
            isCustomMode={isCustomMode}
            guilds={guilds}
            isShuffling={isShuffling}
            assignedParticipantUids={assignedParticipantUids}
            onRemoveParticipant={handleRemoveParticipant}
            onApprove={handleApprove}
            onDeny={handleDeny}
            onEditPoints={(p) => setEditingPointsParticipant(p)}
            onManualAdd={() => setIsAddParticipantModalOpen(true)}
            onShuffle={handleShuffleClick}
            onReset={handleManualReset}
            onClearAll={handleClearAllParticipants}
            onJoin={handleJoinClick}
            onLeave={handleLeaveArena}
          />

          <ArenaBracket 
            matches={matches} 
            canManage={canManage}
            isAdmin={isAdmin} 
            arenaMinPoints={arenaMinPoints} 
            isCustomMode={isCustomMode} 
            activeStreamMatchId={activeStreamMatchId}
            activeBannerMatchId={activeBannerMatchId}
            bestOf={bestOf}
            onDeclareWinner={handleDeclareWinner}
            onClearSlot={handleClearSlot as any}
            onDrop={handleDrop as any}
            onViewProfile={handleViewProfile}
            onPreviewMatch={handlePreviewMatch}
            onPreviewBanner={handlePreviewBanner}
            onScoreUpdate={handleScoreUpdate}
          />
        </div>
      </div>

      <BaseModal isOpen={isAddParticipantModalOpen} onClose={() => setIsAddParticipantModalOpen(false)} className="max-w-md overflow-visible">
          <div className="p-6">
              <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Add Participant</h3>
              <p className="text-sm text-zinc-500 mb-4">Search for a user to manually add to the participant list.</p>
              <SearchableUserSelect 
                  users={allUsers.filter(u => {
                      const isAlreadyIn = participants.some(p => p.uid === u.uid);
                      const isVisible = isAdmin || isCustomMode || u.guildId === selectedId;
                      return !isAlreadyIn && isVisible;
                  })}
                  selectedUid=""
                  onSelect={handleManualAddParticipant}
                  placeholder="Search user..."
              />
          </div>
      </BaseModal>

      <ConfirmationModal isOpen={confModal.isOpen} onClose={() => setConfModal({ ...confModal, isOpen: false })} onConfirm={confModal.action} title={confModal.title} message={confModal.message} />
      <JoinArenaModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} onSubmit={handleJoinSubmit} minPoints={arenaMinPoints} />
      <InitializeBracketModal isOpen={isInitModalOpen} onClose={() => setIsInitModalOpen(false)} onConfirm={handleInitializeBracket} participants={approvedParticipants} />
      <EditPointsModal isOpen={!!editingPointsParticipant} onClose={() => setEditingPointsParticipant(null)} participant={editingPointsParticipant} onConfirm={handleUpdatePoints} />
      <ArenaSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} currentMin={arenaMinPoints} onSave={handleSaveMinPoints} />
      <CreateTournamentModal isOpen={isCreateTourneyModalOpen} onClose={() => setIsCreateTourneyModalOpen(false)} guilds={guilds} onConfirm={handleCreateTournament} />
      <UserProfileModal user={viewingProfile} onClose={() => setViewingProfile(null)} guilds={guilds} />
    </div>
  );
};

export default Arena;
