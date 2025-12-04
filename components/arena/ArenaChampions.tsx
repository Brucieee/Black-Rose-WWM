
import React from 'react';
import { ArenaMatch, ArenaParticipant, RoleType } from '../../types';
import { Sparkles, Trash2, Crown, X, Clock } from 'lucide-react';

interface ArenaChampionsProps {
  firstPlace: any;
  secondPlace: any;
  thirdPlace: any;
  canManage: boolean;
  showStandardBanner: boolean;
  showOverlayBanner: boolean;
  userActiveMatch: ArenaMatch | null;
  currentUser: any;
  isChampionBannerVisible: boolean;
  onRemoveChampion: () => void;
  onViewProfile: (uid: string) => void;
  onCloseBanner: () => void;
}

export const ArenaChampions: React.FC<ArenaChampionsProps> = ({
  firstPlace, secondPlace, thirdPlace, canManage, showStandardBanner, showOverlayBanner,
  userActiveMatch, currentUser, isChampionBannerVisible,
  onRemoveChampion, onViewProfile, onCloseBanner
}) => {

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

  const renderActiveMatchBanner = () => {
      if (!userActiveMatch) return null;
      const opponent = userActiveMatch.player1?.uid === currentUser?.uid ? userActiveMatch.player2 : userActiveMatch.player1;
      const userPlayer = userActiveMatch.player1?.uid === currentUser?.uid ? userActiveMatch.player1 : userActiveMatch.player2;

      return (
          <div className="fixed bottom-0 left-0 right-0 z-40 w-full md:pl-64 h-36 md:h-44 bg-zinc-950 overflow-hidden border-t border-zinc-800 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-950/60 via-black to-red-950/60 z-0"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/10 via-transparent to-transparent z-0"></div>
              
              <div className="relative z-10 flex items-center justify-between h-full w-full max-w-[95%] mx-auto">
                  
                  <div className="flex-1 flex items-center justify-end gap-4 min-w-0 pr-4 md:pr-12 animate-in slide-in-from-left duration-700">
                      <div className="flex-col items-end hidden md:flex min-w-0 shrink">
                          <h3 className="font-black text-white text-xl md:text-4xl uppercase italic tracking-tighter leading-none truncate w-full text-right drop-shadow-md pr-4 py-1" title={userPlayer?.displayName}>
                              {userPlayer?.displayName}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">YOU</p>
                              {getRoleBadge(userPlayer?.role)}
                          </div>
                      </div>
                      
                      <div 
                        className="relative group shrink-0 cursor-pointer"
                        onClick={() => userPlayer && onViewProfile(userPlayer.uid)}
                      >
                          <div className="absolute -inset-3 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/40 transition-all duration-500"></div>
                          <div className="relative w-16 h-16 md:w-28 md:h-28 rounded-full border-4 border-blue-500/50 group-hover:border-blue-400 transition-colors z-10 bg-zinc-900 overflow-hidden shadow-2xl">
                              <img src={userPlayer?.photoURL || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                          </div>
                      </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-center justify-center z-20 mx-4">
                      <div className="relative px-6">
                          <span className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 tracking-tighter drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] animate-pulse block transform -skew-x-12">
                              VS
                          </span>
                      </div>
                      <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-500 to-transparent mt-2 opacity-50"></div>
                      <span className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-[0.5em] mt-2">Matchup</span>
                  </div>

                  <div className="flex-1 flex items-center justify-start gap-4 min-w-0 pl-4 md:pl-12 animate-in slide-in-from-right duration-700">
                      {opponent ? (
                          <>
                              <div 
                                className="relative group shrink-0 cursor-pointer"
                                onClick={() => onViewProfile(opponent.uid)}
                              >
                                  <div className="absolute -inset-3 bg-red-500/20 rounded-full blur-xl group-hover:bg-red-500/40 transition-all duration-500"></div>
                                  <div className="relative w-16 h-16 md:w-28 md:h-28 rounded-full border-4 border-red-500/50 group-hover:border-red-400 transition-colors z-10 bg-zinc-900 overflow-hidden shadow-2xl">
                                      <img src={opponent.photoURL || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                                  </div>
                              </div>

                              <div className="flex-col items-start hidden md:flex min-w-0 shrink">
                                  <h3 className="font-black text-white text-xl md:text-4xl uppercase italic tracking-tighter leading-none truncate w-full text-left drop-shadow-md pr-4 py-1" title={opponent.displayName}>
                                      {opponent.displayName}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-2">
                                      {getRoleBadge(opponent.role)}
                                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-[0.2em]">OPPONENT</p>
                                  </div>
                              </div>
                          </>
                      ) : (
                          <div className="flex items-center gap-4 opacity-50 min-w-0">
                              <div className="w-16 h-16 md:w-28 md:h-28 rounded-full border-4 border-dashed border-zinc-700 bg-zinc-900/50 flex items-center justify-center shrink-0">
                                  <Clock className="text-zinc-500 animate-spin-slow" size={32} />
                              </div>
                              <div className="flex-col items-start hidden md:flex">
                                  <h3 className="font-bold text-zinc-500 text-xl uppercase italic tracking-wider">Waiting...</h3>
                                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Searching for opponent</p>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <>
      {showStandardBanner && (
          <div className="mb-4 relative overflow-hidden rounded-xl bg-gradient-to-r from-zinc-900 to-black p-[2px] shadow-lg border border-zinc-800 max-h-[180px] flex-shrink-0">
              <div className="bg-zinc-950 px-4 pt-10 pb-4 rounded-[10px] flex items-center justify-center relative overflow-hidden h-full">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-zinc-950 to-zinc-950"></div>
                  <Sparkles className="absolute top-4 left-10 text-yellow-500/20" size={24} />
                  <Sparkles className="absolute bottom-4 right-10 text-yellow-500/20" size={40} />

                  <div className="relative z-10 flex items-end gap-6 md:gap-16 scale-90 origin-bottom">
                      {secondPlace && (
                          <div className="flex flex-col items-center group cursor-pointer" onClick={() => onViewProfile(secondPlace.uid)}>
                              <div className="relative mb-2">
                                  <img src={secondPlace.photoURL || 'https://via.placeholder.com/150'} className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-zinc-400 object-cover shadow-lg" />
                                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-400 text-black text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-md">#2</div>
                              </div>
                              <h3 className="font-bold text-zinc-300 text-xs md:text-sm mt-3">{secondPlace.displayName}</h3>
                          </div>
                      )}

                      {firstPlace && (
                          <div className="flex flex-col items-center -mt-8 group cursor-pointer" onClick={() => onViewProfile(firstPlace.uid)}>
                              <div className="relative mb-3">
                                  <div className="absolute -inset-4 bg-yellow-500/30 rounded-full blur-xl animate-pulse"></div>
                                  <img src={firstPlace.photoURL || 'https://via.placeholder.com/150'} className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-yellow-500 object-cover shadow-2xl z-10" />
                                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-sm font-black px-3 py-0.5 rounded-full border-2 border-white shadow-lg z-20">#1</div>
                              </div>
                              <h2 className="font-black text-white text-sm md:text-lg uppercase tracking-wide text-center drop-shadow-md">{firstPlace.displayName}</h2>
                          </div>
                      )}

                      {thirdPlace && (
                          <div className="flex flex-col items-center group cursor-pointer" onClick={() => onViewProfile(thirdPlace.uid)}>
                              <div className="relative mb-2">
                                  <img src={thirdPlace.photoURL || 'https://via.placeholder.com/150'} className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-orange-700 object-cover shadow-lg" />
                                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-700 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-md">#3</div>
                              </div>
                              <h3 className="font-bold text-zinc-300 text-xs md:text-sm mt-3">{thirdPlace.displayName}</h3>
                          </div>
                      )}
                  </div>

                  {canManage && (
                        <button 
                            onClick={onRemoveChampion}
                            className="absolute top-2 right-2 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white p-1.5 rounded-full backdrop-blur-sm transition-colors z-20 shadow-lg border border-zinc-700"
                            title="Remove Champions"
                        >
                            <Trash2 size={12} />
                        </button>
                  )}
              </div>
          </div>
      )}

      {renderActiveMatchBanner()}

      {showOverlayBanner && firstPlace && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none perspective-container">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-500 pointer-events-auto" onClick={() => {}}></div>
              <button 
                  onClick={onCloseBanner}
                  className="absolute top-8 right-8 z-50 text-white/50 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors pointer-events-auto"
              >
                  <X size={32} />
              </button>

              <div className="relative w-full max-w-4xl p-10 flex flex-col items-center justify-center pointer-events-auto animate-hero-entrance">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500%] h-[500%] opacity-30 pointer-events-none">
                      <div className="w-full h-full bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(234,179,8,0.1)_20deg,transparent_40deg,rgba(234,179,8,0.1)_60deg,transparent_80deg,rgba(234,179,8,0.1)_100deg,transparent_120deg,rgba(234,179,8,0.1)_140deg,transparent_160deg,rgba(234,179,8,0.1)_180deg,transparent_200deg,rgba(234,179,8,0.1)_220deg,transparent_240deg,rgba(234,179,8,0.1)_260deg,transparent_280deg,rgba(234,179,8,0.1)_300deg,transparent_320deg,rgba(234,179,8,0.1)_340deg,transparent_360deg)] animate-spin-slow"></div>
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center animate-hero-float">
                      <Crown size={80} className="text-yellow-400 mb-6 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)] fill-yellow-400" />
                      
                      <div className="relative group cursor-pointer hover:scale-105 transition-transform duration-500" onClick={() => onViewProfile(firstPlace.uid)}>
                          <div className="absolute -inset-10 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-full blur-2xl opacity-60 animate-pulse"></div>
                          <img src={firstPlace.photoURL || 'https://via.placeholder.com/150'} className="relative w-56 h-56 rounded-full border-8 border-yellow-400 object-cover shadow-[0_0_80px_rgba(234,179,8,0.6)] z-10" />
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xl font-black px-8 py-2 rounded-full border-4 border-white/20 shadow-xl z-20 uppercase tracking-widest whitespace-nowrap transform translate-z-10">Champion</div>
                      </div>
                      
                      <h2 className="mt-16 text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-yellow-100 to-yellow-500 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] uppercase tracking-widest text-center px-4 leading-none">
                          {firstPlace.displayName}
                      </h2>
                      
                      <div className="mt-4 flex flex-col items-center gap-2">
                          <p className="text-2xl text-yellow-500 font-bold uppercase tracking-[0.3em] text-center drop-shadow-md">
                              TOURNAMENT WINNER
                          </p>
                          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mt-2"></div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};
