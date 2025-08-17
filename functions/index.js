import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { readFile } from "fs/promises";
import fs from "fs";
import path from "path";
import process from "process";
import { Buffer } from "node:buffer";
import { merge } from "lodash-es";
import { generatePdfBuffer } from "./generatepdf.mjs";
import { sanitiseUrl } from "./utils/sanitiseUrl.mjs";
import { filterJson } from "./utils/filterJSON.mjs";
import { sanitiseText } from "./utils/sanitiseText.mjs";

initializeApp({
  credential: applicationDefault(),
  storageBucket: "flair-pdf-generator.firebasestorage.app",
});

const db = getFirestore();
const secretClient = new SecretManagerServiceClient();

const LOCAL_OUTPUT_DIR = path.join(process.cwd(), "local-emulator", "output");
const runningEmulated = !!process.env.FUNCTIONS_EMULATOR || !!process.env.FIREBASE_EMULATOR_HUB;

const ACTIONS = {
  GET_PROFILE_IDS: "getProfileIds",
  GENERATE_SNAPSHOT: "generateScheduleSnapshot",
  GENERATE_PDF: "generatePdf", // now behaves the same as GENERATE_SNAPSHOT
};

// ---------- helpers ----------
function formatYYYYMMDD(d = new Date()) {
  // Europe/London local date (simple local interpretation)
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}`;
}

function makePublicUrl(objectPath, bucket) {
  const encoded = encodeURIComponent(objectPath);
  if (runningEmulated) {
    // Storage emulator REST endpoint
    return `http://127.0.0.1:9199/v0/b/${bucket.name}/o/${encoded}?alt=media`;
  }
  // Prod mapping using your custom domain structure snapshots/<safeAppName>/<filename>
  const m = objectPath.match(/^snapshots\/([^/]+)\/(.+)$/);
  if (m) {
    const [, safeAppName, safeName] = m; // groups: 1 = app, 2 = filename/path
    console.log("🎯 Using snapshots path only:", objectPath);
    return `https://snapshots.capcom.london/${safeAppName}/${safeName}`;
  }
  // Fallback to native GCS URL (shouldn't be used in normal flow)
  return `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
}

async function logPdfEvent({ timestamp, filename, url, userEmail, profileId, success, errorMessage }) {
  const logData = {
    timestamp,
    filename,
    url,
    userEmail,
    profileId,
    success,
    errorMessage: errorMessage || null,
  };
  await db.collection("pdfCreationLog").add(logData);
}

function writeDebugJson(jsonInput, appNameOrSafe, label = "request") {
  try {
    const safe = sanitiseUrl(appNameOrSafe || "app");
    const root = path.join(LOCAL_OUTPUT_DIR, "json", safe);
    fs.mkdirSync(root, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(root, `${ts}-${label}.json`);
    fs.writeFileSync(filePath, JSON.stringify(jsonInput, null, 2), "utf8");
    return filePath;
  } catch (err) {
    console.error("⚠️ Failed to write debug JSON:", err);
    return null;
  }
}

function sanitiseJsonFields(jsonData) {
  if (jsonData?.document?.title) {
    jsonData.document.title = sanitiseText(jsonData.document.title);
  }
  if (Array.isArray(jsonData.groups)) {
    jsonData.groups.forEach((group) => {
      if (group?.title) group.title = sanitiseText(group.title);
      if (Array.isArray(group.entries)) {
        group.entries.forEach((entry) => {
          if (entry?.fields?.description) {
            entry.fields.description = sanitiseText(entry.fields.description);
          }
        });
      }
    });
  }
}

// Shared routine: generate PDF (date-stamped) + HTML (fixed), return both URLs
async function generateSnapshotOutputs(jsonInput, safeAppName, bucket, startTime, timestamp, userEmail, profileId) {
  // 1) Generate PDF bytes
  const { bytes } = await generatePdfBuffer(jsonInput);

  // Names
  const pdfDate = formatYYYYMMDD();
  const safePdfName = sanitiseUrl(`schedule-${pdfDate}.pdf`);
  const safeHtmlName = "schedule.html"; // fixed HTML

  // 2) Save PDF (immutable caching)
  if (runningEmulated) {
    const pdfDir = path.join(LOCAL_OUTPUT_DIR, "snapshots", safeAppName);
    fs.mkdirSync(pdfDir, { recursive: true });
    fs.writeFileSync(path.join(pdfDir, safePdfName), bytes);
  } else {
    const pdfFile = bucket.file(`snapshots/${safeAppName}/${safePdfName}`);
    await pdfFile.save(bytes, {
      metadata: {
        contentType: "application/pdf",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
  }
  const pdfUrl = makePublicUrl(`snapshots/${safeAppName}/${safePdfName}`, bucket);

  // 3) Build HTML with link to THIS run’s PDF
  let htmlString;
  try {
    const { generateHtmlString } = await import("./generateHtml.mjs");
    const htmlResult = await generateHtmlString(jsonInput, { pdfUrl });
    htmlString = htmlResult.htmlString;
  } catch (importErr) {
    console.error("⚠️ generateHtml.mjs not available:", importErr);
    return {
      status: 501,
      body: {
        success: false,
        message: "generateScheduleSnapshot requires ./generateHtml.mjs (export generateHtmlString).",
        hint: "Create functions/generateHtml.mjs and export async function generateHtmlString(jsonInput, { pdfUrl })",
        timestamp,
      },
    };
  }

  // 4) Save HTML (revalidate on each load)
  if (runningEmulated) {
    const htmlDir = path.join(LOCAL_OUTPUT_DIR, "snapshots", safeAppName);
    fs.mkdirSync(htmlDir, { recursive: true });
    fs.writeFileSync(path.join(htmlDir, safeHtmlName), Buffer.from(htmlString, "utf8"));
  } else {
    const htmlFile = bucket.file(`snapshots/${safeAppName}/${safeHtmlName}`);
    await htmlFile.save(Buffer.from(htmlString, "utf8"), {
      metadata: { contentType: "text/html; charset=utf-8", cacheControl: "no-cache, must-revalidate" },
    });
  }
  const htmlUrl = makePublicUrl(`snapshots/${safeAppName}/${safeHtmlName}`, bucket);

  // 5) Log + response
  const executionTimeSeconds = (Date.now() - startTime) / 1000;
  await logPdfEvent({ timestamp, filename: safePdfName, url: pdfUrl, userEmail, profileId, success: true });

  return {
    status: 200,
    body: {
      success: true,
      message: "✅ HTML and date-stamped PDF generated",
      urls: { html: htmlUrl, pdf_versioned: pdfUrl },
      // Convenience top-level fields for clients like Glide
      pdfUrl: pdfUrl,
      htmlUrl: htmlUrl,
      timestamp,
      executionTimeSeconds,
      ...(jsonInput?.debug === true
        ? {
            debug: {
              mergedJson: jsonInput,
              debugDumpPath: jsonInput.__debugDumpPath || null,
            },
          }
        : {}),
    },
  };
}

// ---------- main handler ----------
export const generatePdf = onRequest({ region: "europe-west2" }, async (req, res) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const action = String(req.query?.action || "").trim();
  const allowed = new Set(Object.values(ACTIONS));

  if (!allowed.has(action)) {
    return res.status(400).json({
      success: false,
      message: `Unknown or missing action. Use one of: ${[...allowed].join(", ")}`,
      timestamp,
    });
  }

  // API key
  let expectedKey;
  if (runningEmulated) {
    expectedKey = process.env.LOCAL_API_KEY || "dev-key";
  } else {
    try {
      const [version] = await secretClient.accessSecretVersion({
        name: process.env.API_KEY_SECRET_NAME,
      });
      expectedKey = version.payload.data.toString("utf8").trim();
    } catch (err) {
      console.error("❌ Failed to access API key secret:", err);
      return res.status(500).json({ success: false, message: "Internal error retrieving API key" });
    }
  }

  if (!req.body?.api_key || req.body.api_key !== expectedKey) {
    return res.status(403).json({ success: false, message: "Invalid or missing API key" });
  }

  // GET_PROFILE_IDS
  if (action === ACTIONS.GET_PROFILE_IDS) {
    try {
      const snapshot = await db.collection("styleProfiles").get();
      const ids = snapshot.docs.map((doc) => ({
        profileId: doc.id,
        name: doc.data()?.name || "(Unnamed)",
      }));
      return res.status(200).json({ success: true, count: ids.length, profiles: ids, timestamp });
    } catch (err) {
      console.error("❌ Error fetching profile IDs:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch profile IDs", error: err.message, timestamp });
    }
  }

  // Shared metadata
  const userId = req.body.userId || "unknown userId";
  const userEmail = req.body.userEmail || "unknown email";
  const profileId = req.body.profileId || "unknown profileId";

  try {
    // Load JSON input (body first, fallback to local)
    let jsonInput;
    if (req.body?.document) {
      jsonInput = req.body;
    } else {
      const samplePath = path.resolve(process.cwd(), "JSON/local.json");
      const raw = await readFile(samplePath, "utf-8");
      jsonInput = JSON.parse(raw);
    }

    // Optional profile merge from Firestore
    let profileData = {};
    let firestoreStyles = {};

    if (jsonInput.profileId) {
      try {
        const profileRef = db.collection("styleProfiles").doc(jsonInput.profileId);
        const profileSnap = await profileRef.get();

        if (profileSnap.exists) {
          profileData = profileSnap.data();
          firestoreStyles = profileData.styles || {};

          jsonInput.styles = merge({}, firestoreStyles, jsonInput.styles || {});
          jsonInput.document = merge({}, profileData.document || {}, jsonInput.document || {});
          jsonInput.columns = profileData.columns || [];

          jsonInput = filterJson(jsonInput);
          sanitiseJsonFields(jsonInput);

          if (runningEmulated || jsonInput.debug === true) {
            try {
              const appNameForDump = jsonInput.glideAppName || "Flair PDF Generator";
              const dumpPath = writeDebugJson(jsonInput, appNameForDump, action);
              if (dumpPath) console.log("📝 Wrote debug JSON to", dumpPath);
              if (dumpPath) jsonInput.__debugDumpPath = dumpPath;
            } catch (e) {
              console.warn("⚠️ Unable to write debug JSON:", e?.message || e);
            }
          }
        } else {
          const msg = `⚠️ No Firestore profile found for profileId "${jsonInput.profileId}"`;
          console.warn(msg);
          await logPdfEvent({ timestamp, filename: "not generated", url: "", userEmail, profileId, success: false, errorMessage: msg });
          return res.status(404).json({ success: false, message: msg });
        }
      } catch (err) {
        console.error("🔥 Error fetching Firestore profile:", err);
      }
    }

    const appName = jsonInput.glideAppName || "Flair PDF Generator";
    const safeAppName = sanitiseUrl(appName);
    const bucket = getStorage().bucket();

    // ALWAYS generate both (HTML + PDF) for either action
    if (action === ACTIONS.GENERATE_SNAPSHOT || action === ACTIONS.GENERATE_PDF) {
      const result = await generateSnapshotOutputs(jsonInput, safeAppName, bucket, startTime, timestamp, userEmail, profileId);
      return res.status(result.status).json(result.body);
    }

    // Shouldn't reach here
    return res.status(400).json({ success: false, message: "Unhandled action", action, timestamp });
  } catch (err) {
    const executionTimeSeconds = (Date.now() - startTime) / 1000;
    console.error("❌ Cloud Function error:", err);
    await logPdfEvent({
      timestamp,
      filename: "not generated",
      url: "",
      userId,
      userEmail,
      profileId,
      success: false,
      errorMessage: err.message,
    });
    return res.status(500).json({ success: false, message: `Operation failed: ${err.message}`, executionTimeSeconds });
  }
});