/* eslint-env node */
/* global process */

import { readFile } from 'fs/promises';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { generatePdfBuffer } from './generatepdf.mjs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { merge } from 'lodash-es';

// Firebase Admin init
let db;
try {
  initializeApp({ credential: applicationDefault() });
  db = getFirestore();
} catch {
  console.warn("⚠️ Firebase Admin was already initialized.");
}

// GCP Services
const bucketName = 'generatedpdfs';
const storage = new Storage();
const secretClient = new SecretManagerServiceClient();

// Cloud Function
export const generatePdf = async (req, res) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

    const action = req.query?.action || '';

      if (action === 'getProfileIds') {
    try {
      const snapshot = await db.collection("styleProfiles").get();
      const ids = snapshot.docs.map(doc => ({
        profileId: doc.id,
        name: doc.data()?.name || '(Unnamed)',
      }));

      return res.status(200).json({
        success: true,
        count: ids.length,
        profiles: ids,
        timestamp,
      });
    } catch (err) {
      console.error("❌ Error fetching profile IDs:", err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch profile IDs',
        error: err.message,
        timestamp,
      });
    }
  }

  // 🔐 API Key check
  let expectedKey;
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: process.env.API_KEY_SECRET_NAME
    });
    expectedKey = version.payload.data.toString('utf8').trim();
  } catch (err) {
    console.error('❌ Failed to access API key secret:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal error retrieving API key',
      url: null,
      timestamp,
      executionTimeSeconds: 0
    });
  }

  if (!req.body.api_key || req.body.api_key !== expectedKey) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing API key',
      url: null,
      timestamp,
      executionTimeSeconds: 0
    });
  }

  console.time('Script execution');

  try {
    let jsonInput;
    const hasDocument = req.body && Object.prototype.hasOwnProperty.call(req.body, 'document');

    if (hasDocument) {
      jsonInput = req.body;
    } else {
      const samplePath = path.resolve(process.cwd(), 'JSON/local.json');
      const raw = await readFile(samplePath, 'utf-8');
      jsonInput = JSON.parse(raw);
    }

    // 🔍 Merge Firestore profile if available
    if (jsonInput.profileId) {
      try {
        const profileRef = db.collection("styleProfiles").doc(jsonInput.profileId);
        const profileSnap = await profileRef.get();

        if (profileSnap.exists) {
          const profileData = profileSnap.data();
          const firestoreStyles = profileData.styles || {};

          jsonInput.styles = merge({}, firestoreStyles, jsonInput.styles || {});
          jsonInput.document = merge({}, profileData.document || {}, jsonInput.document || {});
          jsonInput.columns = profileData.columns || [];

          console.log(`🧩 Styles merged from Firestore for profileId "${jsonInput.profileId}":`);
          console.dir(jsonInput.styles, { depth: null });
          console.dir(jsonInput.document, { depth: null });
          console.dir(jsonInput.columns, { depth: null });
        } else {
          const msg = `⚠️ No Firestore profile found for profileId "${jsonInput.profileId}"`;
          console.warn(msg);

          await logPdfEvent({
            timestamp,
            filename: 'not generated',
            url: '',
            userId: req.body.userId || 'unknown userId',
            userEmail: req.body.userEmail || 'unknown email',
            profileId: req.body.profileId || 'unknown profileId',
            success: false,
            errorMessage: msg,
          });

          return res.status(404).json({
            success: false,
            message: msg,
            url: null,
            timestamp,
            executionTimeSeconds: (Date.now() - startTime) / 1000,
          });
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
    const executionTimeSeconds = (Date.now() - startTime) / 1000;

    await logPdfEvent({
      timestamp,
      filename,
      url: publicUrl,
      userId: req.body.userId || 'unknown userId',
      userEmail: req.body.userEmail || 'unknown email',
      profileId: req.body.profileId || 'unknown profileId',
      success: true,
    });

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

    await logPdfEvent({
      timestamp,
      filename: 'not generated',
      url: '',
      userId: req.body.userId || 'unknown userId',
      userEmail: req.body.userEmail || 'unknown email',
      profileId: req.body.profileId || 'unknown profileId',
      success: false,
      errorMessage: err.message,
    });

    res.status(500).json({
      success: false,
      message: `PDF generation failed: ${err.message}`,
      url: null,
      timestamp,
      executionTimeSeconds,
    });
  } finally {
    console.timeEnd('Script execution');
  }
};

// 🧾 Log to Firestore
async function logPdfEvent({ timestamp, filename, url, userId, userEmail, profileId, success, errorMessage }) {
  const logData = {
    timestamp,
    filename,
    url,
    userId,
    userEmail,
    profileId,
    success,
    errorMessage: errorMessage || null,
  };

  await db.collection('pdfCreationLog').add(logData);
}