import { readFile } from "fs/promises";
import path from "path";

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

  // Render columns if you have them; adjust to match your PDF column order
  const columnKeys = (jsonInput.columns || []).map(c => c.key);
  const columnHeaders = (jsonInput.columns || []).map(c => c.title || c.key);

  const groupsHtml = groups.map(g => {
    const rows = Array.isArray(g.entries) ? g.entries : [];
    const rowsHtml = rows.map(r => {
      const cells = (columnKeys.length ? columnKeys : Object.keys(r.rows || {}))
        .map(k => `<td>${escapeHtml((r.rows?.[k] ?? ""))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    const headerHtml = (columnHeaders.length
      ? `<tr>${columnHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`
      : "");

    return `
      <section class="group">
        <div class="group-title">${escapeHtml(g.title || "")}</div>
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
  </header>
  ${groupsHtml}
  <div class="footer">${escapeHtml(jsonInput?.document?.footer?.text || "")}</div>
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