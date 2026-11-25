# BCT hosting migration: Vercel to Cloudflare Pages

**Recommendation:** Serve a static Next.js export from Cloudflare Pages and
keep `bct-site-proxy` in front of it. Change only the site's upstream during
the first cutover. That keeps the public DNS, TLS, redirects and lead endpoint
on their existing path and gives the operator a single switch to reverse.
Consider direct Pages hosting on the apex later, as a separate change.

This is a plan only. The steps below require a separately approved migration;
reviewing this document does not authorize a deploy, DNS change, or purchase.
[Vercel Hobby](https://vercel.com/docs/plans/hobby) is for personal,
non-commercial use. If migration must wait or a rollback origin is needed,
confirm an approved commercial Vercel Pro arrangement rather than relying on
Hobby for ongoing production traffic.

## Current architecture

The Vercel project serves Next.js at `bct2.castle-itsolutions.com`.
`bct-site-proxy` fetches that origin for public requests to `borchardtct.com`;
requests to `www.borchardtct.com` receive a 301 to the same path and query on
the apex. The [Worker source](../cloudflare/bct-site-proxy/worker.js) strips
`X-Robots-Tag` from proxied responses and rewrites upstream and Vercel
redirects back to the public hostname. [Next config](../next.config.ts) sets
`X-Robots-Tag: noindex, nofollow` on the bct2 origin and Vercel hostnames.
[Site metadata](../app/layout.tsx), [robots](../app/robots.ts) and the
[sitemap](../app/sitemap.ts) use the public apex.

The [client form](../app/lead-form.tsx) submits JSON to same-origin
`POST /api/lead`. There is no Next.js API route for it: the checked-in Worker
intercepts that exact method and path on the apex before calling Vercel. The
handler validates and rate-limits submissions and sends them through Microsoft
Graph. The [Worker README](../cloudflare/bct-site-proxy/README.md) describes a
source change that was not deployed with that PR. Confirm the actual deployed
version, routes, and lead health before treating the checked-in behavior as
live; don't bundle a first production lead-handler rollout with the origin swap.
The [deployment helper](../cloudflare/bct-site-proxy/deploy.py) checks route
and binding expectations, backs up the prior Worker version, and rolls back
if its smoke checks fail.

## Next.js compatibility and configuration

| Feature | Pages migration decision |
| --- | --- |
| App Router and build | The [repo pins Next.js 16.3.6 and React 19.2.8](../package.json). Use [Next.js static export](https://nextjs.org/docs/app/guides/static-exports) (`output: 'export'`, `npm run build`, publish `out`) and the [Cloudflare Pages static Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/). Pin a tested Node 22 release for CI and Pages via [`NODE_VERSION`](https://developers.cloudflare.com/pages/configuration/build-image/); prove the lockfile build and check that `robots.txt`, `sitemap.xml`, HTML and `/_next/static/` assets exist in the output. |
| Form API | [Static export only supports build-time `GET` Route Handlers](https://nextjs.org/docs/app/guides/static-exports#route-handlers), not a live `POST`. Keep the existing Worker endpoint at the apex; Pages need not run Functions. If the apex later serves directly from Pages, keep a path-specific Worker route for the API (see below) rather than adding a second live mail sender. [Pages Functions](https://developers.cloudflare.com/pages/functions/routing/) can serve request-time endpoints, but porting the handler would require a separate parity and [binding compatibility](https://developers.cloudflare.com/pages/functions/bindings/) review. |
| Images and fonts | The [homepage](../app/page.tsx) uses `next/image` with local assets. The [default image optimizer is not available in a static export](https://nextjs.org/docs/app/guides/static-exports#image-optimization). Start with `images.unoptimized: true` ([Image API](https://nextjs.org/docs/app/api-reference/components/image#unoptimized)) and use appropriately sized, pre-optimized WebP files; compare transferred bytes and mobile rendering. A custom loader is an option if responsive image delivery is needed. Geist and Geist Mono use [`next/font`](https://nextjs.org/docs/app/api-reference/components/font); verify the build can obtain the font files and the exported site serves them locally. |
| Headers and indexing | [Static export does not implement `next.config` headers](https://nextjs.org/docs/app/guides/static-exports#unsupported-features). Replace the old host rules in the export with host-specific [Pages `_headers`](https://developers.cloudflare.com/pages/configuration/headers/) for the direct Pages hostname. Check non-public hosts have `noindex`, including [preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/); keep disallowed previews private where needed. The public proxy should continue removing the origin's `X-Robots-Tag`. Do not put an unconditional `noindex` on public Pages responses if the apex switches to direct hosting. |
| Adapter alternatives | The archived [`@cloudflare/next-on-pages`](https://github.com/cloudflare/next-on-pages) adapter is not the baseline for this Next.js version. [OpenNext on Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/) is a **Workers**, not Pages, deployment route for SSR or Next.js Route Handlers. It [supports Next.js 16](https://opennext.js.org/cloudflare), uses `nodejs_compat` with compatibility date `2024-09-23` or later, and can optimize images using Cloudflare Images. If request-time Next.js features become necessary, test the exact pinned version and adapter in a Workers preview before changing the target. |

### Environment and binding inventory (names only)

- **Pages build:** `NODE_VERSION` pins the build runtime. No Graph secrets go
  into Pages, `out`, or the client bundle. Next.js inlines [`NEXT_PUBLIC_*`
  values into client code at build time](https://nextjs.org/docs/app/guides/environment-variables#bundling-environment-variables-for-the-browser);
  this repo does not currently declare any for the form. Inventory only the
  names of any live project variables before retiring Vercel.
- **Lead Worker:** `BCT_GRAPH_TENANT_ID`, `BCT_GRAPH_CLIENT_ID`,
  `BCT_GRAPH_CLIENT_SECRET`, `LEAD_MAILBOX` remain [Worker secret bindings](https://developers.cloudflare.com/workers/configuration/secrets/).
  `LEAD_RATE_LIMIT` remains a [rate-limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
  not an environment variable. Compare names and types only; keep test and
  production credentials separate.
- **Existing deploy helper only:** `CF_API_EMAIL`, `CF_GLOBAL_API_KEY`,
  `CF_ACCOUNT_ID`, and optional `BCT_WORKER_BACKUP_DIR` are operator-side
  inputs in `deploy.py`, not Pages settings. Don't copy their values into the
  build, runbook, or PR.

## Cutover A: switch the Worker origin (recommended)

1. **Baseline and prepare rollback.** Record the known-good Vercel release,
   Worker version, route patterns, DNS/proxy and TLS configuration, and binding
   names/types in the restricted change record. Confirm the operator can
   restore the Worker version and the old origin will remain reachable and
   commercially permitted during the rollback window. Capture current status,
   redirects, indexing headers, JavaScript and image loads, and latency and
   error rates. Verify the lead contract with the tests below before proceeding.
2. **Build and stage Pages in parallel.** Use the locked dependencies and the
   pinned Node version. Deploy `out` to a non-production [Pages preview](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
   under separate implementation approval. Test static routes, rendered
   content, and the noindex policy there. Exercise the same-origin form with
   an isolated copy of the Worker configured to recognize the test hostname
   and use a mock mail transport or test-only mailbox. A bare Pages preview
   is not expected to serve `/api/lead`.
   Promote the verified static build to the stable Pages production hostname
   (`<project>.pages.dev`) while production still points to Vercel. A
   protected preview or an expiring preview URL is not a production origin.
3. **Prove proxy parity.** In staging, point a candidate Worker at the stable
   Pages hostname, not at the public apex or `www`. Keep the form branch,
   bindings, and public route patterns unchanged. Revisit `rewriteLocation`:
   it currently recognizes bct2 and Vercel hosts, not the new Pages hostname.
   Test relative and absolute redirects, path and query forwarding, and
   trailing-slash behavior. Do not redirect the origin hostname back to the
   public apex if the Worker still fetches that hostname; rewriting the
   resulting redirect can loop.
4. **Switch the upstream, not public DNS.** Once both origins are healthy and
   the verification checklist passes against the candidate, roll out the
   Worker upstream change with the previous version ready to restore. Leave
   the apex and `www` DNS, certificates, and Worker routes in place. Freeze
   concurrent site releases. During the switch, test an older open tab and
   a cold browser: account for cached HTML requesting old hashed assets
   (retain any required old assets or use a tested fallback for those asset
   paths). Never fall back or retry a lead POST across origins.
5. **Verify and observe.** Run the public checks below immediately and watch
   status, latency, assets and lead delivery for an agreed window (suggested:
   24 hours). Keep both origins intact. After the window and sign-off, retire
   Vercel only when the Pages rollback is tested and the agreed rollback
   window to Vercel has closed.

## Cutover B: serve the apex directly from Pages (optional)

Direct serving removes the proxy from ordinary page and asset requests, but
requires a hostname and routing change. Use a separate window after A is
stable. Follow [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/):
the apex must be in the account's Cloudflare zone; add the hostname in the
Pages project, not just in DNS. Rehearse on a test subdomain and check DNS,
certificate issuance, and the interaction with existing Worker routes before
changing the apex. Don't proceed if the apex cannot be made ready while the
existing Worker continues to serve traffic.

1. Stage the custom domain and verify active TLS with the broad Worker route
   still serving production. Save the working DNS and route configuration.
2. Add and verify a more-specific `borchardtct.com/api/lead` Worker route on
   proxied DNS before removing the broad apex route. The exact route matches
   the current query-free form URL. [Cloudflare route matching](https://developers.cloudflare.com/workers/configuration/routing/routes/)
   requires a trailing wildcard to match requests with query strings; if one
   is needed later, retain the Worker's exact path and method checks so that
   lookalike paths cannot send mail. Rehearse before cutover and make sure
   unmatched methods or paths never loop. Keep `www` on its redirect route.
3. Only when the custom domain and narrow lead route are healthy, remove the
   broad apex route so normal traffic goes straight to Pages. Rerun public
   checks, including that Pages headers do not block indexing on the apex.
   Keep the prior broad route and DNS configuration ready for restoration.
   The existing `deploy.py` expects the original two routes exactly; don't
   assume it can manage or roll back the new route layout.

## Verification and rollback

Run these checks in the future approved migration, before and after each switch:

- **HTTP and TLS:** Valid certificates on apex and `www`; homepage returns 200;
  `www` redirects once to apex preserving path and query. Check key paths,
  `robots.txt`, `sitemap.xml`, `llms.txt`, and 404s against the baseline. No
  provider-host redirects, bad TLS, or loops. Verify canonicals and sitemap
  URLs stay on the apex, where indexing remains allowed; check noindex on
  non-public hostnames separately.
- **Assets and interaction:** On mobile and desktop, verify the hero, logo,
  fonts, navigation and form states. Verify 200s and content types for hashed
  JS/CSS and images on cold and warm requests. Check caching doesn't leak
  a preview header or cache lead responses; compare measured latency and page
  weight to the baseline.
- **Lead delivery:** Run `npm run test:worker` (local, mocked) and the staging
  browser form test. After confirming the lead handler is live and with
  operator approval, an empty `POST /api/lead` should return the expected
  JSON 400 and `Cache-Control: no-store` without sending mail. In staging,
  verify validation and throttling. Have the operator submit one approved
  synthetic lead after cutover, confirm the UI succeeds and one message
  arrives in the configured mailbox and Sent Items, and record only pass/fail
  and timing. A 200 response alone is not delivery proof.
- **Rollback:** On failed TLS, form delivery, indexing, or essential asset
  checks, or sustained 5xx/latency above the agreed baseline threshold, stop
  the rollout. For A, reactivate the previous [Worker version](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
  with the old origin; keep DNS and bindings unchanged. For a bad Pages build
  with healthy routing, [roll back Pages](https://developers.cloudflare.com/pages/configuration/rollbacks/)
  to a retained production deployment. For B, restore the broad apex
  Worker route with the known-good upstream first if it can still intercept
  traffic, then revert the saved DNS/domain changes if needed. DNS caches
  may delay that restoration, which is why A is preferred. Recheck from two
  networks, including the lead path, and record the restored version and
  results before closing the change window.

## Cost comparison

Published USD prices and limits checked 2026-11-25; confirm the actual account
quote and usage before approving any spend.

| Option | Base cost and relevant limits |
| --- | --- |
| Vercel Pro | [$20/month](https://vercel.com/pricing), one deploying seat and $20 included usage credit. Extra deploying seats and usage can add charges. This is the comparison baseline and a commercial fallback candidate. |
| Pages Free + Workers Free | $0 base; [Pages Free](https://developers.cloudflare.com/pages/platform/limits/) allows 500 builds/month and one concurrent build. [Pages static requests not invoking Functions](https://developers.cloudflare.com/pages/functions/pricing/) are free and unlimited, but the broad proxy still invokes a Worker for site and asset requests. Workers and Pages Functions share a [100,000 requests/day allowance](https://developers.cloudflare.com/workers/platform/pricing/#workers), with a separate 10 ms CPU limit per invocation. |
| Pages + Workers Paid | Static Pages serving remains free. [Workers Paid Standard](https://developers.cloudflare.com/workers/platform/pricing/#workers) starts at $5/account/month, with 10 million requests and 30 million CPU-ms included per month. Overages are $0.30 per additional million requests and $0.02 per additional million CPU-ms. |
| Pages on Cloudflare Pro (optional zone upgrade) | [Cloudflare Pro](https://www.cloudflare.com/plans/) is $25/month billed monthly or $20/month billed annually. It raises [Pages build quotas](https://developers.cloudflare.com/pages/platform/limits/) to 5,000 builds/month and five concurrent builds. This is separate from Workers Paid; don't buy it solely to raise Worker execution limits. |

Measure peak account-wide Worker requests (including assets, bots and other
Workers), CPU and builds rather than estimating from visits alone. If free
headroom is insufficient, compare the $5 Workers floor with direct serving's
lower Worker traffic. Budget separately for any image optimization service,
zone upgrade, or overlap with Vercel Pro. The static path assumes none of
those add-ons in steady state.

## Risks and open questions

- **Lead rollout and ownership:** Which Worker version and bindings are live,
  and who verifies the mailbox? If the checked-in handler isn't live, handle
  its rollout and verification separately before any origin switch.
- **Search and origin exposure:** Who owns preview access, indexing checks,
  and decommissioning the old origin? Keep the new origin out of search
  without blocking the apex. `noindex` is not access control.
- **Capacity and caching:** What are the peak Worker request/CPU totals and
  acceptable latency and 5xx thresholds? Confirm cache rules and coverage for
  stale HTML and hashed assets before fixing the maintenance window.
- **Retention and costs:** Who owns the rollback decision, how long must both
  origins remain available, and is commercial Vercel overlap approved? Is
  removing the broad Worker route worth a separate routing change after A?
