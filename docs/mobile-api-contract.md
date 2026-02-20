# Mobile API Contract (Thread C)

Base URL: same host as the production website backend (for example `https://pghwarriorhockey.us`).

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
    - `signupMode` (`"straight_rsvp" | "interest_gathering"`)
    - `interestClosesAt` (ISO string or `null`)
    - `signupClosed` (boolean)
    - `finalRosterSelectedCount` (number)
    - `viewerSelectedFinalRoster` (boolean)
    - `allowGuestRequests` (boolean)
    - `guestCostEnabled` (boolean)
    - `guestCostLabel` (string or `null`)
    - `guestCostAmountUsd` (number or `null`)
    - `viewerGuestIntent` (`{ wantsGuest, guestCount, note }` or `null`)
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
  - `403 { error: "approval_required" | "interest_signup_closed" }`
  - `500 { error: "reservation_save_failed" }`

### `POST /api/mobile/events/guest-intent`
- Auth: bearer required
- Body (JSON):
  - `eventId` (string, required)
  - `wantsGuest` (boolean, required)
  - `guestCount` (number, optional; used when `wantsGuest=true`)
  - `guestNote` (string, optional)
- Success `200`:
  - `{ ok: true }`
- Errors:
  - `400 { error: "invalid_json" | "missing_event_id" }`
  - `401 { error: "unauthorized" }`
  - `403 { error: "approval_required" | "guest_requests_not_enabled" | "guest_requests_not_allowed_for_dvhl" }`
  - `404 { error: "event_not_found" }`
  - `500 { error: "guest_intent_save_failed" }`

### `POST /api/mobile/checkin`
- Auth: bearer required
- Body (JSON):
  - `token` (string, required QR token)
- Success `200`:
  - `{ ok: true, result }`
- Errors:
  - `400 { error: "invalid_json" | "missing_token" | "<qr/checkin message>" }`
  - `401 { error: "unauthorized" }`
