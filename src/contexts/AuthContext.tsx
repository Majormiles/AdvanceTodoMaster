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
  sendEmailVerification,
  updateEmail,
  updatePassword
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { initializeDefaultCategories } from '../services/categoryService';
import { get2FASettings, check2FAVerified, clear2FAVerified, requiresVerification, sendEmail2FACode } from '../services/twoFactorService';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<{user: User; requires2FA: boolean}>;
  register: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<{user: User; requires2FA: boolean}>;
  facebookSignIn: () => Promise<any>;
  resetPassword: (email: string) => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  updateUserProfile: (profile: { displayName?: string | null; photoURL?: string | null }) => Promise<void>;
  verifyEmail: () => Promise<void>;
  requires2FA: boolean;
  setRequires2FA: (value: boolean) => void;
  pendingUser: User | null;
  setPendingUser: (user: User | null) => void;
  complete2FALogin: (user: User) => Promise<void>;
  loading: boolean;
  isLoading: boolean; // Add alias for better compatibility
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user needs 2FA verification
        try {
          const needsVerification = await requiresVerification(user.uid);
          if (needsVerification) {
            setRequires2FA(true);
            setPendingUser(user);
            // Don't set as current user until 2FA is verified
          } else {
            setCurrentUser(user);
            setRequires2FA(false);
            setPendingUser(null);
          }
        } catch (error) {
          console.error('Error checking 2FA requirement:', error);
          // If we can't check 2FA, assume user is logged in
          setCurrentUser(user);
          setRequires2FA(false);
        }
      } else {
        setCurrentUser(null);
        setRequires2FA(false);
        setPendingUser(null);
        clear2FAVerified();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user has 2FA enabled
      const settings = await get2FASettings(user.uid);
      
      if (settings.twofa_enabled) {
        // Check if already verified in this session
        const alreadyVerified = check2FAVerified(user.uid);
        
        if (!alreadyVerified) {
          // Send 2FA code and set pending state
          await sendEmail2FACode(user.uid, user.email!);
          setPendingUser(user);
          setRequires2FA(true);
          
          return { user, requires2FA: true };
        }
      }
      
      // User doesn't need 2FA or is already verified
      setCurrentUser(user);
      setRequires2FA(false);
      setPendingUser(null);
      
      return { user, requires2FA: false };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Send email verification immediately after registration
    await sendEmailVerification(userCredential.user);
    
    // Create user document in Firestore
    const userRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userRef, {
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      createdAt: new Date().toISOString(),
      twofa_enabled: false,
      twofa_method: 'disabled',
      emailVerified: false, // Track verification status
    });

    // Initialize default categories for the new user
    try {
      await initializeDefaultCategories(userCredential.user.uid);
    } catch (error) {
      console.error('Error initializing default categories:', error);
    }

    return userCredential;
  };

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    // Add additional scopes and settings to improve popup reliability
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create or update user document
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
          twofa_enabled: false,
          twofa_method: 'disabled',
          emailVerified: user.emailVerified, // Google accounts are pre-verified
        });

        // Initialize default categories for new users
        try {
          await initializeDefaultCategories(user.uid);
        } catch (error) {
          console.error('Error initializing default categories:', error);
        }
      } else {
        // Update last login time for existing users
        await updateDoc(userRef, {
          lastLoginAt: new Date().toISOString(),
          emailVerified: user.emailVerified, // Update verification status
        });
      }
      
      // Check if user has 2FA enabled
      const settings = await get2FASettings(user.uid);
      
      if (settings.twofa_enabled) {
        // Check if already verified in this session
        const alreadyVerified = check2FAVerified(user.uid);
        
        if (!alreadyVerified) {
          // Send 2FA code and set pending state
          await sendEmail2FACode(user.uid, user.email!);
          setPendingUser(user);
          setRequires2FA(true);
          
          return { user, requires2FA: true };
        }
      }
      
      // User doesn't need 2FA or is already verified
      setCurrentUser(user);
      setRequires2FA(false);
      setPendingUser(null);
      
      return { user, requires2FA: false };
    } catch (error) {
      console.error('Google sign in error:', error);
      
      // Provide more specific error messages for different scenarios
      if (error instanceof Error) {
        if (error.message.includes('popup-closed-by-user')) {
          throw new Error('Sign-in was cancelled. Please try again.');
        } else if (error.message.includes('popup-blocked')) {
          throw new Error('Popup was blocked. Please allow popups for this site and try again.');
        } else if (error.message.includes('network-request-failed')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
      }
      
      throw error;
    }
  };

  const facebookSignIn = async () => {
    const provider = new FacebookAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      
      // Similar logic to Google sign in for 2FA handling
      const user = result.user;
      const settings = await get2FASettings(user.uid);
      
      if (settings.twofa_enabled && !check2FAVerified(user.uid)) {
        await sendEmail2FACode(user.uid, user.email!);
        setPendingUser(user);
        setRequires2FA(true);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  const complete2FALogin = async (user: User) => {
    try {
      // Verify that the user has completed 2FA
      const isVerified = check2FAVerified(user.uid);
      
      if (!isVerified) {
        throw new Error('2FA verification not completed');
      }
      
      // Set as current user and clear pending state
      setCurrentUser(user);
      setRequires2FA(false);
      setPendingUser(null);
      
      // Update last login time
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        lastLoginAt: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('Error completing 2FA login:', error);
      throw error;
    }
  };

  const logout = async () => {
    setRequires2FA(false);
    setPendingUser(null);
    clear2FAVerified();
    return signOut(auth);
  };

  const resetPassword = (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const updateUserEmail = (email: string) => {
    if (!currentUser) throw new Error('No user logged in');
    return updateEmail(currentUser, email);
  };

  const updateUserPassword = (password: string) => {
    if (!currentUser) throw new Error('No user logged in');
    return updatePassword(currentUser, password);
  };

  const updateUserProfile = (profile: { displayName?: string | null; photoURL?: string | null }) => {
    if (!currentUser) throw new Error('No user logged in');
    return updateProfile(currentUser, profile);
  };

  const verifyEmail = async () => {
    if (!currentUser) throw new Error('No user logged in');
    return sendEmailVerification(currentUser);
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    googleSignIn,
    facebookSignIn,
    resetPassword,
    updateUserEmail,
    updateUserPassword,
    updateUserProfile,
    verifyEmail,
    requires2FA,
    setRequires2FA,
    pendingUser,
    setPendingUser,
    complete2FALogin,
    loading,
    isLoading: loading, // Add alias for compatibility
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 