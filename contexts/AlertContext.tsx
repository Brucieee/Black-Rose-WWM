
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface AlertContextType {
  showAlert: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within AlertProvider');
  return context;
};

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [customTitle, setCustomTitle] = useState<string | undefined>(undefined);
  const [type, setType] = useState<'success' | 'error' | 'info'>('info');

  const showAlert = (msg: string, t: 'success' | 'error' | 'info' = 'info', title?: string) => {
    setMessage(msg);
    setType(t);
    setCustomTitle(title);
    setIsOpen(true);
  };

  const closeAlert = () => setIsOpen(false);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={closeAlert} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-500' :
                type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-500' :
                'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-500'
              }`}>
                {type === 'error' ? <AlertCircle size={24} /> : 
                 type === 'success' ? <CheckCircle size={24} /> : 
                 <Info size={24} />}
              </div>
              
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2 capitalize">
                {customTitle || (type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice')}
              </h3>
              
              <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
                {message}
              </p>
              
              <button 
                onClick={closeAlert}
                className="w-full py-2.5 rounded-lg font-medium transition-colors bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Okay
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AlertContext.Provider>
  );
};
