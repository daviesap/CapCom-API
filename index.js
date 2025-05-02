// index.js
import { readFile, writeFile } from 'fs/promises';    // ← added readFile
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { generatePdfBuffer } from './generatepdf.mjs';

const bucketName = 'generatedpdfs';
const storage = new Storage();

// Cloud Function
export const generatePdf = async (req, res) => {
  console.time('Script execution');
  try {
    // 1. Detect whether the client sent a top-level `document` key
    const hasDocument =
      req.body &&
      Object.prototype.hasOwnProperty.call(req.body, 'document');

    // 2. If they did, use it; otherwise load your local.json
    let jsonInput;
    if (hasDocument) {
      jsonInput = req.body;
    } else {
      const samplePath = path.resolve(process.cwd(), 'local.json');
      const raw       = await readFile(samplePath, 'utf-8');
      jsonInput       = JSON.parse(raw);
    }

    // 3. Now pass a real object into your generator every time
    const { bytes, filename } = await generatePdfBuffer(jsonInput);

    // 4. Save to GCS
    const file = storage.bucket(bucketName).file(filename);
    await file.save(bytes, { contentType: 'application/pdf' });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(filename)}`;
    const timestamp = new Date().toISOString();

    res.status(200).json({
      success: true,
      message: '✅ PDF generated and uploaded successfully',
      url: publicUrl,
      timestamp,
    });

  } catch (err) {
    console.error('❌ Cloud Function error:', err);
    res.status(500).json({
      success: false,
      message: `PDF generation failed: ${err.message}`,
      url: null,
      timestamp: new Date().toISOString(),
    });
  } finally {
    console.timeEnd('Script execution');
  }
};

// Local mode
if (process.argv.includes('--local')) {
  (async () => {
    console.time('Script execution');
    try {
      // In local mode we still call generatePdfBuffer() with no args
      const { bytes, filename } = await generatePdfBuffer();
      const outputPath = path.resolve(`./pdfoutput/${filename}`);
      await writeFile(outputPath, bytes);
      console.log(`✅ PDF saved locally: ${outputPath}`);
    } catch (err) {
      console.error('❌ Local run error:', err);
    } finally {
      console.timeEnd('Script execution');
    }
  })();
}