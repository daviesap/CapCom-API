import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin SDK (once for all functions)
initializeApp();

import { inviteUser } from './src/inviteUser.js';

export { inviteUser };