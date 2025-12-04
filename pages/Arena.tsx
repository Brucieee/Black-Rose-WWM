import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Guild, ArenaParticipant, ArenaMatch, UserProfile, CustomTournament } from '../types';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import firebase from 'firebase/compat/app';

// Modals
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { JoinArenaModal } from '../components/modals/JoinArenaModal';
import { InitializeBracketModal } from '../components/modals/InitializeBracketModal';
import { EditPointsModal } from '../components/modals/EditPointsModal';
import { ArenaSettingsModal } from '../components/modals/ArenaSettingsModal';
import { CreateTournamentModal } from '../components/modals/CreateTournamentModal';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { BaseModal } from '../components/modals/BaseModal';
import { SearchableUserSelect } from '../components/SearchableUserSelect';

// New Modular Components
import { ArenaHeader } from '../components/arena/ArenaHeader';
import { ArenaSidebar } from '../components/arena/ArenaSidebar';
import { ArenaBracket } from '../components/arena/ArenaBracket';
import { ArenaChampions } from '../components/arena/ArenaChampions';

const { useNavigate } = ReactRouterDOM as any;

const Arena: React.FC = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  
  // Data State
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [customTournaments, setCustomTournaments] = useState<CustomTournament[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  // ID can be a Guild ID OR a Tournament ID
  const [selectedId, setSelectedId] = useState<string>(''); 
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [participants, setParticipants] = useState<ArenaParticipant[]>([]);
  const [matches, setMatches] = useState<ArenaMatch[]>([]);
  
  // UI State
  const [isShuffling, setIsShuffling] = useState(false);
  const [isChampionBannerVisible, setIsChampionBannerVisible] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modals
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCreateTourneyModalOpen, setIsCreateTourneyModalOpen] = useState(false);
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [editingPointsParticipant, setEditingPointsParticipant] = useState<ArenaParticipant | null>(null);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [confModal, setConfModal] = useState<{ isOpen: boolean; title: string; message: string; action: () => Promise<void>; }>({ isOpen: false, title: '', message: '', action: async () => {} });

  // Derived Values
  const selectedGuild = guilds.find(g => g.id === selectedId);
  const selectedTournament = customTournaments.find(t => t.id === selectedId);
  const isCustomMode = !!selectedTournament;
  const canManage = userProfile?.systemRole === 'Admin' || (userProfile?.systemRole === 'Officer' && userProfile.guildId === selectedId && !isCustomMode);
  const canDeleteCustom = userProfile?.systemRole === 'Admin';
  const currentUserParticipant = currentUser ? participants.find(p => p.uid === currentUser.uid) : undefined;
  
  const approvedParticipants = participants.filter(p => p.status === 'approved');
  const pendingParticipants = participants.filter(p => p.status === 'pending');
  const arenaMinPoints = selectedGuild?.arenaMinPoints || 0;
  const arenaWinners = selectedGuild?.lastArenaWinners || (selectedGuild?.lastArenaChampion ? [{...selectedGuild.lastArenaChampion, rank: 1}] : []);

  // Determine Active Matches
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
  const isTournamentDone = !!liveFirst;
  const firstPlace = arenaWinners.find(w => w.rank === 1) || (isTournamentDone ? liveFirst : null);
  const secondPlace = arenaWinners.find(w => w.rank === 2) || (isTournamentDone ? liveSecond : null);
  const thirdPlace = arenaWinners.find(w => w.rank === 3) || (isTournamentDone ? liveThird : null);
  const hasWinners = !!firstPlace;
  const showStandardBanner = hasWinners && (!isCustomMode || (isCustomMode && !selectedTournament?.hasGrandFinale && !selectedTournament?.hideRankings));
  const showOverlayBanner = hasWinners && isCustomMode && selectedTournament?.hasGrandFinale && isChampionBannerVisible;

  // Effects
  useEffect(() => { setIsChampionBannerVisible(true); }, [selectedId, matches]);

  useEffect(() => {
    const unsubGuilds = db.collection("guilds").orderBy("name").onSnapshot(snap => {
      const g = snap.docs.map(d => ({ id: d.id, ...d.data() } as Guild));
      setGuilds(g);
      if (g.length > 0 && !selectedId) setSelectedId(g[0].id);
    });
    const unsubTourneys = db.collection("custom_tournaments").orderBy("createdAt", "desc").onSnapshot(snap => {
        setCustomTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomTournament)));
    });
    const unsubAllUsers = db.collection("users").onSnapshot(snap => {
        setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    });
    let unsubUser = () => {};
    if (currentUser) {
      unsubUser = db.collection("users").doc(currentUser.uid).onSnapshot(snap => {
        if (snap.exists) setUserProfile(snap.data() as UserProfile);
      });
    }
    return () => { unsubGuilds(); unsubUser(); unsubTourneys(); unsubAllUsers(); };
  }, [currentUser, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const unsubParticipants = db.collection("arena_participants").where("guildId", "==", selectedId).onSnapshot(snap => setParticipants(snap.docs.map(d => d.data() as ArenaParticipant)));
    const unsubMatches = db.collection("arena_matches").where("guildId", "==", selectedId).onSnapshot(snap => {
        const d = snap.docs.map(doc => ({id: doc.id, ...doc.data()} as ArenaMatch));
        d.sort((a, b) => { if (a.round !== b.round) return a.round - b.round; return a.position - b.position; });
        setMatches(d);
    });
    return () => { unsubParticipants(); unsubMatches(); };
  }, [selectedId]);

  // Actions
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
      const winners = [{ rank: 1, uid: first.uid, displayName: first.displayName, photoURL: first.photoURL, wonAt: new Date().toISOString() }];
      if (second) winners.push({ rank: 2, uid: second.uid, displayName: second.displayName, photoURL: second.photoURL, wonAt: new Date().toISOString() });
      if (third) winners.push({ rank: 3, uid: third.uid, displayName: third.displayName, photoURL: third.photoURL, wonAt: new Date().toISOString() });
      await db.collection("guilds").doc(selectedId).update({ lastArenaWinners: winners, lastArenaChampion: winners[0] });
  };

  const handleInitializeBracket = async (config: { mode: 'standard' | 'custom', size?: number, customMatches?: any[] }) => {
    const batch = db.batch();
    try {
      const existingMatchesQuery = await db.collection("arena_matches").where("guildId", "==", selectedId).get();
      existingMatchesQuery.forEach(doc => batch.delete(doc.ref));

      if (config.mode === 'standard' && config.size) {
          let round = 1;
          let matchCount = config.size / 2;
          while (matchCount >= 1) {
              for (let i = 0; i < matchCount; i++) {
                  const matchRef = db.collection("arena_matches").doc();
                  batch.set(matchRef, { guildId: selectedId, round: round, position: i, player1: null, player2: null, winner: null });
              }
              matchCount /= 2;
              round++;
          }
          if (config.size >= 4) {
              const thirdPlaceRef = db.collection("arena_matches").doc();
              batch.set(thirdPlaceRef, { guildId: selectedId, round: 99, position: 0, player1: null, player2: null, winner: null, isThirdPlace: true });
          }
      } else if (config.mode === 'custom' && config.customMatches) {
          config.customMatches.forEach((pair, idx) => {
              const matchRef = db.collection("arena_matches").doc();
              batch.set(matchRef, { guildId: selectedId, round: 1, position: idx, player1: pair.p1, player2: pair.p2, winner: null });
          });
      }
      await batch.commit();
      showAlert('Bracket initialized.', 'success');
    } catch (err: any) { showAlert(`Failed: ${err.message}`, 'error'); }
  };

  const handleManualReset = () => {
      setConfModal({ isOpen: true, title: "Reset Bracket?", message: "Cannot be undone.", action: async () => {
          const batch = db.batch(); matches.forEach(m => batch.delete(db.collection("arena_matches").doc(m.id))); await batch.commit(); showAlert("Cleared.", 'success');
      }});
  };
  
  const handleClearAllParticipants = async () => {
    setConfModal({ isOpen: true, title: "Clear All Participants?", message: "Cannot be undone.", action: async () => {
        const batch = db.batch(); const parts = await db.collection("arena_participants").where("guildId", "==", selectedId).get(); parts.forEach(doc => batch.delete(doc.ref)); matches.forEach(m => batch.update(db.collection("arena_matches").doc(m.id), { player1: null, player2: null, winner: null })); await batch.commit(); showAlert("Participants cleared.", 'success');
    }});
  };

  const handleShuffleClick = () => {
    if (!canManage || approvedParticipants.length === 0) return;
    setIsShuffling(true);
    setTimeout(() => {
        const round1Matches = matches.filter(m => m.round === 1);
        const shuffled = [...approvedParticipants].sort(() => 0.5 - Math.random());
        const batch = db.batch();
        matches.forEach(m => batch.update(db.collection("arena_matches").doc(m.id), { player1: null, player2: null, winner: null }));
        let participantIndex = 0;
        for (const match of round1Matches) {
            if (participantIndex >= shuffled.length) break;
            const player1 = shuffled[participantIndex++];
            const player2 = (participantIndex < shuffled.length) ? shuffled[participantIndex++] : null;
            batch.update(db.collection("arena_matches").doc(match.id), { player1, player2 });
        }
        batch.commit().then(() => setTimeout(() => setIsShuffling(false), 500));
    }, 600); 
  };

  const handleJoinClick = () => { if(!currentUser) return; setIsJoinModalOpen(true); };
  const handleJoinSubmit = async (points: number) => {
    if (!userProfile || userProfile.guildId !== selectedId) return;
    await db.collection("arena_participants").doc(userProfile.uid).set({ uid: userProfile.uid, displayName: userProfile.displayName, photoURL: userProfile.photoURL, guildId: selectedId, activityPoints: points, status: 'pending', role: userProfile.role, originalGuildId: userProfile.guildId });
    setIsJoinModalOpen(false); showAlert("Submitted", 'success');
  };

  const handleCreateTournament = async (title: string, p: ArenaParticipant[], gf: boolean) => {
      const ref = await db.collection("custom_tournaments").add({ title, createdAt: new Date().toISOString(), createdBy: userProfile?.uid, hasGrandFinale: gf });
      const batch = db.batch(); p.forEach(part => batch.set(db.collection("arena_participants").doc(), { ...part, guildId: ref.id, status: 'approved' }));
      await batch.commit(); setSelectedId(ref.id); showAlert("Created!", 'success');
  };

  const handleDeleteTournament = async () => {
      if (!isCustomMode) return;
      setConfModal({ isOpen: true, title: "Delete Tournament?", message: "Cannot be undone.", action: async () => {
          const batch = db.batch(); batch.delete(db.collection("custom_tournaments").doc(selectedId));
          const parts = await db.collection("arena_participants").where("guildId", "==", selectedId).get(); parts.forEach(doc => batch.delete(doc.ref));
          const ms = await db.collection("arena_matches").where("guildId", "==", selectedId).get(); ms.forEach(doc => batch.delete(doc.ref));
          await batch.commit(); showAlert("Deleted.", 'success'); setSelectedId(guilds[0]?.id || '');
      }});
  };

  const handleSaveMinPoints = async (min: number) => { await db.collection("guilds").doc(selectedId).update({ arenaMinPoints: min }); showAlert("Updated.", 'success'); };
  
  const handleLeaveArena = async () => {
    if (!currentUser) return;
    const batch = db.batch(); batch.delete(db.collection("arena_participants").doc(currentUser.uid));
    matches.filter(m => m.player1?.uid === currentUser.uid || m.player2?.uid === currentUser.uid).forEach(m => batch.update(db.collection("arena_matches").doc(m.id), { player1: m.player1?.uid === currentUser.uid ? null : m.player1, player2: m.player2?.uid === currentUser.uid ? null : m.player2 }));
    await batch.commit(); showAlert("Left arena.", 'info');
  };

  const handleRemoveParticipant = async (uid: string, name: string) => {
      setConfModal({ isOpen: true, title: `Remove ${name}?`, message: "Removes from list and bracket.", action: async () => {
          const batch = db.batch(); 
          const q = await db.collection("arena_participants").where("guildId", "==", selectedId).where("uid", "==", uid).get(); q.forEach(doc => batch.delete(doc.ref));
          matches.filter(m => m.player1?.uid === uid || m.player2?.uid === uid).forEach(m => batch.update(db.collection("arena_matches").doc(m.id), { player1: m.player1?.uid === uid ? null : m.player1, player2: m.player2?.uid === uid ? null : m.player2 }));
          await batch.commit(); showAlert("Removed.", 'success');
      }});
  };
  
  const handleRemoveChampion = async () => { await db.collection("guilds").doc(selectedId).update({ lastArenaChampion: firebase.firestore.FieldValue.delete(), lastArenaWinners: firebase.firestore.FieldValue.delete() }); };
  const handleApprove = async (uid: string) => db.collection("arena_participants").doc(uid).update({ status: 'approved' });
  const handleDeny = async (uid: string) => db.collection("arena_participants").doc(uid).update({ status: 'denied' });
  const handleUpdatePoints = async (uid: string, p: number) => db.collection("arena_participants").doc(uid).update({ activityPoints: p });
  const handleManualAddParticipant = async (user: UserProfile) => {
      if (participants.some(p => p.uid === user.uid)) return;
      const ref = isCustomMode ? db.collection("arena_participants").doc() : db.collection("arena_participants").doc(user.uid);
      await ref.set({ uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, guildId: selectedId, originalGuildId: user.guildId, activityPoints: 0, status: 'approved', role: user.role });
      setIsAddParticipantModalOpen(false); showAlert("Added.", 'success');
  };
  const handleViewProfile = async (uid: string) => { const doc = await db.collection("users").doc(uid).get(); if (doc.exists) setViewingProfile(doc.data() as UserProfile); };
  
  const handleDeclareWinner = async (match: ArenaMatch, winner: ArenaParticipant) => {
    if (!canManage) return;
    const batch = db.batch(); batch.update(db.collection("arena_matches").doc(match.id), { winner });
    // Advance logic
    const nextRound = match.round + 1;
    const isSemiFinal = match.round === (matches.filter(m=>!m.isThirdPlace).reduce((max, m)=>Math.max(max,m.round),0) - 1);
    if (isSemiFinal) {
        const loser = match.player1?.uid === winner.uid ? match.player2 : match.player1;
        const thirdPlaceMatch = matches.find(m => m.isThirdPlace);
        if (thirdPlaceMatch && loser) {
            const slot = match.position % 2 === 0 ? 'player1' : 'player2';
            batch.update(db.collection("arena_matches").doc(thirdPlaceMatch.id), { [slot]: loser });
        }
    }
    const nextPosition = Math.floor(match.position / 2);
    const nextSlot = match.position % 2 === 0 ? 'player1' : 'player2';
    const nextMatchQuery = await db.collection("arena_matches").where("guildId", "==", selectedId).where("round", "==", nextRound).where("position", "==", nextPosition).get();
    let isChampion = false;
    if (!nextMatchQuery.empty) batch.update(nextMatchQuery.docs[0].ref, { [nextSlot]: winner, winner: null });
    else if (match.round === (matches.filter(m=>!m.isThirdPlace).reduce((max, m)=>Math.max(max,m.round),0))) isChampion = true;
    await batch.commit();
    if (!isCustomMode && (isChampion || match.isThirdPlace)) setTimeout(() => saveGuildWinners(), 500);
  };

  const handleClearSlot = async (e: React.MouseEvent, mid: string, slot: string) => { e.stopPropagation(); await db.collection("arena_matches").doc(mid).update({ [slot]: null, winner: null }); };
  const handleDrop = async (e: React.DragEvent, match: ArenaMatch, slot: string) => { if (!canManage) return; e.preventDefault(); const data = e.dataTransfer.getData("application/json"); if (!data) return; const droppedUser = JSON.parse(data); await db.collection("arena_matches").doc(match.id).update({ [slot]: droppedUser, winner: null }); };
  const handleOpenStreamScreen = () => window.open(`/#/vs-screen?contextId=${selectedId}`, 'VsScreen', 'width=1920,height=1080');
  
  // Handler for Remote Stream Control
  const handlePreviewMatch = async (match: ArenaMatch) => {
      const collection = isCustomMode ? "custom_tournaments" : "guilds";
      try {
          await db.collection(collection).doc(selectedId).update({
              activeStreamMatchId: match.id
          });
          showAlert("Stream updated to this match.", "success");
      } catch (e: any) {
          showAlert(e.message, "error");
      }
  };

  // Handler for Remote Banner Control
  const handlePreviewBanner = async (match: ArenaMatch) => {
      const collection = isCustomMode ? "custom_tournaments" : "guilds";
      try {
          await db.collection(collection).doc(selectedId).update({
              activeBannerMatchId: match.id
          });
          showAlert("Match Banner updated.", "success");
      } catch (e: any) {
          showAlert(e.message, "error");
      }
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
            arenaMinPoints={arenaMinPoints} 
            isCustomMode={isCustomMode} 
            activeStreamMatchId={activeStreamMatchId}
            activeBannerMatchId={activeBannerMatchId}
            onDeclareWinner={handleDeclareWinner}
            onClearSlot={handleClearSlot as any}
            onDrop={handleDrop as any}
            onViewProfile={handleViewProfile}
            onPreviewMatch={handlePreviewMatch}
            onPreviewBanner={handlePreviewBanner}
          />
        </div>
      </div>

      {/* Modals */}
      <BaseModal isOpen={isAddParticipantModalOpen} onClose={() => setIsAddParticipantModalOpen(false)} className="max-w-md overflow-visible">
          <div className="p-6">
              <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Add Participant</h3>
              <p className="text-sm text-zinc-500 mb-4">Search for a user to manually add to the participant list.</p>
              <SearchableUserSelect 
                  users={allUsers.filter(u => {
                      const isAlreadyIn = participants.some(p => p.uid === u.uid);
                      const isSameBranch = userProfile?.systemRole === 'Admin' || u.guildId === selectedId;
                      return !isAlreadyIn && isSameBranch;
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