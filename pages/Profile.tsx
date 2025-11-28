

import React, { useState, useEffect } from 'react';
import { RoleType, WEAPON_LIST, Weapon, WEAPON_ROLE_MAP, Guild, UserProfile } from '../types';
import { Check, Sword, Shield, Cross, Zap, Save, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
// FIX: Removed unused Firestore v9 imports.
import { useAlert } from '../contexts/AlertContext';
import { PRESET_AVATARS } from '../services/mockData';
import { AvatarSelectionModal } from '../components/modals/AvatarSelectionModal';

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const [guilds, setGuilds] = useState<Guild[]>([]);
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
        // Fetch Guilds
        // FIX: Updated Firestore query to v8 compat syntax.
        const q = db.collection("guilds").orderBy("name");
        const snapshot = await q.get();
        const guildsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Guild[];
        setGuilds(guildsData);

        // Fetch Current Profile
        // FIX: Updated Firestore query to v8 compat syntax.
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
            if (guildsData.length > 0) {
                setFormData(prev => ({...prev, guildId: guildsData[0].id}));
            }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

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
  }, [formData.role, isLoading]);

  const handleWeaponToggle = (weapon: Weapon) => {
    if (selectedWeapons.includes(weapon)) {
      setSelectedWeapons(prev => prev.filter(w => w !== weapon));
    } else {
      if (selectedWeapons.length < 2) {
        setSelectedWeapons(prev => [...prev, weapon]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWeapons.length !== 2) {
      showAlert("Please select exactly 2 Martial Arts.", 'error');
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

      // Use setDoc with merge: true to handle both create and update
      // FIX: Updated Firestore write to v8 compat syntax.
      await db.collection("users").doc(currentUser.uid).set(dataToSave, { merge: true });
      
      setProfileExists(true); // Now it exists
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

  if (!currentUser) return <div className="p-8 text-center">Please sign in to edit your profile.</div>;
  if (isLoading) return <div className="p-8 text-center">Loading Profile...</div>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
           <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Edit Profile</h2>
           <p className="text-zinc-500 dark:text-zinc-400 mt-2">Update your guild credentials and loadout.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Display Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900 transition-all"
                  value={formData.displayName}
                  onChange={e => setFormData({...formData, displayName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">In-Game ID</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900 transition-all"
                  value={formData.inGameId}
                  onChange={e => setFormData({...formData, inGameId: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Guild Branch</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900"
                  value={formData.guildId}
                  onChange={e => setFormData({...formData, guildId: e.target.value})}
                >
                    <option value="" disabled>Select Guild</option>
                    {guilds.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
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

          {/* Section 2: Role Selection */}
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
                      ? roleColors[role] + ' ring-2 ring-offset-2 ring-offset-white ring-opacity-60' 
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  {roleIcons[role]}
                  <span className="font-semibold">{role}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Martial Arts */}
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
              disabled={isSaving}
              className={`px-8 py-3 rounded-lg font-medium shadow-lg transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  saveSuccess 
                  ? 'bg-green-600 text-white shadow-green-900/20' 
                  : 'bg-rose-900 hover:bg-rose-950 text-white shadow-rose-900/20'
              }`}
            >
              {isSaving ? 'Saving...' : saveSuccess ? <><Check size={18} /> Saved!</> : <><Save size={18} /> Save Changes</>}
            </button>
          </div>
      </form>

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
