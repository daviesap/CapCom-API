// index.js (ES Module) — Sample PDF generator using pdf-lib

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

// Mock JSON data (simplified from your structure)
const mockData = {
  date: 'Sunday 30 March 2025',
  entries: [
    { time: '08:00', item: 'Setup', location: 'Main Hall' },
    { time: '09:00', item: 'Sound Check', location: 'Main Hall' },
    { time: '10:00', item: 'Opening Remarks', location: 'Stage A' },
    { time: '11:00', item: 'Panel: AV Technology', location: 'Stage B' },
    { time: '12:00', item: 'Break', location: 'Lounge' }
  ]
};

const A4_WIDTH = 595;
const A4_HEIGHT = 842;

const createMockSchedulePDF = async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = 780;

  // Title
  page.drawText('AV Schedule Preview', {
    x: 50,
    y,
    size: 20,
    font,
    color: rgb(0, 0, 0),
  });

  y -= 30;

  // Date header
  page.drawText(mockData.date, {
    x: 50,
    y,
    size: 16,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 25;

  // Table headers
  page.drawText('Time', { x: 50, y, size: 12, font });
  page.drawText('Item', { x: 150, y, size: 12, font });
  page.drawText('Location', { x: 400, y, size: 12, font });

  y -= 20;

  // Draw table entries
  for (const entry of mockData.entries) {
    if (y < 60) {
      // Add a new page if needed
      const newPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      y = 780;
      newPage.drawText(mockData.date + ' (cont.)', { x: 50, y, size: 14, font });
      y -= 30;
    }

    page.drawText(entry.time, { x: 50, y, size: 12, font: fontRegular });
    page.drawText(entry.item, { x: 150, y, size: 12, font: fontRegular });
    page.drawText(entry.location, { x: 400, y, size: 12, font: fontRegular });
    y -= 20;
  }

  // Page number footer
  const pages = pdfDoc.getPages();
  pages.forEach((p, index) => {
    p.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: A4_WIDTH - 100,
      y: 20,
      size: 10,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.resolve('./mock-schedule.pdf');
  await writeFile(outputPath, pdfBytes);
  console.log(`✅ PDF written to: ${outputPath}`);
};

createMockSchedulePDF();
