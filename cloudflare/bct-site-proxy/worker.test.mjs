import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerSource = await readFile(new URL("./worker.js", import.meta.url), "utf8");
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(workerSource).toString("base64")}`);
const { buildGraphMessage, escapeHtml, handleLead, validateLead } = workerModule;

function validLead(now = Date.now()) {
  return {
    name: "Sam Builder",
    company: "Builder Co",
    email: "sam@example.com",
    phone: "",
    service: "Takeoffs",
    project_location: "Boise",
    timeline: "Next month",
    message: "Please review the plans.",
    website_url: "",
    started_at: now - 4_000,
    source: "search",
    medium: "organic",
    campaign: "",
    landing_page: "https://borchardtct.com/",
    referrer: "",
    submitted_at: new Date(now).toISOString(),
  };
}

test("validates required fields, service values, honeypot, and time trap", () => {
  const now = Date.now();
  assert.equal(validateLead(validLead(now), now).ok, true);
  assert.equal(validateLead({ ...validLead(now), email: "not-an-email" }, now).error, "invalid_email");
  assert.equal(validateLead({ ...validLead(now), service: "Unknown" }, now).error, "invalid_service");
  assert.equal(validateLead({ ...validLead(now), website_url: "filled" }, now).error, "invalid_submission");
  assert.equal(validateLead({ ...validLead(now), started_at: now - 2_999 }, now).error, "invalid_submission");
});

test("escapes every HTML-sensitive character in lead content", () => {
  assert.equal(escapeHtml(`<script>"Tom & Jerry's"</script>`), "&lt;script&gt;&quot;Tom &amp; Jerry&#39;s&quot;&lt;/script&gt;");

  const message = buildGraphMessage(
    { ...validLead(), name: "<Sam>", company: "A & B", message: '<img src=x onerror="bad">' },
    "lead@example.com",
  );
  assert.match(message.html, /&lt;Sam&gt;/);
  assert.match(message.html, /A &amp; B/);
  assert.doesNotMatch(message.html, /<img/);

  const mime = Buffer.from(message.mimeBase64, "base64").toString("utf8");
  assert.match(mime, /From: lead@example\.com/);
  assert.match(mime, /To: lead@example\.com/);
  assert.match(mime, /Reply-To: sam@example\.com/);
  assert.match(mime, /Content-Type: text\/plain; charset="UTF-8"/);
  assert.match(mime, /Content-Type: text\/html; charset="UTF-8"/);
});

test("returns not_configured before making a network call", async () => {
  const now = Date.now();
  const request = new Request("https://borchardtct.com/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validLead(now)),
  });

  const response = await handleLead(request, {}, {
    now,
    fetchImpl: () => {
      throw new Error("network call was not expected");
    },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "not_configured" });
});

test("rejects an empty request body with 400", async () => {
  const request = new Request("https://borchardtct.com/api/lead", { method: "POST" });
  const response = await handleLead(request, {});
  assert.equal(response.status, 400);
});
