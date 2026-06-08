import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  USER_ROLES,
  hasActiveProfile,
  isClientAdmin,
  isSuperAdmin,
} from "../auth/roles.js";
import { db } from "../firebase/firestore";

const usersRef = collection(db, "users");

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

export async function getUserProfiles(currentUserProfile) {
  if (!hasActiveProfile(currentUserProfile)) return [];

  const usersQuery = isSuperAdmin(currentUserProfile)
    ? query(usersRef, orderBy("email", "asc"))
    : query(usersRef, where("clientId", "==", currentUserProfile.clientId || "__missing_client__"));

  const snapshot = await getDocs(usersQuery);
  return snapshot.docs
    .map((userDoc) => ({
      id: userDoc.id,
      ...userDoc.data(),
    }))
    .sort((a, b) => (a.email || "").localeCompare(b.email || ""));
}

export function canManageUserProfile(currentUserProfile, targetUserProfile) {
  if (!hasActiveProfile(currentUserProfile) || !targetUserProfile) return false;
  if (isSuperAdmin(currentUserProfile)) {
    return targetUserProfile.role !== USER_ROLES.SUPER_ADMIN;
  }

  return isClientAdmin(currentUserProfile)
    && currentUserProfile.clientId
    && targetUserProfile.role === USER_ROLES.CLIENT_USER
    && targetUserProfile.clientId === currentUserProfile.clientId;
}

export async function createUserProfile(uid, userData, currentUserProfile) {
  if (!uid) throw new Error("Firebase Auth UID is required.");
  if (!canManageUserProfile(currentUserProfile, userData)) {
    throw new Error("You do not have permission to create this user profile.");
  }

  const existingProfile = await getDoc(getUserProfileRef(uid));
  if (existingProfile.exists()) {
    throw new Error("A user profile already exists for this Firebase Auth UID.");
  }

  return await setDoc(getUserProfileRef(uid), {
    email: userData.email,
    displayName: userData.displayName,
    role: userData.role,
    clientId: userData.clientId || null,
    isActive: userData.isActive,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserProfile(uid, userData, currentUserProfile) {
  if (!uid) throw new Error("Firebase Auth UID is required.");
  if (!canManageUserProfile(currentUserProfile, userData)) {
    throw new Error("You do not have permission to update this user profile.");
  }

  return await updateDoc(getUserProfileRef(uid), {
    email: userData.email,
    displayName: userData.displayName,
    role: userData.role,
    clientId: userData.clientId || null,
    isActive: userData.isActive,
    updatedAt: serverTimestamp(),
  });
}

export async function updateCurrentUserDebugMode(uid, isDebugMode, currentUserProfile) {
  if (!uid) throw new Error("Firebase Auth UID is required.");
  if (!hasActiveProfile(currentUserProfile) || currentUserProfile.id !== uid) {
    throw new Error("You do not have permission to update this debug setting.");
  }

  if (!isSuperAdmin(currentUserProfile)) {
    throw new Error("You do not have permission to update this debug setting.");
  }

  if (typeof isDebugMode !== "boolean") {
    throw new Error("Debug mode must be enabled or disabled.");
  }

  return await updateDoc(getUserProfileRef(uid), {
    debugMode: isDebugMode,
    updatedAt: serverTimestamp(),
  });
}
