/* eslint-env node */
import { readFile } from "fs/promises";
import path from "path";
import process from "node:process";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// Fancy London timestamp like: Wednesday 27th August 2025 at 6.17pm
(function(){
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London'
  }).formatToParts(now);
  const get = (t) => (parts.find(p => p.type === t)?.value || '').trim();
  const dayNum = Number(get('day'));
  const suffix = (n => {
    const v = n % 100; if (v >= 11 && v <= 13) return 'th';
    switch (n % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
  })(dayNum);
  const weekday = get('weekday');
  const month = get('month');
  const year = get('year');
  const hour = get('hour');
  const minute = get('minute');
  const period = get('dayPeriod').toLowerCase().replace(/\./g, '').replace(/\s+/g, ''); // pm/am
  globalThis.__PRETTY_LONDON_TS__ = `${weekday} ${dayNum}${suffix} ${month} ${year} at ${hour}.${minute}${period}`;
})();
const prettyTimestamp = globalThis.__PRETTY_LONDON_TS__;

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
}

function slugify(s) {
  return String(s).trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatValue(v) {
  if (v == null) return "";
  if (Array.isArray(v)) {
    return v.map(x => (x && typeof x === "object"
      ? (x.text ?? x.name ?? x.title ?? x.label ?? x.value ?? JSON.stringify(x))
      : String(x)
    )).join(", ");
  }
  if (typeof v === "object") {
    return (v.text ?? v.name ?? v.title ?? v.label ?? v.value ?? JSON.stringify(v));
  }
  return String(v);
}

function renderLogo(logo = {}) {
  const url = logo?.url;
  if (!url) return ""; // nothing to render

  // Avoid breaking the attribute if quotes exist in the URL
  const safeUrl = String(url).replace(/"/g, "%22");

  // onerror hides the container so no broken icon or gap is shown
  return `
    <img src="${safeUrl}" alt=""
         decoding="async" referrerpolicy="no-referrer"
         onerror="this.closest('div').style.display='none'">
  `;
}

export async function generateHtmlString(jsonInput, { pdfUrl } = {}) {
  const title = jsonInput?.document?.title || jsonInput?.eventName || "Schedule";

  // Build subtitle block: include document.subtitle and each line of document.header.text on its own line
  const headerTextArr = Array.isArray(jsonInput?.document?.header?.text)
    ? jsonInput.document.header.text
    : [];
  const headerTextHtml = headerTextArr.map(escapeHtml).join("<br/>");

  const subtitleRaw = jsonInput?.document?.subtitle || "";
  const subtitleEsc = subtitleRaw ? escapeHtml(subtitleRaw) : "";

  // Combine (skip empties), preserving <br/> between parts
  //const subtitleBlock = [subtitleEsc, headerTextHtml].filter(Boolean).join("<br/>");
    var subtitleBlock = [subtitleEsc, headerTextHtml].filter(Boolean).join("<br/>");
  subtitleBlock = subtitleBlock + `<br/><span class="asAtDate">As at ${prettyTimestamp}</span>`;

  // Optional right-aligned external logo (disappears if URL fails)
  const logoHtml = renderLogo(jsonInput?.document?.header?.logo);

  // Wrap subtitle/header text (left) with logo (right) as a single block
  const subtitleWithLogo = `
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="min-width:0; flex:1 1 auto;">${subtitleBlock}</div>
      <div class="header-logo">${logoHtml}</div>
    </div>
  `;

  // Optional Markdown "keyInfo" block to show below the header and above groups
  const keyInfoMd =
    (jsonInput?.document?.keyInfo && typeof jsonInput.document.keyInfo === "string")
      ? jsonInput.document.keyInfo
      : (typeof jsonInput?.keyInfo === "string" ? jsonInput.keyInfo : "");

  let keyInfoBlock = "";
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
          attribs: {
            ...attribs,
            target: "_blank",
            rel: "noopener"
          }
        })
      }
    });

    keyInfoBlock = `<section class="markdown key-info">${safeHtml}</section>`;
  }

  const groups = Array.isArray(jsonInput.groups) ? jsonInput.groups : [];

  // Required local assets (no fallbacks)
  const cssPath = path.resolve(process.cwd(), "htmlutils/schedule.css");
  const tplPath = path.resolve(process.cwd(), "htmlutils/template.html");
  const [css, tpl] = await Promise.all([
    readFile(cssPath, "utf-8"),
    readFile(tplPath, "utf-8"),
  ]);

  // Footer may be a string or { footer: { text } }
  const footerText = (typeof jsonInput?.document?.footer === "string")
    ? jsonInput.document.footer
    : (jsonInput?.document?.footer?.text || "");

  const pdfIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:6px;">
  <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm8 1.5V8h4.5L14 3.5zM8 13h2.5a1.5 1.5 0 0 0 0-3H8v3zm0 5h1v-3H8v3zm3-5h1.5a2.5 2.5 0 0 0 0-5H11v5zm3 5h1v-8h-1v8z"/>
</svg>`;
  const downloadBlock = pdfUrl
    ? `<div class="download"><a href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener">${pdfIcon}Download PDF</a></div>`
    : "";
  // Columns: respect profile columns; ignore detectedFields when columns exist
  let columnKeys = [];
  let columnHeaders = [];
  let showHeader = true;

