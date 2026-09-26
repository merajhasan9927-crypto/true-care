import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Vite uses import.meta.env to access environment variables instead of process.env
const firebaseConfig = {
  apiKey: "AIzaSyBneeMpRNlr7JrF1CECyvbJgFzc6Z1dqf0",
  authDomain: "true-care-5f4cc.firebaseapp.com",
  projectId: "true-care-5f4cc",
  storageBucket: "true-care-5f4cc.firebasestorage.app",
  messagingSenderId: "366338024216",
  appId: "1:366338024216:web:b0b6d9f3997ee418bf346d",
};

// Initialize Firebase and export the Auth instance for use in our components
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
