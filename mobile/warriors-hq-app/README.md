# Warriors HQ Mobile App

## Setup

```bash
cd "/Users/evanwawrykow/Documents/Warriors Website/mobile/warriors-hq-app"
cp .env.example .env
npm install
```

Set:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Run

```bash
npm run start
npm run ios
npm run android
```

## Implemented

- Login
- Register/request access
- Player dashboard
- Events list + event detail
- RSVP actions
- QR check-in scan
- Shared API client + env config
