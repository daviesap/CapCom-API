/*
 * functions/generateSchedules/generateHomeHandler.mjs
 * --------------------------------------------------
 * Encapsulates the logic previously implemented inline in `functions/index.js` for the
 * `generateHome` action. Responsibilities:
 *  - Load a root profile from Firestore (if provided)
 *  - Prepare grouped views via `prepareJSONGroups`
 *  - Apply per-snapshot filters and build prepared JSON objects for rendering
 *  - Invoke `generateSnapshotOutputsv2` for each snapshot
 *  - Call `generateHome` to build and publish the MOM/Home page
 * Requirements / dependencies:
 *  - `db` (Firestore instance) passed in to read profiles
 *  - `bucket` (Storage bucket) passed in for publishing and for URL construction
 *  - `makePublicUrl` function (provided by the caller) to create public URLs
 *  - `generateSnapshotOutputsv2` and `generateHome` from sibling modules
 * Notes:
 *  - Writes debug JSON under the configured LOCAL_OUTPUT_DIR when running emulated.
 */

import path from "path";
import fs from "fs";
import { FieldValue } from "firebase-admin/firestore";
import { merge } from "lodash-es";
import { sanitiseUrl } from "../utils/sanitiseUrl.mjs";
import { prepareJSONGroups } from "./prepareJSONforSnapshots.mjs";
import { applySnapshotFiltersToView } from "./applyFilters.mjs";
import { generateSnapshotOutputsv2 } from "./generateSnapshots.mjs";
import { generateHome } from "./generateHome.mjs";
import { buildDataDiff } from "./buildDataDiff.mjs";

const LOCAL_OUTPUT_DIR = path.join(process.cwd(), "local-emulator", "output");

function getProfilePdfConfig(profileDoc = {}) {
  const pdf = (profileDoc?.PDF && typeof profileDoc.PDF === "object") ? profileDoc.PDF : {};
  return {
    styles: pdf.styles || profileDoc.styles || {},
    document: pdf.document || profileDoc.document || {},
    columns: pdf.columns || profileDoc.columns || [],
    groupPresets: profileDoc.groupPresets || [],
  };
}

function isTruthyFlag(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return false;
}

export function getSnapshotEventKeyPeople({ snapshot = {}, keyPeople = [] } = {}) {
  return isTruthyFlag(snapshot.showContacts) && Array.isArray(keyPeople)
    ? keyPeople
    : [];
}

function getEventField(jsonInput, key, fallback = "") {
  return jsonInput?.event?.[key] ?? jsonInput?.[key] ?? fallback;
}

