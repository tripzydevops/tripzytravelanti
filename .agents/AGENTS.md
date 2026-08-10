# Tripzy.travel Workspace Rules & System Behaviors

## Geofencing & Push Notification Rules

### 1. Client-Side Location Watching
* Use `navigator.geolocation.watchPosition` to track the user's coordinates in real-time.
* Perform client-side distance calculations against active geofence zones locally using the Haversine formula to optimize API footprint.
* Keep a local `activeBreaches` state to prevent duplicate geofence hits. Trigger POST updates to `/api/v1/location-update` only when a zone is breached.

### 2. Backend Recommendation Matching & Cooldown
* **Match Score Threshold ($P \ge 0.85$):** Only trigger push notifications if the recommendation engine returns a normalized match score $P \ge 0.85$ using:
  $$P = 0.4 \cdot C_{cat} + 0.3 \cdot \text{category\_boost} + 0.3 \cdot \text{rating\_boost}$$
* **Cooldown Policy:** Limit push notifications for the same geofence zone and user to once every 24 hours. Bypasses are validated against previous entries in the `notifications` table where `type = 'geofence_deal'`.

### 3. Notification Real-Time Sync
* Backend alerts are written directly to `public.notifications` table. The React client listens via real-time Supabase channels and pops system/browser notifications directly.

### 4. Admin Security Warnings & Fraud Logs
* Mismatch redemptions under `soft_warning` geofence enforcement mode log security details to `fraud_signals` table.
* The Admin page at `/admin` must display these alerts under a dedicated tab.
