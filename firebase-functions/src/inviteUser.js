import { onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const inviteUser = onCall({ region: "europe-west2" }, async (request) => {
  const { email, role, orgId } = request.data;

  if (!email || !role || !orgId) {
    throw new Error("Missing required fields: email, role, orgId");
  }

  const auth = getAuth();
  const firestore = getFirestore();

  let userRecord;

  try {
    // Try to create user
    userRecord = await auth.createUser({
      email,
      emailVerified: false,
      password: Math.random().toString(36).slice(-10),
      disabled: false,
    });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      // User already exists, fetch user record
      userRecord = await auth.getUserByEmail(email);
    } else {
      console.error("Error creating user:", err);
      throw new Error(err.message || "Unknown internal error");
    }
  }

  // Check if Firestore document exists for this user
  const userDocRef = firestore.collection("users").doc(userRecord.uid);
  const userDocSnap = await userDocRef.get();

  if (!userDocSnap.exists) {
    // If Firestore document does not exist, create it
    await userDocRef.set({
      email,
      role,
      orgId,
      createdAt: new Date(),
    });
  }

  // Generate password reset link regardless
  const resetLink = await auth.generatePasswordResetLink(email);
  console.log(`Generated reset link for ${email}: ${resetLink}`);

  return { success: true, uid: userRecord.uid, resetLink };
});