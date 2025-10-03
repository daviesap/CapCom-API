#!/usr/bin/env node
import path from 'path';
import process from 'process';
import { generateHomeHandler } from '../generateSchedules/generateHomeHandler.mjs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

(async () => {
  try {
    // Make working dir the functions folder so relative asset paths resolve the same as runtime
    // Only change dir if we're not already in the functions folder (avoid functions/functions)
    if (path.basename(process.cwd()) !== 'functions') {
      process.chdir(path.join(process.cwd(), 'functions'));
    }
    const req = {
      body: {
        glideAppName: 'TestApp',
        event: { name: 'TestEvent' },
        // no snapshots -> handler should still generate a MOM page
        snapshots: [],
      },
      get: () => null,
    };

    const res = {
      _status: 200,
      status(code) { this._status = code; return this; },
      json(obj) { console.log('HANDLER RESPONSE:', JSON.stringify({ status: this._status, body: obj }, null, 2)); }
    };

    // Minimal fake Firestore-like object (no profiles will be found)
    const db = {
      collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) })
    };

    // bucket is not used in emulated mode, but provide a minimal stub
    const bucket = { name: 'local-bucket' };

    // Ensure local output dir exists
    const LOCAL_OUTPUT_DIR = path.join(process.cwd(), 'local-emulator', 'output');

  // Initialize admin app (use a dummy storageBucket name for local writes)
  initializeApp({ credential: applicationDefault(), storageBucket: 'flair-pdf-generator.firebasestorage.app' });
  // Optional: verify storage access
  getStorage();

  const result = await generateHomeHandler({
      req,
      res,
      db,
      bucket,
      runningEmulated: true,
      LOCAL_OUTPUT_DIR,
      makePublicUrl: (objectPath, bucket) => {
        const encoded = encodeURIComponent(objectPath);
        // emulated: return emulator REST endpoint
        return `http://127.0.0.1:9199/v0/b/${bucket.name}/o/${encoded}?alt=media`;
      },
      startTime: Date.now(),
      timestamp: new Date().toISOString(),
      userEmail: 'test@example.com',
      userId: 'test-user',
      profileId: '',
      glideAppName: 'TestApp',
      logToGlide: async (p) => { console.log('logToGlide called:', p); return null; },
      safeAppName: 'TestApp',
      safeEventName: 'TestEvent'
    });

    // If the handler used res.status(...).json it will have logged; also show any returned value
    if (result) console.log('DIRECT RETURN:', result);
  } catch (e) {
    console.error('Test harness error:', e);
    process.exitCode = 2;
  }
})();
