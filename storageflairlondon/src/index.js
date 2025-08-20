// Cloudflare Worker for snapshots.capcom.london
// Public: https://snapshots.capcom.london/<App>/<file>
// Upstream: https://firebasestorage.googleapis.com/v0/b/<BUCKET>/o/snapshots%2F<App>%2F<file>?alt=media[&token=...]

const BUCKET = "flair-pdf-generator.firebasestorage.app";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

function defaultCacheHeaders(objectPath, incoming, isFreshBypass) {
  const ext = (objectPath.split(".").pop() || "").toLowerCase();
  const h = new Headers(incoming);

  if (isFreshBypass) {
    h.set("Cache-Control", "no-store");
    h.set("Pragma", "no-cache");
    h.set("Expires", "0");
    return h;
  }

  // If origin didn’t specify, choose sensible defaults
  if (!h.get("Cache-Control")) {
    if (ext === "html" || ext === "htm") {
      h.set("Cache-Control", "public, max-age=0, must-revalidate");
    } else if (ext === "pdf") {
      h.set("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      h.set("Cache-Control", "public, max-age=3600");
    }
  }
  return h;
}

async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const objectPath = url.pathname.replace(/^\/+/, ""); // e.g. "CapcomDemo/schedule.html"
    const token = url.searchParams.get("token") || "";
    const debug = url.searchParams.get("debug") === "1";
    const fresh = url.searchParams.get("fresh") === "1";

    if (!objectPath) {
      return new Response("File not specified", { status: 400 });
    }

    // Map clean public path → bucket path under "snapshots/"
    const upstreamPath = `snapshots/${objectPath}`;

    const qs = new URLSearchParams({ alt: "media" });
    if (token) qs.set("token", token);

    const gcsUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(upstreamPath)}?${qs.toString()}`;

    // Debug helper: show where we'd fetch from
    if (debug) {
      return new Response(JSON.stringify({ ok: true, objectPath, upstreamPath, gcsUrl }, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // Forward conditional headers for 304s
    const upstream = await fetch(gcsUrl, {
      headers: {
        "If-None-Match": request.headers.get("If-None-Match") || "",
        "If-Modified-Since": request.headers.get("If-Modified-Since") || "",
      },
      cf: fresh ? { cacheTtl: 0, cacheEverything: true } : undefined,
    });

    // Pass 304 straight through
    if (upstream.status === 304) {
      const headers = defaultCacheHeaders(objectPath, upstream.headers, fresh);
      if (!headers.get("Cache-Control")) {
        headers.set("Cache-Control", "public, max-age=0, must-revalidate");
      }
      return new Response(null, { status: 304, statusText: upstream.statusText, headers });
    }

    // Bubble errors with context
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "Upstream error", status: upstream.status, objectPath, upstreamPath, gcsUrl, text }),
        { status: upstream.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
      );
    }

    // Success: stream body and apply sane defaults if origin didn't
    const headers = defaultCacheHeaders(objectPath, upstream.headers, fresh);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (err) {
    return new Response("Worker error: " + err.message, { status: 500 });
  }
}