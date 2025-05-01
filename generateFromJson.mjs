// generateFromJson.mjs
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile } from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { readFileSync } from 'node:fs';

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

  if (header?.text?.length) {
    const { lineHeight: headerLineHeight } = resolveStyle(header.style || {}, boldFont, regularFont);
    y -= (header.text.length * headerLineHeight) + headerPaddingBottom;
  }

  const footerYLimit = bottomMargin + footerPaddingTop;

  const checkSpaceAndAddPage = (linesNeeded = 1) => {
    if (y - linesNeeded * lineHeight < footerYLimit) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      y = pageHeight - topMargin;
      if (header?.text?.length) {
        const { lineHeight: headerLineHeight } = resolveStyle(header.style || {}, boldFont, regularFont);
        y -= (header.text.length * headerLineHeight) + headerPaddingBottom;
      }
    }
  };

  for (const group of jsonData.groups) {
    const { fontSize: titleFontSize, font: titleFont, color: titleColor, lineHeight: titleLineHeight } = resolveStyle(groupTitleStyle, boldFont, regularFont);
    checkSpaceAndAddPage(2);
    currentPage.drawText(group.groupTitle, {
      x: leftMargin,
      y,
      size: titleFontSize,
      font: titleFont,
      color: titleColor,
    });
    y -= titleLineHeight;

    const { fontSize: metaFontSize, font: metaFont, color: metaColor, lineHeight: metaLineHeight, paddingBottom: metaPaddingBottom } = resolveStyle(groupMetadataStyle, boldFont, regularFont);
    currentPage.drawText(group.groupMetadata, {
      x: leftMargin,
      y,
      size: metaFontSize,
      font: metaFont,
      color: metaColor,
    });
    y -= metaLineHeight + metaPaddingBottom;

    for (const entry of group.groupContent) {
      const { rows } = entry;
      checkSpaceAndAddPage(1);
      let x = leftMargin;
      for (const col of columns) {
        let text = rows[col.field];
        if (Array.isArray(text)) text = text.join(', ');
        if (text === undefined || text === null) text = '';
        currentPage.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: fontColor,
        });
        x += col.width || 100;
      }
      y -= lineHeight;
    }

    y -= groupPaddingBottom;
  }

  const totalPages = pdfDoc.getPageCount();
  const timestamp = new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).replace(',', '');

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
