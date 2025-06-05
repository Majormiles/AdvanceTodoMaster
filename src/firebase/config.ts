// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getPerformance } from 'firebase/performance';
import { getAnalytics } from 'firebase/analytics';

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
const performance = getPerformance(app);
const analytics = getAnalytics(app);

export { app, auth, db, storage, performance, analytics }; 