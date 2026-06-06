import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import {
  assertOnline,
  cacheScheduleDays,
  getCachedScheduleDays,
  isBrowserOffline,
} from "./localScheduleCache.js";

const scheduleDaysRef = collection(db, "scheduleDays");
const scheduleDetailsRef = collection(db, "scheduleDetails");

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

export async function getScheduleDays(eventId) {
  if (isBrowserOffline()) return getCachedScheduleDays(eventId);

  const daysQuery = query(
    scheduleDaysRef,
    where("eventId", "==", eventId)
  );
  try {
    const snapshot = await getDocs(daysQuery);
    const days = snapshot.docs
      .map((dayDoc) => ({
        id: dayDoc.id,
        ...dayDoc.data(),
      }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    cacheScheduleDays(eventId, days);
    return days;
  } catch (error) {
    const cachedDays = getCachedScheduleDays(eventId);
    if (cachedDays.length > 0) return cachedDays;
    throw error;
  }
}

export async function createScheduleDay({ eventId, date }) {
  assertOnline();
  const batch = writeBatch(db);
  const dayRef = doc(scheduleDaysRef);
  batch.set(dayRef, {
    eventId,
    date,
    summary: "",
    endOfDayTarget: "",
    createdAt: serverTimestamp(),
  });
  try {
    await batch.commit();
    return dayRef;
  } catch (error) {
    logWriteError("create schedule day", error, { eventId, date });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}

export async function updateScheduleDay(dayId, { summary, endOfDayTarget }) {
  assertOnline();
  try {
    return await updateDoc(doc(db, "scheduleDays", dayId), {
      summary,
      endOfDayTarget,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update schedule day", error, { dayId });
    throw error;
  } finally {
    // Saving state is owned by the calling component.
  }
}

function getDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error("Schedule start date and schedule end date are required.");
  }

  if (startDate > endDate) {
    throw new Error("Schedule start date must be before or equal to schedule end date.");
  }

  const dates = [];
  const currentDate = new Date(`${startDate}T00:00:00Z`);
  const finalDate = new Date(`${endDate}T00:00:00Z`);

  while (currentDate <= finalDate) {
    dates.push(currentDate.toISOString().slice(0, 10));
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return dates;
}

export async function syncScheduleDaysToRange(eventId, startDate, endDate) {
  assertOnline();
  const requiredDates = getDateRange(startDate, endDate);
  const existingDays = await getScheduleDays(eventId);
  const existingDates = new Set(existingDays.map((day) => day.date));
  const requiredDateSet = new Set(requiredDates);
  const batch = writeBatch(db);
  let hasWrites = false;

  requiredDates.forEach((date) => {
    if (!existingDates.has(date)) {
      batch.set(doc(scheduleDaysRef), {
        eventId,
        date,
        summary: "",
        endOfDayTarget: "",
        createdAt: serverTimestamp(),
      });
      hasWrites = true;
    }
  });

  const daysToDelete = existingDays.filter((day) => !requiredDateSet.has(day.date));

  for (const day of daysToDelete) {
    const detailsQuery = query(
      scheduleDetailsRef,
      where("scheduleDayId", "==", day.id)
    );
    const detailsSnapshot = await getDocs(detailsQuery);
    detailsSnapshot.docs.forEach((detailDoc) => {
      batch.delete(detailDoc.ref);
      hasWrites = true;
    });
    batch.delete(doc(db, "scheduleDays", day.id));
    hasWrites = true;
  }

  if (hasWrites) {
    try {
      await batch.commit();
    } catch (error) {
      logWriteError("sync schedule days to range", error, { eventId, startDate, endDate });
      throw error;
    } finally {
      // Saving state is owned by the calling component.
    }
  }

  return getScheduleDays(eventId);
}
