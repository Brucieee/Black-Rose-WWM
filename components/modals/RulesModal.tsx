import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Check, ShieldAlert } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [checkedState, setCheckedState] = useState<boolean[]>([false, false, false, false]);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
        setCheckedState([false, false, false, false]);
    }
  }, [isOpen]);

  const handleCheck = (index: number) => {
    const newState = [...checkedState];
    newState[index] = !newState[index];
    setCheckedState(newState);
  };

  const allChecked = checkedState.every(Boolean);

  const sections = [
    {
      icon: '🌸',
      title: 'GUILD CULTURE',
      content: [
        'Respect everyone: our GM, officers, and fellow members.',
        'Feel free to be yourself, join conversations, and interact in public channels. The community is highly active in discord channels, so don\'t be a stranger and join in!',
        'We are a diverse guild, so always be mindful of boundaries. Know your limits and respect others.'
      ]
    },
    {
      icon: '⚔️',
      title: 'GUILD ACTIVITIES & CONTRIBUTION',
      content: [
        'BlackRose is casual, but our hearts are competitive.',
        'We don’t force attendance for every event.',
        'However, Guild Contribution is required from all members. This goes without saying but you joined a Guild, so certain contributions is a must.',
        'Please do your Guild Events/Missions to help level the guild and unlock upgrades for everyone.'
      ]
    },
    {
      icon: '🥀',
      title: 'INACTIVITY POLICY',
      content: [
        'Low contribution after 1 week in the guild = considered inactive.',
        '3 days of inactivity (no notice) = subject to kick.',
        'If you decide to come back later, and be active again, you’re always welcome to rejoin just message @Ashburn - Vice Guild Master - I or any officer.'
      ]
    },
    {
      icon: '🔥',
      title: 'BEHAVIOR & CONDUCT',
      content: [
        'Toxicity, harassment, or anything that damages BlackRose\'s image will result in removal once proven.',
        'We\'re building a respectful, friendly, and supportive community — help us keep it that way.'
      ]
    }
  ];

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl max-h-[90vh] flex flex-col" hideCloseButton={true}>
      
      {/* Header */}
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center text-center">
         <div className="flex items-center gap-3 mb-2">
            <img src="https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/logo/br-black.png" className="w-8 h-8 dark:hidden" alt="Rose" />
            <img src="https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/logo/br-white.png" className="w-8 h-8 hidden dark:block" alt="Rose" />
            <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                WELCOME TO BLACKROSE
            </h2>
            <img src="https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/logo/br-black.png" className="w-8 h-8 dark:hidden transform scale-x-[-1]" alt="Rose" />
            <img src="https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/logo/br-white.png" className="w-8 h-8 hidden dark:block transform scale-x-[-1]" alt="Rose" />
         </div>
         <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
            We're glad to have you here! Please read our guidelines to keep our community healthy and enjoyable.
         </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-white dark:bg-zinc-900">
          {sections.map((section, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border transition-all duration-300 ${
                    checkedState[idx] 
                    ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30' 
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                  <div className="flex gap-4">
                      {/* Checkbox Area */}
                      <div className="flex-shrink-0 pt-1">
                          <label className="flex items-center justify-center w-6 h-6 border-2 border-zinc-300 dark:border-zinc-600 rounded cursor-pointer hover:border-rose-500 transition-colors relative">
                              <input 
                                type="checkbox" 
                                className="appearance-none w-full h-full cursor-pointer"
                                checked={checkedState[idx]}
                                onChange={() => handleCheck(idx)}
                              />
                              {checkedState[idx] && <Check size={14} className="text-rose-600 dark:text-rose-500 absolute pointer-events-none" />}
                          </label>
                      </div>

                      {/* Text Content */}
                      <div className="flex-1">
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                              <span className="text-lg">{section.icon}</span> {section.title}
                          </h3>
                          <ul className="space-y-2">
                              {section.content.map((line, i) => (
                                  <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed flex items-start gap-2">
                                      <span className="block w-1 h-1 bg-zinc-400 rounded-full mt-2 flex-shrink-0"></span>
                                      {line}
                                  </li>
                              ))}
                          </ul>
                      </div>
                  </div>
              </div>
          ))}

          <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl text-center">
              <p className="text-sm font-bold text-rose-900 dark:text-rose-400 mb-1">🌹 Welcome once again to BlackRose.</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Let’s explore, improve, and enjoy Where Winds Meet together.</p>
          </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 backdrop-blur-sm flex gap-3 justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 font-bold transition-colors text-sm"
          >
            Decline
          </button>
          <button 
            onClick={onConfirm}
            disabled={!allChecked}
            className="px-8 py-3 bg-rose-900 text-white rounded-xl font-bold shadow-lg shadow-rose-900/20 hover:bg-rose-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {allChecked ? 'Accept & Join' : 'Read & Check All'}
          </button>
      </div>

    </BaseModal>
  );
};