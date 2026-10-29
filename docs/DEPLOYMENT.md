# Going live: checklist

Do these in order. Everything below is a setting or an account; no code changes are needed.
Replace `https://YOUR-DOMAIN` with the address your host gives you (for example `https://street-wolf.vercel.app`, or your own domain).

## 1. Pick a host

The app is a normal Next.js app (Node 20+). **Vercel** is the easiest: connect the GitHub repo, set **Root Directory** to `apps/web`,
framework Next.js. Any Node host works too (`pnpm build` then `pnpm start` inside `apps/web`), as long as it runs behind a proxy/CDN
that sets `x-forwarded-for` (Vercel, Cloudflare, nginx all do; the rate limits depend on it).

After the first deploy you get the live address. Use it everywhere below.

## 2. Environment variables (host dashboard → Environment Variables)

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Your Atlas `mongodb+srv://…` string (same one as local to keep your data) |
| `MONGODB_DB` | `streetwolf` (same name as local, or you'll see an empty database) |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR-DOMAIN` (no trailing slash). Used in emailed links and the Google redirect. **Redeploy after changing it** (it's baked in at build time). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud (section 4) |
| `RESEND_API_KEY` / `EMAIL_FROM` | From Resend (section 5) |
| `CRON_SECRET` | A long random string (`openssl rand -base64 36`). Use a **different** one from local. |
| `NEXT_PUBLIC_GITHUB_REPO`, `NEXT_PUBLIC_SELF_HOSTED` | Optional. Set `NEXT_PUBLIC_SELF_HOSTED=false` on the public site. |

Never commit `.env.local`. It is already git-ignored.

## 3. MongoDB Atlas

1. **Network Access → Add IP Address.** Hosts like Vercel use changing IPs, so add `0.0.0.0/0` (allow from anywhere). The database user's password protects it.
   Use a long random password. (Stricter option: Atlas's Vercel integration or private networking, on paid tiers.)
2. **Database user:** give it `readWrite` on the `streetwolf` database only, not Atlas admin.
3. **Backups:** the free M0 cluster has **no backups**. Before real customers, move to M10+ (continuous backups) or schedule `mongodump`.
4. Indexes are created automatically the first time the server starts. To do it before launch: `MONGODB_URI=… pnpm db:indexes`.
5. Your local test accounts and campaigns live on your laptop, not in Atlas. Sign up again on the live site.

## 4. Google sign-in (Google Cloud Console → APIs & Services)

1. **Credentials → your OAuth client → Authorized redirect URIs → Add URI:**
   `https://YOUR-DOMAIN/api/auth/google/callback`
   Keep the `http://localhost:3000/api/auth/google/callback` one for local development. It must match exactly: `https`, no trailing slash, no extra path.
2. **OAuth consent screen / Audience:**
   - While the status is **Testing**, only people listed under **Test users** can sign in, and Google limits it to 100 users.
   - To let anyone sign in, click **Publish app** → **In production**. Our scopes are only `openid email profile`, which are basic, so Google does not require a verification review.
   - Fill in the **Authorized domains** (your domain, when you have one) plus a privacy policy and terms link if it asks. Add the app logo if you like.
3. If you change the secret later, update `GOOGLE_CLIENT_SECRET` on the host and redeploy.

Errors: `redirect_uri_mismatch` → the URI in step 1 doesn't match; "Access blocked / app not verified" → you're still in Testing and your email isn't a test user.

## 5. Email (Resend)

1. Create an API key (Sending access) → `RESEND_API_KEY`.
2. **Domains → Add Domain** and add the DNS records at your registrar (SPF, DKIM; DMARC is recommended). Wait for **Verified**.
3. Set `EMAIL_FROM="Street Wolf <noreply@yourdomain.com>"`.
4. Until a domain is verified, `onboarding@resend.dev` can only email **your own** Resend login address. Invites to teammates will fail and
   sit in the retry queue (`emails` collection) until the domain is set up, then send.
5. Once the key is set, sign-in links arrive only by email (the on-page "open the link" shortcut is dev-only).

## 6. Retry cron for email (optional but recommended)

Failed emails are retried by calling the outbox endpoint every few minutes with the secret:

```
POST https://YOUR-DOMAIN/api/internal/outbox
x-cron-secret: <CRON_SECRET>
```

- **Vercel Cron:** add a `vercel.json` with `{"crons":[{"path":"/api/internal/outbox","schedule":"*/5 * * * *"}]}` (Vercel sends
  `Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is set). Free (Hobby) plans only allow daily crons.
- **Anywhere else:** cron-job.org or a GitHub Action calling the POST above works.
- Without a cron, emails still send immediately when everything is healthy; the cron only rescues the ones that failed.

## 6b. Health checks and serverless tuning

- Load balancer / platform health check: `GET /api/health`. Uptime monitor: `GET /api/health?deep=1` (also checks MongoDB).
- On serverless hosts (Vercel) every instance has its own connection pool. Keep `MONGODB_POOL` small (for example `10`) so many instances stay under Atlas's connection limit
  (M0: 500, M10: 1,500), and set `ENSURE_INDEXES=false` once you have run `pnpm db:indexes` (saves ~16 round trips per cold start).
- Check logs for lines starting `{"at":"api"`: they are the 5xx and slow requests, each with a request id that is also returned to the client as `X-Request-Id`.

## 7. Custom domain (when you have one)

Add it in the host, then update **all** of: `NEXT_PUBLIC_SITE_URL` (redeploy), the Google redirect URI + authorized domain,
and the Resend sending domain.

## 8. Scraper app

On the live site: **Settings → Integrations → Create token**, paste it into the scraper app along with the live site address.
The scraper uses `POST /api/jobs/claim`, `POST /api/ingest`, `PATCH /api/jobs/:id` (see `docs/ARCHITECTURE.md`).

## 9. Smoke test after deploying

1. Open the live site → `/signup` → **Continue with Google** → you land on the dashboard.
2. Sign out, sign in again with an **email link** (check your inbox).
3. Create a campaign, add a domain and a place, type into the sheet, refresh: the data is still there.
4. Invite a second email (a second Google account is easiest) → they get the email, accept it, and see the campaign.
5. In Atlas → Browse Collections, you should see `users`, `campaigns`, `members`, `leads`, `emails` filling up.

## Quick reference: what breaks if a value is missing

| Missing | Symptom |
| --- | --- |
| `MONGODB_URI` | Every page that needs data errors; server log says `MONGODB_URI is not set` |
| Atlas IP not allowed | "Server selection timed out" in the log |
| `NEXT_PUBLIC_SITE_URL` wrong | Links in emails point to localhost; Google redirects to the wrong place |
| Google keys | Google button says it isn't switched on (email sign-in still works) |
| `RESEND_API_KEY` | Emails only print in the server log |
| Verified domain | Emails to anyone but you fail |
| `CRON_SECRET` | Retry endpoint returns 403 (everything else is fine) |
