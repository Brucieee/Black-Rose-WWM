
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { ArenaParticipant } from '../../types';
import { Users, Swords, Trophy, Shuffle, X, ArrowRight, Skull } from 'lucide-react';
import { db } from '../../services/firebase';
import { ConfirmationModal } from './ConfirmationModal';

interface TeamSkirmishModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: ArenaParticipant[];
  onConfirm: () => void; // Triggered after a successful resolution
}

export const TeamSkirmishModal: React.FC<TeamSkirmishModalProps> = ({ isOpen, onClose, participants, onConfirm }) => {
  const [teamSize, setTeamSize] = useState(5); // Default 5v5
  const [teamBlue, setTeamBlue] = useState<ArenaParticipant[]>([]);
  const [teamRed, setTeamRed] = useState<ArenaParticipant[]>([]);
  const [search, setSearch] = useState('');
  
  const [resolveConf, setResolveConf] = useState<{
    isOpen: boolean;
    winningTeam: 'Blue' | 'Red';
  }>({ isOpen: false, winningTeam: 'Blue' });

  // Filter out players already in teams
  const availableParticipants = participants
    .filter(p => !teamBlue.find(t => t.uid === p.uid) && !teamRed.find(t => t.uid === p.uid))
    .filter(p => p.status === 'approved')
    .filter(p => p.displayName.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (isOpen) {
      setTeamBlue([]);
      setTeamRed([]);
      setTeamSize(5);
      setSearch('');
    }
  }, [isOpen]);

  const addToTeam = (p: ArenaParticipant) => {
    if (teamBlue.length < teamSize) {
      setTeamBlue([...teamBlue, p]);
    } else if (teamRed.length < teamSize) {
      setTeamRed([...teamRed, p]);
    }
  };

  const removeFromTeam = (p: ArenaParticipant, team: 'Blue' | 'Red') => {
    if (team === 'Blue') {
      setTeamBlue(teamBlue.filter(x => x.uid !== p.uid));
    } else {
      setTeamRed(teamRed.filter(x => x.uid !== p.uid));
    }
  };

  const handleAutoFill = () => {
    const neededBlue = teamSize - teamBlue.length;
    const neededRed = teamSize - teamRed.length;
    
    // Shuffle available
    const shuffled = [...availableParticipants].sort(() => 0.5 - Math.random());
    
    const newBlue = [...teamBlue];
    const newRed = [...teamRed];
    
    let index = 0;
    
    // Fill Blue
    for (let i = 0; i < neededBlue; i++) {
      if (index < shuffled.length) newBlue.push(shuffled[index++]);
    }
    
    // Fill Red
    for (let i = 0; i < neededRed; i++) {
      if (index < shuffled.length) newRed.push(shuffled[index++]);
    }
    
    setTeamBlue(newBlue);
    setTeamRed(newRed);
  };

  const handleResolve = async () => {
    const winningTeam = resolveConf.winningTeam;
    const losers = winningTeam === 'Blue' ? teamRed : teamBlue;
    const winners = winningTeam === 'Blue' ? teamBlue : teamRed;

    if (losers.length === 0) return;

    try {
      const batch = db.batch();
      
      // Delete losers from participants collection
      losers.forEach(p => {
        // Find doc logic (assuming we are in context of current arena)
        // Note: participants passed here should have the correct doc reference implicitly via uid if custom
        // or we need to query. But standard implementation uses uid as doc id for guild arena.
        // For custom tourney, uid might not be doc id.
        
        // Safe Delete: Query by uid and guildId (from the participant object)
        const ref = db.collection("arena_participants").doc(p.uid);
        // BUT wait, for custom tourneys, multiple docs might have same user UID but diff guildId.
        // The modal is context-aware via 'participants' prop, but we need to delete the specific doc.
        // Let's assume the calling component passes valid objects.
        // For safer deletion in a generic context:
        // We will try to delete by known doc ID if available, else query.
        // However, Arena.tsx sets doc ID = UID for guild arena, and generated ID for custom.
        // We need to find the document.
        
        // Simplification: We will run a query delete to be safe.
        // We can't batch query deletes easily without reading first.
        // Let's just delete the match slots first.
      });

      // Execute sequentially for safety
      await Promise.all(losers.map(async (p) => {
         const q = await db.collection("arena_participants")
            .where("uid", "==", p.uid)
            .where("guildId", "==", p.guildId)
            .get();
         q.forEach(doc => doc.ref.delete());
      }));

      // Also clear any active bracket slots they might be in (cleanup)
      const guildId = losers[0].guildId;
      const loserUids = losers.map(l => l.uid);
      
      const matchSnap = await db.collection("arena_matches").where("guildId", "==", guildId).get();
      matchSnap.forEach(doc => {
          const match = doc.data();
          let update = {};
          if (match.player1 && loserUids.includes(match.player1.uid)) update = { ...update, player1: null };
          if (match.player2 && loserUids.includes(match.player2.uid)) update = { ...update, player2: null };
          if (Object.keys(update).length > 0) {
              doc.ref.update(update);
          }
      });

      onConfirm(); // Callback to refresh or alert
      onClose();
      setResolveConf({ ...resolveConf, isOpen: false });
      
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-5xl h-[80vh] flex flex-col" allowOverflow={true}>
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-500">
                <Swords size={24} />
            </div>
            <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Team Skirmish / Cull</h3>
                <p className="text-sm text-zinc-500">Eliminate the losing team from the tournament pool.</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <label className="text-xs font-bold text-zinc-500 uppercase px-2">Team Size</label>
                <select 
                    value={teamSize} 
                    onChange={e => setTeamSize(parseInt(e.target.value))}
                    className="bg-transparent font-bold text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer"
                >
                    {Array.from({length: 10}, (_, i) => i + 1).map(n => (
                        <option key={n} value={n} className="bg-white dark:bg-zinc-800">{n} v {n}</option>
                    ))}
                </select>
            </div>
            <button 
                onClick={handleAutoFill}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-lg text-xs font-bold transition-colors text-zinc-700 dark:text-zinc-300"
            >
                <Shuffle size={14} /> Auto-Fill
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Reserves Column */}
          <div className="w-full md:w-1/4 border-r border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Reserves ({availableParticipants.length})</h4>
                  <input 
                    placeholder="Search..." 
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {availableParticipants.map(p => (
                      <button 
                        key={p.uid}
                        onClick={() => addToTeam(p)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                      >
                          <img src={p.photoURL || 'https://via.placeholder.com/30'} className="w-6 h-6 rounded-full" />
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate flex-1">{p.displayName}</span>
                          <ArrowRight size={14} className="text-zinc-400 opacity-0 group-hover:opacity-100" />
                      </button>
                  ))}
              </div>
          </div>

          {/* Match Area */}
          <div className="flex-1 flex flex-col bg-zinc-100 dark:bg-zinc-950/50 p-4 overflow-y-auto relative">
              
              <div className="flex flex-col md:flex-row gap-4 h-full">
                  {/* Team Blue */}
                  <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border-2 border-blue-200 dark:border-blue-900/50 flex flex-col shadow-lg overflow-hidden">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
                          <h4 className="font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">Team Blue</h4>
                          <span className="text-xs font-bold bg-white dark:bg-zinc-900 px-2 py-1 rounded text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                              {teamBlue.length} / {teamSize}
                          </span>
                      </div>
                      <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                          {teamBlue.map(p => (
                              <div key={p.uid} className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                                  <div className="flex items-center gap-2">
                                      <img src={p.photoURL || 'https://via.placeholder.com/30'} className="w-8 h-8 rounded-full border border-blue-200" />
                                      <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{p.displayName}</span>
                                  </div>
                                  <button onClick={() => removeFromTeam(p, 'Blue')} className="text-zinc-400 hover:text-red-500 p-1"><X size={14} /></button>
                              </div>
                          ))}
                          {Array.from({length: Math.max(0, teamSize - teamBlue.length)}).map((_, i) => (
                              <div key={i} className="h-12 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-700 text-xs font-bold uppercase">
                                  Empty Slot
                              </div>
                          ))}
                      </div>
                      <div className="p-3 border-t border-zinc-100 dark:border-zinc-800">
                          <button 
                            onClick={() => setResolveConf({ isOpen: true, winningTeam: 'Blue' })}
                            disabled={teamBlue.length === 0 || teamRed.length === 0}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                              <Trophy size={18} /> Blue Victory
                          </button>
                      </div>
                  </div>

                  {/* VS Divider */}
                  <div className="flex items-center justify-center md:flex-col">
                      <div className="font-black text-4xl text-zinc-300 dark:text-zinc-700 italic">VS</div>
                  </div>

                  {/* Team Red */}
                  <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border-2 border-red-200 dark:border-red-900/50 flex flex-col shadow-lg overflow-hidden">
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center">
                          <h4 className="font-black text-red-700 dark:text-red-400 uppercase tracking-wider">Team Red</h4>
                          <span className="text-xs font-bold bg-white dark:bg-zinc-900 px-2 py-1 rounded text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                              {teamRed.length} / {teamSize}
                          </span>
                      </div>
                      <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                          {teamRed.map(p => (
                              <div key={p.uid} className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                                  <div className="flex items-center gap-2">
                                      <img src={p.photoURL || 'https://via.placeholder.com/30'} className="w-8 h-8 rounded-full border border-red-200" />
                                      <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{p.displayName}</span>
                                  </div>
                                  <button onClick={() => removeFromTeam(p, 'Red')} className="text-zinc-400 hover:text-red-500 p-1"><X size={14} /></button>
                              </div>
                          ))}
                          {Array.from({length: Math.max(0, teamSize - teamRed.length)}).map((_, i) => (
                              <div key={i} className="h-12 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-700 text-xs font-bold uppercase">
                                  Empty Slot
                              </div>
                          ))}
                      </div>
                      <div className="p-3 border-t border-zinc-100 dark:border-zinc-800">
                          <button 
                            onClick={() => setResolveConf({ isOpen: true, winningTeam: 'Red' })}
                            disabled={teamBlue.length === 0 || teamRed.length === 0}
                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                              <Trophy size={18} /> Red Victory
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <ConfirmationModal 
        isOpen={resolveConf.isOpen}
        onClose={() => setResolveConf({ ...resolveConf, isOpen: false })}
        onConfirm={handleResolve}
        title={`${resolveConf.winningTeam} Team Victory?`}
        message={`Confirming this will PERMANENTLY ELIMINATE the ${resolveConf.winningTeam === 'Blue' ? 'Red' : 'Blue'} team from the tournament pool.`}
        confirmText="Confirm & Eliminate Losers"
        type="danger"
      />
    </BaseModal>
  );
};
