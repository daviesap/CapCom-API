// generateFromJson.mjs
//
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile } from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { readFileSync } from 'node:fs';
import { getFormattedTimestamp } from './utils/timestamp.mjs';
import { cleanJson } from './utils/cleanJSON.mjs';
import { filterJson } from './utils/filterJSON.mjs';
import { sanitiseText } from './utils/sanitiseText.mjs';



// === Configuration ===
// Default column width if not specified in JSON (points)
const DEFAULT_COLUMN_WIDTH = 100;
// Right-side padding inside each cell to prevent text touching the cell edge (points)
const CELL_PADDING = 5;

function rgbHex(hex) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return rgb(
    ((bigint >> 16) & 255) / 255,
    ((bigint >> 8) & 255) / 255,
    (bigint & 255) / 255
  );
}

function resolveStyle(style, boldFont, regularFont, italicFont, boldItalicFont, rowLineSpacing = 2) {
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
  const lineHeight = fontSize + rowLineSpacing;
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
  jsonData = filterJson(jsonData);
  const debug = jsonData.debug === true;
  const styles = jsonData.styles || {};
  const bottomPageThreshold = jsonData.document.bottomPageThreshold ?? 0;

  const { width: pageWidth = 842, height: pageHeight = 595 } = jsonData.document.pageSize || {};
  const leftMargin = jsonData.document.leftMargin || 50;
  const rightMargin = jsonData.document.rightMargin || 50;
  const topMargin = jsonData.document.topMargin || 50;
  const bottomMargin = jsonData.document.bottomMargin || 50;
  const headerPaddingBottom = styles.header?.paddingBottom || 10;
  const footerPaddingTop = styles.footer?.paddingTop || 10;
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

  const defaultStyle = jsonData.styles?.row?.default || {};
  const rowLineSpacing = styles?.row?.lineSpacing ?? 2;
  const labelRowStyle = jsonData.styles?.labelRow || {};
  const groupTitleStyle = jsonData.styles?.groupTitle || {};
  const groupMetaStyle = jsonData.styles?.groupMetadata || {};
  const columns = jsonData.columns || [];

  const pages = [];
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  pages.push(currentPage);
  let y = pageHeight - topMargin;

  const reserveHeader = () => {
    if (header?.text?.length) {
      const { lineHeight } = resolveStyle(styles.header || {}, boldFont, regularFont, italicFont, boldItalicFont);
      y -= header.text.length * lineHeight + headerPaddingBottom;
    }
  };
  reserveHeader();

  const footerYLimit = bottomMargin + footerPaddingTop;

  const checkBreak = (neededHeight) => {
    if (y - neededHeight < footerYLimit) {
      //console.log(`→ break at y=${y.toFixed(1)}, need=${neededHeight}`);
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      y = pageHeight - topMargin;
      reserveHeader();
    }
  };

  for (const group of jsonData.groups) {
    if (debug) {
      drawThresholdLine(currentPage, bottomPageThreshold, pageWidth);
    }
    if (y < bottomPageThreshold) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      y = pageHeight - topMargin;
      reserveHeader();

    }
    const { lineHeight: tLH, fontSize: tFS, font: tF, color: tC } = resolveStyle(groupTitleStyle, boldFont, regularFont, italicFont, boldItalicFont);
    const { lineHeight: mLH, fontSize: mFS, font: mF, color: mC, paddingBottom: mPB } = resolveStyle(groupMetaStyle, boldFont, regularFont, italicFont, boldItalicFont);
    const labelInfo = resolveStyle(labelRowStyle, boldFont, regularFont, italicFont, boldItalicFont);
    const hasLabels = columns.some(c => c.showLabel);

    const introHeight = tLH + mLH + mPB + (hasLabels ? labelInfo.lineHeight : 0);
    checkBreak(introHeight);

    currentPage.drawText(sanitiseText(group.title), { x: leftMargin, y, size: tFS, font: tF, color: tC });
    y -= tLH;
    currentPage.drawText(sanitiseText(group.metadata), { x: leftMargin, y, size: mFS, font: mF, color: mC });
    y -= mLH + mPB;

    if (hasLabels) {
      let x = leftMargin;
      const { fontSize: lFS, font: lF, color: lC, lineHeight: lLH } = labelInfo;
      checkBreak(lLH);
      for (const col of columns) {
        if (col.showLabel) {
          currentPage.drawText(sanitiseText(col.label), { x, y, size: lFS, font: lF, color: lC });
        }
        x += col.width || DEFAULT_COLUMN_WIDTH;
      }
      y -= lLH;
    }

    for (const entry of group.entries) {
      //const styleKey = entry.style || 'default'; OLD LINE
      const styleKey = entry.format || 'default';
      //const rowStyle = jsonData.styles?.entries?.[styleKey] || defaultStyle; OLD LINE
      const rowStyle = jsonData.styles?.row?.[styleKey] || defaultStyle;
      const { lineHeight: rLH, fontSize: rFS, font: rF, color: rC } = resolveStyle(
        rowStyle,
        boldFont,
        regularFont,
        italicFont,
        boldItalicFont,
        rowLineSpacing
      );

      const wrapped = columns.map(col => {
        let txt = entry.fields[col.field];
        if (Array.isArray(txt)) txt = txt.join(', ');
        if (txt == null) txt = '';
        txt = sanitiseText(txt);
        const maxW = (col.width || DEFAULT_COLUMN_WIDTH) - CELL_PADDING; // right-side padding only
        const words = txt.split(' ');
        const lines = [];
        let ln = '';
        for (const w of words) {
          const test = ln ? `${ln} ${w}` : w;
          if (rF.widthOfTextAtSize(test, rFS) > maxW) {
            if (ln) lines.push(ln);
            ln = w;
          } else ln = test;
        }
        if (ln) lines.push(ln);
        return lines;
      });

      const rowH = Math.max(...wrapped.map(w => w.length)) * rLH;
      checkBreak(rowH);

      if (rowStyle.backgroundColour) {
        const bg = rgbHex(rowStyle.backgroundColour);
        const totalW = columns.reduce((sum, c) => sum + (c.width || DEFAULT_COLUMN_WIDTH), 0);
        const rectY = y - rowH - 3;
        currentPage.drawRectangle({ x: leftMargin, y: rectY, width: totalW, height: rowH, color: bg });
      }

      let xStart = leftMargin;
      for (const lines of wrapped) {
        let ly = y;
        for (const txt of lines) {
          // left-side padding removed: draw at xStart exactly
          currentPage.drawText(txt, { x: xStart, y: ly, size: rFS, font: rF, color: rC });
          ly -= rLH;
        }
        xStart += columns[wrapped.indexOf(lines)].width || DEFAULT_COLUMN_WIDTH;
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
      const { lineHeight: hLH, fontSize: hFS, font: hF, color: hC } = resolveStyle(styles.header || {}, boldFont, regularFont, italicFont, boldItalicFont);
      let hy = pageHeight - topMargin;
      for (const ln of header.text) {
        pg.drawText(sanitiseText(ln), { x: leftMargin, y: hy, size: hFS, font: hF, color: hC });
        hy -= hLH;
      }
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
      const { fontSize: fFS, font: fF, color: fC } = resolveStyle(styles.footer || {}, regularFont, regularFont, italicFont, boldItalicFont);
      const fy = bottomMargin;
      pg.drawText(footer, { x: leftMargin, y: fy, size: fFS, font: fF, color: fC });
      const pgText = `Page ${i + 1} of ${total}`;
      const w = fF.widthOfTextAtSize(pgText, fFS);
      pg.drawText(pgText, { x: (pageWidth - w) / 2, y: fy, size: fFS, font: fF, color: fC });
      const tText = `Document generated ${ts}`;
      const tw = fF.widthOfTextAtSize(tText, fFS);
      pg.drawText(tText, { x: pageWidth - rightMargin - tw, y: fy, size: fFS, font: fF, color: fC });
    }
  }

  return {
    bytes: await pdfDoc.save(),
    filename: jsonData.document.filename.endsWith('.pdf') ? jsonData.document.filename : `${jsonData.document.filename}.pdf`,
    glideAppName: jsonData.glideAppName || 'Glide App Name not set',
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
      color: rgb(0.8, 0.2, 0.2),
      opacity: 0.5,
    });
  }
}