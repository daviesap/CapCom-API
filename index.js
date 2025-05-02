// index.js
import { writeFile } from 'fs/promises';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { generatePdfBuffer } from './generatepdf.mjs';

const bucketName = 'generatedpdfs';
const storage = new Storage();

// Cloud Function
export const generatePdf = async (req, res) => {
  console.time('Script execution');
  try {
    const jsonInput = req.body;
    const { bytes, filename } = await generatePdfBuffer(jsonInput);
    const file = storage.bucket(bucketName).file(filename);

    await file.save(bytes, { contentType: 'application/pdf' });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(filename)}`;
    const timestamp = new Date().toISOString(); // ISO format, can be adjusted if needed

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
      timestamp: new Date().toISOString()
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