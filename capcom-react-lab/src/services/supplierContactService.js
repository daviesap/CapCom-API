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

const supplierContactsRef = collection(db, "supplierContacts");
const FIRESTORE_IN_QUERY_LIMIT = 30;

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

function sortSupplierContacts(contacts) {
  return [...contacts].sort((a, b) => {
    const supplierComparison = String(a.supplierId || "").localeCompare(String(b.supplierId || ""));
    if (supplierComparison !== 0) return supplierComparison;

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

export async function getSupplierContacts(supplierIds = []) {
  const uniqueSupplierIds = [...new Set(supplierIds.filter(Boolean))];
  if (uniqueSupplierIds.length === 0) return [];

  const contacts = [];
  for (let index = 0; index < uniqueSupplierIds.length; index += FIRESTORE_IN_QUERY_LIMIT) {
    const supplierIdChunk = uniqueSupplierIds.slice(index, index + FIRESTORE_IN_QUERY_LIMIT);
    const contactsQuery = query(
      supplierContactsRef,
      where("supplierId", "in", supplierIdChunk)
    );
    const snapshot = await getDocs(contactsQuery);
    contacts.push(
      ...snapshot.docs.map((contactDoc) => ({
        id: contactDoc.id,
        ...contactDoc.data(),
      }))
    );
  }

  return sortSupplierContacts(contacts);
}

export async function createSupplierContact({ supplierId, name, email, phone, role }) {
  assertOnline();
  const existingContacts = await getSupplierContacts([supplierId]);
  const sortOrder = existingContacts.reduce(
    (maxSortOrder, contact, contactIndex) =>
      Math.max(maxSortOrder, getSortOrder(contact, contactIndex)),
    -1
  ) + 1;

  try {
    return await addDoc(supplierContactsRef, {
      supplierId,
      name,
      email,
      phone,
      role,
      sortOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create supplier contact", error, { supplierId, name });
    throw error;
  }
}

export async function updateSupplierContact(contactId, { supplierId, name, email, phone, role }) {
  assertOnline();
  try {
    return await updateDoc(doc(db, "supplierContacts", contactId), {
      supplierId,
      name,
      email,
      phone,
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update supplier contact", error, { contactId, supplierId, name });
    throw error;
  }
}

export async function updateSupplierContactOrder(contacts) {
  assertOnline();
  const batch = writeBatch(db);

  contacts.forEach((contact, index) => {
    batch.update(doc(db, "supplierContacts", contact.id), {
      sortOrder: index,
      updatedAt: serverTimestamp(),
    });
  });

  try {
    return await batch.commit();
  } catch (error) {
    logWriteError("update supplier contact order", error, {
      contactIds: contacts.map((contact) => contact.id),
    });
    throw error;
  }
}

export async function deleteSupplierContact(contactId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "supplierContacts", contactId));
  } catch (error) {
    logWriteError("delete supplier contact", error, { contactId });
    throw error;
  }
}
