import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firestore";

const scheduleDetailsRef = collection(db, "scheduleDetails");

export async function getScheduleDetails(scheduleDayId) {
  const detailsQuery = query(
    scheduleDetailsRef,
    where("scheduleDayId", "==", scheduleDayId)
  );
  const snapshot = await getDocs(detailsQuery);
  return snapshot.docs
    .map((detailDoc) => ({
      id: detailDoc.id,
      ...detailDoc.data(),
    }))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

export async function createScheduleDetail({ scheduleDayId, time, description }) {
  return addDoc(scheduleDetailsRef, {
    scheduleDayId,
    time,
    description,
    createdAt: serverTimestamp(),
  });
}

export async function updateScheduleDetail(detailId, { time, description }) {
  return updateDoc(doc(db, "scheduleDetails", detailId), {
    time,
    description,
    updatedAt: serverTimestamp(),
  });
}
