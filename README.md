# Pittsburgh Warriors Hockey Club HQ

This Next.js app is the private Hockey Ops and player management platform.

## Current modules
- Player registration request workflow
- Login/logout session auth
- Admin approval workflow (pending -> approved)
- Admin rejection workflow (pending -> rejected)
- Mandatory roster assignment and jersey number assignment on approval
- Central roster manager with:
  - Active/inactive player status
  - CSV export
  - Sortable/searchable roster table
  - Competition history per player
  - Jersey overlap warnings (with tournament-overlap guardrails)
- Protected player portal (approved rostered players only)
- Protected check-in workflow with attendance truth states
- SportsPress-style seasons, rosters, and games views
- Competition management:
  - Tournaments with Gold/White/Black optional team creation
  - Team-level game creation inside tournaments (each team can have its own schedule)
  - Single Games with Gold/Black/Mixed roster mode
  - DVHL sessions with 4 custom drafted teams
  - Assign approved players to competition teams
  - Admin dashboard organized by tabs: Overview, Competitions, Events, Players, Attendance
- Sports data management:
  - Seasons, teams, venues, positions, staff profiles, sponsors
  - Sponsor impression and click tracking
  - Public partners page at `/partners`

## Access rules
- Public users can view only public pages.
- HQ pages require authentication.
- Player HQ access requires admin approval and roster assignment.
- Admin access is restricted to admin role accounts.

## Auth security
- Passwords are stored with `bcrypt`.
- Legacy SHA-256 hashes are automatically upgraded to bcrypt on successful login.

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
- `DATABASE_URL` (or `POSTGRES_PRISMA_URL`) set: PostgreSQL via Prisma (durable, production mode)
- `DATABASE_URL` missing: file fallback (`/tmp` in production)

Set up Prisma schema:
```bash
npm run db:push
```

After competition/event model updates, run `db:push` again before deploying.

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

## WordPress public event sync
This app exposes a public-safe feed at:
- `/api/public/events`

Install the WordPress shortcode plugin:
- `/integrations/wordpress/warriors-public-events.php`

Use shortcode on any WordPress page:
```text
[warriors_public_events]
```

Optional shortcode attributes:
```text
[warriors_public_events feed_url="https://hq.pghwarriorhockey.us/api/public/events" limit="8" title="Upcoming Events"]
```

## Wix migration (public site scrape)
To capture public pages/content/images from your current Wix site:

```bash
npm run migrate:wix -- https://pghwarriorhockey.org
```

Output is written to:
- `/migration/wix/pages.json` (structured page content)
- `/migration/wix/images.txt` (image URLs found)
- `/migration/wix/html/*.html` (raw page snapshots)

Notes:
- This captures public content only.
- Player/member passwords cannot be migrated by scraping.
- Private user/contact/event records should be exported from Wix as CSV and imported separately.

To import Wix contacts CSV into the database:

1. Put the CSV at `/migration/wix/contacts.csv` (or pass a custom path).
2. Ensure `DATABASE_URL` is set in `.env`.
3. Run:
   ```bash
   npm run import:wix:contacts
   ```

Custom CSV path example:
```bash
npm run import:wix:contacts -- "./nigration/contacts.csv"
```

After import:
- Open Admin > `Contacts`
- Use `Send Invite Email` to send from configured SMTP mailbox
- Use `Mark Invited` as a manual outreach tracker if needed
- Ask players to register at `/register` with the same email they used previously
- Their contact will auto-link on registration
- If they already have an account, use `Link Existing Account by Email`

Required env vars for invite sending:
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

To import Wix Events CSV into HQ events:

1. Export events from Wix as CSV and place it in `/migration/wix/exports/` (for example `events.csv`).
2. Preview parse results first:
   ```bash
   npm run import:wix:events -- --dry-run
   ```
3. Import events:
   ```bash
   npm run import:wix:events
   ```

Custom path example:
```bash
npm run import:wix:events -- "migration/wix/exports/my-events-export.csv"
```
