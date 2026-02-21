# Release + QA Runbook (Thread C)

## 1) One-time release setup

```bash
cd "/Users/evanwawrykow/Documents/Warriors Website/mobile/warriors-hq-app"
npx eas-cli login
npx eas-cli build:configure
```

## 2) Required environment variables

Set these in EAS secrets and your local `.env` as needed:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_ICAL_FEED_URL`
- `EXPO_PUBLIC_GOOGLE_CALENDAR_SUBSCRIBE_URL`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_SUPPORT_EMAIL`
- `EXPO_PUBLIC_PRIVACY_URL`
- `EXPO_PUBLIC_FEATURE_FLAGS_URL`
- `EXPO_PUBLIC_FLAG_ANALYTICS`
- `EXPO_PUBLIC_FLAG_NOTIFICATIONS`
- `EXPO_PUBLIC_FLAG_EVENT_REMINDERS`
- `EXPO_PUBLIC_FLAG_ANNOUNCEMENT_ALERTS`
- `EXPO_PUBLIC_FLAG_SENTRY`

Recommended command pattern:

```bash
npx eas-cli secret:create --scope project --type string --name EXPO_PUBLIC_API_BASE_URL --value "https://your-prod-api"
```

## 3) Build commands

Preview/internal testing:

```bash
npm run build:preview:ios
npm run build:preview:android
```

Production builds:

```bash
npm run build:production:ios
npm run build:production:android
```

Store submission:

```bash
npm run submit:ios
npm run submit:android
```

## 4) QA checklist (must pass)

Run baseline checks:

```bash
npm install
npm run qa:smoke
```

Run app:

```bash
npm run qa:start
```

Manual QA matrix:

- Auth
  - Login works for `player`, `supporter`, `admin`
  - Session expiry redirects to login with clear message
- Events
  - Future events shown by default
  - Filters (RSVP + type) work
  - Event detail opens and map links work
- RSVP
  - Going/Maybe/Not Going works for eligible users
  - Approval request flow for non-rostered users works
- Check-in
  - QR scanning works on physical device
  - Check-in confirmation appears
- Team directory
  - Players only see shared contact fields
  - Admin sees full roster + email/text/call actions
- Announcements
  - Admin can post with pin/audience/expiry
  - Non-admin sees filtered announcements list
- Calendar
  - Add to Calendar works
  - Subscription link opens
- Notifications
  - Token registration succeeds on physical device
  - Event reminder/announcement local alerts trigger
  - Notification tap routes into app
- Settings/profile
  - Theme modes and notification toggles persist
  - Profile fields save and reload

## 5) Known dependency on Thread A

For full production parity, backend must provide:

- `POST /api/mobile/analytics/event`
- push send triggers for RSVP/reminders/announcements/check-in
- stable response contracts for profile updates, roster privacy, approval queue
