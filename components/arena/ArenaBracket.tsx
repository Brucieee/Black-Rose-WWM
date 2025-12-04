import React, { useRef, useState } from 'react';
import { ArenaMatch, ArenaParticipant, RoleType } from '../../types';
import { Trophy, Crown, X, Plus, Minus, RotateCcw, RefreshCw, Eye, Radio, Square, Maximize } from 'lucide-react';

interface ArenaBracketProps {
  matches: ArenaMatch[];
  canManage: boolean;
  arenaMinPoints: number;
  isCustomMode: boolean;
  activeStreamMatchId?: string;
  activeBannerMatchId?: string;
  onDeclareWinner: (match: ArenaMatch, winner: ArenaParticipant) => void;
  onClearSlot: (e: React.MouseEvent, matchId: string, slot: 'player1' | 'player2') => void;
  onDrop: (e: React.DragEvent, match: ArenaMatch, slot: 'player1' | 'player2') => void;
  onViewProfile: (uid: string) => void;
  onPreviewMatch: (match: ArenaMatch) => void;
  onPreviewBanner?: (match: ArenaMatch) => void;
}

export const ArenaBracket: React.FC<ArenaBracketProps> = ({
  matches, canManage, arenaMinPoints, isCustomMode, activeStreamMatchId, activeBannerMatchId,
  onDeclareWinner, onClearSlot, onDrop, onViewProfile, onPreviewMatch, onPreviewBanner
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleDragOver = (e: React.DragEvent) => { if (canManage) e.preventDefault(); };

  const getRoleBadge = (role?: RoleType) => {
      if (!role) return null;
      switch (role) {
          case RoleType.DPS: return <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-bold tracking-wide">DPS</span>;
          case RoleType.TANK: return <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 font-bold tracking-wide">TANK</span>;
          case RoleType.HEALER: return <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-bold tracking-wide">HEALER</span>;
          case RoleType.HYBRID: return <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold tracking-wide">HYBRID</span>;
          default: return null;
      }
  };

  const renderMatch = (match: ArenaMatch) => {
    const isStreamLive = activeStreamMatchId === match.id;
    const isBannerLive = activeBannerMatchId === match.id;

    const renderPlayer = (player: ArenaParticipant | null, slot: 'player1' | 'player2') => {
        const isWinner = match.winner?.uid === player?.uid;
        const isInteractive = !!player;

        const handleClick = (e: React.MouseEvent) => {
            if (!player) return;
            if (canManage && !match.winner) onDeclareWinner(match, player);
            else onViewProfile(player.uid);
        };

        return (
            <div 
                onDragOver={handleDragOver}
                onDrop={(e) => onDrop(e, match, slot)}
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
                        <div className="flex flex-col min-w-0">
                             <span className={`text-sm truncate font-medium leading-none mb-0.5 ${isWinner ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>{player.displayName}</span>
                             <div className="flex items-center gap-1">
                                {getRoleBadge(player.role)}
                             </div>
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-zinc-400 italic">Empty Slot</span>
                )}
                <div className="flex items-center gap-1">
                  {isWinner && <Crown size={14} className="text-yellow-500 fill-yellow-500" />}
                  {canManage && player && (
                      <button onClick={(e) => onClearSlot(e, match.id, slot)} className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div key={match.id} className="match-card match-card-3d relative flex items-center z-10 w-full mb-8 last:mb-0 perspective-container">
            <div className={`bg-zinc-50 dark:bg-zinc-950 border ${match.isThirdPlace ? 'border-orange-300 dark:border-orange-800 bg-white dark:bg-black' : isStreamLive ? 'border-red-500 ring-2 ring-red-500/50 shadow-red-500/20' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg p-2 w-64 shadow-sm group relative z-20 transition-all`}>
                {canManage && match.player1 && match.player2 && (
                    <div className="absolute -top-3 -right-3 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onPreviewMatch(match); }}
                            className={`p-1.5 rounded-full shadow-md border transition-all ${
                                isStreamLive 
                                ? 'bg-red-600 text-white border-red-500 animate-pulse' 
                                : 'bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700'
                            }`}
                            title={isStreamLive ? "Currently Streaming" : "Broadcast to Stream Screen"}
                        >
                            {isStreamLive ? <Radio size={14} /> : <Eye size={14} />}
                        </button>
                        {onPreviewBanner && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onPreviewBanner(match); }}
                                className={`p-1.5 rounded-full shadow-md border transition-all ${
                                    isBannerLive
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700'
                                }`}
                                title={isBannerLive ? "Currently on Banner" : "Broadcast to Match Banner"}
                            >
                                <Maximize size={14} />
                            </button>
                        )}
                    </div>
                )}
                
                {match.isThirdPlace && <div className="text-[10px] text-orange-600 dark:text-orange-500 text-center font-bold uppercase mb-1">3rd Place Match</div>}
                {renderPlayer(match.player1, 'player1')}
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center font-black py-0.5 tracking-wider">VS</div>
                {renderPlayer(match.player2, 'player2')}
            </div>
            
            {!match.isThirdPlace && match.round < maxRound && (
                <div className={`absolute left-full top-1/2 w-16 h-[calc(100%+2rem)] -translate-y-1/2 pointer-events-none z-10`}>
                    <div className="absolute top-1/2 left-0 w-8 h-[2px] bg-zinc-300 dark:bg-zinc-700"></div>
                    {match.position % 2 === 0 ? (
                        <div className="absolute top-1/2 left-8 w-[2px] h-[calc(50%+1rem)] bg-zinc-300 dark:bg-zinc-700 origin-top"></div>
                    ) : (
                        <div className="absolute bottom-1/2 left-8 w-[2px] h-[calc(50%+1rem)] bg-zinc-300 dark:bg-zinc-700 origin-bottom"></div>
                    )}
                </div>
            )}
            
            {!match.isThirdPlace && match.round > 1 && (
                 <div className="absolute right-full top-1/2 w-8 h-[2px] bg-zinc-300 dark:bg-zinc-700 -translate-y-1/2 z-10"></div>
            )}
        </div>
    );
  };

  const regularMatches = matches.filter(m => !m.isThirdPlace);
  const thirdPlaceMatch = matches.find(m => m.isThirdPlace);
  const maxRound = regularMatches.length > 0 ? Math.max(...regularMatches.map(m => m.round)) : 3;
  const rounds = Array.from({ length: maxRound }, (_, i) => ({ 
      id: i + 1, 
      name: i + 1 === maxRound ? 'Finals' : (i + 1 === maxRound - 1 ? 'Semi-Finals' : `Round ${i + 1}`) 
  }));

  const round1MatchCount = matches.filter(m => m.round === 1).length || 1;
  const minContainerHeight = Math.max(800, round1MatchCount * 140);

  return (
    <div 
        className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col z-0 min-h-0"
        ref={containerRef}
    >
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex items-center justify-between z-10 relative">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Trophy size={18} className="text-rose-900 dark:text-rose-500" /> Tournament Bracket
            </h3>
            {arenaMinPoints > 0 && !isCustomMode && <span className="text-xs text-zinc-500">Min Points: {arenaMinPoints}</span>}
        </div>

        <div className="absolute top-16 right-4 z-20 flex flex-col gap-2 bg-white dark:bg-zinc-800 p-2 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
            <button onClick={zoomIn} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300"><Plus size={20} /></button>
            <button onClick={zoomOut} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300"><Minus size={20} /></button>
            <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1"></div>
            <button onClick={resetView} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300" title="Reset View"><RotateCcw size={16} /></button>
        </div>
        
        <div 
            className={`flex-1 overflow-hidden relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] bg-zinc-50/30 dark:bg-black/20`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
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
  );
};