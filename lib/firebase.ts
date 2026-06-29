import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missingConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfigKeys.length > 0) {
  throw new Error(`Missing Firebase config values: ${missingConfigKeys.join(', ')}`);
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// On native (iOS/Android) the Firebase JS SDK needs an explicit persistence
// layer or it will forget the logged-in user every time the app restarts.
// On web, the default getAuth() already persists to localStorage, and
// initializeAuth() would throw if called twice (e.g. during Fast Refresh),
// so we branch by platform.
function createAuth() {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // initializeAuth throws "auth/already-initialized" on Fast Refresh
    // because the module is re-evaluated but the native auth instance
    // already exists on `app`. Fall back to the existing instance.
    return getAuth(app);
  }
}

export const auth = createAuth();

export const db = getFirestore(app);
export default app;
