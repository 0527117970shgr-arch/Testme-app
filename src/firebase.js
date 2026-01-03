// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAsh3nK954FgQ7zx9DAtB633rVCmkgltaU",
    authDomain: "test-me-c0c85.firebaseapp.com",
    projectId: "test-me-c0c85",
    storageBucket: "test-me-c0c85.firebasestorage.app",
    messagingSenderId: "359439157388",
    appId: "1:359439157388:web:1ef1c4969fcdc030d853a9",
    measurementId: "G-HD0HZK2L3Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
import { getStorage } from "firebase/storage";
const storage = getStorage(app);

export { db, analytics, storage };
