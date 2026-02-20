# Domain Cutover To Next.js (Root Domain)

Goal:
- Serve this Next.js app at `https://pghwarriorhockey.us` (and `www`).
- Keep `https://hq.pghwarriorhockey.us` as a canonical redirect to root.

## 1) Add domains to hosting provider
- Add `pghwarriorhockey.us`
- Add `www.pghwarriorhockey.us`
- Add `hq.pghwarriorhockey.us`

## 2) DNS records
- Point apex/root (`@`) to your Next.js host target.
- Point `www` to the same host target (or apex).
- Point `hq` to the same host target.

## 3) Canonical redirect behavior
- App middleware redirects `hq.pghwarriorhockey.us/*` to `pghwarriorhockey.us/*` with HTTP `308`.
- This keeps one canonical public URL and avoids split traffic/SEO duplication.

## 4) Environment
- Set `NEXT_PUBLIC_SITE_URL=https://pghwarriorhockey.us`
- Keep production secrets (`AUTH_SECRET`, `DATABASE_URL`, SMTP settings) configured.

## 5) Smoke test after DNS propagation
- `https://pghwarriorhockey.us` loads home page.
- `https://www.pghwarriorhockey.us` loads home page.
- `https://hq.pghwarriorhockey.us` redirects to root domain.
- Auth paths and APIs work:
  - `/login`
  - `/player`
  - `/admin`
  - `/api/public/events`
