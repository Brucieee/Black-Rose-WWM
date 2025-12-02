
import React, { useState, useEffect } from 'react';
import { Guild, HerosRealmConfig, HerosRealmRequest, Boss, UserProfile } from '../../../types';
import { db } from '../../../services/firebase';
import { TimePicker } from '../../../components/TimePicker';
import { Trash2, X } from 'lucide-react';

interface HerosRealmTabProps {
  userProfile: UserProfile;
}

export const HerosRealmTab: React.FC<HerosRealmTabProps> = ({ userProfile }) => {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [herosRealmConfig, setHerosRealmConfig] = useState<HerosRealmConfig | null>(null);
  const [herosRealmRequests, setHerosRealmRequests] = useState<HerosRealmRequest[]>([]);
  const [bossPool, setBossPool] = useState<Boss[]>([]);
  
  const [newScheduleDay, setNewScheduleDay] = useState('Wednesday');
  const [newScheduleTime, setNewScheduleTime] = useState({ hour: '8', minute: '00', ampm: 'PM' });

  const isOfficer = userProfile.systemRole === 'Officer';

  useEffect(() => {
    if (isOfficer) setSelectedBranchId(userProfile.guildId);
    else if (guilds.length > 0 && !selectedBranchId) setSelectedBranchId(guilds[0].id);
  }, [isOfficer, userProfile.guildId, guilds]);

  useEffect(() => {
    const unsubGuilds = db.collection("guilds").onSnapshot(snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    const unsubHero = db.collection("system").doc("herosRealm").onSnapshot(doc => { if (doc.exists) setHerosRealmConfig(doc.data() as HerosRealmConfig); });
    const unsubRequests = db.collection("heros_realm_requests").onSnapshot(snap => setHerosRealmRequests(snap.docs.map(d => ({id: d.id, ...d.data()} as HerosRealmRequest))));
    const unsubBosses = db.collection("system").doc("breakingArmy").onSnapshot(doc => { if(doc.exists) setBossPool((doc.data() as any).bossPool || []) });
    
    return () => { unsubGuilds(); unsubHero(); unsubRequests(); unsubBosses(); };
  }, []);

  const convertTo24Hour = (hour: string, minute: string, ampm: string) => {
      let h = parseInt(hour, 10);
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${minute}`;
  };

  const formatTime12Hour = (time24: string) => {
      if (!time24) return '';
      const [hours, minutes] = time24.split(':');
      let h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12; h = h ? h : 12; 
      return `${h}:${minutes} ${ampm}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-6 text-zinc-900 dark:text-zinc-100">Realm Configuration</h3>
            
            <div className="mb-6">
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Select Branch</label>
                <select 
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                disabled={isOfficer}
                >
                    {guilds.map(g => <option key={g.id} value={g.id} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{g.name}</option>)}
                </select>
            </div>

            {selectedBranchId && (
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Current Bosses (Select 2)</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[0, 1].map(idx => (
                                <select 
                                key={idx}
                                value={herosRealmConfig?.currentBosses?.[selectedBranchId]?.[idx] || ''}
                                onChange={async (e) => {
                                    const current = herosRealmConfig?.currentBosses?.[selectedBranchId] || [];
                                    const newArr = [...current];
                                    newArr[idx] = e.target.value;
                                    const newMap = { ...herosRealmConfig?.currentBosses, [selectedBranchId]: newArr };
                                    await db.collection("system").doc("herosRealm").set({ ...herosRealmConfig, currentBosses: newMap }, {merge: true});
                                }}
                                className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm"
                                >
                                    <option value="" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">-- Boss {idx+1} --</option>
                                    {bossPool.map(b => <option key={b.name} value={b.name} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{b.name}</option>)}
                                </select>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Schedule</label>
                        <div className="flex gap-2 mb-2">
                            <select className="p-2 border rounded bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" value={newScheduleDay} onChange={e => setNewScheduleDay(e.target.value)}>
                                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=><option key={d} value={d} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{d}</option>)}
                            </select>
                            <TimePicker value={newScheduleTime} onChange={setNewScheduleTime} />
                            <button onClick={async () => {
                                const time24 = convertTo24Hour(newScheduleTime.hour, newScheduleTime.minute, newScheduleTime.ampm);
                                const currentSchedules = herosRealmConfig?.schedules?.[selectedBranchId] || [];
                                const newScheds = [...currentSchedules, { day: newScheduleDay, time: time24 }];
                                const newMap = { ...herosRealmConfig?.schedules, [selectedBranchId]: newScheds };
                                await db.collection("system").doc("herosRealm").set({ ...herosRealmConfig, schedules: newMap }, {merge: true});
                            }} className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-bold">Add</button>
                        </div>
                        <div className="space-y-1">
                            {(herosRealmConfig?.schedules?.[selectedBranchId] || []).map((s, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800 p-2 rounded text-sm text-zinc-900 dark:text-zinc-100">
                                    <span>{s.day} @ {formatTime12Hour(s.time)}</span>
                                    <button onClick={async () => {
                                        const newScheds = (herosRealmConfig?.schedules?.[selectedBranchId] || []).filter((_, i) => i !== idx);
                                        const newMap = { ...herosRealmConfig?.schedules, [selectedBranchId]: newScheds };
                                        await db.collection("system").doc("herosRealm").set({ ...herosRealmConfig, schedules: newMap }, {merge: true});
                                    }} className="text-red-500"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Member Requests</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                {herosRealmRequests.filter(r => r.guildId === selectedBranchId).map(req => (
                    <div key={req.id} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                        <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{req.day} @ {formatTime12Hour(req.time)}</p>
                            <p className="text-xs text-zinc-500">Votes: {req.votes.length} • By {req.createdByName}</p>
                        </div>
                        <button onClick={() => db.collection("heros_realm_requests").doc(req.id).delete()} className="text-zinc-400 hover:text-red-500 p-1">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {herosRealmRequests.filter(r => r.guildId === selectedBranchId).length === 0 && (
                    <p className="text-zinc-400 text-sm italic">No active requests.</p>
                )}
            </div>
        </div>
    </div>
  );
};
