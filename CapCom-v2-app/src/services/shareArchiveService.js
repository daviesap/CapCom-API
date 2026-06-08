import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firestore";

const shareArchiveRef = collection(db, "shareArchive");

function toSortableTime(value) {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export async function getShareArchive(eventId) {
  if (!eventId) return [];

  const archiveQuery = query(shareArchiveRef, where("eventId", "==", eventId));
  const snapshot = await getDocs(archiveQuery);
  const rows = snapshot.docs.map((archiveDoc) => ({
    id: archiveDoc.id,
    ...archiveDoc.data(),
  }));

  return rows.sort((a, b) =>
    toSortableTime(b.timestamp || b.createdAt) - toSortableTime(a.timestamp || a.createdAt)
  );
}
