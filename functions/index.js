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
import { merge } from "lodash-es";
import { sanitiseUrl } from "./utils/sanitiseUrl.mjs";
import { filterJson } from "./utils/filterJSON.mjs";
import { sanitiseText } from "./utils/sanitiseText.mjs";
import { deriveDetectedFieldsFromGroups } from "./utils/detectFields.mjs";
import { generateHome } from "./generateSchedules/generateHome.mjs";
import { applySnapshotFiltersToView } from "./generateSchedules/applyFilters.mjs";


// Adapt grouped entries to renderer v2 shape: each entry should have a `fields` object.
function adaptGroupsForRendererV2(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.map(g => {
    const entries = Array.isArray(g.entries) ? g.entries : [];
    const adaptedEntries = entries.map(e => {
      // If already in v2 shape, leave as-is
      if (e && typeof e === "object" && e.fields && typeof e.fields === "object") return e;
      // Otherwise, adapt common fields
      const fields = {
        date: e?.date ?? e?.dateKey ?? "",
        time: e?.time ?? "",
        description: e?.description ?? e?.fields?.description ?? "",
        notes: e?.notes ?? e?.fields?.notes ?? "",
        // Pass-through simple display strings if present
        tags: Array.isArray(e?.tags) ? e.tags.join(", ") : (e?.tags ?? ""),
        locations: Array.isArray(e?.locations) ? e.locations.join(", ") : (e?.locations ?? "")
      };
      return { ...e, fields };
    });
    return {
      rawKey: g.rawKey,
      title: g.title,
      meta: g.meta,
      entries: adaptedEntries,
    };
  });
}
import { generateSnapshotOutputsv2 } from "./generateSchedules/generateSnapshots.mjs";
import { prepareJSONGroups } from "./generateSchedules/prepareJSONforSnapshots.mjs";

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
  memory: "1GiB",     // PDF/Excel need headroom
  cpu: 2,             // faster processing
  concurrency: 10,     // handle multiple requests per instance
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

  // --- Glide API key (Secret Manager) ---
  // In production (Gen 2), use the bound secret "glideApiKey".
  // When running locally/emulated, allow LOCAL_GLIDE_API_KEY or an existing GLIDE_API_KEY.
  const glideKey = runningEmulated
    ? (process.env.LOCAL_GLIDE_API_KEY || process.env.GLIDE_API_KEY || "")
    : GLIDE_API_KEY.value();

  if (!glideKey) {
    console.error("❌ Missing Glide API key: ensure Secret Manager secret 'glideApiKey' is set and bound, or set LOCAL_GLIDE_API_KEY for emulator.");
    return res.status(500).json({ success: false, message: "Server missing glideApiKey configuration" });
  }

  // Normalise for legacy code paths that expect process.env.GLIDE_API_KEY
  process.env.GLIDE_API_KEY = glideKey;

  // --- Normalise identifiers once for all actions ---
  const rawAppName = (req.body?.glideAppName ?? "").toString();
  const rawEventName = (req.body?.eventName ?? "").toString();

  const safeAppNameBody = sanitiseUrl(rawAppName || "App");
  const safeEventName = sanitiseUrl(rawEventName || "Event");

  // Keep originals for logs/UI, overwrite body for downstream use
  req.body.appNameRaw = rawAppName;
  req.body.eventNameRaw = rawEventName;
  req.body.appName = safeAppNameBody;
  req.body.eventName = safeEventName;

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

    // Optional profile merge from Firestore
    let profileData = {};
    let firestoreStyles = {};

    if (action !== ACTIONS.GENERATE_HOME && jsonInput.profileId) {
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
    } else if (action === ACTIONS.GENERATE_HOME) {
      // For GENERATE_HOME we intentionally skip pre-merging and pre-filtering here.
      // Optional: still dump the *base* JSON for debugging.
      if (runningEmulated || jsonInput.debug === true) {
        try {
          const appNameForDump = jsonInput.glideAppName || "Flair PDF Generator";
          const dumpPath = writeDebugJson(jsonInput, appNameForDump, `${action}-base`);
          if (dumpPath) console.log("📝 Wrote base debug JSON to", dumpPath);
        } catch (e) {
          console.warn("⚠️ Unable to write base debug JSON:", e?.message || e);
        }
      }
    }

    // Auto-refresh detectedFields for this profile based on the filtered groups
    try {
      if (action !== ACTIONS.GENERATE_HOME) {
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
      }
    } catch (e) {
      console.warn("⚠️ Failed to update detectedFields:", e?.message || e);
    }

    const safeAppName = sanitiseUrl(req.body?.appName || glideAppName);
    const bucket = getStorage().bucket();


    //////////////////////////////////////////////////////////////////////////////////////
    //Generate all snapshots and mom page/////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////
    if (action === ACTIONS.GENERATE_HOME) {

      // Load and merge profile once for GENERATE_HOME using root profileId
      const rootProfileId = jsonInput.profileId || req.body.profileId;
      let rootProfileDoc = {};
      if (rootProfileId) {
        try {
          const ref = db.collection("styleProfiles").doc(rootProfileId);
          const snap = await ref.get();
          if (snap.exists) {
            rootProfileDoc = snap.data() || {};
            // Merge into the main JSON once (styles/document). Columns: prefer body columns if present
            jsonInput.styles = merge({}, rootProfileDoc.styles || {}, jsonInput.styles || {});
            jsonInput.document = merge({}, rootProfileDoc.document || {}, jsonInput.document || {});
            if (!Array.isArray(jsonInput.columns) || jsonInput.columns.length === 0) {
              jsonInput.columns = rootProfileDoc.columns || [];
            }
          } else {
            console.warn(`⚠️ No Firestore profile found for root profileId "${rootProfileId}" (GENERATE_HOME).`);
          }
        } catch (e) {
          console.warn(`⚠️ Failed to load root profile "${rootProfileId}" for GENERATE_HOME:`, e?.message || e);
        }
      }


      // Build all groupings once from the incoming JSON
      const groupedViews = await prepareJSONGroups(req.body);

      // (Optional debug dump when running locally/emulated)
      if (runningEmulated || req.body.debug === true) {
        const dumpPath = writeDebugJson(
          groupedViews,
          req.body.glideAppName || "Flair PDF Generator",
          "grouped-views-pre-snapshot"
        );
        if (dumpPath) console.log(`📝 Wrote grouped views to ${dumpPath}`);
      }


      // Process ALL snapshots sequentially so we don't overload the instance and to preserve order.
      const snapshots = Array.isArray(req.body.snapshots) ? req.body.snapshots : [];

      console.log(`🧩 GENERATE_HOME: processing ${snapshots.length} snapshot(s) sequentially...`);

      for (let idx = 0; idx < snapshots.length; idx++) {
        const snap = snapshots[idx];
        const label = snap.filename || `(unnamed #${idx + 1})`;
        console.log(`▶️  Starting snapshot ${idx + 1}/${snapshots.length}: ${label}`);

        // Select the precomputed view by groupPresetId (required)
        const presetId = snap.groupPresetId;
        const baseView = groupedViews[presetId] || { groupBy: "", groups: [], columns: [] };

        // Apply per-snapshot filters to the precomputed groups
        const processedJSON = applySnapshotFiltersToView(baseView, {
          filterTagIds: snap.filterTagIds || [],
          filterLocationIds: snap.filterLocationIds || [],
          filterSubLocationIds: snap.filterSubLocationIds || [],
        });

        const groupsCount = Array.isArray(processedJSON?.groups) ? processedJSON.groups.length : 0;
        console.log(`   • Groups final (after filter): ${groupsCount} (groupBy=${presetId})`);

        // 3) Use root profile (loaded once above) for all snapshots in GENERATE_HOME
        const effectiveProfileId = rootProfileId || jsonInput.profileId || profileId;
        const profileDoc = rootProfileDoc || {};

        // 4) Build prepared JSON for renderer (HTML/PDF)
        // Ensure friendly group titles from meta override raw titles,
        // and expose meta.above to the HTML renderer as `metadata`.
        const adaptedGroups = adaptGroupsForRendererV2(processedJSON.groups);
        const finalGroups = adaptedGroups.map(g => {
          const friendlyTitle = g?.meta?.title ? g.meta.title : g.title;
          // above may be a string (current) or array (future); support both
          const above = g?.meta?.above;
          const metadata = Array.isArray(above) ? above.filter(Boolean).join("\n") : (above ?? "");
          const originalRawKey = g.rawKey;
          return { ...g, title: friendlyTitle, rawKey: friendlyTitle, rawKeyCanonical: originalRawKey, metadata };
        });
        const prepared = {
          ...jsonInput, // retain event meta (glideAppName, eventName, etc.)
          groups: finalGroups,
          styles: merge({}, profileDoc.styles || {}, jsonInput.styles || {}),
          document: merge(
            {},
            profileDoc.document || {},
            jsonInput.document || {},
            { filename: snap.filename || (jsonInput.document?.filename || "schedule") }
          ),
          columns:
            (Array.isArray(baseView.columns) && baseView.columns.length ? baseView.columns : null) ||
            jsonInput.columns ||
            profileDoc.columns ||
            [],
          // Header will always be an array at root; append filename for this snapshot
          header: [...jsonInput.header, snap.filename].filter(Boolean),
          profileId: effectiveProfileId,
        };

        // 4a) Ensure document.header for v2 renderers
        prepared.document = prepared.document || {};
        prepared.document.header = {
          textLines: prepared.header,
          text: prepared.header.join("\n"),
        };

        // 4b) Pass through a logo if present at root (keeps v2 renderers simple)
        if (jsonInput.logoUrl && !prepared.document?.header?.logo?.url) {
          prepared.document.header.logo = {
            url: jsonInput.logoUrl,
          };
        }

        // Optional debug dump per snapshot when emulated
        if (runningEmulated || jsonInput.debug === true) {
          try {
            const appNameForDump = jsonInput.glideAppName || "Flair PDF Generator";
            const dumpPath = writeDebugJson(
              { prepared },
              appNameForDump,
              `prepared-${idx + 1}-${sanitiseUrl(label)}`
            );
            if (dumpPath) console.log(`   • 📝 Wrote prepared JSON to ${dumpPath}`);
          } catch (e) {
            console.warn("   • ⚠️ Unable to write prepared JSON:", e?.message || e);
          }
        }

        // 5) Render snapshot (v2 paths)
        const { pdfUrl, htmlUrl } = await generateSnapshotOutputsv2({
          jsonInput: prepared,
          safeAppName,
          safeEventName,
          bucket,
          runningEmulated,
          LOCAL_OUTPUT_DIR,
          startTime,
          timestamp,
          userEmail,
          profileId: effectiveProfileId,
          makePublicUrl,
          logPdfEvent,
          extraSubdir: "", //was "v2"
        });

        console.log(`   • Done HTML: ${htmlUrl}`);
        console.log(`   • Done  PDF: ${pdfUrl}`);
        console.log(`✅ Done snapshot ${idx + 1}/${snapshots.length}: ${label}`);

        // 6) Attach real URLs back to the snapshot for the home page
        snap.realHtmlUrl = htmlUrl;
        snap.realPdfUrl = pdfUrl;
      }

      // Keep top-level JSON in sync
      if (Array.isArray(req.body.snapshots)) {
        jsonInput.snapshots = req.body.snapshots;
      }

      // Optional: write a loop summary when emulated
      if (runningEmulated || jsonInput.debug === true) {
        try {
          const appNameForDump = jsonInput.glideAppName || "Flair PDF Generator";
          const dumpPath = writeDebugJson(jsonInput, appNameForDump, "generateHome-after-loop");
          if (dumpPath) console.log(`📝 Wrote post-loop JSON to ${dumpPath}`);
        } catch (e) {
          console.warn("⚠️ Unable to write post-loop JSON:", e?.message || e);
        }
      }

      const result = await generateHome({
        jsonInput,
        makePublicUrl,
        runningEmulated,
        LOCAL_OUTPUT_DIR,
        startTime,
        timestamp,
        userEmail,
        profileId,
        glideAppName,
        req,
        logPdfEvent,
        bucket,
        safeAppName,
        safeEventName
      });
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