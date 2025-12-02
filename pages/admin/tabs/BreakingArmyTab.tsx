
import React, { useState, useEffect } from 'react';
import { Guild, BreakingArmyConfig, Boss, UserProfile, ScheduleSlot } from '../../../types';
import { db } from '../../../services/firebase';
import { useAlert } from '../../../contexts/AlertContext';
import { TimePicker } from '../../../components/TimePicker';
import { AddBossModal } from '../../../components/modals/AddBossModal';
import { Plus, Trash2, X, Clock, Edit2 } from 'lucide-react';

interface BreakingArmyTabProps {
  userProfile: UserProfile;
}

export const BreakingArmyTab: React.FC<BreakingArmyTabProps> = ({ userProfile }) => {
  const { showAlert } = useAlert();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  
  const [currentBossMap, setCurrentBossMap] = useState<Record<string, string>>({});
  const [schedulesMap, setSchedulesMap] = useState<Record<string, ScheduleSlot[]>>({});
  const [bossPool, setBossPool] = useState<Boss[]>([]);
  
  const [newScheduleDay, setNewScheduleDay] = useState('Wednesday');
  const [newScheduleTime, setNewScheduleTime] = useState({ hour: '8', minute: '00', ampm: 'PM' });
  
  // State for Editing
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null);

  const [isAddBossModalOpen, setIsAddBossModalOpen] = useState(false);
  const [bossForm, setBossForm] = useState({ name: '', imageUrl: '' });

  const isAdmin = userProfile.systemRole === 'Admin';
  const isOfficer = userProfile.systemRole === 'Officer';

  useEffect(() => {
    if (isOfficer) setSelectedBranchId(userProfile.guildId);
    else if (guilds.length > 0 && !selectedBranchId) setSelectedBranchId(guilds[0].id);
  }, [isOfficer, userProfile.guildId, guilds]);

  useEffect(() => {
    const unsubGuilds = db.collection("guilds").onSnapshot(snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    const unsubConfig = db.collection("system").doc("breakingArmy").onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data() as BreakingArmyConfig;
        setCurrentBossMap(data.currentBoss || {});
        setSchedulesMap(data.schedules || {});
        setBossPool(data.bossPool || []);
      }
    });
    return () => { unsubGuilds(); unsubConfig(); };
  }, []);

  const convertTo24Hour = (hour: string, minute: string, ampm: string) => {
      let h = parseInt(hour, 10);
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${minute}`;
  };

  const parseFrom24Hour = (time24: string) => {
      if (!time24) return { hour: '8', minute: '00', ampm: 'PM' };
      const [hStr, mStr] = time24.split(':');
      let h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      return { hour: h.toString(), minute: mStr, ampm };
  };

  const formatTime12Hour = (time24: string) => {
      if (!time24) return '';
      const [hours, minutes] = time24.split(':');
      let h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12; h = h ? h : 12; 
      return `${h}:${minutes} ${ampm}`;
  };

  const handleAddBoss = async () => {
      if (!bossForm.name) return;
      const newPool = [...bossPool, bossForm];
      await db.collection("system").doc("breakingArmy").update({ bossPool: newPool });
      setIsAddBossModalOpen(false);
      setBossForm({ name: '', imageUrl: '' });
      showAlert("Boss added to pool.", 'success');
  };

  const handleSaveSchedule = async () => {
      const time24 = convertTo24Hour(newScheduleTime.hour, newScheduleTime.minute, newScheduleTime.ampm);
      const currentSchedules = schedulesMap[selectedBranchId] || [];
      let newScheds = [...currentSchedules];

      if (editingScheduleIndex !== null) {
          // Update existing
          newScheds[editingScheduleIndex] = { day: newScheduleDay, time: time24 };
          showAlert("Schedule updated.", 'success');
      } else {
          // Add new
          newScheds.push({ day: newScheduleDay, time: time24 });
      }

      const newMap = { ...schedulesMap, [selectedBranchId]: newScheds };
      await db.collection("system").doc("breakingArmy").update({ schedules: newMap });
      
      // Reset form
      setNewScheduleDay('Wednesday');
      setNewScheduleTime({ hour: '8', minute: '00', ampm: 'PM' });
      setEditingScheduleIndex(null);
  };

  const handleEditSchedule = (index: number, schedule: ScheduleSlot) => {
      setEditingScheduleIndex(index);
      setNewScheduleDay(schedule.day);
      setNewScheduleTime(parseFrom24Hour(schedule.time));
  };

  const handleCancelEdit = () => {
      setEditingScheduleIndex(null);
      setNewScheduleDay('Wednesday');
      setNewScheduleTime({ hour: '8', minute: '00', ampm: 'PM' });
  };

  // Sort logic for display
  const dayOrder: Record<string, number> = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7 };
  const currentBranchSchedules = schedulesMap[selectedBranchId] || [];
  
  // Sort schedules by day then time
  const sortedSchedules = [...currentBranchSchedules].sort((a, b) => {
      const dayDiff = (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0);
      if (dayDiff !== 0) return dayDiff;
      return a.time.localeCompare(b.time);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-6 text-zinc-900 dark:text-zinc-100">Configuration</h3>
            
            <div className="mb-6">
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Select Branch to Configure</label>
                <select 
                value={selectedBranchId}
                onChange={e => {
                    setSelectedBranchId(e.target.value);
                    handleCancelEdit(); // Reset edit state when changing branch
                }}
                className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                disabled={isOfficer}
                >
                    {guilds.map(g => <option key={g.id} value={g.id} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{g.name}</option>)}
                </select>
            </div>

            {selectedBranchId && (
                <div className="space-y-8 animate-in fade-in">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Current Active Boss</label>
                        <div className="flex gap-4 items-center">
                        <select 
                            value={currentBossMap[selectedBranchId] || ''}
                            onChange={async (e) => {
                                const newMap = { ...currentBossMap, [selectedBranchId]: e.target.value };
                                await db.collection("system").doc("breakingArmy").update({ currentBoss: newMap });
                            }}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                        >
                            <option value="" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">-- None --</option>
                            {bossPool.map(b => <option key={b.name} value={b.name} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{b.name}</option>)}
                        </select>
                        {currentBossMap[selectedBranchId] && (
                            <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                <img src={bossPool.find(b => b.name === currentBossMap[selectedBranchId])?.imageUrl} alt="Boss" className="w-full h-full object-cover" />
                            </div>
                        )}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Weekly Schedule</label>
                            {editingScheduleIndex !== null && (
                                <button onClick={handleCancelEdit} className="text-xs text-red-500 hover:underline">Cancel Edit</button>
                            )}
                        </div>
                        
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-4">
                            <div className="flex flex-col sm:flex-row gap-2 items-end">
                                <div className="flex-1 w-full">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Day</label>
                                    <select 
                                        className="w-full p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 outline-none" 
                                        value={newScheduleDay} 
                                        onChange={e => setNewScheduleDay(e.target.value)}
                                    >
                                        {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=><option key={d} value={d} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{d}</option>)}
                                    </select>
                                </div>
                                <div className="w-full sm:w-auto">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Time</label>
                                    <TimePicker value={newScheduleTime} onChange={setNewScheduleTime} />
                                </div>
                                <button 
                                    onClick={handleSaveSchedule} 
                                    className="w-full sm:w-auto bg-rose-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-rose-900/20 hover:bg-rose-950 transition-colors h-[38px]"
                                >
                                    {editingScheduleIndex !== null ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {sortedSchedules.length === 0 && <p className="text-zinc-400 text-sm italic text-center py-2">No schedules configured.</p>}
                            {sortedSchedules.map((s, idx) => {
                                // Find original index in unsorted array for deletion/edition
                                const originalIndex = currentBranchSchedules.indexOf(s);
                                
                                return (
                                <div key={idx} className="flex justify-between items-center bg-white dark:bg-zinc-800 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{s.day}</p>
                                            <p className="text-xs text-zinc-500 font-mono">@ {formatTime12Hour(s.time)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleEditSchedule(originalIndex, s)}
                                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                const newScheds = currentBranchSchedules.filter((_, i) => i !== originalIndex);
                                                const newMap = { ...schedulesMap, [selectedBranchId]: newScheds };
                                                await db.collection("system").doc("breakingArmy").update({ schedules: newMap });
                                                if (editingScheduleIndex === originalIndex) handleCancelEdit();
                                            }} 
                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-zinc-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Boss Pool - Admin Only */}
        {isAdmin && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Boss Pool</h3>
                    <button onClick={() => setIsAddBossModalOpen(true)} className="bg-rose-900 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1">
                        <Plus size={14} /> Add Boss
                    </button>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {bossPool.map(boss => (
                        <div key={boss.name} className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg border border-zinc-100 dark:border-zinc-700">
                            <img src={boss.imageUrl || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded object-cover" />
                            <div className="flex-1 font-bold text-zinc-900 dark:text-zinc-100 text-sm">{boss.name}</div>
                            <button onClick={async () => {
                                const newPool = bossPool.filter(b => b.name !== boss.name);
                                await db.collection("system").doc("breakingArmy").update({ bossPool: newPool });
                            }} className="text-zinc-300 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            </div>
        )}
        <AddBossModal isOpen={isAddBossModalOpen} onClose={() => setIsAddBossModalOpen(false)} data={bossForm} onChange={setBossForm} onSubmit={handleAddBoss} />
    </div>
  );
};
