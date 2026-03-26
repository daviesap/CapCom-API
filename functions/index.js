/*
 * functions/index.js
 * ------------------
 * Main Cloud Function router for the Flair PDF Generator project.
 * Responsibilities:
 *  - Expose a single HTTP entrypoint (`v2`) which routes actions (version, updateDates, mealsPivot, generateHome).
 *  - Perform common validation (API key gating), environment wiring (secrets), and shared helpers (makePublicUrl).
 * Requirements / runtime expectations:
 *  - Firebase Admin must be initialised (the module calls initializeApp at import-time).
 *  - Secrets: API_KEY, GLIDE_API_KEY are expected to be bound to the function in production.
 *  - The handler delegates heavy work to files under `functions/generateSchedules` which in turn may call Storage/Firestore.
 *  - When running locally the emulator flags (FUNCTIONS_EMULATOR / FIREBASE_EMULATOR_HUB) should be set and LOCAL_API_KEY or LOCAL_GLIDE_API_KEY may be used.
 */

// ===== Imports — Node built-ins =====
import path from "path";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import process from "process";

// ===== Imports — Third-party =====
import { merge } from "lodash-es";

// ===== Imports — Firebase =====
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";


// ===== Imports — Local modules =====
import { sanitiseUrl } from "./utils/sanitiseUrl.mjs";
import { generateHomeHandler } from "./generateSchedules/generateHomeHandler.mjs";

// ===== Secrets =====
// Declare the secret names as they exist in Secret Manager
const API_KEY = defineSecret("api_key");
const GLIDE_API_KEY = defineSecret("glideApiKey");


// ===== Helpers — data shaping =====
/**
 * Ensure each group entry has a v2 `fields` object without mutating originals.
 * @param {Array<any>} groups
 * @returns {Array<any>}
 */
// helper functions moved to generateSchedules/generateHomeHandler.mjs

initializeApp({
  credential: applicationDefault(),
  storageBucket: "flair-pdf-generator.firebasestorage.app",
});

const db = getFirestore();
const LOCAL_OUTPUT_DIR = path.join(process.cwd(), "local-emulator", "output");
const runningEmulated = !!process.env.FUNCTIONS_EMULATOR || !!process.env.FIREBASE_EMULATOR_HUB;

const ACTIONS = {
  VERSION: "version",
  UPDATE_DATES: "updateDates",
  MEALS_PIVOT: "mealsPivot",
  GENERATE_HOME: "generateHome" // New action to generate home page
};

// ===== Helpers — URLs & logging =====
/**
 * Build a public URL for a given GCS object path, honoring local emulation and
 * custom domain mappings for `public/` and `snapshots/` prefixes.
 * @param {string} objectPath
 * @param {{name:string}} bucket
 * @returns {string}
 */
