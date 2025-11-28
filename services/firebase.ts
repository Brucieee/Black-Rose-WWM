
// FIX: Switched to Firebase v8 compat imports to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

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
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const googleProvider = new firebase.auth.GoogleAuthProvider();

export { auth, db, storage, googleProvider };
