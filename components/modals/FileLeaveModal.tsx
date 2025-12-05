
import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Plane, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { UserProfile, Guild } from '../../types';
import { useAlert } from '../../contexts/AlertContext';
import firebase from 'firebase/compat/app';

interface FileLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  guildName: string;
}

export const FileLeaveModal: React.FC<FileLeaveModalProps> = ({ isOpen, onClose, userProfile, guildName }) => {
  const { showAlert } = useAlert();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFlying, setIsFlying] = useState(false);

  const isValidDate = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      const year = d.getFullYear();
      // Basic check for 4-digit year format validity range
      return year >= 2024 && year <= 2030; 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      showAlert("Please select both start and end dates.", 'error');
      return;
    }

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
        showAlert("Invalid date. Please use a valid 4-digit year (e.g. 2025).", 'error');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      showAlert("End date cannot be before start date.", 'error');
      return;
    }

    // Calculate duration in days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 3 && !reason.trim()) {
        showAlert("A reason is required for leaves exceeding 3 days.", 'error');
        return;
    }

    setIsSubmitting(true);
    // Trigger Animation
    setIsFlying(true);

    try {
      // Small delay to let animation start visually before async op
      await new Promise(r => setTimeout(r, 100));

      await db.collection("leaves").add({
        uid: userProfile.uid,
        displayName: userProfile.displayName,
        inGameId: userProfile.inGameId,
        guildId: userProfile.guildId,
        guildName: guildName,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
        timestamp: new Date().toISOString()
      });

      // Wait for animation to finish (approx 1s)
      setTimeout(() => {
          setIsFlying(false);
          setIsSubmitting(false);
          setStartDate('');
          setEndDate('');
          setReason('');
          onClose();
          showAlert("Leave request filed successfully.", 'success');
      }, 900);

    } catch (error: any) {
      console.error("Error filing leave:", error);
      setIsFlying(false);
      setIsSubmitting(false);
      showAlert(`Failed to file leave: ${error.message}`, 'error');
    }
  };

  // If currently flying, we render the paper plane animation
  if (isFlying) {
      return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
              <div className="bg-zinc-900 text-white p-6 rounded-full shadow-2xl flex items-center justify-center animate-fly-up-out ring-4 ring-white/20">
                  <Plane size={48} className="fill-current transform -rotate-45" />
              </div>
          </div>
      );
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-sm">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-full">
            <Plane className="w-6 h-6 text-zinc-900 dark:text-zinc-100 transform -rotate-45" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">File Leave</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Notify the guild of your absence</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Start Date</label>
            <div className="relative">
              <input 
                type="date" 
                required
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:outline-none cursor-pointer"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">End Date (Return)</label>
            <div className="relative">
              <input 
                type="date" 
                required
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:outline-none cursor-pointer"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Reason <span className="font-normal normal-case text-zinc-400">(Required if > 3 days)</span></label>
            <div className="relative">
              <textarea 
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:outline-none text-sm min-h-[80px]"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Going on vacation..."
              />
              <FileText className="absolute left-3 top-3 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:opacity-90 font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Filing...' : 'Confirm Leave'}
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};
