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

const suppliersRef = collection(db, "suppliers");

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

function sortSuppliers(suppliers) {
  return [...suppliers].sort((a, b) =>
    String(a.supplierName || "").localeCompare(String(b.supplierName || ""))
  );
}

export async function getSuppliers(clientId) {
  if (!clientId) return [];

  const suppliersQuery = query(suppliersRef, where("clientId", "==", clientId));
  const snapshot = await getDocs(suppliersQuery);

  return sortSuppliers(
    snapshot.docs.map((supplierDoc) => ({
      id: supplierDoc.id,
      ...supplierDoc.data(),
    }))
  );
}

export async function createSupplier({ clientId, supplierName, address }) {
  assertOnline();
  try {
    return await addDoc(suppliersRef, {
      clientId,
      supplierName,
      address,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create supplier", error, { clientId, supplierName });
    throw error;
  }
}

export async function updateSupplier(supplierId, { clientId, supplierName, address }) {
  assertOnline();
  try {
    return await updateDoc(doc(db, "suppliers", supplierId), {
      clientId,
      supplierName,
      address,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update supplier", error, { supplierId, clientId, supplierName });
    throw error;
  }
}

export async function deleteSupplier(supplierId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "suppliers", supplierId));
  } catch (error) {
    logWriteError("delete supplier", error, { supplierId });
    throw error;
  }
}
