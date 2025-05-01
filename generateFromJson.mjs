// generateFromJson.mjs - Footer with centered page number and right-aligned timestamp

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch'; // Make sure this is installed via npm if needed

const createSchedulePDF = async () => {
  const jsonPath = path.resolve('./sample.json');
  const jsonData = JSON.parse(await readFile(jsonPath, 'utf8'));

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([
    jsonData.document?.pageSize?.width || 842,
    jsonData.document?.pageSize?.height || 595,
  ]);
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  const leftMargin = jsonData.document?.leftMargin || 50;
  const rightMargin = jsonData.document?.rightMargin || 50;
  const topMargin = jsonData.document?.topMargin || 50;
  const bottomMargin = jsonData.document?.bottomMargin || 50;

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const header = jsonData.document?.header;
  const footer = jsonData.document?.footer;

  // Header logo (right)
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
      console.warn('⚠️ Could not load header logo:', err.message);
    }
  }

  // Header text (left)
  if (header?.text?.length) {
    const style = header.style || {};
    const fontSize = style.fontSize || 10;
    const font = style.fontWeight === 'bold' ? boldFont : regularFont;
    const color = rgbHex(style.colour || '#000000');
    const lineHeight = fontSize + 2;
    let y = pageHeight - topMargin;

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

  // Footer text (one line)
  if (footer?.text) {
    const style = footer.style || {};
    const fontSize = style.fontSize || 10;
    const font = style.fontWeight === 'bold' ? boldFont : regularFont;
    const color = rgbHex(style.colour || '#000000');
    const y = bottomMargin;

    const pageCount = pdfDoc.getPageCount();
    const pageNumberText = `Page 1 of ${pageCount}`;

    const timestampText = `Document generated ${formatTimestamp(new Date())}`;

    const footerTextWidth = font.widthOfTextAtSize(footer.text, fontSize);
    const pageNumberWidth = font.widthOfTextAtSize(pageNumberText, fontSize);
    const timestampWidth = font.widthOfTextAtSize(timestampText, fontSize);

    const centerX = pageWidth / 2 - pageNumberWidth / 2;

    // Left: footer.text
    page.drawText(footer.text, {
      x: leftMargin,
      y,
      size: fontSize,
      font,
      color,
    });

    // Center: page number
    page.drawText(pageNumberText, {
      x: centerX,
      y,
      size: fontSize,
      font,
      color,
    });

    // Right: timestamp
    page.drawText(timestampText, {
      x: pageWidth - rightMargin - timestampWidth,
      y,
      size: fontSize,
      font,
      color,
    });
  }

  const outputName = `${jsonData.document?.filename || 'output'}.pdf`;
  const outputPath = path.resolve(`./${outputName}`);
  const pdfBytes = await pdfDoc.save();
  await writeFile(outputPath, pdfBytes);
  console.log(`✅ PDF written to: ${outputPath}`);
};

// Convert "#RRGGBB" to RGB
function rgbHex(hex) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return rgb(r / 255, g / 255, b / 255);
}

// Format timestamp like "1st May 2.23pm"
function formatTimestamp(date) {
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'long' });
  const hour = date.getHours();
  const minute = date.getMinutes().toString().padStart(2, '0');

  const suffix =
    day % 10 === 1 && day !== 11 ? 'st' :
    day % 10 === 2 && day !== 12 ? 'nd' :
    day % 10 === 3 && day !== 13 ? 'rd' : 'th';

  const formattedHour = hour % 12 || 12;
  const ampm = hour >= 12 ? 'pm' : 'am';

  return `${day}${suffix} ${month} ${formattedHour}.${minute}${ampm}`;
}

createSchedulePDF();