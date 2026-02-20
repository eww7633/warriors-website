# Event Signup Modes (HQ)

This system now supports two event participation flows:

## 1) Straight RSVP
- Use for off-ice events or unlimited-capacity activities.
- Players submit normal RSVP (`going`, `maybe`, `not_going`).
- No roster-selection gate is required.

## 2) Interest Gathering
- Use for on-ice events where final player slots are limited.
- Players submit interest before a close date/time.
- After close, Hockey Ops selects final roster from interested players.
- Player-side UI shows whether the player is selected on the final roster.

## Admin controls
- When creating/updating an event:
  - `Signup flow`
  - `Interest closes at`
  - `Target roster size` (optional planning value)
- For interest-gathering events:
  - `Final Roster Selection` lets Hockey Ops choose selected players.
- Optional guest requests:
  - `Allow players to request guests` (disabled for DVHL events)
  - `Guest cost applies`
  - `Guest cost label` + `Guest cost amount (USD)`

## Player guest flow
- If guest requests are enabled, players can submit:
  - whether they plan to bring guests
  - guest count
  - optional note
- Hockey Ops sees all guest requests in Event Manager.

## Enforcement
- Non-admin players cannot change interest submissions after close.
- Admin can still update as an override.

## Next phase (DVHL workflow)
Planned additions:
- Session signup windows per DVHL season/session.
- Captain volunteer workflow (4 captains per session).
- Draft board with player self-ratings (1-100) and ranking buckets.
- Team naming and captain-owned roster views.
- Sub pool management (players not drafted or available as subs).
- Captain sub requests + availability confirmation flow.
