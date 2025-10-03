// functions/generateSchedules/generateHomeHandler.mjs
import merge from "lodash-es/merge.js";
import { prepareJSONGroups } from "./prepareJSONforSnapshots.mjs";
import { applySnapshotFiltersToView } from "./applyFilters.mjs";
import { generateSnapshotOutputsv2 } from "./generateSnapshots.mjs";
import { generateHome } from "./generateHome.mjs";

/**
 * Orchestrates: prepare -> per-snapshot filter+render -> Home page render.
 * Expects ctx with: db, bucket, makePublicUrl, runningEmulated, LOCAL_OUTPUT_DIR,
 * startTime, timestamp, userEmail, profileId, logToGlide, sanitiseUrl.
 */
export async function generateHomeHandler(req, res, ctx) {
  const {
    db,
    bucket,
    makePublicUrl,
    runningEmulated,
    LOCAL_OUTPUT_DIR,
    startTime,
    timestamp,
    userEmail,
    profileId,
    logToGlide,
    sanitiseUrl,
  } = ctx;

  let jsonInput = req.body || {};

  // 1) Load/merge style profile once (styles/document/columns)
  const rootProfileId = jsonInput?.event?.profileId || "";
  let rootProfileDoc = {};
  if (rootProfileId) {
    try {
      const snap = await db.collection("styleProfiles").doc(rootProfileId).get();
      if (snap.exists) {
        rootProfileDoc = snap.data() || {};
        jsonInput.styles   = merge({}, rootProfileDoc.styles   || {}, jsonInput.styles   || {});
        jsonInput.document = merge({}, rootProfileDoc.document || {}, jsonInput.document || {});
        if (!Array.isArray(jsonInput.columns) || !jsonInput.columns.length) {
          jsonInput.columns = rootProfileDoc.columns || [];
        }
      }
    } catch (e) {
      console.warn("Profile merge skipped:", e?.message || e);
    }
  }

  // 2) Prepare base grouped views once (e.g., byDate-1)
  const groupedViews = await prepareJSONGroups(jsonInput);

  // 3) For each snapshot: filter → render (PDF + HTML)
  const snapshots = Array.isArray(jsonInput.snapshots) ? jsonInput.snapshots : [];
  const safeAppName   = sanitiseUrl(jsonInput.glideAppName || "App");
  const safeEventName = sanitiseUrl(jsonInput?.event?.name || jsonInput?.event?.eventName || "Event");

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];

    // Grab the base view for this preset (groups + columns + styles etc.)
    const baseView = groupedViews[snap.groupPresetId] || { groups: [], columns: [] };

    // Apply per-snapshot filters
    const processedView = applySnapshotFiltersToView(baseView, {
      filterTagIds: snap.filterTagIds || [],
      filterLocationIds: snap.filterLocationIds || [],
      filterSubLocationIds: snap.filterSubLocationIds || [],
    });

    // Build a prepared JSON for rendering this snapshot
    // - Keep your global styles/document/columns
    // - Use the processed groups/rows from processedView
    // - Set a filename/title from the snapshot name for headers/filenames
    const displayName = String(snap.name || "schedule").trim();
    const prepared = {
      // Global doc/style context
      styles: jsonInput.styles || {},
      document: {
        ...(jsonInput.document || {}),
        // filename is used downstream for headers + storage filenames (before sanitisation)
        filename: displayName,
        title: (jsonInput?.document?.title || displayName),
        header: (jsonInput?.document?.header || jsonInput?.header || {}),
        footer: (jsonInput?.document?.footer || jsonInput?.footer || {}),
      },
      columns: Array.isArray(jsonInput.columns) ? jsonInput.columns : (processedView.columns || []),

      // Event metadata
      event: jsonInput.event || {},

      // The filtered groups/rows view
      ...(processedView || {}),

      // Optional passthroughs you may rely on in generateHtml/pdf
      glideAppName: jsonInput.glideAppName || "",
      profileId: rootProfileId || profileId || "",
    };

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
      userId: jsonInput?.userId || "",
      profileId: rootProfileId || profileId || "",
      makePublicUrl,
      logToGlide,
      extraSubdir: "", // keep stable paths for prod
    });

    // expose the real URLs back to the snapshot so Home can link them
    snap.realHtmlUrl = htmlUrl;
    snap.realPdfUrl  = pdfUrl;
  }

  // 4) Generate and publish the Home/MOM page
  const result = await generateHome({
    jsonInput,
    makePublicUrl,
    runningEmulated,
    LOCAL_OUTPUT_DIR,
    startTime,
    timestamp,
    userEmail,
    profileId,
    glideAppName: jsonInput.glideAppName || "",
    req,
    logToGlide,
  });

  return res.status(result.status).json(result.body);
}