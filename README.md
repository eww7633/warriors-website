# Pittsburgh Warriors Hockey Club HQ

This Next.js app is the private Hockey Ops and player management platform.

## Current modules
- Player registration request workflow
- Login/logout session auth
- Admin approval workflow (pending -> approved)
- Admin rejection workflow (pending -> rejected)
- Mandatory roster assignment and jersey number assignment on approval
- Jersey numbers enforced as unique within each roster
- Protected player portal (approved rostered players only)
- Protected check-in workflow with attendance truth states
- SportsPress-style seasons, rosters, and games views

## Access rules
- Public users can view only public pages.
- HQ pages require authentication.
- Player HQ access requires admin approval and roster assignment.
- Admin access is restricted to admin role accounts.

## Run locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure env:
   ```bash
   cp .env.example .env
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

## Database mode (recommended)
This app now supports two storage backends:
- `DATABASE_URL` set: PostgreSQL via Prisma (durable, production mode)
- `DATABASE_URL` missing: file fallback (`/tmp` in production)

Set up Prisma schema:
```bash
npm run db:push
```

## Admin bootstrap account
On startup, an admin user is always synced using:
- `ADMIN_EMAIL` (default: `ops@pghwarriorhockey.us`)
- `ADMIN_PASSWORD` (default: `ChangeMeNow!`)

Set secure values in `.env` before production deployment.
If `DATABASE_URL` is not configured, fallback file storage is used.

## Social media links
Header social links are configured in `/lib/siteConfig.ts`.
Override with:
- `NEXT_PUBLIC_INSTAGRAM_URL`
- `NEXT_PUBLIC_FACEBOOK_URL`

## Deploying to Bluehost / DNS setup
- `/docs/BLUEHOST_DEPLOY.md`
