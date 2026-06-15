// Cloudflare Worker for vox.capcom.london + snapshots.capcom.london
// - vox:       https://vox.capcom.london/<app>/<event>/<file>
//              → gs://<bucket>/public/<app>/<event>/<file>
// - snapshots: https://snapshots.capcom.london/<App>/<file>
//              → gs://<bucket>/snapshots/<App>/<file>

const BUCKET = "flair-pdf-generator.firebasestorage.app";
const FIREBASE_API_KEY = "AIzaSyAx_vNVLuJzqvPttp4r3j_ljB7kpSg2Ev0";
const LOGIN_URL = "https://admin.capcom.london/login.html";
const SESSION_COOKIE = "__Host-vox_session";
const SESSION_ORIGINS = new Set([
  "https://admin.capcom.london",
]);

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

function defaultCacheHeaders(objectPath, incoming, isFreshBypass, isProtected = false) {
  const ext = (objectPath.split(".").pop() || "").toLowerCase();
  const h = new Headers(incoming);

  if (isProtected) {
    h.set("Cache-Control", "private, no-store");
    h.set("Pragma", "no-cache");
    h.set("Expires", "0");
    return h;
  }

  if (isFreshBypass) {
    h.set("Cache-Control", "no-store");
    h.set("Pragma", "no-cache");
    h.set("Expires", "0");
    return h;
  }

  // If origin didn’t specify, choose sensible defaults
  if (!h.get("Cache-Control")) {
    if (ext === "html" || ext === "htm") {
      h.set("Cache-Control", "public, max-age=0, must-revalidate"); // revalidate each time
    } else if (ext === "pdf") {
      h.set("Cache-Control", "public, max-age=31536000, immutable"); // 1y, immutable
    } else {
      h.set("Cache-Control", "public, max-age=3600"); // 1h
    }
  }
  return h;
}

function buildUpstreamPath(hostname, rawPath) {
  // rawPath like: "Maui/Event/Fullschedule.html" (vox) or "CapcomDemo/Fullschedule.html" (snapshots)
  const clean = rawPath
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split(",")[0]
    .trim();

  if (!clean) return null;

  if (hostname === "vox.capcom.london") {
    if (clean.startsWith("protected/")) return clean;

    // Accept either "<app>/<event>/<file>" or "public/<app>/<event>/<file>" (be forgiving)
    const stripped = clean.startsWith("public/") ? clean.slice("public/".length) : clean;
    return `public/${stripped}`;
  }

  if (hostname === "snapshots.capcom.london") {
    return `snapshots/${clean}`;
  }

  // Fallback: treat like vox behavior (lets you test on other hostnames if routed)
  const stripped = clean.startsWith("public/") ? clean.slice("public/".length) : clean;
  return `public/${stripped}`;
}

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const cookie of cookies.split(";")) {
    const [key, ...valueParts] = cookie.trim().split("=");
    if (key === name) return valueParts.join("=");
  }
  return "";
}

function parseProtectedPath(objectPath) {
  const parts = objectPath.split("/");
  if (parts[0] !== "protected") return null;
  if (parts.length < 4 || !parts[1] || !parts[2] || !parts[3]) return false;
  return { app: parts[1], eventId: parts[2] };
}

