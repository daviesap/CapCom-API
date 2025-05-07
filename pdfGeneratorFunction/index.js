// index.js
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { generatePdfBuffer } from './generatepdf.mjs';

const bucketName = 'generatedpdfs';
const storage = new Storage();
const secretClient = new SecretManagerServiceClient();

// Cloud Function
export const generatePdf = async (req, res) => {
  // start timing
  const startTime = Date.now();

  // Log incoming JSON
  //console.log('📦 Incoming payload:', JSON.stringify(req.body));

  // Retrieve expected API key from Secret Manager
  let expectedKey;
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: process.env.API_KEY_SECRET_NAME // e.g. "projects/PROJECT_ID/secrets/API_KEY/versions/latest"
    });
    expectedKey = version.payload.data.toString('utf8').trim();
  } catch (err) {
    console.error('❌ Failed to access API key secret:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal error retrieving API key',
      url: null,
      timestamp: new Date().toISOString(),
      executionTimeSeconds: 0,
    });
  }

  // Validate incoming api_key
  if (!req.body.api_key) {
    return res.status(400).json({
      success: false,
      message: 'Missing API Key',
      url: null,
      timestamp: new Date().toISOString(),
      executionTimeSeconds: 0,
    });
  }
  if (req.body.api_key !== expectedKey) {
    return res.status(403).json({
      success: false,
      message: 'Incorrect API key',
      url: null,
      timestamp: new Date().toISOString(),
      executionTimeSeconds: 0,
    });
  }

  console.time('Script execution');
  try {
    // 1. Detect whether the client sent a top-level `document` key
    const hasDocument =
      req.body &&
      Object.prototype.hasOwnProperty.call(req.body, 'document');

    // 2. If they did, use it; otherwise load local.json
    let jsonInput;
    if (hasDocument) {
      jsonInput = req.body;
    } else {
      const samplePath = path.resolve(process.cwd(), 'JSON/local.json');
      const raw = await readFile(samplePath, 'utf-8');
      jsonInput = JSON.parse(raw);
    }

    // 3. Generate PDF bytes
    const { bytes, filename } = await generatePdfBuffer(jsonInput);

    // 4. Save to GCS without caching (bucket is publicly readable)
    const file = storage.bucket(bucketName).file(filename);
    await file.save(bytes, {
      metadata: {
        contentType: 'application/pdf',
        cacheControl: 'no-cache, max-age=0, no-transform',
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(filename)}`;
    const timestamp = new Date().toISOString();

    // calculate execution time in seconds
    const executionTimeSeconds = (Date.now() - startTime) / 1000;

    // respond with details
    res.status(200).json({
      success: true,
      message: '✅ PDF generated and uploaded successfully',
      url: publicUrl,
      timestamp,
      executionTimeSeconds,
    });
  } catch (err) {
    console.error('❌ Cloud Function error:', err);

    // calculate execution time even on error
    const executionTimeSeconds = (Date.now() - startTime) / 1000;
    res.status(500).json({
      success: false,
      message: `PDF generation failed: ${err.message}`,
      url: null,
      timestamp: new Date().toISOString(),
      executionTimeSeconds,
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
