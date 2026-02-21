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
    - `viewerNeedsApproval` (boolean)
    - `viewerCanRsvp` (boolean)
    - `requiresUsaHockeyVerified` (boolean)
    - `rsvpApprovalQueue` (array; manager/admin only, else empty)
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

### `POST /api/mobile/events/reservation/request`
- Auth: bearer required
- Body (JSON):
  - `eventId` (string, required)
- Success `200`:
  - `{ ok: true, request: { eventId, userId, status: "going", viewerNeedsApproval: true } }`
- Errors:
  - `400 { error: "invalid_json" | "event_id_required" | "approval_queue_not_enabled" }`
  - `401 { error: "unauthorized" }`
  - `403 { error: "approval_required" | "interest_signup_closed" }`

### `GET /api/mobile/events/rsvp-queue`
- Auth: bearer required
- Query:
  - `eventId` (string, optional)
- Success `200`:
  - `{ queue: [{ eventId, eventTitle, signupMode, interestClosesAt, selectedUserIds, pending[] }] }`
  - Only returns events managed by requester (or all for admin).

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

### `GET /api/mobile/profile`
- Auth: bearer required
- Success `200`:
  - `{ user, profile, rosterPrivacy }`
  - `user.role` is mobile-normalized as `"player" | "admin" | "supporter"` (backend `public` maps to `supporter`).
  - `rosterPrivacy.visibility` is `"members"` or `"counts"`.

### `POST /api/mobile/profile`
- Auth: bearer required
- Body (JSON):
  - `addressLine1`, `addressLine2`, `city`, `stateProvince`, `postalCode`, `country` (optional strings)
  - `usaHockeyNumber` (optional string)
  - `needsEquipment` (optional boolean)
  - `playerExperienceSummary` (optional string)
- Success `200`:
  - `{ ok: true, user, profile, rosterPrivacy }`
- Errors:
  - `400 { error: "invalid_json" }`
  - `401 { error: "unauthorized" }`
  - `403 { error: "approval_required" }`

### `POST /api/mobile/analytics/event`
- Auth: bearer required
- Body (JSON):
  - `name` (required string)
  - `eventId` (optional string)
  - `screen` (optional string)
  - `metadata` (optional object)
  - `occurredAt` (optional ISO string)
- Success `200`:
  - `{ ok: true, id, receivedAt }`
- Errors:
  - `400 { error: "invalid_json" | "analytics_event_name_required" | "analytics_track_failed" }`
  - `401 { error: "unauthorized" }`

### `POST /api/mobile/notifications/device-token`
- Auth: bearer required
- Body (JSON):
  - `token` (string, required)
  - `platform` (`"ios" | "android" | "web"`, optional)
  - `appVersion` (string, optional)
  - `deviceLabel` (string, optional)
- Success `200`:
  - `{ ok: true, tokenId }`
- Errors:
  - `400 { error: "invalid_json" | "device_token_required" }`
  - `401 { error: "unauthorized" }`

### `DELETE /api/mobile/notifications/device-token`
- Auth: bearer required
- Body (JSON):
  - `token` (string, required)
- Success `200`:
  - `{ ok: true }`
- Errors:
  - `400 { error: "invalid_json" | "device_token_required" }`
  - `401 { error: "unauthorized" }`

## Push Trigger Hooks (Server-Side)

The backend now records push-trigger events for downstream delivery workers in `mobile-push-triggers` storage for:
- RSVP updates (`rsvp_updated`)
- Reminders (`reminder_sent`) including USA Hockey reminder sends and finalized-interest roster notices
- Announcements (`announcement_sent`)
- Check-ins (`checkin_completed`)

### Admin push processing endpoint
- `POST /api/admin/mobile-push/process?limit=100`
- Auth: admin with site-user management permission
- Effect: drains pending trigger records, filters by user push preferences + device tokens, and forwards to provider webhook when configured:
  - env var: `MOBILE_PUSH_WEBHOOK_URL`
- Success `200`:
  - `{ ok, processedTriggers, delivered, queuedNoProvider, skipped, failed }`
