
import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { RichText } from '../components/RichText';

const Events: React.FC = () => {
  const { events, guilds } = useData();

  // Filter and sort for display
  const displayEvents = React.useMemo(() => {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Include today's events even if time passed
      return events
        .filter(e => new Date(e.date) >= now)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Descending order as per original file? Original was desc.
  }, [events]);

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
          {displayEvents.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              No upcoming events found. Check back later!
            </div>
          ) : (
            displayEvents.map(event => {
              const branchName = guilds.find(g => g.id === event.guildId)?.name || 'Global';
              const eventDate = new Date(event.date);
              
              return (
                <div key={event.id} className="p-4 sm:p-6 group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Image or Date */}
                    <div className="w-full md:w-64 flex-shrink-0">
                        {event.imageUrl ? (
                            <div className="aspect-video w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 relative">
                                <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-bold uppercase">
                                    {eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full min-h-[140px] bg-zinc-100 dark:bg-zinc-800 rounded-lg flex flex-col items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                <span className="text-3xl font-bold text-zinc-300 dark:text-zinc-600 mb-1">{eventDate.getDate()}</span>
                                <span className="text-xs font-bold uppercase tracking-wider">{eventDate.toLocaleDateString(undefined, { month: 'long' })}</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Details */}
                    <div className="flex-1 min-w-0 flex flex-col">
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
                        
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{event.title}</h3>
                        
                        <div className="flex-1">
                            <RichText text={event.description} className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed" />
                        </div>

                        <div className="mt-4 flex items-center text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                            <Clock size={16} className="mr-2" />
                            {eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', weekday: 'long' })}
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
