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

const scheduleDetailsRef = collection(db, "scheduleDetails");

function getSortOrder(detail, fallbackIndex = 0) {
  return typeof detail.sortOrder === "number" ? detail.sortOrder : fallbackIndex;
}

function sortScheduleDetails(details) {
  return [...details].sort((a, b) => {
    const timeComparison = String(a.time || "").localeCompare(String(b.time || ""));
    if (timeComparison !== 0) return timeComparison;

    const orderComparison = getSortOrder(a) - getSortOrder(b);
    if (orderComparison !== 0) return orderComparison;

    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

export async function getScheduleDetails(scheduleDayId) {
  const detailsQuery = query(
    scheduleDetailsRef,
    where("scheduleDayId", "==", scheduleDayId)
  );
  const snapshot = await getDocs(detailsQuery);
  return sortScheduleDetails(
    snapshot.docs.map((detailDoc) => ({
      id: detailDoc.id,
      ...detailDoc.data(),
    }))
  );
}

export async function createScheduleDetail({
  scheduleDayId,
  time,
  description,
  sortOrder,
  colour,
  tagId,
}) {
  const dayDetails = await getScheduleDetails(scheduleDayId);
  const nextSortOrder =
    typeof sortOrder === "number"
      ? sortOrder
      : dayDetails.reduce(
          (maxSortOrder, detail, index) =>
            Math.max(maxSortOrder, getSortOrder(detail, index)),
          -1
        ) + 1;

  return addDoc(scheduleDetailsRef, {
    scheduleDayId,
    time,
    description,
    sortOrder: nextSortOrder,
    colour: colour || "",
    tagId: tagId || "",
    createdAt: serverTimestamp(),
  });
}

export async function updateScheduleDetail(
  detailId,
  { time, description, sortOrder, scheduleDayId, colour, tagId }
) {
  const updates = {
    time,
    description,
    updatedAt: serverTimestamp(),
  };

  if (typeof sortOrder === "number") {
    updates.sortOrder = sortOrder;
  }

  if (scheduleDayId) {
    updates.scheduleDayId = scheduleDayId;
  }

  if (typeof colour === "string") {
    updates.colour = colour;
  }

  if (typeof tagId === "string") {
    updates.tagId = tagId;
  }

  return updateDoc(doc(db, "scheduleDetails", detailId), updates);
}

export async function deleteScheduleDetail(detailId) {
  return deleteDoc(doc(db, "scheduleDetails", detailId));
}

export async function updateScheduleDetailOrder(details) {
  const batch = writeBatch(db);

  details.forEach((detail, index) => {
    batch.update(doc(db, "scheduleDetails", detail.id), {
      sortOrder: index,
      updatedAt: serverTimestamp(),
    });
  });

  return batch.commit();
}
