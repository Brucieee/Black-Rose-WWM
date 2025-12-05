
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { AdConfig } from '../types';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

export const GlobalAdSystem: React.FC = () => {
  const location = useLocation();
  const [config, setConfig] = useState<AdConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false); // Animation state

  // Timer refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 1. Fetch Configuration
    const unsub = db.collection('system').doc('adConfig').onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data() as AdConfig;
        setConfig(data);
        
        // If system becomes inactive while open, close it
        if (!data.isActive) {
            setIsOpen(false);
        }
      }
    });

    return () => unsub();
  }, []);

  // 2. Handle Activation Interval
  useEffect(() => {
    if (!config?.isActive) return;

    const minutes = config.intervalMinutes || 30;
    const ms = minutes * 60 * 1000;

    intervalRef.current = setInterval(() => {
      // Only trigger interval if currently on Arena page
      if (location.pathname === '/arena') {
        setIsOpen(true);
        setInputValue(''); // Reset input
        setError(false);
      }
    }, ms);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config?.isActive, config?.intervalMinutes, location.pathname]);

  // 3. Trigger on Arena Page Visit (Navigation)
  useEffect(() => {
    // Only trigger if active, on arena page, and not already open
    if (config?.isActive && location.pathname === '/arena') {
        setIsOpen(true);
        setInputValue('');
        setError(false);
    }
  }, [location.pathname, config?.isActive]);

  // 4. Image Carousel
  useEffect(() => {
    if (!isOpen || !config?.images || config.images.length <= 1) return;

    const imageInterval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % config.images.length);
    }, 3000); // Rotate every 3 seconds

    return () => clearInterval(imageInterval);
  }, [isOpen, config?.images]);

  const handleFakeClose = () => {
    // Fake close logic: Close but come back shortly if still on Arena
    setIsClosing(true);
    setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
        
        // Bring it back!
        if (fakeCloseRef.current) clearTimeout(fakeCloseRef.current);
        fakeCloseRef.current = setTimeout(() => {
            if (location.pathname === '/arena') {
                setIsOpen(true);
            }
        }, 1500); // 1.5s delay before reopening
    }, 200);
  };

  const handleRealCloseAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    if (inputValue.toLowerCase().trim() === config.passphrase.toLowerCase().trim()) {
      // Success
      setIsClosing(true);
      setTimeout(() => {
          setIsOpen(false);
          setIsClosing(false);
          setInputValue('');
          setError(false);
      }, 300);
    } else {
      setError(true);
      setInputValue('');
    }
  };

  if (!isOpen || !config || !config.isActive) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div className="bg-zinc-900 border-2 border-rose-900/50 w-full max-w-3xl rounded-2xl shadow-[0_0_50px_rgba(136,19,55,0.3)] relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-zinc-950 p-3 flex justify-between items-center border-b border-zinc-800 flex-shrink-0">
            <span className="text-xs font-black text-rose-500 uppercase tracking-widest">ADS</span>
            <button 
                onClick={handleFakeClose}
                className="text-zinc-400 hover:text-white hover:bg-red-600/20 p-1 rounded transition-colors"
                title="Close"
            >
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="p-0 relative flex flex-col flex-1 overflow-y-auto">
            {/* Image Gallery */}
            {config.images && config.images.length > 0 ? (
                <div className="relative h-96 w-full bg-black shrink-0">
                    {config.images.map((img, idx) => (
                        <img 
                            key={idx}
                            src={img} 
                            alt="Ad Content" 
                            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
                        />
                    ))}
                </div>
            ) : (
                <div className="h-40 bg-zinc-900 flex items-center justify-center border-b border-zinc-800 shrink-0">
                    <span className="text-zinc-700 italic">No images configured</span>
                </div>
            )}

            <div className="p-6 bg-zinc-900 border-t border-zinc-800 flex flex-col gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white mb-2">{config.title}</h2>
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {config.description}
                    </p>
                </div>

                {/* Challenge Section */}
                <div className="bg-black/40 p-4 rounded-xl border border-rose-900/30">
                    <form onSubmit={handleRealCloseAttempt} className="flex gap-2">
                        <input 
                            type="text" 
                            autoFocus
                            placeholder="Type the passphrase..."
                            className={`flex-1 bg-zinc-900 border ${error ? 'border-red-500 animate-shake' : 'border-zinc-700'} rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500`}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                        />
                        <button 
                            type="submit"
                            className="bg-rose-900 hover:bg-rose-800 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors uppercase tracking-wider"
                        >
                            Verify
                        </button>
                    </form>
                    {error && <p className="text-red-500 text-xs mt-2 font-bold">Incorrect passphrase. Access denied.</p>}
                </div>
            </div>
        </div>
      </div>
      <style>{`
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
            animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>,
    document.body
  );
};
