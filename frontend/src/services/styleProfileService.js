// src/services/styleProfileService.js
import { doc, setDoc } from "firebase/firestore";
import templateJSON from "../config/defaultStyleTemplate.json";

/**
 * Creates (or replaces) a styleProfile document in Firestore.
 * @param {Firestore} db    Your initialized Firestore instance
 * @param {string}     newId The new document ID
 * @param {string}     newName The name to put in the profile
 */
export async function createStyleProfile(db, newId, newName) {
  // Spread in everything from your JSON template, then override name
  await setDoc(doc(db, "styleProfiles", newId), {
    ...templateJSON,
    name: newName,
  });
}