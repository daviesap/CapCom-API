// functions/generateSchedules/generateSnapshots.mjs
import fs from "fs";
import path from "path";

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
  // header is guaranteed to be an array at root in v2
  const fullHeader = [...prepared.header, filename];

  prepared.header = fullHeader;
  prepared.document = prepared.document || {};
  prepared.document.header = {
    textLines: fullHeader,
    text: fullHeader.join("\n"),
  };
  // Leave any existing title, else default to first line
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
  // 👇 easy toggle: set to "" when promoting to prod paths
  extraSubdir = "v2",
}) {
  // Build a path under: public/<app>/<event>/<maybe v2>/<file>
  const joinCloudPath = (filename) =>
    `public/${safeAppName}/${safeEventName}${extraSubdir ? `/${extraSubdir}` : ""}/${filename}`;

  const joinLocalPath = (...parts) =>
    path.join(LOCAL_OUTPUT_DIR, "public", safeAppName, safeEventName, ...(extraSubdir ? [extraSubdir] : []), ...parts);

  // --- Derive display/base filename early & enrich header for v2 renderers ---
  const baseNoExt = jsonInput?.document?.filename || jsonInput?.filename || "schedule";
  // Apply header enrichment (append filename to root header array and mirror into document.header)
  const prepared = applyHeader({ ...jsonInput }, baseNoExt);

  // 1) PDF bytes
  const { generatePdfBuffer } = await import("../generateSchedules/generatepdfv2.mjs");
  const { bytes, filename } = await generatePdfBuffer(prepared);
  console.log(`Filename ${filename}`);

  // 2) Names
  const pdfDate = formatYYYYMMDD();
  const pdfName  = `${baseNoExt}-${pdfDate}.pdf`; // versioned
  const htmlName = `${baseNoExt}.html`;           // stable

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
  const { generateHtmlString } = await import("../generateSchedules/generateHtmlv2.mjs");
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

  return { pdfUrl, htmlUrl, pdfName, htmlName, executionTimeSeconds };
}