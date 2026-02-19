# Mobile API Contract (Thread C)

Base URL: same host as HQ backend (for example `https://hq.pghwarriorhockey.us`).

## Auth

- Header format for protected routes:
  - `Authorization: Bearer <token>`
- Mobile routes are bearer-first. Do not rely on cookies in the app.
- Temporary session policy: bearer token reuses existing 14-day session TTL.

## Endpoints

### `POST /api/mobile/auth/login`
- Body (JSON):
  - `email` (string, required)
  - `password` (string, required)
- Success `200`:
  - `{ token, expiresAt, user }`
- Errors:
  - `400 { error: "invalid_json" | "missing_credentials" }`
  - `401 { error: "invalid_credentials" }`

### `POST /api/mobile/auth/logout`
- Auth: bearer required
- Body: none
- Success `200`:
  - `{ ok: true }`
- Errors:
  - `401 { error: "missing_bearer_token" | "unauthorized" }`

### `GET /api/mobile/dashboard`
- Auth: bearer required
- Success `200`:
  - `{ user, stats }`
- Errors:
  - `401 { error: "unauthorized" }`

### `GET /api/mobile/events`
- Auth: bearer required
- Success `200`:
  - `{ events: [...] }`
  - Each event includes:
    - `viewerReservationStatus` (`"going" | "maybe" | "not_going" | null`)
    - `reservationCount` (number)
    - `canManage` (boolean)
- Errors:
  - `401 { error: "unauthorized" }`

### `POST /api/mobile/events/reservation`
- Auth: bearer required
- Body (JSON):
  - `eventId` (string, required)
  - `status` (required): `"going" | "maybe" | "not_going"`
  - `note` (string, optional)
- Success `200`:
  - `{ ok: true }`
- Errors:
  - `400 { error: "invalid_json" | "invalid_reservation_fields" }`
  - `401 { error: "unauthorized" }`
  - `403 { error: "approval_required" }`
  - `500 { error: "reservation_save_failed" }`

### `POST /api/mobile/checkin`
- Auth: bearer required
- Body (JSON):
  - `token` (string, required QR token)
- Success `200`:
  - `{ ok: true, result }`
- Errors:
  - `400 { error: "invalid_json" | "missing_token" | "<qr/checkin message>" }`
  - `401 { error: "unauthorized" }`

