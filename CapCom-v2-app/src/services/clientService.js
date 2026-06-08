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
const CLIENTS_CACHE_TTL_MS = 90_000;
let clientsCache = null;
let clientsCacheAt = 0;
const clientsCacheById = new Map();

function isCacheFresh(cachedAt) {
  return Date.now() - cachedAt < CLIENTS_CACHE_TTL_MS;
}

function clearClientCache() {
  clientsCache = null;
  clientsCacheAt = 0;
  clientsCacheById.clear();
}

function cacheClients(clients) {
  clientsCache = clients;
  clientsCacheAt = Date.now();
  clients.forEach((client) => {
    clientsCacheById.set(client.id, {
      client,
      fetchedAt: clientsCacheAt,
    });
  });
}

export function getClientRef(clientId) {
  return doc(db, "clients", clientId);
}

export async function getClients() {
  if (clientsCache && isCacheFresh(clientsCacheAt)) return [...clientsCache];

  const clientsQuery = query(clientsRef, orderBy("clientName", "asc"));
  const snapshot = await getDocs(clientsQuery);
  const clients = snapshot.docs.map((clientDoc) => ({
    id: clientDoc.id,
    ...clientDoc.data(),
  }));

  cacheClients(clients);
  return [...clients];
}

export async function getClient(clientId) {
  if (!clientId) return null;
  const cached = clientsCacheById.get(clientId);
  if (cached && isCacheFresh(cached.fetchedAt)) {
    return cached.client;
  }

  const clientSnap = await getDoc(getClientRef(clientId));
  if (!clientSnap.exists()) return null;
  const client = {
    id: clientSnap.id,
    ...clientSnap.data(),
  };
  clientsCacheById.set(clientId, { client, fetchedAt: Date.now() });
  return client;
}

export async function createClient(clientData, createdByUid) {
  const createdClient = await addDoc(clientsRef, {
    ...CLIENT_DEFAULTS,
    ...clientData,
    createdAt: serverTimestamp(),
    createdBy: createdByUid || null,
    updatedAt: serverTimestamp(),
  });

  clearClientCache();
  return createdClient;
}

export async function updateClient(clientId, clientData) {
  const updatedClient = await updateDoc(getClientRef(clientId), {
    ...clientData,
    updatedAt: serverTimestamp(),
  });

  clearClientCache();
  return updatedClient;
}
