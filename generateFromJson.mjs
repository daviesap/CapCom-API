// generateFromJson.mjs - Header/Footer with margins, alignment, page size

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const createSchedulePDF = async () => {
  const jsonPath = path.resolve('./sample.json');
  const jsonData = JSON.parse(await readFile(jsonPath, 'utf8'));

  const pageWidth = jsonData.document?.pageSize?.width || 842;
  const pageHeight = jsonData.document?.pageSize?.height || 595;

  const leftMargin = jsonData.document?.leftMargin || 50;
  const rightMargin = jsonData.document?.rightMargin || 50;
  const topMargin = jsonData.document?.topMargin || 50;
  const bottomMargin = jsonData.document?.bottomMargin || 50;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const header = jsonData.document?.header;
  const footer = jsonData.document?.footer;

  // Draw header text
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

  // Draw footer text and page number on same line
  if (footer?.text) {
    const style = footer.style || {};
    const fontSize = style.fontSize || 10;
    const font = style.fontWeight === 'bold' ? boldFont : regularFont;
    const color = rgbHex(style.colour || '#000000');
    const y = bottomMargin;

    // Left-aligned text
    page.drawText(footer.text, {
      x: leftMargin,
      y,
      size: fontSize,
      font,
      color,
    });

    // Right-aligned page number
    const pageCount = pdfDoc.getPageCount();
    const pageNumber = `Page 1 of ${pageCount}`;
    const pageNumberWidth = font.widthOfTextAtSize(pageNumber, fontSize);
    page.drawText(pageNumber, {
      x: pageWidth - rightMargin - pageNumberWidth,
      y,
      size: fontSize,
      font,
      color,
    });
  }

  // Save and write the PDF
  const outputName = `${jsonData.document?.filename || 'output'}.pdf`;
  const outputPath = path.resolve(`./${outputName}`);
  const pdfBytes = await pdfDoc.save();
  await writeFile(outputPath, pdfBytes);
  console.log(`✅ PDF written to: ${outputPath}`);
};

// Convert hex color string to rgb()
function rgbHex(hex) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return rgb(r / 255, g / 255, b / 255);
}

createSchedulePDF();