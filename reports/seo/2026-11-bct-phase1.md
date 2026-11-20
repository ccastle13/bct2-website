# BCT SEO/GEO Phase 1 draft

- **Prepared:** 2026-11-20
- **Canonical domain:** https://borchardtct.com
- **Status:** draft batch for Chris and Arek to review; not approved for deployment
- **Evidence labels:** `measured`, `not_measured`, and `needs owner input`

## Phase 1 status

| Area | Status | Evidence |
|---|---|---|
| Google Search Console Domain property | `not_measured` | The Search Console API is reachable, but the Google Cloud project used by the existing service account has the Site Verification API disabled. The verification-token request returned HTTP 403 `PERMISSION_DENIED`, so no Google TXT record was created and the property could not be added. |
| Google sitemap submission | `not_measured` | Blocked by Domain-property verification. One owner action is required: enable the Site Verification API for Google Cloud project `7747064702`, then retry this issue. |
| Bing Webmaster site | `measured` | The Bing Webmaster API accepted the site-add request for the canonical domain. |
| Bing verification | `not_measured` | Bing's verification check returned false. GSC import is unavailable until the Google property is verified; sitemap submission therefore remains pending. |
| DataForSEO keyword rankings | `not_measured` | No trusted maintainer comment says `DataForSEO approved`. No paid request was made and spend was $0.00. |
| DataForSEO LLM Mentions baseline | `not_measured` | No trusted maintainer approval was present. No paid request was made and spend was $0.00. |
| Phase 1 service-page batch | `measured` | Six statically generated service routes build successfully with distinct titles, descriptions, canonical URLs, Service schema, homepage links, cross-links, and sitemap entries. |

## Exact proposed live batch

This is the single proposed Phase 1 batch. It stays on the `hold-for-review` pull request until Chris approves these exact pages and Arek supplies or confirms the missing facts.

1. `/services/3d-machine-control-models`
2. `/services/site-takeoffs`
3. `/services/construction-drafting`
4. `/services/3d-land-surface-modeling`
5. `/services/drone-data-processing`
6. `/services/gps-rover-setup-localization-calibration`

The batch also proposes:

- descriptive links from each homepage service card;
- related-service links on every service page;
- one distinct title, meta description, canonical URL, Open Graph set, and Service JSON-LD object per page;
- all six service URLs in `sitemap.xml` alongside the homepage;
- the Week 0 homepage title, description, service language, Organization/ProfessionalService schema, and `llms.txt` draft from PR #9;
- no location modifiers because no operating location or service area has owner approval in the current evidence;
- no Trimble, Topcon, Leica, software, file-format, turnaround, pricing, certification, or performance claims.

## Content evidence and boundaries

The service-page copy is limited to facts already present on the current site and the approved Week 0 draft:

- 3D machine-control and rover site models based on project plans and workflows;
- site takeoffs for earthwork, paving, concrete, pipe, and associated materials;
- plan-based construction drafting support;
- digital terrain, grading, and surface modeling;
- drone progress and surface-data workflows;
- GPS setup, troubleshooting, localization, calibration, control, and training for supported systems.

Every page visibly marks exact deliverables, software/file formats, and supported equipment/brands as `needs owner input`. These notices are review placeholders, not final client-facing copy; replace them with evidenced facts or remove the unsupported category before deployment.

## Questions for Arek

1. What exact deliverables does BCT provide for each of the six services?
2. Which input and output file formats and software workflows are supported for each service?
3. Which machine-control, rover, GPS, and drone equipment brands can BCT support? Please separate current support from past familiarity.
4. What city/state is BCT based in, and what service area may the website state?
5. What turnaround ranges, revision terms, and QA checks may be published for each service?
6. Which project examples may be linked to each service, and what scope or result facts may be stated?
7. Is the current project-start email the approved public contact for every service page?

## Review and release gate

- Enable the Google Site Verification API, rerun Domain verification, add only the returned Google TXT record, add the Domain property, and submit the sitemap.
- Complete Bing verification using GSC import or the Bing-provided DNS method, then submit the sitemap.
- Keep DataForSEO values `not_measured` unless a trusted maintainer posts the exact approval phrase in issue #10. If approved later, preserve the $5.00 cap, $0.99 balance floor, and `BCT` spend label.
- Obtain Arek's answers and replace each `needs owner input` placeholder with supported copy or remove it.
- Chris must approve the exact six-page batch before merge or deployment.
