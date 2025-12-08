
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { PartyNotifier } from './PartyNotifier';
import { AudioNotifier } from './AudioNotifier';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Mute State for Party Notifications
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('party_notifier_muted') === 'true';
  });

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    localStorage.setItem('party_notifier_muted', String(newState));
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-900 z-40 flex items-center px-4 justify-between border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="text-white p-1">
            <Menu size={24} />
          </button>
          <span className="text-white font-bold tracking-wide">BLACK ROSE</span>
        </div>
      </div>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />
      
      {/* Global Party Notification */}
      <PartyNotifier isMuted={isMuted} />
      
      {/* Scheduled Audio Notifier */}
      <AudioNotifier isMuted={isMuted} />
      
      {/* Changed transition-all to transition-[margin] to prevent creating a containing block for fixed descendants (Modals) */}
      <main className="flex-1 md:ml-64 p-0 mt-16 md:mt-0 transition-[margin] duration-300 flex flex-col min-h-screen">
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
