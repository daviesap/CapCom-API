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
const FIRESTORE_IN_QUERY_LIMIT = 30;

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

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

export async function getScheduleDetailsForEvent(eventId, scheduleDayIds = []) {
  const dayIds = [...new Set(scheduleDayIds.filter(Boolean))];
  if (dayIds.length === 0) return {};
  if (isBrowserOffline()) {
    return Object.fromEntries(
      dayIds.map((scheduleDayId) => [scheduleDayId, getCachedScheduleDetails(scheduleDayId)])
    );
  }

  try {
    try {
      const eventScopedQuery = query(scheduleDetailsRef, where("eventId", "==", eventId));
      const eventScopedSnapshot = await getDocs(eventScopedQuery);
      const eventScopedDetails = eventScopedSnapshot.docs.map((detailDoc) => ({
        id: detailDoc.id,
        ...detailDoc.data(),
      }));
      const eventScopedDayIds = new Set(eventScopedDetails.map((detail) => detail.scheduleDayId));

      if (eventScopedDetails.length > 0 && dayIds.every((dayId) => eventScopedDayIds.has(dayId))) {
        const groupedDetails = groupDetailsByDay(dayIds, eventScopedDetails);
        cacheDetailsByDay(groupedDetails);
        return groupedDetails;
      }
    } catch (eventScopedError) {
      console.warn("Could not load event-scoped schedule details; falling back to day queries.", {
        eventId,
        dayCount: dayIds.length,
        error: eventScopedError,
      });
    }

    const legacyDetails = [];
    for (let index = 0; index < dayIds.length; index += FIRESTORE_IN_QUERY_LIMIT) {
      const dayIdChunk = dayIds.slice(index, index + FIRESTORE_IN_QUERY_LIMIT);
      const detailsQuery = query(
        scheduleDetailsRef,
        where("scheduleDayId", "in", dayIdChunk)
      );
      const snapshot = await getDocs(detailsQuery);
      legacyDetails.push(
        ...snapshot.docs.map((detailDoc) => ({
          id: detailDoc.id,
          ...detailDoc.data(),
        }))
      );
    }

    const groupedDetails = groupDetailsByDay(dayIds, legacyDetails);
    cacheDetailsByDay(groupedDetails);
    return groupedDetails;
  } catch (error) {
    const cachedDetailsByDayId = Object.fromEntries(
      dayIds.map((scheduleDayId) => [scheduleDayId, getCachedScheduleDetails(scheduleDayId)])
    );
    if (Object.values(cachedDetailsByDayId).some((details) => details.length > 0)) {
      return cachedDetailsByDayId;
    }
    throw error;
  }
}

function groupDetailsByDay(scheduleDayIds, details) {
  return Object.fromEntries(
    scheduleDayIds.map((scheduleDayId) => [
      scheduleDayId,
      sortScheduleDetails(details.filter((detail) => detail.scheduleDayId === scheduleDayId)),
    ])
  );
}

function cacheDetailsByDay(detailsByDayId) {
  Object.entries(detailsByDayId).forEach(([scheduleDayId, details]) => {
    cacheScheduleDetails(scheduleDayId, details);
  });
}

export async function createScheduleDetail({
  eventId,
  scheduleDayId,
  truckId,
  truckNumber,
  action,
  time,
  description,
  notes,
  sortOrder,
  colour,
  tagId,
  locationId,
  companyIds,
}) {
  assertOnline();
  const nextSortOrder =
    typeof sortOrder === "number"
      ? sortOrder
      : (await getScheduleDetails(scheduleDayId)).reduce(
          (maxSortOrder, detail, index) =>
            Math.max(maxSortOrder, getSortOrder(detail, index)),
          -1
        ) + 1;

  try {
    return await addDoc(scheduleDetailsRef, {
      eventId: eventId || "",
      scheduleDayId,
      truckId: truckId || "",
      truckNumber: truckNumber || "",
      action: action || "",
      time,
      description,
      notes: notes || "",
      sortOrder: nextSortOrder,
      colour: colour || "",
      tagId: tagId || "",
      locationId: locationId || "",
      companyIds: Array.isArray(companyIds) ? companyIds : [],
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create schedule detail", error, { eventId, scheduleDayId });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}

export async function updateScheduleDetail(
  detailId,
  {
    eventId,
    time,
    description,
    notes,
    sortOrder,
    scheduleDayId,
    truckId,
    truckNumber,
    action,
    colour,
    tagId,
    locationId,
    companyIds,
  }
) {
  assertOnline();
  const updates = {
    updatedAt: serverTimestamp(),
  };

  if (typeof time === "string") {
    updates.time = time;
  }

  if (typeof description === "string") {
    updates.description = description;
  }

  if (typeof notes === "string") {
    updates.notes = notes;
  }

  if (typeof sortOrder === "number") {
    updates.sortOrder = sortOrder;
  }

  if (scheduleDayId) {
    updates.scheduleDayId = scheduleDayId;
  }

  if (eventId) {
    updates.eventId = eventId;
  }

  if (typeof truckId === "string") {
    updates.truckId = truckId;
  }

  if (typeof truckNumber === "string") {
    updates.truckNumber = truckNumber;
  }

  if (typeof action === "string") {
    updates.action = action;
  }

  if (typeof colour === "string") {
    updates.colour = colour;
  }

  if (typeof tagId === "string") {
    updates.tagId = tagId;
  }

  if (typeof locationId === "string") {
    updates.locationId = locationId;
  }

  if (Array.isArray(companyIds)) {
    updates.companyIds = companyIds;
  }

  try {
    return await updateDoc(doc(db, "scheduleDetails", detailId), updates);
  } catch (error) {
    logWriteError("update schedule detail", error, { detailId, eventId, scheduleDayId });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}

export async function deleteScheduleDetail(detailId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "scheduleDetails", detailId));
  } catch (error) {
    logWriteError("delete schedule detail", error, { detailId });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}

export async function updateScheduleDetailOrder(details) {
  assertOnline();
  if (details.length === 0) return null;

  const batch = writeBatch(db);

  details.forEach((detail, index) => {
    batch.update(doc(db, "scheduleDetails", detail.id), {
      sortOrder: typeof detail.sortOrder === "number" ? detail.sortOrder : index,
      updatedAt: serverTimestamp(),
    });
  });

  try {
    return await batch.commit();
  } catch (error) {
    logWriteError("update schedule detail order", error, {
      detailIds: details.map((detail) => detail.id),
    });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}
