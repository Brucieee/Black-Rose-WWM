import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

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

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // Ignore this specific error, it just means they clicked X
        return;
      }
      console.error("Error signing in", error);
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        alert(`Configuration Error: Domain not authorized.\n\nPlease go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add: ${domain}`);
      } else {
        alert(`Sign in failed: ${error.message}`);
      }
    }
  };

  const signup = async (email: string, pass: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      return res.user;
    } catch (error: any) {
      console.error("Signup error", error);
      throw error;
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      return res.user;
    } catch (error: any) {
      console.error("Login error", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, signInWithGoogle, signup, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};