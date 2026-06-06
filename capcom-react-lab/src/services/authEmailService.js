import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/auth.js";

export async function sendUserPasswordResetEmail(email) {
  return await sendPasswordResetEmail(auth, email);
}
