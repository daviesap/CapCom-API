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

const tagsRef = collection(db, "tag");

function sortTags(tags) {
  return [...tags].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

export async function getTags(eventId) {
  const tagsQuery = query(tagsRef, where("eventId", "==", eventId));
  const snapshot = await getDocs(tagsQuery);
  return sortTags(
    snapshot.docs.map((tagDoc) => ({
      id: tagDoc.id,
      ...tagDoc.data(),
    }))
  );
}

export async function createTag({ eventId, name, colour }) {
  return addDoc(tagsRef, {
    eventId,
    name,
    colour,
    createdAt: serverTimestamp(),
  });
}

export async function updateTag(tagId, { name, colour }) {
  return updateDoc(doc(db, "tag", tagId), {
    name,
    colour,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTag(tagId) {
  return deleteDoc(doc(db, "tag", tagId));
}
