import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAoTLOuV4hZSw0VUehZ58cXhflzD4lvAIU",
  authDomain: "black-rose-guild.firebaseapp.com",
  projectId: "black-rose-guild",
  storageBucket: "black-rose-guild.firebasestorage.app",
  messagingSenderId: "457591451036",
  appId: "1:457591451036:web:c9e057bf8234570540ac59",
  measurementId: "G-3710E5XPDL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };