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
  cacheLocations,
  getCachedLocations,
  isBrowserOffline,
} from "./localScheduleCache.js";

const locationsRef = collection(db, "locations");

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

function sortLocations(locations) {
  const byId = new Map(locations.map((location) => [location.id, location]));
  return [...locations].sort((a, b) => {
    const aParentName = a.parentLocationId ? byId.get(a.parentLocationId)?.name || "" : "";
    const bParentName = b.parentLocationId ? byId.get(b.parentLocationId)?.name || "" : "";
    const parentComparison = aParentName.localeCompare(bParentName);
    if (parentComparison !== 0) return parentComparison;

    if (!a.parentLocationId && b.parentLocationId) return -1;
    if (a.parentLocationId && !b.parentLocationId) return 1;

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

export async function getLocations(eventId) {
  if (isBrowserOffline()) return getCachedLocations(eventId);

  const locationsQuery = query(locationsRef, where("eventId", "==", eventId));
  try {
    const snapshot = await getDocs(locationsQuery);
    const locations = sortLocations(
      snapshot.docs.map((locationDoc) => ({
        id: locationDoc.id,
        ...locationDoc.data(),
      }))
    );
    cacheLocations(eventId, locations);
    return locations;
  } catch (error) {
    const cachedLocations = getCachedLocations(eventId);
    if (cachedLocations.length > 0) return cachedLocations;
    throw error;
  }
}

export async function createLocation({ eventId, name, parentLocationId }) {
  assertOnline();
  try {
    return await addDoc(locationsRef, {
      eventId,
      name,
      parentLocationId: parentLocationId || "",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create location", error, { eventId, name, parentLocationId });
    throw error;
  }
}

export async function updateLocation(locationId, { name, parentLocationId }) {
  assertOnline();
  try {
    return await updateDoc(doc(db, "locations", locationId), {
      name,
      parentLocationId: parentLocationId || "",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update location", error, { locationId, name, parentLocationId });
    throw error;
  }
}

export async function deleteLocation(locationId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "locations", locationId));
  } catch (error) {
    logWriteError("delete location", error, { locationId });
    throw error;
  }
}
