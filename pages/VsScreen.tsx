
import React, { useEffect, useState } from "react";
import * as ReactRouterDOM from "react-router-dom";
import { db } from "../services/firebase";
import { ArenaMatch, RoleType, UserProfile } from "../types";
import { Swords, Shield, Heart, Zap, Loader2 } from "lucide-react";

const { useSearchParams } = ReactRouterDOM as any;

const VsScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const contextId = searchParams.get("contextId");
  const matchId = searchParams.get("matchId");

  const [activeMatch, setActiveMatch] = useState<ArenaMatch | null>(null);
  const [p1Profile, setP1Profile] = useState<UserProfile | null>(null);
  const [p2Profile, setP2Profile] = useState<UserProfile | null>(null);
  const [guilds, setGuilds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [streamMatchId, setStreamMatchId] = useState<string | null>(null);
  const [bestOf, setBestOf] = useState(3);
  const [raceTo, setRaceTo] = useState<number | undefined>();

  useEffect(() => {
    const unsub = db.collection("guilds").onSnapshot((snap: any) => {
      const lookup: Record<string, string> = {};
      snap.docs.forEach((d: any) => (lookup[d.id] = d.data().name));
      setGuilds(lookup);
    });
    return () => unsub();
  }, []);

  // Listen for Remote Control (activeStreamMatchId) on the parent document
  useEffect(() => {
      if (!contextId) return;

      const setupListener = (collection: string) => {
          return db.collection(collection).doc(contextId).onSnapshot((doc: any) => {
              if (doc.exists) {
                  const data = doc.data();
                  setStreamMatchId(data?.activeStreamMatchId || null);
                  setBestOf(data?.bestOf || 3);
                  setRaceTo(data?.raceTo);
              }
          });
      };

      let unsubscribe = () => {};
      
      // Try to determine if it's a guild or tournament
      db.collection("guilds").doc(contextId).get().then((doc: any) => {
          if (doc.exists) {
              unsubscribe = setupListener("guilds");
          }
          else {
              unsubscribe = setupListener("custom_tournaments");
          }
      });

      return () => unsubscribe();
  }, [contextId]);

  useEffect(() => {
    // 1. URL Match ID Priority (Specific Link)
    if (matchId) {
        const unsub = db.collection("arena_matches").doc(matchId).onSnapshot((doc: any) => {
            if (doc.exists) {
                setActiveMatch({ id: doc.id, ...doc.data() } as ArenaMatch);
            } else {
                setActiveMatch(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }

    // 2. Remote Control Priority (Admin Selected)
    if (streamMatchId) {
        const unsub = db.collection("arena_matches").doc(streamMatchId).onSnapshot((doc: any) => {
            if (doc.exists) {
                setActiveMatch({ id: doc.id, ...doc.data() } as ArenaMatch);
            } else {
                setActiveMatch(null);
            }
            setLoading(false);
        });
        return () => unsub();
    } else {
        setActiveMatch(null);
        setLoading(false);
    }
  }, [matchId, streamMatchId]);

  useEffect(() => {
    if (activeMatch?.player1?.uid) {
      db.collection("users")
        .doc(activeMatch.player1.uid)
        .get()
        .then((doc: any) => (doc.exists ? setP1Profile(doc.data() as UserProfile) : setP1Profile(null)));
    } else setP1Profile(null);

    if (activeMatch?.player2?.uid) {
      db.collection("users")
        .doc(activeMatch.player2.uid)
        .get()
        .then((doc: any) => (doc.exists ? setP2Profile(doc.data() as UserProfile) : setP2Profile(null)));
    } else setP2Profile(null);
  }, [activeMatch?.player1?.uid, activeMatch?.player2?.uid]);

  if (loading) return <LoadingScreen />;
  if (!activeMatch || !activeMatch.player1 || !activeMatch.player2) return <StandbyScreen />;

  const p1 = activeMatch.player1;
  const p2 = activeMatch.player2;
  const p1Weapons = p1Profile?.weapons || [];
  const p2Weapons = p2Profile?.weapons || [];
  const p1GuildName = guilds[p1.originalGuildId || p1.guildId] || "Challenger";
  const p2GuildName = guilds[p2.originalGuildId || p2.guildId] || "Challenger";
  const matchBestOf = activeMatch.bestOf || bestOf;
  const matchRaceTo = activeMatch.raceTo || raceTo;
  const winningScore = matchRaceTo || (matchBestOf === 1 ? 1 : Math.ceil(matchBestOf / 2));

  return (
    <>
      <style>{`
        @keyframes vs-pulse {
            0%, 100% { transform: scale(1) rotate(-3deg); filter: brightness(1); }
            50% { transform: scale(1.1) rotate(-3deg); filter: brightness(1.2); }
        }
        .animate-vs-pulse {
            animation: vs-pulse 1.5s ease-in-out infinite;
        }
        .text-stroke-vs {
            -webkit-text-stroke: 4px white;
            paint-order: stroke fill;
        }
      `}</style>
      <div className="h-screen w-screen bg-black overflow-hidden relative font-sans select-none">
        {/* Cinematic bars */}
        <div className="absolute top-0 left-0 w-full h-16 bg-black z-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-16 bg-black z-50 pointer-events-none" />

        {/* Static split background */}
        <div className="absolute inset-0 flex">
          {/* Left side - Blue */}
          <div className="relative w-1/2 h-full bg-gradient-to-br from-blue-900 via-blue-950 to-black overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-transparent" />
          </div>
          
          {/* Right side - Red */}
          <div className="relative w-1/2 h-full bg-gradient-to-bl from-red-900 via-red-950 to-black overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <div className="absolute inset-0 bg-gradient-to-l from-red-900/20 to-transparent" />
          </div>
        </div>

        {/* Center Score Graphic */}
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
            {activeMatch.winner ? (
                <div className="flex flex-col items-center animate-in zoom-in duration-500">
                    <span 
                        className="font-black italic tracking-tighter text-stroke-vs leading-none block drop-shadow-[0_0_60px_rgba(255,215,0,0.8)]" 
                        style={{ 
                            fontSize: '180px',
                            backgroundImage: 'linear-gradient(to bottom, #fde047 0%, #ca8a04 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            color: 'transparent'
                        }}
                    >
                        {activeMatch.score1} - {activeMatch.score2}
                    </span>
                    <span className="text-yellow-400 font-bold text-4xl tracking-[0.5em] uppercase mt-4 bg-black/50 px-6 py-2 rounded-full backdrop-blur-md border border-yellow-500/30">
                        FINAL
                    </span>
                </div>
            ) : (
                <div className="flex flex-col items-center">
                    <div className="relative flex items-center justify-center gap-12">
                        <span className="text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(59,130,246,0.8)] tabular-nums">
                            {activeMatch.score1 || 0}
                        </span>
                        <div className="h-32 w-2 bg-white/20 rounded-full"></div>
                        <span className="text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] tabular-nums">
                            {activeMatch.score2 || 0}
                        </span>
                    </div>
                    {winningScore > 1 && (
                    <div className="text-2xl font-bold uppercase tracking-widest mt-6 bg-black/50 px-6 py-2 rounded-full backdrop-blur-md border border-white/10 text-white/80">
                        First to {winningScore}
                    </div>
                    )}
                     {(matchBestOf > 1 || matchRaceTo) && (
                    <div className="text-lg font-bold uppercase tracking-widest mt-6 bg-black/50 px-6 py-2 rounded-full backdrop-blur-md border border-white/10 text-white/80">
                        {matchBestOf > 1 ? `Best of ${matchBestOf}` : ''}{matchRaceTo ? ` / Race to ${matchRaceTo}`: ''}
                    </div>
                    )}
                </div>
            )}
        </div>

        {/* Character images */}
        <CharacterImage side="left" photoURL={p1.photoURL} color="blue" />
        <CharacterImage side="right" photoURL={p2.photoURL} color="red" />

        {/* Player panels */}
        <PlayerPanel 
          side="left" 
          player={p1} 
          profile={p1Profile} 
          guildName={p1GuildName} 
          weapons={p1Weapons} 
          color="blue" 
        />
        <PlayerPanel 
          side="right" 
          player={p2} 
          profile={p2Profile} 
          guildName={p2GuildName} 
          weapons={p2Weapons} 
          color="red" 
        />
      </div>
    </>
  );
};

export default VsScreen;

/* --------------------------
   Helpers & Subcomponents
   -------------------------- */

const CharacterImage: React.FC<{ side: "left" | "right"; photoURL?: string; color: "blue" | "red" }> = ({ side, photoURL, color }) => {
  const isLeft = side === "left";
  const alignment = isLeft ? "left-0" : "right-0";
  // Apply scale-x-[-1] directly without conflicting animations
  const flip = isLeft ? "" : "scale-x-[-1]";
  const gradient = isLeft 
    ? "linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,0.7) 40%, transparent 70%)"
    : "linear-gradient(to left, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,0.7) 40%, transparent 70%)";

  return (
    <div className={`absolute bottom-0 ${alignment} w-1/2 h-full z-10 pointer-events-none`}>
      <div className="relative w-full h-full">
        {/* Single static image */}
        <img
          src={photoURL || "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=900&auto=format&fit=crop"}
          alt="Character"
          className={`absolute bottom-0 ${flip} h-[110%] w-auto object-cover object-center max-w-none`}
          style={{
            maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
          }}
        />
        
        {/* Dark gradient overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: gradient,
            maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
          }}
        />
        
        {/* Color tint overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t ${color === "blue" ? "from-blue-900/40" : "from-red-900/40"} to-transparent`} />
      </div>
    </div>
  );
};

const PlayerPanel: React.FC<any> = ({ side, player, profile, guildName, weapons, color }) => {
  const isLeft = side === "left";
  const alignment = isLeft ? "left-0 pl-16" : "right-0 pr-16";

  return (
    <div className={`absolute bottom-20 ${alignment} z-40 w-1/2 flex flex-col ${isLeft ? "items-start" : "items-end"} pointer-events-none`}>
      <div className={`relative z-40 max-w-[85%] mb-8`}>
        {/* Container for icon and text - stacked vertically for icon between IGN and guild */}
        <div className={`flex ${isLeft ? "items-start" : "items-end"} mb-4`}>
          {/* Left player: Icon on left side */}
          {isLeft && (
            <div className="mr-4 flex flex-col justify-center h-full">
              <RoleIcon role={player.role} color={color} />
            </div>
          )}
          
          {/* Text Content */}
          <div className={`flex flex-col ${isLeft ? "items-start text-left" : "items-end text-right"} flex-1 min-w-0`}>
            {/* Player Name */}
            <span 
              className={`block text-4xl md:text-5xl font-black ${color === "blue" ? "text-blue-100" : "text-red-100"} uppercase leading-[0.95] tracking-tight whitespace-normal break-words max-w-full`}
              style={{
                textShadow: `0 2px 4px rgba(0,0,0,0.8)`
              }}
            >
              {player.displayName}
            </span>
            
            {/* Guild Name */}
            <span className={`block text-xl md:text-2xl font-bold ${color === "blue" ? "text-blue-300" : "text-red-300"} tracking-[0.1em] uppercase whitespace-normal mt-1`}>
              {guildName}
            </span>
          </div>
          
          {/* Right player: Icon on right side */}
          {!isLeft && (
            <div className="ml-4 flex flex-col justify-center h-full">
              <RoleIcon role={player.role} color={color} />
            </div>
          )}
        </div>

        {/* Weapons and Role Tags */}
        <div className={`flex gap-3 mt-6 flex-wrap ${isLeft ? "" : "justify-end"}`}>
          {isLeft && <Tag strong color={color}>{player.role}</Tag>}
          {(profile?.weapons || weapons || []).map((w: string, i: number) => (
            <Tag key={i} color={color}>{w}</Tag>
          ))}
          {!isLeft && <Tag strong color={color}>{player.role}</Tag>}
        </div>
      </div>
    </div>
  );
};

const RoleIcon: React.FC<{ role?: RoleType; color?: "blue" | "red" }> = ({ role, color }) => {
  if (!role) return null;
  
  const iconClass = color === "blue" 
    ? "text-blue-400" 
    : "text-red-400";
  
  const iconProps = { 
    className: `w-20 h-20 ${iconClass} drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]`,
    strokeWidth: 2 
  };
  
  const Icon = () => {
    switch (role) {
      case RoleType.DPS:
        return <Swords {...iconProps} />;
      case RoleType.TANK:
        return <Shield {...iconProps} />;
      case RoleType.HEALER:
        return <Heart {...iconProps} />;
      case RoleType.HYBRID:
        return <Zap {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="relative">
        <Icon />
      </div>
    </div>
  );
};

const Tag: React.FC<any> = ({ children, strong = false, color = "blue" }) => {
  const base = "px-4 py-2 rounded-lg text-base font-bold uppercase tracking-wider border shadow-lg";
  
  if (strong) {
    const gradient = color === "blue" 
      ? "bg-blue-900/90 border-blue-500 text-white" 
      : "bg-red-900/90 border-red-500 text-white";
    return <span className={`${base} ${gradient}`}>{children}</span>;
  }
  
  const bg = color === "blue"
    ? "bg-blue-950/80 border-blue-500/50 text-blue-200"
    : "bg-red-950/80 border-red-500/50 text-red-200";
  return <span className={`${base} ${bg}`}>{children}</span>;
};

const LoadingScreen = () => (
  <div className="h-screen w-screen bg-black flex items-center justify-center">
    <Loader2 className="animate-spin text-red-600" size={72} />
  </div>
);

const StandbyScreen = () => (
  <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80" />
    
    {/* Scanning Line */}
    <div className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <div className="w-full h-1 bg-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-scan"></div>
    </div>

    <div className="z-10 text-center relative flex flex-col items-center">
      <Loader2 className="w-16 h-16 text-red-600 animate-spin mb-6" />
      <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-500 to-zinc-800 uppercase tracking-widest drop-shadow-2xl">
        WAITING FOR MATCH
      </h1>
      <div className="flex items-center gap-2 mt-4 text-red-500/80 font-mono text-sm tracking-[0.3em] uppercase animate-pulse">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          <span>Preparing Battlefield</span>
      </div>
    </div>
    
    <style>{`
        @keyframes scan {
            0% { transform: translateY(-10vh); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(110vh); opacity: 0; }
        }
        .animate-scan {
            animation: scan 4s linear infinite;
        }
    `}</style>
  </div>
);
