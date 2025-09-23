// functions/generateSchedules/generatepdfv2.mjs
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';
//import { getFormattedTimestamp } from '../utils/timestamp.mjs';
import { formatFriendlyDateTime } from '../utils/prettyDate.mjs';
import { sanitiseText } from '../utils/sanitiseText.mjs';

// pdf-lib's built-in StandardFonts (Helvetica, etc.) only support WinAnsi.
// Replace any non‑WinAnsi characters (e.g., emojis) with a safe fallback so
// width calculations and drawing do not throw "WinAnsi cannot encode" errors.
function toWinAnsi(str) {
  if (str == null) return '';
  const s = String(str);
  // Replace anything outside the basic Latin + common punctuation range.
  // (You can refine the allowlist as needed.)
  return s.replace(/[^\x20-\x7E]/g, ''); // drop unsupported chars
  // If you prefer to visualise removals, swap '' for '□' or '?'.
}

// === Layout constants ===
const DEFAULT_COLUMN_WIDTH = 100;
const CELL_PADDING = 5;
const DEFAULT_LINE_SPACING = 2;

// ---------- helpers ----------
function rgbHex(input) {
  if (!input || typeof input !== 'string') return rgb(0,0,0);
  let v = input.trim();
  if (!v.startsWith('#')) return rgb(0,0,0);
  if (v.length === 4) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  if (v.length !== 7) return rgb(0,0,0);
  const n = parseInt(v.slice(1), 16);
  if (Number.isNaN(n)) return rgb(0,0,0);
  return rgb(((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255);
}

function resolveRowStyle(entry, styles) {
  const variant = (entry?.format || entry?.style || entry?.status || 'default').toString().toLowerCase();
  const base = styles?.row?.default || {};
  const over = styles?.row?.[variant] || {};
  return { ...base, ...over };
}

function resolveStyle(style, boldFont, regularFont, italicFont, boldItalicFont, lineSpacing = 2) {
  const fontSize = style.fontSize || 10;
  const fontStyle = (style.fontStyle || '').toLowerCase();
  const color = rgbHex(style.colour || style.fontColour || '#000000');
  const lineHeight = fontSize + lineSpacing;
  const paddingBottom = style.paddingBottom || 0;

  let font;
  switch (fontStyle) {
    case 'bold': font = boldFont; break;
    case 'italic': font = italicFont; break;
    case 'bolditalic':
    case 'bold-italic':
    case 'italicbold':
    case 'italic-bold': font = boldItalicFont; break;
    default: font = regularFont;
  }
  return { fontSize, font, color, lineHeight, paddingBottom };
}

function drawThresholdLine(page, bottomPageThreshold, pageWidth) {
  if (bottomPageThreshold > 0) {
    page.drawLine({
      start: { x: 0, y: bottomPageThreshold },
      end:   { x: pageWidth, y: bottomPageThreshold },
      thickness: 0.5,
      color: rgb(1, 0.5, 0),
      opacity: 0.5,
    });
  }
}

function stripInlineMd(s) {
  if (!s) return '';
  let out = String(s);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1'); // links
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1'); // images
  out = out.replace(/\*\*(.*?)\*\*/g, '$1');           // **bold**
  out = out.replace(/__(.*?)__/g, '$1');               // __bold__
  out = out.replace(/\*(.*?)\*/g, '$1');               // *italic*
  out = out.replace(/_(.*?)_/g, '$1');                 // _italic_
  out = out.replace(/~~(.*?)~~/g, '$1');               // ~~strike~~
  out = out.replace(/`([^`]+)`/g, '$1');               // `code`
  return out.replace(/\s{2,}/g, ' ').trim();
}

function normaliseKeyInfoToLines(src) {
  const rawLines = String(src).replace(/\r\n/g, '\n').split('\n');
  return rawLines.map(l => {
    const t = l.trim();
    if (!t) return '';
    if (t.startsWith('* ') || t.startsWith('- ')) return '• ' + stripInlineMd(t.slice(2));
    const noHead = t.replace(/^#{1,6}\s+/, '');
    return stripInlineMd(noHead);
  });
}

function wrapLinesForWidth(lines, font, fontSize, maxWidth) {
  const wrapped = [];
  for (const line of lines) {
    if (line === '') { wrapped.push(''); continue; }
    const safeLine = toWinAnsi(line);
    const words = safeLine.split(' ');
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
        if (cur) wrapped.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) wrapped.push(cur);
  }
  return wrapped;
}

function drawKeyInfoBox({ page, pageWidth, leftMargin, rightMargin, currentY, textStyle, boxStyle, contentLines }) {
  const pad = (boxStyle?.padding ?? 10);
  const bg = rgbHex(boxStyle?.backgroundColour || '#F7F7F7');
  const border = rgbHex(boxStyle?.borderColour || '#CCCCCC');
  const marginBottom = (boxStyle?.marginBottom ?? 16);
  const width = pageWidth - leftMargin - rightMargin;

  const wrapped = wrapLinesForWidth(contentLines, textStyle.font, textStyle.fontSize, Math.max(1, width - pad * 2));
  const textH = wrapped.length * textStyle.lineHeight;
  const boxHeight = pad + textH + pad;
  const rectY = currentY - boxHeight;

  page.drawRectangle({
    x: leftMargin, y: rectY, width, height: boxHeight,
    color: bg, borderColor: border, borderWidth: 0.5,
  });

  let yCursor = currentY - pad;
  for (const ln of wrapped) {
    page.drawText(toWinAnsi(ln), {
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

// ---------- main ----------
export const generatePdfBuffer = async (jsonInput) => {
  // Input is assumed already sanitized/filtered/grouped/sorted
  const jsonData = jsonInput;
  const filenameBase = (jsonData?.document?.filename || jsonData?.eventName || 'schedule').toString();

  // Layout & styles
  const styles = jsonData.styles || {};
  const debug = jsonData.debug === true;
  const bottomPageThreshold = jsonData.document.bottomPageThreshold ?? 0;
  const lineSpacing = jsonData.styles?.row?.lineSpacing ?? 2;

  const { width: pageWidth = 842, height: pageHeight = 595 } = jsonData.document.pageSize || {};
  const leftMargin   = jsonData.document.leftMargin   || 50;
  const rightMargin  = jsonData.document.rightMargin  || 50;
  const topMargin    = jsonData.document.topMargin    || 50;
  const bottomMargin = jsonData.document.bottomMargin || 50;
  const headerPaddingBottom = styles.header?.paddingBottom || 10;
  const groupPaddingBottom  = jsonData.document.groupPaddingBottom || 0;

  const pdfDoc = await PDFDocument.create();
  const regularFont    = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont       = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont     = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const boldItalicFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  // ---- Header (new shape w/ fallback) ----
  const headerLines = Array.isArray(jsonData.header)
    ? jsonData.header
    : (jsonData.document?.header?.text || []);
  const logoUrl = jsonData.logoUrl || jsonData.document?.header?.logo?.url || "";

  const header = {
    text: headerLines,
    logo: {
      url: logoUrl,
      width:  jsonData.document?.header?.logo?.width  || 36,
      height: jsonData.document?.header?.logo?.height || 44,
    },
  };

  let embeddedLogo = null;
  if (header.logo.url) {
    try {
      const res = await fetch(header.logo.url);
      const buf = await res.arrayBuffer();
      embeddedLogo = await pdfDoc.embedPng(buf);
    } catch (e) {
      console.warn('Logo load failed:', e.message);
    }
  }

  //const footer  = jsonData.document.footer;
  const columns = jsonData.columns || [];

  const pages = [];
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  pages.push(currentPage);
  let y = pageHeight - topMargin;

  const reserveHeader = () => {
    if ((header.text && header.text.length) || embeddedLogo) {
      const { lineHeight } = resolveStyle(styles.header || {}, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
      const lineCount = (header.text?.length || 0) + 1; // + "As at …"
      const headerTextHeight = lineCount * lineHeight;
      const logoHeight = header.logo?.height || embeddedLogo?.height || 0;
      const maxHeaderBlockHeight = Math.max(headerTextHeight, logoHeight);
      y -= maxHeaderBlockHeight + headerPaddingBottom;
    }
  };
  reserveHeader();

  // Footer area height (2 lines)
  const footerLines = 2;
  const resolvedFooterStyle = resolveStyle(styles.footer || {}, regularFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
  const footerYLimit = bottomMargin + resolvedFooterStyle.lineHeight * footerLines;

  const checkBreak = (neededHeight) => {
    if (y - neededHeight < footerYLimit) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      y = pageHeight - topMargin;
      reserveHeader();
    }
  };

  // ---- Key Info box (optional) ----
  if (jsonData.keyInfo) {
    const textStyle = resolveStyle(
      styles.keyInfo?.text || { fontSize: 10, fontStyle: 'normal', fontColour: '#000000' },
      boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING
    );
    const boxStyle = styles.keyInfo?.box || {
      backgroundColour: '#F7F7F7',
      borderColour: '#CCCCCC',
      padding: 10,
      marginBottom: 16,
    };

    const lines = normaliseKeyInfoToLines(jsonData.keyInfo);
    const innerWidth = Math.max(1, (pageWidth - leftMargin - rightMargin) - (boxStyle.padding ?? 10) * 2);
    const wrappedProbe = wrapLinesForWidth(lines, textStyle.font, textStyle.fontSize, innerWidth);
    const neededHeight = (boxStyle.padding ?? 10) + (wrappedProbe.length * textStyle.lineHeight) + (boxStyle.padding ?? 10) + (boxStyle.marginBottom ?? 16);

    checkBreak(neededHeight);

    y = drawKeyInfoBox({
      page: currentPage, pageWidth, leftMargin, rightMargin,
      currentY: y, textStyle, boxStyle, contentLines: lines,
    });
  }

  // If a Key Info box exists, start groups on a new page
  const hasKeyInfo = !!jsonData.keyInfo;
  let isFirstGroup = true;

  // ---- Groups ----
  for (const group of jsonData.groups) {
    if (isFirstGroup) {
      if (hasKeyInfo) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pages.push(currentPage);
        y = pageHeight - topMargin;
        reserveHeader();
      }
      isFirstGroup = false;
    }

    if (debug) drawThresholdLine(currentPage, bottomPageThreshold, pageWidth);
    if (y < bottomPageThreshold) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      y = pageHeight - topMargin;
      reserveHeader();
    }

    const { lineHeight: tLH, fontSize: tFS, font: tF, color: tC } =
      resolveStyle(styles.groupTitle || {}, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
    const { lineHeight: mLH, fontSize: mFS, font: mF, color: mC, paddingBottom: mPB } =
      resolveStyle(styles.groupMetadata || {}, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
    const labelInfo = resolveStyle(styles.labelRow || {}, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
    const hasLabels = columns.some(c => c.showLabel);

    const checkBreakForGroup = (neededHeight, { showContinued = false, repeatLabels = false } = {}) => {
      if (y - neededHeight < footerYLimit) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pages.push(currentPage);
        y = pageHeight - topMargin;
        reserveHeader();

        if (showContinued) {
          const contText = `${sanitiseText(group.title)} (Continued…)`;
          currentPage.drawText(toWinAnsi(contText), { x: leftMargin, y, size: tFS, font: tF, color: tC });
          y -= tLH;
        }
        if (repeatLabels && hasLabels) {
          let rx = leftMargin;
          for (const col of columns) {
            if (col.showLabel) {
              currentPage.drawText(toWinAnsi(sanitiseText(col.label)), { x: rx, y, size: labelInfo.fontSize, font: labelInfo.font, color: labelInfo.color });
            }
            rx += col.width || DEFAULT_COLUMN_WIDTH;
          }
          y -= labelInfo.lineHeight;
        }
      }
    };

    const hasMeta = !!(group.metadata && String(group.metadata).trim());
    const introHeight = tLH + (hasMeta ? (mLH + mPB) : 0) + (hasLabels ? labelInfo.lineHeight : 0);
    checkBreak(introHeight);

    currentPage.drawText(toWinAnsi(sanitiseText(group.title)), { x: leftMargin, y, size: tFS, font: tF, color: tC });
    y -= tLH;

    if (hasMeta) {
      currentPage.drawText(toWinAnsi(sanitiseText(group.metadata)), { x: leftMargin, y, size: mFS, font: mF, color: mC });
      y -= mLH + mPB;
    }

    if (hasLabels) {
      let x = leftMargin;
      checkBreakForGroup(labelInfo.lineHeight, { showContinued: true, repeatLabels: true });
      for (const col of columns) {
        if (col.showLabel) currentPage.drawText(toWinAnsi(sanitiseText(col.label)), { x, y, size: labelInfo.fontSize, font: labelInfo.font, color: labelInfo.color });
        x += col.width || DEFAULT_COLUMN_WIDTH;
      }
      y -= labelInfo.lineHeight;
    }

    for (const entry of group.entries) {
      const rowStyle = resolveRowStyle(entry, styles);
      const { lineHeight: rLH, fontSize: rFS, font: rF, color: rC } =
        resolveStyle(rowStyle, boldFont, regularFont, italicFont, boldItalicFont, lineSpacing);

      const wrapped = columns.map((col, colIdx) => {
        let txt = entry.fields[col.field];
        if (Array.isArray(txt)) txt = txt.join(', ');
        if (txt == null) txt = '';

        if (col.field === 'description') {
          if (rowStyle.icon?.enabled && rowStyle.icon.text)  txt = `${rowStyle.icon.text} ${txt}`.trim();
          if (rowStyle.badge?.enabled && rowStyle.badge.text) txt = `${txt} ${rowStyle.badge.text}`.trim();
        }

        txt = sanitiseText(txt);
        txt = toWinAnsi(txt);
        const maxW = (col.width || DEFAULT_COLUMN_WIDTH) - CELL_PADDING;
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

      let xStart = leftMargin;
      for (let c = 0; c < wrapped.length; c++) {
        const lines = wrapped[c];
        let ly = y;
        for (let li = 0; li < lines.length; li++) {
          const txt = lines[li];
          if (c === 0 && li === 0) {
            const gutterHex = (rowStyle?.gutterColour) || (styles?.row?.default?.gutterColour) || '#000000';
            const gutterColor = rgbHex(gutterHex);
            const gutterWidth = regularFont.widthOfTextAtSize('| ', rFS);

            currentPage.drawText('| ', { x: xStart, y: ly, size: rFS, font: regularFont, color: gutterColor });
            currentPage.drawText(txt,   { x: xStart + gutterWidth, y: ly, size: rFS, font: rF, color: rC });
          } else {
            currentPage.drawText(toWinAnsi(txt), { x: xStart, y: ly, size: rFS, font: rF, color: rC });
          }
          ly -= rLH;
        }
        xStart += columns[c].width || DEFAULT_COLUMN_WIDTH;
      }

      if (rowStyle.underline?.enabled === true) {
        const colourHex = rowStyle.underline.colour || rowStyle.fontColour || '#000000';
        const lineColor = rgbHex(colourHex);
        const thickness = (typeof rowStyle.underline.thickness === 'number' && rowStyle.underline.thickness > 0) ? rowStyle.underline.thickness : 1;
        const fullContentWidth = (pageWidth - leftMargin - rightMargin);
        let length = (typeof rowStyle.underline.width === 'number' && rowStyle.underline.width > 0) ? rowStyle.underline.width : fullContentWidth;
        length = Math.min(Math.max(1, length), fullContentWidth);
        const uy = y - rowH + 12;
        currentPage.drawLine({
          start: { x: leftMargin, y: uy },
          end:   { x: leftMargin + length, y: uy },
          thickness,
          color: lineColor,
        });
      }

      y -= rowH;
    }

    y -= groupPaddingBottom;
  }

  // ---- Header & Footer pass ----
  const total = pdfDoc.getPageCount();
  //const ts = getFormattedTimestamp();
  const ts = formatFriendlyDateTime(new Date());

  for (let i = 0; i < total; i++) {
    const pg = pages[i];

    if (header.text?.length) {
      const { lineHeight: hLH, fontSize: hFS, font: hF, color: hC } =
        resolveStyle(styles.header || {}, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);

      const headerStyle = resolveStyle(styles.header || {}, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
      const lineCount = header.text.length + 1; // + "As at …"
      const headerTextHeight = lineCount * headerStyle.lineHeight;
      const logoHeight = header.logo?.height || embeddedLogo?.height || 0;
      const maxHeaderBlockHeight = Math.max(headerTextHeight, logoHeight);

      let hy = pageHeight - topMargin - (maxHeaderBlockHeight - headerTextHeight);
      for (const ln of header.text) {
        pg.drawText(toWinAnsi(sanitiseText(ln)), { x: leftMargin, y: hy, size: hFS, font: hF, color: hC });
        hy -= hLH;
      }
      const asAtText = `As at ${ts}`;
      pg.drawText(toWinAnsi(sanitiseText(asAtText)), { x: leftMargin, y: hy, size: hFS, font: hF, color: hC });
    }

    if (embeddedLogo) {
      pg.drawImage(embeddedLogo, {
        x: pageWidth - header.logo.width - rightMargin,
        y: pageHeight - header.logo.height - topMargin,
        width: header.logo.width,
        height: header.logo.height,
      });
    }

    {
      const { fontSize: fFS, font: fF, color: fC, lineHeight: fLH } =
        resolveStyle(styles.footer || {}, regularFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);

      const fyMain = bottomMargin + fLH;
      const fyCredit = bottomMargin;

      // Prepare safe footer strings
      const safeFilename = toWinAnsi(filenameBase);
      const pgText   = `Page ${i + 1} of ${total}`;
      const safePgText = toWinAnsi(pgText);
      const tText    = `Document generated ${ts}`;
      const safeTText = toWinAnsi(tText);
      const creditText = `Capcom – https://www.capcom.london`;
      const safeCredit = toWinAnsi(creditText);

      // Left: filename
      pg.drawText(safeFilename, { x: leftMargin, y: fyMain, size: fFS, font: fF, color: fC });

      // Centre: Page X of Y
      const pgTextWidth = fF.widthOfTextAtSize(safePgText, fFS);
      pg.drawText(safePgText, { x: (pageWidth - pgTextWidth) / 2, y: fyMain, size: fFS, font: fF, color: fC });

      // Right: timestamp
      const tTextWidth = fF.widthOfTextAtSize(safeTText, fFS);
      pg.drawText(safeTText, { x: pageWidth - rightMargin - tTextWidth, y: fyMain, size: fFS, font: fF, color: fC });

      // Line 2 (centre): credit
      const creditWidth = fF.widthOfTextAtSize(safeCredit, fFS);
      pg.drawText(safeCredit, { x: (pageWidth - creditWidth) / 2, y: fyCredit, size: fFS, font: fF, color: fC });
    }

    if (debug) {
      const headerStyle = resolveStyle(styles.header || {}, boldFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
      const headerHeight = (header.text?.length || 0) * headerStyle.lineHeight + headerPaddingBottom;

      const topMarginY = pageHeight - topMargin;
      const headerBottomY = topMarginY - headerHeight;

      pg.drawLine({ start: { x: 0, y: topMarginY }, end: { x: pageWidth, y: topMarginY }, thickness: 0.5, color: rgb(0.5, 0, 0.5), opacity: 0.4 });
      pg.drawLine({ start: { x: 0, y: headerBottomY }, end: { x: pageWidth, y: headerBottomY }, thickness: 0.5, color: rgb(0, 0.6, 0), opacity: 0.4 });

      const footerStyle = resolveStyle(styles.footer || {}, regularFont, regularFont, italicFont, boldItalicFont, DEFAULT_LINE_SPACING);
      const footerBlockTopY = bottomMargin + footerStyle.lineHeight * 2;
      pg.drawLine({ start: { x: 0, y: footerBlockTopY }, end: { x: pageWidth, y: footerBlockTopY }, thickness: 0.5, color: rgb(1, 0, 0), opacity: 0.4 });
      pg.drawLine({ start: { x: 0, y: bottomMargin }, end: { x: pageWidth, y: bottomMargin }, thickness: 0.5, color: rgb(0, 0, 1), opacity: 0.4 });

      if (bottomPageThreshold > 0) {
        pg.drawLine({ start: { x: 0, y: bottomPageThreshold }, end: { x: pageWidth, y: bottomPageThreshold }, thickness: 0.5, color: rgb(1, 0.5, 0), opacity: 0.4 });
      }

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
        for (const { text, color } of keyLines) {
          pg.drawText(text, { x: leftMargin, y: yKey, size: keyStyle.fontSize, font: keyStyle.font, color });
          yKey -= keyStyle.lineHeight;
        }
      }
    }
  }

  return {
    bytes: await pdfDoc.save(),
    filename: jsonData.document.filename.endsWith('.pdf')
      ? jsonData.document.filename
      : `${jsonData.document.filename}.pdf`,
  };
};