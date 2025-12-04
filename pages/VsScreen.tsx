import React, { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { db } from '../services/firebase';
import { ArenaMatch, RoleType, UserProfile, Guild } from '../types';
import { Swords, Shield, Heart, Zap, Loader2, Flame } from 'lucide-react';

const { useSearchParams } = ReactRouterDOM as any;

const VsScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const contextId = searchParams.get('contextId');
  
  const [activeMatch, setActiveMatch] = useState<ArenaMatch | null>(null);
  const [p1Profile, setP1Profile] = useState<UserProfile | null>(null);
  const [p2Profile, setP2Profile] = useState<UserProfile | null>(null);
  const [guilds, setGuilds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Fetch Guilds for lookup
  useEffect(() => {
      const unsub = db.collection("guilds").onSnapshot(snap => {
          const lookup: Record<string, string> = {};
          snap.docs.forEach(d => { lookup[d.id] = d.data().name; });
          setGuilds(lookup);
      });
      return () => unsub();
  }, []);

  // Poll for the "Feature Match"
  useEffect(() => {
    if (!contextId) return;

    const unsub = db.collection("arena_matches")
      .where("guildId", "==", contextId)
      .onSnapshot((snap: any) => {
        const matches = snap.docs.map((d: any) => ({id: d.id, ...d.data()} as ArenaMatch));
        
        // Priority: Active match with 2 players -> Highest Round -> Lowest Position
        const playableMatches = matches.filter((m: ArenaMatch) => m.player1 && m.player2 && !m.winner);
        
        playableMatches.sort((a: ArenaMatch, b: ArenaMatch) => {
            if (a.round !== b.round) return b.round - a.round; 
            return a.position - b.position;
        });

        const target = playableMatches.length > 0 ? playableMatches[0] : null;
        setActiveMatch(target);
        setLoading(false);
      });

    return () => unsub();
  }, [contextId]);

  // Fetch User Profiles for extra data (Weapons)
  useEffect(() => {
      if (activeMatch?.player1) {
          db.collection("users").doc(activeMatch.player1.uid).get().then((doc: any) => {
              if(doc.exists) setP1Profile(doc.data() as UserProfile);
          });
      } else {
          setP1Profile(null);
      }

      if (activeMatch?.player2) {
          db.collection("users").doc(activeMatch.player2.uid).get().then((doc: any) => {
              if(doc.exists) setP2Profile(doc.data() as UserProfile);
          });
      } else {
          setP2Profile(null);
      }
  }, [activeMatch?.player1?.uid, activeMatch?.player2?.uid]);

  const getRoleIcon = (role?: RoleType) => {
      if (!role) return null;
      switch(role) {
          case RoleType.DPS: return <Swords size={48} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />;
          case RoleType.TANK: return <Shield size={48} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />;
          case RoleType.HEALER: return <Heart size={48} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />;
          case RoleType.HYBRID: return <Zap size={48} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />;
      }
  };

  const renderParticles = (color: string) => {
      return Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i}
            className={`absolute bottom-[-20px] rounded-full blur-sm opacity-0 animate-fire-rise ${color}`}
            style={{
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                animationDuration: `${Math.random() * 2 + 2}s`,
                animationDelay: `${Math.random() * 2}s`
            }}
          />
      ));
  };

  if (loading) {
      return (
          <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
              <Loader2 className="animate-spin text-red-600" size={64} />
          </div>
      );
  }

  if (!activeMatch || !activeMatch.player1 || !activeMatch.player2) {
      return (
          <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black"></div>
              
              {/* Animated Background Lines */}
              <div className="absolute inset-0 opacity-20">
                  {Array.from({length: 10}).map((_, i) => (
                      <div key={i} className="absolute h-[1px] bg-white/50 w-full" style={{ top: `${i * 10}%`, left: 0, animation: `scanline ${3 + i}s linear infinite` }}></div>
                  ))}
              </div>

              <div className="z-10 text-center relative">
                  <div className="absolute -inset-10 bg-rose-500/10 blur-3xl animate-pulse rounded-full"></div>
                  <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-400 to-zinc-800 uppercase tracking-widest italic drop-shadow-2xl">
                      STANDBY
                  </h1>
                  <div className="h-1 w-32 bg-rose-900 mx-auto mt-6 mb-4"></div>
                  <p className="text-zinc-500 font-mono tracking-[0.5em] text-xl uppercase">Awaiting Challengers</p>
              </div>
          </div>
      );
  }

  const p1 = activeMatch.player1;
  const p2 = activeMatch.player2;
  const p1Weapons = p1Profile?.weapons || [];
  const p2Weapons = p2Profile?.weapons || [];
  const p1GuildName = guilds[p1.originalGuildId || p1.guildId] || 'Challenger';
  const p2GuildName = guilds[p2.originalGuildId || p2.guildId] || 'Challenger';

  return (
    <>
    <style>{`
        @keyframes fire-rise {
            0% { transform: translateY(0) scale(1); opacity: 0; }
            20% { opacity: 0.8; }
            100% { transform: translateY(-100vh) scale(0); opacity: 0; }
        }
        @keyframes slide-clash-left {
            0% { transform: translateX(-100%) skewX(-10deg); opacity: 0; }
            100% { transform: translateX(0) skewX(-10deg); opacity: 1; }
        }
        @keyframes slide-clash-right {
            0% { transform: translateX(100%) skewX(-10deg); opacity: 0; }
            100% { transform: translateX(0) skewX(-10deg); opacity: 1; }
        }
        @keyframes lightning-flash {
            0%, 90%, 100% { opacity: 0; }
            92%, 96% { opacity: 1; filter: brightness(2); }
        }
        .text-stroke { -webkit-text-stroke: 1px rgba(0,0,0,0.5); }
        .text-glow-blue { text-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
        .text-glow-red { text-shadow: 0 0 20px rgba(239, 68, 68, 0.8); }
    `}</style>

    <div className="h-screen w-screen bg-black overflow-hidden relative font-sans select-none flex">
        
        {/* === PLAYER 1 SIDE (LEFT) === */}
        <div className="relative w-[55%] h-full bg-zinc-900 overflow-hidden -skew-x-6 -ml-[5%] border-r-4 border-blue-500/50 shadow-[10px_0_50px_rgba(0,0,0,0.8)] z-10">
            {/* Background Image / Color */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-zinc-900 to-black skew-x-6 scale-110"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
            
            {/* Particles */}
            <div className="absolute inset-0 overflow-hidden skew-x-6 scale-110">
                {renderParticles('bg-blue-500')}
            </div>

            {/* Content Container (Un-skewed) */}
            <div className="absolute inset-0 skew-x-6 ml-[5%] flex flex-col justify-end pb-16 pl-12 md:pl-24">
                
                {/* Character Portrait */}
                <div className="absolute bottom-0 right-0 h-[110%] w-[120%] flex items-end justify-center transform translate-x-20">
                    <img 
                        src={p1.photoURL || 'https://via.placeholder.com/800'} 
                        className="h-full w-auto object-cover max-w-none opacity-0 animate-hero-entrance filter contrast-125 brightness-110 drop-shadow-[-20px_0_30px_rgba(0,0,0,0.8)]"
                        style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
                    />
                </div>

                {/* Text Info */}
                <div className="relative z-20 opacity-0 animate-in slide-in-from-left duration-700 delay-300 fill-mode-forwards">
                    <div className="flex items-center gap-4 text-blue-400 mb-2 drop-shadow-md">
                        {getRoleIcon(p1.role)}
                        <div>
                            <span className="block text-4xl font-black uppercase tracking-widest leading-none text-white">{p1.role}</span>
                            <span className="block text-sm font-bold text-blue-300 tracking-[0.3em] uppercase">{p1GuildName}</span>
                        </div>
                    </div>
                    
                    <h1 className="text-8xl md:text-[10rem] font-black text-white italic tracking-tighter uppercase leading-[0.8] drop-shadow-xl transform -skew-x-12 origin-bottom-left text-glow-blue">
                        {p1.displayName}
                    </h1>

                    <div className="mt-6 flex flex-wrap gap-2 max-w-md">
                        {p1Weapons.map((w, i) => (
                            <span key={i} className="bg-blue-900/80 backdrop-blur-sm border border-blue-500/30 text-white px-4 py-1 text-lg font-bold uppercase tracking-wider rounded skew-x-[-12deg]">
                                {w}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* === PLAYER 2 SIDE (RIGHT) === */}
        <div className="relative w-[55%] h-full bg-zinc-900 overflow-hidden -skew-x-6 -mr-[5%] -ml-[10%] border-l-4 border-red-500/50 shadow-[-10px_0_50px_rgba(0,0,0,0.8)] z-10">
            {/* Background Image / Color */}
            <div className="absolute inset-0 bg-gradient-to-bl from-red-950 via-zinc-900 to-black skew-x-6 scale-110"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>

            {/* Particles */}
            <div className="absolute inset-0 overflow-hidden skew-x-6 scale-110">
                {renderParticles('bg-red-500')}
            </div>

            {/* Content Container (Un-skewed) */}
            <div className="absolute inset-0 skew-x-6 mr-[5%] flex flex-col justify-end items-end pb-16 pr-12 md:pr-24 text-right">
                
                {/* Character Portrait */}
                <div className="absolute bottom-0 left-0 h-[110%] w-[120%] flex items-end justify-center transform -translate-x-20 scale-x-[-1]">
                    <img 
                        src={p2.photoURL || 'https://via.placeholder.com/800'} 
                        className="h-full w-auto object-cover max-w-none opacity-0 animate-hero-entrance filter contrast-125 brightness-110 drop-shadow-[-20px_0_30px_rgba(0,0,0,0.8)]"
                        style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
                    />
                </div>

                {/* Text Info */}
                <div className="relative z-20 opacity-0 animate-in slide-in-from-right duration-700 delay-300 fill-mode-forwards flex flex-col items-end">
                    <div className="flex items-center gap-4 text-red-500 mb-2 drop-shadow-md flex-row-reverse">
                        {getRoleIcon(p2.role)}
                        <div className="text-right">
                            <span className="block text-4xl font-black uppercase tracking-widest leading-none text-white">{p2.role}</span>
                            <span className="block text-sm font-bold text-red-300 tracking-[0.3em] uppercase">{p2GuildName}</span>
                        </div>
                    </div>
                    
                    <h1 className="text-8xl md:text-[10rem] font-black text-white italic tracking-tighter uppercase leading-[0.8] drop-shadow-xl transform -skew-x-12 origin-bottom-right text-glow-red">
                        {p2.displayName}
                    </h1>

                    <div className="mt-6 flex flex-wrap gap-2 max-w-md justify-end">
                        {p2Weapons.map((w, i) => (
                            <span key={i} className="bg-red-900/80 backdrop-blur-sm border border-red-500/30 text-white px-4 py-1 text-lg font-bold uppercase tracking-wider rounded skew-x-[-12deg]">
                                {w}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* === CENTER VS ELEMENT === */}
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            {/* Lightning Flash Overlay */}
            <div className="absolute inset-0 bg-white mix-blend-overlay pointer-events-none animate-[lightning-flash_5s_infinite]"></div>

            <div className="relative transform scale-[2.5] md:scale-[4] rotate-[-5deg]">
                {/* VS Text */}
                <span className="relative z-10 font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-orange-500 to-red-700 italic tracking-tighter drop-shadow-[0_5px_5px_rgba(0,0,0,1)] text-stroke" 
                      style={{ WebkitTextStroke: '1px white' }}>
                    VS
                </span>
                
                {/* Energy Burst behind VS */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-orange-500/30 blur-[50px] animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[20%] bg-white blur-md rotate-[-45deg] animate-pulse"></div>
            </div>
        </div>

        {/* Round Indicator */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-black/80 backdrop-blur-md border border-white/20 px-12 py-3 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] transform skew-x-[-20deg]">
                <div className="transform skew-x-[20deg] text-center">
                    <span className="block text-zinc-400 font-bold tracking-[0.5em] text-xs uppercase mb-1">Current Match</span>
                    <span className="block text-white font-black tracking-widest text-2xl uppercase text-glow-blue">
                        {activeMatch.isThirdPlace ? "3rd Place Match" : `Round ${activeMatch.round}`}
                    </span>
                </div>
            </div>
        </div>

        {/* Footer Overlay */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none"></div>

    </div>
    </>
  );
};

export default VsScreen;