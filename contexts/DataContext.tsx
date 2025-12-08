
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { UserProfile, Guild, GuildEvent } from '../types';

interface DataContextType {
  users: UserProfile[];
  guilds: Guild[];
  events: GuildEvent[];
  loading: boolean;
}

const DataContext = createContext<DataContextType>({ users: [], guilds: [], events: [], loading: true });

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to Users
    const unsubUsers = db.collection("users").onSnapshot(snap => {
        setUsers(snap.docs.map(d => d.data() as UserProfile));
    }, err => console.log("Users fetch error", err));

    // Subscribe to Guilds
    const unsubGuilds = db.collection("guilds").orderBy("name").onSnapshot(snap => {
        setGuilds(snap.docs.map(d => ({id: d.id, ...d.data()} as Guild)));
    }, err => console.log("Guilds fetch error", err));

    // Subscribe to Events
    const unsubEvents = db.collection("events").onSnapshot(snap => {
        setEvents(snap.docs.map(d => ({id: d.id, ...d.data()} as GuildEvent)));
    }, err => console.log("Events fetch error", err));

    // Set loading to false initially to unblock UI, data will stream in
    setLoading(false);

    return () => { 
        unsubUsers(); 
        unsubGuilds(); 
        unsubEvents(); 
    };
  }, []);

  return (
    <DataContext.Provider value={{ users, guilds, events, loading }}>
      {children}
    </DataContext.Provider>
  );
};
