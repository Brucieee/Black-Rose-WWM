
import React, { useState, useEffect } from 'react';
import { UserProfile, Guild, AudioFile, ScheduledNotification } from '../../../types';
import { db } from '../../../services/firebase';
import { useAlert } from '../../../contexts/AlertContext';
import { AudioUpload } from '../../../components/AudioUpload';
import { TimePicker } from '../../../components/TimePicker';
import { Play, Trash2, Volume2, Plus, Clock, Music, Edit2, Check, X } from 'lucide-react';
import { logAction } from '../../../services/auditLogger';

interface NotifierTabProps {
  userProfile: UserProfile;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const NotifierTab: React.FC<NotifierTabProps> = ({ userProfile }) => {
  const { showAlert } = useAlert();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [schedules, setSchedules] = useState<ScheduledNotification[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  
  // Form State
  const [selectedGuildId, setSelectedGuildId] = useState('');
  const [selectedAudioId, setSelectedAudioId] = useState('');
  const [label, setLabel] = useState('');
  const [time, setTime] = useState({ hour: '8', minute: '00', ampm: 'PM' });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  // Upload State
  const [newEventName, setNewEventName] = useState('');

  // Edit Audio Name State
  const [editingAudioId, setEditingAudioId] = useState<string | null>(null);
  const [editingAudioName, setEditingAudioName] = useState('');

  const isAdmin = userProfile.systemRole === 'Admin';
  const isOfficer = userProfile.systemRole === 'Officer';

  useEffect(() => {
    // Default guild selection for officer
    if (isOfficer) {
        setSelectedGuildId(userProfile.guildId);
    }
    
    // Listeners
    const unsubAudio = db.collection("audio_files").orderBy("name").onSnapshot(snap => 
        setAudioFiles(snap.docs.map(d => ({id: d.id, ...d.data()} as AudioFile)))
    );
    const unsubSched = db.collection("scheduled_notifications").onSnapshot(snap => 
        setSchedules(snap.docs.map(d => ({id: d.id, ...d.data()} as ScheduledNotification)))
    );
    const unsubGuilds = db.collection("guilds").onSnapshot(snap => 
        setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild)))
    );

    return () => { unsubAudio(); unsubSched(); unsubGuilds(); };
  }, [isOfficer, userProfile.guildId]);

  const handleAudioUpload = async (url: string, fileName: string) => {
      try {
          const nameToUse = newEventName.trim() || fileName;
          await db.collection("audio_files").add({
              name: nameToUse,
              url,
              uploadedBy: userProfile.uid,
              timestamp: new Date().toISOString()
          });
          showAlert(`Event "${nameToUse}" created in library.`, 'success');
          setNewEventName('');
      } catch (err: any) {
          showAlert(err.message, 'error');
      }
  };

  const handleUpdateAudioName = async (id: string) => {
      if (!editingAudioName.trim()) return;
      try {
          await db.collection("audio_files").doc(id).update({ name: editingAudioName.trim() });
          setEditingAudioId(null);
          setEditingAudioName('');
          showAlert("Event renamed.", 'success');
      } catch (err: any) {
          showAlert(err.message, 'error');
      }
  };

  const handleDeleteAudio = async (id: string) => {
      // Check if used in schedules
      const isUsed = schedules.some(s => s.audioFileId === id);
      if (isUsed) {
          showAlert("Cannot delete audio used in active schedules.", 'error');
          return;
      }
      await db.collection("audio_files").doc(id).delete();
      showAlert("Audio file deleted.", 'info');
  };

  const handlePlayPreview = (url: string) => {
      if (previewAudio) {
          previewAudio.pause();
      }
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play();
      setPreviewAudio(audio);
  };

  const toggleDay = (day: string) => {
      setSelectedDays(prev => 
          prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
      );
  };

  const toggleAllDays = () => {
      if (selectedDays.length === 7) setSelectedDays([]);
      else setSelectedDays([...DAYS_OF_WEEK]);
  };

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
      h = h % 12; 
      h = h ? h : 12; 
      return `${h}:${minutes} ${ampm}`;
  };

  const handleCreateSchedule = async () => {
      if (!selectedGuildId || !selectedAudioId) {
          showAlert("Please select an event and target branch.", 'error');
          return;
      }

      const audioFile = audioFiles.find(a => a.id === selectedAudioId);
      if (!audioFile) return;

      // For Officers, the label is strictly the Event Name (Audio Name)
      // Admins can override the label if they typed one
      const finalLabel = (isAdmin && label) ? label : audioFile.name;

      const time24 = convertTo24Hour(time.hour, time.minute, time.ampm);

      try {
          await db.collection("scheduled_notifications").add({
              guildId: selectedGuildId,
              audioFileId: audioFile.id,
              audioName: audioFile.name,
              audioUrl: audioFile.url,
              label: finalLabel,
              time: time24,
              days: selectedDays.length > 0 ? selectedDays : null,
              createdBy: userProfile.uid
          });
          
          await logAction('Create Notification', `Scheduled "${finalLabel}" at ${time24}`, userProfile, 'System');
          showAlert("Notification scheduled!", 'success');
          // Reset relevant fields
          setLabel('');
          setSelectedDays([]);
      } catch (err: any) {
          showAlert(err.message, 'error');
      }
  };

  const handleDeleteSchedule = async (id: string) => {
      await db.collection("scheduled_notifications").doc(id).delete();
      showAlert("Schedule removed.", 'info');
  };

  const filteredSchedules = schedules.filter(s => 
      isAdmin || (isOfficer && s.guildId === userProfile.guildId)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Scheduler & Upload */}
        <div className="space-y-8">
            {isAdmin && (
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Volume2 className="text-rose-900 dark:text-rose-500" size={20} />
                        Create Event (Audio)
                    </h3>
                    
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Event Name</label>
                        <input 
                            value={newEventName}
                            onChange={e => setNewEventName(e.target.value)}
                            placeholder="e.g. War Start"
                            className="w-full p-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white mb-2"
                        />
                        <p className="text-xs text-zinc-500">This name will be displayed to Officers when scheduling.</p>
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Upload MP3 File</label>
                        <AudioUpload onUploadComplete={handleAudioUpload} />
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Clock className="text-purple-600 dark:text-purple-500" size={20} />
                    Schedule Event
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Target Branch</label>
                        <select 
                            value={selectedGuildId}
                            onChange={e => setSelectedGuildId(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                            disabled={isOfficer}
                        >
                            <option value="">Select Branch</option>
                            {guilds.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Select Event Type</label>
                        <select 
                            value={selectedAudioId}
                            onChange={e => setSelectedAudioId(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                        >
                            <option value="">Select Event...</option>
                            {audioFiles.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        {selectedAudioId && (
                            <button 
                                onClick={() => {
                                    const a = audioFiles.find(f => f.id === selectedAudioId);
                                    if(a) handlePlayPreview(a.url);
                                }}
                                className="text-xs text-rose-600 hover:underline mt-1 flex items-center gap-1"
                            >
                                <Play size={10} /> Preview Sound
                            </button>
                        )}
                    </div>

                    {isAdmin && (
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Custom Label (Optional)</label>
                            <input 
                                value={label}
                                onChange={e => setLabel(e.target.value)}
                                placeholder="Override default name..."
                                className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                            />
                            <p className="text-[10px] text-zinc-400 mt-1">Leave blank to use the Event Name.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Schedule Time</label>
                        <TimePicker value={time} onChange={setTime} />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Repeat Days</label>
                            <button 
                                onClick={toggleAllDays}
                                className="text-[10px] uppercase font-bold text-rose-600 hover:text-rose-500 transition-colors"
                            >
                                {selectedDays.length === 7 ? 'Clear All' : 'Select All'}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK.map(day => (
                                <button
                                    key={day}
                                    onClick={() => toggleDay(day)}
                                    className={`px-2 py-1.5 rounded text-xs font-bold transition-all ${
                                        selectedDays.includes(day)
                                        ? 'bg-rose-900 text-white shadow-md'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                    }`}
                                >
                                    {day.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                        {selectedDays.length === 0 && (
                            <p className="text-[10px] text-zinc-400 mt-1 italic">No days selected. Notification will trigger <strong>Daily</strong>.</p>
                        )}
                    </div>

                    <button 
                        onClick={handleCreateSchedule}
                        className="w-full bg-rose-900 text-white py-3 rounded-lg font-bold hover:bg-rose-950 transition-colors shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2"
                    >
                        <Plus size={18} /> Add Schedule
                    </button>
                </div>
            </div>
        </div>

        {/* Right Column: List & Library */}
        <div className="space-y-8">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Active Schedules</h3>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {filteredSchedules.length === 0 && <p className="text-zinc-500 text-sm">No notifications scheduled.</p>}
                    {filteredSchedules.map(s => (
                        <div key={s.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-rose-900 dark:text-rose-500">{formatTime12Hour(s.time)}</span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{s.label}</span>
                                </div>
                                <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                    <Music size={10} /> {s.audioName}
                                    <span className="mx-1">•</span>
                                    {guilds.find(g => g.id === s.guildId)?.name || 'Unknown Guild'}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {(!s.days || s.days.length === 0 || s.days.length === 7) ? (
                                        <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">Every Day</span>
                                    ) : (
                                        s.days.map(d => (
                                            <span key={d} className="text-[9px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">{d.substring(0,3)}</span>
                                        ))
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDeleteSchedule(s.id)}
                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {isAdmin && (
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Event Audio Library</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {audioFiles.map(f => (
                            <div key={f.id} className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700">
                                {editingAudioId === f.id ? (
                                    <div className="flex-1 flex gap-2">
                                        <input 
                                            value={editingAudioName}
                                            onChange={e => setEditingAudioName(e.target.value)}
                                            className="flex-1 p-1 text-sm bg-white dark:bg-zinc-900 border rounded"
                                            autoFocus
                                        />
                                        <button onClick={() => handleUpdateAudioName(f.id)} className="text-green-500 hover:bg-green-100 dark:hover:bg-green-900/20 p-1 rounded"><Check size={14}/></button>
                                        <button onClick={() => setEditingAudioId(null)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 p-1 rounded"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <button onClick={() => handlePlayPreview(f.url)} className="p-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full hover:bg-rose-500 hover:text-white transition-colors flex-shrink-0">
                                                <Play size={10} fill="currentColor" />
                                            </button>
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate" title={f.name}>{f.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => { setEditingAudioId(f.id); setEditingAudioName(f.name); }}
                                                className="text-zinc-300 hover:text-blue-500 p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteAudio(f.id)}
                                                className="text-zinc-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {audioFiles.length === 0 && <p className="text-zinc-500 text-sm italic">Library is empty.</p>}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
