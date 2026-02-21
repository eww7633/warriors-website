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
```

## Run

```bash
npm run start
npm run ios
npm run android
```

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
