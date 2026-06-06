import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "../firebase/firebaseConfig.js";

const functions = getFunctions(firebaseApp, "europe-west2");

export async function createAuthUserProfile(userData) {
  const createUser = httpsCallable(functions, "createAuthUserProfile");
  const result = await createUser(userData);
  return result.data;
}
