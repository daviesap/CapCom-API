// src/services/firebaseApp.js
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyAx_vNVLuJzqvPttp4r3j_ljB7kpSg2Ev0",
  authDomain: "flair-pdf-generator.firebaseapp.com",
  projectId: "flair-pdf-generator",
  storageBucket: "flair-pdf-generator.firebasestorage.app",
  messagingSenderId: "136416086270",
  appId: "1:136416086270:web:0428d0abb5be689c68bdaf"
};

const app = initializeApp(firebaseConfig);

export { app };
