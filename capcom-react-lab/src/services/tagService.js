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

const tagsRef = collection(db, "tag");

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
  return addDoc(tagsRef, {
    eventId,
    name,
    colour,
    createdAt: serverTimestamp(),
  });
}

export async function updateTag(tagId, { name, colour }) {
  assertOnline();
  return updateDoc(doc(db, "tag", tagId), {
    name,
    colour,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTag(tagId) {
  assertOnline();
  return deleteDoc(doc(db, "tag", tagId));
}
