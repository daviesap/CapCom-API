import { defineSecret } from "firebase-functions/params";
// declare the secret names as they exist in Secret Manager
const API_KEY = defineSecret("api_key");
const GLIDE_API_KEY = defineSecret("glideApiKey");

import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";
import { Buffer } from "node:buffer";
import { merge } from "lodash-es";
import { sanitiseUrl } from "./utils/sanitiseUrl.mjs";
import { filterJson } from "./utils/filterJSON.mjs";
import { sanitiseText } from "./utils/sanitiseText.mjs";
import { deriveDetectedFieldsFromGroups } from "./utils/detectFields.mjs";

initializeApp({
  credential: applicationDefault(),
  storageBucket: "flair-pdf-generator.firebasestorage.app",
});

const db = getFirestore();

const LOCAL_OUTPUT_DIR = path.join(process.cwd(), "local-emulator", "output");
const runningEmulated = !!process.env.FUNCTIONS_EMULATOR || !!process.env.FIREBASE_EMULATOR_HUB;


const ACTIONS = {
  GET_PROFILE_IDS: "getProfileIds",
  VERSION: "version",
  GENERATE_SNAPSHOT: "generateScheduleSnapshot",
  UPDATE_DATES: "updateDates",
  MEALS_PIVOT: "mealsPivot",
  GENERATE_PDF: "generatePdf", // now behaves the same as GENERATE_SNAPSHOT
};

// ---------- helpers ----------
function formatYYYYMMDD(d = new Date()) {
  // Europe/London time (handles BST/GMT automatically)
  const fmt = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Europe/London'
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  const yyyy = parts.year;
  const mm = parts.month;
  const dd = parts.day;
  const hh = parts.hour;
  const min = parts.minute;
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

async function logPdfEvent({ timestamp, glideAppName, filename, url, userEmail, profileId, success, errorMessage }) {
  const logData = {
    timestamp,
    glideAppName,
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
  const { generatePdfBuffer } = await import("./generatepdf.mjs");
  const { bytes } = await generatePdfBuffer(jsonInput);

  // Names
  const pdfDate = formatYYYYMMDD();
  // Derive PDF filename from document.filename (fallback "schedule")
  const rawPdfBase = (jsonInput?.document?.filename || "schedule").toString();
  const baseNoExt = rawPdfBase.replace(/\.[a-zA-Z0-9]+$/, "");
  const safeBase = sanitiseUrl(baseNoExt);
  const safePdfName = `${safeBase}-${pdfDate}.pdf`;
  // Derive HTML filename from document.filename (fallback "schedule")
  const rawHtmlBase = (jsonInput?.document?.filename || "schedule").toString();
  // strip any existing extension, then sanitise (handles spaces etc.), then append .html
  const safeHtmlBase = sanitiseUrl(rawHtmlBase.replace(/\.[a-zA-Z0-9]+$/, ""));
  const safeHtmlName = `${safeHtmlBase}.html`;
  // Get Glide app name
  const glideAppName = jsonInput.glideAppName || "Glide App Name Missing";


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
  await logPdfEvent({ timestamp, glideAppName, filename: safePdfName, url: pdfUrl, userEmail, profileId, success: true });

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

//Get Package version from package.json or default to 0.0.0
async function getPkgVersion() {
  try {
    const pkgPath = path.resolve(__dirname, "package.json");
    const data = await readFile(pkgPath, "utf8");
    return JSON.parse(data).version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}


// ---------- main handler ----------
export const v2 = onRequest({
  region: "europe-west2",
  //minInstances: 1,    // keep one warm
  //memory: "1GiB",     // PDF/Excel need headroom
  //cpu: 2,             // faster processing
  //concurrency: 10     // handle multiple requests per instance
  secrets: [API_KEY, GLIDE_API_KEY],
}, async (req, res) => {
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
  // VERSION endpoint (safe, public)
  if (action === 'version') {
    const version = await getPkgVersion();
    return res.status(200).json({
      success: true,
      message: '👋 Hello Big \'Un! From Capcom API #UTB.  Available Actions = ' + [...allowed].join(", "),
      version,
      timestamp,
    });
  }

  // API key — now injected as a secret value into process.env.API_KEY at deploy time.
  // When running locally/emulated, allow LOCAL_API_KEY override; otherwise use API_KEY.
  const expectedKey = runningEmulated
    ? (process.env.LOCAL_API_KEY || "dev-key")
    : API_KEY.value();

  if (!expectedKey) {
    console.error("❌ Missing API_KEY environment value in production.");
    return res.status(500).json({ success: false, message: "Server missing API_KEY configuration" });
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
      return res.status(200).json({ success: true, message:"✅ Success", count: ids.length, profiles: ids, timestamp });
    } catch (err) {
      console.error("❌ Error fetching profile IDs:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch profile IDs", error: err.message, timestamp });
    }
  }

  // UPDATE_DATES
  if (action === ACTIONS.UPDATE_DATES) {
    const { updateDatesHandler } = await import("./updateDates/updateDates.js");
    return await updateDatesHandler(req, res, db);
  }

  //Meals Pivot table
  if (action === ACTIONS.MEALS_PIVOT) {
    const { mealsPivotHandler } = await import("./pivotTable/mealsPivot.js");
    return await mealsPivotHandler(req, res);
  }

  // Shared metadata
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
    const glideAppName = jsonInput.glideAppName || "No Glide app name defined";

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
          await logPdfEvent({ timestamp, glideAppName, filename: "not generated", url: "", userEmail, profileId, success: false, errorMessage: msg });
          return res.status(404).json({ success: false, message: msg });
        }
      } catch (err) {
        console.error("🔥 Error fetching Firestore profile:", err);
      }
    }

    // Auto-refresh detectedFields for this profile based on the filtered groups
    try {
      if (profileId && Array.isArray(jsonInput?.groups) && jsonInput.groups.length) {
        const detected = deriveDetectedFieldsFromGroups(jsonInput.groups);
        if (detected && detected.length) {
          const ref = db.collection("styleProfiles").doc(jsonInput.profileId || profileId);
          const snap = await ref.get();
          const prev = (snap.exists && Array.isArray(snap.data().detectedFields))
            ? snap.data().detectedFields
            : [];

          // Order-sensitive comparison to avoid unnecessary writes
          const changed =
            detected.length !== prev.length ||
            detected.some((k, i) => k !== prev[i]);

          if (changed) {
            await ref.update({
              detectedFields: detected,
              fieldsLastUpdated: new Date().toISOString(),
            });
            if (jsonInput?.debug === true) console.log("🔄 detectedFields updated:", detected);
          } else if (jsonInput?.debug === true) {
            console.log("ℹ️ detectedFields unchanged");
          }
        } else if (jsonInput?.debug === true) {
          console.log("ℹ️ No detected fields derived from groups.");
        }
      }
    } catch (e) {
      console.warn("⚠️ Failed to update detectedFields:", e?.message || e);
    }

    const safeAppName = sanitiseUrl(glideAppName);
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
      glideAppName: (req.body?.glideAppName || "Missing Glide App Name"),
      filename: "not generated",
      url: "",
      userEmail,
      profileId,
      success: false,
      errorMessage: err.message,
    });
    return res.status(500).json({ success: false, message: `Operation failed: ${err.message}`, executionTimeSeconds });
  }
});
// ESM replacements for __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);