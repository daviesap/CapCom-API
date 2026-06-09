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
  cacheFilteredViews,
  getCachedFilteredViews,
  isBrowserOffline,
} from "./localScheduleCache.js";

const filteredViewsRef = collection(db, "filteredViews");

function normaliseBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalised = value.trim().toLowerCase();
    if (normalised === "true") return true;
    if (normalised === "false") return false;
  }

  return fallback;
}

function normaliseString(value) {
  if (typeof value === "string") return value.trim();
  return "";
}

function normaliseSortOrder(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

function getFilteredViewFieldArray(values) {
  if (Array.isArray(values)) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  if (typeof values === "string") {
    return Array.from(new Set(
      values
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    ));
  }

  return [];
}

function getSortOrderValue(filteredView) {
  const parsed = Number(filteredView?.sortOrder);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function buildFilteredViewPayload(values) {
  const filterTagIds = getFilteredViewFieldArray(values.filterTagIds);
  const filterLocationIds = getFilteredViewFieldArray(values.filterLocationIds);
  const filterSubLocationIds = getFilteredViewFieldArray(values.filterSubLocationIds);
  const filterSupplierIds = getFilteredViewFieldArray(values.filterSupplierIds);
  const groupName = normaliseString(values.group || values.name);

  return {
    eventId: values.eventId,
    name: normaliseString(values.name),
    filterBox: normaliseBoolean(values.filterBox, true),
    showKeyInfo: normaliseBoolean(values.showKeyInfo, true),
    showLocations: normaliseBoolean(values.showLocations, false),
    showContacts: normaliseBoolean(values.showContacts ?? values.includeContacts, false),
    groupPresetId: normaliseString(values.groupPresetId),
    filterTagIds,
    filterLocationIds,
    filterSubLocationIds,
    filterSupplierIds,
    filterGroup: normaliseString(values.filterGroup),
    group: groupName,
    sortOrder: normaliseSortOrder(values.sortOrder, 1),
  };
}

function sortFilteredViews(filteredViews) {
  return [...filteredViews].sort((a, b) =>
    getSortOrderValue(a) - getSortOrderValue(b)
    || String(a.name || "").localeCompare(String(b.name || ""))
  );
}

export async function getFilteredViews(eventId) {
  if (!eventId) return [];
  if (isBrowserOffline()) return getCachedFilteredViews(eventId);

  const filteredViewsQuery = query(filteredViewsRef, where("eventId", "==", eventId));
  try {
    const snapshot = await getDocs(filteredViewsQuery);
    const views = sortFilteredViews(
      snapshot.docs.map((viewDoc) => ({
        id: viewDoc.id,
        ...viewDoc.data(),
      }))
    );
    cacheFilteredViews(eventId, views);
    return views;
  } catch (error) {
    const cachedViews = getCachedFilteredViews(eventId);
    if (cachedViews.length > 0) return cachedViews;
    throw error;
  }
}

export async function createFilteredView({
  eventId,
  name,
  filterBox,
  showKeyInfo,
  showLocations,
  showContacts,
  groupPresetId,
  filterSupplierIds,
  filterLocationIds,
  filterSubLocationIds,
  filterGroup,
  group,
  sortOrder,
}) {
  assertOnline();
  if (!eventId) {
    throw new Error("eventId is required.");
  }

  try {
    const payload = buildFilteredViewPayload({
      eventId,
      name,
      filterBox,
      showKeyInfo,
      showLocations,
      showContacts,
      groupPresetId,
      filterSupplierIds,
      filterLocationIds,
      filterSubLocationIds,
      filterGroup,
      group,
      sortOrder,
    });

    return await addDoc(filteredViewsRef, {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create filtered view", error, {
      eventId,
      name,
    });
    throw error;
  }
}

export async function updateFilteredView(
  filteredViewId,
  {
    eventId,
    name,
    filterBox,
    showKeyInfo,
    showLocations,
    showContacts,
    groupPresetId,
    filterSupplierIds,
    filterLocationIds,
    filterSubLocationIds,
    filterGroup,
    group,
    sortOrder,
  }
) {
  assertOnline();
  if (!filteredViewId) {
    throw new Error("filteredViewId is required.");
  }
  if (!eventId) {
    throw new Error("eventId is required.");
  }

  try {
    const payload = buildFilteredViewPayload({
      eventId,
      name,
      filterBox,
      showKeyInfo,
      showLocations,
      showContacts,
      groupPresetId,
      filterSupplierIds,
      filterLocationIds,
      filterSubLocationIds,
      filterGroup,
      group,
      sortOrder,
    });

    return await updateDoc(doc(db, "filteredViews", filteredViewId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update filtered view", error, { filteredViewId });
    throw error;
  }
}

export async function deleteFilteredView(filteredViewId) {
  assertOnline();
  if (!filteredViewId) {
    throw new Error("filteredViewId is required.");
  }

  try {
    return await deleteDoc(doc(db, "filteredViews", filteredViewId));
  } catch (error) {
    logWriteError("delete filtered view", error, { filteredViewId });
    throw error;
  }
}
