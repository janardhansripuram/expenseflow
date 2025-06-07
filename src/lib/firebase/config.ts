import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

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
