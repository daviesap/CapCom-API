// generateFromJson.mjs
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile } from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { readFileSync } from 'node:fs';
import { getFormattedTimestamp } from './utils/timestamp.mjs';

function rgbHex(hex) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return rgb(((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255);
}

function resolveStyle(style, boldFont, regularFont) {
  const fontSize = style.fontSize || 10;
  const font = (style.fontWeight || '').toLowerCase() === 'bold' ? boldFont : regularFont;
  const color = rgbHex(style.colour || style.fontColour || '#000000');
  const lineHeight = fontSize + 2;
  const paddingBottom = style.paddingBottom || 0;
  return { fontSize, font, color, lineHeight, paddingBottom };
}

export const generatePdfBuffer = async () => {
  const jsonPath = path.resolve('./sample.json');
  const jsonData = JSON.parse(await readFile(jsonPath, 'utf8'));

  const pageWidth = jsonData.document?.pageSize?.width || 842;
  const pageHeight = jsonData.document?.pageSize?.height || 595;
  const leftMargin = jsonData.document?.leftMargin || 50;
  const rightMargin = jsonData.document?.rightMargin || 50;
  const topMargin = jsonData.document?.topMargin || 50;
  const bottomMargin = jsonData.document?.bottomMargin || 50;
  const headerPaddingBottom = jsonData.document?.headerPaddingBottom || 10;
  const footerPaddingTop = jsonData.document?.footerPaddingTop || 10;
  const groupPaddingBottom = jsonData.document?.groupPaddingBottom || 0;
  const bottomPageThreshold = jsonData.document?.bottomPageThreshold || 0;

  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const header = jsonData.document?.header;
  const footer = jsonData.document?.footer;
  const defaultStyle = jsonData.styles?.defaultRow || {};
  const groupTitleStyle = jsonData.styles?.groupTitle || {};
  const groupMetadataStyle = jsonData.styles?.groupMetadata || {};
  const { fontSize, font, color: fontColor, lineHeight } = resolveStyle(defaultStyle, boldFont, regularFont);

  const columns = jsonData.columns || [];

  const pages = [];
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  pages.push(currentPage);
  let y = pageHeight - topMargin;

  const drawHeader = () => {
    if (header?.text?.length) {
      const { lineHeight: headerLineHeight } = resolveStyle(header.style || {}, boldFont, regularFont);
      y -= (header.text.length * headerLineHeight) + headerPaddingBottom;
    }
  };

  drawHeader();

  const footerYLimit = bottomMargin + footerPaddingTop;

  const checkSpaceAndAddPage = (linesNeeded = 1) => {
    if (y - linesNeeded * lineHeight < footerYLimit) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      y = pageHeight - topMargin;
      drawHeader();
    }
  };

  for (const group of jsonData.groups) {
    const { fontSize: titleFontSize, font: titleFont, color: titleColor, lineHeight: titleLineHeight } = resolveStyle(groupTitleStyle, boldFont, regularFont);
    const { fontSize: metaFontSize, font: metaFont, color: metaColor, lineHeight: metaLineHeight, paddingBottom: metaPaddingBottom } = resolveStyle(groupMetadataStyle, boldFont, regularFont);

    const linesNeededForGroupIntro = titleLineHeight + metaLineHeight + metaPaddingBottom;
    if (y - linesNeededForGroupIntro < bottomPageThreshold) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      y = pageHeight - topMargin;
      drawHeader();
    }

    currentPage.drawText(group.groupTitle, {
      x: leftMargin,
      y,
      size: titleFontSize,
      font: titleFont,
      color: titleColor,
    });
    y -= titleLineHeight;

    currentPage.drawText(group.groupMetadata, {
      x: leftMargin,
      y,
      size: metaFontSize,
      font: metaFont,
      color: metaColor,
    });
    y -= metaLineHeight + metaPaddingBottom;

    // Check if any column has showLabel = true
    const labelRowStyle = jsonData.styles?.labelRow || {};
    const { fontSize: labelFontSize, font: labelFont, color: labelColor, lineHeight: labelLineHeight } = resolveStyle(labelRowStyle, boldFont, regularFont);
    
    const shouldShowLabels = columns.some(col => col.showLabel);
    if (shouldShowLabels) {
      checkSpaceAndAddPage(1);
      let x = leftMargin;
      for (const col of columns) {
        if (col.showLabel) {
          currentPage.drawText(col.label || '', {
            x,
            y,
            size: labelFontSize,
            font: labelFont,
            color: labelColor,
          });
        }
        x += col.width || 100;
      }
      y -= labelLineHeight;
    }

    for (const entry of group.groupContent) {
        const { rows } = entry;
      
        // Store how many lines each column needs
        const lineCounts = [];
      
        // First pass: wrap all column text and count lines
        const wrappedColumns = columns.map(col => {
          let text = rows[col.field];
          if (Array.isArray(text)) text = text.join(', ');
          if (text === undefined || text === null) text = '';
      
          const maxWidth = col.width || 100;
          const words = text.split(' ');
          const lines = [];
          let line = '';
      
          for (const word of words) {
            const testLine = line ? `${line} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);
            if (testWidth > maxWidth) {
              if (line) lines.push(line);
              line = word;
            } else {
              line = testLine;
            }
          }
          if (line) lines.push(line);
      
          lineCounts.push(lines.length);
          return lines;
        });
      
        const rowHeight = Math.max(...lineCounts) * lineHeight;
        checkSpaceAndAddPage(rowHeight / lineHeight);  // convert height back to line count
      
        // Second pass: render the wrapped lines
        let x = leftMargin;
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const lines = wrappedColumns[i];
          let lineY = y;
          for (const line of lines) {
            currentPage.drawText(line, {
              x,
              y: lineY,
              size: fontSize,
              font,
              color: fontColor,
            });
            lineY -= lineHeight;
          }
          x += col.width || 100;
        }
      
        y -= rowHeight;
      }

    y -= groupPaddingBottom;
  }

  const totalPages = pdfDoc.getPageCount();

  //Get friendly timestamp
  const timestamp = getFormattedTimestamp();

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];

    if (header?.text?.length) {
      const { fontSize, font, color, lineHeight } = resolveStyle(header.style || {}, boldFont, regularFont);
      let headerY = pageHeight - topMargin;
      for (const line of header.text) {
        page.drawText(line, {
          x: leftMargin,
          y: headerY,
          size: fontSize,
          font,
          color,
        });
        headerY -= lineHeight;
      }
    }

    if (header?.logo?.url) {
      try {
        const logoRes = await fetch(header.logo.url);
        const logoBytes = await logoRes.arrayBuffer();
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoWidth = header.logo.width || 100;
        const logoHeight = header.logo.height || 40;
        const logoX = pageWidth - logoWidth - rightMargin;
        const logoY = pageHeight - logoHeight - topMargin;

        page.drawImage(logoImage, {
          x: logoX,
          y: logoY,
          width: logoWidth,
          height: logoHeight,
        });
      } catch (err) {
        console.warn('⚠️ Could not load logo:', err.message);
      }
    }

    if (footer?.text) {
      const { fontSize, font, color } = resolveStyle(footer.style || {}, boldFont, regularFont);
      const y = bottomMargin;

      page.drawText(footer.text, {
        x: leftMargin,
        y,
        size: fontSize,
        font,
        color,
      });

      const pageText = `Page ${i + 1} of ${totalPages}`;
      const textWidth = font.widthOfTextAtSize(pageText, fontSize);
      page.drawText(pageText, {
        x: (pageWidth - textWidth) / 2,
        y,
        size: fontSize,
        font,
        color,
      });

      const timestampText = `Document generated ${timestamp}`;
      const timestampWidth = font.widthOfTextAtSize(timestampText, fontSize);
      page.drawText(timestampText, {
        x: pageWidth - rightMargin - timestampWidth,
        y,
        size: fontSize,
        font,
        color,
      });
    }
  }

  return {
    bytes: await pdfDoc.save(),
    filename: jsonData.document?.filename?.endsWith('.pdf')
      ? jsonData.document.filename
      : `${jsonData.document?.filename || 'output'}.pdf`
  };
};

export function getOutputFilename() {
  const jsonPath = path.resolve('./sample.json');
  const rawData = readFileSync(jsonPath, 'utf8');
  const jsonData = JSON.parse(rawData);
  return jsonData.document?.filename?.endsWith('.pdf')
    ? jsonData.document.filename
    : `${jsonData.document?.filename || 'output'}.pdf`;
}