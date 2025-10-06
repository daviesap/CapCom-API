/**
 * generateHtmlv2.mjs
 *
 * Purpose
 * -------
 * Render a grouped schedule JSON into a fully styled **HTML page** using a template + CSS.
 * This is the v2 HTML renderer that pairs with generatepdfv2.mjs.
 *
 * Expected input (jsonInput):
 * - event.header: array of strings (required in v2)
 * - event.logoUrl: optional logo URL
 * - columns: ordered array { field, label, width, showLabel }
 * - groups: array of { title, metadata?, entries: [{ fields: {...}, format? }] }
 * - event.keyInfo: optional markdown string (rendered into an accordion block)
 * - document.footer: optional plain string
 *
 * What this module does:
 * 1) Builds a human-friendly timestamp (London TZ) for “As at …” and footer.
 * 2) Escapes HTML safely for all header, group, and row content.
 * 3) Renders:
 *    - Header (text lines + timestamp, plus optional logo)
 *    - Key Info accordion if present (Markdown → safe HTML)
 *    - Groups as <section> elements, each with title, optional metadata, and a table
 *      built from `columns` (show/hide headers, widths preserved proportionally).
 *    - Each entry row styled by format (“default”, “new”, “important”, “past”).
 *    - An optional Download PDF link if pdfUrl is provided.
 *    - A footer with document name, generated timestamp, and Capcom credit link.
 * 4) Loads CSS from `htmlutils/schedule.css` and base template from `htmlutils/template.html`,
 *    injecting extra CSS for the Key Info accordion.
 *
 * Returns:
 * - { htmlString, htmlFilenameBase } where htmlString is the full HTML page,
 *   and htmlFilenameBase is a slugified filename base.
 */
/* eslint-env node */
import { readFile } from "fs/promises";
import path from "path";
import process from "node:process";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// Fancy London timestamp like: Wednesday 27th August 2025 at 6.17pm
(function () {
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
  const period = get('dayPeriod').toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  globalThis.__PRETTY_LONDON_TS__ = `${weekday} ${dayNum}${suffix} ${month} ${year} at ${hour}.${minute}${period}`;
})();
const prettyTimestamp = globalThis.__PRETTY_LONDON_TS__;

// --- helpers ---
const escapeHtml = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;").replaceAll("'", "&#39;");

const slugify = (s) =>
  String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function renderLogo(logo = {}) {
  const url = logo?.url;
  if (!url) return "";
  const safeUrl = String(url).replace(/"/g, "%22");
  return `
    <img src="${safeUrl}" alt=""
         decoding="async" referrerpolicy="no-referrer"
         onerror="this.closest('div').style.display='none'">
  `;
}

function formatCell(v) {
  if (Array.isArray(v)) return v.join(", ");
  return v == null ? "" : String(v);
}

export async function generateHtmlString(jsonInput, { pdfUrl } = {}) {
  // Assumptions (by design):
  // - jsonInput.header is an array of strings (root-level, required in v2)
  // - Logo may come from jsonInput.document.header.logo OR jsonInput.logoUrl (optional)
  // - jsonInput.columns is an ordered array with { field, label, width, showLabel }
  // - jsonInput.groups is an array of { title, metadata?, entries: [{ fields: {...}, format? }] }
  // - jsonInput.keyInfo is markdown (string) (optional)
  // - jsonInput.document.footer is a plain string (optional)
  // - All values already validated/sanitized upstream where needed

  // Header lines (v2: event.header array). Fallback to empty array if not present.
  const headerLines = Array.isArray(jsonInput?.event?.header)
    ? jsonInput.event.header
    : [];

  const title = jsonInput?.document?.filename|| "Schedule";

  // Header (left: text lines + “As at…”, right: logo)
  const headerTextHtml = headerLines.map(escapeHtml).join("<br/>");
  const subtitleBlock =`${headerTextHtml}<br/>${title}<br/><span class="asAtDate">As at ${prettyTimestamp}</span>`;
  const logoSource = jsonInput?.event?.logoUrl ? { url: jsonInput.event.logoUrl } : null;
  const logoHtml = renderLogo(logoSource);
  const subtitleWithLogo = `
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="min-width:0; flex:1 1 auto;">${subtitleBlock}</div>
      <div class="header-logo">${logoHtml}</div>
    </div>
  `;

  // Optional Key Info accordion (markdown -> safe HTML)
  let keyInfoBlock = "";

  if (typeof jsonInput?.event?.keyInfo === "string" && jsonInput?.event?.keyInfo.trim().length) {
    const rawHtml = marked.parse(jsonInput.event.keyInfo, { mangle: false, headerIds: false });
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

    keyInfoBlock = `
    <details class="accordion key-info">
      <summary>
        <span>Key info</span>
        <svg class="acc-chevron" xmlns="http://www.w3.org/2000/svg" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
             width="18" height="18" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </summary>
      <div class="acc-body markdown">
        ${safeHtml}
      </div>
    </details>`;
  }

  // Columns & widths (assumed present)
  const cols = Array.isArray(jsonInput.columns) ? jsonInput.columns : [];
  const columnKeys = cols.map(c => c.field);
  const columnHeaders = cols.map(c => (c.label ?? ""));
  const showHeader = cols.some(c => c.showLabel === true);
  const showFlags = cols.map(c => c.showLabel === true);
  const pdfWidths = cols.map(c => Number(c.width) || 0);
  const totalPdfWidth = pdfWidths.reduce((a, b) => a + b, 0) || 1;
  const htmlWidths = pdfWidths.map(w => (w / totalPdfWidth) * 100);

  const groupsArr = Array.isArray(jsonInput.groups) ? jsonInput.groups : [];

  // Build groups → tables
  const groupsHtml = groupsArr.map(g => {
    const groupHeading = escapeHtml(g.title ?? g.rawKey ?? "");
    const headerHtml = showHeader
      ? `<tr>${columnHeaders.map((h, i) => {
        const w = htmlWidths[i];
        const widthAttr = ` style="width:${w.toFixed(4)}%"`;
        const cellText = showFlags[i] ? escapeHtml(h) : "";
        return `<th${widthAttr}>${cellText}</th>`;
      }).join("")}</tr>`
      : "";

    const rowsHtml = g.entries.map(r => {
      const data = r.fields;
      const fmt = typeof r.format === "string" ? r.format.toLowerCase() : "default";
      const classMap = { default: "row-default", new: "row-new", important: "row-important", past: "row-past" };
      const rowClassName = classMap[fmt] || "row-default";

      const tds = columnKeys.map((k, i) => {
        const w = htmlWidths[i];
        const widthAttr = ` style="width:${w.toFixed(4)}%"`;
        const val = formatCell(data[k]);
        const safe = escapeHtml(val);
        const withBadge =
          (rowClassName === "row-new" && k === "description")
            ? `${safe} <span class="badge">NEW</span>`
            : safe;
        return `<td${widthAttr}>${withBadge}</td>`;
      }).join("");

      return `<tr class="${rowClassName}">${tds}</tr>`;
    }).join("");

    return `
      <section class="group">
        <div class="group-title">${groupHeading}</div>
        ${g.metadata ? `<div class="group-metadata">${escapeHtml(g.metadata)}</div>` : ""}
        <table>
          <thead>${headerHtml}</thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </section>
    `;
  }).join("");

  // CSS + template (local assets)
  const cssPath = path.resolve(process.cwd(), "htmlutils/schedule.css");
  const tplPath = path.resolve(process.cwd(), "htmlutils/template.html");
  const [css, tpl] = await Promise.all([
    readFile(cssPath, "utf-8"),
    readFile(tplPath, "utf-8"),
  ]);

  // Small, injected CSS for the accordion
  const cssExtra = `
  /* --- Key Info Accordion (injected by generateHtmlv2.mjs) --- */
  .accordion.key-info{
    background:#fafafa; border:1px solid #d1d5db; border-radius:8px;
    margin:16px 0 20px; padding:0; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.08);
  }
  .accordion.key-info summary{
    display:flex; align-items:center; justify-content:space-between;
    gap:8px; cursor:pointer; list-style:none; padding:12px 16px; font-weight:700;
    font-size:.95rem; color:#1F2937; background:#E0F2FE; border-bottom:1px solid #93C5FD;
  }
  .accordion.key-info summary::-webkit-details-marker{ display:none; }
  .accordion.key-info .acc-body{ padding:12px 16px; border-top:1px solid #eee; }
  .accordion.key-info[open] .acc-body{
    background:#F8FAFC; box-shadow: inset 3px 0 0 #3B82F6;
  }
  .accordion.key-info .acc-chevron{ flex:0 0 auto; color:#3B82F6; transition: transform .18s ease; }
  .accordion.key-info .acc-body{ line-height:1.6; font-size:.98rem; }
  .accordion.key-info .acc-body a[href*="w3w.co"]{
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: rgba(59,130,246,0.10); border:1px solid rgba(59,130,246,0.25);
    border-radius:6px; padding:.08em .35em; text-decoration:none; white-space:nowrap;
  }
  .accordion.key-info .acc-body a[href*="w3w.co"]:hover{
    background: rgba(59,130,246,0.16); border-color: rgba(59,130,246,0.35);
  }
  `;

  // Download link (optional)
  const pdfIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:6px;"><path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm8 1.5V8h4.5L14 3.5zM8 13h2.5a1.5 1.5 0 0 0 0-3H8v3zm0 5h1v-3H8v3zm3-5h1.5a2.5 2.5 0 0 0 0-5H11v5zm3 5h1v-8h-1v8z"/></svg>`;
  const downloadBlock = pdfUrl
    ? `<div class="download"><a href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener">${pdfIcon}Download PDF</a></div>`
    : "";

  // Footer content (always shown at the very bottom)
  const baseName = jsonInput?.document?.filename || jsonInput?.event?.eventName || title || "schedule";
  const footerHtml = `
    <div class="footer">
      <div>${escapeHtml(baseName)}</div>
      <div>Document generated at ${escapeHtml(prettyTimestamp)}</div>
      <div>CapCom – <a href="https://www.capcom.london" target="_blank" rel="noopener">https://www.capcom.london</a></div>
    </div>
  `;

  // Template fill
  const html = tpl
    .replaceAll("{{CSS}}", css + "\n" + cssExtra)
    .replaceAll("{{TITLE}}", escapeHtml(title))
    .replaceAll("{{SUBTITLE}}", subtitleWithLogo)
    .replaceAll("{{DOWNLOAD}}", downloadBlock)
    .replaceAll("{{DEBUG}}", "") // no debug in v2
    .replaceAll("{{GROUPS}}", (keyInfoBlock ? `${keyInfoBlock}\n` : "") + groupsHtml)
    .replaceAll("{{FOOTER}}", footerHtml);

  return { htmlString: html, htmlFilenameBase: slugify(baseName) };
}