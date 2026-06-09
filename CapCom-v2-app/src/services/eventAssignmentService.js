import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { USER_ROLES, canManageAssignments, isAdmin, isSuperAdmin } from "../auth/roles.js";
import { db } from "../firebase/firestore";

const eventAssignmentsRef = collection(db, "eventAssignments");

export function getEventAssignmentId(eventId, userId) {
  return `${eventId}_${userId}`;
}

function normaliseAssignmentDoc(assignmentDoc) {
  return {
    id: assignmentDoc.id,
    ...assignmentDoc.data(),
  };
}

function validateAssignableRole(accessRole) {
  if (![USER_ROLES.USER, USER_ROLES.VIEWER].includes(accessRole)) {
    throw new Error("Event access must be User or Viewer.");
  }
}

export async function getAssignmentsForCurrentUser(userProfile) {
  if (!userProfile?.id) return [];
  const assignmentsQuery = query(
    eventAssignmentsRef,
    where("userId", "==", userProfile.id)
  );
  const snapshot = await getDocs(assignmentsQuery);
  return snapshot.docs.map(normaliseAssignmentDoc);
}

export async function getAssignmentsForUser(userId, currentUserProfile) {
  if (!userId || !canManageAssignments(currentUserProfile)) return [];
  if (isAdmin(currentUserProfile)) {
    const assignments = await getAssignmentsForClient(currentUserProfile.clientId, currentUserProfile);
    return assignments.filter((assignment) => assignment.userId === userId);
  }

  const assignmentsQuery = query(eventAssignmentsRef, where("userId", "==", userId));
  const snapshot = await getDocs(assignmentsQuery);
  const assignments = snapshot.docs.map(normaliseAssignmentDoc);
  if (isSuperAdmin(currentUserProfile)) return assignments;
  return assignments.filter((assignment) => assignment.clientId === currentUserProfile.clientId);
}

export async function getAssignmentsForClient(clientId, currentUserProfile) {
  if (!clientId || !canManageAssignments(currentUserProfile)) return [];
  const assignmentsQuery = query(eventAssignmentsRef, where("clientId", "==", clientId));
  const snapshot = await getDocs(assignmentsQuery);
  return snapshot.docs.map(normaliseAssignmentDoc);
}

export async function setEventAssignment({
  eventId,
  clientId,
  userId,
  accessRole,
  currentUserId,
}) {
  if (!eventId || !clientId || !userId) {
    throw new Error("Event, client, and user are required for assignment.");
  }
  validateAssignableRole(accessRole);

  return setDoc(doc(db, "eventAssignments", getEventAssignmentId(eventId, userId)), {
    eventId,
    clientId,
    userId,
    accessRole,
    createdAt: serverTimestamp(),
    createdBy: currentUserId || null,
    updatedAt: serverTimestamp(),
    updatedBy: currentUserId || null,
  });
}

export async function removeEventAssignment(eventId, userId) {
  if (!eventId || !userId) {
    throw new Error("Event and user are required to remove assignment.");
  }

  return deleteDoc(doc(db, "eventAssignments", getEventAssignmentId(eventId, userId)));
}
