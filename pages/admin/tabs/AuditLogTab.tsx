import React, { useState, useEffect } from 'react';
import { AuditLogEntry } from '../../../types';
import { db } from '../../../services/firebase';
import { Search, User } from 'lucide-react';

export const AuditLogTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    // Limit to last 100 entries for performance, ordered by newest
    const unsub = db.collection("audit_logs")
      .orderBy("timestamp", "desc")
      .limit(100)
      .onSnapshot(snap => {
        setLogs(snap.docs.map(d => ({id: d.id, ...d.data()} as AuditLogEntry)));
      });
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(search.toLowerCase()) || 
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.performedByName.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = filterCategory === 'All' || log.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'System': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'Guild': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Queue': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'Event': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Announcement': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
      case 'Member': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          System Audit Log
        </h2>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 text-zinc-900 dark:text-zinc-100"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <select 
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 text-zinc-900 dark:text-zinc-100"
          >
            <option value="All">All Categories</option>
            <option value="System">System</option>
            <option value="Guild">Guild</option>
            <option value="Queue">Queue</option>
            <option value="Event">Event</option>
            <option value="Announcement">Announcement</option>
            <option value="Member">Member</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 font-bold uppercase border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Details</th>
                <th className="px-6 py-3">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-3 text-zinc-500 whitespace-nowrap font-mono text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    <div className="flex items-center gap-2">
                        <User size={14} className="text-zinc-400" />
                        {log.performedByName}
                    </div>
                  </td>
                  <td className="px-6 py-3 font-bold text-zinc-800 dark:text-zinc-200">
                    {log.action}
                  </td>
                  <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getCategoryColor(log.category)}`}>
                      {log.category}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};