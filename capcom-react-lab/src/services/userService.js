import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firestore";

export function getUserProfileRef(uid) {
  return doc(db, "users", uid);
}

export async function getUserProfile(uid) {
  if (!uid) return null;

  const userSnap = await getDoc(getUserProfileRef(uid));
  if (!userSnap.exists()) return null;

  return {
    id: userSnap.id,
    ...userSnap.data(),
  };
}
