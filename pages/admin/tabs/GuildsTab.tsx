
import React, { useState, useEffect } from 'react';
import { Guild } from '../../../types';
import { db } from '../../../services/firebase';
import { useAlert } from '../../../contexts/AlertContext';
import { CreateGuildModal } from '../../../components/modals/CreateGuildModal';
import { Edit } from 'lucide-react';

export const GuildsTab: React.FC = () => {
  const { showAlert } = useAlert();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isCreateGuildModalOpen, setIsCreateGuildModalOpen] = useState(false);
  const [newGuildData, setNewGuildData] = useState({ name: '', id: '', memberCap: 80});
  const [editingGuildId, setEditingGuildId] = useState<string | null>(null);
  const [guildEditForm, setGuildEditForm] = useState({ name: '', memberCap: 80 });

  useEffect(() => {
    const unsub = db.collection("guilds").onSnapshot(snap => setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild))));
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Guild Branches</h2>
            <button onClick={() => {
                const nextNum = guilds.length + 1;
                setNewGuildData({ name: `Black Rose ${['I','II','III','IV','V','VI'][nextNum-1] || nextNum}`, id: `g${nextNum}`, memberCap: 80 });
                setIsCreateGuildModalOpen(true);
            }} className="bg-rose-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-rose-950 transition-colors">
                + Create Branch
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guilds.map(g => (
                <div key={g.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    {editingGuildId === g.id ? (
                        <div className="space-y-3">
                            <input 
                              className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-white" 
                              value={guildEditForm.name} 
                              onChange={e => setGuildEditForm({...guildEditForm, name: e.target.value})} 
                            />
                            <input 
                              type="number"
                              className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-white" 
                              value={guildEditForm.memberCap} 
                              onChange={e => setGuildEditForm({...guildEditForm, memberCap: parseInt(e.target.value)})} 
                            />
                            <div className="flex gap-2">
                                <button onClick={async () => {
                                    await db.collection("guilds").doc(g.id).update(guildEditForm);
                                    setEditingGuildId(null);
                                    showAlert("Guild updated.", 'success');
                                }} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Save</button>
                                <button onClick={() => setEditingGuildId(null)} className="bg-zinc-500 text-white px-3 py-1 rounded text-sm">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{g.name}</h3>
                                <button onClick={() => {
                                    setEditingGuildId(g.id);
                                    setGuildEditForm({ name: g.name, memberCap: g.memberCap });
                                }} className="text-zinc-400 hover:text-zinc-600"><Edit size={16} /></button>
                            </div>
                            <p className="text-sm text-zinc-500">ID: {g.id}</p>
                            <p className="text-sm text-zinc-500">Capacity: {g.memberCap}</p>
                        </>
                    )}
                </div>
            ))}
        </div>
        <CreateGuildModal isOpen={isCreateGuildModalOpen} onClose={() => setIsCreateGuildModalOpen(false)} onSubmit={async (e) => {
            e.preventDefault();
            await db.collection("guilds").doc(newGuildData.id).set(newGuildData);
            setIsCreateGuildModalOpen(false);
            showAlert("Branch created.", 'success');
        }} data={newGuildData} onChange={setNewGuildData} />
    </div>
  );
};
