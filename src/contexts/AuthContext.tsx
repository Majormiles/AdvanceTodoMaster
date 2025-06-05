import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail, 
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { initializeDefaultCategories } from '../services/categoryService';

interface AuthContextProps {
  currentUser: User | null;
  isLoading: boolean;
  register: (email: string, password: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<any>;
  facebookSignIn: () => Promise<any>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Register new user
  async function register(email: string, password: string) {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: userCredential.user.email,
        createdAt: new Date().toISOString(),
        displayName: userCredential.user.displayName || '',
        photoURL: userCredential.user.photoURL || ''
      });

      // Initialize default categories for the new user
      await initializeDefaultCategories(userCredential.user.uid);
      
      return userCredential;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }
  
  // Login with email and password
  async function login(email: string, password: string) {
    try {
      setError(null);
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }
  
  // Logout
  async function logout() {
    setError(null);
    return signOut(auth);
  }
  
  // Google sign in
  async function googleSignIn() {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      // Check if this is a new user
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        // Create user document in Firestore
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          createdAt: new Date().toISOString(),
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
          authProvider: 'google'
        });

        // Initialize default categories for new user
        await initializeDefaultCategories(result.user.uid);
      }
      
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }
  
  // Facebook sign in
  async function facebookSignIn() {
    try {
      setError(null);
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if this is a new user
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        // Create user document in Firestore
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          createdAt: new Date().toISOString(),
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
          authProvider: 'facebook'
        });

        // Initialize default categories for new user
        await initializeDefaultCategories(result.user.uid);
      }
      
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }
  
  // Reset password
  async function resetPassword(email: string) {
    try {
      setError(null);
      return await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }
  
  // Update user profile
  async function updateUserProfile(displayName: string, photoURL?: string) {
    try {
      setError(null);
      if (!currentUser) throw new Error('No user logged in');
      
      await updateProfile(currentUser, {
        displayName,
        photoURL: currentUser.photoURL
      });
      
      // Update user document in Firestore
      await setDoc(doc(db, 'users', currentUser.uid), {
        displayName,
        photoURL: currentUser.photoURL
      }, { merge: true });
      
      return;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }
  
  // Send email verification
  async function verifyEmail() {
    try {
      setError(null);
      if (!currentUser) throw new Error('No user logged in');
      return await sendEmailVerification(currentUser);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }
  
  // Set up auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    
    // Clean up the listener when component unmounts
    return unsubscribe;
  }, []);
  
  const value = {
    currentUser,
    isLoading,
    register,
    login,
    logout,
    googleSignIn,
    facebookSignIn,
    resetPassword,
    updateUserProfile,
    verifyEmail,
    error
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}; 