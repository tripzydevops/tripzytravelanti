# Firebase Cloud Messaging (FCM) Setup Guide

## Prerequisites
- Firebase project (create at [Firebase Console](https://console.firebase.google.com))
- Supabase CLI installed for Edge Function deployment

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project" → Name it "Tripzy" or similar
3. Enable Google Analytics (optional)
4. Wait for project creation

---

## Step 2: Get Android Configuration

1. In Firebase Console → Project Settings → Your apps
2. Click "Add app" → Android
3. Enter package name: `com.tripzy.travel`
4. Download `google-services.json`
5. Copy it to: `android/app/google-services.json`

---

## Step 3: Get Service Account Key

1. Firebase Console → Project Settings → Service accounts
2. Click "Generate new private key"
3. Save the JSON file securely (don't commit to git!)

---

## Step 4: Set Supabase Secrets

```bash
# Set the Firebase service account as a Supabase secret
supabase secrets set FIREBASE_SERVICE_ACCOUNT='<paste entire JSON content here>'
```

---

## Step 5: Deploy Edge Function

```bash
cd "c:\Users\elif\OneDrive\Masaüstü\Yeni klasör (5)"
supabase functions deploy send-push-notification
```

---

## Step 6: Sync Capacitor

```bash
npm run sync
```

This will update the Android project with the push notification plugin.

---

## Step 7: Test Push Notifications

1. Run the app on a physical Android device (emulators may not work)
2. Log in as a user
3. Add a deal to wallet (ensure deal has `requires_confirmation = true` in database)
4. Go to Partner Scan page and scan/enter the code
5. User should receive push notification

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/pushNotificationService.ts` | Initialize push notifications, handle tokens |
| `components/RedemptionConfirmationModal.tsx` | In-app confirmation UI |
| `supabase/functions/send-push-notification/index.ts` | Edge Function to send FCM |

---

## Troubleshooting

### Push notifications not working?
- Check FCM token is saved in `profiles.fcm_token`
- Check Supabase Edge Function logs
- Ensure `google-services.json` is in correct location

### Token not registering?
- Only works on native Android (not web/emulator)
- Check device has Google Play Services

### Edge Function failing?
- Verify `FIREBASE_SERVICE_ACCOUNT` secret is set correctly
- Check for JSON parsing errors in function logs
