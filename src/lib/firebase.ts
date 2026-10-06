import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB-hgDWhNd1i3FUC2eJHa2aosJp4pM_07U',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ledger-daily-expenses.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ledger-daily-expenses',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ledger-daily-expenses.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '587599270134',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:587599270134:web:8e12a6a830c71cf9cb5cd7',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-PY63XY6ZBH',
};

export const hasFirebaseCreds = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

if (!hasFirebaseCreds) {
  console.warn(
    'Firebase environment variables are missing. Please check your .env.local configuration.'
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with multi-tab persistent IndexedDB local cache for offline-first support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
