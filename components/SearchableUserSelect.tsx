
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { Search, User } from 'lucide-react';

interface SearchableUserSelectProps {
  users: UserProfile[];
  selectedUid: string;
  onSelect: (user: UserProfile) => void;
  placeholder?: string;
}

export const SearchableUserSelect: React.FC<SearchableUserSelectProps> = ({ 
  users, 
  selectedUid, 
  onSelect,
  placeholder = "Search user..." 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = users.find(u => u.uid === selectedUid);
    if (selected) {
      setSearchTerm(selected.displayName);
    }
  }, [selectedUid, users]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search term to selected user on close if valid
        const selected = users.find(u => u.uid === selectedUid);
        if (selected) setSearchTerm(selected.displayName);
        else if (!selectedUid) setSearchTerm('');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, selectedUid, users]);

  const filteredUsers = users.filter(user => 
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.inGameId.includes(searchTerm)
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          className="w-full pl-9 pr-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900 outline-none"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
          {filteredUsers.length === 0 ? (
            <div className="p-3 text-sm text-zinc-500 text-center">No users found</div>
          ) : (
            filteredUsers.map(user => (
              <button
                key={user.uid}
                type="button"
                onClick={() => {
                  onSelect(user);
                  setSearchTerm(user.displayName);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-between group ${
                  user.uid === selectedUid ? 'bg-rose-50 dark:bg-rose-900/10 text-rose-900 dark:text-rose-400' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0">
                        {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <User size={14} className="m-1" />}
                    </div>
                    <span>{user.displayName}</span>
                </div>
                <span className="text-xs text-zinc-400 font-mono">{user.inGameId}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
