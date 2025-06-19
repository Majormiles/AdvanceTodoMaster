// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getPerformance } from 'firebase/performance';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBo8MoRSyk5JXu4a0ps4SNF3fNYcnYzF_M",
  authDomain: "advancetodolist.firebaseapp.com",
  projectId: "advancetodolist",
  storageBucket: "advancetodolist.firebasestorage.app",
  messagingSenderId: "665777721240",
  appId: "1:665777721240:web:be1089acd08a9b64b065ed",
  measurementId: "G-BK8HZ54ZJN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);
const performance = getPerformance(app);
const analytics = getAnalytics(app);

// Connect to Firebase emulator in development
const isDevelopment = import.meta.env.DEV || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

if (isDevelopment) {
  // Check if emulator connection has already been set up
  const isEmulatorConnected = (functions as any)._delegate?._url;
  
  if (isEmulatorConnected) {
    console.log('🔧 Firebase Functions emulator already connected to:', isEmulatorConnected);
  } else {
    try {
      // Connect to emulator with proper host
      connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      console.log('🔧 ✅ Connected to Firebase Functions emulator at 127.0.0.1:5001');
      console.log('🔧 Functions emulator timestamp:', new Date().toISOString());
      console.log('🔧 Emulator URL:', (functions as any)._delegate?._url);
    } catch (error: any) {
      if (error.message?.includes('already been called') || error.message?.includes('already running')) {
        console.log('🔧 ✅ Firebase Functions emulator connection already established');
      } else {
        console.error('❌ Failed to connect to Firebase Functions emulator:', error);
        // Try alternative approaches
        try {
          // Clear any existing connection and retry
          const newFunctions = getFunctions(app);
          connectFunctionsEmulator(newFunctions, 'localhost', 5001);
          console.log('🔧 ✅ Fallback: Connected to Firebase Functions emulator at localhost:5001');
        } catch (fallbackError) {
          console.error('❌ All emulator connection attempts failed:', fallbackError);
          console.log('💡 Trying direct emulator connection without Firebase SDK...');
        }
      }
    }
  }
}

export { app, auth, db, storage, functions, performance, analytics }; 