
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { RoleType, WEAPON_LIST, Weapon, WEAPON_ROLE_MAP, Guild } from '../types';
import { Check, Sword, Shield, Cross, Zap, Edit2, AlertTriangle, Building2, Facebook, Mail, Lock, User, Hash } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { useAlert } from '../contexts/AlertContext';
import { PRESET_AVATARS } from '../services/mockData';
import { AvatarSelectionModal } from '../components/modals/AvatarSelectionModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';

const { useNavigate } = ReactRouterDOM as any;

const Register: React.FC = () => {
  const { currentUser, signInWithGoogle, login, signup } = useAuth();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    inGameId: '',
    role: RoleType.DPS,
    guildId: '',
  });
  
  const [selectedWeapons, setSelectedWeapons] = useState<Weapon[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(PRESET_AVATARS[0]);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Guild Selection State
  const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);
  const [tempSelectedGuild, setTempSelectedGuild] = useState<Guild | null>(null);

  useEffect(() => {
    const fetchGuilds = async () => {
      // FIX: Use Firebase v8 compat syntax
      const q = db.collection("guilds").orderBy("name");
      const snapshot = await q.get();
      const guildsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Guild[];
      setGuilds(guildsData);
    };
    fetchGuilds();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({ ...prev, displayName: currentUser.displayName || '' }));
      if (currentUser.photoURL) {
          if (PRESET_AVATARS.includes(currentUser.photoURL)) {
             setSelectedAvatar(currentUser.photoURL);
          }
      }
    }
  }, [currentUser]);

  const getFirebaseErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/invalid-credential': return 'Incorrect email or password.';
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/email-already-in-use': return 'Email is already registered.';
      case 'auth/weak-password': return 'Password should be at least 6 characters.';
      case 'auth/network-request-failed': return 'Network error. Check your connection.';
      default: return 'An unexpected error occurred. Please try again.';
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLoginMode) {
        setIsRedirecting(true); // Set loading immediately to prevent flash
        await login(authEmail, authPass);
        navigate('/', { replace: true });
      } else {
        await signup(authEmail, authPass);
      }
    } catch (error: any) {
      setIsRedirecting(false); // Reset on error
      const msg = getFirebaseErrorMessage(error.code);
      showAlert(msg, 'error', isLoginMode ? "Login Failed" : "Sign Up Failed");
    }
  };

  const getAvailableWeapons = (role: RoleType): Weapon[] => {
    if (role === RoleType.HYBRID) {
      return [...WEAPON_LIST];
    }
    return WEAPON_LIST.filter(weapon => {
      const allowedRoles = WEAPON_ROLE_MAP[weapon];
      return allowedRoles && allowedRoles.includes(role);
    });
  };

  useEffect(() => {
    const available = getAvailableWeapons(formData.role);
    const validSelections = selectedWeapons.filter(w => available.includes(w));
    if (validSelections.length !== selectedWeapons.length) {
      setSelectedWeapons(validSelections);
    }
  }, [formData.role, selectedWeapons]);

  const handleWeaponToggle = (weapon: Weapon) => {
    if (selectedWeapons.includes(weapon)) {
      setSelectedWeapons(prev => prev.filter(w => w !== weapon));
    } else {
      if (selectedWeapons.length < 2) {
        setSelectedWeapons(prev => [...prev, weapon]);
      }
    }
  };

  const handleInGameIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
      setFormData({...formData, inGameId: val});
  };

  const handleGuildClick = (guild: Guild) => {
      if (formData.guildId === guild.id) return;
      setTempSelectedGuild(guild);
      setIsGuildModalOpen(true);
  };

  const handleConfirmGuild = () => {
      if (tempSelectedGuild) {
          setFormData(prev => ({ ...prev, guildId: tempSelectedGuild.id }));
          setIsGuildModalOpen(false);
          setTempSelectedGuild(null);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guildId) {
        showAlert("Please select a Guild Branch.", 'error');
        return;
    }
    if (selectedWeapons.length !== 2) {
      showAlert("Please select exactly 2 Martial Arts.", 'error');
      return;
    }
    if (formData.inGameId.length !== 10) {
        showAlert("In-Game ID must be exactly 10 digits.", 'error');
        return;
    }

    if (!currentUser) {
      showAlert("Please sign in first.", 'error');
      return;
    }

    try {
      const userDocRef = db.collection("users").doc(currentUser.uid);
      await userDocRef.set({
        uid: currentUser.uid,
        inGameId: formData.inGameId,
        displayName: formData.displayName,
        role: formData.role,
        weapons: selectedWeapons,
        guildId: formData.guildId,
        photoURL: selectedAvatar,
        status: 'online',
        lastSeen: new Date().toISOString(),
        email: currentUser.email,
        systemRole: 'Member'
      });

      showAlert("Profile Created Successfully!", 'success', "Welcome!");
      navigate('/');
    } catch (error) {
      console.error("Error creating profile:", error);
      showAlert("Failed to save profile.", 'error');
    }
  };

  const roleColors = {
    [RoleType.DPS]: 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20',
    [RoleType.TANK]: 'border-yellow-600 text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20',
    [RoleType.HEALER]: 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20',
    [RoleType.HYBRID]: 'border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-900/20'
  };

  const roleIcons = {
    [RoleType.DPS]: <Sword className="w-5 h-5 mb-1" />,
    [RoleType.TANK]: <Shield className="w-5 h-5 mb-1" />,
    [RoleType.HEALER]: <Cross className="w-5 h-5 mb-1" />,
    [RoleType.HYBRID]: <Zap className="w-5 h-5 mb-1" />,
  };

  const availableWeapons = getAvailableWeapons(formData.role);

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
           <div className="w-16 h-16 border-4 border-rose-900 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-zinc-500 animate-pulse font-medium">Entering the Guild...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-4xl relative z-10">
        {!currentUser ? (
          /* --- LOGIN / SIGNUP CARD --- */
          <div className="max-w-md mx-auto w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            
            {/* Logo Header */}
            <div className="pt-8 pb-4 text-center">
               <div className="w-32 h-32 mx-auto mb-4 relative transition-transform duration-700 hover:scale-105">
                  <img src="https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/logo/br-black.png" alt="Logo" className="w-full h-full object-contain dark:hidden drop-shadow-lg" />
                  <img src="https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/logo/br-white.png" alt="Logo" className="w-full h-full object-contain hidden dark:block drop-shadow-lg" />
               </div>
               <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">BLACK ROSE</h1>
               <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium tracking-widest uppercase mt-1">Guild</p>
            </div>

            {/* Switcher */}
            <div className="px-8 mb-6">
              <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl relative">
                <div 
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-lg shadow-sm transition-all duration-300 ease-in-out ${isLoginMode ? 'left-1' : 'left-[calc(50%+4px)]'}`}
                ></div>
                <button 
                  onClick={() => setIsLoginMode(true)}
                  className={`flex-1 py-2.5 text-sm font-bold relative z-10 transition-colors ${isLoginMode ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setIsLoginMode(false)}
                  className={`flex-1 py-2.5 text-sm font-bold relative z-10 transition-colors ${!isLoginMode ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  Create Account
                </button>
              </div>
            </div>

            <div className="px-8 pb-8">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="email" 
                      required 
                      className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-400"
                      placeholder="name@example.com"
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="password" 
                      required 
                      className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-400"
                      placeholder="••••••••"
                      value={authPass}
                      onChange={e => setAuthPass(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-rose-900 hover:bg-rose-950 text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-rose-900/20 hover:shadow-rose-900/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  {isLoginMode ? 'Enter Guild' : 'Join the Ranks'}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Or</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={async () => {
                      setIsRedirecting(true);
                      await signInWithGoogle();
                      navigate('/');
                  }} 
                  className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors font-medium text-sm group"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
                  Continue with Google
                </button>

                <a 
                  href="https://www.facebook.com/BlackRoseHQ" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] text-white py-3 rounded-xl transition-colors font-medium text-sm group shadow-lg shadow-blue-900/20"
                >
                  <Facebook size={20} className="group-hover:scale-110 transition-transform" />
                  Follow us on Facebook
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* --- PROFILE CREATION UI --- */
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl border border-white/20 dark:border-zinc-800 animate-in slide-in-from-bottom-8 duration-700">
             <div className="mb-8 text-center">
                <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Profile Setup</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-2">Complete your identity to access the guild network.</p>
             </div>

             <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Col: Info */}
                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">In-Game Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                <input 
                                  type="text" 
                                  required
                                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all placeholder:text-zinc-400"
                                  placeholder="Character Name"
                                  value={formData.displayName}
                                  onChange={e => setFormData({...formData, displayName: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">In-Game ID (10 Digits)</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                <input 
                                  type="text" 
                                  required
                                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all font-mono placeholder:text-zinc-400"
                                  placeholder="e.g. 4022284874"
                                  value={formData.inGameId}
                                  onChange={handleInGameIdChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Select Guild Branch</label>
                             {guilds.length === 0 ? (
                                <div className="text-sm text-red-500 border border-red-200 bg-red-50 p-3 rounded-xl">System Not Initialized. Contact Admin.</div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {guilds.map(g => {
                                        const isSelected = formData.guildId === g.id;
                                        return (
                                            <button
                                                key={g.id}
                                                type="button"
                                                onClick={() => handleGuildClick(g)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                                                    isSelected
                                                    ? 'bg-rose-900 text-white border-rose-900 shadow-md ring-2 ring-rose-900/20 transform scale-[1.02]'
                                                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-rose-500/50 hover:bg-white dark:hover:bg-zinc-700'
                                                }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Building2 size={16} className={isSelected ? 'text-white' : 'text-zinc-400'} />
                                                    {g.name}
                                                </span>
                                                {isSelected && <Check size={16} className="text-white" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <p className="text-[10px] text-zinc-400 ml-1 italic">* Selection is locked upon confirmation.</p>
                        </div>
                    </div>

                    {/* Right Col: Avatar & Role */}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                          <label className="text-xs font-bold text-zinc-500 uppercase mb-3">Profile Avatar</label>
                          <div className="relative group">
                              <button 
                                type="button" 
                                onClick={() => setIsAvatarModalOpen(true)}
                                className="w-28 h-28 rounded-full border-4 border-white dark:border-zinc-700 shadow-xl overflow-hidden hover:scale-105 transition-transform duration-300 ring-4 ring-transparent hover:ring-rose-500/20"
                              >
                                  <img src={selectedAvatar} alt="Selected" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit2 size={24} className="text-white" />
                                  </div>
                              </button>
                              <div className="absolute bottom-0 right-0 bg-rose-900 text-white p-1.5 rounded-full border-2 border-white dark:border-zinc-800 shadow-lg pointer-events-none">
                                <Edit2 size={12} />
                              </div>
                          </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Combat Role</label>
                            <div className="grid grid-cols-4 gap-2">
                              {(Object.values(RoleType) as RoleType[]).map((role) => (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => setFormData({...formData, role})}
                                  className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                                    formData.role === role 
                                      ? roleColors[role] + ' ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-opacity-60 scale-105' 
                                      : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700'
                                  }`}
                                >
                                  {roleIcons[role]}
                                  <span className="text-[10px] font-bold mt-1">{role}</span>
                                </button>
                              ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Weapons */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Select Martial Arts (2)</label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedWeapons.length === 2 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                          {selectedWeapons.length} / 2
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {WEAPON_LIST.map((weapon) => {
                        const isSelected = selectedWeapons.includes(weapon);
                        const isAvailable = availableWeapons.includes(weapon);
                        const isDisabled = !isAvailable || (!isSelected && selectedWeapons.length >= 2);
                        
                        return (
                          <button
                            key={weapon}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleWeaponToggle(weapon)}
                            className={`px-3 py-2.5 rounded-lg border text-left text-xs font-bold transition-all flex items-center justify-between ${
                              isSelected 
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 shadow-sm' 
                                : !isAvailable
                                  ? 'opacity-40 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400'
                                  : isDisabled 
                                      ? 'opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'
                                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-600 dark:text-zinc-300'
                            }`}
                          >
                            <span className="truncate">{weapon}</span>
                            {isSelected && <Check size={12} className="flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:transform-none"
                  disabled={!currentUser}
                >
                  Confirm Profile
                </button>
             </form>
          </div>
        )}
      </div>

      <AvatarSelectionModal 
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        selectedAvatar={selectedAvatar}
        onSelect={setSelectedAvatar}
      />

      <ConfirmationModal 
        isOpen={isGuildModalOpen}
        onClose={() => setIsGuildModalOpen(false)}
        onConfirm={handleConfirmGuild}
        title={`Join ${tempSelectedGuild?.name}?`}
        message="This selection is final. If you wish to change your branch later, you will need to contact an Officer or Admin."
        confirmText="Confirm Branch"
        type="warning"
      />
    </div>
  );
};

export default Register;