if (Array.isArray(jsonInput.columns) && jsonInput.columns.length) {
  const cols = jsonInput.columns;
  columnKeys = cols.map(c => (c.field ?? c.key)).filter(Boolean);
  columnHeaders = cols.map(c => (c.label ?? c.title ?? c.field ?? c.key ?? ""));
  // Track per-column "showLabel" strictly as true; anything else = hidden
  const columnShow = cols.map(c => c?.showLabel === true);
  // Only render the header row if at least one column explicitly wants a label
  showHeader = columnShow.some(Boolean);
  // Persist per-column flags for later when building thead cells
  var __columnShowFlags = columnShow;
} else if (Array.isArray(jsonInput.detectedFields) && jsonInput.detectedFields.length) {
    // Only used when profile columns are absent
    columnKeys = jsonInput.detectedFields.slice();
    columnHeaders = jsonInput.detectedFields.map(k => k.charAt(0).toUpperCase() + k.slice(1));
    showHeader = true;
  } else {
    columnKeys = ["date", "time", "description", "locations", "tags"];
    columnHeaders = ["Date", "Time", "Description", "Locations", "Tags"];
    showHeader = true;
  }

  // Percent-based widths derived from PDF widths (keeps columns aligned; HTML-only)
  const pdfWidths = (jsonInput.columns || []).map(c => Number(c.width) || 0);
  const totalPdfWidth = pdfWidths.reduce((a, b) => a + b, 0) || 1;
  const htmlWidths = pdfWidths.map(w => (w / totalPdfWidth) * 100);

  const groupsHtml = groups.map(g => {
    const rows = Array.isArray(g.entries) ? g.entries : [];

    const headerHtml = (showHeader && columnHeaders.length)
      ? `<tr>${columnHeaders.map((h, i) => {
        const w = htmlWidths[i];
        const widthAttr = Number.isFinite(w) ? ` style="width:${w.toFixed(4)}%"` : "";
        const showThis = (typeof __columnShowFlags !== "undefined") ? __columnShowFlags[i] : true;
        const cellText = showThis ? escapeHtml(h) : "";
        return `<th${widthAttr}>${cellText}</th>`;
      }).join("")}</tr>`
      : "";

    const rowsHtml = rows.map(r => {
      const data = (r && typeof r === "object") ? (r.fields ?? r.rows ?? r) : {};

      // Determine row class from format/status
      const fmtRaw = r && (r.format ?? r.style ?? r.status);
      const fmt = typeof fmtRaw === 'string' ? fmtRaw.toLowerCase() : 'default';
      const classMap = {
        default: 'row-default',
        new: 'row-new',
        important: 'row-important',
        past: 'row-past',
      };
      const rowClassName = classMap[fmt] || 'row-default';

      // Build cells; append NEW pill to description when row is "new"
      const cells = columnKeys.map((k, i) => {
        const w = htmlWidths[i];
        const widthAttr = Number.isFinite(w) ? ` style="width:${w.toFixed(4)}%"` : "";
        const value = formatValue(data?.[k]);
        const safe = escapeHtml(value);
        const withBadge = (rowClassName === 'row-new' && k === 'description')
          ? `${safe} <span class="badge">NEW</span>`
          : safe;
        return `<td${widthAttr}>${withBadge}</td>`;
      }).join("");

      return `<tr class="${rowClassName}">${cells}</tr>`;
    }).join("");

    return `
      <section class="group">
        <div class="group-title">${escapeHtml(g.title || "")}</div>
        ${g.metadata ? `<div class="group-metadata">${escapeHtml(g.metadata)}</div>` : ""}
        <table>
          <thead>${headerHtml}</thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </section>
    `;
  }).join("");

  const groupsHtmlFinal = keyInfoBlock ? `${keyInfoBlock}\n${groupsHtml}` : groupsHtml;

  // Optional debug panel
  let debugBlock = "";
  if (jsonInput.debug === true) {
    const firstG = groups.find(x => Array.isArray(x.entries) && x.entries.length) || {};
    const firstE = firstG.entries ? firstG.entries[0] : {};
    const sample = firstE && typeof firstE === "object" ? (firstE.fields ?? firstE.rows ?? firstE) : {};
    debugBlock = `
      <section style="background:#fff3cd;border:1px solid #ffeeba;padding:12px;margin:12px 0;font-size:12px;">
        <strong>DEBUG</strong><br/>
        Column keys: ${escapeHtml(JSON.stringify(columnKeys))}<br/>
        Column headers: ${escapeHtml(JSON.stringify(columnHeaders))}<br/>
        First entry keys: ${escapeHtml(JSON.stringify(Object.keys(sample)))}
      </section>`;
  }

  // Fill template placeholders (kept simple & explicit)
  const html = tpl
    .replaceAll("{{CSS}}", css)
    .replaceAll("{{TITLE}}", escapeHtml(title))
    .replaceAll("{{SUBTITLE}}", subtitleWithLogo)
    .replaceAll("{{DOWNLOAD}}", downloadBlock)
    .replaceAll("{{DEBUG}}", debugBlock)
    .replaceAll("{{GROUPS}}", groupsHtmlFinal)
    .replaceAll("{{FOOTER}}", escapeHtml(footerText));

  const baseName = jsonInput?.document?.filename || jsonInput?.eventName || title || "schedule";
  return { htmlString: html, htmlFilenameBase: slugify(baseName) };
}