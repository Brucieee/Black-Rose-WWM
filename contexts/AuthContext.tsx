import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAlert } from './AlertContext';
import firebase from 'firebase/compat/app';

// Define User type based on Firebase v8 compatibility
type User = firebase.User;

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signup: (email: string, pass: string) => Promise<any>;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlert();

  const updateUserStatus = async (uid: string, status: 'online' | 'offline') => {
    try {
      await updateDoc(doc(db, "users", uid), { status });
    } catch (error) {
      // Silently fail if profile doesn't exist yet (e.g. during first registration)
      console.log("Status update skipped (profile might not exist yet)");
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Use v8 style auth instance method
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

  const signup = async (email: string, pass: string) => {
    try {
      const res = await auth.createUserWithEmailAndPassword(email, pass);
      return res.user;
    } catch (error: any) {
      console.error("Signup error", error);
      throw error;
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      const res = await auth.signInWithEmailAndPassword(email, pass);
      if (res.user) {
        await updateUserStatus(res.user.uid, 'online');
      }
      return res.user;
    } catch (error: any) {
      console.error("Login error", error);
      throw error;
    }
  };

  const logout = async () => {
    if (currentUser) {
      await updateUserStatus(currentUser.uid, 'offline');
    }
    await auth.signOut();
  };

  useEffect(() => {
    // Use v8 style onAuthStateChanged on auth instance
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        // Mark as online when session is restored
        updateUserStatus(user.uid, 'online');
      }
    });
    return unsubscribe;
  }, []);

  // Handle user closing tab
  useEffect(() => {
    if (!currentUser) return;

    const handleBeforeUnload = () => {
      updateUserStatus(currentUser.uid, 'offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, loading, signInWithGoogle, signup, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};