import { db } from './firebase';

export const logAction = async (
  action: string, 
  details: string, 
  user: { uid: string, displayName: string }, 
  category: 'System' | 'Guild' | 'Queue' | 'Event' | 'Announcement' | 'Member'
) => {
  try {
    await db.collection('audit_logs').add({
      action,
      details,
      performedBy: user.uid,
      performedByName: user.displayName,
      category,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log audit entry:", error);
  }
};