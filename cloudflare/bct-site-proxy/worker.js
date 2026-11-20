const UPSTREAM_ORIGIN = "https://bct2.castle-itsolutions.com";
const PRIMARY_HOST = "borchardtct.com";
const WWW_HOST = "www.borchardtct.com";
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const MAX_BODY_BYTES = 20 * 1024;
const MIN_SUBMISSION_MS = 3_000;
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const SERVICE_OPTIONS = new Set([
  "3D machine-control models",
  "Takeoffs",
  "Drone data",
  "GPS support",
  "Other",
]);

const STRING_LIMITS = {
  name: 100,
  company: 120,
  email: 254,
  phone: 50,
  service: 64,
  project_location: 200,
  timeline: 100,
  message: 5_000,
  website_url: 200,
  source: 200,
  medium: 200,
  campaign: 200,
  landing_page: 2_048,
  referrer: 2_048,
  submitted_at: 64,
};

const rateLimitBuckets = new Map();
let graphTokenCache = { key: "", accessToken: "", expiresAt: 0 };

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function rewriteLocation(location, upstreamUrl, requestUrl) {
  if (!location) {
    return null;
  }

  const target = new URL(location, upstreamUrl);
  const hostname = target.hostname.toLowerCase();
  const pointsAtUpstream = hostname === "bct2.castle-itsolutions.com";
  const pointsAtVercel = hostname.endsWith(".vercel.app");

  if (!pointsAtUpstream && !pointsAtVercel) {
    return location;
  }

  target.protocol = requestUrl.protocol;
  target.hostname = requestUrl.hostname;
  target.port = requestUrl.port;
  return target.toString();
}

async function readJsonBody(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: "request_too_large" };
  }

  if (!request.body) {
    return { ok: false, status: 400, error: "invalid_json" };
  }

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return { ok: false, status: 413, error: "request_too_large" };
    }
    chunks.push(value);
  }

  if (totalBytes === 0) {
    return { ok: false, status: 400, error: "invalid_json" };
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return { ok: false, status: 415, error: "unsupported_media_type" };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  }
}

