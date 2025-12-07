
import React, { useState, useEffect } from 'react';
import { LeaveRequest, Guild, UserProfile } from '../../../types';
import { db } from '../../../services/firebase';
import { useAlert } from '../../../contexts/AlertContext';
import { Trash2, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, User } from 'lucide-react';

interface LeavesTabProps {
  userProfile: UserProfile;
}

export const LeavesTab: React.FC<LeavesTabProps> = ({ userProfile }) => {
  const { showAlert } = useAlert();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [leaveBranchFilter, setLeaveBranchFilter] = useState('All');
  
  // View State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  const isAdmin = userProfile.systemRole === 'Admin';
  const isOfficer = userProfile.systemRole === 'Officer';

  useEffect(() => {
    if (isOfficer) setLeaveBranchFilter(userProfile.guildId);
    
    const unsubL = db.collection("leaves").orderBy("timestamp", "desc").onSnapshot(snap => setLeaves(snap.docs.map(d => ({id: d.id, ...d.data()} as LeaveRequest))));
    const unsubG = db.collection("guilds").onSnapshot(snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    const unsubU = db.collection("users").onSnapshot(snap => setAllUsers(snap.docs.map(d => d.data() as UserProfile)));
    
    return () => { unsubL(); unsubG(); unsubU(); };
  }, [isOfficer, userProfile.guildId]);

  const getUserPhoto = (uid: string) => allUsers.find(u => u.uid === uid)?.photoURL;

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateBetween = (target: Date, start: string, end: string) => {
    const t = new Date(target); t.setHours(0,0,0,0);
    const s = new Date(start); s.setHours(0,0,0,0);
    const e = new Date(end); e.setHours(0,0,0,0);
    return t >= s && t <= e;
  };

  const changeMonth = (increment: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + increment);
      setCurrentDate(newDate);
  };

  const filteredLeaves = leaves.filter(l => leaveBranchFilter === 'All' || l.guildId === leaveBranchFilter);

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Leave Requests
                <span className="text-sm font-normal text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {filteredLeaves.length}
                </span>
            </h2>
            
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg flex items-center">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                        title="List View"
                    >
                        <List size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('calendar')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                        title="Calendar View"
                    >
                        <CalendarIcon size={18} />
                    </button>
                </div>

                <select 
                    value={leaveBranchFilter} 
                    onChange={e => setLeaveBranchFilter(e.target.value)}
                    className="p-2.5 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-rose-500 flex-1 md:flex-none"
                    disabled={isOfficer}
                >
                    {isAdmin && <option value="All" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">All Branches</option>}
                    {guilds.map(g => <option key={g.id} value={g.id} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{g.name}</option>)}
                </select>
            </div>
        </div>

        {viewMode === 'list' ? (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-bold text-xs uppercase border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="p-4">Member</th>
                                <th className="p-4">Dates</th>
                                <th className="p-4">Reason</th>
                                <th className="p-4">Filed On</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                            {filteredLeaves.map(leave => (
                                <tr key={leave.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="p-4 align-top">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0">
                                                <img 
                                                    src={getUserPhoto(leave.uid) || 'https://via.placeholder.com/150'} 
                                                    alt={leave.displayName}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-bold text-zinc-900 dark:text-zinc-100">{leave.displayName}</p>
                                                <p className="text-xs text-zinc-500">{leave.guildName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap align-top">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-rose-700 dark:text-rose-400">
                                                {new Date(leave.startDate).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-zinc-400">to</span>
                                            <span className="font-medium text-green-700 dark:text-green-400">
                                                {new Date(leave.endDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-zinc-700 dark:text-zinc-300 align-top min-w-[200px]">
                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                            <p className="whitespace-pre-wrap italic">
                                                "{leave.reason || "No specific reason provided."}"
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-4 text-zinc-500 text-xs align-top whitespace-nowrap">
                                        {new Date(leave.timestamp).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right align-top">
                                        {isAdmin && (
                                            <button 
                                                onClick={() => {
                                                    db.collection("leaves").doc(leave.id).delete();
                                                    showAlert("Leave request removed.", 'info');
                                                }} 
                                                className="text-zinc-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete Request"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredLeaves.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-zinc-500 italic">No leave requests found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Calendar Header */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                        <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-300" />
                    </button>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                        <ChevronRight size={20} className="text-zinc-600 dark:text-zinc-300" />
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-3 text-center text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 auto-rows-fr bg-zinc-100 dark:bg-zinc-800 gap-[1px]">
                    {/* Empty cells for padding */}
                    {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-white dark:bg-zinc-900 min-h-[120px]"></div>
                    ))}

                    {/* Days */}
                    {getDaysInMonth(currentDate).map(day => {
                        const daysLeaves = filteredLeaves.filter(l => isDateBetween(day, l.startDate, l.endDate));
                        const isToday = new Date().toDateString() === day.toDateString();

                        return (
                            <div key={day.toISOString()} className={`bg-white dark:bg-zinc-900 min-h-[120px] p-2 flex flex-col gap-1 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80 ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow-sm' : 'text-zinc-400'}`}>
                                        {day.getDate()}
                                    </span>
                                    {daysLeaves.length > 0 && (
                                        <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded">
                                            {daysLeaves.length} Away
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-[100px]">
                                    {daysLeaves.map(leave => {
                                        const isStart = new Date(leave.startDate).toDateString() === day.toDateString();
                                        const isEnd = new Date(leave.endDate).toDateString() === day.toDateString();
                                        
                                        return (
                                            <div 
                                                key={leave.id} 
                                                className={`text-[10px] p-1 rounded border flex items-center gap-1.5 group cursor-help transition-all hover:scale-[1.02] hover:shadow-md
                                                    ${isStart ? 'bg-rose-100 border-rose-200 text-rose-800 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-200' : 
                                                      isEnd ? 'bg-green-100 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200' : 
                                                      'bg-zinc-100 border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'}
                                                `}
                                                title={`${leave.displayName}: ${leave.reason}`}
                                            >
                                                <img src={getUserPhoto(leave.uid) || 'https://via.placeholder.com/30'} className="w-4 h-4 rounded-full object-cover" />
                                                <span className="truncate font-bold">{leave.displayName}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
    </div>
  );
};
