
import React, { useState, useEffect } from 'react';
import { RoleType, WEAPON_LIST, Weapon, WEAPON_ROLE_MAP, UserProfile } from '../types';
import { Check, Sword, Shield, Cross, Zap, Save, Edit2, Lock, User, Hash, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { db } from '../services/firebase';
import { useAlert } from '../contexts/AlertContext';
import { PRESET_AVATARS } from '../services/mockData';
import { AvatarSelectionModal } from '../components/modals/AvatarSelectionModal';

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const { guilds } = useData();
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  // Form State
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
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        // Fetch Current Profile
        // FIX: Use Firebase v8 compat syntax
        const docRef = db.collection("users").doc(currentUser.uid);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
          setProfileExists(true);
          const data = docSnap.data() as UserProfile;
          setFormData({
            displayName: data.displayName,
            inGameId: data.inGameId,
            role: data.role,
            guildId: data.guildId
          });
          setSelectedWeapons(data.weapons || []);
          if (data.photoURL) {
              setSelectedAvatar(data.photoURL);
          }
        } else {
            setProfileExists(false);
            // Pre-fill email name if available
            if (currentUser.displayName) {
                setFormData(prev => ({...prev, displayName: currentUser.displayName!}));
            }
            if (guilds.length > 0) {
                setFormData(prev => ({...prev, guildId: guilds[0].id}));
            }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser, guilds]); // Added guilds dependency to update default if needed

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
    // Only filter if not loading to avoid clearing weapons on initial load before role is set
    if (!isLoading) {
      const available = getAvailableWeapons(formData.role);
      const validSelections = selectedWeapons.filter(w => available.includes(w));
      if (validSelections.length !== selectedWeapons.length) {
        setSelectedWeapons(validSelections);
      }
    }
  }, [formData.role, isLoading, selectedWeapons]);

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

    if (!currentUser) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const dataToSave: any = {
        inGameId: formData.inGameId,
        displayName: formData.displayName,
        role: formData.role,
        weapons: selectedWeapons,
        guildId: formData.guildId,
        photoURL: selectedAvatar,
        email: currentUser.email,
        uid: currentUser.uid
      };

      // If creating a new profile, set default system fields
      if (!profileExists) {
        dataToSave.systemRole = 'Member';
        dataToSave.status = 'online';
      }

      // 1. Update User Profile
      await db.collection("users").doc(currentUser.uid).set(dataToSave, { merge: true });

      // 2. Cascade Updates (Batch Operation) to ensure live sync across the app
      const batch = db.batch();

      // Update Arena Participants (Sidebar)
      const arenaPartsSnap = await db.collection("arena_participants").where("uid", "==", currentUser.uid).get();
      arenaPartsSnap.forEach(doc => {
          batch.update(doc.ref, {
              displayName: formData.displayName,
              photoURL: selectedAvatar,
              role: formData.role 
          });
      });

      // Update Active Parties (Party Finder)
      const partiesSnap = await db.collection("parties").where("memberUids", "array-contains", currentUser.uid).get();
      partiesSnap.forEach(doc => {
          const party = doc.data();
          const updatedMembers = party.currentMembers.map((m: any) => {
              if (m.uid === currentUser.uid) {
                  return { ...m, name: formData.displayName, photoURL: selectedAvatar, role: formData.role };
              }
              return m;
          });
          let updates: any = { currentMembers: updatedMembers };
          if (party.leaderId === currentUser.uid) {
              updates.leaderName = formData.displayName;
          }
          batch.update(doc.ref, updates);
      });

      // Update Active Arena Matches (Bracket)
      const matchesP1Snap = await db.collection("arena_matches").where("player1.uid", "==", currentUser.uid).get();
      matchesP1Snap.forEach(doc => {
          const matchData = doc.data();
          batch.update(doc.ref, {
              "player1.displayName": formData.displayName,
              "player1.photoURL": selectedAvatar,
              "player1.role": formData.role
          });
          if (matchData.winner?.uid === currentUser.uid) {
              batch.update(doc.ref, {
                  "winner.displayName": formData.displayName,
                  "winner.photoURL": selectedAvatar,
                  "winner.role": formData.role
              });
          }
      });

      const matchesP2Snap = await db.collection("arena_matches").where("player2.uid", "==", currentUser.uid).get();
      matchesP2Snap.forEach(doc => {
          const matchData = doc.data();
          batch.update(doc.ref, {
              "player2.displayName": formData.displayName,
              "player2.photoURL": selectedAvatar,
              "player2.role": formData.role
          });
          if (matchData.winner?.uid === currentUser.uid) {
              batch.update(doc.ref, {
                  "winner.displayName": formData.displayName,
                  "winner.photoURL": selectedAvatar,
                  "winner.role": formData.role
              });
          }
      });

      await batch.commit();
      
      setProfileExists(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      showAlert("Failed to update profile.", 'error');
    } finally {
      setIsSaving(false);
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

  if (!currentUser) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Please sign in to edit your profile.</div>;
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
           <div className="w-16 h-16 border-4 border-rose-900 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-zinc-500 animate-pulse font-medium">Loading Dossier...</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="w-full max-w-4xl relative z-10 animate-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl border border-white/20 dark:border-zinc-800">
                
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Profile</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Update your account and loadout.</p>
                    </div>
                    {saveSuccess && (
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2 animate-in fade-in slide-in-from-right">
                            <Check size={18} /> Saved
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Top Section: Info & Avatar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Info Column */}
                        <div className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">In-Game Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all placeholder:text-zinc-400"
                                        value={formData.displayName}
                                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">In-Game ID</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all font-mono placeholder:text-zinc-400"
                                        value={formData.inGameId}
                                        onChange={handleInGameIdChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Guild Branch</label>
                                {profileExists ? (
                                    <div className="relative group">
                                        <div className="flex items-center w-full pl-4 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 cursor-not-allowed">
                                            <Lock size={18} className="mr-3 opacity-70" />
                                            <span className="font-medium">{guilds.find(g => g.id === formData.guildId)?.name || 'Unknown Guild'}</span>
                                        </div>
                                        <div className="absolute top-full mt-2 left-0 w-full bg-black text-white text-xs p-2 rounded hidden group-hover:block z-20">
                                            Branch assignment is locked. Contact an officer to transfer.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                        <select 
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none"
                                            value={formData.guildId}
                                            onChange={e => setFormData({...formData, guildId: e.target.value})}
                                        >
                                            <option value="" disabled>Select Guild</option>
                                            {guilds.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Avatar & Role Column */}
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <label className="text-xs font-bold text-zinc-500 uppercase mb-3">Avatar</label>
                                <div className="relative group">
                                    <button 
                                        type="button"
                                        onClick={() => setIsAvatarModalOpen(true)}
                                        className="w-32 h-32 rounded-full border-4 border-white dark:border-zinc-700 shadow-xl overflow-hidden hover:scale-105 transition-transform duration-300 ring-4 ring-transparent hover:ring-rose-500/20"
                                    >
                                        <img src={selectedAvatar} alt="Selected" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit2 size={24} className="text-white" />
                                        </div>
                                    </button>
                                    <div className="absolute bottom-0 right-0 bg-rose-900 text-white p-2 rounded-full border-2 border-white dark:border-zinc-800 shadow-lg pointer-events-none">
                                        <Edit2 size={14} />
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
                                                ? roleColors[role] + ' ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-opacity-60 scale-105 shadow-md' 
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

                    {/* Weapons Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Martial Arts (2)</label>
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
                                        className={`px-3 py-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                                            isSelected 
                                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 shadow-sm ring-1 ring-rose-500/30' 
                                            : !isAvailable
                                                ? 'opacity-40 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400'
                                                : isDisabled 
                                                    ? 'opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'
                                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-600 dark:text-zinc-300'
                                        }`}
                                    >
                                        <span className="truncate">{weapon}</span>
                                        {isSelected && <Check size={14} className="flex-shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <><Save size={20} /> Save Changes</>
                        )}
                    </button>
                </form>
            </div>
        </div>

        <AvatarSelectionModal 
            isOpen={isAvatarModalOpen}
            onClose={() => setIsAvatarModalOpen(false)}
            selectedAvatar={selectedAvatar}
            onSelect={setSelectedAvatar}
        />
    </div>
  );
};

export default Profile;
