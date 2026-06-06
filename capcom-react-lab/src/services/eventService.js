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
import {
  assertOnline,
  cacheEvent,
  cacheEvents,
  getCachedEvent,
  getCachedEvents,
  isBrowserOffline,
} from "./localScheduleCache.js";

const eventsRef = collection(db, "events");

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

export async function getEvents() {
  if (isBrowserOffline()) return getCachedEvents();

  const eventsQuery = query(eventsRef, orderBy("startDate", "asc"));
  try {
    const snapshot = await getDocs(eventsQuery);
    const events = snapshot.docs.map((eventDoc) => ({
      id: eventDoc.id,
      ...eventDoc.data(),
    }));
    cacheEvents(events);
    return events;
  } catch (error) {
    const cachedEvents = getCachedEvents();
    if (cachedEvents.length > 0) return cachedEvents;
    throw error;
  }
}

export async function getEvent(eventId) {
  if (isBrowserOffline()) return getCachedEvent(eventId);

  try {
    const eventSnap = await getDoc(doc(db, "events", eventId));
    if (!eventSnap.exists()) return null;
    const event = {
      id: eventSnap.id,
      ...eventSnap.data(),
    };
    cacheEvent(event);
    return event;
  } catch (error) {
    const cachedEvent = getCachedEvent(eventId);
    if (cachedEvent) return cachedEvent;
    throw error;
  }
}

export async function createEvent(eventData) {
  assertOnline();
  try {
    return await addDoc(eventsRef, {
      name: eventData.name,
      clientName: eventData.clientName,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      scheduleStartDate: eventData.scheduleStartDate,
      scheduleEndDate: eventData.scheduleEndDate,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create event", error, { name: eventData.name });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}

export async function updateEvent(eventId, eventData) {
  assertOnline();
  try {
    return await updateDoc(doc(db, "events", eventId), {
      name: eventData.name,
      clientName: eventData.clientName,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      scheduleStartDate: eventData.scheduleStartDate,
      scheduleEndDate: eventData.scheduleEndDate,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update event", error, { eventId });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}
