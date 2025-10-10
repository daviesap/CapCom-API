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

  const filterableColumnsMap = new Map();
  cols.forEach((col, index) => {
    if (!col || typeof col.field !== "string") return;
    const fieldName = col.field.trim();
    if (!fieldName) return;
    const lower = fieldName.toLowerCase();
    if (lower !== "tags" && lower !== "locations") return;
    if (filterableColumnsMap.has(fieldName)) return;
    const attrSlug = fieldName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `field-${index}`;
    filterableColumnsMap.set(fieldName, {
      field: fieldName,
      label: col.label ?? fieldName,
      attrName: `filter-${attrSlug}`,
      values: new Set(),
    });
  });
  const filterableColumns = Array.from(filterableColumnsMap.values());

  const findFilterByField = (field) =>
    filterableColumns.find(col => col.field?.toLowerCase() === field);
  const tagsFilterCol = findFilterByField("tags");
  const locationsFilterCol = findFilterByField("locations");

  if (locationsFilterCol) {
    locationsFilterCol.label = "Locations";
  }
  if (tagsFilterCol && !locationsFilterCol) {
    tagsFilterCol.label = "Locations";
  }

  const groupsArr = Array.isArray(jsonInput.groups) ? jsonInput.groups : [];
  let totalRowCount = 0;

  // Build groups → tables
  const groupsHtml = groupsArr.map(g => {
    const entries = Array.isArray(g.entries) ? g.entries : [];
    totalRowCount += entries.length;
    const groupHeading = escapeHtml(g.title ?? g.rawKey ?? "");
    const headerHtml = showHeader
      ? `<tr>${columnHeaders.map((h, i) => {
        const w = htmlWidths[i];
        const widthAttr = ` style="width:${w.toFixed(4)}%"`;
        const cellText = showFlags[i] ? escapeHtml(h) : "";
        return `<th${widthAttr}>${cellText}</th>`;
      }).join("")}</tr>`
      : "";

    const rowsHtml = entries.map(r => {
      const data = r.fields;
      const fmt = typeof r.format === "string" ? r.format.toLowerCase() : "default";
      const classMap = { default: "row-default", new: "row-new", important: "row-important", past: "row-past" };
      const rowClassName = classMap[fmt] || "row-default";

      const rowFilterAttrParts = [];
      for (const filterCol of filterableColumns) {
        const rawValue = data?.[filterCol.field];
        const tokens = Array.isArray(rawValue)
          ? rawValue.map(v => String(v).trim())
          : typeof rawValue === "string"
            ? String(rawValue).split(",").map(v => v.trim())
            : [];
        const cleanedTokens = tokens.filter(Boolean);
        if (cleanedTokens.length) {
          cleanedTokens.forEach(token => filterCol.values.add(token));
          const normalised = cleanedTokens.map(token => token.toLowerCase());
          rowFilterAttrParts.push(` data-${filterCol.attrName}="${escapeHtml(normalised.join("||"))}"`);
        } else {
          rowFilterAttrParts.push(` data-${filterCol.attrName}=""`);
        }
      }
      const rowDataAttrs = rowFilterAttrParts.join("");

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

      return `<tr class="${rowClassName}"${rowDataAttrs}>${tds}</tr>`;
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

  const filterControlsConfig = (() => {
    if (!totalRowCount) return null;

    const controlBlocks = filterableColumns.map(filterCol => {
      const sortedValues = Array.from(filterCol.values).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
      const options = [
        `<option value="">All ${escapeHtml(filterCol.label)}</option>`,
        ...sortedValues.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
      ].join("");
      return `
<label class="filter">
  <span class="filter-label">${escapeHtml(filterCol.label)}</span>
  <select data-filter-target="${escapeHtml(filterCol.attrName)}">
    ${options}
  </select>
</label>`.trim();
    });

    controlBlocks.push(`
<label class="filter filter-search">
  <span class="filter-label">Search</span>
  <input type="search" placeholder="Search rows" data-filter-text>
</label>`.trim());

    const controlsMarkup = controlBlocks.filter(Boolean).join("\n");
    if (!controlsMarkup) return null;

    const controlsBlock = controlsMarkup
      .split("\n")
      .map(line => (line.trim().length ? `    ${line}` : line))
      .join("\n");

    const panelMarkup = `
<details class="filters-accordion" data-filters-container open>
  <summary class="filters-summary">
    <span class="filters-summary-icon" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" focusable="false">
        <path d="M3 5.25A.75.75 0 0 1 3.75 4.5h16.5a.75.75 0 0 1 .53 1.28l-6.78 6.77v5.82a.75.75 0 0 1-1.12.66l-3-1.8a.75.75 0 0 1-.38-.66v-4.02L3.22 5.78A.75.75 0 0 1 3 5.25Z" fill="currentColor" />
      </svg>
    </span>
    <span class="filters-summary-label" data-filters-summary-label>Hide filters</span>
    <svg class="filters-summary-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </summary>
  <div class="filters" id="filters-panel" data-filters-panel>
${controlsBlock}
  </div>
</details>`.trim();

    const scriptBlock = `
<script>
(function(){
  function initFilters(){
    const panel = document.querySelector('[data-filters-panel]');
    const container = panel ? panel.closest('[data-filters-container]') : null;
    if (!panel) {
      if (container) container.style.display = 'none';
      return;
    }
    const selects = panel.querySelectorAll('select[data-filter-target]');
    const searchBox = panel.querySelector('[data-filter-text]');
    if (!selects.length && !searchBox) {
      if (container) container.style.display = 'none';
      return;
    }
    const normalise = (value) => String(value || "").trim().toLowerCase();
    const labelEl = container ? container.querySelector('[data-filters-summary-label]') : null;

    function applyFilters() {
      const rows = Array.from(document.querySelectorAll('section.group tbody tr'));
      if (!rows.length) return;
      const searchValue = searchBox ? normalise(searchBox.value) : "";
      rows.forEach(row => {
        let visible = true;
        selects.forEach(select => {
          if (!visible) return;
          const selected = normalise(select.value);
          if (!selected) return;
          const target = select.dataset.filterTarget;
          const attr = row.getAttribute('data-' + target);
          if (!attr) {
            visible = false;
            return;
          }
          const tokens = attr.split('||').filter(Boolean);
          if (!tokens.includes(selected)) {
            visible = false;
          }
        });
        if (visible && searchValue) {
          visible = row.textContent.toLowerCase().includes(searchValue);
        }
        row.hidden = !visible;
      });
    }

    selects.forEach(select => select.addEventListener('change', applyFilters));
    if (searchBox) searchBox.addEventListener('input', applyFilters);

    function updateToggleState() {
      if (!container) return;
      const isOpen = container.hasAttribute('open');
      if (labelEl) {
        labelEl.textContent = isOpen ? 'Hide filters' : 'Show filters';
      }
      container.classList.toggle('filters-accordion-collapsed', !isOpen);
    }

    if (container) {
      container.addEventListener('toggle', updateToggleState);
      updateToggleState();
    }

    applyFilters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFilters);
  } else {
    initFilters();
  }
})();
</script>`.trim();

    return { panelMarkup, scriptBlock };
  })();

  const filterToggleHtml = "";
  const filterControlsHtml = filterControlsConfig
    ? [filterControlsConfig.panelMarkup, filterControlsConfig.scriptBlock].filter(Boolean).join("\n")
    : "";

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
    background:var(--card-alt); border:1px solid var(--border); border-radius:12px;
    margin:16px 0 20px; padding:0; overflow:hidden; box-shadow:0 10px 26px var(--shadow);
  }
  .accordion.key-info summary{
    display:flex; align-items:center; justify-content:space-between;
    gap:8px; cursor:pointer; list-style:none; padding:12px 18px; font-weight:600;
    font-size:.95rem; color:var(--header); background:#eef2ff; border-bottom:1px solid rgba(37,99,235,0.18);
  }
  .accordion.key-info summary::-webkit-details-marker{ display:none; }
  .accordion.key-info .acc-body{ padding:14px 18px; border-top:1px solid var(--border); background:var(--card); }
  .accordion.key-info[open] .acc-body{
    background:#e0e7ff; box-shadow: inset 3px 0 0 rgba(37,99,235,0.35);
  }
  .accordion.key-info .acc-chevron{ flex:0 0 auto; color:var(--accent); transition: transform .18s ease; }
  .accordion.key-info .acc-body{ line-height:1.6; font-size:.98rem; color:var(--text); }
  .accordion.key-info .acc-body a[href*="w3w.co"]{
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: rgba(37,99,235,0.1); border:1px solid rgba(37,99,235,0.22);
    border-radius:6px; padding:.08em .35em; text-decoration:none; white-space:nowrap;
  }
  .accordion.key-info .acc-body a[href*="w3w.co"]:hover{
    background: rgba(37,99,235,0.16); border-color: rgba(37,99,235,0.32);
  }
  `;

  // Download link (optional)
  const pdfIcon = `<svg class="utility-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>`;
  const homeButtonHtml = `<a class="utility-btn" href="mom.html"><span aria-hidden="true">←</span><span>Back to MOM overview</span></a>`;
  const downloadButtonHtml = pdfUrl
    ? `<a class="utility-btn" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener">${pdfIcon}<span>Download PDF</span></a>`
    : "";
  const utilityButtons = [homeButtonHtml, downloadButtonHtml].filter(Boolean).join("\n");
  const utilityBlock = utilityButtons ? `<div class="utility-links">${utilityButtons}</div>` : "";

  // Footer content (always shown at the very bottom)
  const baseName = jsonInput?.document?.filename || jsonInput?.event?.eventName || title || "schedule";
  const footerButtonsBlock = utilityButtons ? `<div class="utility-links utility-links-footer">${utilityButtons}</div>` : "";
  const footerHtml = `
    <div class="footer">
      <div>${escapeHtml(baseName)}</div>
      <div>Document generated at ${escapeHtml(prettyTimestamp)}</div>
      <div>CapCom – <a href="https://www.capcom.london" target="_blank" rel="noopener">https://www.capcom.london</a></div>
      ${footerButtonsBlock}
    </div>
  `;

  const groupsSection = [
    keyInfoBlock,
    filterControlsHtml,
    groupsHtml,
  ].filter(Boolean).join("\n");

  // Template fill
  const html = tpl
    .replaceAll("{{CSS}}", css + "\n" + cssExtra)
    .replaceAll("{{TITLE}}", escapeHtml(title))
    .replaceAll("{{FILTER_TOGGLE}}", filterToggleHtml)
    .replaceAll("{{SUBTITLE}}", subtitleWithLogo)
    .replaceAll("{{DOWNLOAD}}", utilityBlock)
    .replaceAll("{{DEBUG}}", "") // no debug in v2
    .replaceAll("{{GROUPS}}", groupsSection)
    .replaceAll("{{FOOTER}}", footerHtml);

  return { htmlString: html, htmlFilenameBase: slugify(baseName) };
}
