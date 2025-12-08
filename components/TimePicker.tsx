
import React from 'react';

interface TimePickerProps {
  value: { hour: string; minute: string; ampm: string };
  onChange: (value: { hour: string; minute: string; ampm: string }) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  // Generate minutes 00, 05, 10 ... 55
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  return (
    <div className="flex border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
      <select 
        className="p-2 bg-transparent text-zinc-900 dark:text-white outline-none text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors" 
        value={value.hour} 
        onChange={e => onChange({...value, hour: e.target.value})}
      >
        {Array.from({length:12},(_,i)=>i+1).map(h=><option key={h} value={h} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{h}</option>)}
      </select>
      <div className="flex items-center justify-center border-l border-r border-zinc-200 dark:border-zinc-700 px-1">
        <select 
          className="p-2 bg-transparent text-zinc-900 dark:text-white outline-none text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors" 
          value={value.minute} 
          onChange={e => onChange({...value, minute: e.target.value})}
        >
          {minutes.map(m=><option key={m} value={m} className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">{m}</option>)}
        </select>
      </div>
      <select 
        className="p-2 bg-transparent text-zinc-900 dark:text-white outline-none text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors font-bold" 
        value={value.ampm} 
        onChange={e => onChange({...value, ampm: e.target.value})}
      >
        <option value="AM" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">AM</option>
        <option value="PM" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">PM</option>
      </select>
    </div>
  );
};
