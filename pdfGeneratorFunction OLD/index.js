import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { readFile } from "fs/promises";
import path from "path";
import process from 'process';
import { merge } from "lodash-es";
import { generatePdfBuffer } from "./generatepdf.mjs";
import { sanitiseUrl } from "./utils/sanitiseUrl.mjs";

initializeApp({
  credential: applicationDefault(),
  storageBucket: "flair-pdf-generator.firebasestorage.app",
});

const db = getFirestore();
const secretClient = new SecretManagerServiceClient();

export const generatePdf = onRequest(async (req, res) => {
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

  let expectedKey;
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: process.env.API_KEY_SECRET_NAME
    });
    expectedKey = version.payload.data.toString('utf8').trim();
  } catch (err) {
    console.error('❌ Failed to access API key secret:', err);
    return res.status(500).json({ success: false, message: 'Internal error retrieving API key' });
  }

  if (!req.body.api_key || req.body.api_key !== expectedKey) {
    return res.status(403).json({ success: false, message: 'Invalid or missing API key' });
  }

  try {
    let jsonInput;
    if (req.body?.document) {
      jsonInput = req.body;
    } else {
      const samplePath = path.resolve(process.cwd(), "JSON/local.json");
      const raw = await readFile(samplePath, "utf-8");
      jsonInput = JSON.parse(raw);
    }

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
        } else {
          const msg = `⚠️ No Firestore profile found for profileId "${jsonInput.profileId}"`;
          console.warn(msg);
          await logPdfEvent({ timestamp, filename: 'not generated', url: '', success: false, errorMessage: msg });
          return res.status(404).json({ success: false, message: msg });
        }
      } catch (err) {
        console.error("🔥 Error fetching Firestore profile:", err);
      }
    }

    const appName = jsonInput.glideAppName || "Flair PDF Generator";
    const safeAppName = sanitiseUrl(appName);
    const { bytes, filename } = await generatePdfBuffer(jsonInput);
    const safeFilename = sanitiseUrl(filename);
    const bucket = getStorage().bucket();
    const file = bucket.file(`pdfs/${safeAppName}/${safeFilename}`);

    await file.save(bytes, {
      metadata: {
        contentType: "application/pdf",
        cacheControl: "no-cache, max-age=0, no-transform",
      },
    });

    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    const executionTimeSeconds = (Date.now() - startTime) / 1000;
    await logPdfEvent({ timestamp, filename: safeFilename, url: signedUrl, success: true });
    res.status(200).json({
      success: true,
      message: "✅ PDF generated and uploaded successfully",
      url: signedUrl,
      timestamp,
      executionTimeSeconds,
    });

  } catch (err) {
    const executionTimeSeconds = (Date.now() - startTime) / 1000;
    console.error("❌ Cloud Function error:", err);
    await logPdfEvent({ timestamp, filename: "not generated", url: "", success: false, errorMessage: err.message });
    res.status(500).json({ success: false, message: `PDF generation failed: ${err.message}`, executionTimeSeconds });
  }
});

// 🧾 Log to Firestore
async function logPdfEvent({ timestamp, filename, url, success, errorMessage }) {
  const db = getFirestore();
  const logData = {
    timestamp,
    filename,
    url,
    success,
    errorMessage: errorMessage || null,
  };
  await db.collection("pdfCreationLog").add(logData);
}