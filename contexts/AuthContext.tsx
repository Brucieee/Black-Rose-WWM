
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider, db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAlert } from './AlertContext';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signup: (email: string, pass: string) => Promise<User>;
  login: (email: string, pass: string) => Promise<User>;
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
      const res = await signInWithPopup(auth, googleProvider);
      await updateUserStatus(res.user.uid, 'online');
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
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      // Don't set status here, let Register page handle profile creation first
      return res.user;
    } catch (error: any) {
      console.error("Signup error", error);
      throw error;
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      await updateUserStatus(res.user.uid, 'online');
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
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        // Mark as online when session is restored
        updateUserStatus(user.uid, 'online');
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, signInWithGoogle, signup, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
