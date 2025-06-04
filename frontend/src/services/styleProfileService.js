// src/services/styleProfileService.js
import { doc, setDoc } from "firebase/firestore";
import templateJSON from "../config/defaultStyleTemplate.json";

/**
 * Creates (or replaces) a styleProfile document in Firestore.
 * @param {Firestore} db    Your initialized Firestore instance
 * @param {string}     newId The new document ID
 * @param {string}     newName The name to put in the profile
 * @param {object}     baseData Optional: if provided, clones this instead of the default template
 */
export async function createStyleProfile(db, newId, newName, baseData = null) {
  const profileData = {
    ...(baseData || templateJSON), // Use provided data or fall back to default
    name: newName,
  };
  await setDoc(doc(db, "styleProfiles", newId), profileData);
}