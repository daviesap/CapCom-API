// functions/generateSchedules/generateSnapshots.mjs
/**
 * generateSnapshots.mjs
 *
 * This module is responsible for generating per-snapshot outputs (PDF + HTML) for schedules.
 *
 * High-level flow:
 * 1. Enrich the incoming snapshot JSON with a proper header using `applyHeader`.
 * 2. Generate a PDF buffer from the prepared JSON using `generatepdfv2.mjs`.
 * 3. Save the PDF either locally (when emulated) or to the configured GCS bucket.
 * 4. Generate an HTML version of the schedule using `generateHtmlv2.mjs`,
 *    linking it to the freshly generated PDF.
 * 5. Save the HTML either locally or to the bucket.
 * 6. Log the event to Firestore (via `logPdfEvent`) including metadata such as
 *    filename, urls, userEmail, and profileId.
 *
 * Utility functions:
 * - formatYYYYMMDD: creates a timestamp string for filenames.
 * - applyHeader: appends the snapshot filename into the header and ensures
 *   the prepared JSON contains a document.header object for downstream renderers.
 *
 * Exports:
 * - generateSnapshotOutputsv2: the main async function called with a prepared JSON
 *   and environment info, returning the URLs and names of the generated files.
 */
import fs from "fs";
import path from "path";
import { sanitiseUrl } from "../utils/sanitiseUrl.mjs";

function formatYYYYMMDD(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Europe/London'
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

// Add near the top of generateSnapshots.mjs (above export):
function applyHeader(prepared, filename) {
  // Root header is guaranteed to be an array in v2
  const baseHeader = Array.isArray(prepared.header) ? prepared.header.slice() : [];
  const name = String(filename || "").trim();

  // Only append if not already present (case-insensitive)
  const alreadyHas = baseHeader.some(
    (s) => String(s).trim().toLowerCase() === name.toLowerCase()
  );
  const fullHeader = alreadyHas ? baseHeader : [...baseHeader, name];

  prepared.header = fullHeader;
  prepared.document = prepared.document || {};
  prepared.document.header = {
    textLines: fullHeader,
    text: fullHeader.join("\n"),
  };
  // Preserve existing title, otherwise use first line
  prepared.document.title = prepared.document.title || fullHeader[0];

  return prepared;
}

export async function generateSnapshotOutputsv2({
  jsonInput,          // prepared per-snapshot JSON
  safeAppName,
  safeEventName,
  bucket,
  runningEmulated,
  LOCAL_OUTPUT_DIR,
  startTime,
  timestamp,
  userEmail,
  profileId,
  makePublicUrl,
  logPdfEvent,
  logToGlide,
  // 👇 easy toggle: set to "" when promoting to prod paths
  extraSubdir = "",  //was "v2"
}) {
  // Build a path under: public/<app>/<event>/<maybe v2>/<file>
  const joinCloudPath = (filename) =>
    `public/${safeAppName}/${safeEventName}${extraSubdir ? `/${extraSubdir}` : ""}/${filename}`;

  const joinLocalPath = (...parts) =>
    path.join(LOCAL_OUTPUT_DIR, "public", safeAppName, safeEventName, ...(extraSubdir ? [extraSubdir] : []), ...parts);

  // --- Derive display name and sanitised base, then enrich header ---
  // Human-friendly base used in headers (keep spaces/case, strip any extension)
  const rawBase = (jsonInput?.document?.filename || jsonInput?.filename || "schedule").toString();
  const displayBase = rawBase.replace(/\.[a-zA-Z0-9]+$/, "");
  // Apply header enrichment with the human-friendly name
  const prepared = applyHeader({ ...jsonInput }, displayBase);

  // 1) PDF bytes
  const { generatePdfBuffer } = await import("./generatepdf.mjs");
  const { bytes, filename } = await generatePdfBuffer(prepared);
  console.log(`Filename ${filename}`);

  // 2) Names (use sanitised base for storage paths)
  const pdfDate = formatYYYYMMDD();
  const safeBase = sanitiseUrl(displayBase);       // e.g. "AAC-Power-schedule"
  const pdfName = `${safeBase}-${pdfDate}.pdf`;   // versioned
  const htmlName = `${safeBase}.html`;             // stable

  // 3) Save PDF
  if (runningEmulated) {
    fs.mkdirSync(joinLocalPath(), { recursive: true });
    fs.writeFileSync(joinLocalPath(pdfName), bytes);
  } else {
    const pdfFile = bucket.file(joinCloudPath(pdfName));
    await pdfFile.save(bytes, {
      metadata: { contentType: "application/pdf", cacheControl: "public, max-age=31536000, immutable" },
    });
  }
  const pdfUrl = makePublicUrl(joinCloudPath(pdfName), bucket);

  // 4) HTML that links to *this* PDF
  const { generateHtmlString } = await import("./generateHtml.mjs");
  const { htmlString } = await generateHtmlString(prepared, { pdfUrl });

  if (runningEmulated) {
    fs.mkdirSync(joinLocalPath(), { recursive: true });
    fs.writeFileSync(joinLocalPath(htmlName), Buffer.from(htmlString, "utf8"));
  } else {
    const htmlFile = bucket.file(joinCloudPath(htmlName));
    await htmlFile.save(Buffer.from(htmlString, "utf8"), {
      metadata: { contentType: "text/html; charset=utf-8", cacheControl: "public, max-age=0, must-revalidate" },
    });
  }
  const htmlUrl = makePublicUrl(joinCloudPath(htmlName), bucket);

  // 5) Log + return
  const executionTimeSeconds = (Date.now() - startTime) / 1000;
  const glideAppName = prepared.glideAppName || "Glide App Name Missing";

  await logPdfEvent({
    timestamp,
    glideAppName,
    filename: pdfName,
    url: pdfUrl,
    userEmail,
    profileId,
    success: true,
  });

  await logToGlide({
    timestamp,
    glideAppName,
    filename: filename,
    htmlUrl: htmlUrl,
    pdfUrl: pdfUrl,
    userEmail,
    profileId,
    success: true,
    type: "snapshot",
    message: "snapshot generated",
    executionTimeSeconds: executionTimeSeconds
  });

  return { pdfUrl, htmlUrl, pdfName, htmlName, executionTimeSeconds };
}