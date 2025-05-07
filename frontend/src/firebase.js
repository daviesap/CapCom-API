// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase config — make sure yours is here
const firebaseConfig = {
    apiKey: "AIzaSyAx_vNVLuJzqvPttp4r3j_ljB7kpSg2Ev0",
    authDomain: "flair-pdf-generator.firebaseapp.com",
    projectId: "flair-pdf-generator",
    storageBucket: "flair-pdf-generator.appspot.com",
    messagingSenderId: "136416086270",
    appId: "1:136416086270:web:0428d0abb5be689c68bdaf"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


export { app, db };