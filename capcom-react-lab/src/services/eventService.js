import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firestore";

const eventsRef = collection(db, "events");

export async function getEvents() {
  const eventsQuery = query(eventsRef, orderBy("startDate", "asc"));
  const snapshot = await getDocs(eventsQuery);
  return snapshot.docs.map((eventDoc) => ({
    id: eventDoc.id,
    ...eventDoc.data(),
  }));
}

export async function getEvent(eventId) {
  const eventSnap = await getDoc(doc(db, "events", eventId));
  if (!eventSnap.exists()) return null;
  return {
    id: eventSnap.id,
    ...eventSnap.data(),
  };
}

export async function createEvent(eventData) {
  return addDoc(eventsRef, {
    name: eventData.name,
    clientName: eventData.clientName,
    startDate: eventData.startDate,
    endDate: eventData.endDate,
    scheduleStartDate: eventData.scheduleStartDate,
    scheduleEndDate: eventData.scheduleEndDate,
    createdAt: serverTimestamp(),
  });
}

export async function updateEvent(eventId, eventData) {
  return updateDoc(doc(db, "events", eventId), {
    name: eventData.name,
    clientName: eventData.clientName,
    startDate: eventData.startDate,
    endDate: eventData.endDate,
    scheduleStartDate: eventData.scheduleStartDate,
    scheduleEndDate: eventData.scheduleEndDate,
    updatedAt: serverTimestamp(),
  });
}
