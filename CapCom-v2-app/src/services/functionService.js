import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import { firebaseApp } from "../firebase/firebaseConfig.js";

const functions = getFunctions(firebaseApp, "europe-west2");

if (import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === "true") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export async function createAuthUserProfile(userData) {
  const createUser = httpsCallable(functions, "createAuthUserProfile");
  const result = await createUser(userData);
  return result.data;
}

export async function generateHomeForEvent(eventId, options = {}) {
  const generateHome = httpsCallable(functions, "generateHomeForEvent");
  const result = await generateHome({ eventId, ...options });
  return result.data;
}
