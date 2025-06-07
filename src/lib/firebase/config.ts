
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

const firebaseConfig = {
  apiKey: 'AIzaSyDY6sr6tYPvaBHhGO_WNK7R-pIkquUaFLI',
  appId: '1:167426634176:android:5b524545df9b7413875825',
  messagingSenderId: '167426634176',
  projectId: 'expenseflow-8d811',
  storageBucket: 'expenseflow-8d811.firebasestorage.app',
  iosBundleId: 'com.oweme.app',
  iosClientId: 'YOUR_IOS_CLIENT_ID',
  androidClientId: 'AIzaSyDY6sr6tYPvaBHhGO_WNK7R-pIkquUaFLI',
  authDomain: 'expenseflow-8d811.firebaseapp.com',
  measurementId: 'G-MEASUREMENT_ID'
};

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

authInstance = getAuth(app);
dbInstance = getFirestore(app);

// Attempt to enable Firestore offline persistence
try {
  enableIndexedDbPersistence(dbInstance, { cacheSizeBytes: CACHE_SIZE_UNLIMITED })
    .then(() => {
      console.log("Firebase Firestore offline persistence enabled.");
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // This can happen if multiple tabs are open, persistence can only be enabled in one.
        // Or if it's already been enabled.
        console.warn("Firestore offline persistence failed or already enabled: ", err.message);
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence.
        console.warn("Firestore offline persistence not supported in this browser environment.");
      } else {
        console.error("Firestore offline persistence failed with error: ", err);
      }
    });
} catch (error) {
    console.error("Error initializing Firestore offline persistence: ", error);
}

export { app, authInstance as auth, dbInstance as db };
