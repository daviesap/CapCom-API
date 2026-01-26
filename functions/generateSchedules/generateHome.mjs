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
  const showKeyInfo = (() => {
    const v = jsonInput?.event?.momKeyInfo;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const normalised = v.trim().toLowerCase();
      if (normalised === "true") return true;
      if (normalised === "false") return false;
    }
    return false;
  })();

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

  // Key People (grouped by company)
  let keyPeopleSection = "";

  if (showKeyInfo && Array.isArray(jsonInput?.event?.keyPeople) && jsonInput.event.keyPeople.length) {
    const companyItems = jsonInput.event.keyPeople
      .map((company, index) => ({
        name: company?.company,
        sortOrder: Number.isFinite(Number(company?.CompanySortOrder)) ? Number(company.CompanySortOrder) : 0,
        people: Array.isArray(company?.people) ? company.people : [],
        index,
      }))
      .filter((company) => company.name && String(company.name).trim())
      .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.index - b.index));

    if (companyItems.length) {
      const companiesHtml = companyItems.map((company) => {
        const peopleItems = company.people
          .map((person, personIndex) => ({
            name: person?.name,
            role: person?.role,
            sortOrder: Number.isFinite(Number(person?.sortOrder)) ? Number(person.sortOrder) : 0,
            index: personIndex,
          }))
          .filter((person) => person.name && String(person.name).trim())
          .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.index - b.index));

        const peopleHtml = peopleItems.length
          ? `<ul class="key-people-list">${peopleItems
            .map((person) => {
              const role = person.role && String(person.role).trim()
                ? ` <span class="key-people-role">– ${escapeHtml(String(person.role))}</span>`
                : "";
              return `<li>${escapeHtml(person.name)}${role}</li>`;
            })
            .join("")}</ul>`
          : `<div class="key-people-empty">No contacts listed.</div>`;

        return `
          <div class="key-people-item">
            <h4>${escapeHtml(company.name)}</h4>
            ${peopleHtml}
          </div>
        `;
      }).join("");

      keyPeopleSection = `
      <details class="accordion key-info key-people">
        <summary>
          <span>Key people</span>
          <svg class="acc-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </summary>
        <div class="acc-body">
          ${companiesHtml}
        </div>
      </details>`;
    }
  }

  // Key Info (Markdown -> HTML, sanitized)
  let keyInfoSection = "";
  const keyInfoSanitizeOptions = {
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
  };

  const renderMarkdownSafe = (markdownText) => {
    const rawHtml = marked.parse(markdownText, { mangle: false, headerIds: false });
    return sanitizeHtml(rawHtml, keyInfoSanitizeOptions);
  };

  if (showKeyInfo && Array.isArray(jsonInput?.event?.keyInfo) && jsonInput.event.keyInfo.length) {
    const keyInfoItems = jsonInput.event.keyInfo
      .map((item, index) => ({
        title: item?.title,
        text: item?.text,
        sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : 0,
        index
      }))
      .filter((item) => (item.title && String(item.title).trim()) || (item.text && String(item.text).trim()))
      .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.index - b.index));

    if (keyInfoItems.length) {
      const itemsHtml = keyInfoItems.map((item) => {
        const titleHtml = item.title ? `<h4>${escapeHtml(item.title)}</h4>` : "";
        const textHtml = item.text ? renderMarkdownSafe(String(item.text)) : "";
        return `
          <div class="key-info-item">
            ${titleHtml}
            <div class="markdown">${textHtml}</div>
          </div>
        `;
      }).join("");

      keyInfoSection = `
      <details class="accordion key-info">
        <summary>
          <span>Key info</span>
          <svg class="acc-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </summary>
        <div class="acc-body">
          ${itemsHtml}
        </div>
      </details>`;
    }
  } else if (showKeyInfo && typeof jsonInput?.event?.keyInfo === "string" && jsonInput?.event?.keyInfo.trim().length) {
    const safeHtml = renderMarkdownSafe(jsonInput.event.keyInfo);
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
    --bg: #f5f6f8;
    --ink: #1b1d21;
    --muted: #6b7280;
    --accent: #2563eb;
    --ring: rgba(37, 99, 235, 0.18);
    --card: #ffffff;
    --card-alt: #f9fafb;
    --border: #e2e5ec;
    --shadow: rgba(15, 23, 42, 0.06);
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
  h1 { margin: 0 0 4px; font-size: 1.5rem; line-height: 1.2; color: var(--ink); }
  .sub { color: var(--muted); font-size: .95rem; }

  /* Accordion styling */
  .accordion.key-info,
  .accordion.key-people {
    background: var(--card-alt);
    border: 1px solid var(--border);
    border-radius: 12px;
    margin: 16px 0 20px;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 10px 26px var(--shadow);
  }
  .accordion.key-info summary,
  .accordion.key-people summary {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    cursor: pointer; list-style: none; padding: 12px 16px; font-weight: 600;
    color: var(--ink);
  }
  .accordion.key-info summary::-webkit-details-marker,
  .accordion.key-people summary::-webkit-details-marker { display: none; }
  .accordion.key-info .acc-body,
  .accordion.key-people .acc-body { padding: 12px 16px; border-top: 1px solid var(--border); background: var(--card); }
  .accordion.key-info .acc-chevron,
  .accordion.key-people .acc-chevron { flex: 0 0 auto; color: var(--accent); transition: transform .18s ease; }
  .accordion.key-info[open] .acc-chevron,
  .accordion.key-people[open] .acc-chevron { transform: rotate(90deg); }
  .accordion.key-people .key-people-item + .key-people-item{
    margin-top:12px; padding-top:12px; border-top:1px solid var(--border);
  }
  .accordion.key-people .key-people-item h4{
    margin:0 0 6px; font-size:1rem; color:var(--ink);
  }
  .accordion.key-people .key-people-list{
    margin:0; padding-left:18px; display:grid; gap:4px;
  }
  .accordion.key-people .key-people-list li{ margin:0; }
  .accordion.key-people .key-people-role{ color:var(--muted); font-size:.95em; }
  .accordion.key-people .key-people-empty{
    color:var(--muted); font-size:.92rem;
  }

  /* Markdown basics */
  .markdown h1,.markdown h2,.markdown h3,.markdown h4,.markdown h5,.markdown h6{margin:.2em 0 .4em; line-height:1.25}
  .markdown p{margin:.5em 0}
  .markdown ul,.markdown ol{margin:.5em 0 .5em 1.25em; padding-left:1em}
  .markdown li{margin:.25em 0}
  .markdown a{text-decoration:underline; color:inherit}

  /* Group headings */
  .group {
    margin: 28px 0;
    padding: 18px 22px;
    border-radius: 14px;
    background: var(--card);
    border: 1px solid var(--border);
    box-shadow: 0 12px 28px var(--shadow);
  }

.group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .08em;
  color: var(--accent);
  text-transform: uppercase;
  margin: 0 0 12px;
}

  .group-head::after {
    content: "";
    flex: 1 1 auto;
    height: 1px;
    background: var(--border);
    opacity: .7;
  }

  /* Buttons grid */
  .grid{display:grid; grid-template-columns:1fr; gap:12px}
  @media(min-width:560px){ .grid{grid-template-columns:repeat(2,1fr)} }
  @media(min-width:900px){ .grid{grid-template-columns:repeat(3,1fr)} }
  .snap-btn {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 18px; text-decoration:none; border:1px solid var(--border);
    border-radius:12px; background:var(--card-alt); box-shadow:0 6px 18px var(--shadow);
    transition: transform .12s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
    color: var(--ink);
  }
  .snap-btn .left{display:flex; align-items:center; gap:0; min-width:0}
  .snap-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
    border-color: rgba(37, 99, 235, 0.32);
    background: #eef2ff;
  }
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

    ${keyPeopleSection || ""}
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
