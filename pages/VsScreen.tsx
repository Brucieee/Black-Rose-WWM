
import React, { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { db } from '../services/firebase';
import { ArenaMatch, RoleType } from '../types';
import { Swords, Shield, Heart, Zap, Loader2 } from 'lucide-react';

const { useSearchParams } = ReactRouterDOM as any;

const VsScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const contextId = searchParams.get('contextId');
  
  const [activeMatch, setActiveMatch] = useState<ArenaMatch | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll for the "Feature Match"
  useEffect(() => {
    if (!contextId) return;

    const unsub = db.collection("arena_matches")
      .where("guildId", "==", contextId)
      .onSnapshot((snap: any) => {
        const matches = snap.docs.map((d: any) => ({id: d.id, ...d.data()} as ArenaMatch));
        
        // Find the most relevant active match:
        // 1. Must have 2 players
        // 2. Must NOT have a winner
        // 3. Highest Round (desc)
        // 4. Lowest Position (asc)
        const playableMatches = matches.filter((m: ArenaMatch) => m.player1 && m.player2 && !m.winner);
        
        playableMatches.sort((a: ArenaMatch, b: ArenaMatch) => {
            if (a.round !== b.round) return b.round - a.round; // Highest round first
            return a.position - b.position; // Lowest position first
        });

        const target = playableMatches.length > 0 ? playableMatches[0] : null;
        setActiveMatch(target);
        setLoading(false);
      });

    return () => unsub();
  }, [contextId]);

  const getRoleIcon = (role?: RoleType) => {
      if (!role) return null;
      switch(role) {
          case RoleType.DPS: return <Swords size={32} />;
          case RoleType.TANK: return <Shield size={32} />;
          case RoleType.HEALER: return <Heart size={32} />;
          case RoleType.HYBRID: return <Zap size={32} />;
      }
  };

  const getRoleLabel = (role?: RoleType) => role || 'Fighter';

  if (loading) {
      return (
          <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
              <Loader2 className="animate-spin text-red-600" size={64} />
          </div>
      );
  }

  if (!activeMatch || !activeMatch.player1 || !activeMatch.player2) {
      return (
          <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 via-black to-black"></div>
              <div className="z-10 text-center animate-pulse">
                  <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-500 to-zinc-800 uppercase tracking-widest italic">
                      STANDBY
                  </h1>
                  <p className="text-zinc-500 mt-4 font-mono tracking-widest text-xl">WAITING FOR NEXT BATTLE</p>
              </div>
              {/* Background Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] perspective-container transform rotate-x-60 scale-150 opacity-20"></div>
          </div>
      );
  }

  const p1 = activeMatch.player1;
  const p2 = activeMatch.player2;

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative font-sans select-none">
        
        {/* === PLAYER 1 SIDE (LEFT) === */}
        <div className="absolute inset-y-0 left-0 w-[55%] z-10 overflow-hidden bg-zinc-900">
            {/* Background Image / Color */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-950 to-black"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
            
            {/* Animated Glow */}
            <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10 animate-pulse"></div>

            {/* Character Portrait */}
            <div className="absolute bottom-0 left-0 h-[110%] w-full flex items-end justify-center transform -translate-x-10 translate-y-10">
                 <img 
                    src={p1.photoURL || 'https://via.placeholder.com/800'} 
                    className="h-full w-auto object-cover max-w-none opacity-0 animate-hero-entrance filter contrast-125 brightness-110 drop-shadow-[0_0_50px_rgba(37,99,235,0.5)]"
                    style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
                 />
            </div>

            {/* Content Clip */}
            <div className="absolute inset-0 z-20" style={{ clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)', background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 100%)' }}>
                <div className="absolute bottom-20 left-10 md:left-20">
                    <div className="flex items-center gap-3 text-blue-400 mb-2 opacity-0 animate-in slide-in-from-left duration-700 delay-500 fill-mode-forwards">
                        {getRoleIcon(p1.role)}
                        <span className="text-2xl font-bold uppercase tracking-[0.2em]">{getRoleLabel(p1.role)}</span>
                    </div>
                    <h1 className="text-7xl md:text-9xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-lg opacity-0 animate-in slide-in-from-left duration-700 delay-300 fill-mode-forwards transform -skew-x-6">
                        {p1.displayName}
                    </h1>
                    <div className="h-2 w-64 bg-blue-500 mt-4 skew-x-12 shadow-[0_0_20px_rgba(59,130,246,0.8)] opacity-0 animate-in fade-in duration-1000 delay-700 fill-mode-forwards"></div>
                </div>
            </div>
        </div>

        {/* === PLAYER 2 SIDE (RIGHT) === */}
        <div className="absolute inset-y-0 right-0 w-[55%] z-10 overflow-hidden bg-zinc-900" style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)' }}>
            {/* Background Image / Color */}
            <div className="absolute inset-0 bg-gradient-to-bl from-red-950 to-black"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>

            {/* Animated Glow */}
            <div className="absolute top-0 right-0 w-full h-full bg-red-600/10 animate-pulse" style={{ animationDelay: '1s' }}></div>

            {/* Character Portrait */}
            <div className="absolute bottom-0 right-0 h-[110%] w-full flex items-end justify-center transform translate-x-10 translate-y-10">
                 <img 
                    src={p2.photoURL || 'https://via.placeholder.com/800'} 
                    className="h-full w-auto object-cover max-w-none opacity-0 animate-hero-entrance filter contrast-125 brightness-110 drop-shadow-[0_0_50px_rgba(220,38,38,0.5)]"
                    style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
                 />
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 z-20 bg-gradient-to-l from-black/40 to-transparent">
                <div className="absolute top-20 right-10 md:right-20 text-right flex flex-col items-end">
                    <div className="flex items-center gap-3 text-red-500 mb-2 opacity-0 animate-in slide-in-from-right duration-700 delay-500 fill-mode-forwards">
                        <span className="text-2xl font-bold uppercase tracking-[0.2em]">{getRoleLabel(p2.role)}</span>
                        {getRoleIcon(p2.role)}
                    </div>
                    <h1 className="text-7xl md:text-9xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-lg opacity-0 animate-in slide-in-from-right duration-700 delay-300 fill-mode-forwards transform -skew-x-6">
                        {p2.displayName}
                    </h1>
                    <div className="h-2 w-64 bg-red-600 mt-4 -skew-x-12 shadow-[0_0_20px_rgba(220,38,38,0.8)] opacity-0 animate-in fade-in duration-1000 delay-700 fill-mode-forwards"></div>
                </div>
            </div>
        </div>

        {/* === CENTER VS ELEMENT === */}
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            {/* Lightning / Energy Line */}
            <div className="absolute h-[120%] w-2 bg-white rotate-12 blur-md opacity-80 shadow-[0_0_30px_white] animate-pulse"></div>
            <div className="absolute h-[120%] w-1 bg-yellow-300 rotate-12 blur-sm opacity-90 mix-blend-screen"></div>

            {/* VS Circle */}
            <div className="relative">
                <div className="absolute -inset-20 bg-orange-500/20 rounded-full blur-[100px] animate-pulse"></div>
                
                {/* Metallic VS Text */}
                <div className="relative transform scale-[2] md:scale-[3] opacity-0 animate-in zoom-in duration-300 delay-700 fill-mode-forwards drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-orange-400 to-red-600 italic tracking-tighter" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.1)' }}>
                        VS
                    </span>
                    {/* Lightning overlay */}
                    <div className="absolute inset-0 bg-yellow-400 mix-blend-overlay opacity-50 blur-sm animate-pulse"></div>
                </div>
            </div>
        </div>

        {/* Round Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-black/50 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full">
                <span className="text-white/80 font-bold tracking-[0.5em] text-lg uppercase">
                    {activeMatch.isThirdPlace ? "3rd Place Match" : `Round ${activeMatch.round}`}
                </span>
            </div>
        </div>

    </div>
  );
};

export default VsScreen;
