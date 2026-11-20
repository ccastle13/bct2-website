"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

const FALLBACK_EMAIL = "arek@borchardtct.com";
const ATTRIBUTION_KEY = "bct-lead-attribution";

const fieldClassName =
  "mt-2 w-full rounded-lg border border-black/20 bg-white px-4 py-3 text-base text-black outline-none transition-colors placeholder:text-black/45 hover:border-black/40 focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-bct-yellow disabled:cursor-not-allowed disabled:opacity-60";

type Attribution = {
  source: string;
  medium: string;
  campaign: string;
};

type FormStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error" };

function readValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true"> *</span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

export default function LeadForm() {
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });
  const startedAt = useRef<number | null>(null);
  const startedAtInput = useRef<HTMLInputElement>(null);
  const attribution = useRef<Attribution>({
    source: "",
    medium: "",
    campaign: "",
  });

  useEffect(() => {
    const initialStartedAt = Date.now();
    startedAt.current = initialStartedAt;
    if (startedAtInput.current) {
      startedAtInput.current.value = String(initialStartedAt);
    }
    const params = new URLSearchParams(window.location.search);
    let stored: Attribution = { source: "", medium: "", campaign: "" };

    try {
      const saved = window.sessionStorage.getItem(ATTRIBUTION_KEY);
      if (saved) {
        stored = { ...stored, ...(JSON.parse(saved) as Partial<Attribution>) };
      }
    } catch {
      // Storage can be unavailable in strict privacy modes. The form still works.
    }

    const nextAttribution = {
      source: params.get("utm_source") || stored.source,
      medium: params.get("utm_medium") || stored.medium,
      campaign: params.get("utm_campaign") || stored.campaign,
    };

    attribution.current = nextAttribution;
    try {
      window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(nextAttribution));
    } catch {
      // The values remain in component state for this visit.
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "submitting") {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const submissionStartedAt = startedAt.current ?? Date.now();

    setStatus({ kind: "submitting" });

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: readValue(formData, "name"),
          company: readValue(formData, "company"),
          email: readValue(formData, "email"),
          phone: readValue(formData, "phone"),
          service: readValue(formData, "service"),
          project_location: readValue(formData, "project_location"),
          timeline: readValue(formData, "timeline"),
          message: readValue(formData, "message"),
          website_url: readValue(formData, "website_url"),
          started_at: submissionStartedAt,
          source: attribution.current.source,
          medium: attribution.current.medium,
          campaign: attribution.current.campaign,
          landing_page: window.location.href,
          referrer: document.referrer,
          submitted_at: new Date().toISOString(),
        }),
      });

      const result = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      if (!response.ok || result?.ok !== true) {
        throw new Error("Lead request failed");
      }

      form.reset();
      const nextStartedAt = Date.now();
      startedAt.current = nextStartedAt;
      if (startedAtInput.current) {
        startedAtInput.current.value = String(nextStartedAt);
      }
      setStatus({ kind: "success" });
    } catch {
      setStatus({ kind: "error" });
    }
  }

  const isSubmitting = status.kind === "submitting";

  return (
    <form className="rounded-2xl bg-bct-surface p-6 text-black sm:p-8" onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold" htmlFor="lead-name">
          Name
          <RequiredMark />
          <input
            className={fieldClassName}
            id="lead-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={100}
            required
            disabled={isSubmitting}
          />
        </label>

        <label className="block text-sm font-semibold" htmlFor="lead-company">
          Company
          <input
            className={fieldClassName}
            id="lead-company"
            name="company"
            type="text"
            autoComplete="organization"
            maxLength={120}
            disabled={isSubmitting}
          />
        </label>

        <label className="block text-sm font-semibold" htmlFor="lead-email">
          Email
          <RequiredMark />
          <input
            className={fieldClassName}
            id="lead-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            required
            disabled={isSubmitting}
          />
        </label>

        <label className="block text-sm font-semibold" htmlFor="lead-phone">
          Phone
          <input
            className={fieldClassName}
            id="lead-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={50}
            disabled={isSubmitting}
          />
        </label>

        <label className="block text-sm font-semibold" htmlFor="lead-service">
          Service
          <select className={fieldClassName} id="lead-service" name="service" disabled={isSubmitting} defaultValue="">
            <option value="">Select a service</option>
            <option value="3D machine-control models">3D machine-control models</option>
            <option value="Takeoffs">Takeoffs</option>
            <option value="Drone data">Drone data</option>
            <option value="GPS support">GPS support</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label className="block text-sm font-semibold" htmlFor="lead-location">
          Project location
          <input
            className={fieldClassName}
            id="lead-location"
            name="project_location"
            type="text"
            autoComplete="address-level2"
            maxLength={200}
            disabled={isSubmitting}
          />
        </label>

        <label className="block text-sm font-semibold sm:col-span-2" htmlFor="lead-timeline">
          Timeline
          <input
            className={fieldClassName}
            id="lead-timeline"
            name="timeline"
            type="text"
            maxLength={100}
            placeholder="When do you need it?"
            disabled={isSubmitting}
          />
        </label>

        <label className="block text-sm font-semibold sm:col-span-2" htmlFor="lead-message">
          Project details
          <RequiredMark />
          <textarea
            className={`${fieldClassName} min-h-36 resize-y`}
            id="lead-message"
            name="message"
            maxLength={5000}
            required
            disabled={isSubmitting}
          />
        </label>
      </div>

      <div className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="lead-website-url">Leave this field empty</label>
        <input id="lead-website-url" name="website_url" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={startedAtInput} name="started_at" type="hidden" />

      <button
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-black px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-bct-ink-soft focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-bct-surface active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending…" : "Send project details"}
      </button>

      <div className="mt-4 min-h-6 text-sm leading-relaxed" aria-live="polite" aria-atomic="true">
        {status.kind === "success" && <p className="font-semibold">Thanks. Your project details were sent.</p>}
        {status.kind === "error" && (
          <p className="font-semibold">
            We couldn&apos;t send that. Please email us at{" "}
            <a className="underline decoration-2 underline-offset-2" href={`mailto:${FALLBACK_EMAIL}?subject=Website%20Lead`}>
              {FALLBACK_EMAIL}
            </a>
            .
          </p>
        )}
      </div>
    </form>
  );
}
