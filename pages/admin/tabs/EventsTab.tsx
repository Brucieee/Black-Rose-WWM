import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Clock, ChevronDown, Edit } from 'lucide-react';
import { Guild, GuildEvent, UserProfile } from '../../../types';
import { db } from '../../../services/firebase';
import { useAlert } from '../../../contexts/AlertContext';
import { ImageUpload } from '../../../components/ImageUpload';
import { ConfirmationModal } from '../../../components/modals/ConfirmationModal';
import { TimePicker } from '../../../components/TimePicker';
import { logAction } from '../../../services/auditLogger';

interface EventsTabProps {
  userProfile: UserProfile;
}

export const EventsTab: React.FC<EventsTabProps> = ({ userProfile }) => {
  const { showAlert } = useAlert();
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  
  const [eventDateInput, setEventDateInput] = useState('');
  const [eventTimeInput, setEventTimeInput] = useState({ hour: '8', minute: '00', ampm: 'PM' });
  const [eventForm, setEventForm] = useState({
    title: '', description: '', type: 'Raid', customType: '', guildId: '', imageUrl: ''
  });
  
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  const [deleteConf, setDeleteConf] = useState<{ isOpen: boolean; action: () => Promise<void> }>({ isOpen: false, action: async () => {} });

  const isAdmin = userProfile.systemRole === 'Admin';
  const isOfficer = userProfile.systemRole === 'Officer';
  const standardEventTypes = ['Raid', 'PvP', 'Social', 'Meeting'];

  useEffect(() => {
    // Set default guild ID for officer
    if (isOfficer) {
        setEventForm(prev => ({...prev, guildId: userProfile.guildId}));
    }
    const unsubEvents = db.collection("events").onSnapshot(snap => setEvents(snap.docs.map(d => ({id: d.id, ...d.data()} as GuildEvent))));
    const unsubGuilds = db.collection("guilds").onSnapshot(snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    return () => { unsubEvents(); unsubGuilds(); };
  }, [isOfficer, userProfile.guildId]);

  const convertTo24Hour = (hour: string, minute: string, ampm: string) => {
      let h = parseInt(hour, 10);
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${minute}`;
  };

  const resetForm = () => {
      setEventForm({ title: '', description: '', type: 'Raid', customType: '', guildId: isOfficer ? userProfile.guildId : '', imageUrl: '' });
      setEventDateInput('');
      setEventTimeInput({ hour: '8', minute: '00', ampm: 'PM' });
      setEditingEventId(null);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
      e.preventDefault();
      const finalType = eventForm.type === 'Other' ? eventForm.customType : eventForm.type;
      const dateStr = `${eventDateInput}T${convertTo24Hour(eventTimeInput.hour, eventTimeInput.minute, eventTimeInput.ampm)}:00`;
      
      if (isOfficer && (!eventForm.guildId || eventForm.guildId !== userProfile.guildId)) {
          showAlert("You can only create/edit events for your branch.", "error");
          return;
      }

      const eventData = {
          title: eventForm.title,
          description: eventForm.description,
          type: finalType,
          guildId: eventForm.guildId,
          imageUrl: eventForm.imageUrl,
          date: new Date(dateStr).toISOString()
      };

      try {
          if (editingEventId) {
              await db.collection("events").doc(editingEventId).update(eventData);
              await logAction('Edit Event', `Updated event: ${eventForm.title}`, userProfile, 'Event');
              showAlert("Event updated.", 'success');
          } else {
              await db.collection("events").add(eventData);
              await logAction('Create Event', `Created event: ${eventForm.title}`, userProfile, 'Event');
              showAlert("Event created.", 'success');
          }
          resetForm();
      } catch (err: any) {
          showAlert(err.message, 'error');
      }
  };

  const handleEditClick = (event: GuildEvent) => {
      const isGlobal = !event.guildId || event.guildId === 'global';
      
      // Permission Check
      if (isOfficer && isGlobal) {
          showAlert("Officers cannot edit global events.", "error");
          return;
      }
      if (isOfficer && event.guildId !== userProfile?.guildId) {
          showAlert("You can only edit events for your branch.", "error");
          return;
      }

      setEditingEventId(event.id);
      
      // Parse Date
      const d = new Date(event.date);
      setEventDateInput(d.toISOString().split('T')[0]);
      
      let h = d.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      
      setEventTimeInput({
          hour: h.toString(),
          minute: d.getMinutes().toString().padStart(2, '0'),
          ampm
      });

      const isStandardType = standardEventTypes.includes(event.type);

      setEventForm({
          title: event.title,
          description: event.description,
          type: isStandardType ? event.type : 'Other',
          customType: isStandardType ? '' : event.type,
          guildId: event.guildId || '',
          imageUrl: event.imageUrl || ''
      });
  };

  const handleDeleteEvent = async (event: GuildEvent) => {
      const isGlobal = !event.guildId || event.guildId === 'global';
      if (isOfficer && isGlobal) {
          showAlert("Officers cannot delete global events.", "error");
          return;
      }
      if (isOfficer && event.guildId !== userProfile?.guildId) {
          showAlert("You can only delete events for your branch.", "error");
          return;
      }

      setDeleteConf({
          isOpen: true,
          action: async () => {
              await db.collection("events").doc(event.id).delete();
              await logAction('Delete Event', `Deleted event: ${event.title}`, userProfile, 'Event');
              if (editingEventId === event.id) resetForm();
              showAlert("Event deleted.", 'info');
          }
      });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 h-fit shadow-sm sticky top-6">
            <h3 className="text-lg font-bold mb-6 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Calendar size={20} className="text-rose-900 dark:text-rose-500" /> 
                {editingEventId ? 'Edit Event' : 'Create Event'}
            </h3>
            <form onSubmit={handleSaveEvent} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Event Title</label>
                    <input 
                    placeholder="e.g. Weekly Reset Raid" 
                    required
                    className="w-full px-4 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    value={eventForm.title}
                    onChange={e => setEventForm({...eventForm, title: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Type</label>
                        <div className="relative">
                            <select 
                            className="w-full px-4 py-2 appearance-none border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            value={eventForm.type}
                            onChange={e => setEventForm({...eventForm, type: e.target.value})}
                            >
                                {standardEventTypes.map(t => <option key={t} value={t} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{t}</option>)}
                                <option value="Other" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">Other</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Branch</label>
                        <div className="relative">
                            <select 
                            className="w-full px-4 py-2 appearance-none border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                            value={eventForm.guildId}
                            onChange={e => setEventForm({...eventForm, guildId: e.target.value})}
                            disabled={isOfficer}
                            >
                                {isAdmin && <option value="" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">Global</option>}
                                {guilds.map(g => (
                                    <option key={g.id} value={g.id} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{g.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {eventForm.type === 'Other' && (
                    <input 
                    placeholder="Custom Type Name" 
                    className="w-full px-4 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    value={eventForm.customType}
                    onChange={e => setEventForm({...eventForm, customType: e.target.value})}
                    />
                )}

                <div className="space-y-3">
                    <label className="block text-xs font-bold text-zinc-500 uppercase">Schedule</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <input 
                                type="date"
                                required
                                className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                value={eventDateInput}
                                onChange={e => setEventDateInput(e.target.value)}
                            />
                        </div>
                        <div className="w-full sm:w-auto">
                            <TimePicker value={eventTimeInput} onChange={setEventTimeInput} />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Description</label>
                    <textarea 
                        placeholder="Details about the event..."
                        className="w-full px-4 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500 h-24 resize-none"
                        value={eventForm.description}
                        onChange={e => setEventForm({...eventForm, description: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cover Image</label>
                    <ImageUpload 
                    folder="events"
                    initialUrl={eventForm.imageUrl}
                    onUploadComplete={(url) => setEventForm({...eventForm, imageUrl: url})}
                    />
                </div>

                <div className="flex gap-2">
                    {editingEventId && (
                        <button 
                            type="button" 
                            onClick={resetForm}
                            className="flex-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 py-3 rounded-lg font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button type="submit" className="flex-1 bg-rose-900 text-white py-3 rounded-lg font-bold shadow-lg shadow-rose-900/20 hover:bg-rose-950 transition-colors">
                        {editingEventId ? 'Update Event' : 'Create Event'}
                    </button>
                </div>
            </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Scheduled Events</h3>
            {events.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center text-zinc-500">
                    No events scheduled.
                </div>
            ) : (
                events.map(event => {
                    const isGlobal = !event.guildId || event.guildId === 'global';
                    // Can delete logic: Admin OR (Officer AND NOT Global AND Own Branch)
                    const canManage = isAdmin || (isOfficer && !isGlobal && event.guildId === userProfile.guildId);

                    return (
                    <div key={event.id} className={`bg-white dark:bg-zinc-900 p-4 rounded-xl border transition-all flex gap-4 ${
                        editingEventId === event.id 
                        ? 'border-rose-500 dark:border-rose-500 ring-1 ring-rose-500' 
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
                    }`}>
                        <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex-shrink-0 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                            {event.imageUrl ? (
                                <img src={event.imageUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                                    <Calendar size={24} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 truncate pr-4">{event.title}</h4>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                        isGlobal ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                    }`}>
                                        {isGlobal ? 'Global' : guilds.find(g => g.id === event.guildId)?.name || 'Branch'}
                                    </span>
                                    {canManage && (
                                        <>
                                            <button 
                                                onClick={() => handleEditClick(event)} 
                                                className="text-zinc-300 hover:text-blue-500 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                title="Edit Event"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteEvent(event)} 
                                                className="text-zinc-300 hover:text-red-500 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                title="Delete Event"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{event.description}</p>
                            <div className="mt-3 flex items-center gap-3 text-xs font-medium">
                                <span className="flex items-center gap-1 text-rose-900 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/10 px-2 py-1 rounded">
                                    <Clock size={12} /> {new Date(event.date).toLocaleString()}
                                </span>
                                <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                    {event.type}
                                </span>
                            </div>
                        </div>
                    </div>
                )})
            )}
        </div>
        <ConfirmationModal 
            isOpen={deleteConf.isOpen} 
            onClose={() => setDeleteConf({...deleteConf, isOpen: false})} 
            onConfirm={deleteConf.action} 
            title="Delete Event?" 
            message="This action cannot be undone." 
        />
    </div>
  );
};