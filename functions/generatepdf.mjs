//console.log('🧾 Headers received:', req.headers);

// generateFromJson.mjs
//
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile } from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { readFileSync } from 'node:fs';
import { getFormattedTimestamp } from './utils/timestamp.mjs';
import { cleanJson } from './utils/cleanJSON.mjs';
//import { filterJson } from './utils/filterJSON.mjs';
import { sanitiseText } from './utils/sanitiseText.mjs';



// === Configuration ===
// Default column width if not specified in JSON (points)
const DEFAULT_COLUMN_WIDTH = 100;
// Right-side padding inside each cell to prevent text touching the cell edge (points)
const CELL_PADDING = 5;

// Default line spacing (points) for headers, labels, metadata, footer, etc.
const DEFAULT_LINE_SPACING = 2;




function rgbHex(input) {
  if (!input || typeof input !== 'string') return rgb(0, 0, 0);
  let v = input.trim();
  if (!v.startsWith('#')) return rgb(0, 0, 0);
  // Support #RGB by expanding to #RRGGBB
  if (v.length === 4) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  if (v.length !== 7) return rgb(0, 0, 0);
  const bigint = parseInt(v.slice(1), 16);
  if (Number.isNaN(bigint)) return rgb(0, 0, 0);
  return rgb(
    ((bigint >> 16) & 255) / 255,
    ((bigint >> 8) & 255) / 255,
    (bigint & 255) / 255
  );
}
function resolveRowStyle(entry, styles) {
  const variant = (entry?.format || entry?.style || entry?.status || 'default').toString().toLowerCase();
  const base = styles?.row?.default || {};
  const over = styles?.row?.[variant] || {};
  // Shallow merge: over overrides base
  return { ...base, ...over };
}

function resolveStyle(style, boldFont, regularFont, italicFont, boldItalicFont, lineSpacing = 2) {
  const fontSize = style.fontSize || 10;
  const fontStyle = (style.fontStyle || '').toLowerCase();

  let font;
  switch (fontStyle) {
    case 'bold':
      font = boldFont;
      break;
    case 'italic':
      font = italicFont;
      break;
    case 'bolditalic':
    case 'bold-italic':
    case 'italicbold':
    case 'italic-bold':
      font = boldItalicFont;
      break;
    default:
      font = regularFont;
  }

  const color = rgbHex(style.colour || style.fontColour || '#000000');
  const lineHeight = fontSize + lineSpacing;
  const paddingBottom = style.paddingBottom || 0;


  return { fontSize, font, color, lineHeight, paddingBottom };
}

