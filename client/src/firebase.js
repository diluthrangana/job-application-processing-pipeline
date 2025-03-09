// client/src/firebase.js
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  aapiKey: "AIzaSyCYqFdF8sBaCqkFTFcAyxYtYOyOHZrT18s",
  authDomain: "job-pipeline-9a417.firebaseapp.com",
  projectId: "job-pipeline-9a417",
  storageBucket: "job-pipeline-9a417.firebasestorage.app",
  messagingSenderId: "907635589030",
  appId: "1:907635589030:web:6a64ff5441e651bb149967",
  measurementId: "G-S8YDK40CY6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

export { storage, db };