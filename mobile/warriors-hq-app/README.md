# Warriors HQ Mobile App

Player-facing mobile MVP for iOS/Android using Expo Router.

## Setup

```bash
cd "/Users/evanwawrykow/Documents/Warriors Website/mobile/warriors-hq-app"
cp .env.example .env
npm install
```

Use a single consistent host for API calls and auth cookie scope.
Recommended for iOS simulator:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_ICAL_FEED_URL=
EXPO_PUBLIC_GOOGLE_CALENDAR_SUBSCRIBE_URL=
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_SUPPORT_EMAIL=ops@pghwarriorhockey.us
EXPO_PUBLIC_PRIVACY_URL=
EXPO_PUBLIC_FEATURE_FLAGS_URL=
EXPO_PUBLIC_FLAG_ANALYTICS=true
EXPO_PUBLIC_FLAG_NOTIFICATIONS=true
EXPO_PUBLIC_FLAG_EVENT_REMINDERS=true
EXPO_PUBLIC_FLAG_ANNOUNCEMENT_ALERTS=true
EXPO_PUBLIC_FLAG_SENTRY=true
```

## Run

```bash
npm run start
npm run ios
npm run android
```

## Release + QA

See `/Users/evanwawrykow/Documents/Warriors Website/mobile/warriors-hq-app/docs/release-and-qa.md` for:

- EAS build/submit setup
- required env vars and secret commands
- full QA checklist and test matrix

## One Command iOS Launcher

```bash
cd "/Users/evanwawrykow/Documents/Warriors Website/mobile/warriors-hq-app"
./scripts/run-ios-with-backend.sh
```

This launcher does not start the backend. It detects `localhost:3000/3001/3002`,
writes `EXPO_PUBLIC_API_BASE_URL`, and starts Expo iOS with cache clear.

## Implemented

- Login
- Register/request access
- Player dashboard
- Events list + event detail
- RSVP actions
- QR check-in scan
- Shared API client + env config
- Add to calendar (device calendar + subscription link)
- Team directory (privacy-aware) + admin roster actions (email/text/call)
- Offline read cache for events + announcements
- Session-expired re-login handling with login notice
- Profile completeness editing (phone/position/emergency/pronouns/jersey/USA Hockey) + share toggles
- Admin RSVP approval queue screen (approve/deny)
- Feature flags bootstrap (env + optional remote URL)
- Analytics event pipeline (mobile -> `/api/mobile/analytics/event`)
- Error tracking bootstrap (Sentry via `sentry-expo`, gated by env/flag)
- Push open routing support + local event reminder and announcement alert scheduling
- Launch policy screens: Privacy, Support, About
