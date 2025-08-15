import { readFile } from "fs/promises";
import path from "path";

function formatValue(v) {
  if (v == null) return "";
  if (Array.isArray(v)) {
    return v.map(x => (x && typeof x === 'object'
      ? (x.text ?? x.name ?? x.title ?? x.label ?? x.value ?? JSON.stringify(x))
      : String(x)
    )).join(', ');
  }
  if (typeof v === 'object') {
    return (v.text ?? v.name ?? v.title ?? v.label ?? v.value ?? JSON.stringify(v));
  }
  return String(v);
}

export async function generateHtmlString(jsonInput, { pdfUrl } = {}) {
  const title = jsonInput?.document?.title || jsonInput?.eventName || "Schedule";
  const groups = Array.isArray(jsonInput.groups) ? jsonInput.groups : [];

  // Load CSS from a file and inline it; fall back to defaults if the file isn't present
  let css = "";
  try {
    const cssPath = path.resolve(process.cwd(), "functions/html/schedule.css");
    css = await readFile(cssPath, "utf-8");
  } catch (e) {
    // Fallback inline CSS (keeps output self-contained)
    css = `
      html,body{margin:0;padding:0}
      body{font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;padding:24px}
      header{margin-bottom:16px}
      h1{font-size:20px;margin:0 0 8px 0}
      .meta{font-size:11px;opacity:0.75;margin-bottom:16px}
      .group{margin:16px 0}
      .group-title{font-weight:bold;border-bottom:1px solid #ccc;margin:12px 0 8px 0;padding-bottom:4px}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ddd;padding:6px;vertical-align:top}
      th{font-weight:bold}
      .footer{margin-top:16px;font-size:11px;opacity:0.75}
      .download{margin:12px 0 0 0}
      .download a{word-break:break-all}
    `;
  }

  const downloadBlock = pdfUrl
    ? `<div class="download">PDF: <a href="${pdfUrl}" target="_blank" rel="noopener">${pdfUrl}</a></div>`
    : "";

  // Choose columns: prefer profile columns (field/label or key/title), else detectedFields, else defaults
  let columnKeys = [];
  let columnHeaders = [];
  let showHeader = true; // hide if all profile columns explicitly set showLabel:false
  if (Array.isArray(jsonInput.columns) && jsonInput.columns.length) {
    const cols = jsonInput.columns;
    columnKeys = cols.map(c => (c.field ?? c.key)).filter(Boolean);
    columnHeaders = cols.map(c => (c.label ?? c.title ?? c.field ?? c.key ?? ""));
    // Only show header if at least one column wants a label (not strictly false)
    showHeader = cols.some(c => c?.showLabel !== false);
  } else if (Array.isArray(jsonInput.detectedFields) && jsonInput.detectedFields.length) {
    columnKeys = jsonInput.detectedFields.slice();
    columnHeaders = jsonInput.detectedFields.map(k => k.charAt(0).toUpperCase() + k.slice(1));
    showHeader = true;
  } else {
    columnKeys = ["date", "time", "description", "locations", "tags"];
    columnHeaders = ["Date", "Time", "Description", "Locations", "Tags"];
    showHeader = true;
  }

  const groupsHtml = groups.map(g => {
    const rows = Array.isArray(g.entries) ? g.entries : [];
    const rowsHtml = rows.map(r => {
      const data = (r && typeof r === 'object') ? (r.fields ?? r.rows ?? r) : {};
      const cells = columnKeys.map(k => `<td>${escapeHtml(formatValue(data?.[k]))}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    const headerHtml = (showHeader && columnHeaders.length)
      ? `<tr>${columnHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`
      : "";

    return `
      <section class="group">
        <div class="group-title">${escapeHtml(g.title || "")}</div>
        ${g.metadata ? `<div class="meta">${escapeHtml(g.metadata)}</div>` : ""}
        <table>
          <thead>${headerHtml}</thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </section>
    `;
  }).join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="x-ua-compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(jsonInput?.document?.subtitle || "")}</div>
    ${downloadBlock}
    ${jsonInput.debug === true ? (() => { const firstG=(groups||[]).find(g=>Array.isArray(g.entries)&&g.entries.length)||{}; const firstE=(firstG.entries&&firstG.entries[0])||{}; const sample=(firstE&&typeof firstE==='object')?(firstE.fields??firstE.rows??firstE):{}; return `<section style="background:#fff3cd;border:1px solid #ffeeba;padding:12px;margin:12px 0;font-size:12px;"><strong>DEBUG</strong><br/>Column keys: ${escapeHtml(JSON.stringify(columnKeys))}<br/>Column headers: ${escapeHtml(JSON.stringify(columnHeaders))}<br/>First entry keys: ${escapeHtml(JSON.stringify(Object.keys(sample)))}</section>`; })() : ""}
  </header>
  ${groupsHtml}
  <div class="footer">${escapeHtml(typeof jsonInput?.document?.footer === 'string' ? jsonInput.document.footer : (jsonInput?.document?.footer?.text || ""))}</div>
</body>
</html>`;
  return { htmlString: html, htmlFilenameBase: slugify(title || "schedule") };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll("\"","&quot;").replaceAll("'","&#39;");
}
function slugify(s) {
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}