export const generatePdfBuffer = async (jsonInput = null) => {
  let jsonData;
  if (jsonInput) {
    jsonData = typeof jsonInput === 'string' ? cleanJson(jsonInput) : jsonInput;
  } else {
    const localJson = await readFile(path.resolve('./local.json'), 'utf8');
    jsonData = cleanJson(localJson);
  }
  //jsonData = filterJson(jsonData);
  const debug = jsonData.debug === true;
  const styles = jsonData.styles || {};
  const bottomPageThreshold = jsonData.document.bottomPageThreshold ?? 0;
  const lineSpacing = jsonData.styles?.row?.lineSpacing ?? 2;

  const { width: pageWidth = 842, height: pageHeight = 595 } = jsonData.document.pageSize || {};
  const leftMargin = jsonData.document.leftMargin || 50;
  const rightMargin = jsonData.document.rightMargin || 50;
  const topMargin = jsonData.document.topMargin || 50;
  const bottomMargin = jsonData.document.bottomMargin || 50;
  const headerPaddingBottom = styles.header?.paddingBottom || 10;
  //const footerPaddingTop = styles.footer?.paddingTop || 10;
  const groupPaddingBottom = jsonData.document.groupPaddingBottom || 0;

  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const boldItalicFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const header = jsonData.document.header;
  const footer = jsonData.document.footer;
  let embeddedLogo = null;
  if (header?.logo?.url) {
    try {
      const res = await fetch(header.logo.url);
      const buf = await res.arrayBuffer();
      embeddedLogo = await pdfDoc.embedPng(buf);
    } catch (e) {
      console.warn('Logo load failed:', e.message);
    }
  }

  //const defaultStyle = jsonData.styles?.row?.default || {};
  const labelRowStyle = jsonData.styles?.labelRow || {};
  const groupTitleStyle = jsonData.styles?.groupTitle || {};
  const groupMetaStyle = jsonData.styles?.groupMetadata || {};
  const columns = jsonData.columns || [];

  const pages = [];
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  pages.push(currentPage);
  let y = pageHeight - topMargin;

  // const reserveHeader = () => {
  //   if (header?.text?.length) {
  //     const { lineHeight } = resolveStyle(styles.header || {}, boldFont, regularFont, italicFont, boldItalicFont, lineSpacing);
  //     y -= header.text.length * lineHeight + headerPaddingBottom;
  //   }
  // };

  const reserveHeader = () => {
    if (header?.text?.length || embeddedLogo) {
      const { lineHeight } = resolveStyle(
        styles.header || {},
        boldFont,
        regularFont,
        italicFont,
        boldItalicFont,
        DEFAULT_LINE_SPACING
      );
      // Reserve for existing header lines + 1 extra line for "As at …"
      const lineCount = (header?.text?.length || 0) + 1;
      const headerTextHeight = lineCount * lineHeight;
      const logoHeight = header?.logo?.height || embeddedLogo?.height || 0;
      const maxHeaderBlockHeight = Math.max(headerTextHeight, logoHeight);
      y -= maxHeaderBlockHeight + headerPaddingBottom;
    }
  };

  reserveHeader();

  //const footerYLimit = bottomMargin + footerPaddingTop;
  //Have made the footer two lines - readjusting code to calulate footer height
  const footerLines = 2;
  const resolvedFooterStyle = resolveStyle(styles.footer || {}, regularFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
  const footerYLimit = bottomMargin + resolvedFooterStyle.lineHeight * footerLines;

  const checkBreak = (neededHeight) => {
    if (y - neededHeight < footerYLimit) {
      //console.log(`→ break at y=${y.toFixed(1)}, need=${neededHeight}`);
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      y = pageHeight - topMargin;
      reserveHeader();
    }
  };

  // === Key Info box (optional) ===
  if (jsonData.keyInfo) {
    // Resolve styles with defaults; can be overridden via styles.keyInfo in profile JSON
    // No title for Key info box
    const titleStyle = null;
    const textStyle = resolveStyle(
      (styles.keyInfo?.text) || { fontSize: 10, fontStyle: 'normal', fontColour: '#000000' },
      boldFont, regularFont, italicFont, boldItalicFont,
            DEFAULT_LINE_SPACING
    );
    
    const boxStyle = styles.keyInfo?.box || {
      backgroundColour: '#F7F7F7',
      borderColour: '#CCCCCC',
      padding: 10,
      marginBottom: 16,
    };

    const lines = normaliseKeyInfoToLines(jsonData.keyInfo);

    // Estimate height and page-break cleanly if needed
    const innerWidth = Math.max(1, (pageWidth - leftMargin - rightMargin) - (boxStyle.padding ?? 10) * 2);
    const wrappedProbe = wrapLinesForWidth(lines, textStyle.font, textStyle.fontSize, innerWidth);
    const neededHeight =
      (boxStyle.padding ?? 10) +
      (wrappedProbe.length * textStyle.lineHeight) +
      (boxStyle.padding ?? 10) +
      (boxStyle.marginBottom ?? 16);

    checkBreak(neededHeight);

    // Draw and advance the Y cursor
    y = drawKeyInfoBox({
      page: currentPage,
      pageWidth,
      leftMargin,
      rightMargin,
      currentY: y,
      titleStyle,
      textStyle,
      boxStyle,
      contentLines: lines,
    });
  }

  // — Group pagination rules —
  // If there is a Key Info box, push the first group to page 2; otherwise let groups flow.
  const hasKeyInfo = !!jsonData.keyInfo;
  let isFirstGroup = true;

  for (const group of jsonData.groups) {
    // If there is a Key Info box, push the first group to page 2; otherwise let groups flow.
    if (isFirstGroup) {
      if (hasKeyInfo) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pages.push(currentPage);
        y = pageHeight - topMargin;
        reserveHeader();
      }
      isFirstGroup = false;
    }

    // Visual threshold guide and bottom-page guard (optional)
    if (debug) {
      drawThresholdLine(currentPage, bottomPageThreshold, pageWidth);
    }
    if (y < bottomPageThreshold) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      y = pageHeight - topMargin;
      reserveHeader();
    }
    const { lineHeight: tLH, fontSize: tFS, font: tF, color: tC } = resolveStyle(groupTitleStyle, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
    const { lineHeight: mLH, fontSize: mFS, font: mF, color: mC, paddingBottom: mPB } = resolveStyle(groupMetaStyle, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
    const labelInfo = resolveStyle(labelRowStyle, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
    const hasLabels = columns.some(c => c.showLabel);

    // Page-break helper that is aware of the current group and can print a
    // "continued…" banner and re-draw labels on the new page when breaking mid-group.
    const checkBreakForGroup = (neededHeight, { showContinued = false, repeatLabels = false } = {}) => {
      if (y - neededHeight < footerYLimit) {
        // New page
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pages.push(currentPage);
        y = pageHeight - topMargin;
        reserveHeader();

        // Optional continued banner
        if (showContinued) {
          const contStyle = resolveStyle(groupTitleStyle, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
          const contText = `${sanitiseText(group.title)} (Continued…)`;
          currentPage.drawText(contText, { x: leftMargin, y, size: contStyle.fontSize, font: contStyle.font, color: contStyle.color });
          y -= contStyle.lineHeight;
        }

        // Optional label re-draw for context
        if (repeatLabels && hasLabels) {
          const { fontSize: rlFS, font: rlF, color: rlC, lineHeight: rlLH } = labelInfo;
          let rx = leftMargin;
          for (const col of columns) {
            if (col.showLabel) {
              currentPage.drawText(sanitiseText(col.label), { x: rx, y, size: rlFS, font: rlF, color: rlC });
            }
            rx += col.width || DEFAULT_COLUMN_WIDTH;
          }
          y -= rlLH;
        }
      }
    };

    const hasMeta = !!(group.metadata && String(group.metadata).trim());
    const introHeight = tLH + (hasMeta ? (mLH + mPB) : 0) + (hasLabels ? labelInfo.lineHeight : 0);
    checkBreak(introHeight);

    currentPage.drawText(sanitiseText(group.title), { x: leftMargin, y, size: tFS, font: tF, color: tC });
    y -= tLH;
    if(hasMeta) {
      currentPage.drawText(sanitiseText(group.metadata), { x: leftMargin, y, size: mFS, font: mF, color: mC });
      y -= mLH + mPB;
    }

    if (hasLabels) {
      let x = leftMargin;
      const { fontSize: lFS, font: lF, color: lC, lineHeight: lLH } = labelInfo;
      checkBreakForGroup(lLH, { showContinued: true, repeatLabels: true });
      for (const col of columns) {
        if (col.showLabel) {
          currentPage.drawText(sanitiseText(col.label), { x, y, size: lFS, font: lF, color: lC });
        }
        x += col.width || DEFAULT_COLUMN_WIDTH;
      }
      y -= lLH;
    }

    for (const entry of group.entries) {
      // Resolve per-row style from JSON (default / important / new / past ...)
      const rowStyle = resolveRowStyle(entry, styles);
      const { lineHeight: rLH, fontSize: rFS, font: rF, color: rC } =
        resolveStyle(rowStyle, boldFont, regularFont, italicFont, boldItalicFont, lineSpacing);

      // Build wrapped lines per column, with optional icon/badge on description
      const wrapped = columns.map((col, colIdx) => {
        let txt = entry.fields[col.field];
        if (Array.isArray(txt)) txt = txt.join(', ');
        if (txt == null) txt = '';

        // Optional icon/badge support if provided in styles JSON
        if (col.field === 'description') {
          if (rowStyle.icon && rowStyle.icon.enabled && rowStyle.icon.text) {
            txt = `${rowStyle.icon.text} ${txt}`.trim();
          }
          if (rowStyle.badge && rowStyle.badge.enabled && rowStyle.badge.text) {
            txt = `${txt} ${rowStyle.badge.text}`.trim();
          }
        }

        txt = sanitiseText(txt);
        const maxW = (col.width || DEFAULT_COLUMN_WIDTH) - CELL_PADDING; // right-side padding only
        let effectiveMaxW = maxW;
        if (colIdx === 0) {
          const gutterProbe = regularFont.widthOfTextAtSize('| ', rFS);
          effectiveMaxW = Math.max(1, maxW - gutterProbe);
        }
        const words = String(txt).split(' ');
        const lines = [];
        let ln = '';
        for (const w of words) {
          const test = ln ? `${ln} ${w}` : w;
          if (rF.widthOfTextAtSize(test, rFS) > effectiveMaxW) {
            if (ln) lines.push(ln);
            ln = w;
          } else ln = test;
        }
        if (ln) lines.push(ln);
        return lines;
      });

      const rowH = Math.max(1, ...wrapped.map(w => w.length)) * rLH;
      checkBreakForGroup(rowH, { showContinued: true, repeatLabels: true });


      // Draw the row text
      let xStart = leftMargin;
      for (let c = 0; c < wrapped.length; c++) {
        const lines = wrapped[c];
        let ly = y;
        for (let li = 0; li < lines.length; li++) {
          const txt = lines[li];
          if (c === 0 && li === 0) {
            // Draw non-italic gutter in configured colour, then the first-line text shifted right
            // Prefer the resolved row style's gutterColour; fallback to global default, then black
            const gutterHex = (rowStyle?.gutterColour) || (styles?.row?.default?.gutterColour) || '#000000';
            const gutterColor = rgbHex(gutterHex);
            const gutterWidth = regularFont.widthOfTextAtSize('| ', rFS);

            // Gutter (always non-italic)
            currentPage.drawText('| ', {
              x: xStart,
              y: ly,
              size: rFS,
              font: regularFont,
              color: gutterColor,
            });

            // Row text, shifted to the right by the gutter width
            currentPage.drawText(txt, {
              x: xStart + gutterWidth,
              y: ly,
              size: rFS,
              font: rF,
              color: rC,
            });
          } else {
            // Normal lines
            currentPage.drawText(txt, { x: xStart, y: ly, size: rFS, font: rF, color: rC });
          }
          ly -= rLH;
        }
        xStart += columns[c].width || DEFAULT_COLUMN_WIDTH;
      }

      // Optional underline (left-anchored). Supports length (width), thickness, and colour from JSON.
      if (rowStyle.underline && rowStyle.underline.enabled === true) {
        const colourHex = rowStyle.underline.colour || rowStyle.fontColour || '#000000';
        const lineColor = rgbHex(colourHex);
        const thickness = (typeof rowStyle.underline.thickness === 'number' && rowStyle.underline.thickness > 0)
          ? rowStyle.underline.thickness
          : 1;
        // Length of the underline in points; default to full content width if not provided
        const fullContentWidth = (pageWidth - leftMargin - rightMargin);
        let length = (typeof rowStyle.underline.width === 'number' && rowStyle.underline.width > 0)
          ? rowStyle.underline.width
          : fullContentWidth;
        // Clamp the length to available area
        length = Math.min(Math.max(1, length), fullContentWidth);
        // Draw a line at the bottom of the current row block for a tidy underline
        const uy = y - rowH + 12; // place separator at the bottom of the current row
              currentPage.drawLine({
          start: { x: leftMargin, y: uy },
          end: { x: leftMargin + length, y: uy },
          thickness,
          color: lineColor,
        });
      }

      y -= rowH;
    }

    y -= groupPaddingBottom;
  }

  const total = pdfDoc.getPageCount();
  const ts = getFormattedTimestamp();
  for (let i = 0; i < total; i++) {
    const pg = pages[i];
    if (header?.text) {
      const { lineHeight: hLH, fontSize: hFS, font: hF, color: hC } = resolveStyle(
        styles.header || {},
        boldFont,
        regularFont,
        italicFont,
        boldItalicFont,
        DEFAULT_LINE_SPACING
      );
      const headerStyle = resolveStyle(
        styles.header || {},
        boldFont,
        regularFont,
        italicFont,
        boldItalicFont,
        DEFAULT_LINE_SPACING
      );
      // Account for existing header lines + 1 extra line for "As at …"
      const lineCount = (header?.text?.length || 0) + 1;
      const headerTextHeight = lineCount * headerStyle.lineHeight;
      const logoHeight = header?.logo?.height || embeddedLogo?.height || 0;
      const maxHeaderBlockHeight = Math.max(headerTextHeight, logoHeight);

      let hy = pageHeight - topMargin - (maxHeaderBlockHeight - headerTextHeight);
      // Draw existing header lines first
      for (const ln of header.text) {
        pg.drawText(sanitiseText(ln), { x: leftMargin, y: hy, size: hFS, font: hF, color: hC });
        hy -= hLH;
      }
      // Draw the new "As at …" line using the same header style
      const asAtText = `As at ${ts}`;
      pg.drawText(sanitiseText(asAtText), { x: leftMargin, y: hy, size: hFS, font: hF, color: hC });
      hy -= hLH;
    }
    if (header?.logo && embeddedLogo) {
      pg.drawImage(embeddedLogo, {
        x: pageWidth - (header.logo.width || embeddedLogo.width) - rightMargin,
        y: pageHeight - (header.logo.height || embeddedLogo.height) - topMargin,
        width: header.logo.width || embeddedLogo.width,
        height: header.logo.height || embeddedLogo.height,
      });
    }
    if (footer) {
      const {
        fontSize: fFS,
        font: fF,
        color: fC,
        lineHeight: fLH
      } = resolveStyle(
        styles.footer || {},
        regularFont,
        regularFont,
        italicFont,
        boldItalicFont,
        DEFAULT_LINE_SPACING
      );

      const fyMain = bottomMargin + fLH;  // Line 1 (footer, page number, timestamp)
      const fyCredit = bottomMargin;      // Line 2 (Capcom credit)

      // Line 1 - Left: footer text
      pg.drawText(footer, {
        x: leftMargin,
        y: fyMain,
        size: fFS,
        font: fF,
        color: fC
      });

      // Line 1 - Center: Page number
      const pgText = `Page ${i + 1} of ${total}`;
      const pgTextWidth = fF.widthOfTextAtSize(pgText, fFS);
      pg.drawText(pgText, {
        x: (pageWidth - pgTextWidth) / 2,
        y: fyMain,
        size: fFS,
        font: fF,
        color: fC
      });

      // Line 1 - Right: Timestamp
      const tText = `Document generated ${ts}`;
      const tTextWidth = fF.widthOfTextAtSize(tText, fFS);
      pg.drawText(tText, {
        x: pageWidth - rightMargin - tTextWidth,
        y: fyMain,
        size: fFS,
        font: fF,
        color: fC
      });

      // Line 2 - Center: Capcom credit
      const creditText = `Capcom – https://www.capcom.london`;
      const creditWidth = fF.widthOfTextAtSize(creditText, fFS);
      pg.drawText(creditText, {
        x: (pageWidth - creditWidth) / 2,
        y: fyCredit,
        size: fFS,
        font: fF,
        color: fC
      });
    }
    // 🔍 DEBUG LINES — header, margin, footer, threshold, plus legend on page 1
    if (debug) {
      // === TOP MARGIN + HEADER ===
      const headerStyle = resolveStyle(styles.header || {}, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
      const headerLineHeight = headerStyle.lineHeight;
      const headerHeight = (header?.text?.length || 0) * headerLineHeight + headerPaddingBottom;

      const topMarginY = pageHeight - topMargin;
      const headerBottomY = topMarginY - headerHeight;

      // 🟣 Top margin baseline
      pg.drawLine({
        start: { x: 0, y: topMarginY },
        end: { x: pageWidth, y: topMarginY },
        thickness: 0.5,
        color: rgb(0.5, 0, 0.5), // Purple
        opacity: 0.4,
      });

      // 🟢 Bottom of header block
      pg.drawLine({
        start: { x: 0, y: headerBottomY },
        end: { x: pageWidth, y: headerBottomY },
        thickness: 0.5,
        color: rgb(0, 0.6, 0), // Green
        opacity: 0.4,
      });

      // === FOOTER AREA ===
      const footerStyle = resolveStyle(styles.footer || {}, regularFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
      const footerBlockTopY = bottomMargin + footerStyle.lineHeight * 2;

      // 🔴 Top of reserved footer area
      pg.drawLine({
        start: { x: 0, y: footerBlockTopY },
        end: { x: pageWidth, y: footerBlockTopY },
        thickness: 0.5,
        color: rgb(1, 0, 0), // Red
        opacity: 0.4,
      });

      // 🔵 Bottom margin baseline
      pg.drawLine({
        start: { x: 0, y: bottomMargin },
        end: { x: pageWidth, y: bottomMargin },
        thickness: 0.5,
        color: rgb(0, 0, 1), // Blue
        opacity: 0.4,
      });

      // === PAGE BREAK THRESHOLD (ORANGE) ===
      if (bottomPageThreshold > 0) {
        pg.drawLine({
          start: { x: 0, y: bottomPageThreshold },
          end: { x: pageWidth, y: bottomPageThreshold },
          thickness: 0.5,
          color: rgb(1, 0.5, 0), // Orange
          opacity: 0.4,
        });
      }

      // === DEBUG LEGEND (first page only) ===
      if (i === 0) {
        const keyLines = [
          { text: 'Red: Top of footer block', color: rgb(1, 0, 0) },
          { text: 'Blue: Bottom margin baseline', color: rgb(0, 0, 1) },
          { text: 'Orange: Bottom page threshold', color: rgb(1, 0.5, 0) },
          { text: 'Green: Bottom of header block', color: rgb(0, 0.6, 0) },
          { text: 'Purple: Top margin baseline', color: rgb(0.5, 0, 0.5) },
        ];
        const keyStyle = resolveStyle(styles.labelRow || {}, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
        let yKey = pageHeight / 2;


        // ✅ Draw the text
        for (const { text, color } of keyLines) {
          pg.drawText(text, {
            x: leftMargin,
            y: yKey,
            size: keyStyle.fontSize,
            font: keyStyle.font,
            color,
          });
          yKey -= keyStyle.lineHeight;
        }
      }
    }
  }

  return {
    bytes: await pdfDoc.save(),
    filename: jsonData.document.filename.endsWith('.pdf') ? jsonData.document.filename : `${jsonData.document.filename}.pdf`,
  };
};

export function getOutputFilename() {
  const p = path.resolve('./sample.json');
  const r = readFileSync(p, 'utf8');
  const d = JSON.parse(r);
  return d.document.filename.endsWith('.pdf') ? d.document.filename : `${d.document.filename}.pdf`;
}


function drawThresholdLine(page, bottomPageThreshold, pageWidth) {
  if (bottomPageThreshold > 0) {
    page.drawLine({
      start: { x: 0, y: bottomPageThreshold },
      end: { x: pageWidth, y: bottomPageThreshold },
      thickness: 0.5,
      color: rgb(1, 0.5, 0), // 🟧 Orange (RGB: 255, 128, 0)
      opacity: 0.5,
    });
  }
}

function stripInlineMd(s) {
  if (!s) return '';
  let out = String(s);
  // links: [text](url) -> text
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  // images: ![alt](url) -> alt
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1');
  // bold/italic/code/strike markers: **text**, __text__, *text*, _text_, ~~text~~, `code`
  out = out.replace(/\*\*(.*?)\*\*/g, '$1');
  out = out.replace(/__(.*?)__/g, '$1');
  out = out.replace(/\*(.*?)\*/g, '$1');
  out = out.replace(/_(.*?)_/g, '$1');
  out = out.replace(/~~(.*?)~~/g, '$1');
  out = out.replace(/`([^`]+)`/g, '$1');
  // collapse extra spaces created by stripping
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

function normaliseKeyInfoToLines(src) {
  if (!src) return [];
  const rawLines = String(src).replace(/\r\n/g, '\n').split('\n');
  return rawLines.map(l => {
    const t = l.trim();
    if (!t) return ''; // blank line separator
    // bullets
    if (t.startsWith('* ') || t.startsWith('- ')) return '• ' + stripInlineMd(t.slice(2));
    // strip simple markdown headings
    const noHead = t.replace(/^#{1,6}\s+/, '');
    return stripInlineMd(noHead);
  });
}

function wrapLinesForWidth(lines, font, fontSize, maxWidth) {
  const wrapped = [];
  for (const line of lines) {
    if (line === '') { wrapped.push(''); continue; }
    const words = line.split(' ');
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
        if (cur) wrapped.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) wrapped.push(cur);
  }
  return wrapped;
}

function drawKeyInfoBox(opts) {
  const {
    page, pageWidth, leftMargin, rightMargin, currentY, textStyle, boxStyle, contentLines
  } = opts;

  const pad = (boxStyle?.padding ?? 10);
  const bg = rgbHex(boxStyle?.backgroundColour || '#F7F7F7');
  const border = rgbHex(boxStyle?.borderColour || '#CCCCCC');
  const marginBottom = (boxStyle?.marginBottom ?? 16);
  const width = pageWidth - leftMargin - rightMargin;

  const wrapped = wrapLinesForWidth(
    contentLines,
    textStyle.font,
    textStyle.fontSize,
    Math.max(1, width - pad * 2)
  );

  const textH = wrapped.length * textStyle.lineHeight;
  const boxHeight = pad + textH + pad;

  const rectY = currentY - boxHeight;
  page.drawRectangle({
    x: leftMargin,
    y: rectY,
    width,
    height: boxHeight,
    color: bg,
    borderColor: border,
    borderWidth: 0.5,
  });

  let yCursor = currentY - pad;

  for (const ln of wrapped) {
    page.drawText(ln, {
      x: leftMargin + pad,
      y: yCursor - (textStyle.lineHeight - textStyle.fontSize),
      size: textStyle.fontSize,
      font: textStyle.font,
      color: textStyle.color,
    });
    yCursor -= textStyle.lineHeight;
  }

  return currentY - boxHeight - marginBottom;
}