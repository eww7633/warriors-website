# Pittsburgh Warriors Hockey Club Platform

This is a starter Next.js platform for the Pittsburgh Warriors hockey club.

## Included MVP modules
- Public website pages: home, history, news
- Role-aware calendar with public-only details by default
- Player portal for registration and roster visibility
- Admin operations dashboard for hockey operations staff
- Player check-in app screen for attendance tracking
- SportsPress-style games center with live event logs
- Multiple rosters managed by season
- API endpoints for registration, check-in, and games feed

## Demo role access
Use query params:
- Public: `/calendar`
- Player: `/calendar?role=player`
- Admin: `/admin?role=admin`

## Run locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start dev server:
   ```bash
   npm run dev
   ```

## Social media links
Header social links are configured in `/lib/siteConfig.ts`.
You can override them with:
- `NEXT_PUBLIC_INSTAGRAM_URL`
- `NEXT_PUBLIC_FACEBOOK_URL`

## Deploying to Bluehost
Deployment guide:
- `/docs/BLUEHOST_DEPLOY.md`

Quick command for VPS/Dedicated updates:
```bash
./scripts/deploy-bluehost.sh
```

## Recommended migration path from WordPress + SportsPress
- Export players, teams, seasons, and fixtures from WordPress
- Map SportsPress entities to database tables (`players`, `rosters`, `seasons`, `games`, `game_events`)
- Add real auth (NextAuth or Clerk) with role-based access control
- Move mock data to PostgreSQL and add Prisma models
- Add CMS-backed news and rich media history timeline
- Add push notifications for check-in reminders
