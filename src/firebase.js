// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUNSU2dhAsbcADx5emo-7NELyhv8CXpdI",
  authDomain: "sampler-8acd6.firebaseapp.com",
  projectId: "sampler-8acd6",
  storageBucket: "sampler-8acd6.firebasestorage.app",
  messagingSenderId: "316723858534",
  appId: "1:316723858534:web:bb8d08854c112206a2b1a7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);