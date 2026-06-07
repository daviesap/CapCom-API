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
  cacheTrucks,
  getCachedTrucks,
  isBrowserOffline,
} from "./localScheduleCache.js";

const trucksRef = collection(db, "trucks");

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

function sortTrucks(trucks) {
  return [...trucks].sort((a, b) => {
    const numberComparison = String(a.truckNumber || "").localeCompare(
      String(b.truckNumber || ""),
      undefined,
      { numeric: true }
    );
    if (numberComparison !== 0) return numberComparison;
    return String(a.driverName || "").localeCompare(String(b.driverName || ""));
  });
}

export async function getTrucks(eventId) {
  if (isBrowserOffline()) return getCachedTrucks(eventId);

  const trucksQuery = query(trucksRef, where("eventId", "==", eventId));
  try {
    const snapshot = await getDocs(trucksQuery);
    const trucks = sortTrucks(
      snapshot.docs.map((truckDoc) => ({
        id: truckDoc.id,
        ...truckDoc.data(),
      }))
    );
    cacheTrucks(eventId, trucks);
    return trucks;
  } catch (error) {
    const cachedTrucks = getCachedTrucks(eventId);
    if (cachedTrucks.length > 0) return cachedTrucks;
    throw error;
  }
}

export async function createTruck({
  eventId,
  truckSizeId,
  size,
  companyId,
  companyName,
  truckNumber,
  driverName,
  driverContactNumber,
  contents,
}) {
  assertOnline();
  try {
    return await addDoc(trucksRef, {
      eventId,
      truckSizeId,
      size,
      companyId,
      companyName,
      truckNumber,
      driverName,
      driverContactNumber,
      contents,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create truck", error, { eventId, truckNumber });
    throw error;
  }
}

export async function updateTruck(truckId, {
  truckSizeId,
  size,
  companyId,
  companyName,
  truckNumber,
  driverName,
  driverContactNumber,
  contents,
}) {
  assertOnline();
  try {
    return await updateDoc(doc(db, "trucks", truckId), {
      truckSizeId,
      size,
      companyId,
      companyName,
      truckNumber,
      driverName,
      driverContactNumber,
      contents,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update truck", error, { truckId, truckNumber });
    throw error;
  }
}

export async function deleteTruck(truckId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "trucks", truckId));
  } catch (error) {
    logWriteError("delete truck", error, { truckId });
    throw error;
  }
}
