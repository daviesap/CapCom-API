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
import { assertOnline } from "./localScheduleCache.js";

const companyContactsRef = collection(db, "companyContacts");
const FIRESTORE_IN_QUERY_LIMIT = 30;

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

function sortCompanyContacts(contacts) {
  return [...contacts].sort((a, b) => {
    const companyComparison = String(a.companyId || "").localeCompare(String(b.companyId || ""));
    if (companyComparison !== 0) return companyComparison;

    const orderComparison = getSortOrder(a) - getSortOrder(b);
    if (orderComparison !== 0) return orderComparison;

    const roleComparison = String(a.role || "").localeCompare(String(b.role || ""));
    if (roleComparison !== 0) return roleComparison;

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function getSortOrder(contact, fallbackIndex = 0) {
  return typeof contact.sortOrder === "number" ? contact.sortOrder : fallbackIndex;
}

export async function getCompanyContacts(companyIds = []) {
  const uniqueCompanyIds = [...new Set(companyIds.filter(Boolean))];
  if (uniqueCompanyIds.length === 0) return [];

  const contacts = [];
  for (let index = 0; index < uniqueCompanyIds.length; index += FIRESTORE_IN_QUERY_LIMIT) {
    const companyIdChunk = uniqueCompanyIds.slice(index, index + FIRESTORE_IN_QUERY_LIMIT);
    const contactsQuery = query(
      companyContactsRef,
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

  return sortCompanyContacts(contacts);
}

export async function createCompanyContact({ companyId, name, email, phone, role }) {
  assertOnline();
  const existingContacts = await getCompanyContacts([companyId]);
  const sortOrder = existingContacts.reduce(
    (maxSortOrder, contact, contactIndex) =>
      Math.max(maxSortOrder, getSortOrder(contact, contactIndex)),
    -1
  ) + 1;

  try {
    return await addDoc(companyContactsRef, {
      companyId,
      name,
      email,
      phone,
      role,
      sortOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create company contact", error, { companyId, name });
    throw error;
  }
}

export async function updateCompanyContact(contactId, { companyId, name, email, phone, role }) {
  assertOnline();
  try {
    return await updateDoc(doc(db, "companyContacts", contactId), {
      companyId,
      name,
      email,
      phone,
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update company contact", error, { contactId, companyId, name });
    throw error;
  }
}

export async function updateCompanyContactOrder(contacts) {
  assertOnline();
  const batch = writeBatch(db);

  contacts.forEach((contact, index) => {
    batch.update(doc(db, "companyContacts", contact.id), {
      sortOrder: index,
      updatedAt: serverTimestamp(),
    });
  });

  try {
    return await batch.commit();
  } catch (error) {
    logWriteError("update company contact order", error, {
      contactIds: contacts.map((contact) => contact.id),
    });
    throw error;
  }
}

export async function deleteCompanyContact(contactId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "companyContacts", contactId));
  } catch (error) {
    logWriteError("delete company contact", error, { contactId });
    throw error;
  }
}
