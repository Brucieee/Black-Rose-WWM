
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, db } from '../services/firebase';
import { useAlert } from './AlertContext';
// FIX: Import firebase compat app for User type
import firebase from 'firebase/compat/app';

// FIX: Define correct types for compat library
interface AuthContextType {
  currentUser: firebase.User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signup: (email: string, pass: string) => Promise<firebase.auth.UserCredential>;
  login: (email: string, pass: string) => Promise<firebase.auth.UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // FIX: Use firebase.User type
  const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlert();

  const updateUserStatus = async (uid: string, status: 'online' | 'offline' | 'away') => {
    try {
      // FIX: Use Firebase v8 compat syntax
      const userDocRef = db.collection("users").doc(uid);
      // Optimization: Removed .get() check to save 1 read operation per heartbeat.
      // Direct update is cheaper. If doc doesn't exist, it will error silently in catch which is fine.
      await userDocRef.update({ 
          status,
          lastSeen: new Date().toISOString()
      });
    } catch (error) {
      // User profile might not exist yet (e.g. during registration), ignore.
    }
  };

  const signInWithGoogle = async () => {
    try {
      // FIX: Use Firebase v8 compat syntax
      const res = await auth.signInWithPopup(googleProvider);
      if (res.user) {
        await updateUserStatus(res.user.uid, 'online');
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error("Error signing in", error);
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname || window.location.host || 'your-app-domain';
        showAlert(`Configuration Error: Domain not authorized. Go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add: ${domain}`, 'error', 'Domain Not Whitelisted');
      } else {
        showAlert(`Sign in failed: ${error.message}`, 'error', 'Google Sign In Failed');
      }
    }
  };

  const signup = (email: string, pass: string) => {
    // FIX: Use Firebase v8 compat syntax
    return auth.createUserWithEmailAndPassword(email, pass);
  };

  const login = async (email: string, pass: string) => {
    // FIX: Use Firebase v8 compat syntax
    const res = await auth.signInWithEmailAndPassword(email, pass);
    if (res.user) {
      await updateUserStatus(res.user.uid, 'online');
    }
    return res;
  };

  const logout = async () => {
    if (currentUser) {
      await updateUserStatus(currentUser.uid, 'offline');
    }
    // FIX: Use Firebase v8 compat syntax
    await auth.signOut();
    window.location.reload(); // Force refresh to clear all application state
  };

  useEffect(() => {
    // FIX: Use Firebase v8 compat syntax
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        updateUserStatus(user.uid, 'online');
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Heartbeat to keep user 'online' and update lastSeen
    // Optimization: Increased interval from 30s to 2 minutes to reduce write operations.
    const heartbeatInterval = setInterval(() => {
        updateUserStatus(currentUser.uid, 'online');
    }, 120000); 

    const handleBeforeUnload = () => {
      // This is a best-effort attempt. Modern browsers may not guarantee its execution.
      updateUserStatus(currentUser.uid, 'offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, loading, signInWithGoogle, signup, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
