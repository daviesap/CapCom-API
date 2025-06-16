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
import { filterJson } from "./utils/filterJSON.mjs";
import { sanitiseText } from "./utils/sanitiseText.mjs";

console.log("🟢 LIVE FUNCTION v2 IS RUNNING - Fully updated");

initializeApp({
    credential: applicationDefault(),
    storageBucket: "flair-pdf-generator.firebasestorage.app",
});

const db = getFirestore();
const secretClient = new SecretManagerServiceClient();

export const generatePdf = onRequest(
    { region: "europe-west2" },
    async (req, res) => {
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

        const userId = req.body.userId || 'unknown userId';
        const userEmail = req.body.userEmail || 'unknown email';
        const profileId = req.body.profileId || 'unknown profileId';

        try {
            let jsonInput;
            if (req.body?.document) {
                jsonInput = req.body;
            } else {
                const samplePath = path.resolve(process.cwd(), "JSON/local.json");
                const raw = await readFile(samplePath, "utf-8");
                jsonInput = JSON.parse(raw);
            }

            let profileData = {};
            let firestoreStyles = {};

            if (jsonInput.profileId) {
                try {
                    const profileRef = db.collection("styleProfiles").doc(jsonInput.profileId);
                    const profileSnap = await profileRef.get();

                    if (profileSnap.exists) {
                        profileData = profileSnap.data();
                        firestoreStyles = profileData.styles || {};

                        jsonInput.styles = merge({}, firestoreStyles, jsonInput.styles || {});
                        jsonInput.document = merge({}, profileData.document || {}, jsonInput.document || {});
                        jsonInput.columns = profileData.columns || [];

                        jsonInput = filterJson(jsonInput);
                        sanitiseJsonFields(jsonInput);

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

            const publicUrl = `https://storage.flair.london/${safeAppName}/${safeFilename}`;

            const executionTimeSeconds = (Date.now() - startTime) / 1000;

            await logPdfEvent({
                timestamp,
                filename: safeFilename,
                url: publicUrl,
                userId,
                userEmail,
                profileId,
                success: true
            });

            const response = {
                success: true,
                message: "✅ PDF generated and uploaded successfully",
                url: publicUrl,
                timestamp,
                executionTimeSeconds,
            };

            if (jsonInput.debug === true) {
                response.debug = {
                    inputJson: req.body,
                    firestoreProfile: {
                        styles: firestoreStyles,
                        document: profileData.document || {},
                        columns: profileData.columns || []
                    },
                    mergedJson: jsonInput,  // Already merged, filtered and sanitised at this point
                    filteredJson: jsonInput
                };
            }

            res.status(200).json(response);

        } catch (err) {
            const executionTimeSeconds = (Date.now() - startTime) / 1000;
            console.error("❌ Cloud Function error:", err);
            await logPdfEvent({
                timestamp,
                filename: "not generated",
                url: "",
                userId,
                userEmail,
                profileId,
                success: false,
                errorMessage: err.message
            });
            res.status(500).json({ success: false, message: `PDF generation failed: ${err.message}`, executionTimeSeconds });
        }
    });

async function logPdfEvent({ timestamp, filename, url, userEmail, profileId, success, errorMessage }) {
    const logData = {
        timestamp,
        filename,
        url,
        userEmail,
        profileId,
        success,
        errorMessage: errorMessage || null,
    };
    await db.collection("pdfCreationLog").add(logData);
}

// 🔧 Sanitiser helper
function sanitiseJsonFields(jsonData) {
    if (jsonData?.document?.title) {
        jsonData.document.title = sanitiseText(jsonData.document.title);
    }

    if (Array.isArray(jsonData.groups)) {
        jsonData.groups.forEach(group => {
            if (group?.title) {
                group.title = sanitiseText(group.title);
            }

            if (Array.isArray(group.entries)) {
                group.entries.forEach(entry => {
                    if (entry?.fields?.description) {
                        entry.fields.description = sanitiseText(entry.fields.description);
                    }
                });
            }
        });
    }
}