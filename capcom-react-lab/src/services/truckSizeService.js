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
import { assertOnline } from "./localScheduleCache.js";

const truckSizesRef = collection(db, "truckSizes");

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

function sortTruckSizes(truckSizes) {
  return [...truckSizes].sort((a, b) => String(a.size || "").localeCompare(String(b.size || "")));
}

export async function getTruckSizes(eventId) {
  const truckSizesQuery = query(truckSizesRef, where("eventId", "==", eventId));
  const snapshot = await getDocs(truckSizesQuery);
  return sortTruckSizes(
    snapshot.docs.map((truckSizeDoc) => ({
      id: truckSizeDoc.id,
      ...truckSizeDoc.data(),
    }))
  );
}

export async function createTruckSize({ eventId, size }) {
  assertOnline();
  try {
    return await addDoc(truckSizesRef, {
      eventId,
      size,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create truck size", error, { eventId, size });
    throw error;
  }
}

export async function updateTruckSize(truckSizeId, { size }) {
  assertOnline();
  try {
    return await updateDoc(doc(db, "truckSizes", truckSizeId), {
      size,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update truck size", error, { truckSizeId, size });
    throw error;
  }
}

export async function deleteTruckSize(truckSizeId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "truckSizes", truckSizeId));
  } catch (error) {
    logWriteError("delete truck size", error, { truckSizeId });
    throw error;
  }
}
