import React, { useEffect, useState } from "react";
import * as ReactRouterDOM from "react-router-dom";
import { db } from "../services/firebase";
import { ArenaMatch, RoleType, UserProfile, Guild } from "../types";
import { Swords, Shield, Heart, Zap, Clock, Loader2 } from "lucide-react";

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

  return (
    <div className="h-screen w-screen bg-transparent flex flex-col justify-end overflow-hidden">
        {/* Banner Container */}
        <div className="relative w-full h-40 md:h-48 bg-zinc-950 overflow-hidden border-t border-zinc-800 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/60 via-black to-red-950/60 z-0"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/10 via-transparent to-transparent z-0"></div>
            
            <div className="relative z-10 flex items-center justify-between h-full w-full max-w-[95%] mx-auto">
                
                {/* Left Player */}
                <div className="flex-1 flex items-center justify-end gap-4 min-w-0 pr-4 md:pr-12 animate-in slide-in-from-left duration-700">
                    {leftPlayer ? (
                        <>
                        <div className="flex-col items-end hidden md:flex min-w-0 shrink">
                            <h3 className="font-black text-white text-xl md:text-3xl uppercase italic tracking-tighter leading-none truncate w-full text-right drop-shadow-md pr-2 py-1">
                                {leftPlayer.displayName}
                            </h3>
                            <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 text-right">{leftPlayer.guildName}</div>
                            <div className="flex items-center gap-2 mt-1 justify-end">
                                {leftPlayer.weapons?.slice(0,2).map((w: string, i: number) => (
                                    <span key={i} className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 whitespace-nowrap">{w}</span>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 mt-2 justify-end">
                                {getRoleBadge(leftPlayer.role)}
                            </div>
                        </div>
                        
                        <div className="relative group shrink-0">
                            <div className="absolute -inset-3 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                            <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-blue-500/50 z-10 bg-zinc-900 overflow-hidden shadow-2xl">
                                <img src={leftPlayer.photoURL || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                            </div>
                        </div>
                        </>
                    ) : (
                        <div className="text-zinc-500 italic text-sm">Empty Slot</div>
                    )}
                </div>

                {/* VS Center */}
                <div className="shrink-0 flex flex-col items-center justify-center z-20 mx-4">
                    <div className="relative px-6">
                        <span className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 tracking-tighter drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] animate-pulse block transform -skew-x-12">
                            VS
                        </span>
                    </div>
                </div>

                {/* Right Player */}
                <div className="flex-1 flex items-center justify-start gap-4 min-w-0 pl-4 md:pl-12 animate-in slide-in-from-right duration-700">
                    {rightPlayer ? (
                        <>
                            <div className="relative group shrink-0">
                                <div className="absolute -inset-3 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                                <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-red-500/50 z-10 bg-zinc-900 overflow-hidden shadow-2xl">
                                    <img src={rightPlayer.photoURL || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                                </div>
                            </div>

                            <div className="flex-col items-start hidden md:flex min-w-0 shrink">
                                <h3 className="font-black text-white text-xl md:text-3xl uppercase italic tracking-tighter leading-none truncate w-full text-left drop-shadow-md pr-2 py-1">
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