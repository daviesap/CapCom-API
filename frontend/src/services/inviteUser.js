// /frontend/src/services/inviteUser.js

import { functions } from "./firebase";
import { httpsCallable } from "firebase/functions";

// This function wraps your backend callable function cleanly
export async function sendUserInvite({ email, role, orgId }) {
  const inviteUser = httpsCallable(functions, "inviteUser");

  // Call the backend function with provided params
  const result = await inviteUser({ email, role, orgId });

  // Return result data to frontend caller
  return result.data;
}