export function validateLead(input, now = Date.now()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "invalid_submission" };
  }

  const lead = {};
  for (const [field, limit] of Object.entries(STRING_LIMITS)) {
    const value = input[field] ?? "";
    if (typeof value !== "string" || value.length > limit) {
      return { ok: false, error: "invalid_submission" };
    }
    lead[field] = value.trim();
  }

  if (!lead.name || !lead.email || !lead.message) {
    return { ok: false, error: "missing_required_fields" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return { ok: false, error: "invalid_email" };
  }

  if (lead.service && !SERVICE_OPTIONS.has(lead.service)) {
    return { ok: false, error: "invalid_service" };
  }

  if (lead.website_url) {
    return { ok: false, error: "invalid_submission" };
  }

  const startedAt = Number(input.started_at);
  if (!Number.isFinite(startedAt) || now - startedAt < MIN_SUBMISSION_MS) {
    return { ok: false, error: "invalid_submission" };
  }

  if (lead.submitted_at && Number.isNaN(Date.parse(lead.submitted_at))) {
    return { ok: false, error: "invalid_submission" };
  }

  return { ok: true, value: lead };
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayValue(value) {
  return value || "Not provided";
}

function htmlValue(value) {
  return escapeHtml(displayValue(value)).replaceAll("\n", "<br>");
}

function oneLine(value) {
  return value.replace(/\s+/g, " ").trim();
}

function limitCharacters(value, maxLength) {
  return Array.from(value).slice(0, maxLength).join("");
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function wrapBase64(value) {
  return value.match(/.{1,76}/g)?.join("\r\n") || "";
}

export function buildEmailBodies(lead) {
  const contactFields = [
    ["Name", lead.name],
    ["Company", lead.company],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Service", lead.service],
    ["Project location", lead.project_location],
    ["Timeline", lead.timeline],
    ["Project details", lead.message],
  ];
  const attributionFields = [
    ["Source", lead.source],
    ["Medium", lead.medium],
    ["Campaign", lead.campaign],
    ["Landing page", lead.landing_page],
    ["Referrer", lead.referrer],
    ["Submitted at", lead.submitted_at],
  ];

  const plainSection = (title, fields) =>
    `${title}\n${fields.map(([label, value]) => `${label}: ${displayValue(value)}`).join("\n")}`;
  const htmlSection = (title, fields) => `
    <h2>${escapeHtml(title)}</h2>
    <dl>
      ${fields
        .map(
          ([label, value]) =>
            `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${htmlValue(value)}</dd>`,
        )
        .join("")}
    </dl>`;

  return {
    plainText: `New website lead\n\n${plainSection("Project", contactFields)}\n\n${plainSection(
      "How they found us",
      attributionFields,
    )}`,
    html: `<!doctype html><html><body><h1>New website lead</h1>${htmlSection(
      "Project",
      contactFields,
    )}${htmlSection("How they found us", attributionFields)}</body></html>`,
  };
}

export function buildGraphMessage(lead, mailbox) {
  const company = lead.company ? ` (${oneLine(lead.company)})` : "";
  const subject = limitCharacters(`[LEAD] Website Lead – ${oneLine(lead.name)}${company}`, 200);
  const bodies = buildEmailBodies(lead);
  const boundary = "bct-lead-alternative";
  const mime = [
    `From: ${mailbox}`,
    `To: ${mailbox}`,
    `Reply-To: ${lead.email}`,
    `Subject: =?UTF-8?B?${utf8ToBase64(subject)}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(utf8ToBase64(bodies.plainText)),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(utf8ToBase64(bodies.html)),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return {
    subject,
    plainText: bodies.plainText,
    html: bodies.html,
    mimeBase64: utf8ToBase64(mime),
  };
}

function getConfig(env) {
  const config = {
    tenantId: env.BCT_GRAPH_TENANT_ID,
    clientId: env.BCT_GRAPH_CLIENT_ID,
    clientSecret: env.BCT_GRAPH_CLIENT_SECRET,
    mailbox: env.LEAD_MAILBOX,
  };

  if (Object.values(config).some((value) => typeof value !== "string" || !value.trim())) {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.mailbox)) {
    return null;
  }
  return config;
}

function inMemoryRateLimitAllows(key, now) {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (rateLimitBuckets.get(key) || []).filter((timestamp) => timestamp > cutoff);

  if (recent.length >= RATE_LIMIT_COUNT) {
    rateLimitBuckets.set(key, recent);
    return false;
  }

  recent.push(now);
  rateLimitBuckets.set(key, recent);

  if (rateLimitBuckets.size > 5_000) {
    for (const [bucketKey, timestamps] of rateLimitBuckets) {
      if (timestamps.every((timestamp) => timestamp <= cutoff)) {
        rateLimitBuckets.delete(bucketKey);
      }
      if (rateLimitBuckets.size <= 4_000) {
        break;
      }
    }
  }

  return true;
}

async function rateLimitAllows(env, key, now) {
  if (env.LEAD_RATE_LIMIT?.limit) {
    try {
      const result = await env.LEAD_RATE_LIMIT.limit({ key });
      if (!result.success) {
        return false;
      }
    } catch {
      console.warn("lead rate-limit binding unavailable");
    }
  }

  return inMemoryRateLimitAllows(key, now);
}

async function getGraphToken(config, fetchImpl, now) {
  const cacheKey = `${config.tenantId}:${config.clientId}`;
  if (
    graphTokenCache.key === cacheKey &&
    graphTokenCache.accessToken &&
    graphTokenCache.expiresAt > now + 60_000
  ) {
    return graphTokenCache.accessToken;
  }

  const tokenResponse = await fetchImpl(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: GRAPH_SCOPE,
        grant_type: "client_credentials",
      }),
    },
  );

  if (!tokenResponse.ok) {
    throw new Error(`token_http_${tokenResponse.status}`);
  }

  const tokenPayload = await tokenResponse.json();
  if (!tokenPayload.access_token || typeof tokenPayload.access_token !== "string") {
    throw new Error("token_invalid_response");
  }

  const expiresIn = Number(tokenPayload.expires_in) || 3_600;
  graphTokenCache = {
    key: cacheKey,
    accessToken: tokenPayload.access_token,
    expiresAt: now + Math.max(60, expiresIn - 60) * 1_000,
  };
  return graphTokenCache.accessToken;
}

async function sendLead(lead, config, fetchImpl, now) {
  const accessToken = await getGraphToken(config, fetchImpl, now);
  const graphMessage = buildGraphMessage(lead, config.mailbox);
  const response = await fetchImpl(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.mailbox)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: graphMessage.mimeBase64,
    },
  );

  if (!response.ok) {
    throw new Error(`send_http_${response.status}`);
  }
}

export async function handleLead(request, env, options = {}) {
  const now = options.now ?? Date.now();
  const fetchImpl = options.fetchImpl ?? fetch;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonResponse(parsed.status, { ok: false, error: parsed.error });
  }

  const validated = validateLead(parsed.value, now);
  if (!validated.ok) {
    return jsonResponse(400, { ok: false, error: validated.error });
  }

  const config = getConfig(env);
  if (!config) {
    return jsonResponse(503, { ok: false, error: "not_configured" });
  }

  const clientIp = (request.headers.get("cf-connecting-ip") || "unknown").slice(0, 128);
  if (!(await rateLimitAllows(env, `lead:${clientIp}`, now))) {
    return jsonResponse(429, { ok: false, error: "rate_limited" });
  }

  try {
    await sendLead(validated.value, config, fetchImpl, now);
    return jsonResponse(200, { ok: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    const safeReason = /^(token_(http_\d{3}|invalid_response)|send_http_\d{3})$/.test(reason)
      ? reason
      : "unexpected";
    console.error("lead delivery failed", safeReason);
    return jsonResponse(502, { ok: false, error: "delivery_failed" });
  }
}

async function proxyRequest(request, requestUrl) {
  const upstreamUrl = new URL(requestUrl.pathname + requestUrl.search, UPSTREAM_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete("host");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("x-robots-tag");

  const rewrittenLocation = rewriteLocation(responseHeaders.get("location"), upstreamUrl, requestUrl);
  if (rewrittenLocation) {
    responseHeaders.set("location", rewrittenLocation);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

const worker = {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);

    if (requestUrl.hostname.toLowerCase() === WWW_HOST) {
      const canonical = new URL(requestUrl.pathname + requestUrl.search, `https://${PRIMARY_HOST}`);
      return Response.redirect(canonical.toString(), 301);
    }

    if (
      requestUrl.hostname.toLowerCase() === PRIMARY_HOST &&
      requestUrl.pathname === "/api/lead" &&
      request.method === "POST"
    ) {
      return handleLead(request, env);
    }

    return proxyRequest(request, requestUrl);
  },
};

export default worker;
