
import React, { ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  hideCloseButton?: boolean;
  allowOverflow?: boolean;
}

export const BaseModal: React.FC<BaseModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  className = "max-w-md",
  hideCloseButton = false,
  allowOverflow = false
}) => {
  const mouseDownTarget = useRef<EventTarget | null>(null);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only track if the mousedown actually happened on the backdrop (self)
    if (e.target === e.currentTarget) {
      mouseDownTarget.current = e.target;
    } else {
      mouseDownTarget.current = null;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Only close if mouse started on backdrop AND ended on backdrop
    if (mouseDownTarget.current === e.currentTarget && e.target === e.currentTarget) {
      onClose();
    }
    mouseDownTarget.current = null;
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div className={`bg-white dark:bg-zinc-900 w-full rounded-xl shadow-2xl relative animate-in zoom-in-95 duration-200 ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} ${className}`}>
        {!hideCloseButton && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 z-10 p-1 bg-white/10 rounded-full hover:bg-black/10 transition-colors"
          >
            <X size={20} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};
