
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { RoleType, WEAPON_LIST, Weapon, WEAPON_ROLE_MAP, Guild } from '../types';
import { Check, Sword, Shield, Cross, Zap, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { useAlert } from '../contexts/AlertContext';
import { PRESET_AVATARS } from '../services/mockData';
import { AvatarSelectionModal } from '../components/modals/AvatarSelectionModal';

const { useNavigate } = ReactRouterDOM as any;

const Register: React.FC = () => {
  const { currentUser, signInWithGoogle, login, signup } = useAuth();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');

  const [formData, setFormData] = useState({
    displayName: '',
    inGameId: '',
    role: RoleType.DPS,
    guildId: '',
  });
  
  const [selectedWeapons, setSelectedWeapons] = useState<Weapon[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(PRESET_AVATARS[0]);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    const fetchGuilds = async () => {
      // FIX: Use Firebase v8 compat syntax
      const q = db.collection("guilds").orderBy("name");
      const snapshot = await q.get();
      const guildsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Guild[];
      setGuilds(guildsData);
      if (guildsData.length > 0) {
        setFormData(prev => ({ ...prev, guildId: guildsData[0].id }));
      }
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
        await login(authEmail, authPass);
      } else {
        await signup(authEmail, authPass);
      }
      navigate('/');
    } catch (error: any) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // FIX: Use Firebase v8 compat syntax
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
    [RoleType.DPS]: 'border-red-500 text-red-600 bg-red-50',
    [RoleType.TANK]: 'border-yellow-600 text-yellow-700 bg-yellow-50',
    [RoleType.HEALER]: 'border-green-500 text-green-600 bg-green-50',
    [RoleType.HYBRID]: 'border-purple-500 text-purple-600 bg-purple-50'
  };

  const roleIcons = {
    [RoleType.DPS]: <Sword className="w-5 h-5 mb-1" />,
    [RoleType.TANK]: <Shield className="w-5 h-5 mb-1" />,
    [RoleType.HEALER]: <Cross className="w-5 h-5 mb-1" />,
    [RoleType.HYBRID]: <Zap className="w-5 h-5 mb-1" />,
  };

  const availableWeapons = getAvailableWeapons(formData.role);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Join the Black Rose</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">Complete your profile to access the guild network.</p>
      </div>

      {!currentUser ? (
        <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
            <button 
              onClick={() => setIsLoginMode(true)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${isLoginMode ? 'border-rose-900 text-rose-900 dark:text-rose-500' : 'border-transparent text-zinc-500'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsLoginMode(false)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${!isLoginMode ? 'border-rose-900 text-rose-900 dark:text-rose-500' : 'border-transparent text-zinc-500'}`}
            >
              Sign Up
            </button>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-1">Email</label>
              <input 
                type="email" 
                required 
                className="w-full px-4 py-2 border rounded-lg bg-white text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-1">Password</label>
              <input 
                type="password" 
                required 
                className="w-full px-4 py-2 border rounded-lg bg-white text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                value={authPass}
                onChange={e => setAuthPass(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-rose-900 text-white py-2 rounded-lg font-medium hover:bg-rose-950 transition-colors">
              {isLoginMode ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>
            <span className="px-4 text-xs text-zinc-400 uppercase">Or continue with</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>
          </div>

          <button 
            onClick={signInWithGoogle} 
            className="w-full flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
            Google
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Display Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900 transition-all text-zinc-900"
                  placeholder="Your In-Game Name"
                  value={formData.displayName}
                  onChange={e => setFormData({...formData, displayName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">In-Game ID (10 Digits)</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900 transition-all font-mono text-zinc-900"
                  placeholder="e.g. 4022284874"
                  value={formData.inGameId}
                  onChange={handleInGameIdChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Guild Branch</label>
                {guilds.length === 0 ? (
                    <div className="text-sm text-red-500 border border-red-200 bg-red-50 p-2 rounded">System Not Initialized. Contact Admin.</div>
                ) : (
                  <select 
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900"
                    value={formData.guildId}
                    onChange={e => setFormData({...formData, guildId: e.target.value})}
                  >
                    {guilds.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Choose Avatar</label>
              <div className="flex flex-col items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="group relative w-32 h-32 rounded-full border-4 border-rose-900 overflow-hidden bg-zinc-100 dark:bg-zinc-800 hover:ring-4 hover:ring-rose-900/20 transition-all"
                  >
                      <img src={selectedAvatar} alt="Selected" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-bold flex items-center gap-1"><Edit2 size={12} /> Change</span>
                      </div>
                  </button>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Click circle to change</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Select Your Role</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(Object.values(RoleType) as RoleType[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({...formData, role})}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                    formData.role === role 
                      ? roleColors[role] + ' ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-opacity-60' 
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  {roleIcons[role]}
                  <span className="font-semibold">{role}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Martial Arts (Select 2)</label>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${selectedWeapons.length === 2 ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  {selectedWeapons.length} / 2 Selected
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
                    className={`text-sm px-3 py-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                      isSelected 
                        ? 'border-rose-900 bg-rose-50 dark:bg-rose-900/30 text-rose-900 dark:text-rose-200 font-medium' 
                        : !isAvailable
                          ? 'opacity-40 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-400'
                          : isDisabled 
                              ? 'opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'
                              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="truncate">{weapon}</span>
                    {isSelected && <Check size={14} className="flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
            <button 
              type="submit"
              className="bg-rose-900 hover:bg-rose-950 text-white px-8 py-3 rounded-lg font-medium shadow-lg shadow-rose-900/20 transition-all transform active:scale-95 w-full md:w-auto disabled:opacity-50"
              disabled={!currentUser}
            >
              Create Profile
            </button>
          </div>
        </form>
      )}

      <AvatarSelectionModal 
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        selectedAvatar={selectedAvatar}
        onSelect={setSelectedAvatar}
      />
    </div>
  );
};

export default Register;
