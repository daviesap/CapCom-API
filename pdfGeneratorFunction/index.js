import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { generatePdfBuffer } from './generatepdf.mjs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin init
let db;
try {
  initializeApp({ credential: applicationDefault() });
  db = getFirestore();
} catch (e) {
  console.warn("⚠️ Firebase Admin was already initialized.");
}

// GCP Services
const bucketName = 'generatedpdfs';
const storage = new Storage();
const secretClient = new SecretManagerServiceClient();

// Cloud Function
export const generatePdf = async (req, res) => {
  const startTime = Date.now();

  // 🔐 API Key check
  let expectedKey;
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: process.env.API_KEY_SECRET_NAME
    });
    expectedKey = version.payload.data.toString('utf8').trim();
  } catch (err) {
    console.error('❌ Failed to access API key secret:', err);
    return res.status(500).json({ success: false, message: 'Internal error retrieving API key', url: null, timestamp: new Date().toISOString(), executionTimeSeconds: 0 });
  }

  if (!req.body.api_key || req.body.api_key !== expectedKey) {
    return res.status(403).json({ success: false, message: 'Invalid or missing API key', url: null, timestamp: new Date().toISOString(), executionTimeSeconds: 0 });
  }

  console.time('Script execution');

  try {
    // 📥 Load input JSON
    let jsonInput;
    const hasDocument = req.body && Object.prototype.hasOwnProperty.call(req.body, 'document');

    if (hasDocument) {
      jsonInput = req.body;
    } else {
      const samplePath = path.resolve(process.cwd(), 'JSON/local.json');
      const raw = await readFile(samplePath, 'utf-8');
      jsonInput = JSON.parse(raw);
    }

    // 🔍 If projectId is provided, log styles from Firestore
    if (jsonInput.projectId) {
      try {
        const profileRef = db.collection("styleProfiles").doc(jsonInput.projectId);
        const profileSnap = await profileRef.get();

        if (profileSnap.exists) {
          const profileData = profileSnap.data();
          console.log(`📄 Firestore styles for projectId "${jsonInput.projectId}":`);
          console.dir(profileData.styles, { depth: null });
        } else {
          console.warn(`⚠️ No Firestore profile found for projectId "${jsonInput.projectId}"`);
        }
      } catch (err) {
        console.error("🔥 Error fetching Firestore profile:", err);
      }
    }

    // 📄 Generate PDF
    const { bytes, filename } = await generatePdfBuffer(jsonInput);

    // ☁️ Upload to GCS
    const file = storage.bucket(bucketName).file(filename);
    await file.save(bytes, {
      metadata: {
        contentType: 'application/pdf',
        cacheControl: 'no-cache, max-age=0, no-transform',
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(filename)}`;
    const timestamp = new Date().toISOString();
    const executionTimeSeconds = (Date.now() - startTime) / 1000;

    res.status(200).json({
      success: true,
      message: '✅ PDF generated and uploaded successfully',
      url: publicUrl,
      timestamp,
      executionTimeSeconds,
    });
  } catch (err) {
    const executionTimeSeconds = (Date.now() - startTime) / 1000;
    console.error('❌ Cloud Function error:', err);
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

// 🔍 Optional CLI inspection
if (process.argv.includes('--project')) {
  const idx = process.argv.indexOf('--project');
  const projectId = process.argv[idx + 1];

  if (!projectId) {
    console.error("❌ Please provide a project ID after --project");
    process.exit(1);
  }

  const { initializeApp, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  try {
    initializeApp({ credential: applicationDefault() });
    const db = getFirestore();
    const docRef = db.collection('styleProfiles').doc(projectId);
    const snap = await docRef.get();

    if (!snap.exists) {
      console.error(`❌ No profile found for "${projectId}"`);
      process.exit(1);
    }

    const data = snap.data();
    console.log(`✅ Loaded Firestore profile: "${projectId}"\n`);
    console.dir(data, { depth: null, colors: true });
  } catch (err) {
    console.error("🔥 Error retrieving Firestore profile:", err);
    process.exit(1);
  }
}

// 🔧 Local mode
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