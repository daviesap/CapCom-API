// functions/handlers/generateHome.mjs
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";
import { Buffer } from "node:buffer";
import { sanitiseUrl } from "../utils/sanitiseUrl.mjs";

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

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


// We keep using index.js's makePublicUrl via a param to avoid moving that util right now.
// If you prefer, later extract makePublicUrl into utils and import it here instead.
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
  logPdfEvent
}) {
  const safeAppName = sanitiseUrl(req.body?.appName || jsonInput.glideAppName || "App");
  const safeEventName = sanitiseUrl(req.body?.eventName || jsonInput.eventName || "Event");
  const bucket = getStorage().bucket();

  // Sort snapshots by sortOrder (missing sortOrder => Infinity)
  const snapshots = Array.isArray(jsonInput.snapshots) ? [...jsonInput.snapshots] : [];
  snapshots.sort((a, b) => {
    const ao = (typeof a.sortOrder === "number") ? a.sortOrder : Number.POSITIVE_INFINITY;
    const bo = (typeof b.sortOrder === "number") ? b.sortOrder : Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    const at = (a.type || "").toString().toLowerCase();
    const bt = (b.type || "").toString().toLowerCase();
    if (at !== bt) return at.localeCompare(bt);
    const af = (a.filename || "").toString().toLowerCase();
    const bf = (b.filename || "").toString().toLowerCase();
    return af.localeCompare(bf);
  });

  // Split into unfiltered (Master) and filtered views.
  const isFilteredFn = (s) => {
    if (typeof s.isFiltered === "boolean") return s.isFiltered;
    const t = (s.type || "").toString().trim().toLowerCase();
    return t !== "master"; // default inference
  };
  const unfiltered = snapshots.filter(s => !isFilteredFn(s));
  const filtered = snapshots.filter(s => isFilteredFn(s));

  // Helper: group a list of snapshots by type in current order
  function groupByType(list) {
    const out = [];
    let currentType = null;
    let currentItems = [];
    for (const s of list) {
      const t = (s.type || "").toString();
      if (t !== currentType) {
        if (currentItems.length) out.push({ type: currentType, items: currentItems });
        currentType = t;
        currentItems = [];
      }
      currentItems.push(s);
    }
    if (currentItems.length) out.push({ type: currentType, items: currentItems });
    return out;
  }

  // Helper: render groups -> HTML sections with buttons
  function renderGroupsHtml(groupsArr) {
    return groupsArr.map(g => {
      const head = g.type ? `<div class="group-head">${escapeHtml(g.type)}</div>` : "";
      const items = g.items.map(s => {
        const labelRaw = (s.filename || "Snapshot").toString();
        const label = escapeHtml(labelRaw);
        const targetUrl = (typeof s.urlTemp === "string" && s.urlTemp.trim())
          ? s.urlTemp.trim()
          : "";
        const hrefAttr = targetUrl ? ` href="${targetUrl}"` : "";
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

  const unfilteredGroupsHtml = renderGroupsHtml(groupByType(unfiltered));
  const filteredGroupsHtml = renderGroupsHtml(groupByType(filtered));

  // Header/meta
  const title = `${jsonInput.eventName || "Event"} – Home`;
  // Build Key Info using marked + sanitize-html (to match schedule rendering)
  const keyInfoMd =
    (jsonInput?.document?.keyInfo && typeof jsonInput.document.keyInfo === "string")
      ? jsonInput.document.keyInfo
      : (typeof jsonInput?.keyInfo === "string" ? jsonInput.keyInfo : "");

  let keyInfoSection = "";
  if (keyInfoMd) {
    const rawHtml = marked.parse(keyInfoMd, { mangle: false, headerIds: false });
    const safeHtml = sanitizeHtml(rawHtml, {
      allowedTags: [
        "h1","h2","h3","h4","h5","h6",
        "p","strong","em","ul","ol","li",
        "blockquote","code","pre","br","hr","a","span"
      ],
      allowedAttributes: {
        a: ["href","title","target","rel"],
        span: ["class"]
      },
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

  // Support document.header.text for header left content
  const headerLeftHtml = Array.isArray(jsonInput.header)
  ? jsonInput.header.map((line, i) =>
      i === 0
        ? `<h1>${escapeHtml(line)}</h1>`   // first line big
        : `<div class="sub">${escapeHtml(line)}</div>` // others smaller
    ).join("")
  : `<h1>${escapeHtml(jsonInput.eventName || "Event")}</h1>`;

  // Resolve logo for header with sensible fallbacks:
  // 1) jsonInput.logoUrl (explicit)
  // 2) jsonInput.document.header.logo.url
  // 3) derived from profileId -> logos/{profileId}_logotype-footer.png
  const bucketRef = getStorage().bucket();
  const explicitLogoUrl =
    (typeof jsonInput.logoUrl === "string" && jsonInput.logoUrl.trim())
      ? jsonInput.logoUrl.trim()
      : (typeof jsonInput?.document?.header?.logo?.url === "string" && jsonInput.document.header.logo.url.trim())
        ? jsonInput.document.header.logo.url.trim()
        : "";

  const profileIdForLogo =
    (snapshots.find(s => s.profileId)?.profileId) ||
    jsonInput.profileId ||
    "";

  const derivedLogoUrl = profileIdForLogo
    ? makePublicUrl(`logos/${profileIdForLogo}_logotype-footer.png`, bucketRef)
    : "";

  const logoUrl = explicitLogoUrl || derivedLogoUrl;

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
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    color: var(--ink);
    background: var(--bg);
  }
  .wrap {
    width: 100%;
    margin: 0;
    padding: 16px;
  }
  header { padding: 8px 0 16px; }
  .header-row { display: flex; align-items: flex-start; gap: 12px; }
  .header-col { min-width: 0; flex: 1 1 auto; }
  .header-logo { flex: 0 0 auto; margin-left: auto; }
  .header-logo img { max-height: 80px; height: auto; width: auto; display: block; }
  h1 {
    margin: 0 0 4px;
    font-size: 1.5rem;
    line-height: 1.2;
  }
  .sub {
    color: var(--muted);
    font-size: .95rem;
  }
  .key-info {
    background: var(--card);
    border: 1px solid #eee;
    border-radius: 12px;
    padding: 16px;
    margin: 16px 0 20px;
  }
  .key-info p {
    margin: .5em 0;
  }
  /* Accordion treatment for key info */
  .accordion.key-info {
    background: var(--card);
    border: 1px solid #eee;
    border-radius: 12px;
    margin: 16px 0 20px;
    padding: 0; /* we pad summary/body instead */
    overflow: hidden;
  }
  .accordion.key-info summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    cursor: pointer;
    list-style: none;
    padding: 12px 16px;
    font-weight: 700;
  }
  .accordion.key-info summary::-webkit-details-marker { display: none; }
  .accordion.key-info .acc-body {
    padding: 12px 16px;
    border-top: 1px solid #eee;
  }
  .accordion.key-info .acc-chevron {
    flex: 0 0 auto;
    color: var(--muted);
    transition: transform .18s ease;
  }
  .accordion.key-info[open] .acc-chevron {
    transform: rotate(90deg);
  }
  /* Key info readability tweaks (works for both inline block and accordion body) */
  .markdown.key-info,
  .accordion.key-info .acc-body {
    line-height: 1.6;
    font-size: 0.98rem;
  }
  .markdown.key-info h1,
  .markdown.key-info h2,
  .markdown.key-info h3,
  .accordion.key-info .acc-body h1,
  .accordion.key-info .acc-body h2,
  .accordion.key-info .acc-body h3 {
    margin-top: 0.6em;
    margin-bottom: 0.35em;
    font-weight: 700;
  }
  .markdown.key-info h4,
  .markdown.key-info h5,
  .markdown.key-info h6,
  .accordion.key-info .acc-body h4,
  .accordion.key-info .acc-body h5,
  .accordion.key-info .acc-body h6 {
    margin-top: 0.6em;
    margin-bottom: 0.35em;
    font-weight: 600;
  }
  .markdown.key-info ul,
  .markdown.key-info ol,
  .accordion.key-info .acc-body ul,
  .accordion.key-info .acc-body ol {
    margin: 0.4em 0 0.8em 1.25em;
  }
  .markdown.key-info li,
  .accordion.key-info .acc-body li {
    margin: 0.25em 0;
  }
  .markdown.key-info strong,
  .accordion.key-info .acc-body strong {
    font-weight: 700;
  }
  /* Make links readable and consistent */
  .markdown.key-info a,
  .accordion.key-info .acc-body a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .markdown.key-info a:hover,
  .accordion.key-info .acc-body a:hover {
    text-decoration-thickness: 2px;
  }
  /* Special styling for what3words links without requiring authors to add classes */
  .markdown.key-info a[href*="w3w.co"],
  .accordion.key-info .acc-body a[href*="w3w.co"] {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: rgba(59,130,246,0.10); /* blue tint */
    border: 1px solid rgba(59,130,246,0.25);
    border-radius: 6px;
    padding: 0.08em 0.35em;
    text-decoration: none; /* pill looks cleaner */
    white-space: nowrap;
  }
  .markdown.key-info a[href*="w3w.co"]:hover,
  .accordion.key-info .acc-body a[href*="w3w.co"]:hover {
    background: rgba(59,130,246,0.16);
    border-color: rgba(59,130,246,0.35);
  }
  /* Compact horizontal rule for visual breaks users may add */
  .markdown.key-info hr,
  .accordion.key-info .acc-body hr {
    border: 0;
    height: 1px;
    background: #e5e7eb;
    margin: 12px 0;
  }
  /* Markdown basics */
  .markdown h1,.markdown h2,.markdown h3,.markdown h4,.markdown h5,.markdown h6{margin:.2em 0 .4em; line-height:1.25}
  .markdown p{margin:.5em 0}
  .markdown ul,.markdown ol{margin:.5em 0 .5em 1.25em; padding-left:1em}
  .markdown li{margin:.25em 0}
  .markdown a{text-decoration:underline; color:inherit}
  /* Group headings (category blocks) */
  .group{margin: 18px 0 22px;}
  .group-head{
    display:flex; align-items:center; gap:10px;
    font-size:12px; font-weight:700; letter-spacing:.04em;
    color: var(--muted); text-transform: uppercase;
    margin: 6px 0 10px;
  }
  .group-head::after{
    content:""; flex:1 1 auto; height:1px; background:#e5e7eb;
  }
/* Master (full schedule) */
.master-box {
  background: #EFF6FF;   /* subtle blue highlight */
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0 20px;
}

.master-box .group-head {
  color: #3B82F6;        /* accent blue for the section heading */
  font-weight: 600;
}
  .section-title{
    font-size:12px; font-weight:700; letter-spacing:.04em;
    color: var(--muted); text-transform: uppercase;
    margin: 16px 0 6px;
  }
  .filtered-box{
    border:1px solid #FDE68A;  /* amber-300 */
    border-radius:12px;
    background:#FFFBEB;        /* amber-50 */
    padding:16px;
    box-shadow: 0 2px 6px rgba(0,0,0,.04);
  }
  .filtered-box .group-head{
    color:#92400E;             /* amber-800 for title */
    font-weight:600;
  }
  .filtered-box .group{ margin:12px 0 0; }
  /* Buttons grid */
  .grid{display:grid; grid-template-columns:1fr; gap:12px}
  @media(min-width:560px){ .grid{grid-template-columns:repeat(2,1fr)} }
  @media(min-width:900px){ .grid{grid-template-columns:repeat(3,1fr)} }
  .snap-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    text-decoration: none;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 1px 1px rgba(0,0,0,.03);
    transition: transform .06s ease, box-shadow .15s ease, border-color .15s ease;
    color: var(--ink);
  }
  .snap-btn .left{display:flex; align-items:center; gap:0; min-width:0}
  .snap-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(0,0,0,.06);
    border-color: #e5e7eb;
  }
  .snap-label {
    font-weight: 600;
  }
  .subtitle {
    font-size: 0.85rem;
    color: var(--muted);
    margin-left: 8px;
    flex-grow: 1;
  }
  .chevron {
    flex-shrink: 0;
    color: var(--accent);
  }
  footer {
    color: var(--muted);
    font-size: .85rem;
    padding: 16px 0 8px;
  }
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

    <section>
      ${unfilteredGroupsHtml ? `<div class="master-box">${unfilteredGroupsHtml}</div>` : ""}
      ${filtered.length
        ? `
        <div class="section-title">Filtered Views</div>
        <div class="filtered-box">
          ${filteredGroupsHtml}
        </div>`
        : (unfilteredGroupsHtml ? "" : '<div class="sub">No snapshots defined.</div>')
      }
    </section>

    <footer>
      <div>Generated ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</div>
    </footer>
  </div>
</body>
</html>`;

  // Write to Storage
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

  const executionTimeSeconds = (Date.now() - startTime) / 1000;
  await logPdfEvent({
    timestamp,
    glideAppName,
    filename: safeHomeName,
    url: homeUrl,
    userEmail,
    profileId,
    success: true
  });

  return {
    status: 200,
    body: {
      success: true,
      message: "✅ MOM page generated",
      url: homeUrl,
      htmlUrl: homeUrl,
      timestamp,
      executionTimeSeconds
    }
  };
}