
import React, { useState, useEffect } from 'react';
// FIX: Corrected react-router-dom import for v5 compatibility.
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Shield, 
  ChevronDown, 
  ChevronRight, 
  Settings, 
  PlusCircle, 
  LogOut,
  Swords,
  X,
  Moon,
  Sun,
  UserCircle
} from 'lucide-react';
import { Guild, UserProfile } from '../types';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [isGuildsOpen, setIsGuildsOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { logout, currentUser } = useAuth();

  // Initialize Dark Mode
  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  // Fetch Guilds
  useEffect(() => {
    const q = query(collection(db, "guilds"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guildsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Guild[];
      setGuilds(guildsData);
    });
    return () => unsubscribe();
  }, []);

  // Fetch User Profile to check System Role
  useEffect(() => {
    if (currentUser) {
      const unsub = onSnapshot(doc(db, "users", currentUser.uid), (doc) => {
        if (doc.exists()) {
          setUserProfile(doc.data() as UserProfile);
        }
      });
      return () => unsub();
    } else {
      setUserProfile(null);
    }
  }, [currentUser]);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const showAdmin = currentUser && (
    (userProfile?.systemRole === 'Admin' || userProfile?.systemRole === 'Officer') || 
    guilds.length === 0
  );
  
  // FIX: Replaced NavLink's className function with base className and activeClassName for react-router-dom v5 compatibility.
  const navLinkBaseClass = "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-r-full mr-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800";
  const navLinkActiveClass = "bg-rose-900/10 text-rose-500 border-l-4 border-rose-900";


  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 bottom-0 z-50 w-64 bg-zinc-950 text-white border-r border-zinc-800 flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        <div className="p-6 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-900 rounded-lg flex items-center justify-center shadow-lg shadow-rose-900/20">
              <Swords className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wide text-zinc-100">BLACK ROSE</h1>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Guild Manager</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar space-y-1">
          
          <div className="px-4 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Main
          </div>
          
          <NavLink 
            to="/" 
            exact
            onClick={handleLinkClick}
            className={navLinkBaseClass}
            activeClassName={navLinkActiveClass}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          
          <NavLink 
            to="/events" 
            onClick={handleLinkClick}
            className={navLinkBaseClass}
            activeClassName={navLinkActiveClass}
          >
            <Calendar size={18} />
            Events
          </NavLink>
          
          <NavLink 
            to="/members" 
            onClick={handleLinkClick}
            className={navLinkBaseClass}
            activeClassName={navLinkActiveClass}
          >
            <Users size={18} />
            Members
          </NavLink>

          <NavLink 
            to="/alliances" 
            onClick={handleLinkClick}
            className={navLinkBaseClass}
            activeClassName={navLinkActiveClass}
          >
            <Shield size={18} />
            Alliances
          </NavLink>

          <div className="mt-8 px-4 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
            <span>Guild Branches</span>
            <button onClick={() => setIsGuildsOpen(!isGuildsOpen)} className="hover:text-white transition-colors">
              {isGuildsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>

          {isGuildsOpen && (
            <div className="space-y-1">
              {guilds.map(guild => (
                <NavLink 
                  key={guild.id} 
                  to={`/guild/${guild.id}`} 
                  onClick={handleLinkClick}
                  className={navLinkBaseClass}
                  activeClassName={navLinkActiveClass}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mr-2" />
                  {guild.name}
                </NavLink>
              ))}
            </div>
          )}

          {showAdmin && (
            <>
              <div className="mt-8 px-4 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                System
              </div>

              <NavLink 
                to="/admin" 
                onClick={handleLinkClick}
                className={navLinkBaseClass}
                activeClassName={navLinkActiveClass}
              >
                <Settings size={18} />
                Admin
              </NavLink>
            </>
          )}
          
          {!currentUser && (
            <NavLink 
              to="/register" 
              onClick={handleLinkClick}
              className={navLinkBaseClass}
              activeClassName={navLinkActiveClass}
            >
              <PlusCircle size={18} />
              Join Guild
            </NavLink>
          )}

        </nav>

        {/* Discord Style Footer */}
        {currentUser ? (
          <div className="p-3 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between">
            <NavLink to="/profile" className="flex items-center gap-2.5 hover:bg-zinc-800/50 p-1.5 rounded-md transition-colors flex-1 min-w-0">
              <div className="relative">
                <img 
                  src={userProfile?.photoURL || 'https://via.placeholder.com/150'} 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-full object-cover bg-zinc-800"
                />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${userProfile?.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-zinc-200 truncate leading-tight">
                  {userProfile?.displayName || 'Unknown'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono truncate leading-tight">
                  #{userProfile?.inGameId || '00000'}
                </span>
              </div>
            </NavLink>
            
            <div className="flex items-center">
              <button 
                onClick={toggleDarkMode}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button 
                onClick={logout}
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-zinc-800">
             <button 
                onClick={toggleDarkMode}
                className="flex items-center justify-center gap-2 w-full p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                <span className="text-sm font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
