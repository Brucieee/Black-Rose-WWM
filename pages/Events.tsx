

import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { db } from '../services/firebase';
import { GuildEvent, Guild } from '../types';
import { RichText } from '../components/RichText';

const Events: React.FC = () => {
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);

  useEffect(() => {
    // FIX: Use Firebase v8 compat syntax
    const qEvents = db.collection("events").orderBy("date", "desc");
    const unsubEvents = qEvents.onSnapshot(snap => {
      setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuildEvent)));
    });
    
    // FIX: Use Firebase v8 compat syntax
    const guildsCollection = db.collection("guilds");
    guildsCollection.get().then(snap => {
      setGuilds(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guild)));
    });

    return () => unsubEvents();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Events Calendar</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">View all upcoming guild activities across all branches.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-xl flex items-center gap-2">
             <Calendar className="text-rose-900 dark:text-rose-500" /> All Events
          </h2>
        </div>
        
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {events.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              No upcoming events found. Check back later!
            </div>
          ) : (
            events.map(event => {
              const branchName = guilds.find(g => g.id === event.guildId)?.name || 'Global';
              const eventDate = new Date(event.date);
              
              return (
                <div key={event.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-6 group">
                  {/* Date Box */}
                  <div className="flex-shrink-0 flex sm:flex-col items-center gap-2 sm:gap-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 min-w-[80px] text-center group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20 transition-colors sticky top-4">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">{eventDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                    <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{eventDate.getDate()}</span>
                    <span className="text-xs text-zinc-400 hidden sm:block">{eventDate.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        event.type === 'Raid' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' :
                        event.type === 'PvP' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : 
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {event.type}
                      </span>
                      <span className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                        • {branchName}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">{event.title}</h4>
                    <RichText text={event.description} className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed" />
                  </div>

                  {/* Time / Action */}
                  <div className="flex items-center gap-4 sm:border-l sm:border-zinc-100 dark:sm:border-zinc-800 sm:pl-6 min-w-[150px] pt-1">
                     <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1">Start Time</span>
                        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
                          <Clock size={16} />
                          {eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                     </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;
