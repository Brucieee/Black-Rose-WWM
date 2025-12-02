
import React, { useState, useEffect } from 'react';
import { Suggestion } from '../../../types';
import { db } from '../../../services/firebase';
import { useAlert } from '../../../contexts/AlertContext';
import { Check } from 'lucide-react';

export const SuggestionsTab: React.FC = () => {
  const { showAlert } = useAlert();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    const unsub = db.collection("suggestions").orderBy("timestamp", "desc").onSnapshot(snap => setSuggestions(snap.docs.map(d => ({id: d.id, ...d.data()} as Suggestion))));
    return () => unsub();
  }, []);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-bold text-xs uppercase">
                <tr>
                    <th className="p-4">Type</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Message</th>
                    <th className="p-4 text-right">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {suggestions.map(s => (
                    <tr key={s.id}>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                s.type === 'Bug' ? 'bg-red-100 text-red-700' : 
                                s.type === 'Complaint' ? 'bg-orange-100 text-orange-700' : 
                                'bg-blue-100 text-blue-700'
                            }`}>{s.type}</span>
                        </td>
                        <td className="p-4 text-sm text-zinc-900 dark:text-zinc-100">{s.displayName}</td>
                        <td className="p-4 text-sm text-zinc-600 dark:text-zinc-300 max-w-md truncate">{s.content}</td>
                        <td className="p-4 text-right">
                            <button onClick={async () => {
                                await db.collection("suggestions").doc(s.id).delete();
                                showAlert("Resolved/Deleted.", 'info');
                            }} className="text-zinc-400 hover:text-green-600"><Check size={18}/></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
};
