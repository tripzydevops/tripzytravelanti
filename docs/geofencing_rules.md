# Tripzy.travel — Geofencing & Push Notification Rules

This document outlines the strict operational rules, parameters, and algorithms governing contextual geofencing and push notifications for Tripzy.travel.

---

## 1. Background Location Tracking (Client-Side)

1. **Active Watching:** The mobile client wrapper uses `navigator.geolocation.watchPosition` to track the user's current coordinates.
2. **Client-Side Evaluation:** Active geofence zones are fetched once when the app starts. The client computes the Haversine distance from the user's current position to each active geofence zone centroid locally:
   - This avoids sending periodic raw location coordinates to the server, preserving user privacy and saving backend resources.
3. **Breach Detection:** A breach (entry) is registered only when the computed distance to a zone centroid is less than or equal to the zone's defined `radius_meters`:
   $$\text{Distance} \le \text{radius\_meters}$$
4. **State Management:** The client maintains a local set of active geofence entries (`activeBreaches`). A breach triggers a server update only when a zone is entered for the first time. Leaving the zone removes it from the set, allowing it to trigger again on next entry.

---

## 2. Notification Matching Algorithm (FastAPI Backend)

1. **Endpoint:** Geofence breaches are POSTed to `/api/v1/location-update`.
2. **Match Score Threshold ($P \ge 0.85$):** A notification is dispatched only if the normalized match probability ($P$) is equal to or greater than **$0.85$**.
3. **Probability Calculation Formula:**
   $$P = 0.4 \cdot C_{cat} + 0.3 \cdot \text{category\_boost} + 0.3 \cdot \text{rating\_boost}$$
   where:
   - $C_{cat}$: Inferred preference category confidence from the Cold-Start Agent (default $0.3$ if unknown).
   - $\text{category\_boost}$: Incremented by $0.2$ if user has clicked/viewed the category before; incremented by $0.3$ if they have saved/claimed deals in it (max $0.3$).
   - $\text{rating\_boost}$: Normalized rating of the target deal: $\frac{\text{deal.rating}}{5.0} \times 0.3$.

---

## 3. Cooldown & Anti-Spam (FastAPI Backend)

1. **24-Hour Cooling Window:** To prevent notification fatigue, subsequent entries to the same geofence zone by the same user will not trigger new push notifications within a **24-hour** period.
2. **Implementation:** Before generating any notification, the backend queries the `notifications` table for records matching:
   - `user_id = <user_uuid>`
   - `type = 'geofence_deal'`
   - `link` matches `#/deal/<deal_id>`
   - `created_at` is within the last 24 hours.
3. **Action:** If a matching notification is found, the dispatch is silently bypassed.

---

## 4. Notification Delivery & Real-Time Sync

1. **Delivery Channel:** System alerts are written to the `public.notifications` database table.
2. **Real-time Push:** The React client subscribes to real-time additions to the `notifications` table via Supabase PostgreSQL changes channel.
3. **In-App & Desktop Notification:** Upon receiving a new record in the subscription channel, the client displays:
   - An in-app alert indicator.
   - A browser/system notification using standard `new Notification(title, { body })` (if permissions are granted).

---

## 5. Security & Fraud Enforcement (Supabase Edge)

When a merchant/vendor scans a user's coupon code via `validate-qr-token`:
1. **Hard Block Mode:** If vendor's profile has `geofence_enforcement_mode = 'hard_block'`, the scan is rejected with a `400` error if the user is outside the geofence boundary.
2. **Soft Warning Mode:** If the mode is `'soft_warning'`, the scan is allowed to succeed, but a warning signal is logged in `fraud_signals`.
3. **Admin Monitoring:** Unresolved warnings are displayed in the Admin panel's **Security Warnings** tab to allow administrators to audit, investigate, and resolve issues.
