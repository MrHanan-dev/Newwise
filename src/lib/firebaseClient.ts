// ===============================
// Firebase Client Initialization
// ===============================
// This file initializes and exports Firebase services for use in the app.
// It ensures Firebase is only initialized once, even with hot reloads.

// ===== Imports =====
import { initializeApp, getApps, getApp } from "firebase/app"; // Core Firebase
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth"; // Firebase Auth
import { getFirestore } from "firebase/firestore"; // Firestore DB
import { getStorage } from "firebase/storage"; // Firebase Storage


// ===============================
// Firebase Configuration
// ===============================
// Replace with your own Firebase project config if needed
const firebaseConfig = {
  apiKey: "AIzaSyC7eAIDK8E1fxwykvF_fXOAfQb81So3PtU",
  authDomain: "shiftwise-6d8b0.firebaseapp.com",
  projectId: "shiftwise-6d8b0",
  storageBucket: "shiftwise-6d8b0.appspot.com",
  messagingSenderId: "353543015725",
  appId: "1:353543015725:web:c470a95672ebd51a69d7a4",
  measurementId: "G-6BXWG68BX2"
};

// ===============================
// Initialize Firebase App (Singleton)
// ===============================
// Avoid re-initializing Firebase on hot reloads
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ===============================
// Export Firebase Services
// ===============================
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence); // <-- Add this line to persist auth across refreshes
export { auth };           // Export auth instance
export const db = getFirestore(app);        // ✅ Firestore
export const storage = getStorage(app);     // ✅ Storage
