import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import {
  assertOnline,
  cacheKeyInfo,
  getCachedKeyInfo,
  isBrowserOffline,
} from "./localScheduleCache.js";

const keyInfoRef = collection(db, "keyInfo");

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

function sortKeyInfo(items) {
  return [...items].sort((a, b) => {
    const orderComparison = getSortOrder(a) - getSortOrder(b);
    if (orderComparison !== 0) return orderComparison;

    const titleComparison = String(a.title || "").localeCompare(String(b.title || ""));
    if (titleComparison !== 0) return titleComparison;

    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

function getSortOrder(item, fallbackIndex = 0) {
  return typeof item.sortOrder === "number" ? item.sortOrder : fallbackIndex;
}

export async function getKeyInfo(eventId) {
  if (!eventId) return [];
  if (isBrowserOffline()) return getCachedKeyInfo(eventId);

  const keyInfoQuery = query(keyInfoRef, where("eventId", "==", eventId));
  try {
    const snapshot = await getDocs(keyInfoQuery);
    const keyInfo = sortKeyInfo(
      snapshot.docs.map((keyInfoDoc) => ({
        id: keyInfoDoc.id,
        ...keyInfoDoc.data(),
      }))
    );
    cacheKeyInfo(eventId, keyInfo);
    return keyInfo;
  } catch (error) {
    const cachedKeyInfo = getCachedKeyInfo(eventId);
    if (cachedKeyInfo.length > 0) return cachedKeyInfo;
    throw error;
  }
}

export async function createKeyInfo({ eventId, title, description }) {
  assertOnline();
  const existingItems = await getKeyInfo(eventId);
  const sortOrder = existingItems.reduce(
    (maxSortOrder, item, itemIndex) =>
      Math.max(maxSortOrder, getSortOrder(item, itemIndex)),
    -1
  ) + 1;

  try {
    return await addDoc(keyInfoRef, {
      eventId,
      title,
      description,
      sortOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create key info", error, { eventId, title });
    throw error;
  }
}

export async function updateKeyInfoOrder(items) {
  assertOnline();
  const batch = writeBatch(db);

  items.forEach((item, index) => {
    batch.update(doc(db, "keyInfo", item.id), {
      sortOrder: index,
      updatedAt: serverTimestamp(),
    });
  });

  try {
    return await batch.commit();
  } catch (error) {
    logWriteError("update key info order", error, {
      keyInfoIds: items.map((item) => item.id),
    });
    throw error;
  }
}

export async function updateKeyInfo(keyInfoId, { title, description }) {
  assertOnline();
  try {
    return await updateDoc(doc(db, "keyInfo", keyInfoId), {
      title,
      description,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update key info", error, { keyInfoId, title });
    throw error;
  }
}

export async function deleteKeyInfo(keyInfoId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "keyInfo", keyInfoId));
  } catch (error) {
    logWriteError("delete key info", error, { keyInfoId });
    throw error;
  }
}
