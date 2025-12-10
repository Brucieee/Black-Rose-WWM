
import React, { useEffect, useState } from "react";
import * as ReactRouterDOM from "react-router-dom";
import { db } from "../services/firebase";
import { ArenaMatch, RoleType, UserProfile, Guild, CustomTournament } from "../types";
import { Swords, Shield, Heart, Zap, Clock, Loader2, Crown } from "lucide-react";

const { useSearchParams } = ReactRouterDOM as any;

const MatchBanner: React.FC = () => {
  const [searchParams] = useSearchParams();
  const matchIdParam = searchParams.get("matchId");
  const contextId = searchParams.get("contextId");

  const [matchId, setMatchId] = useState<string | null>(matchIdParam);
  const [match, setMatch] = useState<ArenaMatch | null>(null);
  const [p1Profile, setP1Profile] = useState<UserProfile | null>(null);
  const [p2Profile, setP2Profile] = useState<UserProfile | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [bestOf, setBestOf] = useState<number>(3); // Default Best of 3
  const [loading, setLoading] = useState(true);

  // Fetch Guilds for lookup
  useEffect(() => {
    const unsub = db.collection("guilds").onSnapshot((snap: any) => {
      setGuilds(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Guild)));
    });
    return () => unsub();
  }, []);

  // Remote Control Listener
  useEffect(() => {
      if (!contextId) return;

      const setupListener = (collection: string) => {
          return db.collection(collection).doc(contextId).onSnapshot((doc: any) => {
              if (doc.exists) {
                  const data = doc.data();
                  if (data?.activeBannerMatchId) {
                      setMatchId(data.activeBannerMatchId);
                  } else {
                      setMatchId(null);
                  }
                  // Update bestOf setting if available
                  if (data?.bestOf) {
                      setBestOf(data.bestOf);
                  }
              }
          });
      };

      let unsubscribe = () => {};
      
      // Try to determine if it's a guild or tournament
      db.collection("guilds").doc(contextId).get().then((doc: any) => {
          if (doc.exists) {
              unsubscribe = setupListener("guilds");
          } else {
              unsubscribe = setupListener("custom_tournaments");
          }
      });

      return () => unsubscribe();
  }, [contextId]);

  // Fetch Match
  useEffect(() => {
    if (!matchId) {
        setLoading(false);
        setMatch(null);
        return;
    }
    const unsub = db.collection("arena_matches").doc(matchId).onSnapshot((doc: any) => {
        if (doc.exists) {
            setMatch({ id: doc.id, ...doc.data() } as ArenaMatch);
        } else {
            setMatch(null);
        }
        setLoading(false);
    });
    return () => unsub();
  }, [matchId]);

  // Fetch Profiles
  useEffect(() => {
    setP1Profile(null);
    setP2Profile(null);
    
    if (match?.player1?.uid) {
      db.collection("users").doc(match.player1.uid).get().then((doc: any) => 
        doc.exists ? setP1Profile(doc.data() as UserProfile) : null
      );
    }
    if (match?.player2?.uid) {
      db.collection("users").doc(match.player2.uid).get().then((doc: any) => 
        doc.exists ? setP2Profile(doc.data() as UserProfile) : null
      );
    }
  }, [match?.player1?.uid, match?.player2?.uid]);

  const getRoleBadge = (role?: RoleType) => {
      if (!role) return null;
      let colorClass = "";
      let Icon = Swords;
      switch (role) {
          case RoleType.DPS: 
            colorClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"; 
            Icon = Swords;
            break;
          case RoleType.TANK: 
            colorClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"; 
            Icon = Shield;
            break;
          case RoleType.HEALER: 
            colorClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"; 
            Icon = Heart;
            break;
          case RoleType.HYBRID: 
            colorClass = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"; 
            Icon = Zap;
            break;
      }
      return (
          <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide ${colorClass}`}>
              <Icon size={12} /> {role}
          </span>
      );
  };

  const resolvePlayer = (participant: any, profile: UserProfile | null) => {
      if (!participant) return null;
      const gid = profile?.guildId || participant.originalGuildId || participant.guildId;
      const guildName = guilds.find(g => g.id === gid)?.name || 'Challenger';
      return {
          ...participant,
          guildName,
          weapons: profile?.weapons || []
      };
  };

  const renderScoreDots = (score: number) => {
      const winningScore = bestOf === 3 ? 3 : Math.ceil(bestOf / 2);
      // Create array length equal to winning score (e.g., 3 for Bo3, 1 for Bo1)
      const dots = Array.from({ length: winningScore }, (_, i) => i + 1);

      return (
          <div className="flex gap-2 mt-3 z-20">
              {dots.map(i => (
                  <div 
                    key={i} 
                    className={`w-4 h-4 transform rotate-45 border-2 transition-all duration-500 shadow-lg ${
                        i <= score 
                        ? 'bg-yellow-400 border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,1)] scale-110' 
                        : 'bg-black/60 border-zinc-600'
                    }`}
                  ></div>
              ))}
          </div>
      );
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;
  
  if (!match) return (
      <div className="h-screen w-screen bg-transparent flex flex-col justify-end overflow-hidden">
        <div className="relative w-full h-40 md:h-48 bg-black/90 backdrop-blur-md overflow-hidden border-t border-zinc-800 flex flex-col items-center justify-center group">
            
            {/* Scanner */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(220,38,38,0.1)_50%,transparent_100%)] w-[200%] -translate-x-full animate-shimmer" />
            
            <div className="relative z-10 flex items-center gap-3 opacity-60">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <p className="text-zinc-400 font-mono tracking-[0.3em] uppercase text-sm font-bold">
                    Waiting for Match Data...
                </p>
            </div>
            
            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 3s infinite linear;
                }
            `}</style>
        </div>
      </div>
  );

  const leftPlayer = resolvePlayer(match.player1, p1Profile);
  const rightPlayer = resolvePlayer(match.player2, p2Profile);
  
  const score1 = match.score1 || 0;
  const score2 = match.score2 || 0;
  
  const winningScore = bestOf === 3 ? 3 : Math.ceil(bestOf / 2);
  const hasWinner = !!match.winner || score1 >= winningScore || score2 >= winningScore;
  const isLeftWinner = match.winner?.uid === leftPlayer?.uid || score1 >= winningScore;
  const isRightWinner = match.winner?.uid === rightPlayer?.uid || score2 >= winningScore;

  return (
    <div className="h-screen w-screen bg-transparent flex flex-col justify-end overflow-hidden">
        {/* Banner Container */}
        <div className={`relative w-full h-40 md:h-48 ${hasWinner ? 'bg-zinc-950' : 'bg-zinc-950'} overflow-hidden border-t ${hasWinner ? 'border-yellow-500/50' : 'border-zinc-800'} shadow-[0_-8px_30px_rgba(0,0,0,0.5)] transition-all duration-500`}>
            <div className={`absolute inset-0 bg-gradient-to-r ${hasWinner ? 'from-yellow-900/20 via-black to-yellow-900/20' : 'from-blue-950/60 via-black to-red-950/60'} z-0 transition-all duration-500`}></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/10 via-transparent to-transparent z-0"></div>
            
            <div className="relative z-10 flex items-center justify-between h-full w-full max-w-[95%] mx-auto">
                
                {/* Left Player */}
                <div className={`flex-1 flex items-center justify-end gap-6 min-w-0 pr-4 md:pr-8 transition-all duration-500 ${isRightWinner ? 'opacity-30 grayscale' : ''}`}>
                    {leftPlayer ? (
                        <>
                        <div className="flex-col items-end hidden md:flex min-w-0 shrink">
                            <h3 className="font-black text-white text-3xl md:text-5xl uppercase italic tracking-tighter leading-none truncate w-full text-right drop-shadow-md pr-2 py-1">
                                {leftPlayer.displayName}
                            </h3>
                            <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 text-right">{leftPlayer.guildName}</div>
                            <div className="flex items-center gap-2 mt-1 justify-end">
                                {leftPlayer.weapons?.slice(0,2).map((w: string, i: number) => (
                                    <span key={i} className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 whitespace-nowrap">{w}</span>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 mt-2 justify-end">
                                {isLeftWinner && <span className="text-yellow-500 font-black text-xs uppercase tracking-widest flex items-center gap-1"><Crown size={12} fill="currentColor"/> WINNER</span>}
                                {getRoleBadge(leftPlayer.role)}
                            </div>
                        </div>
                        
                        <div className="relative group shrink-0 flex flex-col items-center gap-2">
                            {isLeftWinner && <div className="absolute -inset-4 bg-yellow-500/30 rounded-full blur-xl animate-pulse"></div>}
                            <div className={`relative w-20 h-20 md:w-28 md:h-28 rounded-full border-4 ${isLeftWinner ? 'border-yellow-500' : 'border-blue-500/50'} z-10 bg-zinc-900 overflow-hidden shadow-2xl transition-all`}>
                                <img src={leftPlayer.photoURL || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                            </div>
                            {/* SCORE VISUAL CUES */}
                            {renderScoreDots(score1)}
                        </div>
                        </>
                    ) : (
                        <div className="text-zinc-500 italic text-sm">Empty Slot</div>
                    )}
                </div>

                {/* VS / Score Center */}
                <div className="shrink-0 flex flex-col items-center justify-center z-20 mx-4">
                    {hasWinner ? (
                        <div className="relative px-6 flex flex-col items-center animate-in zoom-in duration-300">
                            <span className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 tracking-tighter drop-shadow-[0_0_25px_rgba(234,179,8,0.4)]">
                                {score1} - {score2}
                            </span>
                            <span className="text-[10px] md:text-xs font-bold text-yellow-500 uppercase tracking-[0.5em] mt-2">
                                VICTORY
                            </span>
                        </div>
                    ) : (
                        <div className="relative px-6 flex flex-col items-center">
                            {(score1 > 0 || score2 > 0) ? (
                                <>
                                    <div className="flex items-center gap-4 text-5xl md:text-7xl font-black text-white tracking-tighter">
                                        <span className={score1 > 0 ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "text-zinc-600"}>{score1}</span>
                                        <span className="text-3xl text-zinc-700 mx-1">-</span>
                                        <span className={score2 > 0 ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "text-zinc-600"}>{score2}</span>
                                    </div>
                                    <span className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-[0.5em] mt-2">
                                        MATCHUP
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 tracking-tighter drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] animate-pulse block transform -skew-x-12">
                                        VS
                                    </span>
                                    <span className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-[0.5em] mt-2">
                                        MATCHUP
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Player */}
                <div className={`flex-1 flex items-center justify-start gap-6 min-w-0 pl-4 md:pl-8 transition-all duration-500 ${isLeftWinner ? 'opacity-30 grayscale' : ''}`}>
                    {rightPlayer ? (
                        <>
                            <div className="relative group shrink-0 flex flex-col items-center gap-2">
                                {isRightWinner && <div className="absolute -inset-4 bg-yellow-500/30 rounded-full blur-xl animate-pulse"></div>}
                                <div className={`relative w-20 h-20 md:w-28 md:h-28 rounded-full border-4 ${isRightWinner ? 'border-yellow-500' : 'border-red-500/50'} z-10 bg-zinc-900 overflow-hidden shadow-2xl transition-all`}>
                                    <img src={rightPlayer.photoURL || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                                </div>
                                {/* SCORE VISUAL CUES */}
                                {renderScoreDots(score2)}
                            </div>

                            <div className="flex-col items-start hidden md:flex min-w-0 shrink">
                                <h3 className="font-black text-white text-3xl md:text-5xl uppercase italic tracking-tighter leading-none truncate w-full text-left drop-shadow-md pr-2 py-1">
                                    {rightPlayer.displayName}
                                </h3>
                                <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 text-left">{rightPlayer.guildName}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    {rightPlayer.weapons?.slice(0,2).map((w: string, i: number) => (
                                        <span key={i} className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 whitespace-nowrap">{w}</span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    {getRoleBadge(rightPlayer.role)}
                                    {isRightWinner && <span className="text-yellow-500 font-black text-xs uppercase tracking-widest flex items-center gap-1"><Crown size={12} fill="currentColor"/> WINNER</span>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-4 opacity-50 min-w-0">
                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-dashed border-zinc-700 bg-zinc-900/50 flex items-center justify-center shrink-0">
                                <Clock className="text-zinc-500 animate-spin-slow" size={32} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default MatchBanner;