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
  isAdmin,
  isSuperAdmin,
} from "../auth/roles.js";
import { db } from "../firebase/firestore";

const usersRef = collection(db, "users");
const USER_PROFILES_CACHE_TTL_MS = 90_000;
let userProfilesCache = new Map();
const userProfileCacheById = new Map();

function isCacheFresh(cachedAt) {
  return Date.now() - cachedAt < USER_PROFILES_CACHE_TTL_MS;
}

function buildUserProfilesCacheKey(currentUserProfile) {
  if (isSuperAdmin(currentUserProfile)) return "super-admin";
  return `client:${currentUserProfile?.clientId || "no-client"}`;
}

function clearUserProfilesCache() {
  userProfilesCache.clear();
  userProfileCacheById.clear();
}

export function getUserProfileRef(uid) {
  return doc(db, "users", uid);
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  const cachedProfile = userProfileCacheById.get(uid);
  if (cachedProfile && isCacheFresh(cachedProfile.fetchedAt)) return cachedProfile.profile;

  const userSnap = await getDoc(getUserProfileRef(uid));
  if (!userSnap.exists()) return null;

  const profile = {
    id: userSnap.id,
    ...userSnap.data(),
  };
  userProfileCacheById.set(uid, { profile, fetchedAt: Date.now() });
  return profile;
}

export async function getUserProfiles(currentUserProfile) {
  if (!hasActiveProfile(currentUserProfile)) return [];
  const cacheKey = buildUserProfilesCacheKey(currentUserProfile);
  const cachedProfiles = userProfilesCache.get(cacheKey);
  if (cachedProfiles && isCacheFresh(cachedProfiles.fetchedAt)) {
    return [...cachedProfiles.profiles];
  }

  const usersQuery = isSuperAdmin(currentUserProfile)
    ? query(usersRef, orderBy("email", "asc"))
    : query(usersRef, where("clientId", "==", currentUserProfile.clientId || "__missing_client__"));

  const snapshot = await getDocs(usersQuery);
  const profiles = snapshot.docs
    .map((userDoc) => ({
      id: userDoc.id,
      ...userDoc.data(),
    }))
    .sort((a, b) => (a.email || "").localeCompare(b.email || ""));
  userProfilesCache.set(cacheKey, { profiles, fetchedAt: Date.now() });
  return [...profiles];
}

export function canManageUserProfile(currentUserProfile, targetUserProfile) {
  if (!hasActiveProfile(currentUserProfile) || !targetUserProfile) return false;
  if (isSuperAdmin(currentUserProfile)) {
    return targetUserProfile.role !== USER_ROLES.SUPER_ADMIN;
  }

  return isAdmin(currentUserProfile)
    && currentUserProfile.clientId
    && [USER_ROLES.USER, USER_ROLES.VIEWER].includes(targetUserProfile.role)
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

  const createdProfile = await setDoc(getUserProfileRef(uid), {
    email: userData.email,
    displayName: userData.displayName,
    role: userData.role,
    clientId: userData.clientId || null,
    isActive: userData.isActive,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  clearUserProfilesCache();
  userProfileCacheById.delete(uid);
  return createdProfile;
}

export async function updateUserProfile(uid, userData, currentUserProfile) {
  if (!uid) throw new Error("Firebase Auth UID is required.");
  if (!canManageUserProfile(currentUserProfile, userData)) {
    throw new Error("You do not have permission to update this user profile.");
  }

  const updatedProfile = await updateDoc(getUserProfileRef(uid), {
    email: userData.email,
    displayName: userData.displayName,
    role: userData.role,
    clientId: userData.clientId || null,
    isActive: userData.isActive,
    updatedAt: serverTimestamp(),
  });

  clearUserProfilesCache();
  userProfileCacheById.delete(uid);
  return updatedProfile;
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

  const updatedDebugMode = await updateDoc(getUserProfileRef(uid), {
    debugMode: isDebugMode,
    updatedAt: serverTimestamp(),
  });

  clearUserProfilesCache();
  userProfileCacheById.delete(uid);
  return updatedDebugMode;
}
