import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: 'AIzaSyBF_mWsg-XduLtYwHSKd5g0b4VZeBBD5qk',
  appId: '1:48135073119:android:26ef153b2f2f306d9f5aea',
  messagingSenderId: '48135073119',
  projectId: 'splitease-1c2af',
  storageBucket: 'splitease-1c2af.firebasestorage.app',
  iosBundleId: 'com.splitease.app',
  iosClientId: 'YOUR_IOS_CLIENT_ID',
  androidClientId: 'AIzaSyC-y4YY70SOfqFu5fdEn6KQP1iil1Ggutg',
  authDomain: 'splitease-1c2af.firebaseapp.com',
  measurementId: 'G-MEASUREMENT_ID'
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);

export { app, auth, db };
