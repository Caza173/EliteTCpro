import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// In-memory session cache (lives for the duration of the Deno isolate)
let cachedSession = null; // { token, expiresAt }

/**
 * Generate HMAC-SHA256 signature.
 * message = CLIENT_ID:CLIENT_SECRET:TIMESTAMP
 */
async function generateHmacSignature(clientId, clientSecret, timestamp) {
  const accessSecret = Deno.env.get("SKYSLOPE_ACCESS_SECRET");
  if (!accessSecret) throw new Error("SKYSLOPE_ACCESS_SECRET not set");

  const message = `${clientId}:${clientSecret}:${timestamp}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(accessSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  // Base64-encode the signature
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/**
 * Perform the SkySlope login and return { token, expiresAt }.
 */
async function refreshSessionToken() {
  const clientId = Deno.env.get("SKYSLOPE_CLIENT_ID");
  const clientSecret = Deno.env.get("SKYSLOPE_CLIENT_SECRET");
  const accessKey = Deno.env.get("SKYSLOPE_ACCESS_KEY");

  if (!clientId || !clientSecret || !accessKey) {
    throw new Error("Missing SkySlope credentials (CLIENT_ID, CLIENT_SECRET, or ACCESS_KEY)");
  }

  const timestamp = new Date().toISOString(); // RFC3339 UTC
  const hmac = await generateHmacSignature(clientId, clientSecret, timestamp);

  const res = await fetch("https://api.skyslope.com/auth/login", {
    method: "POST",
    headers: {
      "Authorization": `SS ${accessKey}:${hmac}`,
      "Timestamp": timestamp,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ clientID: clientId, clientSecret }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[SkySlope Auth] Login failed (${res.status}): ${body}`);
    if (res.status === 401) throw new Error("SkySlope authentication failed: invalid credentials or timestamp mismatch");
    throw new Error(`SkySlope login error ${res.status}: ${body}`);
  }

  const data = await res.json();
  if (!data.Session) {
    console.error("[SkySlope Auth] No session token in response:", JSON.stringify(data));
    throw new Error("SkySlope login did not return a session token");
  }

  const expiresAt = data.Expiration ? new Date(data.Expiration).getTime() : Date.now() + 2 * 60 * 60 * 1000;
  cachedSession = { token: data.Session, expiresAt };
  console.info(`[SkySlope Auth] Session acquired, expires at ${new Date(expiresAt).toISOString()}`);
  return cachedSession;
}

/**
 * Return a valid session token, refreshing if within 10 minutes of expiry.
 */
async function getSessionToken() {
  const TEN_MINUTES = 10 * 60 * 1000;
  if (cachedSession && cachedSession.expiresAt - Date.now() > TEN_MINUTES) {
    return cachedSession.token;
  }
  if (cachedSession) {
    console.info("[SkySlope Auth] Token near expiry, refreshing...");
  }
  const session = await refreshSessionToken();
  return session.token;
}

/**
 * Make an authenticated SkySlope API request with automatic token retry.
 */
async function skySlopeFetch(url, options = {}) {
  const token = await getSessionToken();
  const headers = {
    ...(options.headers || {}),
    "Authorization": `SS-Session ${token}`,
    "Content-Type": "application/json",
  };

  let res = await fetch(url, { ...options, headers });

  // If 401, invalidate cache and retry once
  if (res.status === 401) {
    console.warn("[SkySlope Auth] 401 received, refreshing session and retrying...");
    cachedSession = null;
    const newToken = await getSessionToken();
    headers["Authorization"] = `SS-Session ${newToken}`;
    res = await fetch(url, { ...options, headers });
  }

  return res;
}

// Expose as a testable endpoint
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin' && user?.email !== 'nhcazateam@gmail.com') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "test";

    if (action === "test") {
      const token = await getSessionToken();
      return Response.json({ success: true, token_preview: token.slice(0, 12) + "…", expires_at: new Date(cachedSession.expiresAt).toISOString() });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[SkySlope Auth] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

export { getSessionToken, refreshSessionToken, generateHmacSignature, skySlopeFetch };