import {
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
import { assertOnline } from "./localScheduleCache.js";

const eventContactsRef = collection(db, "eventContacts");
const FIRESTORE_IN_QUERY_LIMIT = 30;

function getSortOrder(contact, fallbackIndex = 0) {
  return typeof contact.sortOrder === "number" ? contact.sortOrder : fallbackIndex;
}

function sortEventContacts(contacts) {
  return [...contacts].sort((a, b) => {
    const orderComparison = getSortOrder(a) - getSortOrder(b);
    if (orderComparison !== 0) return orderComparison;

    const nameComparison = String(a.name || "").localeCompare(String(b.name || ""));
    if (nameComparison !== 0) return nameComparison;

    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

export async function getEventContacts(eventId, companyIds = []) {
  if (!eventId) return [];

  const uniqueCompanyIds = [...new Set((companyIds || []).filter(Boolean))];
  const contacts = [];

  if (uniqueCompanyIds.length === 0) {
    const contactsQuery = query(eventContactsRef, where("eventId", "==", eventId));
    const snapshot = await getDocs(contactsQuery);
    contacts.push(
      ...snapshot.docs.map((contactDoc) => ({
        id: contactDoc.id,
        ...contactDoc.data(),
      }))
    );
    return sortEventContacts(contacts);
  }

  for (let index = 0; index < uniqueCompanyIds.length; index += FIRESTORE_IN_QUERY_LIMIT) {
    const companyIdChunk = uniqueCompanyIds.slice(index, index + FIRESTORE_IN_QUERY_LIMIT);
    const contactsQuery = query(
      eventContactsRef,
      where("eventId", "==", eventId),
      where("companyId", "in", companyIdChunk)
    );
    const snapshot = await getDocs(contactsQuery);
    contacts.push(
      ...snapshot.docs.map((contactDoc) => ({
        id: contactDoc.id,
        ...contactDoc.data(),
      }))
    );
  }

  return sortEventContacts(contacts);
}

export async function addEventContactsFromCompanyContacts({
  eventId,
  companyId,
  companyContacts = [],
  startSortOrder = 0,
}) {
  assertOnline();
  if (!eventId || !companyId || !Array.isArray(companyContacts) || companyContacts.length === 0) {
    return [];
  }

  const batch = writeBatch(db);
  const contactIds = [];
  companyContacts.forEach((contact, contactIndex) => {
    const eventContactRef = doc(eventContactsRef);
    contactIds.push(eventContactRef.id);
    batch.set(eventContactRef, {
      eventId,
      companyId,
      companyContactId: contact.id,
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      role: contact.role || "",
      sortOrder: startSortOrder + contactIndex,
      isHidden: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  try {
    await batch.commit();
    return contactIds;
  } catch (error) {
    logWriteError("add event contacts from company contacts", error, {
      eventId,
      companyId,
      contactCount: companyContacts.length,
    });
    throw error;
  }
}

export async function updateEventContact(eventContactId, { isHidden, name, email, phone, role }) {
  assertOnline();
  const updates = {};

  if (typeof isHidden === "boolean") {
    updates.isHidden = isHidden;
  }
  if (typeof name === "string") {
    updates.name = name;
  }
  if (typeof email === "string") {
    updates.email = email;
  }
  if (typeof phone === "string") {
    updates.phone = phone;
  }
  if (typeof role === "string") {
    updates.role = role;
  }

  try {
    return await updateDoc(doc(db, "eventContacts", eventContactId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update event contact", error, { eventContactId });
    throw error;
  }
}

export async function updateEventContactOrder(contacts) {
  assertOnline();
  const batch = writeBatch(db);

  contacts.forEach((contact, index) => {
    batch.update(doc(db, "eventContacts", contact.id), {
      sortOrder: index,
      updatedAt: serverTimestamp(),
    });
  });

  try {
    return await batch.commit();
  } catch (error) {
    logWriteError("update event contact order", error, {
      eventContactIds: contacts.map((contact) => contact.id),
    });
    throw error;
  }
}

export async function deleteEventContact(eventContactId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "eventContacts", eventContactId));
  } catch (error) {
    logWriteError("delete event contact", error, { eventContactId });
    throw error;
  }
}
