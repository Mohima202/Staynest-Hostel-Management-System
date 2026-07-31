import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPvHBEEgH_z9ldPH-2fAoEuol-Xzm3RNA",
  authDomain: "steynest-auth-e3591.firebaseapp.com",
  projectId: "steynest-auth-e3591",
  storageBucket: "steynest-auth-e3591.firebasestorage.app",
  messagingSenderId: "216940970412",
  appId: "1:216940970412:web:a1b8e3afb0f87726283a09",
  measurementId: "G-N50GT36WBK"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Authentication
export const auth = getAuth(app);


// Database
export const db = getFirestore(app);


// Analytics (optional)
export const analytics = getAnalytics(app);