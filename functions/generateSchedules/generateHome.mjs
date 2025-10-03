/*
 * functions/generateSchedules/generateHome.mjs
 * -------------------------------------------
 * Build and publish the Home / MOM HTML page for an event.
 * Responsibilities:
 *  - Accept prepared JSON (snapshots with realHtmlUrl/realPdfUrl) and render an index page grouping snapshots.
 *  - Write the resulting HTML to the provided Storage bucket or to the local emulator filesystem.
 * Requirements:
 *  - `makePublicUrl` function to map storage paths to public URLs (passed by caller)
 *  - When invoked in emulation mode, `LOCAL_OUTPUT_DIR` is used for local writes.
 */

// functions/generateSchedules/generateHome.mjs
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";
import { Buffer } from "node:buffer";
import { sanitiseUrl } from "../utils/sanitiseUrl.mjs";

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/* ---------- utils ---------- */

function escapeHtml(text = "") {
  return text.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return match;
    }
  });
}

/**
 * Group snapshots by the `group` key and order groups by `sortOrder` (ascending).
 * - Group key default: "Other".
 * - A group's sortOrder is the **lowest** numeric sortOrder seen among its items;
 *   non-numeric/missing values are treated as Infinity.
 * - Items inside each group retain their original input order (no sorting).
 */
function groupSnapshotsByGroup(snapshots = []) {
  const groupsMap = new Map();

  for (const s of snapshots) {
    const key = (s.group ?? "Other").toString();
    const sOrder = Number.isFinite(s?.sortOrder) ? s.sortOrder : Number.POSITIVE_INFINITY;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, { key, sortOrder: sOrder, items: [] });
    }

    const grp = groupsMap.get(key);
    if (sOrder < grp.sortOrder) grp.sortOrder = sOrder; // keep smallest seen
    grp.items.push(s); // preserve original input order
  }

  const groups = Array.from(groupsMap.values());
  groups.sort((a, b) => {
    const diff = (a.sortOrder ?? Number.POSITIVE_INFINITY) - (b.sortOrder ?? Number.POSITIVE_INFINITY);
    if (diff) return diff;
    return a.key.localeCompare(b.key);
  });
  return groups;
}

/* ---------- main ---------- */

