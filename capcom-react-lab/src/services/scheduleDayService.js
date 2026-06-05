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

const scheduleDaysRef = collection(db, "scheduleDays");
const scheduleDetailsRef = collection(db, "scheduleDetails");

export async function getScheduleDays(eventId) {
  const daysQuery = query(
    scheduleDaysRef,
    where("eventId", "==", eventId)
  );
  const snapshot = await getDocs(daysQuery);
  return snapshot.docs
    .map((dayDoc) => ({
      id: dayDoc.id,
      ...dayDoc.data(),
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export async function createScheduleDay({ eventId, date }) {
  const batch = writeBatch(db);
  const dayRef = doc(scheduleDaysRef);
  batch.set(dayRef, {
    eventId,
    date,
    summary: "",
    endOfDayTarget: "",
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return dayRef;
}

export async function updateScheduleDay(dayId, { summary, endOfDayTarget }) {
  return updateDoc(doc(db, "scheduleDays", dayId), {
    summary,
    endOfDayTarget,
    updatedAt: serverTimestamp(),
  });
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
    await batch.commit();
  }

  return getScheduleDays(eventId);
}
