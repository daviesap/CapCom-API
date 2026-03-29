import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File in same folder as this script
const TEST_FILE = path.join(__dirname, "test.json");

// Firestore target
const COLLECTION_NAME = "testCollection";
const DOC_ID = "testDoc";

// Your Firebase project ID
const PROJECT_ID = "flair-pdf-generator";

initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
});

const db = getFirestore();

async function run() {
  console.log("Reading local test.json...");

  const raw = await fs.readFile(TEST_FILE, "utf8");
  const data = JSON.parse(raw);

  console.log("Data loaded:");
  console.log(data);

  console.log("Writing to Firestore...");

  await db.collection(COLLECTION_NAME).doc(DOC_ID).set(data);

  console.log("✅ Success!");
  console.log(`Written to: ${COLLECTION_NAME}/${DOC_ID}`);
}

run().catch((err) => {
  console.error("❌ Error:");
  console.error(err);
});