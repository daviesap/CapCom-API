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
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import {
  assertOnline,
  cacheTags,
  getCachedTags,
  isBrowserOffline,
} from "./localScheduleCache.js";

const tagsRef = collection(db, "tags");

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

function sortTags(tags) {
  return [...tags].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

export async function getTags(eventId) {
  if (isBrowserOffline()) return getCachedTags(eventId);

  const tagsQuery = query(tagsRef, where("eventId", "==", eventId));
  try {
    const snapshot = await getDocs(tagsQuery);
    const tags = sortTags(
      snapshot.docs.map((tagDoc) => ({
        id: tagDoc.id,
        ...tagDoc.data(),
      }))
    );
    cacheTags(eventId, tags);
    return tags;
  } catch (error) {
    const cachedTags = getCachedTags(eventId);
    if (cachedTags.length > 0) return cachedTags;
    throw error;
  }
}

export async function createTag({ eventId, name, colour }) {
  assertOnline();
  try {
    return await addDoc(tagsRef, {
      eventId,
      name,
      colour,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create tag", error, { eventId, name });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}

export async function updateTag(tagId, { name, colour }) {
  assertOnline();
  try {
    return await updateDoc(doc(db, "tags", tagId), {
      name,
      colour,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update tag", error, { tagId, name });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}

export async function deleteTag(tagId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "tags", tagId));
  } catch (error) {
    logWriteError("delete tag", error, { tagId });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}