export async function generateHome({
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
  logToGlide,
  runId
}) {
  const safeAppName = sanitiseUrl(req?.body?.appName || jsonInput?.glideAppName || "App");
  const safeEventName = sanitiseUrl(
    req?.body?.event?.name ||
    jsonInput?.event?.name ||
    jsonInput?.event?.eventName ||
    "Event"
  );
  const bucket = getStorage().bucket();
  const userId = (req?.body?.UserId ?? jsonInput?.userId ?? jsonInput?.UserId ?? "");

  // Snapshots as given (no re-sorting at item level)
  const snapshots = Array.isArray(jsonInput.snapshots) ? jsonInput.snapshots.slice() : [];

  // Build grouped structure (groups ordered by sortOrder; items retain input order)
  const groupsArr = groupSnapshotsByGroup(snapshots);

  // ---------- Render ----------

  function renderGroupsHtml(groups) {
    return groups.map(g => {
      const head = `<div class="group-head">${escapeHtml(g.key ?? "")}</div>`;
      const items = g.items.map(s => {
        const labelRaw = (s.name ?? s.displayName ?? s.title ?? s.filename ?? "Snapshot").toString();
        const label = escapeHtml(labelRaw);

        const realUrl = (typeof s.realHtmlUrl === "string" && s.realHtmlUrl.trim()) ? s.realHtmlUrl.trim() : "";
        const tempUrl = (typeof s.urlTemp === "string" && s.urlTemp.trim()) ? s.urlTemp.trim() : "";
        const targetUrl = realUrl || tempUrl;

        const hrefAttr = targetUrl
          ? ` href="${escapeHtml(targetUrl)}" target="_blank" rel="noopener"`
          : ` role="button" aria-disabled="true"`;

        return `
          <a class="snap-btn"${hrefAttr}>
            <div class="left">
              <div class="snap-label">${label}</div>
            </div>
            <svg class="chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        `;
      }).join("\n");

      return `
        <section class="group">
          ${head}
          <div class="grid">
            ${items}
          </div>
        </section>
      `;
    }).join("\n");
  }

  // Header/meta
  const title = `${jsonInput?.event?.name || "Event"} – Home`;

  // Key Info (Markdown -> HTML, sanitized)
  const keyInfoMd = jsonInput?.event?.keyInfo || "";
  let keyInfoSection = "";
  if (keyInfoMd) {
    const rawHtml = marked.parse(keyInfoMd, { mangle: false, headerIds: false });
    const safeHtml = sanitizeHtml(rawHtml, {
      allowedTags: [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "strong", "em", "ul", "ol", "li",
        "blockquote", "code", "pre", "br", "hr", "a", "span"
      ],
      allowedAttributes: { a: ["href", "title", "target", "rel"], span: ["class"] },
      transformTags: {
        a: (tagName, attribs) => ({
          tagName: "a",
          attribs: { ...attribs, target: "_blank", rel: "noopener" }
        })
      }
    });
    keyInfoSection = `
    <details class="accordion key-info">
      <summary>
        <span>Key info</span>
        <svg class="acc-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </summary>
      <div class="acc-body markdown">
        ${safeHtml}
      </div>
    </details>`;
  }

  // Left-side header (title + optional sublines from event.header)
  const headerLeftHtml = Array.isArray(jsonInput?.event?.header)
    ? jsonInput.event.header.map((line, i) =>
      i === 0
        ? `<h1>${escapeHtml(line)}</h1>`
        : `<div class="sub">${escapeHtml(line)}</div>`
    ).join("")
    : `<h1>${escapeHtml(jsonInput?.event?.name || jsonInput?.event?.eventName || "Event")}</h1>`;

  // Resolve header logo
  const explicitLogoUrl =
    (typeof jsonInput?.event?.logoUrl === "string" && jsonInput.event.logoUrl.trim())
      ? jsonInput.event.logoUrl.trim()
      : (typeof jsonInput?.document?.header?.logo?.url === "string" && jsonInput.document.header.logo.url.trim())
        ? jsonInput.document.header.logo.url.trim()
        : "";

  const profileIdForLogo =
    (snapshots.find(s => s.profileId)?.profileId) ||
    jsonInput?.profileId ||
    "";

  const derivedLogoUrl = profileIdForLogo
    ? makePublicUrl(`logos/${profileIdForLogo}_logotype-footer.png`, bucket)
    : "";

  const logoUrl = explicitLogoUrl || derivedLogoUrl;

  const groupsHtml = renderGroupsHtml(groupsArr);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  :root {
    --bg: #ffffff;
    --ink: #111;
    --muted: #6b7280;
    --accent: #ef4444;
    --ring: rgba(239,68,68,.25);
    --card: #fafafa;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    color: var(--ink);
    background: var(--bg);
  }
  .wrap { width: 100%; margin: 0; padding: 16px; }
  header { padding: 8px 0 16px; }
  .header-row { display: flex; align-items: flex-start; gap: 12px; }
  .header-col { min-width: 0; flex: 1 1 auto; }
  .header-logo { flex: 0 0 auto; margin-left: auto; }
  .header-logo img { max-height: 80px; height: auto; width: auto; display: block; }
  h1 { margin: 0 0 4px; font-size: 1.5rem; line-height: 1.2; }
  .sub { color: var(--muted); font-size: .95rem; }

  /* Accordion styling */
  .accordion.key-info {
    background: var(--card);
    border: 1px solid #eee;
    border-radius: 12px;
    margin: 16px 0 20px;
    padding: 0;
    overflow: hidden;
  }
  .accordion.key-info summary {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    cursor: pointer; list-style: none; padding: 12px 16px; font-weight: 700;
  }
  .accordion.key-info summary::-webkit-details-marker { display: none; }
  .accordion.key-info .acc-body { padding: 12px 16px; border-top: 1px solid #eee; }
  .accordion.key-info .acc-chevron { flex: 0 0 auto; color: var(--muted); transition: transform .18s ease; }
  .accordion.key-info[open] .acc-chevron { transform: rotate(90deg); }

  /* Markdown basics */
  .markdown h1,.markdown h2,.markdown h3,.markdown h4,.markdown h5,.markdown h6{margin:.2em 0 .4em; line-height:1.25}
  .markdown p{margin:.5em 0}
  .markdown ul,.markdown ol{margin:.5em 0 .5em 1.25em; padding-left:1em}
  .markdown li{margin:.25em 0}
  .markdown a{text-decoration:underline; color:inherit}

  /* Group headings */
.group {
  margin: 28px 0;                   /* spacing between groups */
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--group-bg, #fafafa);
  border: 1px solid #e5e7eb;        /* subtle border */
  box-shadow: 0 2px 6px rgba(0,0,0,0.05); /* soft shadow */
}

.group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .04em;
  color: var(--muted);
  text-transform: uppercase;
  margin: 0 0 12px;
}

.group-head::after {
  content: "";
  flex: 1 1 auto;
  height: 1px;
  background: #e5e7eb;
  opacity: .7;
}

  /* Buttons grid */
  .grid{display:grid; grid-template-columns:1fr; gap:12px}
  @media(min-width:560px){ .grid{grid-template-columns:repeat(2,1fr)} }
  @media(min-width:900px){ .grid{grid-template-columns:repeat(3,1fr)} }
  .snap-btn {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 16px; text-decoration:none; border:1px solid #eee;
    border-radius:12px; background:#fff; box-shadow:0 1px 1px rgba(0,0,0,.03);
    transition: transform .06s ease, box-shadow .15s ease, border-color .15s ease;
    color: var(--ink);
  }
  .snap-btn .left{display:flex; align-items:center; gap:0; min-width:0}
  .snap-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(0,0,0,.06); border-color: #e5e7eb; }
  .snap-btn[aria-disabled="true"] { opacity: 0.6; cursor: not-allowed; pointer-events: none; }
  .snap-label { font-weight:600; }
  .chevron { flex-shrink:0; color: var(--accent); }

  footer { color: var(--muted); font-size: .85rem; padding: 16px 0 8px; }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="header-row">
        <div class="header-col">
          ${headerLeftHtml}
        </div>
        <div class="header-logo">
          ${logoUrl
      ? `<img src="${logoUrl}" alt="" decoding="async" referrerpolicy="no-referrer"
                     onerror="this.closest('div').style.display='none'">`
      : ""}
        </div>
      </div>
    </header>

    ${keyInfoSection || ""}

    <main>
      ${groupsHtml || '<div class="sub">No snapshots defined.</div>'}
    </main>

    <footer>
      <div>Generated ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</div>
    </footer>
  </div>
</body>
</html>`;

  // ---------- Write to Storage ----------
  const safeHomeName = "mom.html";
  if (runningEmulated) {
    const htmlDir = path.join(LOCAL_OUTPUT_DIR, "public", safeAppName, safeEventName);
    fs.mkdirSync(htmlDir, { recursive: true });
    fs.writeFileSync(path.join(htmlDir, safeHomeName), Buffer.from(html, "utf8"));
  } else {
    const htmlFile = bucket.file(`public/${safeAppName}/${safeEventName}/${safeHomeName}`);
    await htmlFile.save(Buffer.from(html, "utf8"), {
      metadata: { contentType: "text/html; charset=utf-8", cacheControl: "public, max-age=0, must-revalidate" },
    });
  }
  const homeUrl = makePublicUrl(`public/${safeAppName}/${safeEventName}/${safeHomeName}`, bucket);

  // ---------- Log + return ----------
  const executionTimeSeconds = (Date.now() - startTime) / 1000;

  const snapshotsOut = snapshots.map(s => {
    const htmlUrl = (typeof s.realHtmlUrl === "string" && s.realHtmlUrl.trim())
      ? s.realHtmlUrl.trim()
      : ((typeof s.urlTemp === "string" && s.urlTemp.trim()) ? s.urlTemp.trim() : "");

    const pdfUrl = (typeof s.realPdfUrl === "string" && s.realPdfUrl.trim())
      ? s.realPdfUrl.trim()
      : "";

    return {
      name: String(s.name || "Snapshot name missing"),
      htmlUrl,
      pdfUrl
    };
  });

  await logToGlide({
    timestamp,
    glideAppName,
    filename: safeHomeName,
    htmlUrl: homeUrl,
    userId,
    userEmail,
    profileId,
    success: true,
    type: "MOM",
    message: "MOM page generated",
    executionTimeSeconds,
    runId
  });

  return {
    status: 200,
    body: {
      success: true,
      message: "✅ MOM page generated",
      htmlUrl: homeUrl,
      snapshots: snapshotsOut,
      timestamp,
      executionTimeSeconds,
      runId
    }
  };
}
