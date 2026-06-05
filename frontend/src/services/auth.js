// src/services/auth.js
import { getAuth } from 'firebase/auth';
import { app } from './firebaseApp';

const auth = getAuth(app);

export { auth };