function makePublicUrl(objectPath, bucket) {
  const encoded = encodeURIComponent(objectPath);
  if (runningEmulated) {
    // Storage emulator REST endpoint
    return `http://127.0.0.1:9199/v0/b/${bucket.name}/o/${encoded}?alt=media`;
  }
  // New mapping: public/<app>/<event>/<rest> -> vox.capcom.london/<app>/<event>/<rest>
  let m = objectPath.match(/^public\/([^/]+)\/([^/]+)\/(.+)$/);
  if (m) {
    const [, app, event, rest] = m;
    return `https://vox.capcom.london/${app}/${event}/${rest}`;
  }
  // Back-compat: snapshots/<app>/<rest> -> snapshots.capcom.london/<app>/<rest>
  m = objectPath.match(/^snapshots\/([^/]+)\/(.+)$/);
  if (m) {
    const [, app, rest] = m;
    return `https://snapshots.capcom.london/${app}/${rest}`;
  }
  // Fallback to native GCS URL (shouldn't be used in normal flow)
  return `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
}

/**
 * Generate a per-request run identifier so related logs can be grouped.
 * Accepts optional overrides from the request body (`runId`, `runID`, `run_id`).
 * Falls back to a timestamp-derived identifier when none provided.
 * @param {any} body
 * @param {string} timestamp
 * @returns {string}
 */
function deriveRunId(body, timestamp) {
  const candidates = [
    body?.runId,
    body?.runID,
    body?.run_id,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const asString = String(candidate).trim();
    if (asString) return asString;
  }

  const ts = String(timestamp || new Date().toISOString());
  const safeTs = ts.replace(/[:.]/g, "-");
  return `run_${safeTs}`;
}

/**
 * Write a JSON payload to the local emulator output for debugging.
 * Creates a per-app folder and a timestamped file.
 * No-ops safely when writing fails.
 * @param {unknown} jsonInput
 * @param {string} appNameOrSafe
 * @param {string} [label="request"]
 * @returns {string|null} Absolute path to the debug file or null on failure.
 */
// helper functions moved to generateSchedules/generateHomeHandler.mjs

// ===== Version helper =====
// Get version from package.json (fallback to 0.0.0)
async function getPkgVersion() {
  try {
    const pkgPath = path.resolve(__dirname, "package.json");
    const data = await readFile(pkgPath, "utf8");
    return JSON.parse(data).version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}


// ===== Main handler =====
export const v2 = onRequest({
  region: "europe-west2",
  //minInstances: 1,    // keep one warm
  memory: "1GiB",     // PDF/Excel need headroom
  cpu: 2,             // faster processing
  concurrency: 10,     // handle multiple requests per instance
  secrets: [API_KEY, GLIDE_API_KEY],
}, async (req, res) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  let runId = deriveRunId(req.body, timestamp);

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
      message: '👋 Hello Big \'Un! From CapCom API #UTB.  Available Actions = ' + [...allowed].join(", "),
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

  // --- Accept JSON sent as a *string* (e.g., when Glide binds a JSON column)
  if (typeof req.body === "string") {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Body was a string but not valid JSON. Ensure Glide sends raw JSON or valid JSON text."
      });
    }
  }

  runId = deriveRunId(req.body, timestamp);



  // Debug: compare expected API key vs. provided (prefix only)
  console.log("API key check:", {
    runningEmulated,
    expectedKey_pfx: String(expectedKey).slice(0, 4),
    bodyKey_pfx: String(req.body?.api_key || "").slice(0, 4)
  });
  // --- API key gating ---
  // All actions except 'version' require a valid api_key in the request body.
  if (!req.body?.api_key || req.body.api_key !== expectedKey) {
    return res.status(403).json({ success: false, message: "Invalid or missing API key" });
  }


  console.log(
    `[v2] probe action=${action} ` +
    `ctype=${req.get("content-type") || "n/a"} ` +
    `typeof.body=${typeof req.body} ` +
    `keys=[${Object.keys(req.body || {}).slice(0, 12).join(",")}] ` +
    `has.document=${req.body && typeof req.body.document === "object"} ` +
    `snapshots.len=${Array.isArray(req.body?.snapshots) ? req.body.snapshots.length : "n/a"}`
  );


  // --- Normalise identifiers once for all actions ---
  const rawAppName = (req.body?.glideAppName ?? "").toString();
  const rawEventName = (req.body?.event?.name ?? req.body?.eventName ?? "").toString();

  const safeAppNameBody = sanitiseUrl(rawAppName || "App");
  const safeEventName = sanitiseUrl(rawEventName || "Event");

  // Keep originals for logs/UI, overwrite body for downstream use
  req.body.appNameRaw = rawAppName;
  req.body.eventNameRaw = rawEventName;
  req.body.appName = safeAppNameBody;
  req.body.eventName = safeEventName;

  // UPDATE_DATES
  if (action === ACTIONS.UPDATE_DATES) {
    // --- Glide API key (Secret Manager) ---
    // Only required for UPDATE_DATES. Other actions shouldn't resolve this.
    const glideKey = runningEmulated
      ? (process.env.LOCAL_GLIDE_API_KEY || process.env.GLIDE_API_KEY || "")
      : GLIDE_API_KEY.value();

    if (!glideKey) {
      console.error("❌ Missing Glide API key: ensure Secret Manager secret 'glideApiKey' is set and bound, or set LOCAL_GLIDE_API_KEY for emulator.");
      return res.status(500).json({ success: false, message: "Server missing glideApiKey configuration" });
    }
    // Normalise for code paths that expect process.env.GLIDE_API_KEY
    process.env.GLIDE_API_KEY = glideKey;

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
  const profileId = req.body.event?.profileId || "unknown profileId";
  console.log(`Profile ID ${profileId}`);

  try {
    // Load JSON input: prefer request body; when emulated, optionally overlay local JSON if present
    let jsonInput = (typeof req.body === "object" && req.body) ? req.body : {};
    if (runningEmulated) {
      try {
        const samplePath = path.resolve(process.cwd(), "JSON/local.json");
        const raw = await readFile(samplePath, "utf-8");
        const localJson = JSON.parse(raw);
        // Local JSON provides defaults; request body overrides
        jsonInput = merge({}, localJson, jsonInput);
        console.log("🗂 Using local JSON (emulator) merged with request body");
      } catch {
        console.log("ℹ️ Emulator: no JSON/local.json found; proceeding with request body only");
      }
    }
    // Ensure optional document key exists so downstream code never branches into disk fallback
    jsonInput.document = jsonInput.document || {};

    const glideAppName = jsonInput.glideAppName || "No Glide app name defined";

    // Optional profile merge from Firestore is now handled only in GENERATE_HOME or downstream.

    // (Auto-refresh detectedFields for this profile block removed)

    const safeAppName = sanitiseUrl(req.body?.appName || glideAppName);
    const bucket = getStorage().bucket();
    // Normalise userId for downstream logging (prefer request then JSON)
    const userId = (req?.body?.UserId ?? req?.body?.userId ?? jsonInput?.userId ?? jsonInput?.UserId ?? "");


    // Delegate GENERATE_HOME to the extracted handler
    if (action === ACTIONS.GENERATE_HOME) {
      return await generateHomeHandler({
        req,
        res,
        db,
        bucket,
        runningEmulated,
        LOCAL_OUTPUT_DIR,
        makePublicUrl,
        startTime,
        timestamp,
        userEmail,
        userId,
        profileId,
        glideAppName,
        safeAppName,
        safeEventName,
        runId,
      });
    }


    // Shouldn't reach here
    return res.status(400).json({ success: false, message: "Unhandled action", action, timestamp });
  } catch (err) {
    const executionTimeSeconds = (Date.now() - startTime) / 1000;
    console.error("❌ Cloud Function error:", err);
    return res.status(500).json({ success: false, message: `Operation failed: ${err.message}`, executionTimeSeconds });
  }
});
// ESM replacements for __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
