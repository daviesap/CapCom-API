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

export const CLIENT_DEFAULTS = {
  clientName: "",
  clientSlug: "",
  logoUrl: "",
  primaryColour: "",
  secondaryColour: "",
  isActive: true,
};

const clientsRef = collection(db, "clients");

export function getClientRef(clientId) {
  return doc(db, "clients", clientId);
}

export async function getClients() {
  const clientsQuery = query(clientsRef, orderBy("clientName", "asc"));
  const snapshot = await getDocs(clientsQuery);

  return snapshot.docs.map((clientDoc) => ({
    id: clientDoc.id,
    ...clientDoc.data(),
  }));
}

export async function getClient(clientId) {
  if (!clientId) return null;

  const clientSnap = await getDoc(getClientRef(clientId));
  if (!clientSnap.exists()) return null;

  return {
    id: clientSnap.id,
    ...clientSnap.data(),
  };
}

export async function createClient(clientData, createdByUid) {
  return await addDoc(clientsRef, {
    ...CLIENT_DEFAULTS,
    ...clientData,
    createdAt: serverTimestamp(),
    createdBy: createdByUid || null,
    updatedAt: serverTimestamp(),
  });
}

export async function updateClient(clientId, clientData) {
  return await updateDoc(getClientRef(clientId), {
    ...clientData,
    updatedAt: serverTimestamp(),
  });
}
