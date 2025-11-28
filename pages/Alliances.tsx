
import React from 'react';
import { Shield } from 'lucide-react';

const Alliances: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
        <Shield size={40} className="text-zinc-400 dark:text-zinc-500" />
      </div>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Alliances</h1>
      <p className="text-zinc-500 dark:text-zinc-400">This feature is coming soon...</p>
    </div>
  );
};

export default Alliances;
