import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { writeFile } from 'fs/promises';
import path from 'path';

const createHighlightedPDF = async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 Portrait (width x height)

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 24;
  const text = 'Hello world';

  const x = 100;
  const y = 750;
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = fontSize * 1.2;

  // Draw yellow rectangle as background (highlight)
  page.drawRectangle({
    x,
    y: y - fontSize * 0.25,
    width: textWidth,
    height: textHeight,
    color: rgb(1, 1, 0), // Yellow
  });

  // Draw the text on top
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0, 0, 0), // Black
  });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.resolve('./highlighted-text.pdf');
  await writeFile(outputPath, pdfBytes);
  console.log(`✅ Highlighted PDF written to: ${outputPath}`);
};

createHighlightedPDF();