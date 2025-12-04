import React, { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { db } from '../services/firebase';
import { ArenaMatch, RoleType, UserProfile } from '../types';
import { Swords, Shield, Heart, Zap, Loader2 } from 'lucide-react';

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
      const unsub = db.collection("guilds").onSnapshot((snap: any) => {
          const lookup: Record<string, string> = {};
          snap.docs.forEach((d: any) => { lookup[d.id] = d.data().name; });
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
          case RoleType.DPS: return <Swords size={40} />;
          case RoleType.TANK: return <Shield size={40} />;
          case RoleType.HEALER: return <Heart size={40} />;
          case RoleType.HYBRID: return <Zap size={40} />;
      }
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
              <div className="z-10 text-center relative animate-pulse">
                  <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-400 to-zinc-800 uppercase tracking-widest italic drop-shadow-2xl">
                      STANDBY
                  </h1>
                  <p className="text-zinc-500 font-mono tracking-[0.5em] text-xl uppercase mt-4">Awaiting Challengers</p>
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
        @keyframes breathe {
            0%, 100% { transform: scale(1) translateY(0); filter: brightness(1); }
            50% { transform: scale(1.03) translateY(-10px); filter: brightness(1.1); }
        }
        @keyframes slide-in-left {
            0% { transform: translateX(-100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slide-in-right {
            0% { transform: translateX(100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
        }
        .animate-breathe {
            animation: breathe 4s ease-in-out infinite;
        }
        .text-stroke { -webkit-text-stroke: 2px black; }
    `}</style>

    <div className="h-screen w-screen bg-black overflow-hidden relative font-sans select-none flex">
        
        {/* Background Split */}
        <div className="absolute inset-0 flex">
            <div className="w-1/2 h-full bg-gradient-to-br from-blue-950 via-zinc-900 to-black relative overflow-hidden border-r-4 border-black">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
                 {/* Blue Particles */}
                 <div className="absolute inset-0 opacity-30">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="absolute bg-blue-500 rounded-full blur-md animate-pulse" 
                             style={{ 
                                 width: Math.random() * 10 + 'px', height: Math.random() * 10 + 'px', 
                                 top: Math.random() * 100 + '%', left: Math.random() * 100 + '%',
                                 animationDuration: Math.random() * 3 + 2 + 's' 
                             }} 
                        />
                    ))}
                 </div>
            </div>
            <div className="w-1/2 h-full bg-gradient-to-bl from-red-950 via-zinc-900 to-black relative overflow-hidden border-l-4 border-black">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
                 {/* Red Particles */}
                 <div className="absolute inset-0 opacity-30">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="absolute bg-red-500 rounded-full blur-md animate-pulse" 
                             style={{ 
                                 width: Math.random() * 10 + 'px', height: Math.random() * 10 + 'px', 
                                 top: Math.random() * 100 + '%', left: Math.random() * 100 + '%',
                                 animationDuration: Math.random() * 3 + 2 + 's' 
                             }} 
                        />
                    ))}
                 </div>
            </div>
        </div>

        {/* VS CENTER */}
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="relative transform scale-[4] rotate-[-5deg] drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-orange-500 to-red-700 italic tracking-tighter" style={{ WebkitTextStroke: '1px white' }}>
                    VS
                </span>
            </div>
        </div>

        {/* Round Indicator */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 bg-black/80 border border-zinc-700 px-8 py-2 rounded-full backdrop-blur-md">
            <span className="text-xl font-bold text-white uppercase tracking-widest text-shadow-sm">
                {activeMatch.isThirdPlace ? "3rd Place Match" : `Round ${activeMatch.round}`}
            </span>
        </div>

        {/* === PLAYER 1 (LEFT) === */}
        <div className="relative w-1/2 h-full z-10 flex flex-col justify-end pb-20 pl-16">
            {/* Character Image */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <img 
                    src={p1.photoURL || 'https://via.placeholder.com/800'} 
                    className="h-[110%] w-auto object-cover animate-breathe filter drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                    style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
                />
            </div>

            {/* Info Panel */}
            <div className="relative z-20 animate-[slide-in-left_0.8s_ease-out]">
                <div className="flex items-end gap-4 mb-2">
                    <div className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">
                        {getRoleIcon(p1.role)}
                    </div>
                    <div>
                        <span className="block text-5xl font-black text-white italic uppercase tracking-tighter leading-none text-stroke drop-shadow-xl">{p1.displayName}</span>
                        <span className="text-xl font-bold text-blue-400 tracking-[0.3em] uppercase block mt-1">{p1GuildName}</span>
                    </div>
                </div>
                
                <div className="flex gap-3 mt-4">
                    <span className="bg-blue-900/80 text-white px-4 py-1 rounded text-lg font-bold uppercase tracking-wider border-l-4 border-blue-500 shadow-lg">
                        {p1.role}
                    </span>
                    {p1Weapons.map((w, i) => (
                        <span key={i} className="bg-zinc-900/80 text-zinc-300 px-4 py-1 rounded text-lg font-bold uppercase tracking-wider border border-zinc-700">
                            {w}
                        </span>
                    ))}
                </div>
            </div>
        </div>

        {/* === PLAYER 2 (RIGHT) === */}
        <div className="relative w-1/2 h-full z-10 flex flex-col justify-end items-end pb-20 pr-16 text-right">
            {/* Character Image */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <img 
                    src={p2.photoURL || 'https://via.placeholder.com/800'} 
                    className="h-[110%] w-auto object-cover animate-breathe filter drop-shadow-[0_0_20px_rgba(239,68,68,0.4)] transform scale-x-[-1]"
                    style={{ animationDelay: '0.5s', maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
                />
            </div>

            {/* Info Panel */}
            <div className="relative z-20 animate-[slide-in-right_0.8s_ease-out]">
                <div className="flex items-end justify-end gap-4 mb-2">
                    <div>
                        <span className="block text-5xl font-black text-white italic uppercase tracking-tighter leading-none text-stroke drop-shadow-xl">{p2.displayName}</span>
                        <span className="text-xl font-bold text-red-400 tracking-[0.3em] uppercase block mt-1">{p2GuildName}</span>
                    </div>
                    <div className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                        {getRoleIcon(p2.role)}
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    {p2Weapons.map((w, i) => (
                        <span key={i} className="bg-zinc-900/80 text-zinc-300 px-4 py-1 rounded text-lg font-bold uppercase tracking-wider border border-zinc-700">
                            {w}
                        </span>
                    ))}
                    <span className="bg-red-900/80 text-white px-4 py-1 rounded text-lg font-bold uppercase tracking-wider border-r-4 border-red-500 shadow-lg">
                        {p2.role}
                    </span>
                </div>
            </div>
        </div>

    </div>
    </>
  );
};

export default VsScreen;