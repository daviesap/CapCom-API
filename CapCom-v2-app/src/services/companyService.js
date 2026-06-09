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
  cacheCompanies,
  getCachedCompanies,
  isBrowserOffline,
} from "./localScheduleCache.js";

const companiesRef = collection(db, "companies");

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

function sortCompanies(companies) {
  return [...companies].sort((a, b) =>
    String(a.companyName || "").localeCompare(String(b.companyName || ""))
  );
}

export async function getCompanies(clientId) {
  if (!clientId) return [];
  if (isBrowserOffline()) return getCachedCompanies(clientId);

  const companiesQuery = query(companiesRef, where("clientId", "==", clientId));
  try {
    const snapshot = await getDocs(companiesQuery);
    const companies = sortCompanies(
      snapshot.docs.map((companyDoc) => ({
        id: companyDoc.id,
        ...companyDoc.data(),
      }))
    );
    cacheCompanies(clientId, companies);
    return companies;
  } catch (error) {
    const cachedCompanies = getCachedCompanies(clientId);
    if (cachedCompanies.length > 0) return cachedCompanies;
    throw error;
  }
}

export async function createCompany({ clientId, companyName, address }) {
  assertOnline();
  try {
    return await addDoc(companiesRef, {
      clientId,
      companyName,
      address,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create company", error, { clientId, companyName });
    throw error;
  }
}

export async function updateCompany(companyId, { clientId, companyName, address }) {
  assertOnline();
  try {
    return await updateDoc(doc(db, "companies", companyId), {
      clientId,
      companyName,
      address,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update company", error, { companyId, clientId, companyName });
    throw error;
  }
}

export async function deleteCompany(companyId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "companies", companyId));
  } catch (error) {
    logWriteError("delete company", error, { companyId });
    throw error;
  }
}
