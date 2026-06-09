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
  where,
} from "firebase/firestore";
import {
  canCreateEvents,
  canManageEvent,
  canReadEvent,
  hasActiveProfile,
  isClientAdmin,
  isSuperAdmin,
} from "../auth/roles.js";
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

function sortEventsByStartDate(events) {
  return [...events].sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
}

function getAllowedCachedEvents(userProfile) {
  return getCachedEvents().filter((eventRecord) => canReadEvent(userProfile, eventRecord));
}

export function getCachedEventsForUser(userProfile) {
  if (!hasActiveProfile(userProfile)) return [];
  return getAllowedCachedEvents(userProfile);
}

export function getCachedEventForUser(eventId, userProfile) {
  const cachedEvent = getCachedEvent(eventId);
  return canReadEvent(userProfile, cachedEvent) ? cachedEvent : null;
}

function requireEventCreateAccess(userProfile, eventData) {
  if (!canCreateEvents(userProfile)) {
    throw new Error("You do not have permission to create events.");
  }

  if (isSuperAdmin(userProfile) && !eventData.clientId) {
    throw new Error("SuperAdmin event creation requires a client.");
  }

  if (isClientAdmin(userProfile) && !userProfile.clientId) {
    throw new Error("ClientAdmin users must belong to a client before creating events.");
  }
}

export async function getEvents(userProfile) {
  if (!hasActiveProfile(userProfile)) return [];
  if (isBrowserOffline()) return getAllowedCachedEvents(userProfile);

  const eventsQuery = isSuperAdmin(userProfile)
    ? query(eventsRef, orderBy("startDate", "asc"))
    : query(eventsRef, where("clientId", "==", userProfile?.clientId || "__missing_client__"));
  try {
    const snapshot = await getDocs(eventsQuery);
    const events = sortEventsByStartDate(snapshot.docs.map((eventDoc) => ({
      id: eventDoc.id,
      ...eventDoc.data(),
    })));
    cacheEvents(events);
    return events;
  } catch (error) {
    const cachedEvents = getAllowedCachedEvents(userProfile);
    if (cachedEvents.length > 0) return cachedEvents;
    throw error;
  }
}

export async function getEvent(eventId, userProfile) {
  if (isBrowserOffline()) {
    const cachedEvent = getCachedEvent(eventId);
    return canReadEvent(userProfile, cachedEvent) ? cachedEvent : null;
  }

  try {
    const eventSnap = await getDoc(doc(db, "events", eventId));
    if (!eventSnap.exists()) return null;
    const event = {
      id: eventSnap.id,
      ...eventSnap.data(),
    };
    if (!canReadEvent(userProfile, event)) return null;
    cacheEvent(event);
    return event;
  } catch (error) {
    const cachedEvent = getCachedEvent(eventId);
    if (canReadEvent(userProfile, cachedEvent)) return cachedEvent;
    throw error;
  }
}

export async function createEvent(eventData, userProfile) {
  assertOnline();
  requireEventCreateAccess(userProfile, eventData);

  const clientId = isSuperAdmin(userProfile) ? eventData.clientId : userProfile.clientId;
  try {
    return await addDoc(eventsRef, {
      name: eventData.name,
      venue: eventData.venue || "",
      clientName: eventData.clientName,
      clientId,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      scheduleStartDate: eventData.scheduleStartDate,
      scheduleEndDate: eventData.scheduleEndDate,
      imageUrl: eventData.imageUrl || "",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create event", error, { name: eventData.name });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}

export async function updateEvent(eventId, eventData, userProfile) {
  assertOnline();
  try {
    const existingEvent = await getEvent(eventId, userProfile);
    if (!canManageEvent(userProfile, existingEvent)) {
      throw new Error("You do not have permission to update this event.");
    }

    const clientId = isSuperAdmin(userProfile)
      ? eventData.clientId || existingEvent.clientId || null
      : existingEvent.clientId;

    return await updateDoc(doc(db, "events", eventId), {
      name: eventData.name,
      venue: eventData.venue || "",
      clientName: eventData.clientName,
      profileId: eventData.profileId,
      clientId,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      scheduleStartDate: eventData.scheduleStartDate,
      scheduleEndDate: eventData.scheduleEndDate,
      imageUrl: eventData.imageUrl || "",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update event", error, { eventId });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}

export async function updateEventContactCompanyOrder(eventId, contactCompanyOrder, userProfile) {
  assertOnline();
  try {
    const existingEvent = await getEvent(eventId, userProfile);
    if (!canManageEvent(userProfile, existingEvent)) {
      throw new Error("You do not have permission to update this event.");
    }

    return await updateDoc(doc(db, "events", eventId), {
      contactCompanyOrder: Array.isArray(contactCompanyOrder) ? contactCompanyOrder : [],
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update event contact company order", error, { eventId });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}
