import React, { useState, useEffect } from 'react';
import { UserProfile, Announcement, Guild } from '../../../types';
import { db } from '../../../services/firebase';
import { useAlert } from '../../../contexts/AlertContext';
import { ImageUpload } from '../../../components/ImageUpload';
import { Edit, Trash2 } from 'lucide-react';
import { logAction } from '../../../services/auditLogger';

interface AnnouncementsTabProps {
  userProfile: UserProfile;
}

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({ userProfile }) => {
  const { showAlert } = useAlert();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  const isAdmin = userProfile.systemRole === 'Admin';
  
  const [announcementForm, setAnnouncementForm] = useState({ 
      title: '', 
      content: '', 
      isGlobal: isAdmin, 
      imageUrl: '', 
      targetGuildId: '' 
  });

  useEffect(() => {
    // Only set global if admin, otherwise default to officer's guild
    if (!isAdmin) {
        setAnnouncementForm(prev => ({ ...prev, isGlobal: false, targetGuildId: userProfile.guildId }));
    }
    const unsubAnn = db.collection("announcements").orderBy("timestamp", "desc").onSnapshot(snap => setAnnouncements(snap.docs.map(d => ({id: d.id, ...d.data()} as Announcement))));
    const unsubGuilds = db.collection("guilds").onSnapshot(snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    return () => { unsubAnn(); unsubGuilds(); };
  }, [isAdmin, userProfile.guildId]);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();

    // VALIDATION: Ensure a guild is selected if not global
    if (!announcementForm.isGlobal && !announcementForm.targetGuildId) {
        showAlert("Please select a target guild branch.", 'error');
        return;
    }

    try {
      const data = {
        title: announcementForm.title,
        content: announcementForm.content,
        authorId: userProfile.uid,
        authorName: userProfile.displayName,
        guildId: announcementForm.isGlobal ? 'global' : announcementForm.targetGuildId,
        timestamp: new Date().toISOString(),
        isGlobal: announcementForm.isGlobal,
        imageUrl: announcementForm.imageUrl
      };

      if (editingAnnouncement) {
          await db.collection("announcements").doc(editingAnnouncement.id).update(data);
          await logAction('Edit Announcement', `Edited announcement: ${announcementForm.title}`, userProfile, 'Announcement');
          setEditingAnnouncement(null);
          showAlert("Announcement updated.", 'success');
      } else {
          await db.collection("announcements").add(data);
          await logAction('Post Announcement', `Posted announcement: ${announcementForm.title}`, userProfile, 'Announcement');
          showAlert("Announcement posted.", 'success');
      }
      setAnnouncementForm({ title: '', content: '', isGlobal: isAdmin, imageUrl: '', targetGuildId: isAdmin ? '' : userProfile.guildId });
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 sticky top-6">
                <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">{editingAnnouncement ? 'Edit Announcement' : 'Post Announcement'}</h3>
                <form onSubmit={handlePostAnnouncement} className="space-y-4">
                    <input 
                    placeholder="Title" 
                    required
                    className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                    value={announcementForm.title}
                    onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})}
                    />
                    <ImageUpload 
                    initialUrl={announcementForm.imageUrl}
                    onUploadComplete={(url) => setAnnouncementForm({...announcementForm, imageUrl: url})}
                    />
                    <textarea 
                        placeholder="Content"
                        required
                        className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white h-32"
                        value={announcementForm.content}
                        onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})}
                    />
                    
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={announcementForm.isGlobal} onChange={e => setAnnouncementForm({...announcementForm, isGlobal: e.target.checked})} />
                            <label className="text-sm text-zinc-700 dark:text-zinc-300">Global Announcement</label>
                        </div>
                    )}

                    {isAdmin && !announcementForm.isGlobal && (
                        <select 
                        value={announcementForm.targetGuildId}
                        onChange={e => setAnnouncementForm({...announcementForm, targetGuildId: e.target.value})}
                        className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                        required={!announcementForm.isGlobal}
                        >
                            <option value="" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">Select Target Branch</option>
                            {guilds.map(g => <option key={g.id} value={g.id} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{g.name}</option>)}
                        </select>
                    )}

                    <button type="submit" className="w-full bg-rose-900 text-white py-2 rounded-lg font-bold">
                        {editingAnnouncement ? 'Update' : 'Post'}
                    </button>
                    {editingAnnouncement && (
                        <button type="button" onClick={() => {
                            setEditingAnnouncement(null);
                            setAnnouncementForm({ title: '', content: '', isGlobal: isAdmin, imageUrl: '', targetGuildId: isAdmin ? '' : userProfile.guildId });
                        }} className="w-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-white py-2 rounded-lg font-bold">Cancel</button>
                    )}
                </form>
            </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
                {announcements.map(ann => (
                    <div key={ann.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative group">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    {ann.title}
                                    {ann.isGlobal ? (
                                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">GLOBAL</span>
                                    ) : (
                                        <span className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full uppercase">
                                            {guilds.find(g => g.id === ann.guildId)?.name || 'Branch'}
                                        </span>
                                    )}
                                </h4>
                                <p className="text-xs text-zinc-500 mb-2">By {ann.authorName} • {new Date(ann.timestamp).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    setEditingAnnouncement(ann);
                                    setAnnouncementForm({ 
                                        title: ann.title, 
                                        content: ann.content, 
                                        isGlobal: ann.isGlobal, 
                                        imageUrl: ann.imageUrl || '',
                                        targetGuildId: ann.guildId === 'global' ? '' : ann.guildId
                                    });
                                }} className="text-zinc-300 hover:text-blue-500"><Edit size={16} /></button>
                                <button onClick={async () => {
                                    await db.collection("announcements").doc(ann.id).delete();
                                    await logAction('Delete Announcement', `Deleted announcement: ${ann.title}`, userProfile, 'Announcement');
                                    showAlert("Deleted.", 'info');
                                }} className="text-zinc-300 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{ann.content}</p>
                        {ann.imageUrl && <img src={ann.imageUrl} className="mt-3 rounded-lg max-h-48 object-cover" />}
                    </div>
                ))}
        </div>
    </div>
  );
};