function decodeTokenPayload(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

function sessionCookie(token, maxAge = 3600) {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
}

function redirectToLogin(url, protectedPath, clearSession = false) {
  const loginUrl = new URL(LOGIN_URL);
  loginUrl.searchParams.set("redirect", url.href);
  loginUrl.searchParams.set("eventName", url.searchParams.get("eventName") || protectedPath.eventId);
  loginUrl.searchParams.set("clientName", url.searchParams.get("clientName") || protectedPath.app);
  if (url.searchParams.get("logoUrl")) {
    loginUrl.searchParams.set("logoUrl", url.searchParams.get("logoUrl"));
  }

  const headers = new Headers({ Location: loginUrl.href, "Cache-Control": "no-store" });
  if (clearSession) headers.set("Set-Cookie", sessionCookie("", 0));
  return new Response(null, { status: 302, headers });
}

function corsHeaders(origin) {
  const headers = new Headers({
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  if (SESSION_ORIGINS.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

async function isVerifiedFirebaseToken(idToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) return false;
  const data = await response.json();
  return data.users?.some(user => user.emailVerified === true) === true;
}

async function handleSessionRequest(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = corsHeaders(origin);

  if (!SESSION_ORIGINS.has(origin)) {
    return new Response("Origin not allowed", { status: 403, headers });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    const { idToken } = await request.json();
    if (typeof idToken !== "string" || idToken.length > 10000 || idToken.split(".").length !== 3) {
      return new Response("Invalid token", { status: 400, headers });
    }
    if (!await isVerifiedFirebaseToken(idToken)) {
      return new Response("Invalid token", { status: 401, headers });
    }
    headers.set("Set-Cookie", sessionCookie(idToken));
    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers,
    });
  } catch {
    return new Response("Invalid request", { status: 400, headers });
  }
}

async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    if (url.hostname === "vox.capcom.london" && url.pathname === "/auth/session") {
      return handleSessionRequest(request);
    }

    // Only GET/HEAD
    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method Not Allowed", { status: 405, headers: { "Allow": "GET, HEAD" } });
    }

    const objectPath = url.pathname.replace(/^\/+/, "").split(",")[0].trim();
    const token = url.searchParams.get("token") || "";
    const debug = url.searchParams.get("debug") === "1";
    const fresh = url.searchParams.get("fresh") === "1";

    if (!objectPath) {
      return new Response("File not specified", { status: 400 });
    }

    const protectedPath = parseProtectedPath(objectPath);
    if (protectedPath === false) {
      return new Response("Protected URL must use /protected/<app>/<eventId>/<file>", { status: 400 });
    }

    const sessionToken = protectedPath ? getCookie(request, SESSION_COOKIE) : "";
    if (protectedPath && !sessionToken) {
      return redirectToLogin(url, protectedPath);
    }

    const tokenPayload = sessionToken ? decodeTokenPayload(sessionToken) : {};
    if (protectedPath && (!tokenPayload.exp || tokenPayload.exp <= Math.floor(Date.now() / 1000))) {
      return redirectToLogin(url, protectedPath, true);
    }

    const upstreamPath = buildUpstreamPath(url.hostname, objectPath);
    if (!upstreamPath) {
      return new Response("Bad path", { status: 400 });
    }

    const qs = new URLSearchParams({ alt: "media" });
    if (token) qs.set("token", token);

    const gcsUrl =
      `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(upstreamPath)}?${qs.toString()}`;

    // Debug helper: show where we'd fetch from
    if (debug && !protectedPath) {
      return new Response(
        JSON.stringify({ ok: true, host: url.hostname, objectPath, upstreamPath, gcsUrl }, null, 2),
        { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
      );
    }

    // Forward conditional headers for 304s
    const upstreamHeaders = {
      "If-None-Match": request.headers.get("If-None-Match") || "",
      "If-Modified-Since": request.headers.get("If-Modified-Since") || "",
    };
    if (protectedPath) upstreamHeaders.Authorization = `Bearer ${sessionToken}`;

    const upstream = await fetch(gcsUrl, {
      method: request.method,
      headers: upstreamHeaders,
      cf: fresh ? { cacheTtl: 0, cacheEverything: true } : undefined,
    });

    // Pass 304 straight through
    if (upstream.status === 304) {
      const headers = defaultCacheHeaders(objectPath, upstream.headers, fresh, !!protectedPath);
      if (!headers.get("Cache-Control")) {
        headers.set("Cache-Control", "public, max-age=0, must-revalidate");
      }
      return new Response(null, { status: 304, statusText: upstream.statusText, headers });
    }

    // Bubble errors with context
    if (!upstream.ok) {
      if (protectedPath && [401, 403].includes(upstream.status)) {
        return new Response("Access denied", {
          status: 403,
          headers: { "Cache-Control": "private, no-store" },
        });
      }

      const text = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "Upstream error", status: upstream.status, objectPath, upstreamPath, gcsUrl, text }),
        { status: upstream.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
      );
    }

    // Success: stream body and apply sane defaults if origin didn't
    const headers = defaultCacheHeaders(objectPath, upstream.headers, fresh, !!protectedPath);
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  } catch (err) {
    return new Response("Worker error: " + err.message, { status: 500 });
  }
}
