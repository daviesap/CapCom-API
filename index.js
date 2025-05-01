// index.js
import { writeFile } from 'fs/promises';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { generatePdfBuffer } from './generateFromJson.mjs';

//import { writeLog } from './utils/logging.mjs';

const bucketName = 'generatedpdfs';
const storage = new Storage();

// 👇 Exported for Google Cloud Function use
export const generatePdf = async (req, res) => {
  try {
    const { bytes, filename } = await generatePdfBuffer();
    const file = storage.bucket(bucketName).file(filename);

    await file.save(bytes, {
      contentType: 'application/pdf',
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
    res.status(200).json({ message: '✅ PDF uploaded', url: publicUrl });


    //Log the successful upload
    await writeLog({
      logName: 'pdf-generator-log',
      severity: 'INFO',
      functionName: 'generatePdf',
      message: 'PDF Uploaded'
    });

  } catch (err) {
    console.error('❌ Cloud Function error:', err);
    res.status(500).send('Failed to generate PDF.');
  }
};

// 👇 Local CLI mode: run with `node index.js --local`
if (process.argv.includes('--local')) {
  (async () => {
    try {
      const { bytes, filename } = await generatePdfBuffer();
      const outputPath = path.resolve(`./${filename}`);
      await writeFile(outputPath, bytes);
      console.log(`✅ PDF saved locally: ${outputPath}`);
    } catch (err) {
      console.error('❌ Local run error:', err);
    }
  })();
}