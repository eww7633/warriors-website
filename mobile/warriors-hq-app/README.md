# Warriors HQ Mobile App

React Native mobile app for iOS + Android (Expo + TypeScript + expo-router).

## Prerequisites

- Node.js 20+
- Xcode + iOS Simulator
- Android Studio + Android Emulator
- Running Warriors HQ API/web backend (default: `http://localhost:3000`)

## Setup

```bash
cd "/Users/evanwawrykow/Documents/Warriors Website/mobile/warriors-hq-app"
cp .env.example .env
npm install
```

Set `EXPO_PUBLIC_API_BASE_URL` in `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Run

Start Expo:

```bash
npm run start
```

Open iOS simulator:

```bash
npm run ios
```

Open Android emulator:

```bash
npm run android
```

Open in Expo Go (same Wi-Fi):

```bash
npm run start
```

Then scan the QR code from Expo Go.

## Implemented Screens

- Login
- Register / request access
- Player dashboard
- Events list
- Event detail
- RSVP actions (`Going`, `Maybe`, `Not Going`)
- QR check-in scan

## API Notes

The current backend supports form+redirect auth/reservation/check-in endpoints and a public events JSON endpoint. The app is wired with a shared API client that:

- Uses existing routes now (`/api/auth/login`, `/api/auth/register`, `/api/events/reservation`, `/api/events/checkin/scan`, `/api/public/events`)
- Falls back to these existing routes when mobile JSON endpoints are missing
- Uses secure local storage (`expo-secure-store`) for session state metadata

For full production mobile behavior, add dedicated JSON mobile endpoints from the Thread A request list.
