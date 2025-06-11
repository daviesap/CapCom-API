// src/services/firebase.js

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// ✅ Your existing Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAx_vNVLuJzqvPttp4r3j_ljB7kpSg2Ev0",
  authDomain: "flair-pdf-generator.firebaseapp.com",
  projectId: "flair-pdf-generator",
  storageBucket: "flair-pdf-generator.appspot.com",
  messagingSenderId: "136416086270",
  appId: "1:136416086270:web:0428d0abb5be689c68bdaf"
};

// ✅ Correctly initialize app ONCE
const app = initializeApp(firebaseConfig);

// ✅ All services bound to this app instance
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// ✅ Export cleanly for use everywhere in your app
export { app, db, storage, auth };