function normaliseAllowedEmails(value) {
  if (!Array.isArray(value)) return null;

  const emails = [];
  const seen = new Set();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const email = item.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

async function syncAllowedEmails({ db, jsonInput }) {
  const hasEventAllowedEmails = Object.prototype.hasOwnProperty.call(jsonInput?.event || {}, "allowedEmails");
  if (!hasEventAllowedEmails) return;

  const eventId = String(jsonInput?.event?.eventId || "").trim();
  if (!eventId) {
    throw badRequest("event.allowedEmails supplied without event.eventId");
  }
  if (eventId.includes("/")) {
    throw badRequest("eventId cannot contain '/'");
  }

  const allowedEmails = normaliseAllowedEmails(jsonInput.event.allowedEmails);
  if (!allowedEmails) {
    throw badRequest("event.allowedEmails must be an array");
  }
  const eventName = String(jsonInput?.event?.name || "").trim();

  await db.collection("allowedEmails").doc(eventId).set({
    eventId,
    eventName,
    allowedEmails,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`✅ Synced ${allowedEmails.length} allowed email(s) for event "${eventId}"`);
}

function getProtectedEventId(jsonInput) {
  const eventId = String(jsonInput?.event?.eventId || "").trim();
  if (!eventId) {
    throw badRequest("event.eventId is required to generate protected files");
  }
  if (eventId.includes("/")) {
    throw badRequest("eventId cannot contain '/'");
  }
  return eventId;
}

function adaptGroupsForRendererV2(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.map(g => {
    const entries = Array.isArray(g.entries) ? g.entries : [];
    const adaptedEntries = entries.map(e => {
      const existingFields = (e && typeof e === "object" && e.fields && typeof e.fields === "object")
        ? { ...e.fields }
        : {};
      const fields = { ...existingFields };

      if (e && typeof e === "object") {
        for (const [key, value] of Object.entries(e)) {
          if (fields[key] !== undefined) continue;
          if (Array.isArray(value)) {
            fields[key] = value.map(v => (typeof v === "string" || typeof v === "number") ? String(v) : "")
              .filter(Boolean)
              .join(", ");
          } else if (typeof value === "string" || typeof value === "number") {
            fields[key] = value;
          }
        }
      }

      fields.date = e?.date ?? fields.date ?? e?.dateKey ?? "";
      fields.dateKey = e?.dateKey ?? fields.dateKey ?? e?.date ?? "";
      fields.time = e?.time ?? fields.time ?? "";
      fields.description = e?.description ?? fields.description ?? "";
      fields.notes = e?.notes ?? fields.notes ?? "";
      fields.tags = Array.isArray(e?.tags)
        ? e.tags.join(", ")
        : (fields.tags ?? e?.tags ?? "");
      fields.locations = Array.isArray(e?.locations)
        ? e.locations.join(", ")
        : (fields.locations ?? e?.locations ?? "");

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

export async function generateHomeHandler({
  req,
  res,
  db,
  bucket,
  runningEmulated,
  LOCAL_OUTPUT_DIR,
  startTime,
  timestamp,
  userEmail,
  userId,
  profileId,
  glideAppName,
  safeAppName,
  safeEventName,
  makePublicUrl,
  runId
}) {
  // Use the LOCAL_OUTPUT_DIR defined here (keeps parity with previous behaviour)
  try {
    let jsonInput = (typeof req.body === "object" && req.body) ? req.body : {};
    let protectedEventId;

    try {
      protectedEventId = getProtectedEventId(jsonInput);
      await syncAllowedEmails({ db, jsonInput });
    } catch (err) {
      if (err?.statusCode === 400) {
        return res.status(400).json({ success: false, message: err.message });
      }
      throw err;
    }

    // Load and merge profile once for GENERATE_HOME using root profileId
    const rootProfileId = getEventField(jsonInput, "profileId", "");
    let rootProfileDoc = {};
    if (rootProfileId) {
      try {
        const ref = db.collection("profiles").doc(rootProfileId);
        const snap = await ref.get();
        if (snap.exists) {
          rootProfileDoc = snap.data() || {};
          const profilePdf = getProfilePdfConfig(rootProfileDoc);
          jsonInput.styles = merge({}, profilePdf.styles, jsonInput.styles || {});
          jsonInput.document = merge({}, profilePdf.document, jsonInput.document || {});
          if (!Array.isArray(jsonInput.columns) || jsonInput.columns.length === 0) {
            jsonInput.columns = profilePdf.columns || [];
          }
          try {
            await ref.update({ lastUsed: FieldValue.serverTimestamp() });
          } catch (err) {
            console.warn(`⚠️ Failed to update lastUsed for profile "${rootProfileId}":`, err?.message || err);
          }
        } else {
          console.warn(`⚠️ No Firestore profile found for root profileId "${rootProfileId}" (GENERATE_HOME).`);
          return res.status(400).json({ success: false, message: "Missing profile ID" });
        }
      } catch (e) {
        console.warn(`⚠️ Failed to load root profile "${rootProfileId}" for GENERATE_HOME:`, e?.message || e);
        return res.status(400).json({ success: false, message: "Missing profile ID" });
      }
    }

    const rootProfilePdf = getProfilePdfConfig(rootProfileDoc);
    if (!Array.isArray(rootProfilePdf.groupPresets) || rootProfilePdf.groupPresets.length === 0) {
      return res.status(400).json({ success: false, message: "group preset missing" });
    }
    const groupedViews = await prepareJSONGroups(req.body, {
      groupPresets: rootProfilePdf.groupPresets,
    });

    if (runningEmulated || req.body.debug === true) {
      const dumpPath = writeDebugJson(
        groupedViews,
        req.body.glideAppName || "Flair PDF Generator",
        "grouped-views-pre-snapshot"
      );
      if (dumpPath) console.log(`📝 Wrote grouped views to ${dumpPath}`);
    }

    const snapshots = Array.isArray(req.body.snapshots) ? req.body.snapshots : [];
    console.log(`🧩 GENERATE_HOME: processing ${snapshots.length} snapshot(s) sequentially...`);

    for (let idx = 0; idx < snapshots.length; idx++) {
      const snap = snapshots[idx];
      const label = snap.name || `(unnamed #${idx + 1})`;
      console.log(`▶️  Starting snapshot ${idx + 1}/${snapshots.length}: ${label}`);

      const presetId = snap.groupPresetId;
      if (!presetId || !groupedViews[presetId]) {
        return res.status(400).json({
          success: false,
          message: "group preset missing",
          groupPresetId: presetId || null,
        });
      }
      const baseView = groupedViews[presetId];

      const processedJSON = applySnapshotFiltersToView(baseView, {
        filterTagIds: snap.filterTagIds || [],
        filterLocationIds: snap.filterLocationIds || [],
        filterSubLocationIds: snap.filterSubLocationIds || [],
        filterSupplierIds: snap.filterSupplierIds || [],
        filterGroup: snap.filterGroup || "",
      });

      const groupsCount = Array.isArray(processedJSON?.groups) ? processedJSON.groups.length : 0;
      console.log(`   • Groups final (after filter): ${groupsCount} (groupBy=${presetId})`);

      const effectiveProfileId = rootProfileId || profileId;
      const profileDoc = rootProfileDoc || {};
      const profilePdf = getProfilePdfConfig(profileDoc);

      const adaptedGroups = adaptGroupsForRendererV2(processedJSON.groups);
      const finalGroups = adaptedGroups.map(g => {
        const friendlyTitle = g?.meta?.title ? g.meta.title : g.title;
        const above = g?.meta?.above;
        const metadata = Array.isArray(above) ? above.filter(Boolean).join("\n") : (above ?? "");
        const originalRawKey = g.rawKey;
        return { ...g, title: friendlyTitle, rawKey: friendlyTitle, rawKeyCanonical: originalRawKey, metadata };
      });

      const prepared = {
        ...jsonInput,
        event: {
          ...(jsonInput.event || {}),
          keyPeople: getSnapshotEventKeyPeople({
            snapshot: snap,
            keyPeople: jsonInput.event?.keyPeople,
          }),
        },
        groups: finalGroups,
        styles: merge({}, profilePdf.styles, jsonInput.styles || {}),
        document: merge(
          {},
          profilePdf.document,
          jsonInput.document || {},
          { filename: snap.name || (jsonInput.document?.filename || "schedule") }
        ),
        columns:
          (Array.isArray(baseView.columns) && baseView.columns.length ? baseView.columns : null) ||
          jsonInput.columns ||
          profilePdf.columns ||
          [],
        header: [...(jsonInput?.event?.header ?? []), snap.filename].filter(Boolean),
        profileId: effectiveProfileId,
        startEachGroupOnNewPage: isTruthyFlag(snap.startEachGroupOnNewPage),
        createExcel: isTruthyFlag(snap.createExcel),
      };

      prepared.document = prepared.document || {};
      prepared.document.header = {
        textLines: prepared.header,
        text: prepared.header.join("\n"),
      };

      if (jsonInput.event?.logoUrl && !prepared.document?.header?.logo?.url) {
        prepared.document.header.logo = { url: jsonInput.event.logoUrl };
      }

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

      const { pdfUrl, protectedPdfUrl, htmlUrl, protectedHtmlUrl, excelUrl } = await generateSnapshotOutputsv2({
        jsonInput: prepared,
        safeAppName,
        safeEventName,
        protectedEventId,
        bucket,
        runningEmulated,
        LOCAL_OUTPUT_DIR,
        startTime,
        timestamp,
        userEmail,
        userId,
        profileId: effectiveProfileId,
        makePublicUrl,
        extraSubdir: "",
        runId,
      });

      console.log(`   • Done HTML: ${htmlUrl}`);
      console.log(`   • Done  PDF: ${pdfUrl}`);
      if (excelUrl) console.log(`   • Done Excel: ${excelUrl}`);
      console.log(`✅ Done snapshot ${idx + 1}/${snapshots.length}: ${label}`);

      snap.realHtmlUrl = htmlUrl;
      snap.realPdfUrl = pdfUrl;
      snap.realExcelUrl = excelUrl || "";
      snap.realProtectedHtmlUrl = protectedHtmlUrl;
      snap.realProtectedPdfUrl = protectedPdfUrl;
    }

    if (Array.isArray(req.body.snapshots)) {
      jsonInput.snapshots = req.body.snapshots;
    }

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
      bucket,
      safeAppName,
      safeEventName,
      protectedEventId,
      runId
    });

    result.body.diff = buildDataDiff(jsonInput);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("❌ GENERATE_HOME handler error:", err);
    return res.status(500).json({ success: false, message: `GENERATE_HOME failed: ${err.message}` });
  }
}
