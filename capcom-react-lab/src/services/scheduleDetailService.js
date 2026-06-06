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
  cacheScheduleDetails,
  getCachedScheduleDetails,
  isBrowserOffline,
} from "./localScheduleCache.js";

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
  if (isBrowserOffline()) return getCachedScheduleDetails(scheduleDayId);

  const detailsQuery = query(
    scheduleDetailsRef,
    where("scheduleDayId", "==", scheduleDayId)
  );
  try {
    const snapshot = await getDocs(detailsQuery);
    const details = sortScheduleDetails(
      snapshot.docs.map((detailDoc) => ({
        id: detailDoc.id,
        ...detailDoc.data(),
      }))
    );
    cacheScheduleDetails(scheduleDayId, details);
    return details;
  } catch (error) {
    const cachedDetails = getCachedScheduleDetails(scheduleDayId);
    if (cachedDetails.length > 0) return cachedDetails;
    throw error;
  }
}

export async function createScheduleDetail({
  scheduleDayId,
  time,
  description,
  sortOrder,
  colour,
  tagId,
}) {
  assertOnline();
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
  assertOnline();
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
  assertOnline();
  return deleteDoc(doc(db, "scheduleDetails", detailId));
}

export async function updateScheduleDetailOrder(details) {
  assertOnline();
  const batch = writeBatch(db);

  details.forEach((detail, index) => {
    batch.update(doc(db, "scheduleDetails", detail.id), {
      sortOrder: index,
      updatedAt: serverTimestamp(),
    });
  });

  return batch.commit();
}
