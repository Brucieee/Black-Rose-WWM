
import React, { useState, useEffect } from 'react';
import { ShieldAlert, GripVertical } from 'lucide-react';
import { UserProfile } from '../../types';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { GuildsTab } from './tabs/GuildsTab';
import { EventsTab } from './tabs/EventsTab';
import { AnnouncementsTab } from './tabs/AnnouncementsTab';
import { BreakingArmyTab } from './tabs/BreakingArmyTab';
import { HerosRealmTab } from './tabs/HerosRealmTab';
import { LeaderboardTab } from './tabs/LeaderboardTab';
import { WinnerLogsTab } from './tabs/WinnerLogsTab';
import { MembersTab } from './tabs/MembersTab';
import { UsersTab } from './tabs/UsersTab';
import { LeavesTab } from './tabs/LeavesTab';
import { SuggestionsTab } from './tabs/SuggestionsTab';
import { AuditLogTab } from './tabs/AuditLogTab';
import { AdsTab } from './tabs/AdsTab';
import { NotifierTab } from './tabs/NotifierTab';

const Admin: React.FC = () => {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const defaultTabs = ['guilds', 'events', 'announcements', 'notifier', 'breakingArmy', 'herosRealm', 'leaderboard', 'winnerLogs', 'members', 'users', 'leaves', 'suggestions', 'audit', 'ads'];
  
  const [tabOrder, setTabOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('adminTabOrder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const uniqueTabs = new Set([...parsed, ...defaultTabs]);
            return Array.from(uniqueTabs);
        }
      } catch (e) { console.error(e); }
    }
    return defaultTabs;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    return sessionStorage.getItem('adminActiveTab') || 'guilds';
  });

  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);

  useEffect(() => { localStorage.setItem('adminTabOrder', JSON.stringify(tabOrder)); }, [tabOrder]);
  useEffect(() => { sessionStorage.setItem('adminActiveTab', activeTab); }, [activeTab]);

  useEffect(() => {
    if (currentUser) {
        const unsubUser = db.collection("users").doc(currentUser.uid).onSnapshot((docSnap) => {
            if (docSnap.exists) setUserProfile(docSnap.data() as UserProfile);
            setLoadingProfile(false);
        });
        return () => unsubUser();
    } else {
        setLoadingProfile(false);
    }
  }, [currentUser]);

  const isAdmin = userProfile?.systemRole === 'Admin';
  const isOfficer = userProfile?.systemRole === 'Officer';

  useEffect(() => {
      if (!loadingProfile && isOfficer) {
          const allowedTabs = ['events', 'notifier', 'breakingArmy', 'herosRealm', 'leaves', 'announcements', 'members', 'leaderboard', 'winnerLogs'];
          if (!allowedTabs.includes(activeTab)) setActiveTab('events');
      }
  }, [loadingProfile, isOfficer, activeTab]);

  const handleDragStart = (idx: number) => setDraggedTabIndex(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (dropIdx: number) => {
      if (draggedTabIndex === null) return;
      const newOrder = [...tabOrder];
      const [removed] = newOrder.splice(draggedTabIndex, 1);
      newOrder.splice(dropIdx, 0, removed);
      setTabOrder(newOrder);
      setDraggedTabIndex(null);
  };

  if (loadingProfile) return <div className="p-8 text-center">Loading Admin Panel...</div>;
  if (!userProfile || userProfile.systemRole === 'Member') return <div className="p-8 text-center text-red-500">Access Denied.</div>;

  const labels: any = { 
      guilds: 'Guilds', events: 'Events', announcements: 'Announcements', 
      breakingArmy: 'Breaking Army', herosRealm: "Hero's Realm", 
      leaderboard: 'Leaderboard', winnerLogs: 'Winner Logs', members: 'Members', 
      users: 'Users', leaves: 'Leaves', suggestions: 'Suggestions', audit: 'Audit Log',
      ads: 'Ad System', notifier: 'Notifier'
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
           <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <ShieldAlert className="text-rose-900 dark:text-rose-500" /> Admin Console
           </h1>
           <p className="text-zinc-500 dark:text-zinc-400 mt-1">
             Logged in as: <span className="font-bold text-zinc-900 dark:text-zinc-100">{userProfile.displayName}</span> ({userProfile.systemRole})
           </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto">
        {tabOrder.map((tab, idx) => {
            if (tab === 'suggestions' && !isAdmin) return null;
            if (tab === 'guilds' && !isAdmin) return null;
            if (tab === 'users' && !isAdmin) return null;
            if (tab === 'audit' && !isAdmin) return null;
            if (tab === 'ads' && !isAdmin) return null;
            
            return (
                <div 
                    key={tab}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-t-lg font-bold text-sm cursor-pointer flex items-center gap-2 transition-colors ${
                        activeTab === tab 
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-rose-900 dark:text-rose-500 border-b-2 border-rose-900' 
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                >
                    <GripVertical size={12} className="text-zinc-300 cursor-grab active:cursor-grabbing" />
                    {labels[tab]}
                </div>
            );
        })}
      </div>

      <div className="min-h-[400px]">
          {activeTab === 'guilds' && <GuildsTab />}
          {activeTab === 'events' && <EventsTab userProfile={userProfile} />}
          {activeTab === 'announcements' && <AnnouncementsTab userProfile={userProfile} />}
          {activeTab === 'notifier' && <NotifierTab userProfile={userProfile} />}
          {activeTab === 'breakingArmy' && <BreakingArmyTab userProfile={userProfile} />}
          {activeTab === 'herosRealm' && <HerosRealmTab userProfile={userProfile} />}
          {activeTab === 'leaderboard' && <LeaderboardTab userProfile={userProfile} />}
          {activeTab === 'winnerLogs' && <WinnerLogsTab userProfile={userProfile} />}
          {activeTab === 'members' && <MembersTab userProfile={userProfile} />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'leaves' && <LeavesTab userProfile={userProfile} />}
          {activeTab === 'suggestions' && <SuggestionsTab />}
          {activeTab === 'audit' && isAdmin && <AuditLogTab />}
          {activeTab === 'ads' && isAdmin && <AdsTab />}
      </div>
    </div>
  );
};

export default Admin;
