# BCT site proxy Worker

This directory contains the source for the `bct-site-proxy` Cloudflare Worker. It is build-only in this change. Nothing in this directory has been deployed.

The Worker keeps the existing behavior:

- `www.borchardtct.com` redirects to the same path and query on `borchardtct.com` before any origin request;
- other requests proxy to the existing bct2 Vercel origin;
- upstream and Vercel redirects are rewritten to the public hostname;
- `X-Robots-Tag` is removed from proxied responses.

On the apex host, `POST /api/lead` is handled before the proxy. It validates a JSON body of no more than 20 KB, checks the honeypot and three-second time trap, rate-limits submissions, gets a Microsoft Graph client-credentials token, and sends the lead from and to the configured mailbox. The Worker sends a base64 MIME `multipart/alternative` message so the email has both plain-text and HTML bodies. The HTML values are escaped, `Reply-To` is the submitter, and Microsoft Graph saves the sent message in Sent Items by default for MIME `sendMail` requests.

## Required Worker bindings

Create these as `secret_text` bindings on the client Worker. Use the client tenant's app only; never reuse another tenant's application.

- `BCT_GRAPH_TENANT_ID`
- `BCT_GRAPH_CLIENT_ID`
- `BCT_GRAPH_CLIENT_SECRET`
- `LEAD_MAILBOX`

Create a Cloudflare Rate Limiting binding with:

- name: `LEAD_RATE_LIMIT`
- type: `ratelimit`
- namespace ID: a unique positive integer for this Worker
- limit: `5`
- period: `60`

Cloudflare Rate Limiting bindings currently allow only 10- or 60-second periods, not 600 seconds. The Worker therefore uses the binding as the distributed first check and also keeps a best-effort five-per-ten-minute counter in each isolate. The in-memory counter resets when an isolate is recycled and is not globally consistent. This is abuse reduction, not a strict quota.

The Graph app needs the least privilege required to send as `LEAD_MAILBOX`. Keep any application access policy scoped to that mailbox.

## Local checks

From the repository root:

```bash
npm run test:worker
python3 -m py_compile cloudflare/bct-site-proxy/deploy.py
npm run lint
npm run build
```

The Node tests cover validation, HTML escaping, the unconfigured response, and the empty-body smoke-test path. They make no network calls.

## Deployment

Do not deploy until the Graph app and all bindings above exist. The deploy helper expects the Worker routes to be exactly:

- `borchardtct.com/*`
- `www.borchardtct.com/*`

It refuses to upload if the bindings or routes differ. It downloads the current raw Worker package, settings, routes, and deployed version ID to a mode-0600 timestamped backup under `~/.aidevops/.agent-workspace/backups/bct-site-proxy/`. The code-only Cloudflare endpoint preserves the configured bindings. After upload, the helper confirms the bindings and routes are unchanged, checks `GET /` for 200, and sends an empty `POST /api/lead` that must return 400. It automatically activates the backed-up version if upload validation or either smoke test fails.

Run the non-mutating check first:

```bash
aidevops secret CF_API_EMAIL CF_GLOBAL_API_KEY CF_ACCOUNT_ID -- \
  python3 cloudflare/bct-site-proxy/deploy.py --check
```

Then upload the Worker:

```bash
aidevops secret CF_API_EMAIL CF_GLOBAL_API_KEY CF_ACCOUNT_ID -- \
  python3 cloudflare/bct-site-proxy/deploy.py --deploy
```

Do not automate a real lead. After the upload and smoke tests pass, Chris sends the first live test lead from the website and confirms it arrives in the configured mailbox and Sent Items.

## Rollback

Failed deployments roll back automatically. To reactivate a backed-up version manually, use the backup path printed by the check or deployment command:

```bash
aidevops secret CF_API_EMAIL CF_GLOBAL_API_KEY CF_ACCOUNT_ID -- \
  python3 cloudflare/bct-site-proxy/deploy.py --rollback /absolute/path/to/bct-site-proxy-YYYYMMDDTHHMMSSZ.json
```

The rollback command verifies that the backup belongs to this zone and Worker before activating its recorded version.
