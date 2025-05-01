// generateFromJson.mjs - Final fix for correct page numbering without overwrite

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

const createSchedulePDF = async () => {
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

  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const header = jsonData.document?.header;
  const footer = jsonData.document?.footer;
  const defaultStyle = jsonData.styles?.defaultRow || {};
  const fontSize = defaultStyle.fontSize || 10;
  const font = defaultStyle.fontWeight?.toLowerCase() === 'bold' ? boldFont : regularFont;
  const fontColor = rgbHex(defaultStyle.fontColour || '#000000');
  const lineHeight = fontSize + 6;

  const pages = [];

  const dummyLines = Array.from({ length: 200 }, () => 'Test line of text to fill the page. This is a placeholder for actual content.');

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  pages.push(currentPage);
  let y = pageHeight - topMargin;

  // Reserve space for header
  if (header?.text?.length) {
    const headerStyle = header.style || {};
    const headerFontSize = headerStyle.fontSize || 10;
    const headerLineHeight = headerFontSize + 2;
    y -= (header.text.length * headerLineHeight) + headerPaddingBottom;
  }

  // Bottom limit for body content
  const footerYLimit = bottomMargin + footerPaddingTop;

  for (const line of dummyLines) {
    if (y < footerYLimit) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      y = pageHeight - topMargin;

      if (header?.text?.length) {
        const headerStyle = header.style || {};
        const headerFontSize = headerStyle.fontSize || 10;
        const headerLineHeight = headerFontSize + 2;
        y -= (header.text.length * headerLineHeight) + headerPaddingBottom;
      }
    }

    currentPage.drawText(line, {
      x: leftMargin,
      y,
      size: fontSize,
      font,
      color: fontColor,
    });
    y -= lineHeight;
  }

  // Draw header/footer on all pages
  const totalPages = pdfDoc.getPageCount();
  const timestamp = new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).replace(',', '');

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];

    // Header text
    if (header?.text?.length) {
      const style = header.style || {};
      const fontSize = style.fontSize || 10;
      const font = style.fontWeight === 'bold' ? boldFont : regularFont;
      const color = rgbHex(style.colour || '#000000');
      let y = pageHeight - topMargin;
      const lineHeight = fontSize + 2;

      for (const line of header.text) {
        page.drawText(line, {
          x: leftMargin,
          y,
          size: fontSize,
          font,
          color,
        });
        y -= lineHeight;
      }
    }

    // Header logo (top-right)
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

    // Footer
    if (footer?.text) {
      const style = footer.style || {};
      const fontSize = style.fontSize || 10;
      const font = style.fontWeight === 'bold' ? boldFont : regularFont;
      const color = rgbHex(style.colour || '#000000');
      const y = bottomMargin;

      // Left-aligned footer text
      page.drawText(footer.text, {
        x: leftMargin,
        y,
        size: fontSize,
        font,
        color,
      });

      // Centered page number
      const pageText = `Page ${i + 1} of ${totalPages}`;
      const textWidth = font.widthOfTextAtSize(pageText, fontSize);
      page.drawText(pageText, {
        x: (pageWidth - textWidth) / 2,
        y,
        size: fontSize,
        font,
        color,
      });

      // Right-aligned timestamp
      const timestampWidth = font.widthOfTextAtSize(`Document generated ${timestamp}`, fontSize);
      page.drawText(`Document generated ${timestamp}`, {
        x: pageWidth - rightMargin - timestampWidth,
        y,
        size: fontSize,
        font,
        color,
      });
    }
  }

  // Save and write the PDF
  const outputName = `${jsonData.document?.filename || 'output'}.pdf`;
  const outputPath = path.resolve(`./${outputName}`);
  const pdfBytes = await pdfDoc.save();
  await writeFile(outputPath, pdfBytes);
  console.log(`✅ PDF written to: ${outputPath}`);
};

function rgbHex(hex) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return rgb(
    ((bigint >> 16) & 255) / 255,
    ((bigint >> 8) & 255) / 255,
    (bigint & 255) / 255
  );
}

createSchedulePDF();