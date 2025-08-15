import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { readFile } from "fs/promises";
import fs from "fs";
import path from "path";
import process from 'process';
import { Buffer } from 'node:buffer';
import { merge } from "lodash-es";
import { generatePdfBuffer } from "./generatepdf.mjs";
import { sanitiseUrl } from "./utils/sanitiseUrl.mjs";
import { filterJson } from "./utils/filterJSON.mjs";
import { sanitiseText } from "./utils/sanitiseText.mjs";

initializeApp({
    credential: applicationDefault(),
    storageBucket: "flair-pdf-generator.firebasestorage.app",
});

const db = getFirestore();
const secretClient = new SecretManagerServiceClient();

const LOCAL_OUTPUT_DIR = path.join(process.cwd(), 'local-emulator', 'output');

// Track if running in emulator mode (available to all functions in this module)
const runningEmulated = !!process.env.FUNCTIONS_EMULATOR || !!process.env.FIREBASE_EMULATOR_HUB;

// Explicit action allowlist
const ACTIONS = {
    GET_PROFILE_IDS: "getProfileIds",
    GENERATE_SNAPSHOT: "generateScheduleSnapshot",
    GENERATE_PDF: "generatePdf",
};

export const generatePdf = onRequest(
    { region: "europe-west2" },
    async (req, res) => {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();

        const action = String(req.query?.action || '').trim();
        const allowed = new Set(Object.values(ACTIONS));

        // 0) Validate action early (no implicit defaults)
        if (!allowed.has(action)) {
            return res.status(400).json({
                success: false,
                message: `Unknown or missing action. Use one of: ${[...allowed].join(', ')}`,
                timestamp,
            });
        }

        // 1) API key is required for ALL actions (including getProfileIds)
        let expectedKey;
        if (runningEmulated) {
            // Use a simple local key when emulated (set LOCAL_API_KEY in your shell)
            expectedKey = process.env.LOCAL_API_KEY || 'dev-key';
        } else {
            try {
                const [version] = await secretClient.accessSecretVersion({
                    name: process.env.API_KEY_SECRET_NAME
                });
                expectedKey = version.payload.data.toString('utf8').trim();
            } catch (err) {
                console.error('❌ Failed to access API key secret:', err);
                return res.status(500).json({ success: false, message: 'Internal error retrieving API key' });
            }
        }

        if (!req.body?.api_key || req.body.api_key !== expectedKey) {
            return res.status(403).json({ success: false, message: 'Invalid or missing API key' });
        }

        // 2) Public (now key-gated) read action
        if (action === ACTIONS.GET_PROFILE_IDS) {
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

        // 3) Shared metadata for generation actions
        const userId = req.body.userId || 'unknown userId';
        const userEmail = req.body.userEmail || 'unknown email';
        const profileId = req.body.profileId || 'unknown profileId';

        try {
            // ---- Load JSON input (body first, fallback to local) ----
            let jsonInput;
            if (req.body?.document) {
                jsonInput = req.body;
            } else {
                const samplePath = path.resolve(process.cwd(), "JSON/local.json");
                const raw = await readFile(samplePath, "utf-8");
                jsonInput = JSON.parse(raw);
            }

            // ---- Optional profile merge from Firestore ----
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
                        await logPdfEvent({ timestamp, filename: 'not generated', url: '', userEmail, profileId, success: false, errorMessage: msg });
                        return res.status(404).json({ success: false, message: msg });
                    }
                } catch (err) {
                    console.error("🔥 Error fetching Firestore profile:", err);
                }
            }

            const appName = jsonInput.glideAppName || "Flair PDF Generator";
            const safeAppName = sanitiseUrl(appName);
            const bucket = getStorage().bucket();

            // 4) Action: generateScheduleSnapshot (HTML + PDF)
            if (action === ACTIONS.GENERATE_SNAPSHOT) {
                try {
                    // a) Generate PDF first so we have a real URL to embed in the HTML
                    const { bytes, filename } = await generatePdfBuffer(jsonInput);
                    const safePdfName = sanitiseUrl(filename);

                    if (runningEmulated) {
                        const pdfDir = path.join(LOCAL_OUTPUT_DIR, 'pdfs', safeAppName);
                        fs.mkdirSync(pdfDir, { recursive: true });
                        const pdfPath = path.join(pdfDir, safePdfName);
                        fs.writeFileSync(pdfPath, bytes);
                    } else {
                        const pdfFile = bucket.file(`pdfs/${safeAppName}/${safePdfName}`);
                        await pdfFile.save(bytes, {
                            metadata: { contentType: "application/pdf", cacheControl: "no-cache, max-age=0, no-transform" },
                        });
                    }

                    const pdfUrl = makePublicUrl(`pdfs/${safeAppName}/${safePdfName}`, bucket);

                    // b) Build inline HTML with a working PDF link
                    let htmlString, htmlFilenameBase;
                    try {
                        const { generateHtmlString } = await import("./generateHtml.mjs");
                        const htmlResult = await generateHtmlString(jsonInput, { pdfUrl });
                        htmlString = htmlResult.htmlString;
                        htmlFilenameBase = htmlResult.htmlFilenameBase;
                    } catch (importErr) {
                        // If the module isn't present yet, return a friendly 501 with guidance
                        console.error("⚠️ generateHtml.mjs not available:", importErr);
                        return res.status(501).json({
                            success: false,
                            message: "generateScheduleSnapshot requires ./generateHtml.mjs (export generateHtmlString).",
                            hint: "Create functions/generateHtml.mjs and export async function generateHtmlString(jsonInput, { pdfUrl })",
                            timestamp,
                        });
                    }

                    const safeHtmlName = sanitiseUrl(`${htmlFilenameBase || 'schedule'}.html`);

                    if (runningEmulated) {
                        const htmlDir = path.join(LOCAL_OUTPUT_DIR, 'html', safeAppName);
                        fs.mkdirSync(htmlDir, { recursive: true });
                        const htmlPath = path.join(htmlDir, safeHtmlName);
                        fs.writeFileSync(htmlPath, Buffer.from(htmlString, "utf8"));
                    } else {
                        const htmlFile = bucket.file(`html/${safeAppName}/${safeHtmlName}`);
                        await htmlFile.save(Buffer.from(htmlString, "utf8"), {
                            metadata: { contentType: "text/html; charset=utf-8", cacheControl: "no-cache, max-age=0, no-transform" },
                        });
                    }

                    const htmlUrl = makePublicUrl(`html/${safeAppName}/${safeHtmlName}`, bucket);

                    // c) Log and respond
                    const executionTimeSeconds = (Date.now() - startTime) / 1000;
                    await logPdfEvent({ timestamp, filename: safePdfName, url: pdfUrl, userEmail, profileId, success: true });

                    return res.status(200).json({
                        success: true,
                        message: "✅ Snapshot HTML and PDF generated",
                        urls: { html: htmlUrl, pdf: pdfUrl },
                        timestamp,
                        executionTimeSeconds,
                    });
                } catch (err) {
                    console.error("❌ Snapshot generation failed:", err);
                    return res.status(500).json({ success: false, message: `Snapshot generation failed: ${err.message}` });
                }
            }

            // 5) Action: generatePdf (PDF only)
            if (action === ACTIONS.GENERATE_PDF) {
                const { bytes, filename } = await generatePdfBuffer(jsonInput);
                const safeFilename = sanitiseUrl(filename);

                if (runningEmulated) {
                    const pdfDir = path.join(LOCAL_OUTPUT_DIR, 'pdfs', safeAppName);
                    fs.mkdirSync(pdfDir, { recursive: true });
                    const pdfPath = path.join(pdfDir, safeFilename);
                    fs.writeFileSync(pdfPath, bytes);
                } else {
                    const file = bucket.file(`pdfs/${safeAppName}/${safeFilename}`);

                    await file.save(bytes, {
                        metadata: {
                            contentType: "application/pdf",
                            cacheControl: "no-cache, max-age=0, no-transform",
                        },
                    });
                }

                // Keep your existing public URL mapping
                const publicUrl = makePublicUrl(`pdfs/${safeAppName}/${safeFilename}`, bucket);

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
                        mergedJson: jsonInput,
                        filteredJson: jsonInput
                    };
                }

                return res.status(200).json(response);
            }

            // Should never reach here due to allowlist
            return res.status(400).json({ success: false, message: 'Unhandled action', action, timestamp });

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
            return res.status(500).json({ success: false, message: `Operation failed: ${err.message}`, executionTimeSeconds });
        }
    });

function makePublicUrl(objectPath, bucket) {
    const encoded = encodeURIComponent(objectPath);
    if (runningEmulated) {
        // Storage emulator REST endpoint
        return `http://127.0.0.1:9199/v0/b/${bucket.name}/o/${encoded}?alt=media`;
    }
    // Prod mapping using your custom domain structure html|pdfs/<safeAppName>/<filename>
    const m = objectPath.match(/^(html|pdfs)\/([^/]+)\/(.+)$/);
    if (m) {
        const [, , safeAppName, safeName] = m;
        return `https://storage.flair.london/${safeAppName}/${safeName}`;
    }
    // Fallback to native GCS URL
    return `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
}

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